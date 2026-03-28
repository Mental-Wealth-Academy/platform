import type { DNAParser, ValidationResult, ProgressCallback, ParserMetadata, ParseResult, UserGenotype } from '@/types/genetics';

const METADATA: ParserMetadata = {
  id: 'ftdna',
  name: 'FamilyTreeDNA',
  description: 'FamilyTreeDNA raw data export (CSV format)',
  version: '1.0.0',
  fileExtensions: ['.csv'],
  providerUrl: 'https://www.familytreedna.com',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

export class ParserFTDNA implements DNAParser {
  readonly metadata = METADATA;

  validate(content: string): ValidationResult {
    const lines = content.split('\n').slice(0, 100);
    let hasFTDNAHeader = false;
    let hasCSVHeader = false;
    let hasRsidData = false;
    let validDataLines = 0;
    let hasQuotedValues = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) {
        const lower = trimmed.toLowerCase();
        if (lower.includes('familytreedna') || lower.includes('ftdna')) hasFTDNAHeader = true;
        continue;
      }

      const upper = trimmed.toUpperCase();
      if (upper.includes('RSID') && upper.includes('CHROMOSOME') && upper.includes('RESULT')) {
        hasCSVHeader = true;
        if (trimmed.includes('"')) hasQuotedValues = true;
        continue;
      }

      const parts = parseCSVLine(trimmed);
      if (parts.length >= 4 && /^(rs|i)\d+/i.test(parts[0])) {
        hasRsidData = true;
        validDataLines++;
        const [rsid, chromosome, position, result] = parts;
        if (
          /^(rs|i)\d+/i.test(rsid) &&
          /^(1?\d|2[0-2]|X|Y|MT)$/i.test(chromosome) &&
          /^\d+$/.test(position) &&
          /^[ACGT0-]{1,2}$/i.test(result)
        ) {
          // Valid
        } else {
          validDataLines--;
        }
      }
    }

    let confidence = 0;
    if (hasCSVHeader) confidence += 0.3;
    if (hasFTDNAHeader) confidence += 0.4;
    if (hasQuotedValues) confidence += 0.2;
    if (hasRsidData && validDataLines >= 3) confidence += 0.1;
    const valid = hasCSVHeader && hasRsidData;

    return {
      valid,
      confidence: valid ? confidence : 0,
      reason: valid
        ? `Detected FamilyTreeDNA CSV format with ${validDataLines} valid data lines`
        : "File doesn't appear to be FamilyTreeDNA CSV format",
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
      if (!line || line.startsWith('#')) { skippedLines++; continue; }

      const upper = line.toUpperCase();
      if (!headerFound && upper.includes('RSID') && upper.includes('CHROMOSOME')) {
        headerFound = true;
        skippedLines++;
        continue;
      }

      const parts = parseCSVLine(line);
      if (parts.length < 4) {
        errors.push(`Line ${i + 1}: expected 4 CSV columns, got ${parts.length}`);
        skippedLines++;
        continue;
      }

      const [rsid, chromosome, position, result] = parts;
      let genotype = result.toLowerCase();
      if (genotype === '0' || genotype === '00') genotype = '--';

      genotypes.push({ rsid: rsid.toLowerCase(), chromosome, position, genotype });
      if (i % 1000 === 0 || i === lines.length - 1) onProgress(i + 1, totalLines);
    }

    return { genotypes, totalLines, skippedLines, errors };
  }
}

const parserFTDNA = new ParserFTDNA();
export default parserFTDNA;
