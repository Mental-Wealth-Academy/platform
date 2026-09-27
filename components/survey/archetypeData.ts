import type { SurveyResults, SurveyDimension, ViaStrengthRanking } from './types';

export interface ArchetypeProfile {
  title: string;
  subtitle: string;
  alias: string;
  rarity: string;
  imageSrc: string;
  summary: string;
  traits: string[];
  innerStrengths: Array<{ label: string; score: number; desc: string }>;
  relationalHabits: Array<{ label: string; score: number; desc: string }>;
  growthAdvice: string[];
  recommendedGuideSlug?: string;
  recommendedGuideTitle?: string;
}

export function resolveArchetype(results: SurveyResults): ArchetypeProfile {
  const surveyId = results.surveyId;
  const profileType = (results.profileType || results.personalizedTitle || '').toLowerCase();

  // 1. Attachment Style
  if (surveyId === 'attachment-style') {
    if (profileType.includes('secure')) {
      return {
        title: 'Anchor',
        subtitle: '(Grounded Leader)',
        alias: 'The Grounded Connector, Trusted Base',
        rarity: 'HIGH EMOTIONAL REGULATION · 50% OF POPULATION',
        imageSrc: '/archetypes/anchor.png',
        summary: 'You operate with rooted emotional security, balancing healthy intimacy with personal autonomy. You communicate directly, recover quickly from rupture, and offer an anchoring presence for those around you.',
        traits: ['Clear Communication', 'Emotionally Available', 'Comfortable With Autonomy', 'Rupture Repair'],
        innerStrengths: [
          { label: 'Self-Regulation', score: 92, desc: 'Steady emotional baseline under relational friction' },
          { label: 'Trust Capacity', score: 88, desc: 'Natural willingness to depend on and support others' },
          { label: 'Autonomy', score: 85, desc: 'Strong sense of identity independent of external validation' },
          { label: 'Resilience', score: 90, desc: 'Swift emotional re-centering after conflict' },
        ],
        relationalHabits: [
          { label: 'Direct Repair', score: 94, desc: 'Addresses misunderstandings without defensive withdrawal' },
          { label: 'Boundary Clarity', score: 86, desc: 'Sets firm, kind boundaries without guilt' },
          { label: 'Attunement', score: 89, desc: 'High capacity to read partners without hypervigilance' },
          { label: 'Vulnerability', score: 84, desc: 'Shares emotional depth without anxiety of rejection' },
        ],
        growthAdvice: [
          'Cultivate patience with loved ones who experience anxious or avoidant defense triggers.',
          'Notice when your stability causes you to overlook subtle emotional distress in others.',
          'Explore deeper spiritual and creative edges where vulnerability requires taking new risks.',
        ],
        recommendedGuideSlug: 'shadow-work-fundamentals',
        recommendedGuideTitle: 'Shadow Work Fundamentals',
      };
    }

    if (profileType.includes('anxious')) {
      return {
        title: 'Empath',
        subtitle: '(Sensor)',
        alias: 'The Intuitive Attuner, Deep Connector',
        rarity: 'HIGH RELATIONAL SENSITIVITY · TOP 18%',
        imageSrc: '/archetypes/empath.png',
        summary: 'Your relational radar is exceptionally sensitive. You read subtle shifts in tone and energy with unmatched precision, possessing an immense capacity for love, devotion, and heartfelt closeness.',
        traits: ['Hyper-Attunement', 'Deep Empathy', 'Loyalty', 'Emotional Depth'],
        innerStrengths: [
          { label: 'Attunement', score: 96, desc: 'Exceptional radar for relational and social nuances' },
          { label: 'Devotion', score: 91, desc: 'Willingness to invest fully in meaningful bonds' },
          { label: 'Empathy', score: 94, desc: 'Deep capacity to hold emotional space for others' },
          { label: 'Intuition', score: 88, desc: 'Instantaneous gut reads on interpersonal dynamics' },
        ],
        relationalHabits: [
          { label: 'Self-Soothing', score: 62, desc: 'Developing inner anchoring when reassurance is delayed' },
          { label: 'Pacing', score: 68, desc: 'Learning to let connections unfold without urgency' },
          { label: 'Clear Voice', score: 75, desc: 'Expressing primary needs directly instead of testing' },
          { label: 'Self-Anchor', score: 64, desc: 'Distinguishing partner mood from personal worth' },
        ],
        growthAdvice: [
          'Practice somatic pauses: when you sense a shift, breathe into your own physical center before acting.',
          'State what you want directly in one calm sentence instead of dropping hints or seeking reassurance.',
          'Channel your deep empathy into creative or academic focus where intense perception becomes a superpower.',
        ],
        recommendedGuideSlug: 'somatic-nervous-system-reset',
        recommendedGuideTitle: 'Somatic Nervous System Reset',
      };
    }

    if (profileType.includes('fearful') || profileType.includes('disorganized')) {
      return {
        title: 'Sage',
        subtitle: '(Deep Observer)',
        alias: 'The Sentinel, Vigilant Explorer',
        rarity: 'COMPLEX SPECTRUM · TOP 8% OF ASSESSMENTS',
        imageSrc: '/archetypes/sage.png',
        summary: 'You hold both an intense hunger for deep connection and a powerful protective instinct to retreat when intimacy gets overwhelming. Your depth of perception is extraordinary once your nervous system finds safe harbor.',
        traits: ['Deep Insight', 'Protective Radar', 'Complex Emotional Range', 'Truth Seeking'],
        innerStrengths: [
          { label: 'Perception Depth', score: 95, desc: 'Penetrating clarity into human motives and dynamics' },
          { label: 'Adaptability', score: 87, desc: 'Versatile navigation across varied emotional terrain' },
          { label: 'Resilience', score: 89, desc: 'Deep reserves built through weathering relational storms' },
          { label: 'Courage', score: 82, desc: 'Continuing to seek genuine truth despite old wounds' },
        ],
        relationalHabits: [
          { label: 'Internal Safety', score: 65, desc: 'Establishing unconditional safety inside your body' },
          { label: 'Gradual Closeness', score: 70, desc: 'Allowing intimacy in measured, safe increments' },
          { label: 'Signal Disentangling', score: 68, desc: 'Distinguishing past memory from present reality' },
          { label: 'Consistent Rhythm', score: 72, desc: 'Replacing push-pull cycles with predictable cadence' },
        ],
        growthAdvice: [
          'Notice the moment your protector impulse wants to flee or fight; identify which old memory is speaking.',
          'Celebrate micro-commitments: small, reliable daily routines build trust with yourself first.',
          'Anchor your intellectual brilliance in somatic grounding exercises before entering vulnerable conversations.',
        ],
        recommendedGuideSlug: 'shadow-work-fundamentals',
        recommendedGuideTitle: 'Shadow Work Fundamentals',
      };
    }

    // Default Avoidant
    return {
      title: 'Strategist',
      subtitle: '(Sovereign)',
      alias: 'The Self-Reliant Architect, Solitary Engine',
      rarity: 'HIGH AUTONOMY DRIVE · TOP 14%',
      imageSrc: '/archetypes/strategist.png',
      summary: 'You pride yourself on self-sufficiency, precision, and emotional sovereignty. When stress peaks, you retreat into your internal workshop to analyze, solve, and stabilize without burdening others.',
      traits: ['Self-Reliance', 'Objective Focus', 'Crisis Stability', 'Boundary Mastery'],
      innerStrengths: [
        { label: 'Autonomy', score: 96, desc: 'Supreme independence and functional competence' },
        { label: 'Objectivity', score: 92, desc: 'Ability to de-escalate drama and analyze facts cleanly' },
        { label: 'Focus', score: 90, desc: 'Deep uninterrupted flow on creative and technical goals' },
        { label: 'Composure', score: 89, desc: 'Calm exterior during emotional turbulence' },
      ],
      relationalHabits: [
        { label: 'Emotional Sharing', score: 60, desc: 'Allowing allies to see the process, not just the result' },
        { label: 'Interdependence', score: 66, desc: 'Experiencing mutual support without fear of entrapment' },
        { label: 'Warm Presence', score: 74, desc: 'Staying physically and emotionally present during repair' },
        { label: 'Vulnerability', score: 58, desc: 'Recognizing that needing companionship is human, not weak' },
      ],
      growthAdvice: [
        'Practice inviting trusted allies into your problem-solving space before everything is finalized.',
        'When you feel the reflex to shut down or withdraw, announce your pause explicitly: "I need 20 minutes to process, then I am right back."',
        'Recognize that emotional interdependence is the greatest multiplier of your strategic impact.',
      ],
      recommendedGuideSlug: 'cognitive-reappraisal-mastery',
      recommendedGuideTitle: 'Cognitive Reappraisal Mastery',
    };
  }

  // 2. Big Five Personality
  if (surveyId === 'big-five') {
    const dims = results.dimensions || [];
    const openScore = dims.find((d) => d.id === 'openness')?.score ?? 70;
    const consScore = dims.find((d) => d.id === 'conscientiousness')?.score ?? 70;
    const extScore = dims.find((d) => d.id === 'extraversion')?.score ?? 50;

    if (openScore >= 75) {
      return {
        title: 'Visionary',
        subtitle: '(Magician)',
        alias: 'The Pattern Seeker, Conceptual Pioneer',
        rarity: 'HIGH COGNITIVE DIVERGENCE · TOP 4.2%',
        imageSrc: '/archetypes/visionary.png',
        summary: 'Your mind operates as an intuitive synthesis engine. You see cross-disciplinary connections where others see separate domains, naturally generating novel conceptual frameworks and creative breakthroughs.',
        traits: ['Conceptual Synthesis', 'Intellectual Curiosity', 'Aesthetic Depth', 'Cognitive Flexibility'],
        innerStrengths: [
          { label: 'Openness', score: Math.round(openScore), desc: 'Fluid exploration of ideas, art, and abstract theory' },
          { label: 'Originality', score: 93, desc: 'Spontaneous generation of unconventional viewpoints' },
          { label: 'Curiosity', score: 95, desc: 'Insatiable drive to understand root mechanisms' },
          { label: 'Synthesis', score: 90, desc: 'Mapping disparate concepts into unified mental models' },
        ],
        relationalHabits: [
          { label: 'Inspiration', score: 88, desc: 'Sparking intellectual curiosity in collaborators' },
          { label: 'Dialogue Depth', score: 92, desc: 'Thrives in high-signal, philosophical discourse' },
          { label: 'Patience With Basics', score: 68, desc: 'Translating complex vision into practical execution' },
          { label: 'Grounding', score: 72, desc: 'Maintaining routine execution between bursts of inspiration' },
        ],
        growthAdvice: [
          'Pair your visionary ideation with strict execution anchors to bring high-dimensional theories to earth.',
          'Practice simplifying complex models into clear, human-scale analogies for your team.',
          'Protect dedicated offline reflection hours from digital fragmentation.',
        ],
        recommendedGuideSlug: 'deep-work-architecture',
        recommendedGuideTitle: 'Deep Work Architecture',
      };
    }

    if (consScore >= 75) {
      return {
        title: 'Sage',
        subtitle: '(Architect)',
        alias: 'The Precision Strategist, System Builder',
        rarity: 'HIGH EXECUTION PRECISION · TOP 6.5%',
        imageSrc: '/archetypes/sage.png',
        summary: 'You excel at transforming ambiguity into durable, high-leverage systems. With disciplined attention to detail and unwavering follow-through, you build engines that outlast short-term market noise.',
        traits: ['Systematic Execution', 'High Discipline', 'Strategic Patience', 'Quality Benchmark'],
        innerStrengths: [
          { label: 'Conscientiousness', score: Math.round(consScore), desc: 'Disciplined organization and dependable execution' },
          { label: 'Methodology', score: 94, desc: 'Relentless refinement of operating workflows' },
          { label: 'Patience', score: 91, desc: 'Compounding long-term gains through steady momentum' },
          { label: 'Focus', score: 89, desc: 'Unbroken concentration on complex multi-stage objectives' },
        ],
        relationalHabits: [
          { label: 'Reliability', score: 98, desc: 'Impeccable word and execution standards' },
          { label: 'Structure Setting', score: 90, desc: 'Creates clarity and role stability for collaborators' },
          { label: 'Spontaneity', score: 65, desc: 'Allowing room for productive chaos and exploratory play' },
          { label: 'Flexibility', score: 70, desc: 'Adapting blueprints when underlying premises shift' },
        ],
        growthAdvice: [
          'Allow yourself to prototype imperfect solutions: speed to feedback often beats pre-planned perfection.',
          'Schedule deliberate unstructured time to foster unexpected serendipity.',
          'Acknowledge and celebrate milestone achievements before rushing to the next backlog item.',
        ],
        recommendedGuideSlug: 'habit-loop-engineering',
        recommendedGuideTitle: 'Habit Loop Engineering',
      };
    }

    return {
      title: 'Anchor',
      subtitle: '(Leader)',
      alias: 'The Dynamic Operator, Grounded Driver',
      rarity: 'BALANCED OPERATING SPECTRUM · TOP 12%',
      imageSrc: '/archetypes/anchor.png',
      summary: 'You embody a balanced, practical intelligence. Equal parts thinker and doer, you bridge strategic theory and real-world execution with steady composure.',
      traits: ['Balanced Temperament', 'Practical Wisdom', 'Adaptive Communication', 'Reliable Driver'],
      innerStrengths: [
        { label: 'Equilibrium', score: 88, desc: 'Healthy balance across introverted and extroverted modes' },
        { label: 'Adaptability', score: 86, desc: 'Easily shifts gears between different social contexts' },
        { label: 'Steadiness', score: 90, desc: 'Dependable operational baseline under pressure' },
        { label: 'Clarity', score: 85, desc: 'Clean pragmatic evaluation of opportunities and risks' },
      ],
      relationalHabits: [
        { label: 'Consensus Building', score: 89, desc: 'Brings divergent viewpoints into workable alignment' },
        { label: 'Clear Feedback', score: 87, desc: 'Constructive guidance delivered with emotional poise' },
        { label: 'Boundary Health', score: 84, desc: 'Sustainable energy preservation across commitments' },
        { label: 'Presence', score: 91, desc: 'Grounded physical and mental attentiveness' },
      ],
      growthAdvice: [
        'Lean into your distinct signature spikes rather than striving for uniform moderation.',
        'Challenge yourself with bold creative endeavors outside your familiar comfort zone.',
        'Share your stabilizing frameworks with emerging peers through mentorship.',
      ],
      recommendedGuideSlug: 'emotional-agility-under-fire',
      recommendedGuideTitle: 'Emotional Agility Under Fire',
    };
  }

  // 3. VIA Character Strengths
  if (surveyId === 'via-character-strengths') {
    const topStrengths = results.topStrengths || results.strengthRankings?.slice(0, 4) || [];
    const firstStrength = topStrengths[0]?.label || 'Wisdom';

    return {
      title: 'Sage',
      subtitle: `(Virtue: ${topStrengths[0]?.virtue || 'Wisdom'})`,
      alias: `The ${firstStrength} Practitioner, Master Thinker`,
      rarity: 'SIGNATURE CHARACTER PROFILE · CLINICAL VALIDATION',
      imageSrc: '/archetypes/sage.png',
      summary: `Your psychological bedrock is anchored in ${firstStrength.toLowerCase()}. You lead through authentic moral clarity, using your top virtues as a guiding compass across work, relationships, and self-mastery.`,
      traits: topStrengths.map((s) => s.label).slice(0, 4),
      innerStrengths: topStrengths.slice(0, 4).map((s) => ({
        label: s.label,
        score: Math.min(Math.round((s.score / s.maxScore) * 100), 100),
        desc: s.description || `${s.virtue} virtue expression`,
      })),
      relationalHabits: [
        { label: 'Virtue Alignment', score: 94, desc: 'Consistent congruence between values and public actions' },
        { label: 'Moral Resilience', score: 90, desc: 'Steadfast resistance to ethical compromises' },
        { label: 'Empowering Others', score: 88, desc: 'Inspires signature strengths in peers and partners' },
        { label: 'Reflection Cadence', score: 86, desc: 'Frequent introspection on personal conduct' },
      ],
      growthAdvice: [
        `Actively deploy ${firstStrength.toLowerCase()} in high-friction environments where others default to cynicism.`,
        'Examine if you occasionally overuse your top strength at the expense of developing secondary virtues.',
        'Pair character strength awareness with daily tactical action for compound momentum.',
      ],
      recommendedGuideSlug: 'virtue-ethics-in-action',
      recommendedGuideTitle: 'Virtue Ethics in Action',
    };
  }

  // 4. Moral Foundations
  if (surveyId === 'moral-foundations') {
    return {
      title: 'Strategist',
      subtitle: '(Ethical Arbiter)',
      alias: 'The Objective Balancer, Values Architect',
      rarity: 'MULTI-FOUNDATIONAL SYNTHESIS · DEEP VALUES SPECTRUM',
      imageSrc: '/archetypes/strategist.png',
      summary: 'Your moral compass is built upon nuanced, deeply weighted psychological foundations. You understand that values disagreements stem from divergent core intuition patterns rather than lack of goodwill.',
      traits: ['Ethical Nuance', 'Impartial Judgment', 'Values Cohesion', 'Perspective Taking'],
      innerStrengths: (results.dimensions || []).slice(0, 4).map((d) => ({
        label: d.label,
        score: Math.round(d.score),
        desc: d.description,
      })),
      relationalHabits: [
        { label: 'Bridge Building', score: 92, desc: 'Translating ethical priorities across ideological chasms' },
        { label: 'Principle Defense', score: 89, desc: 'Standing firm when core moral boundaries are breached' },
        { label: 'Compassionate Listening', score: 86, desc: 'Uncovering the underlying fears behind strong stances' },
        { label: 'Ethical Consistency', score: 91, desc: 'Applying identical standards to allies and adversaries' },
      ],
      growthAdvice: [
        'Notice when your intuitive moral reaction happens before conscious rational deliberation.',
        'Practice articulating your ethical viewpoints using the moral vocabulary of your interlocutor.',
        'Apply your ethical clarity to institutional and community designs that foster mutual trust.',
      ],
      recommendedGuideSlug: 'moral-matrix-navigation',
      recommendedGuideTitle: 'Moral Matrix Navigation',
    };
  }

  // Fallback Standard
  return {
    title: 'Blue Daemon',
    subtitle: '(Academic Sentinel)',
    alias: 'The Integrated Learner, Mental Wealth Scholar',
    rarity: 'ACADEMY VERIFIED ARCHETYPE',
    imageSrc: '/archetypes/blue_daemon.png',
    summary: 'A balanced profile representing holistic cognitive agility, emotional attunement, and continuous self-mastery. Blue recognizes your commitment to psychological self-knowledge.',
    traits: ['Self-Knowledge', 'Curiosity', 'Perception', 'Resilience'],
    innerStrengths: [
      { label: 'Perception', score: 88, desc: 'High mental clarity and discernment' },
      { label: 'Curiosity', score: 92, desc: 'Eager pursuit of psychological growth' },
      { label: 'Resilience', score: 85, desc: 'Steady emotional baseline' },
      { label: 'Self-Knowledge', score: 90, desc: 'Accurate self-assessment and meta-cognition' },
    ],
    relationalHabits: [
      { label: 'Active Inquiry', score: 90, desc: 'Approaches disagreements with genuine curiosity' },
      { label: 'Attunement', score: 88, desc: 'Observes emotional context without premature judgment' },
      { label: 'Constructive Dialogue', score: 85, desc: 'Maintains productive focus under debate' },
      { label: 'Inner Grounding', score: 89, desc: 'Remains anchored during relational stress' },
    ],
    growthAdvice: [
      'Continue integrating self-assessment insights into weekly field notes and daily practice.',
      'Test your self-awareness in high-stakes relational and collaborative moments.',
      'Explore the Academy library to deepen your mastery of relevant cognitive models.',
    ],
    recommendedGuideSlug: 'shadow-work-fundamentals',
    recommendedGuideTitle: 'Shadow Work Fundamentals',
  };
}
