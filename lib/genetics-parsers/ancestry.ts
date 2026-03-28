import type { DNAParser, ValidationResult, ProgressCallback, ParserMetadata, ParseResult, UserGenotype } from '@/types/genetics';

const METADATA: ParserMetadata = {
  id: 'ancestry',
  name: 'Ancestry.com',
  description: 'AncestryDNA raw data export (TXT or CSV format)',
  version: '1.0.0',
  fileExtensions: ['.txt', '.csv'],
  providerUrl: 'https://www.ancestry.com',
};

export class ParserAncestry implements DNAParser {
  readonly metadata = METADATA;

  validate(content: string): ValidationResult {
    const lines = content.split('\n').slice(0, 100);
    let hasCommentLines = false;
    let hasAncestryHeader = false;
    let hasAlleleColumns = false;
    let hasRsidData = false;
    let validDataLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        hasCommentLines = true;
        const lower = trimmed.toLowerCase();
        if (lower.includes('ancestry') || lower.includes('ancestrydna')) hasAncestryHeader = true;
        if (lower.includes('allele1') && lower.includes('allele2')) hasAlleleColumns = true;
        continue;
      }
      if (!trimmed) continue;

      const parts = trimmed.split(/\t/);
      if (parts.length >= 5 && /^(rs|i)\d+/i.test(parts[0])) {
        hasRsidData = true;
        validDataLines++;
        const [rsid, chromosome, position, allele1, allele2] = parts;
        if (
          /^(rs|i)\d+/i.test(rsid) &&
          /^(1?\d|2[0-2]|X|Y|MT)$/i.test(chromosome) &&
          /^\d+$/.test(position) &&
          /^[ACGTDI0-]$/i.test(allele1) &&
          /^[ACGTDI0-]$/i.test(allele2)
        ) {
          // Valid
        } else {
          validDataLines--;
        }
      }
    }

    let confidence = 0;
    if (hasCommentLines) confidence += 0.2;
    if (hasAncestryHeader) confidence += 0.4;
    if (hasAlleleColumns) confidence += 0.3;
    if (hasRsidData) confidence += 0.1;
    const valid = hasCommentLines && hasRsidData;

    return {
      valid,
      confidence: valid ? confidence : 0,
      reason: valid
        ? `Detected AncestryDNA format with ${validDataLines} valid data lines`
        : "File doesn't appear to have AncestryDNA format",
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

      const parts = line.split(/\t/);
      if (parts.length < 5) {
        errors.push(`Line ${i + 1}: expected 5 columns, got ${parts.length}`);
        skippedLines++;
        continue;
      }

      const [rsid, chromosome, position, allele1, allele2] = parts;
      let genotype: string;
      if (allele1 === '0' || allele2 === '0') {
        genotype = '--';
      } else {
        genotype = (allele1 + allele2).toLowerCase();
      }

      genotypes.push({ rsid: rsid.toLowerCase(), chromosome, position, genotype });
      if (i % 1000 === 0 || i === lines.length - 1) onProgress(i + 1, totalLines);
    }

    return { genotypes, totalLines, skippedLines, errors };
  }
}

const parserAncestry = new ParserAncestry();
export default parserAncestry;
