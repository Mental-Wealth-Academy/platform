import type { DNAParser, FormatDetectionResult } from '@/types/genetics';

export class ParserRegistry {
  private parsers = new Map<string, DNAParser>();

  register(parser: DNAParser): void {
    if (this.parsers.has(parser.metadata.id)) {
      throw new Error(`Parser with id "${parser.metadata.id}" is already registered`);
    }
    this.parsers.set(parser.metadata.id, parser);
  }

  get(id: string): DNAParser | undefined {
    return this.parsers.get(id);
  }

  getAll(): DNAParser[] {
    return Array.from(this.parsers.values());
  }

  getSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    for (const parser of this.parsers.values()) {
      parser.metadata.fileExtensions.forEach((ext) => extensions.add(ext));
    }
    return Array.from(extensions);
  }

  detectFormat(content: string): FormatDetectionResult {
    const candidates: FormatDetectionResult['candidates'] = [];

    for (const parser of this.parsers.values()) {
      try {
        const validation = parser.validate(content);
        if (validation.valid) {
          candidates.push({ parser, validation });
        }
      } catch (error) {
        console.warn(`Parser ${parser.metadata.id} validation failed:`, error);
      }
    }

    candidates.sort((a, b) => b.validation.confidence - a.validation.confidence);

    const topMatch = candidates[0];
    const secondMatch = candidates[1];
    const confident =
      !!topMatch &&
      topMatch.validation.confidence >= 0.8 &&
      (!secondMatch || topMatch.validation.confidence - secondMatch.validation.confidence > 0.2);

    return {
      parser: topMatch?.parser,
      candidates,
      confident,
    };
  }
}

export const parserRegistry = new ParserRegistry();
