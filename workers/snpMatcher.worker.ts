import { expose } from 'comlink';
import initSqlJs, { type Database } from 'sql.js';
import type {
  UserGenotype,
  MatchedSNP,
  SNPRecord,
  ParsedSNPData,
  ParseResult,
  GenosetRecord,
  MatchedGenoset,
  ValidationResult,
  ProgressCallback,
  ParserMetadata,
  DNAParser,
  FormatDetectionResult,
} from '../types/genetics';

// ── Inline parsers (workers can't use path aliases) ──

class ParserRegistry {
  private parsers = new Map<string, DNAParser>();
  register(parser: DNAParser): void { this.parsers.set(parser.metadata.id, parser); }
  get(id: string): DNAParser | undefined { return this.parsers.get(id); }
  getAll(): DNAParser[] { return Array.from(this.parsers.values()); }
  detectFormat(content: string): FormatDetectionResult {
    const candidates: FormatDetectionResult['candidates'] = [];
    for (const parser of this.parsers.values()) {
      try {
        const validation = parser.validate(content);
        if (validation.valid) candidates.push({ parser, validation });
      } catch { /* skip */ }
    }
    candidates.sort((a, b) => b.validation.confidence - a.validation.confidence);
    const topMatch = candidates[0];
    const secondMatch = candidates[1];
    const confident = !!topMatch && topMatch.validation.confidence >= 0.8 &&
      (!secondMatch || topMatch.validation.confidence - secondMatch.validation.confidence > 0.2);
    return { parser: topMatch?.parser, candidates, confident };
  }
}

// 23andMe
const parser23andMe: DNAParser = {
  metadata: { id: '23andme', name: '23andMe', description: '23andMe raw data', version: '1.0.0', fileExtensions: ['.txt', '.csv'] },
  validate(content: string): ValidationResult {
    const lines = content.split('\n').slice(0, 100);
    let hasComment = false, has23 = false, hasData = false, valid23 = 0;
    for (const l of lines) {
      const t = l.trim();
      if (t.startsWith('#')) { hasComment = true; if (t.toLowerCase().includes('23andme')) has23 = true; continue; }
      if (!t) continue;
      const p = t.split(/\s+/);
      if (p.length >= 4 && /^(rs|i)\d+/i.test(p[0])) { hasData = true; valid23++; }
    }
    const ok = hasComment && hasData;
    let c = 0; if (hasComment) c += 0.3; if (has23) c += 0.4; if (hasData) c += 0.2; if (valid23 >= 3) c += 0.1;
    return { valid: ok, confidence: ok ? c : 0, detectedFormat: ok ? '23andme' : undefined };
  },
  async parse(content: string, onProgress: ProgressCallback): Promise<ParseResult> {
    const lines = content.split('\n'); const genotypes: UserGenotype[] = []; const errors: string[] = []; let skipped = 0;
    onProgress(0, lines.length);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l || l.startsWith('#')) { skipped++; continue; }
      const p = l.split(/\s+/);
      if (p.length < 4) { errors.push(`Line ${i + 1}: bad format`); skipped++; continue; }
      genotypes.push({ rsid: p[0].toLowerCase(), chromosome: p[1], position: p[2], genotype: p[3].toLowerCase() });
      if (i % 1000 === 0) onProgress(i + 1, lines.length);
    }
    onProgress(lines.length, lines.length);
    return { genotypes, totalLines: lines.length, skippedLines: skipped, errors };
  },
};

