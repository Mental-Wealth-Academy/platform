export interface SNPRecord {
  rsid: string;
  content: string;
  scraped_at?: string;
}

export interface GenotypeRecord {
  id: string;
  content: string;
  scraped_at?: string;
  snp_id: string;
  genotype: string;
}

export interface GenosetRecord {
  id: string;
  content: string;
  scraped_at?: string;
}

export interface UserGenotype {
  rsid: string;
  chromosome: string;
  position: string;
  genotype: string;
}

export interface ParsedSNPData {
  rsid: string;
  rawContent: string;
  genotypeContent?: string;
  magnitude?: number;
  [key: string]: unknown;
}

export interface MatchedSNP extends UserGenotype {
  snpData: SNPRecord;
  genotypeData?: GenotypeRecord;
  parsedData: ParsedSNPData;
}

export interface MatchedGenoset {
  genoset: GenosetRecord;
  matchedGenotypes: MatchedSNP[];
  parsedData: {
    id: string;
    rawContent: string;
    magnitude?: number;
    [key: string]: unknown;
  };
}

export interface ParseResult {
  genotypes: UserGenotype[];
  totalLines: number;
  skippedLines: number;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  reason?: string;
  detectedFormat?: string;
}

export type ProgressCallback = (current: number, total: number) => void;

export interface ParserMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  fileExtensions: string[];
  providerUrl?: string;
}

export interface DNAParser {
  readonly metadata: ParserMetadata;
  validate(content: string): ValidationResult;
  parse(content: string, onProgress: ProgressCallback): Promise<ParseResult>;
}

export interface FormatDetectionResult {
  parser?: DNAParser;
  candidates: Array<{
    parser: DNAParser;
    validation: ValidationResult;
  }>;
  confident: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
