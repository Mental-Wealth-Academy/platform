import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getServerSecret(): string {
  const secret = process.env.NOTES_ENCRYPTION_KEY || process.env.DATABASE_URL;
  if (!secret) throw new Error('No encryption secret available');
  return secret;
}

function deriveKey(userId: string, domain = 'daily-notes'): Buffer {
  return createHmac('sha256', getServerSecret())
    .update(`${domain}:${userId}`)
    .digest();
}

export function encryptForUser(userId: string, plaintext: string, domain = 'daily-notes'): string {
  const key = deriveKey(userId, domain);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv):base64(tag):base64(encrypted)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptForUser(userId: string, ciphertext: string, domain = 'daily-notes'): string {
  const key = deriveKey(userId, domain);
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');
  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
