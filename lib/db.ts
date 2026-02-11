import { Pool, PoolClient } from 'pg';
import dns from 'dns';

// Force IPv4-first DNS resolution (Node.js 17+)
// This helps avoid IPv6 connection issues with Supabase
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

let pool: Pool | undefined;

export function isDbConfigured() {
  if (process.env.DATABASE_URL) return true;
  return Boolean(
    process.env.POSTGRES_HOST &&
    process.env.POSTGRES_USER &&
    process.env.POSTGRES_DATABASE
  );
}

// Helper function to mask password in connection string for logging
function maskConnectionString(url: string): string {
  try {
    // Match pattern: postgresql://user:password@host
    return url.replace(/(postgresql?:\/\/[^:]+:)([^@]+)(@.+)/, '$1***$3');
  } catch {
    return '***';
  }
}

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Supabase connection string format:
    // For pooler: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[POOLER-HOST]:5432/postgres
    // For direct: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
    // Use connectionString directly for better compatibility with Vercel/serverless
    // Clean the connection string to remove any whitespace or hidden characters
    const cleanUrl = databaseUrl.trim().replace(/\s+/g, '');
    
    // Validate connection string format - check for common mistakes
    if (cleanUrl.match(/@[^@]*@/)) {
      // Multiple @ symbols detected - this is likely a malformed connection string
      const errorMsg = 'Invalid connection string format: Multiple @ symbols detected. ' +
        'Format should be: postgresql://username:password@host:port/database. ' +
        'If using pooler, ensure there is only ONE @ symbol before the hostname.';
      console.error('[DB] Connection string validation failed:', errorMsg);
      console.error('[DB] Connection string (masked):', maskConnectionString(cleanUrl));
      throw new Error(errorMsg);
    }
    
    // Log connection info (masked) for debugging
    const isDirectConnection = cleanUrl.includes('db.') && cleanUrl.includes('.supabase.co');
    const isPoolerConnection = cleanUrl.includes('pooler.supabase.com') || cleanUrl.includes('pooler.supabase.co');
    
    // Check username format
    const usernameMatch = cleanUrl.match(/postgresql?:\/\/([^:]+)/);
    const username = usernameMatch ? usernameMatch[1] : '';
    const hasCorrectPoolerUsername = username.includes('.') && username.startsWith('postgres.');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] Initializing connection pool');
      console.log('[DB] Connection type:', isDirectConnection ? 'Direct' : isPoolerConnection ? 'Pooler' : 'Unknown');
      // SECURITY: Only log masked connection string in development
      console.log('[DB] Connection string:', maskConnectionString(cleanUrl));
      
      // Warn if using pooler connection with wrong username format
      if (isPoolerConnection && username === 'postgres' && !hasCorrectPoolerUsername) {
        console.error('[DB] ERROR: Pooler connection detected but username is "postgres" instead of "postgres.[PROJECT-REF]"');
        console.error('[DB] This will cause authentication failures!');
        console.error('[DB] Fix: Get the correct connection string from Supabase Dashboard → Settings → Database → Connection Pooling');
      }
      
      // Warn if using direct connection on Vercel
      if (isDirectConnection && process.env.VERCEL) {
        console.warn('[DB] WARNING: Using direct connection on Vercel. Consider using pooler connection for better reliability.');
        console.warn('[DB] Get pooler connection string from: Supabase Dashboard → Settings → Database → Connection Pooling');
      }
    }
    
    return new Pool({
      connectionString: cleanUrl,
      // SECURITY: Verify TLS certificate in production; allow skip only when explicitly set for local/dev
      ssl: (cleanUrl.includes('supabase.co') || cleanUrl.includes('supabase.com'))
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
      max: 10, // Connection pool size
      connectionTimeoutMillis: 10000, // 10 second timeout
      idleTimeoutMillis: 30000, // 30 seconds
      allowExitOnIdle: false,
    });
  }

  // Fallback to individual env vars
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE;
  const port = process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432;

  if (!host || !user || !database) {
    throw new Error(
      'Missing PostgreSQL config. Set DATABASE_URL (recommended) or POSTGRES_HOST/POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DATABASE.'
    );
  }

  return new Pool({
    host,
    port,
    user,
    password,
    database,
    max: 10,
    connectionTimeoutMillis: 10000, // 10 second timeout
    idleTimeoutMillis: 30000, // 30 seconds
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    allowExitOnIdle: false,
  });
}