// Ancestry
const parserAncestry: DNAParser = {
  metadata: { id: 'ancestry', name: 'Ancestry.com', description: 'AncestryDNA raw data', version: '1.0.0', fileExtensions: ['.txt', '.csv'] },
  validate(content: string): ValidationResult {
    const lines = content.split('\n').slice(0, 100);
    let hasComment = false, hasAnc = false, hasAllele = false, hasData = false, cnt = 0;
    for (const l of lines) {
      const t = l.trim();
      if (t.startsWith('#')) {
        hasComment = true; const lo = t.toLowerCase();
        if (lo.includes('ancestry')) hasAnc = true;
        if (lo.includes('allele1') && lo.includes('allele2')) hasAllele = true;
        continue;
      }
      if (!t) continue;
      const p = t.split(/\t/);
      if (p.length >= 5 && /^(rs|i)\d+/i.test(p[0])) { hasData = true; cnt++; }
    }
    const ok = hasComment && hasData;
    let c = 0; if (hasComment) c += 0.2; if (hasAnc) c += 0.4; if (hasAllele) c += 0.3; if (hasData) c += 0.1;
    return { valid: ok, confidence: ok ? c : 0, detectedFormat: ok ? 'ancestry' : undefined };
  },
  async parse(content: string, onProgress: ProgressCallback): Promise<ParseResult> {
    const lines = content.split('\n'); const genotypes: UserGenotype[] = []; const errors: string[] = []; let skipped = 0;
    onProgress(0, lines.length);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l || l.startsWith('#')) { skipped++; continue; }
      const p = l.split(/\t/);
      if (p.length < 5) { errors.push(`Line ${i + 1}: bad format`); skipped++; continue; }
      const g = (p[3] === '0' || p[4] === '0') ? '--' : (p[3] + p[4]).toLowerCase();
      genotypes.push({ rsid: p[0].toLowerCase(), chromosome: p[1], position: p[2], genotype: g });
      if (i % 1000 === 0) onProgress(i + 1, lines.length);
    }
    onProgress(lines.length, lines.length);
    return { genotypes, totalLines: lines.length, skippedLines: skipped, errors };
  },
};

// MyHeritage
const parserMyHeritage: DNAParser = {
  metadata: { id: 'myheritage', name: 'MyHeritage', description: 'MyHeritage DNA raw data', version: '1.0.0', fileExtensions: ['.csv'] },
  validate(content: string): ValidationResult {
    const lines = content.split('\n').slice(0, 100);
    let hasMH = false, hasCSV = false, hasData = false, isCSV = false, cnt = 0;
    for (const l of lines) {
      const t = l.trim();
      if (t.startsWith('##')) { if (t.toLowerCase().includes('myheritage')) hasMH = true; continue; }
      if (!t) continue;
      const u = t.toUpperCase();
      if (u.includes('RSID') && u.includes('CHROMOSOME') && u.includes('RESULT')) { hasCSV = true; isCSV = t.includes(','); continue; }
      const p = t.split(',');
      if (p.length >= 4 && /^(rs|i)\d+/i.test(p[0])) { hasData = true; cnt++; }
    }
    const ok = hasCSV && hasData && isCSV;
    let c = 0; if (hasCSV) c += 0.4; if (hasMH) c += 0.3; if (isCSV) c += 0.2; if (hasData && cnt >= 3) c += 0.1;
    return { valid: ok, confidence: ok ? c : 0, detectedFormat: ok ? 'myheritage' : undefined };
  },
  async parse(content: string, onProgress: ProgressCallback): Promise<ParseResult> {
    const lines = content.split('\n'); const genotypes: UserGenotype[] = []; const errors: string[] = []; let skipped = 0; let hdr = false;
    onProgress(0, lines.length);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l || l.startsWith('##')) { skipped++; continue; }
      if (!hdr && l.toUpperCase().includes('RSID')) { hdr = true; skipped++; continue; }
      const p = l.split(',');
      if (p.length < 4) { errors.push(`Line ${i + 1}: bad format`); skipped++; continue; }
      genotypes.push({ rsid: p[0].toLowerCase(), chromosome: p[1], position: p[2], genotype: p[3].toLowerCase() });
      if (i % 1000 === 0) onProgress(i + 1, lines.length);
    }
    onProgress(lines.length, lines.length);
    return { genotypes, totalLines: lines.length, skippedLines: skipped, errors };
  },
};

