import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateGeneticsChatResponse } from '@/components/genetics/geneticsChatResponses';

describe('genetics chat privacy', () => {
  it('keeps the chat component free of server requests and genotype summaries', () => {
    const component = readFileSync(
      resolve(process.cwd(), 'components/genetics/GeneticsChat.tsx'),
      'utf8',
    );

    expect(component).not.toContain('fetch(');
    expect(component).not.toContain('/api/genetics/chat');
    expect(component).not.toContain('genotypeData');
    expect(component).toContain('What is a SNP?');
    expect(component).toContain('How is magnitude read?');
    expect(component).toContain('What is a genoset?');
    expect(component).toContain('How is my data handled?');
    expect(component).not.toContain('Top genetic risks?');
  });

  it('describes the local processing boundary precisely', () => {
    const reply = generateGeneticsChatResponse('Is my genetic data safe?', 42);

    expect(reply).toContain('DNA file, matched variants, and chat questions stay on this device');
    expect(reply).toContain('chat responses run in your browser');
    expect(reply).toContain('SNPedia reference database downloads separately');
  });

  it('answers general educational questions without uploaded matches', () => {
    expect(generateGeneticsChatResponse('What is a SNP?', 0)).toContain(
      'A SNP (Single Nucleotide Polymorphism)',
    );
    expect(generateGeneticsChatResponse('How is magnitude read?', 0)).toContain(
      'Magnitude in SNPedia',
    );
    expect(generateGeneticsChatResponse('What is a genoset?', 0)).toContain(
      'Genosets are combinations',
    );
    expect(generateGeneticsChatResponse('How is my data handled?', 0)).toContain(
      'stay on this device',
    );
  });

  it('requests an upload only when a question needs personal matches', () => {
    expect(generateGeneticsChatResponse('Where should I start?', 0)).toBe(
      'Upload your DNA file to ask about matched variants. You can browse the SNP database without uploading.',
    );
  });

  it('uses only the matched-SNP count in its default personalized reply', () => {
    const first = generateGeneticsChatResponse('Where should I start?', 17);
    const second = generateGeneticsChatResponse('Where should I start?', 17);

    expect(first).toBe(second);
    expect(first).toContain('17 matched SNPs');
  });
});