export function getPool(): Pool {
  if (!pool) {
    try {
      pool = createPool();
    } catch (error: any) {
      // Log the error with masked connection info
      const databaseUrl = process.env.DATABASE_URL;
      console.error('[DB] Failed to create connection pool');
      if (databaseUrl) {
        console.error('[DB] Connection string:', maskConnectionString(databaseUrl));
      }
      console.error('[DB] Error:', error?.message || error);
      throw error;
    }
  }
  return pool;
}

/**
 * Execute a SQL query with named parameters
 * Converts named parameters (:param) to PostgreSQL positional parameters ($1, $2, etc.)
 */
export async function sqlQuery<T = unknown>(
  query: string,
  params?: Record<string, unknown> | unknown[]
): Promise<T> {
  const pool = getPool();
  
  try {
    // If params is an array, use it directly (positional)
    if (Array.isArray(params)) {
      const result = await pool.query(query, params);
      return result.rows as T;
    }

    // If params is an object, convert named parameters to positional
    if (params && typeof params === 'object') {
      // Extract parameter names in order they appear in the query
      const paramNames: string[] = [];
      const paramValues: unknown[] = [];
      
      // Replace :paramName with $1, $2, etc.
      // Use negative lookbehind to avoid matching :: (PostgreSQL type casting)
      // Pattern: (?<!:) means "not preceded by a colon"
      const convertedQuery = query.replace(/(?<!:):(\w+)/g, (match, paramName) => {
        if (!paramNames.includes(paramName)) {
          paramNames.push(paramName);
          paramValues.push(params[paramName]);
        }
        const index = paramNames.indexOf(paramName) + 1;
        return `$${index}`;
      });

      const result = await pool.query(convertedQuery, paramValues);
      return result.rows as T;
    }

    // No parameters
    const result = await pool.query(query);
    return result.rows as T;
  } catch (error: any) {
    // Handle connection errors with helpful messages
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
      let errorMessage = '';
      let troubleshooting = '';
      
      if (error?.code === 'ECONNREFUSED') {
        errorMessage = 'Database connection refused.';
        troubleshooting = 'The database server is not accepting connections. Please check:\n' +
          '1. Is the database server running?\n' +
          '2. Is the port correct? (default: 5432)\n' +
          '3. Are firewall rules allowing connections?\n' +
          '4. If using IPv6, try using IPv4 address instead in your DATABASE_URL';
      } else if (error?.code === 'ENOTFOUND') {
        errorMessage = 'Database host not found.';
        const databaseUrl = process.env.DATABASE_URL;
        const isDirectConnection = databaseUrl?.includes('db.') && databaseUrl?.includes('.supabase.co');
        const isVercel = process.env.VERCEL === '1';
        
        troubleshooting = 'The database hostname cannot be resolved. Please check:\n' +
          '1. Is your DATABASE_URL or POSTGRES_HOST correct?\n' +
          '2. Is your DNS working correctly?\n' +
          '3. If using a cloud database (Supabase, etc.), verify the connection string';
        
        // Add specific guidance for Vercel + direct connections
        if (isDirectConnection && isVercel) {
          troubleshooting += '\n\n⚠️ IMPORTANT: Direct connections (db.*.supabase.co) often fail on Vercel/serverless.\n' +
            'Please use the POOLER connection string instead:\n' +
            '1. Go to Supabase Dashboard → Settings → Database → Connection Pooling\n' +
            '2. Select "Transaction" mode (recommended for most apps)\n' +
            '3. Copy the connection string (port 6543)\n' +
            '4. Update DATABASE_URL in Vercel environment variables\n' +
            '5. Pooler format: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres';
        }
      } else {
        errorMessage = 'Database connection timed out.';
        troubleshooting = 'The connection attempt timed out. Please check:\n' +
          '1. Is your network connection stable?\n' +
          '2. Is the database server accessible from your network?\n' +
          '3. Are there any network restrictions or VPN requirements?';
      }
      
      // Check if IPv6 address is in the error
      const ipv6Match = error?.message?.match(/\[([0-9a-f:]+)\]/i);
      if (ipv6Match) {
        troubleshooting += '\n\nNote: IPv6 address detected. If you\'re having connectivity issues, try:\n' +
          '- Using the IPv4 address instead in your DATABASE_URL\n' +
          '- Checking if your network supports IPv6';
      }
      
      const fullMessage = `${errorMessage}\n\nTroubleshooting:\n${troubleshooting}\n\nOriginal error: ${error?.message || 'Unknown error'}`;
      throw new Error(fullMessage);
    }
    
    // Handle password authentication failures (28P01)
    if (error?.code === '28P01' || error?.message?.includes('password authentication failed')) {
      const databaseUrl = process.env.DATABASE_URL || '';
      const isPoolerConnection = databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes('pooler.supabase.co');
      const usernameMatch = databaseUrl.match(/postgresql?:\/\/([^:]+)/);
      const username = usernameMatch ? usernameMatch[1] : 'unknown';
      
      let troubleshooting = 'Password authentication failed. Common causes:\n\n';
      
      // Check if using pooler connection with wrong username format
      if (isPoolerConnection && username === 'postgres') {
        troubleshooting += '⚠️ WRONG USERNAME FORMAT FOR POOLER CONNECTION!\n';
        troubleshooting += 'You are using "postgres" as the username, but pooler connections require:\n';
        troubleshooting += '  postgres.[YOUR-PROJECT-REF]\n\n';
        troubleshooting += 'To fix:\n';
        troubleshooting += '1. Go to Supabase Dashboard → Settings → Database → Connection Pooling\n';
        troubleshooting += '2. Copy the connection string from there (it should already have the correct format)\n';
        troubleshooting += '3. Format should be: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@...\n';
        troubleshooting += '4. Update DATABASE_URL in Vercel environment variables\n\n';
      } else {
        troubleshooting += '1. Check if the password in your DATABASE_URL is correct\n';
        troubleshooting += '2. If your password contains special characters, they must be URL-encoded:\n';
        troubleshooting += '   - @ becomes %40\n';
        troubleshooting += '   - # becomes %23\n';
        troubleshooting += '   - / becomes %2F\n';
        troubleshooting += '   - : becomes %3A\n';
        troubleshooting += '   - & becomes %26\n';
        troubleshooting += '   - + becomes %2B\n';
        troubleshooting += '   - = becomes %3D\n';
        troubleshooting += '   - % becomes %25\n';
        troubleshooting += '   - (space) becomes %20\n\n';
        troubleshooting += '3. For pooler connections, ensure username is: postgres.[PROJECT-REF]\n';
        troubleshooting += '4. Get a fresh connection string from Supabase Dashboard → Settings → Database\n';
        troubleshooting += '5. For pooler: Settings → Database → Connection Pooling → Transaction mode\n';
      }
      
      troubleshooting += '\nTo verify your connection string format:\n';
      troubleshooting += '- Direct connection: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres\n';
      troubleshooting += '- Pooler connection: postgresql://postgres.[PROJECT]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres\n';
      
      const authError = new Error(`Database password authentication failed for user "${username}".\n\nTroubleshooting:\n${troubleshooting}`);
      // Preserve the error code
      (authError as any).code = error?.code || '28P01';
      throw authError;
    }
    
    // Handle Supabase pooler authentication errors
    if (error?.code === 'XX000' || error?.message?.includes('Tenant or user not found')) {
      const troubleshooting = 'This error usually means:\n' +
        '1. The connection string username format is incorrect\n' +
        '2. For pooler connections, use: postgres.[PROJECT-REF]@pooler.supabase.com\n' +
        '3. The password might be incorrect\n' +
        '4. Verify the connection string in Supabase Dashboard → Settings → Database → Connection Pooling';
      throw new Error(`Database authentication failed: ${error?.message}\n\nTroubleshooting:\n${troubleshooting}`);
    }
    
    // Re-throw other errors as-is
    throw error;
  }
}

