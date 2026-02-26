export { parserRegistry, ParserRegistry } from './registry';

import parser23andMe from './23andme';
import parserAncestry from './ancestry';
import parserMyHeritage from './myheritage';
import parserFTDNA from './ftdna';
import { parserRegistry } from './registry';

export { parser23andMe, parserAncestry, parserMyHeritage, parserFTDNA };

parserRegistry.register(parser23andMe);
parserRegistry.register(parserAncestry);
parserRegistry.register(parserMyHeritage);
parserRegistry.register(parserFTDNA);

export function getAllParsers() {
  return parserRegistry.getAll();
}

export function getSupportedExtensions() {
  return parserRegistry.getSupportedExtensions();
}

export function detectFormat(content: string) {
  return parserRegistry.detectFormat(content);
}

export function getParser(id: string) {
  return parserRegistry.get(id);
}
