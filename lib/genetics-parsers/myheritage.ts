import type { DNAParser, ValidationResult, ProgressCallback, ParserMetadata, ParseResult, UserGenotype } from '@/types/genetics';

const METADATA: ParserMetadata = {
  id: 'myheritage',
  name: 'MyHeritage',
  description: 'MyHeritage DNA raw data export (CSV format)',
  version: '1.0.0',
  fileExtensions: ['.csv'],
  providerUrl: 'https://www.myheritage.com',
};

export class ParserMyHeritage implements DNAParser {
  readonly metadata = METADATA;

  validate(content: string): ValidationResult {
    const lines = content.split('\n').slice(0, 100);
    let hasMyHeritageHeader = false;
    let hasCSVHeader = false;
    let hasRsidData = false;
    let validDataLines = 0;
    let isCSVFormat = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('##')) {
        if (trimmed.toLowerCase().includes('myheritage')) hasMyHeritageHeader = true;
        continue;
      }
      if (!trimmed) continue;

      const upper = trimmed.toUpperCase();
      if (upper.includes('RSID') && upper.includes('CHROMOSOME') && upper.includes('RESULT')) {
        hasCSVHeader = true;
        isCSVFormat = trimmed.includes(',');
        continue;
      }

      const parts = trimmed.split(',');
      if (parts.length >= 4 && /^(rs|i)\d+/i.test(parts[0])) {
        hasRsidData = true;
        validDataLines++;
        const [rsid, chromosome, position, result] = parts;
        if (
          /^(rs|i)\d+/i.test(rsid) &&
          /^(1?\d|2[0-2]|X|Y|MT)$/i.test(chromosome) &&
          /^\d+$/.test(position) &&
          /^[ACGT-]{1,2}$/i.test(result)
        ) {
          // Valid
        } else {
          validDataLines--;
        }
      }
    }

    let confidence = 0;
    if (hasCSVHeader) confidence += 0.4;
    if (hasMyHeritageHeader) confidence += 0.3;
    if (isCSVFormat) confidence += 0.2;
    if (hasRsidData && validDataLines >= 3) confidence += 0.1;
    const valid = hasCSVHeader && hasRsidData && isCSVFormat;

    return {
      valid,
      confidence: valid ? confidence : 0,
      reason: valid
        ? `Detected MyHeritage CSV format with ${validDataLines} valid data lines`
        : "File doesn't appear to be MyHeritage CSV format",
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
    let headerFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('##')) { skippedLines++; continue; }

      const upper = line.toUpperCase();
      if (!headerFound && upper.includes('RSID') && upper.includes('CHROMOSOME')) {
        headerFound = true;
        skippedLines++;
        continue;
      }

      const parts = line.split(',');
      if (parts.length < 4) {
        errors.push(`Line ${i + 1}: expected 4 CSV columns, got ${parts.length}`);
        skippedLines++;
        continue;
      }

      const [rsid, chromosome, position, result] = parts;
      genotypes.push({ rsid: rsid.toLowerCase(), chromosome, position, genotype: result.toLowerCase() });
      if (i % 1000 === 0 || i === lines.length - 1) onProgress(i + 1, totalLines);
    }

    return { genotypes, totalLines, skippedLines, errors };
  }
}

export default new ParserMyHeritage();
