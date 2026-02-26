import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // For now, provide helpful responses based on the question and available context
    const reply = generateLocalResponse(message, context);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Genetics chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateLocalResponse(message: string, context: string): string {
  const lower = message.toLowerCase();

  if (context === 'No genetic data has been uploaded yet.') {
    return 'Please upload your DNA data file first (from 23andMe, AncestryDNA, MyHeritage, or FamilyTreeDNA) to get personalized genetic insights. You can also browse the SNP database without uploading.';
  }

  if (lower.includes('magnitude') || lower.includes('important') || lower.includes('significant')) {
    return 'Magnitude in SNPedia indicates the significance of a SNP result. Higher magnitudes (3+) are generally more noteworthy. Magnitude 0 means the genotype is the most common, while magnitude 4+ can indicate medically relevant findings. Check the SNPs tab and sort by magnitude to see your most notable genetic variants.';
  }

  if (lower.includes('brca') || lower.includes('cancer')) {
    return 'BRCA1 and BRCA2 are genes associated with hereditary breast and ovarian cancer. If your data shows matches for BRCA-related SNPs, check the magnitude and genotype-specific information carefully. Remember that genetic data should be discussed with a genetic counselor or healthcare provider for proper interpretation.';
  }

  if (lower.includes('genoset') || lower.includes('trait')) {
    return 'Genosets are combinations of multiple genotypes that together indicate a specific trait, condition, or characteristic. They\'re more informative than individual SNPs because traits are often influenced by multiple genetic variants working together. Check the Genosets tab to see which genoset combinations match your data.';
  }

  if (lower.includes('how') && (lower.includes('read') || lower.includes('interpret') || lower.includes('understand'))) {
    return 'To interpret your results: 1) Start with the Genosets tab for trait-level insights. 2) In the SNPs tab, focus on high-magnitude entries (3+). 3) Click any SNP to see detailed information from SNPedia. 4) The "Genotype-Specific Information" section shows what your particular genotype means. Always consult a healthcare provider for medical decisions.';
  }

  if (lower.includes('privacy') || lower.includes('data') || lower.includes('safe')) {
    return 'Your genetic data is processed entirely in your browser using a local SQLite database. No genetic information is sent to any server. The only network request is downloading the SNPedia database itself. Your DNA data never leaves your device.';
  }

  if (lower.includes('snp') || lower.includes('what is')) {
    return 'A SNP (Single Nucleotide Polymorphism) is a variation at a single position in DNA. Each SNP represents a difference in a single nucleotide (A, T, C, or G). SNPs are the most common type of genetic variation and can influence traits, disease risk, and medication response. Your uploaded file contains your genotypes for hundreds of thousands of these positions.';
  }

  // Default response with context awareness
  const snpCountMatch = context.match(/(\d+) matched SNPs/);
  const snpCount = snpCountMatch ? snpCountMatch[1] : 'your';

  return `Based on your uploaded data with ${snpCount} matched SNPs, I can help you explore specific genetic variants. Try asking about:\n\n- Your most significant SNPs (highest magnitude)\n- Specific genes (e.g., "Tell me about BRCA1")\n- How to interpret genosets\n- What a specific SNP means\n- Privacy and data safety\n\nFor medical interpretation, always consult a genetic counselor or healthcare provider.`;
}
