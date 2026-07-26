export function generateGeneticsChatResponse(message: string, matchedSnpCount: number): string {
  const lower = message.toLowerCase();

  if (lower.includes('magnitude') || lower.includes('important') || lower.includes('significant')) {
    return 'Magnitude in SNPedia indicates the significance of a SNP result. Higher magnitudes (3+) are generally more noteworthy. Magnitude 0 means the genotype is the most common, while magnitude 4+ can indicate medically relevant findings. Check the SNPs tab and sort by magnitude to see your most notable genetic variants.';
  }

  if (lower.includes('brca') || lower.includes('cancer')) {
    return 'BRCA1 and BRCA2 are genes associated with hereditary breast and ovarian cancer. If your data shows matches for BRCA-related SNPs, check the magnitude and genotype-specific information carefully. Genetic data should be discussed with a genetic counselor or healthcare provider for proper interpretation.';
  }

  if (lower.includes('genoset') || lower.includes('trait')) {
    return 'Genosets are combinations of multiple genotypes that together indicate a specific trait, condition, or characteristic. They are more informative than individual SNPs because traits are often influenced by multiple genetic variants working together. Check the Genosets tab to see which genoset combinations match your data.';
  }

  if (lower.includes('how') && (lower.includes('read') || lower.includes('interpret') || lower.includes('understand'))) {
    return 'To interpret your results: 1) Start with the Genosets tab for trait-level insights. 2) In the SNPs tab, focus on high-magnitude entries (3+). 3) Click any SNP to see detailed information from SNPedia. 4) The "Genotype-Specific Information" section shows what your particular genotype means. Consult a healthcare provider for medical decisions.';
  }

  if (lower.includes('privacy') || lower.includes('data') || lower.includes('safe')) {
    return 'Your DNA file, matched variants, and chat questions stay on this device. Parsing, matching, and chat responses run in your browser. The SNPedia reference database downloads separately.';
  }

  if (lower.includes('snp') || lower.includes('what is')) {
    const explanation = 'A SNP (Single Nucleotide Polymorphism) is a variation at a single position in DNA. Each SNP represents a difference in a single nucleotide (A, T, C, or G). SNPs are the most common type of genetic variation and can influence traits, disease risk, and medication response.';
    return matchedSnpCount > 0
      ? `${explanation} Your uploaded file contains your genotypes for hundreds of thousands of these positions.`
      : explanation;
  }

  if (matchedSnpCount === 0) {
    return 'Upload your DNA file to ask about matched variants. You can browse the SNP database without uploading.';
  }

  return `Based on your uploaded data with ${matchedSnpCount} matched SNPs, I can help you explore specific genetic variants. Try asking about:

- Your most significant SNPs (highest magnitude)
- Specific genes (e.g., "Tell me about BRCA1")
- How to interpret genosets
- What a specific SNP means
- Privacy and data safety

For medical interpretation, consult a genetic counselor or healthcare provider.`;
}