// FTDNA
function csvLine(line: string): string[] {
  const r: string[] = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { r.push(cur.trim()); cur = ''; } else cur += c;
  }
  r.push(cur.trim()); return r;
}
const parserFTDNA: DNAParser = {
  metadata: { id: 'ftdna', name: 'FamilyTreeDNA', description: 'FTDNA raw data', version: '1.0.0', fileExtensions: ['.csv'] },
  validate(content: string): ValidationResult {
    const lines = content.split('\n').slice(0, 100);
    let hasFT = false, hasCSV = false, hasData = false, hasQ = false, cnt = 0;
    for (const l of lines) {
      const t = l.trim();
      if (!t) continue;
      if (t.startsWith('#')) { const lo = t.toLowerCase(); if (lo.includes('familytreedna') || lo.includes('ftdna')) hasFT = true; continue; }
      const u = t.toUpperCase();
      if (u.includes('RSID') && u.includes('CHROMOSOME') && u.includes('RESULT')) { hasCSV = true; if (t.includes('"')) hasQ = true; continue; }
      const p = csvLine(t);
      if (p.length >= 4 && /^(rs|i)\d+/i.test(p[0])) { hasData = true; cnt++; }
    }
    const ok = hasCSV && hasData;
    let c = 0; if (hasCSV) c += 0.3; if (hasFT) c += 0.4; if (hasQ) c += 0.2; if (hasData && cnt >= 3) c += 0.1;
    return { valid: ok, confidence: ok ? c : 0, detectedFormat: ok ? 'ftdna' : undefined };
  },
  async parse(content: string, onProgress: ProgressCallback): Promise<ParseResult> {
    const lines = content.split('\n'); const genotypes: UserGenotype[] = []; const errors: string[] = []; let skipped = 0; let hdr = false;
    onProgress(0, lines.length);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l || l.startsWith('#')) { skipped++; continue; }
      if (!hdr && l.toUpperCase().includes('RSID')) { hdr = true; skipped++; continue; }
      const p = csvLine(l);
      if (p.length < 4) { errors.push(`Line ${i + 1}: bad format`); skipped++; continue; }
      let g = p[3].toLowerCase(); if (g === '0' || g === '00') g = '--';
      genotypes.push({ rsid: p[0].toLowerCase(), chromosome: p[1], position: p[2], genotype: g });
      if (i % 1000 === 0) onProgress(i + 1, lines.length);
    }
    onProgress(lines.length, lines.length);
    return { genotypes, totalLines: lines.length, skippedLines: skipped, errors };
  },
};

const parserRegistry = new ParserRegistry();
parserRegistry.register(parser23andMe);
parserRegistry.register(parserAncestry);
parserRegistry.register(parserMyHeritage);
parserRegistry.register(parserFTDNA);

// ── Database & matching logic ──

let db: Database | null = null;

const DB_URL = 'https://static.snpbrowser.com/snpedia.db';

const SNP_COLUMNS = 'rsid, content, scraped_at';
const GENOTYPE_JOIN_COLUMNS = `
  g.id as genotype_id, g.content as genotype_content, g.scraped_at as genotype_scraped_at,
  g.snp_id, g.genotype, s.rsid, s.content as snp_content, s.scraped_at as snp_scraped_at
`;

function extractMagnitude(content: string): number | undefined {
  const m = content.match(/magnitude[:\s=]+(\d+(?:\.\d+)?)/i);
  if (m && m[1]) { const v = parseFloat(m[1]); return isNaN(v) ? undefined : v; }
  return undefined;
}

type Orientation = 'plus' | 'minus' | 'unknown';

function parseOrientationFromContent(content: string): { orientation: Orientation; stabilizedOrientation: Orientation } {
  const normalize = (val: string | undefined | null): Orientation => {
    if (!val) return 'unknown';
    const v = val.trim().toLowerCase();
    if (v.startsWith('plus') || v === '+') return 'plus';
    if (v.startsWith('minus') || v === '-') return 'minus';
    return 'unknown';
  };
  const oM = content.match(/\|Orientation=([^|\n}]+)/i);
  const sM = content.match(/\|StabilizedOrientation=([^|\n}]+)/i);
  return { orientation: normalize(oM?.[1]), stabilizedOrientation: normalize(sM?.[1]) };
}

function complementGenotype(genotype: string): string {
  const map: Record<string, string> = { a: 't', t: 'a', c: 'g', g: 'c' };
  return genotype.split('').map((ch) => map[ch] ?? ch).join('');
}

function parseContentData(rsid: string, snpContent: string, genotypeContent?: string): ParsedSNPData {
  const magnitude = genotypeContent
    ? (extractMagnitude(genotypeContent) ?? extractMagnitude(snpContent))
    : extractMagnitude(snpContent);
  const { orientation, stabilizedOrientation } = parseOrientationFromContent(snpContent);
  return { rsid, rawContent: snpContent, genotypeContent, magnitude, orientation, stabilizedOrientation };
}