/**
 * Execute a SQL query with a client (for use within transactions)
 * Converts named parameters (:param) to PostgreSQL positional parameters ($1, $2, etc.)
 */
export function sqlQueryWithClient<T = unknown>(
  client: PoolClient,
  query: string,
  params?: Record<string, unknown> | unknown[]
): Promise<T> {
  // If params is an array, use it directly (positional)
  if (Array.isArray(params)) {
    return client.query(query, params).then(result => result.rows as T);
  }

  // If params is an object, convert named parameters to positional
  if (params && typeof params === 'object') {
    // Extract parameter names in order they appear in the query
    const paramNames: string[] = [];
    const paramValues: unknown[] = [];
    
    // Replace :paramName with $1, $2, etc.
    // Use negative lookbehind to avoid matching :: (PostgreSQL type casting)
    // Pattern: (?<!:) means "not preceded by a colon"
    const convertedQuery = query.replace(/(?<!:):(\w+)/g, (match, paramName) => {
      if (!paramNames.includes(paramName)) {
        paramNames.push(paramName);
        paramValues.push(params[paramName]);
      }
      const index = paramNames.indexOf(paramName) + 1;
      return `$${index}`;
    });

    return client.query(convertedQuery, paramValues).then(result => result.rows as T);
  }

  // No parameters
  return client.query(query).then(result => result.rows as T);
}

/**
 * Execute a function within a database transaction
 * The function receives a client that can be used to execute queries
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
