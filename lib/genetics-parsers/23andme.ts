import type { DNAParser, ValidationResult, ProgressCallback, ParserMetadata, ParseResult, UserGenotype } from '@/types/genetics';

const METADATA: ParserMetadata = {
  id: '23andme',
  name: '23andMe',
  description: '23andMe raw data export (TXT or CSV format)',
  version: '1.0.0',
  fileExtensions: ['.txt', '.csv'],
  providerUrl: 'https://www.23andme.com',
};

export class Parser23andMe implements DNAParser {
  readonly metadata = METADATA;

  validate(content: string): ValidationResult {
    const lines = content.split('\n').slice(0, 100);
    let hasCommentLines = false;
    let has23andMeHeader = false;
    let hasRsidData = false;
    let validDataLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        hasCommentLines = true;
        if (trimmed.toLowerCase().includes('23andme')) has23andMeHeader = true;
        continue;
      }
      if (!trimmed) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4 && /^(rs|i)\d+/i.test(parts[0])) {
        hasRsidData = true;
        validDataLines++;
        const [rsid, chromosome, position, genotype] = parts;
        if (
          /^(rs|i)\d+/i.test(rsid) &&
          /^(1?\d|2[0-2]|X|Y|MT)$/i.test(chromosome) &&
          /^\d+$/.test(position) &&
          /^[ACGT-]{1,2}$/i.test(genotype)
        ) {
          // Valid
        } else {
          validDataLines--;
        }
      }
    }

    let confidence = 0;
    if (hasCommentLines) confidence += 0.3;
    if (has23andMeHeader) confidence += 0.4;
    if (hasRsidData) confidence += 0.2;
    if (validDataLines >= 3) confidence += 0.1;
    const valid = hasCommentLines && hasRsidData;

    return {
      valid,
      confidence: valid ? confidence : 0,
      reason: valid
        ? `Detected 23andMe format with ${validDataLines} valid data lines`
        : "File doesn't appear to have 23andMe format",
      detectedFormat: valid ? METADATA.id : undefined,
    };
  }

  async parse(content: string, onProgress: ProgressCallback): Promise<ParseResult> {
    const lines = content.split('\n');
    const genotypes: UserGenotype[] = [];
    const errors: string[] = [];
    let skippedLines = 0;
    const totalLines = lines.length;
    onProgress(0, totalLines);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) { skippedLines++; continue; }

      const parts = line.split(/\s+/);
      if (parts.length < 4) {
        errors.push(`Line ${i + 1}: expected 4 columns, got ${parts.length}`);
        skippedLines++;
        continue;
      }

      const [rsid, chromosome, position, genotype] = parts;
      genotypes.push({ rsid: rsid.toLowerCase(), chromosome, position, genotype: genotype.toLowerCase() });

      if (i % 1000 === 0 || i === lines.length - 1) onProgress(i + 1, totalLines);
    }

    return { genotypes, totalLines, skippedLines, errors };
  }
}

const parser23andMe = new Parser23andMe();
export default parser23andMe;