async function matchSNPsInBatches(
  database: Database,
  genotypes: UserGenotype[],
  onProgress: (current: number, total: number) => void,
): Promise<MatchedSNP[]> {
  const matches: MatchedSNP[] = [];
  const batchSize = 500;
  database.run('CREATE INDEX IF NOT EXISTS idx_genotypes_snp_id_lower ON genotypes(lower(snp_id));');

  for (let i = 0; i < genotypes.length; i += batchSize) {
    const batch = genotypes.slice(i, Math.min(i + batchSize, genotypes.length));
    const rsids = batch.map((g) => g.rsid);
    const placeholders = rsids.map(() => '?').join(',');
    const query = `SELECT ${GENOTYPE_JOIN_COLUMNS} FROM genotypes g INNER JOIN snps s ON g.snp_id = s.rsid WHERE lower(g.snp_id) IN (${placeholders})`;

    try {
      const stmt = database.prepare(query);
      stmt.bind(rsids);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        const snp_id = row.snp_id as string;
        const snpediaGenotype = (row.genotype as string).replace(/[^a-z0-9-]/gi, '').toLowerCase().trim();
        const snpContent = (row.snp_content as string) || '';
        const genotypeContent = (row.genotype_content as string) || '';
        const { orientation, stabilizedOrientation } = parseOrientationFromContent(snpContent);
        const effectiveOrientation: Orientation = stabilizedOrientation !== 'unknown' ? stabilizedOrientation : orientation;

        const userGenotype = batch.find((g) => {
          if (g.rsid !== snp_id) return false;
          if (g.genotype === '--') return false;
          if (!snpediaGenotype) return true;
          let norm = (g.genotype || '').toLowerCase().trim();
          if (effectiveOrientation === 'minus') norm = complementGenotype(norm);
          return norm === snpediaGenotype;
        });

        if (userGenotype) {
          const rsid = row.rsid as string;
          matches.push({
            ...userGenotype,
            snpData: { rsid, content: snpContent, scraped_at: row.snp_scraped_at as string | undefined },
            genotypeData: {
              id: row.genotype_id as string, content: genotypeContent,
              scraped_at: row.genotype_scraped_at as string | undefined,
              snp_id, genotype: snpediaGenotype,
            },
            parsedData: parseContentData(rsid, snpContent, genotypeContent),
          });
        }
      }
      stmt.free();
    } catch (error) {
      console.error('Error querying batch:', error);
    }
    if (i % 1000 === 0) onProgress(Math.min(i + batchSize, genotypes.length), genotypes.length);
  }
  return matches;
}

async function matchGenosetsInDB(
  database: Database,
  matchedSNPs: MatchedSNP[],
  onProgress: (current: number, total: number) => void,
): Promise<MatchedGenoset[]> {
  const matchedGenosets: MatchedGenoset[] = [];
  const genotypeIdToMatch = new Map<string, MatchedSNP>();
  matchedSNPs.forEach((m) => { if (m.genotypeData) genotypeIdToMatch.set(m.genotypeData.id, m); });

  try {
    const stmt = database.prepare('SELECT id, content, scraped_at FROM genosets');
    const allGenosets: GenosetRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      allGenosets.push({ id: row.id as string, content: row.content as string, scraped_at: row.scraped_at as string | undefined });
    }
    stmt.free();

    allGenosets.forEach((genoset, index) => {
      const matching: MatchedSNP[] = [];
      genotypeIdToMatch.forEach((m, gid) => {
        if (genoset.content.toLowerCase().includes(gid.toLowerCase())) matching.push(m);
      });
      if (matching.length > 0) {
        matchedGenosets.push({
          genoset,
          matchedGenotypes: matching,
          parsedData: { id: genoset.id, rawContent: genoset.content, magnitude: extractMagnitude(genoset.content) },
        });
      }
      if (index % 100 === 0 || index === allGenosets.length - 1) onProgress(index + 1, allGenosets.length);
    });
  } catch (error) {
    console.error('Error matching genosets:', error);
  }
  return matchedGenosets;
}

// ── Worker API ──

const workerApi = {
  async parseFile(
    fileContent: string,
    onProgress: (current: number, total: number) => void,
    parserId?: string,
  ): Promise<ParseResult & { detectedFormat?: string }> {
    let parser;
    if (parserId) {
      parser = parserRegistry.get(parserId);
      if (!parser) throw new Error(`Parser "${parserId}" not found`);
    } else {
      const detection = parserRegistry.detectFormat(fileContent);
      if (!detection.parser) throw new Error('Could not detect file format. Supported: 23andMe, AncestryDNA, MyHeritage, FamilyTreeDNA');
      parser = detection.parser;
    }
    const result = await parser.parse(fileContent, onProgress);
    return { ...result, detectedFormat: parser.metadata.id };
  },

  getAvailableParsers() {
    return parserRegistry.getAll().map((p) => ({
      id: p.metadata.id, name: p.metadata.name, description: p.metadata.description,
      fileExtensions: p.metadata.fileExtensions, providerUrl: p.metadata.providerUrl,
    }));
  },

  async loadDatabase(dbPath: string, onProgress: (progress: number) => void): Promise<void> {
    try {
      onProgress(0);
      onProgress(10);
      const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
      onProgress(30);

      const response = await fetch(dbPath || DB_URL, { credentials: 'omit' });
      if (!response.ok) throw new Error(`Failed to load database: ${response.statusText}`);

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        if (total > 0) onProgress(30 + (receivedLength / total) * 50);
      }
      onProgress(85);

      const dbBuffer = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) { dbBuffer.set(chunk, position); position += chunk.length; }
      onProgress(90);

      db = new SQL.Database(dbBuffer);
      onProgress(100);
    } catch (error) {
      db = null;
      throw error;
    }
  },

  getDatabaseStats(): { totalSNPs: number } {
    if (!db) throw new Error('Database not loaded');
    try {
      const result = db.exec('SELECT COUNT(*) as count FROM snps');
      if (result.length > 0 && result[0].values.length > 0) return { totalSNPs: result[0].values[0][0] as number };
    } catch (error) {
      console.error('Error getting database stats:', error);
    }
    return { totalSNPs: 0 };
  },

  async matchSNPs(genotypes: UserGenotype[], onProgress: (current: number, total: number) => void): Promise<MatchedSNP[]> {
    if (!db) throw new Error('Database not loaded');
    return matchSNPsInBatches(db, genotypes, onProgress);
  },

  async matchGenosets(matchedSNPs: MatchedSNP[], onProgress: (current: number, total: number) => void): Promise<MatchedGenoset[]> {
    if (!db) throw new Error('Database not loaded');
    return matchGenosetsInDB(db, matchedSNPs, onProgress);
  },

  async searchSNPs(filters: {
    searchTerm?: string; chromosome?: string; gene?: string;
    clinicalSignificance?: string; disease?: string; limit?: number; offset?: number;
  }): Promise<{ results: SNPRecord[]; total: number }> {
    if (!db) throw new Error('Database not loaded');

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.searchTerm?.trim()) {
      const term = `%${filters.searchTerm.trim()}%`;
      conditions.push('(rsid LIKE ? OR content LIKE ?)');
      params.push(term, term);
    }
    if (filters.chromosome) { conditions.push('chromosome = ?'); params.push(filters.chromosome); }
    if (filters.gene?.trim()) { const g = `%${filters.gene.trim()}%`; conditions.push('(gene LIKE ? OR gene_s LIKE ? OR clin_gene_name LIKE ?)'); params.push(g, g, g); }
    if (filters.clinicalSignificance) { conditions.push('clin_sig LIKE ?'); params.push(`%${filters.clinicalSignificance}%`); }
    if (filters.disease?.trim()) { conditions.push('clin_disease LIKE ?'); params.push(`%${filters.disease.trim()}%`); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM snps ${whereClause}`);
    if (params.length > 0) countStmt.bind(params);
    countStmt.step();
    const total = (countStmt.getAsObject().count as number) || 0;
    countStmt.free();

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const results: SNPRecord[] = [];
    const stmt = db.prepare(`SELECT ${SNP_COLUMNS} FROM snps ${whereClause} LIMIT ? OFFSET ?`);
    stmt.bind([...params, limit, offset]);
    while (stmt.step()) results.push(stmt.getAsObject() as unknown as SNPRecord);
    stmt.free();

    return { results, total };
  },
};

export type SNPMatcherWorkerApi = typeof workerApi;

expose(workerApi);
