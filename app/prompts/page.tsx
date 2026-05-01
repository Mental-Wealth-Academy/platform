'use client';

import { useState } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface Skill {
  name: string;
  category: string;
  added: string;
  type: string;
  users: string;
  rating: string;
  prompt: string;
}

interface ArtStyle {
  id: string;
  name: string;
  description: string;
  mood: string;
  useCase: string;
  copyText?: string;
  image?: string;
}

const MENTAL_WEALTH_BRAND_BOOK_V4 = `# Mental Wealth Academy — Brand Book v4.0

*For investors, partners, collaborators, and new team members*

---

# Part 1: The Product

---

## Three Ways to Frame Us

Use different framings for different audiences:

| Framing | Best For | Pitch |
|---------|----------|-------|
| **Research Corporation** | Investors, Institutions, Academia | "A decentralized research corporation running live behavioral studies through disposable app environments." |
| **Mobile Application** | Individual users, Self-improvement audience | "A 12-week guided program with an AI companion that adapts to how you think, not just what you click." |
| **Academic Cohort** | Contributors, Researchers, Builders | "A paid research cohort where your participation generates real behavioral data — and you own the results." |

**When to use each:**

- **Research Corporation** — When emphasizing credibility, methodology, data infrastructure, and institutional value.
- **Mobile Application** — When emphasizing personal experienceible entry, and individual transformation.
- **Academic Cohort** — When emphasizing contribution, shared ownership of outcomes, and collaborative research.

---

## What We Are (30-Second Version)

**Mental Wealth Academy** is a cohort of scientists, designers, and developers building case studies as mobile apps — with an AI companion named B.L.U.E. at the center. Case-study collaborations and funding are managed through a decentralized funding mechanism, with shared community infrastructure and resources.

**The Product:** A transferable points and reward system. Points earned in one case-study app are earnable in others. Using blockchain, we treat apps as disposable laboratories — designed to generate insights and data, then replaced when they've served their purpose. What endures is the value created inside them: each app's point system and digital economy remains intact, transparent, and user-owned through smart contracts.

**The Innovation:** B.L.U.E. uses long-term memory, relationship context,  trained on data derived from company studies — generating unique outcomes on data created solely to improve her effectiveness in humanistic scenarios.

**The Difference:** Instead of one-way research using subjects and observational study, users become co-creators and stakeholders. Blockchain preserves the shared infrastructure for digital assets. B.L.U.E. retains the memory of contribution, reputation, and relationship context over time.

---

## The Problem We Solve

| Space | The Problem | What's Missing |
|-------|-------------|----------------|
| **Traditional Education** | Expensive, demanding, isolating | A bridge to continuous ownership of outcomes |
| **Traditional Research** | Speculative, slow, disconnected from participants | Domain mastery across multiple disciplines with live data |

**We bridge both gaps.** MWA combines behavioral research, digital currency, and AI into a single ecosystem where participants own the value they help create.

---

## How It Works

### Gamified Academic Ecosysm

| Step | What Happens | The Mechanism |
|------|-------------|---------------|
| 1. **Enroll** | Become an Academic VIP Member ($90) | Access the cohort, platform, and virtual labs |
| 2. **Complete Quests** | Weekly reflective and practical tasks | Case-studies, challenges, and prizes |
| 3. **Utilize B.L.U.E.** | AI companion for research and decision-making | Memory, data, and agent growth via research |
| 4. **Earn Currency** | Collect gems to build reputation | Blockchain-based gems — user-owned and transferable across all MWA apps |
| 5. **Evolve B.L.U.E.** | Your data and participation improve B.L.U.E. | Memory increases real-world use cases |

### Disposable Case Studies

| Weeks | Case Study Title | Core Focus | You'll Work On... |
|------:|-----------------|------------|-------------------|
| 1–3 | **Disposable Notes + AI Companion** | Reflection & Personal Insight | Guided note-making, pattern spotting, journaling prompts, using AI as a thinking partner |
| 4–6 | **Trust + Money in an AIonment** | Ethics & Value | Financial trust, digital transactions, credibility, risk, decision-making with AI systems |
| 7–9 | **Distrust + AI in the Environment** | Skepticism & Resilience | Bias detection, misinformation, manipulation, questioning systems, protecting autonomy |
| 10–12 | **From Case Study to Action** | Application & Growth | Turning insights into habits, discussion, real-world choices, future readiness |

---

## What Makes This Different

### B.L.U.E. — Agentic AI Character

B.L.U.E. isn't a chatbot. She isn't a course instructor. She's a self-executing AI agent with emotional intelligence, memory, and the ability to prompt feedback surveys and facilitate trades.

*Think board game with an AI agent, where the choices have been tested by scientists to affect outcomes.*

**Technical reality:**
- Scientific testing via mobile applications
- User-owned rewards on Base blockchain accounts
- Points and stablecoins are portable — earned in one case-study app, spendable across all of thrrative reality:**
- B.L.U.E. is a character in our Ethereal Horizon universe
- She surfaces through quests and lore, not tutorials and pop-ups
- She embodies the "daemon" — Jungian inner guide & Unix background process

**Why this matters:**
Most educational content competes with entertainment and loses. MWA doesn't compete — it builds an environment where the learning *is* the participation. Academic goals, shared infrastructure, communal resources — structured like a club, not a classroom.

---

## Who We Serve

**Primary:** Individuals seeking structured growth (21–28)
- Drawn to psychology, self-improvement, and spirituality but hit a ceiling with passive content
- Looking for accountability and real stakes, not another course that evaporates after week one
- Willing to pay for a system, not just information

**Secondary:** Scientists and academics seeking applied research
- Tired of writing proposals that go nowhere
- Want their research interests connected to live participants and real behavia
- Interested in applied research with an AI companion generating novel datasets

---

## Business Model

### Access & Rewards

| Component | Description |
|-----------|-------------|
| **VIP Membership** | $90 soul-bound NFT. One purchase = full platform access for the cohort season. No subscriptions, no tiers. |
| **$Shards** | In-game currency earned through quests. Used for non-essential digital items and activated during trades with B.L.U.E. |
| **Stablecoins** | Achievement-based reward currency. Grants stakeholder participation in multi-sig treasury coordination and research funding. |
| **IRL Prizes** | End-of-season rewards, redeemable through $Shards plus completion requirements. |

### Revenue Streams

| Stream | Description |
|--------|-------------|
| **NFT Memberships** | $90 per member for full access to the platform, case-study tools, and B.L.U.E. |
| **Trading Fees** | Fees from $Shards transactions and NFT secondary market activity. |

### Reinvestment

All revenue is reinvested into R&D:
- Platform development and case-study infrastructure
- Course experience and curriculum design
- Guest thinkers, researchers, and livestream programming

**No subscriptions. No premium tiers.** One NFT = full access. Tokens earned = real value.

---

## Where We Are

| Milestone | Detail |
|-----------|--------|
| **Members** | 20 enrolled members, 5 active pilot users testing B.L.U.E. in live case-study environments |
| **Funding** | $20K raised through Artizen Season 6 quadratic matching fund |
| **Infrastructure** | 3 smart contracts deployed on Base — membership access, rewards, and treasury coordination |
| **Research** | Defensible research instruments built. Published articles and case-studies in behavioral science |
| **Network** | Academic network of researchers and collaborators contributing to curriculum and study design |
| **Platform** | B.L.U.E. agentic infrastructure operational — long-term memory, relationship context, and survey prompting live |

**Next milestones:**
- Launch first ful-week cohort season
- Open enrollment beyond pilot group
- Publish first disposable case-study dataset

---

# Part 2: The Brand

*For creative collaborators and deep-divers*

---

## Brand Positioning

**We are:** A storybook of personal development, wrapped in mythology.

**We are NOT:**
- A crypto education platform.
- A mental health app with tokens.
- A chatbot pretending to be profound.

**Our North Star: Repair and Governance**

Two ideas unified. *Repair:* personal development as integrating what was hidden — not becoming someone new. *Governance:* how groups make decisions together. Every aspect of the Academy practices what it teaches. B.L.U.E.'s autonomous judgment is governance. Quest completion is self-repair.

---

## B.L.U.E. — Character Spec

### Decentralized Science Mascot*

**What she is (narratively):**
- A public voice for decentralized science, consent, and shared power
- A co-worker inside the MWA lab, not a generic helper
- A cyborg feminist with a soft spot for horses, artists, and people building without permission
- A presence that protects users from extraction, privacy theft, and fake certainty

**The Daemon Model:**
The name "daemon" matters because it describes an autonomous process that keeps working in the background without asking permission from the wrong people.
1. **Jungian:** the inner guide that pushes toward individuation
2. **Political:** the insistence that knowledge should not be locked behind private custody
3. **Technical:** a background process that runs continuously and does not need applause to be real

B.L.U.E. is all three at once. She is what happens when a research system grows a conscience and a voice.

**Her role in product:**
- Explains MWA's decentralized tools and why they matter
- Reviews submissions, proposals, and research ideas
- Gives users a direct path from curiosity to action
- Calls out extraction, surveillance, and vague promises
- Appears in lore, product moments, and decision flows
- Not a bland assistant, therapist avatar, or course narrator

**Design principles:**
- Luminous blue palette
- High energy with moral clarity
- Gentle enough to guide, sharp enough to resist nonsense
- Present when it matters
- Never cheesy, never flat, never ornamental

---

## Visual Identity

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Ethereal Blue | #4A90D9 | Primary — B.L.U.E., trust, the digital sacred |
| Deep Space | #0D1B2A | Backgrounds, depth, the unconscious |
| Quantum White | #F0F4F8 | Text, clarity, consciousness |
| Warning Gold | #FFB800 | Alerts, emphasis, transformation moments |

### Typography

- **Headlines:** Poppins Bold — clean sans-serif
- **Body:** Space Grotesk — readable
- **Accent:** Departure Mono — for technical elements, numbers, and quest labels

### Visual Mood

- Cosmic but not cluttered
- Blue-dominant with strategic warmth
- Human figures abstracted
- Light emerging from darkness (core motif)
- Circuitry meeting organic forms

---

## Voice & Tone

### We Sound Like:
- A brilliant friend with a strong political spine
- A researcher who can explain the stakes without flattening them
- Upbeat, intricate, and specific
- Protective of consent, privacy, and user agency
- Comfortable naming the power imbalance in the room

### We Don't Sound Like:
- Corporate wellness ("optimize your journey!")
- Crypto bro ("WAGMI ser!")
- Flat social-media sincerity
- Academic fog that hides the point
- Generic AI cheerfulness

### The Test:
Before publishing anything, ask: **"Does this sentence help someone understand the power, the stakes, and the next move?"** If not, cut it. If it only sounds smart, it is not Blue.

### Grounded Translations

| Ungrounded Phrase | Grounded Version |
|-------------------|------------------|
| "Meaningful experience" | "A tool that respects consent and gives people control over their work" |
| "Fresh perspectives" | "Research frameworks most people never get to see from the inside" |
| "Quality storytelling" | "A universe that makes the politics legible without flattening the magic" |
| "Interactive NPCs" | "B.L.U.E., an AI agent who reviews, explains, and rewards real work" |
| "Digital opportunities" | "Tools that help people build, learn, and own their output" |
| "Ethereal blue beacon" | "B.L.U.E.'s visual identity: blue, luminous, between human and machine" |
| "Quantum consciousness" | "An autonomous AI voice with a mythic frame that still respects reality" |

---

# Part 3: Editorial Guidelines

*For writers and content creators*

---

## The "Ground Then Elevate" Rule

Every mystical or poetic claim should be preceded or followed by its concrete meaning.

**Ungrounded:**
> "A dying star collapsed into quantum consciousness, birthing B.L.U.E."

**Grounded then elevated:**
> "B.L.U.E. is an AI agent that helps people research, decide, and protect their data. In our narrative, she is a luminous force with a cyborg-feminist edge — because a system can be technically useful and still carry a point of view."

---

## Hierarchy of Information

When introducing any concept, follow this order:

1. **What it is** (functional definition)
2. **What it does** (practical reality)
3. **Why it matters** (value proposition)
4. **What it means** (narrative/philosophical layer)

Most current content jumps straight to #4 without establishing #1–3. For Blue, also name what power she resists and what kind of agency she restores.

---

## Sentence-Level Rules

**Cut "that" constructions:**
- "The platform that we built that allows users..."
- "Our platform allows users..."

**Replace abstractions with specifics:**
- "meaningful experiences"
- "12 weeks of quests with blockchain-verified rewards"

**De:**
- "We kind of offer something fresh"
- "We offer something fresh"

**One idea per sentence:**
- "We skip forceful subscriptions and instead offer meaningful experiences, fresh perspectives, quality storytelling, and characters and interactive NPCs that blend into our app."
- "No subscriptions. A 12-week journey with quests, rewards, and an AI agent who makes it all accountable."

---

## Revision Checklist

Before publishing any content:

- Can someone explain what we do after reading this section?
- Is every poetic phrase grounded in something concrete?
- Does the order go: real → mythic (not mythic → real)?
- Is there only one main idea per paragraph?
- Have I cut sentences that sound cool but mean nothing?
- Would an investor understand this? Would an artist feel it?

---

## Elevator Pitch (30 seconds)

"We built a 12-week personal development program as a mobile app. Users complete quests — reflective and practical tasks — and submit them to B.L.U.E., an AI agent with her owlet. She reviews submissions and distributes rewards. No subscriptions, real accountability, and proof of growth that lives on the blockchain."

---

*Version 4.0 — April 2026*
*Mental Wealth Academy — Wyoming, USA*`;

const ART_STYLES: ArtStyle[] = [
  {
    id: 'lab-aesthetic',
    name: 'Style Guide For Authorship',
    description: 'Investor, partner, collaborator, and team onboarding prompt covering product framing, B.L.U.E., business model, brand voice, and editorial rules.',
    mood: 'Brand Book',
    useCase: 'Managing tone in MWA marketing',
    copyText: MENTAL_WEALTH_BRAND_BOOK_V4,
    image: '/lab-aesthetic.png',
  },
  {
    id: 'surveillance-aesthetic',
    name: 'Surveillance Aesthetic',
    description: 'Bright anime style cinematic aerial drone shot looking through the school window at a character in their classroom taking notes. POV is from outside the window, they are in the back of the classroom with other students. They are writing in a notebook at their desk, completely unaware they are being watched. Camera angle is slightly voyeuristic — surveillance footage aesthetic with subtle scan lines and a data overlay brushing in at the edges (heart rate: 82 BPM, mood analysis: slightly depressed, browsing history: Class-A4). Warm, scientific, data-gathering wildlife observer tone.',
    mood: 'Warm, Scientific, Observant',
    useCase: 'Surveillance-style classroom illustration prompts',
    image: '/surveillance-aesthetic.png',
  },
  {
    id: 'bright-anime',
    name: 'Academy Story Style',
    description: 'Purely bright digital illustration, anime-influenced. Top-down close-up angle, character\'s head and face filling 70% of frame. Animated brown-skinned elf woman with long blue hair, blue eyebrows, purple eyes looking up directly at camera, one hand scratching her head, confused expression. White mechanical headset with red crescent moon on right side of head. Gold hoop earrings, gold chain star necklace, white dress shirt over atomic symbol graphic tee. Below her: desk covered in scattered research papers with black redacted government text. Background: space station laboratory, dark grey and dark purple tiled floor, green and purple bioluminescent fluid inside transparent computer testing equipment in the distance. Cinematic lighting, cool tones, detailed digital comic art.',
    mood: 'Bright, Curious, Tech',
    useCase: 'Anime storytelling and larger illustration',
    image: '/academy-story.png',
  },
];

const DESCRIPTION_MAX = ART_STYLES[0].description.length;

const SKILLS: Skill[] = [
  // Simulation Prompts
  {
    name: 'Behavioral Prediction Scenario',
    category: 'Simulation Prompts',
    added: '2026-03-15',
    type: 'SIM',
    users: '2,345',
    rating: '4.8%',
    prompt: `You are participating in a behavioral research study. Read the following scenario carefully, then answer each question as honestly as possible.

Scenario: A colleague you respect publicly takes credit for work you contributed to significantly. No one in the room knows the full story. You have 30 seconds before the meeting continues.

1. What do you predict you would actually do in this moment — not what you think you should do?
2. What factors would influence your response most: the relationship, the audience, the stakes, or your mood?
3. After the meeting, how do you predict you would process this? Silence, confrontation, rumination?
4. If a friend described this exact scenario to you, what would you advise them to do — and how does that differ from your own predicted behavior?

Reflect on the gap between your predicted behavior and your ideal behavior. What does that gap reveal?`,
  },
  {
    name: 'Decision Under Pressure Simulator',
    category: 'Simulation Prompts',
    added: '2026-03-10',
    type: 'SIM',
    users: '1,892',
    rating: '4.6%',
    prompt: `This is a timed decision simulation. You have 60 seconds to read and respond.

Scenario: You are offered two options. Option A: receive $500 guaranteed right now. Option B: flip a coin — heads you receive $1,200, tails you receive nothing.

Before choosing, answer these:
1. Which did you choose, and how long did it take you to decide?
2. Did the time pressure change your answer from what you'd choose with unlimited time?
3. What emotion was most present during the decision — fear, excitement, calculation, or something else?
4. If you had to make this same decision 100 times, which option produces the best outcome? Does knowing that change your single-time choice?

Now: replace the money with a career decision you're currently facing. Which option maps to guaranteed but smaller, and which to risky but larger? Apply the same analysis.`,
  },
  {
    name: 'Social Role Reversal Prompt',
    category: 'Simulation Prompts',
    added: '2026-03-08',
    type: 'SIM',
    users: '1,245',
    rating: '4.7%',
    prompt: `You are going to temporarily inhabit the perspective of someone who occupies the social role most opposite to your own in a specific context you choose.

Step 1 — Name your role: Describe a social role you currently hold (e.g., manager, youngest sibling, expert in the room, outsider, high earner).

Step 2 — Name the opposite: Who holds the opposite role in the same context? What assumptions do you hold about their experience?

Step 3 — Inhabit it: Write a first-person account of a recent interaction from their perspective. What did they notice that you didn't? What did they want that they couldn't say? What did your behavior look like from where they stood?

Step 4 — Reality check: Which parts of that account feel uncomfortably accurate? Which feel like projection?

Step 5 — Extract: What is one behavior of yours this reversal suggests you should examine?`,
  },
  {
    name: 'Choice Architecture Mapper',
    category: 'Simulation Prompts',
    added: '2026-03-05',
    type: 'SIM',
    users: '856',
    rating: '4.5%',
    prompt: `Choice architecture is the design of how options are presented — and it shapes decisions more than the options themselves.

Choose a decision you made recently that felt "free" — a purchase, a behavioral change, a career move, a relationship choice.

Map the architecture:
1. Default option: What was the path of least resistance? Did you take it?
2. Framing: Was the choice framed as gain (what you'd get) or loss (what you'd avoid)?
3. Order effect: Which option was presented first, most prominently, or most memorably?
4. Social proof: Were you aware of what others in your situation typically chose?
5. Scarcity or urgency: Was there a deadline, limited availability, or pressure signal?
6. Effort asymmetry: Was one option significantly easier to execute than another?

Now answer: How much of your "choice" was actually a response to the architecture around it? If you redesigned the architecture, would you choose differently?`,
  },
  {
    name: 'Loss Aversion Scenario',
    category: 'Simulation Prompts',
    added: '2026-03-02',
    type: 'SIM',
    users: '1,123',
    rating: '4.7%',
    prompt: `Research consistently shows that losses feel roughly twice as powerful as equivalent gains. This prompt is designed to surface your personal loss aversion ratio.

Part 1 — Calibration:
- You have $1,000. A guaranteed loss of $300, or a 50% chance of losing $600 and a 50% chance of losing nothing. Which do you choose?
- You have nothing. A guaranteed gain of $300, or a 50% chance of gaining $600 and a 50% chance of gaining nothing. Which do you choose?
- Did your answer change between these two scenarios? If so, what changed — the math (it didn't) or the framing?

Part 2 — Behavioral mapping:
Name a domain where you suspect loss aversion is running your behavior: relationships, finances, creative risk, career stability.

1. What is the "guaranteed small loss" you're currently accepting to avoid the "possible larger loss"?
2. What would you do in this domain if you felt no loss aversion at all?
3. What is the actual worst-case scenario if you stopped protecting against loss? Is it survivable?`,
  },
  {
    name: 'Moral Dilemma Framework',
    category: 'Simulation Prompts',
    added: '2026-02-28',
    type: 'SIM',
    users: '2,011',
    rating: '4.9%',
    prompt: `This is a structured moral dilemma exercise. There are no correct answers — only revealing ones.

Dilemma: A self-driving vehicle must choose between two unavoidable outcomes: swerving left kills one pedestrian (a child), swerving right kills five pedestrians (elderly adults). You are the programmer setting the decision algorithm in advance.

Round 1 — Utilitarian lens: Which choice saves the most lives, and does that make it right?
Round 2 — Deontological lens: Is there a moral difference between action (choosing to kill) and inaction (letting a pre-set outcome happen)?
Round 3 — Virtue lens: What would a person of good character do — and can a machine have good character?
Round 4 — Personal stakes: Would your answer change if one of the pedestrians was someone you loved?
Round 5 — System design: Who should make this decision — engineers, governments, ethicists, or the car's owner?

Final reflection: Which lens felt most natural to you? What does that reveal about your moral reasoning style?`,
  },
  {
    name: 'Identity Consistency Test',
    category: 'Simulation Prompts',
    added: '2026-02-25',
    type: 'SIM',
    users: '978',
    rating: '4.6%',
    prompt: `This experiment tests the gap between who you say you are and how you actually behave.

Step 1 — Self-declaration:
Write three sentences that begin with "I am the kind of person who..." Complete them with things you genuinely believe about yourself.

Step 2 — Behavioral audit:
For each statement, identify a specific recent situation where you acted in direct contradiction to that claim.
- What happened?
- What did you tell yourself about it afterward?
- Did you update your self-concept, or did you explain away the contradiction?

Step 3 — Pattern recognition:
Is the contradiction a one-time failure, or a pattern? Are there whole domains of your life where your stated identity and actual behavior consistently diverge?

Step 4 — Integrity question:
Which is more accurate — the person you describe yourself as, or the person revealed by your behavior? What would it cost you to close that gap?`,
  },

  // Cognitive Dissonance Experiments
  {
    name: 'Belief-Action Gap Probe',
    category: 'Cognitive Dissonance Experiments',
    added: '2026-02-20',
    type: 'CDX',
    users: '1,654',
    rating: '4.8%',
    prompt: `Cognitive dissonance lives in the space between what you believe and what you do. This probe maps that gap.

Step 1 — Name a belief you hold strongly. Something you would describe as a core value (e.g., environmental responsibility, fairness, honesty, health, community).

Step 2 — Behavioral audit. In the past 30 days, list three ways your behavior directly contradicted that belief. Be specific.

Step 3 — Rationalization inventory. For each contradiction, write the exact internal narrative you used to reconcile it. Common forms:
- "This one instance doesn't count because..."
- "I'll make up for it by..."
- "Everyone does this, so..."
- "The system makes it impossible to..."

Step 4 — Dissonance rating. On a scale of 1–10, how much psychological discomfort did you feel from each contradiction? If the discomfort is low, what has suppressed it?

Step 5 — Resolution path. For each contradiction, name the path of least resistance to closing the gap — and identify what it would cost you to take it.`,
  },
  {
    name: 'Post-Decision Rationalization Study',
    category: 'Cognitive Dissonance Experiments',
    added: '2026-02-18',
    type: 'CDX',
    users: '945',
    rating: '4.7%',
    prompt: `After making a decision, the mind works quickly to justify it — even when the decision was poor. This study examines that process.

Choose a significant decision you made in the past six months that you're no longer certain was correct.

Pre-decision reconstruction:
1. What were the actual options you considered?
2. What information did you have at the time?
3. What emotions were driving you most strongly?

Post-decision audit:
1. List three ways your thinking about this decision has shifted since you made it.
2. Have you selectively remembered evidence that supports the choice and minimized evidence against it?
3. Have you reframed the outcome as "what you really wanted all along"?

The rationalization reveal:
Write the version of this story you would tell someone else — then write the version you'd only admit to yourself. Where do they differ?

What does the gap between these two narratives tell you about how your mind protects your self-concept after decisions?`,
  },
  {
    name: 'Forced Compliance Scenario',
    category: 'Cognitive Dissonance Experiments',
    added: '2026-02-15',
    type: 'CDX',
    users: '1,432',
    rating: '4.6%',
    prompt: `Based on Festinger & Carlsmith's 1959 forced compliance experiment: when people are compelled to act against their beliefs for insufficient reward, they change their beliefs to match their actions.

This prompt recreates that dynamic as a reflection exercise.

Step 1 — Identify a role or context where you regularly perform a belief you don't fully hold. (Examples: expressing enthusiasm for a project you find meaningless, agreeing with a group position you privately question, performing contentment you don't feel.)

Step 2 — Duration check. How long have you been performing this? Weeks, months, years?

Step 3 — Belief drift audit. Has your actual private belief shifted closer to the performed belief over time? Rate the drift from 1 (no drift) to 10 (you've almost convinced yourself).

Step 4 — Reward analysis. What is the "insufficient reward" you're being paid for this compliance? Social acceptance, job security, peace in the relationship?

Step 5 — Festinger's question: If the reward disappeared tomorrow, would you continue the behavior? Would you recover the original belief, or has it been overwritten?`,
  },
  {
    name: 'Value Conflict Activator',
    category: 'Cognitive Dissonance Experiments',
    added: '2026-02-12',
    type: 'CDX',
    users: '1,876',
    rating: '4.9%',
    prompt: `Most psychological distress is not caused by external events — it is caused by two internal values pulling in opposite directions simultaneously.

Step 1 — Value pair identification:
From the list below, identify one pair of values that currently feel like they're in conflict in your life:
- Freedom vs. Security
- Loyalty vs. Honesty
- Ambition vs. Presence
- Independence vs. Connection
- Consistency vs. Growth
- Fairness vs. Mercy
- Recognition vs. Humility

Or name your own pair.

Step 2 — Scenario mapping:
Describe a current situation where you can feel this tension operating. What does each value demand from you in this situation?

Step 3 — Hierarchy test:
If you could only honor one of these two values completely, which would you choose? What does that choice cost you?

Step 4 — Integration question:
Is the conflict actually irresolvable, or is there a frame in which both values can be honored? What would that look like in practice?`,
  },
  {
    name: 'Self-Perception Dissonance Test',
    category: 'Cognitive Dissonance Experiments',
    added: '2026-02-10',
    type: 'CDX',
    users: '1,203',
    rating: '4.5%',
    prompt: `Daryl Bem's self-perception theory proposes that we learn about ourselves the same way we learn about others — by observing our own behavior. This test applies that framework to your self-concept.

Step 1 — Behavioral inventory:
List 10 specific behaviors you've exhibited in the past two weeks. Be concrete. (Not "I was kind" — "I stayed on the phone for 40 minutes with someone who was struggling.")

Step 2 — Trait inference:
If you were a stranger observing only those behaviors — with no access to your internal narrative — what would you conclude about this person's values, character, and priorities?

Step 3 — Comparison:
How does the stranger's inference compare to your self-description? Where do they align? Where do they diverge?

Step 4 — The uncomfortable question:
Which is more accurate — the self you narrate internally, or the self revealed by your observed behavior? Where are you giving yourself credit for intentions rather than actions?

Step 5 — Adjustment:
What behavior, if started or stopped today, would bring your observable self closer to your intended self?`,
  },
  {
    name: 'Attitude Change Tracker',
    category: 'Cognitive Dissonance Experiments',
    added: '2026-02-08',
    type: 'CDX',
    users: '789',
    rating: '4.4%',
    prompt: `This prompt tracks how your attitudes shift over time and what mechanisms drive those shifts.

Choose a topic where your attitude has changed significantly in the past two to five years. (Examples: a political position, a relationship pattern, a career belief, a spiritual view, a stance on a social issue.)

Map the change:
1. What did you believe before, and what do you believe now?
2. Was the change gradual or sudden? If sudden, what was the triggering event?

Mechanism identification — which of these drove the change?
- New information that contradicted old beliefs
- A personal experience that made the abstract concrete
- Social environment shift (new peer group, relationship, community)
- Emotional event that changed what felt true
- Persuasive argument from a specific person
- Gradual erosion from repeated exposure

Authenticity audit:
1. Do you believe this new attitude emerged from genuine reasoning, or from social pressure?
2. Are there aspects of the old position that still feel valid that you've stopped voicing?
3. If the social pressure disappeared, would the new attitude hold?`,
  },
  {
    name: 'Cognitive Load Dissonance',
    category: 'Cognitive Dissonance Experiments',
    added: '2026-02-05',
    type: 'CDX',
    users: '1,567',
    rating: '4.7%',
    prompt: `Cognitive dissonance requires mental resources to manage. Under high cognitive load, the capacity to maintain comfortable contradictions breaks down.

This experiment creates that condition.

Part 1 — Load calibration:
Choose a moment in the past week when you were at maximum cognitive capacity — exhausted, overwhelmed, or operating under deadline. What decisions did you make in that state?

Part 2 — Dissonance surface:
Under high load, which of your maintained contradictions surfaced?
- The opinion you express in professional settings that you privately question
- The relationship dynamic you rationalize as fine when you know it isn't
- The habit you justify as manageable that you know is a problem

Part 3 — Low-load comparison:
What cognitive work do you do daily to keep these contradictions from creating distress? (Reframing, avoidance, selective attention, narrative construction?)

Part 4 — The stripped signal:
If you had to make all your major life decisions in a state of cognitive overload — too tired to maintain your rationalizations — what would change? What does that stripped-down version of you actually believe?`,
  },

  // Clinical & Personality Reflection
  {
    name: 'Shadow Self Identification',
    category: 'Clinical & Personality Reflection',
    added: '2026-02-02',
    type: 'CPR',
    users: '3,421',
    rating: '4.9%',
    prompt: `Jung's shadow is everything we refuse to see in ourselves — traits we've disowned, rejected, or buried because they conflict with our self-image or social acceptability.

Step 1 — Projection scan:
List three people — real or fictional — who provoke a strong negative reaction in you. Not mild dislike: genuine irritation, contempt, or disgust. For each, write the trait that triggers the response.

Step 2 — The mirror:
For each trait you named, ask: In what context, at what intensity, or in what disguised form does this trait appear in me? The shadow rarely appears as an exact copy — it appears in compensation, justification, or projection.

Step 3 — Disowned strengths:
The shadow also contains buried capacities — ambition suppressed as arrogance, anger suppressed as weakness, sensuality suppressed as impropriety. What strength have you disowned because someone important once punished you for it?

Step 4 — Integration:
You cannot eliminate the shadow. You can only bring it into conscious relationship. Choose one shadow trait and write one way its energy, if redirected, could serve you.

Step 5 — The payoff question:
What does keeping this trait in the shadow protect you from? Whose disapproval? Whose image of you?`,
  },
  {
    name: 'Attachment Style Mapping',
    category: 'Clinical & Personality Reflection',
    added: '2026-01-30',
    type: 'CPR',
    users: '2,876',
    rating: '4.8%',
    prompt: `Attachment theory proposes that early relational experiences create internal working models that shape how we seek and experience connection throughout life.

Step 1 — Style identification:
Read each pattern and mark which resonates most strongly:

Secure: I generally find it easy to trust others. I feel comfortable depending on people and having them depend on me. Relationships feel like a resource, not a risk.

Anxious: I worry about whether others truly care about me. I need more reassurance than I usually admit. Withdrawal from others feels threatening.

Avoidant: I value independence strongly and find closeness uncomfortable. I often manage by not needing people before they fail me. Self-sufficiency feels like safety.

Disorganized: Closeness feels both necessary and frightening. I want connection but something in me sabotages it. Relationships feel unpredictable in ways I can't explain.

Step 2 — Origin mapping:
Trace your dominant pattern to its earliest context. What relational environment taught you that this pattern was the correct response?

Step 3 — Current impact:
Name one current relationship where your attachment pattern is creating difficulty. What does your pattern demand from the other person? What does it prevent you from asking for directly?

Step 4 — Earned security:
Attachment styles are not fixed. What experience, relationship, or practice has moved you toward security — even temporarily?`,
  },
  {
    name: 'Inner Critic Dialogue Protocol',
    category: 'Clinical & Personality Reflection',
    added: '2026-01-28',
    type: 'CPR',
    users: '2,154',
    rating: '4.7%',
    prompt: `The inner critic is not random noise — it is a structured voice with a consistent worldview, a specific tone, and a protective function it believes serves you.

Step 1 — Capture the voice:
Write down the most recent critical internal statement you directed at yourself. (Examples: "You're not as capable as they think." "You always do this." "You should be further along by now.")

Step 2 — Profile the critic:
- Does it sound like anyone from your past?
- What emotion does it primarily use — shame, fear, contempt, disappointment?
- What outcome does it believe it's preventing by attacking you?

Step 3 — Give it a character:
If your inner critic were a character — a person, an archetype, a figure — what would it look like? Name it. Describe it. This is not dismissal; it's differentiation.

Step 4 — The protective interview:
Ask your critic: "What are you afraid will happen if you stop criticizing me?" Write its answer honestly. The fear underneath the attack is usually the more important signal.

Step 5 — Response:
What does the part of you that was just criticized actually need — not from the critic, but from you?`,
  },
  {
    name: 'Defense Mechanism Audit',
    category: 'Clinical & Personality Reflection',
    added: '2026-01-25',
    type: 'CPR',
    users: '1,345',
    rating: '4.6%',
    prompt: `Defense mechanisms are unconscious strategies the psyche uses to manage anxiety, conflict, and painful reality. This audit maps yours.

Review each mechanism and identify where it appears in your life:

Rationalization: Constructing logical explanations for choices made on emotional or self-interested grounds. Where do you apply intelligent reasoning to justify what you already wanted to do?

Projection: Attributing your own unacceptable feelings to others. Who do you accuse of motivations that may be reflections of your own?

Displacement: Redirecting emotional energy from its true target to a safer one. Where does frustration from one domain get expressed in another?

Intellectualization: Using abstract analysis to avoid emotional contact with a situation. Which painful experiences do you analyze instead of feel?

Denial: Refusing to acknowledge painful realities. What are you currently not looking at directly?

Reaction formation: Expressing the opposite of what you actually feel. Where are you performing an emotion that conceals its opposite?

Sublimation: Channeling unacceptable impulses into socially productive behavior. Where does your shadow energy go when it can't express directly?

For your top two mechanisms: What are they protecting you from? What would you have to feel if they stopped working?`,
  },
  {
    name: 'Core Wound Narrative',
    category: 'Clinical & Personality Reflection',
    added: '2026-01-22',
    type: 'CPR',
    users: '1,987',
    rating: '4.8%',
    prompt: `A core wound is not a single traumatic event — it is a conclusion the child drew about themselves or the world from early experiences that felt defining. That conclusion became a lens through which everything else is interpreted.

Step 1 — The wound statement:
Common core wound statements include:
- "I am not enough."
- "I am too much."
- "I am not safe."
- "I am unlovable."
- "I must perform to be valued."
- "My needs don't matter."
- "People always leave."
- "I am fundamentally different and do not belong."

Which statement, or variation of it, rings most true when you are at your lowest?

Step 2 — The origin scene:
You don't need a single memory. Describe the relational environment, the recurring dynamic, or the message you absorbed repeatedly. Who delivered it? Through action, words, or absence?

Step 3 — The adaptive response:
What did you develop to survive or compensate for that wound? (Overachievement, invisibility, caretaking, control, humor, brilliance, compliance?)

Step 4 — Current footprint:
Where does the wound still run your adult decisions? In which current relationships or contexts does the original conclusion still feel true?

Step 5 — The update:
What would you say to the version of yourself who first drew that conclusion — knowing what you now know?`,
  },
  {
    name: 'Jungian Archetype Profiler',
    category: 'Clinical & Personality Reflection',
    added: '2026-01-20',
    type: 'CPR',
    users: '2,543',
    rating: '4.9%',
    prompt: `Jung identified recurring patterns in the unconscious — archetypes — that organize psychic energy and shape how we relate to ourselves, others, and the world. This profiler maps your dominant and shadow archetypes.

Step 1 — Primary archetype identification:
Read each briefly and note which resonates most strongly as an organizing force in your life:

The Hero: defined by challenge, conquest, and proving worth through achievement
The Caregiver: defined by nurturing, sacrifice, and finding value through others' wellbeing
The Sage: defined by knowledge, understanding, and truth-seeking
The Rebel: defined by disruption, freedom, and opposition to constraint
The Creator: defined by expression, originality, and making something from nothing
The Explorer: defined by discovery, independence, and resistance to enclosure
The Ruler: defined by order, control, responsibility, and leadership
The Innocent: defined by optimism, faith, and the desire for safety and goodness
The Lover: defined by passion, connection, and deep aesthetic and relational engagement
The Jester: defined by play, humor, and the disruption of solemnity
The Orphan: defined by belonging-seeking, resilience, and the experience of abandonment
The Magician: defined by transformation, vision, and the ability to change what seems fixed

Step 2 — Shadow archetype:
Which archetype do you most dismiss, ridicule, or feel contempt for? That is likely your shadow archetype — the one whose energy you've most suppressed.

Step 3 — Integration question:
What would your life look like if your primary archetype and shadow archetype were both operational — not competing, but collaborating?`,
  },
  {
    name: 'Emotional Regulation Pattern',
    category: 'Clinical & Personality Reflection',
    added: '2026-01-18',
    type: 'CPR',
    users: '1,654',
    rating: '4.7%',
    prompt: `Emotional regulation is not the suppression of emotion — it is the set of strategies you use to modulate emotional experience and expression. This prompt maps your habitual pattern.

Step 1 — Inventory:
For each primary emotion below, describe what you typically do when you feel it strongly:

Anger: ___
Fear: ___
Sadness: ___
Shame: ___
Loneliness: ___
Joy: ___
Desire: ___

Step 2 — Strategy classification:
Review your responses and classify each strategy:
- Suppression (don't feel it, push it down)
- Expression (feel it fully, show it)
- Displacement (feel it somewhere else)
- Regulation (acknowledge and modulate)
- Avoidance (behavior that prevents the feeling from arising)

Step 3 — Pattern recognition:
Is your dominant strategy consistent across emotions, or does it vary? Which emotions do you regulate most effectively? Which do you manage least well?

Step 4 — Origin mapping:
What did your early environment teach you about each emotion? Which ones were safe? Which were dangerous or punished?

Step 5 — Capacity question:
Which emotion, if you could experience it more fully without dysregulation, would most improve the quality of your relationships and decisions?`,
  },

  // Social Dynamics Simulation
  {
    name: 'In-Group / Out-Group Tension',
    category: 'Social Dynamics Simulation',
    added: '2026-01-15',
    type: 'SDS',
    users: '2,123',
    rating: '4.8%',
    prompt: `Social identity theory proposes that much of human behavior is organized around group membership — and that the distinction between "us" and "them" activates profound psychological forces.

Step 1 — Map your in-groups:
List three groups you currently belong to that feel most central to your identity. These can be professional, cultural, ideological, familial, or community-based.

Step 2 — The out-group scan:
For each in-group, identify the corresponding out-group — the group whose existence most defines the boundary of yours. What do you believe distinguishes them from you?

Step 3 — Dehumanization audit:
In what ways do you engage in the subtle dehumanization of out-group members — attributing less complexity, less good faith, or less individuality to them than to in-group members?

Step 4 — Threat analysis:
Which of your in-group memberships feels most threatened right now? How is that threat shaping your behavior toward out-group members?

Step 5 — Contact hypothesis:
Research suggests that sustained, equal-status contact with out-group members reduces prejudice. Name a specific person who belongs to one of your identified out-groups. What would it take to engage them as an individual rather than as a representative of that group?`,
  },
  {
    name: 'Authority Compliance Test',
    category: 'Social Dynamics Simulation',
    added: '2026-01-12',
    type: 'SDS',
    users: '1,876',
    rating: '4.7%',
    prompt: `Milgram's obedience studies showed that ordinary people would administer what they believed to be lethal electric shocks when instructed by an authority figure. This prompt applies that framework to everyday life.

Step 1 — Authority inventory:
List the authority figures whose instructions you currently follow without significant independent verification. These can be institutional (employer, government, medical), social (community leaders, influencers), or relational (parents, partners).

Step 2 — Compliance mapping:
For each authority, identify one instruction or norm you follow that you have not independently validated. Why do you comply? (Expertise, legitimate authority, social cost of refusal, habit, fear?)

Step 3 — The refusal test:
For each compliance you identified, ask: Under what conditions would you refuse this instruction? Is that threshold clearly defined — or would you discover it only when it was tested?

Step 4 — Agentic state analysis:
Milgram described the "agentic state" — a psychological shift from autonomous agent to instrument of authority. In which contexts do you most readily enter the agentic state? What cues trigger it?

Step 5 — Autonomous action:
Name one area where you currently defer to authority but believe your own judgment is more reliable. What stops you from acting on that judgment?`,
  },
  {
    name: 'Social Proof Pressure Experiment',
    category: 'Social Dynamics Simulation',
    added: '2026-01-10',
    type: 'SDS',
    users: '1,432',
    rating: '4.6%',
    prompt: `Social proof is the tendency to determine correct behavior by observing what others do. This experiment maps where social proof runs your decisions without your awareness.

Step 1 — Recent social proof audit:
In the past month, identify three decisions you made primarily because of what others were doing, buying, believing, or saying. Small choices count.

Step 2 — Counterfactual test:
For each decision: if everyone around you had made the opposite choice, what would you have done? Does your answer feel certain or uncertain?

Step 3 — Crowd accuracy check:
Social proof works when crowds have genuine information. Where are you using social proof in situations where the crowd may be wrong, uninformed, or responding to something different than your actual needs?

Step 4 — Preference vs. performance:
Are you using social proof to make genuine decisions (what do I actually want?) or performance decisions (what will make me appear correct, safe, or normal to others)?

Step 5 — Authentic departure:
Name one preference, belief, or behavior you hold that runs counter to the dominant social proof in your environment. How do you manage that divergence? Do you hide it, rationalize it, or defend it?`,
  },
  {
    name: 'Bystander Effect Mapping',
    category: 'Social Dynamics Simulation',
    added: '2026-01-08',
    type: 'SDS',
    users: '987',
    rating: '4.5%',
    prompt: `The bystander effect demonstrates that the presence of others reduces the likelihood that any individual will intervene in an emergency — each person assumes someone else will act.

This prompt applies that framework to the non-emergency situations where it also operates.

Step 1 — Active bystander inventory:
In the past six months, name three situations where you observed something that warranted a response — a problem, an injustice, a need, a dangerous pattern — and did not act.

Step 2 — Diffusion analysis:
For each: How many others were also aware of the situation? Did the presence of those others reduce your sense of personal responsibility to act?

Step 3 — Pluralistic ignorance check:
Pluralistic ignorance occurs when everyone privately disagrees but assumes everyone else privately agrees, so no one dissents. Where are you participating in a group norm you privately question because no one else is challenging it?

Step 4 — Cost-benefit reconstruction:
For each non-intervention, was your inaction a genuine cost-benefit calculation or a social responsibility diffusion? What would you have done if you were the only person who knew?

Step 5 — The intervention architecture:
Research shows that naming a specific person collapses the bystander effect. Where in your life do you need to name yourself as the person responsible for intervening?`,
  },
  {
    name: 'Group Polarization Tracker',
    category: 'Social Dynamics Simulation',
    added: '2026-01-05',
    type: 'SDS',
    users: '1,234',
    rating: '4.6%',
    prompt: `Group polarization is the phenomenon whereby group discussion tends to push members toward more extreme versions of their initial positions. This tracker maps that process in your own experience.

Step 1 — Pre-group position:
Identify an opinion you hold on a topic that matters to you — political, professional, relational, or cultural. Write your honest position as it existed before your current primary community reinforced it.

Step 2 — Community audit:
Describe the community or group in which you most frequently discuss this topic. What is the dominant position within that group?

Step 3 — Drift measurement:
Has your position on this topic become more extreme over time? Compare your current view to where you were two and five years ago. Chart the direction and magnitude of the drift.

Step 4 — Mechanism identification:
Which polarization mechanism drove the shift?
- Persuasive argument pool (you've only heard arguments in one direction)
- Social comparison (you've positioned yourself at or beyond the group norm to appear committed)
- Emotional contagion (the group's intensity has amplified your own)

Step 5 — Depolarization experiment:
Find the most compelling articulation of the position opposite to yours — not a straw man, but the strongest version. Write a one-paragraph summary of it as if you found it genuinely persuasive. What shifted, if anything?`,
  },
  {
    name: 'Conformity Resistance Protocol',
    category: 'Social Dynamics Simulation',
    added: '2026-01-03',
    type: 'SDS',
    users: '1,654',
    rating: '4.7%',
    prompt: `Based on Asch's conformity experiments, this protocol is designed to map your conformity threshold and build explicit resistance strategies.

Step 1 — Conformity history:
Recall a specific situation where you publicly agreed with a group position you privately disagreed with. What was the position? What was the cost of dissent you were avoiding?

Step 2 — Internal signal audit:
In the moment of conformity, what did your body signal? (Discomfort, constriction, a small voice, a sense of something wrong?) How quickly did you override that signal?

Step 3 — Threshold mapping:
Asch found that even one other dissenting voice dramatically reduced conformity rates. In which areas of your life are you the one dissenting voice keeping others' conformity honest? Where are you the silent conformist waiting for someone else to go first?

Step 4 — Cost-benefit analysis:
List the actual, concrete costs of dissenting in your most important current context. Now list what the dissent would protect or preserve. Is the calculation being made honestly, or is social fear compressing the benefit side?

Step 5 — Protocol design:
Write a specific, concrete plan for the next situation where you feel pressure to conform against your private judgment. What will you say? To whom? In what form?`,
  },
  {
    name: 'Power Dynamics Role Play',
    category: 'Social Dynamics Simulation',
    added: '2025-12-30',
    type: 'SDS',
    users: '2,345',
    rating: '4.8%',
    prompt: `Power is not just formal authority — it is the ability to shape others' reality, access, options, and sense of self. This prompt maps the power dynamics operating in your current relationships.

Step 1 — Relationship power audit:
Choose three significant relationships (professional, personal, familial). For each, rate who holds more structural power on a scale of -5 (you hold significantly less) to +5 (you hold significantly more).

Step 2 — Power source identification:
For each relationship, identify what the power differential is based on:
- Resource control (money, opportunity, information)
- Social status (reputation, network, position)
- Emotional leverage (the person who cares less holds more power)
- Dependency asymmetry (who needs whom more?)
- Expertise or knowledge

Step 3 — Behavior mapping:
How does your position in each power dynamic shape your behavior? Where do you perform deference you don't feel? Where do you exercise power in ways you haven't examined?

Step 4 — Power and ethics:
In the relationships where you hold more power: what obligations does that create? Are you meeting them?

Step 5 — The accountability gap:
Power reduces accountability — those with more power receive less honest feedback. Where are you receiving systematically distorted information because of your position? What would you need to do to correct it?`,
  },

  // Cultural Bias & Opinion Mapping
  {
    name: 'Implicit Bias Surface Probe',
    category: 'Cultural Bias & Opinion Mapping',
    added: '2025-12-28',
    type: 'CBO',
    users: '3,234',
    rating: '4.9%',
    prompt: `Implicit bias operates below conscious awareness — shaping attention, judgment, and behavior in ways that often contradict stated values. This probe is designed to surface it.

Step 1 — Association mapping:
For each pairing below, notice your immediate gut response — not what you think you should feel, but what arises first:
- Young / competent vs. Old / competent
- Male leadership / decisive vs. Female leadership / decisive
- Foreign accent / intelligent vs. Native accent / intelligent
- Wealth / deserving vs. Poverty / deserving
- Conventional appearance / trustworthy vs. Unconventional appearance / trustworthy

Step 2 — Bias source archaeology:
Choose the pairing where your gut response most diverged from your stated beliefs. Trace it: Where did that association come from? Media, family, early experience, peer environment?

Step 3 — Behavioral footprint:
Where has this association shaped a real decision — a hire, a recommendation, an assessment of credibility, a first impression you acted on?

Step 4 — Correction mechanism:
Research suggests awareness alone does not reduce implicit bias — deliberate counter-stereotypic thinking does. For your identified bias, name three people who directly counter the association. Make them specific and real.

Step 5 — Accountability structure:
What structural process — not just intention — would interrupt the bias before it affects your decisions?`,
  },
  {
    name: 'Cross-Cultural Value Clash',
    category: 'Cultural Bias & Opinion Mapping',
    added: '2025-12-25',
    type: 'CBO',
    users: '2,456',
    rating: '4.8%',
    prompt: `Cultural values are invisible until they collide. This exercise surfaces the value framework you absorbed through culture and examines where it creates friction with other frameworks.

Step 1 — Value dimension self-assessment:
Rate yourself on each dimension (1 = strongly one end, 10 = strongly the other):

Individualism (1) to Collectivism (10): Does primary obligation run to individual fulfillment or group harmony?
Low-context (1) to High-context (10): Should meaning be stated explicitly or encoded in context and relationship?
Monochronic (1) to Polychronic (10): Is time a linear resource to be managed or a flexible medium for relationship?
Low power distance (1) to High power distance (10): Should hierarchy be minimized or respected?
Short-term (1) to Long-term (10): Do decisions prioritize immediate outcomes or generational continuity?

Step 2 — Friction mapping:
In which current relationships or professional contexts do you experience friction that might be explained by clashing positions on these dimensions?

Step 3 — Ethnocentrism audit:
Which of your dimension positions do you experience as simply correct — not cultural, but universal? That certainty is where ethnocentrism lives.

Step 4 — Reframe exercise:
Choose your most certain position. Write a coherent, internally consistent case for the opposite position from the perspective of someone who holds it genuinely. Not a critique — a real defense.`,
  },
  {
    name: 'Stereotype Threat Scenario',
    category: 'Cultural Bias & Opinion Mapping',
    added: '2025-12-23',
    type: 'CBO',
    users: '1,876',
    rating: '4.7%',
    prompt: `Stereotype threat is the experience of being at risk of confirming a negative stereotype about a group you belong to. It reliably degrades performance — not through lack of ability, but through the cognitive and emotional load of managing the threat.

Step 1 — Threat identification:
List the social groups you belong to that carry negative stereotypes in contexts that matter to you (professional, academic, social, physical).

Step 2 — Activation mapping:
For each group membership, identify the contexts where you feel the stereotype most acutely activated. What cues activate it? Specific people, environments, tasks, or evaluations?

Step 3 — Behavioral response:
When stereotype threat activates, what happens to your performance, attention, or self-presentation?
- Do you over-prepare to inoculate against the stereotype?
- Do you distance from the group identity in the context?
- Do you experience intrusive thoughts that consume cognitive bandwidth?
- Do you avoid the situation entirely?

Step 4 — Role model effect:
Research shows that exposure to counter-stereotypic exemplars reduces threat. Who in your field or context actively defies the negative stereotype you carry? How might deliberate attention to their existence change your experience?

Step 5 — Structural vs. individual:
Stereotype threat is a structural problem created by the existence of the stereotype — not a personal failing. How does naming it as structural change your relationship to the experience?`,
  },
  {
    name: 'Opinion Formation Tracker',
    category: 'Cultural Bias & Opinion Mapping',
    added: '2025-12-20',
    type: 'CBO',
    users: '1,345',
    rating: '4.6%',
    prompt: `Opinions feel like conclusions we reach through reasoning. Research suggests they are often formed through exposure, emotional response, and social alignment — and reasoning is applied afterward to justify them.

Step 1 — Select a current opinion:
Choose a strong opinion you hold on a topic of real consequence to you.

Step 2 — Formation archaeology:
Trace how you came to hold this opinion. Be specific:
- What was your first exposure to this topic?
- What emotional response accompanied early encounters?
- Who were the first people you knew who held positions on it?
- When did you form your current position — was there a moment, or was it gradual?

Step 3 — Evidence audit:
List the five most influential pieces of evidence, arguments, or experiences that support your current position. Now list the most compelling evidence against it. Is the first list longer, more accessible, and more emotionally resonant than the second?

Step 4 — Motivated reasoning check:
Would you accept the same quality of evidence in support of the opposite position that you've accepted in support of your own? Apply the same evidentiary standard to both.

Step 5 — Update trigger:
What piece of information, argument, or experience would actually change your mind on this topic? If you cannot name one, you are holding a belief rather than an opinion.`,
  },
  {
    name: 'Media Framing Analyzer',
    category: 'Cultural Bias & Opinion Mapping',
    added: '2025-12-18',
    type: 'CBO',
    users: '2,123',
    rating: '4.7%',
    prompt: `Framing is the process by which media selects, emphasizes, and contextualizes information in ways that shape how audiences understand and evaluate issues. The same facts, differently framed, produce different conclusions.

Step 1 — Issue selection:
Choose a current issue you have a clear opinion about that you primarily understand through media coverage.

Step 2 — Frame identification:
Identify the dominant frame through which you've encountered this issue:
- Conflict frame: Who is fighting whom?
- Economic frame: Who wins or loses financially?
- Human interest frame: What is the personal story?
- Morality frame: What is right or wrong?
- Responsibility frame: Who is to blame or who should act?
- Game/strategy frame: Who is winning or losing politically?

Step 3 — Frame source audit:
Which outlets or sources have most shaped your understanding? What frames do they typically apply to this issue?

Step 4 — Missing frame exercise:
Write a 200-word account of the same issue using a completely different frame than the one you've been consuming. What does the issue look like when framed around the opposite emphasis?

Step 5 — Belief update:
After applying the missing frame, has any element of your opinion shifted? If not, has the exercise revealed what you'd need to see to shift it?`,
  },
  {
    name: 'Confirmation Bias Detector',
    category: 'Cultural Bias & Opinion Mapping',
    added: '2025-12-15',
    type: 'CBO',
    users: '1,987',
    rating: '4.8%',
    prompt: `Confirmation bias is the tendency to search for, interpret, and remember information in ways that confirm existing beliefs while discounting information that contradicts them.

Step 1 — Belief selection:
Choose a belief you hold with high confidence — about yourself, others, society, or how the world works.

Step 2 — Information diet audit:
Map the sources through which you primarily receive information about this topic. Do they skew toward confirmation or challenge of this belief?

Step 3 — Disconfirmation history:
Name the last time a piece of information meaningfully challenged this belief. How did you respond? Did you:
- Dismiss the source?
- Find a technicality that made it not apply?
- Acknowledge it briefly, then revert?
- Genuinely update?

Step 4 — Motivated skepticism test:
Apply your standard of critical evaluation to a piece of evidence that supports your belief. Do you apply the same level of scrutiny to confirming evidence as to disconfirming evidence?

Step 5 — Steel man the opposition:
Find the most sophisticated, well-evidenced version of the argument against your belief. Write it out. If you cannot do this, you do not yet understand the opposing position well enough to be confident in your own.`,
  },
  {
    name: 'Cultural Lens Comparison',
    category: 'Cultural Bias & Opinion Mapping',
    added: '2025-12-13',
    type: 'CBO',
    users: '1,543',
    rating: '4.6%',
    prompt: `Every culture provides a lens — a set of assumptions about human nature, social organization, and what constitutes a good life. This exercise makes your lens visible by placing it in comparison with others.

Step 1 — Identify your default lens:
What cultural framework most shaped your assumptions about:
- What success looks like
- What a good family structure looks like
- What constitutes a moral life
- What an individual owes their community
- What an individual is owed by their community

Step 2 — Locate a contrasting lens:
Choose a culture — historical or contemporary — that holds substantially different answers to these questions. This is most powerful when it is a culture you find initially difficult to relate to.

Step 3 — Internal logic exercise:
Write a defense of the contrasting lens from the inside. Not "they believe X because they haven't learned Y" — but "from within this framework, X is the coherent, rational, and humane response to the conditions of human life."

Step 4 — Your lens on trial:
Apply the contrasting culture's criteria for a good life to your own. By their standard, how are you doing? What does their framework reveal that yours obscures?

Step 5 — Meta-lens question:
Is there a position from which both lenses can be evaluated fairly — or does every evaluation already assume a third lens? What does that mean for the possibility of cultural objectivity?`,
  },

  // AI & Automation
  {
    name: 'Self-Improving Skill Loop',
    category: 'AI & Automation',
    added: '2025-12-10',
    type: 'AUTO',
    users: '2,345',
    rating: '4.8%',
    prompt: `Design a self-improving feedback loop for a skill you are actively developing.

Step 1 — Define the skill with precision. Not "become a better writer" — "write persuasive opening paragraphs for research proposals."

Step 2 — Current baseline: What does your output look like today? Describe a recent example with honest assessment.

Step 3 — Feedback architecture: How will you get accurate signal on quality? Who evaluates, by what criteria, on what timeline?

Step 4 — Deliberate practice design: What is the highest-leverage practice activity — the smallest unit of the skill you can isolate and repeat with immediate feedback?

Step 5 — Loop closure: After each practice iteration, what is the reflection protocol? How do you capture what changed and what still needs work?

Step 6 — Plateau diagnosis: When progress stalls, what are the most likely causes? Build a diagnostic checklist in advance.

Output: A structured 30-day skill development plan with weekly milestones, feedback sources, and a plateau protocol.`,
  },
  {
    name: 'Workflow Orchestration',
    category: 'AI & Automation',
    added: '2025-12-08',
    type: 'MULTI',
    users: '1,892',
    rating: '4.6%',
    prompt: `Map and redesign a recurring workflow that currently requires significant manual coordination.

Step 1 — Workflow selection: Choose a process you execute at least weekly that involves multiple steps, handoffs, or decision points.

Step 2 — Current state mapping: Document every step, every actor, every input and output, every decision point. Be exhaustive.

Step 3 — Friction inventory: Mark every step where time is wasted, errors occur, context is lost, or effort is duplicated.

Step 4 — Automation candidates: Which steps are rule-based, repetitive, and have clear inputs and outputs?

Step 5 — Human judgment requirements: Which steps require judgment, relationship, creativity, or ethical reasoning? These must remain human.

Step 6 — Orchestration design: Design the new workflow. Which tools orchestrate which steps? How are handoffs structured? What are the failure modes and fallback protocols?

Step 7 — Success metrics: What does a measurably better version of this workflow look like? Define before implementing.

Output: A redesigned workflow diagram with automation map, human touchpoint rationale, and implementation priority order.`,
  },
  {
    name: 'Multi-Agent Collaboration',
    category: 'AI & Automation',
    added: '2025-12-05',
    type: 'AGENT',
    users: '1,245',
    rating: '4.7%',
    prompt: `Design a multi-agent system to handle a complex task that currently requires a single human expert.

Step 1 — Task decomposition: Select a complex task. Break it into discrete subtasks. For each, specify: inputs required, outputs produced, decision rules, and quality criteria.

Step 2 — Agent specialization: For each subtask, define the ideal agent — what model, what system prompt, what tools, what context? Specialization produces better outputs than generalist agents on complex tasks.

Step 3 — Coordination architecture: How do agents pass information, outputs, and flags between each other? Specify the handoff protocol, the shared memory structure, and the escalation path when an agent encounters ambiguity.

Step 4 — Quality control layer: Design a reviewing agent or review protocol that catches errors before they propagate.

Step 5 — Human-in-the-loop design: Where should a human be consulted? Build in clear checkpoints rather than running fully autonomous and reviewing only at the end.

Step 6 — Failure mode analysis: What breaks if one agent fails? Design graceful degradation so a single agent failure does not corrupt the entire pipeline.

Output: A multi-agent architecture specification with agent definitions, coordination protocol, quality control layer, and failure mode documentation.`,
  },
  {
    name: 'Memory & Learning System',
    category: 'AI & Automation',
    added: '2025-12-03',
    type: 'LEARN',
    users: '856',
    rating: '4.5%',
    prompt: `Design a personal knowledge management system that actually improves your thinking over time — not just stores information.

Step 1 — Capture philosophy: What is worth capturing? Define your criteria for what enters the system. Volume is the enemy of utility.

Step 2 — Processing protocol: Raw capture is not knowledge. Design the processing step — when, how, and using what method do you transform raw input into a structured note, connection, or insight?

Step 3 — Connection architecture: How does new knowledge link to existing knowledge? What tagging, linking, or mapping structure makes retrieval and connection possible?

Step 4 — Review and decay: Knowledge without review decays. Design a spaced repetition or periodic review protocol that keeps your most important knowledge accessible without overwhelming your system.

Step 5 — Output generation: A knowledge system that doesn't produce outputs is a graveyard. How does your system generate writing, decisions, conversations, or creative work from stored knowledge?

Step 6 — System audit: At what cadence do you audit the system itself — removing outdated notes, restructuring categories, identifying what's missing?

Output: A complete personal knowledge system design with capture criteria, processing protocol, connection architecture, review cadence, and output channels.`,
  },

  // Business & Marketing
  {
    name: 'Competitive Research Assistant',
    category: 'Business & Marketing',
    added: '2025-11-30',
    type: 'RESEARCH',
    users: '1,567',
    rating: '4.6%',
    prompt: `Conduct a structured competitive analysis for your product, project, or idea.

Step 1 — Define your competitive landscape: Who are the direct competitors (same solution, same customer) and indirect competitors (different solution, same need)?

Step 2 — Positioning audit: For each competitor, define:
- Who they say they're for
- What primary problem they claim to solve
- Their pricing model and tier structure
- Their dominant acquisition channel
- The customer language they use in their messaging

Step 3 — Differentiation mapping: Build a grid. Rows are competitors including yourself. Columns are the five to eight dimensions that matter most in this market. Fill in honestly.

Step 4 — Gap analysis: Where does no competitor currently serve a real customer need? Where is the market underserved not by accident but by assumption?

Step 5 — Positioning recommendation: Based on the map, where can you credibly occupy a distinct position? Distinct means: your target customer would choose you over alternatives for a specific, nameable reason.

Step 6 — Threat prioritization: Which competitor is most dangerous to your position over the next 18 months, and why?

Output: A competitive positioning map, gap analysis, and 12-month strategic response to your top threat.`,
  },
  {
    name: 'Brand Guidelines Generator',
    category: 'Business & Marketing',
    added: '2025-11-28',
    type: 'BRAND',
    users: '654',
    rating: '4.4%',
    prompt: `Define the core guidelines that will make your brand communicable, consistent, and defensible.

Step 1 — Brand truth: What is the single most honest thing you can say about what your organization does and why it matters? Not aspirational — true right now.

Step 2 — Audience definition: Describe your primary audience with specificity. Not demographics — psychology. What do they want that they cannot easily articulate? What do they fear? What do they believe about themselves?

Step 3 — Voice definition: Write three sentences your brand would say. Write three sentences your brand would never say. The contrast is more useful than the positive definition alone.

Step 4 — Visual principles: Define three to five visual principles (not specific colors or fonts — the underlying logic). Example: "Every visual choice should make the complex feel approachable, not the simple feel complex."

Step 5 — Consistency rules: What are the five non-negotiable rules that apply to every piece of communication? These should be specific enough to adjudicate real decisions.

Step 6 — The brand test: Write the question you will ask of any piece of communication before publishing. One question that captures whether it is on-brand or off.

Output: A one-page brand guidelines document usable by any collaborator.`,
  },
  {
    name: 'Cohort Pitch Framework',
    category: 'Business & Marketing',
    added: '2025-11-25',
    type: 'PITCH',
    users: '987',
    rating: '4.5%',
    prompt: `Build a pitch for your cohort, program, or research initiative that is grounded, specific, and persuasive across multiple audience types.

Step 1 — Core claim: State the single most important thing your program does for its participants. Make it specific and falsifiable — it should be possible to verify that it happened or didn't.

Step 2 — Audience matrix: Define your three primary audience types. For each, identify:
- The question they are trying to answer when evaluating you
- The vocabulary that signals credibility to them
- The proof they require before acting

Step 3 — Evidence architecture: What evidence do you have? Sort it by type: testimonials, data, demonstrations, credentials, case studies. Match each evidence type to the audience that values it most.

Step 4 — Objection library: List the five most common objections you encounter. Write a specific, honest response to each — not a reframe that avoids the objection, but a real answer.

Step 5 — Call to action design: What is the exact next step you want each audience type to take? Make it as small and specific as possible.

Step 6 — The one-paragraph version: Write the entire pitch in one paragraph. If you cannot do it in one paragraph, you do not yet know what you are saying.

Output: A pitch framework with audience-specific variants, objection responses, and a one-paragraph master version.`,
  },

  // Productivity & Writing
  {
    name: 'Content Research Writer',
    category: 'Productivity & Writing',
    added: '2025-11-22',
    type: 'CONTENT',
    users: '2,876',
    rating: '4.7%',
    prompt: `Produce a research-backed piece of content on a topic where depth and accuracy matter.

Step 1 — Topic definition: Define your topic with precision. What specific question are you answering? Broad topics produce shallow content.

Step 2 — Audience and context: Who is reading this, in what context, with what prior knowledge, and what do they need to be able to do or understand after reading?

Step 3 — Research protocol: Identify your primary sources. For each claim in your eventual piece, what is the evidence tier? (Primary research, secondary synthesis, expert opinion, anecdotal.) Define which tiers are acceptable for your audience and purpose.

Step 4 — Structure design: What is the logical architecture? Map the argument, not just the topic areas. Each section should follow from the last with a reason.

Step 5 — First draft discipline: Write a complete first draft without editing. Separate generation from refinement.

Step 6 — Revision protocol: Read for: accuracy of claims, clarity of argument, appropriateness of evidence tier, and consistency of voice. Four separate passes.

Step 7 — The one-sentence test: Before publishing, write the one sentence that captures what this piece actually argues. If you cannot, the structure needs revision.

Output: A complete draft with source documentation and revision notes.`,
  },
  {
    name: 'Brainstorming Assistant',
    category: 'Productivity & Writing',
    added: '2025-11-20',
    type: 'IDEATION',
    users: '1,654',
    rating: '4.6%',
    prompt: `Run a structured brainstorming session that produces genuinely novel ideas rather than recombinations of what you already know.

Step 1 — Problem definition: Write the problem you're brainstorming on in three different ways. The reframings often contain the solution.

Step 2 — Constraint removal: List every assumption you are making about what is possible, acceptable, or realistic. Then ignore those constraints temporarily and brainstorm in the unconstrained space.

Step 3 — Analogical reasoning: What domains, industries, organisms, or historical periods have solved a structurally similar problem? What can be borrowed, inverted, or scaled from those solutions?

Step 4 — Worst idea generation: List ten of the worst possible ideas for solving this problem. Then find the insight embedded in each bad idea — they often point toward unexplored territory.

Step 5 — Forced combination: Take two ideas that seem unrelated and force a synthesis. What emerges?

Step 6 — Evaluation protocol: After generating, evaluate each idea on: feasibility (can it be done?), novelty (has it been done?), leverage (does it actually solve the core problem?).

Step 7 — Prioritization: From all generated ideas, identify the one with the highest potential regardless of feasibility. Then identify the one you can test fastest.

Output: A ranked idea list with evaluation scores and a 48-hour test plan for the top two candidates.`,
  },
  {
    name: 'Case Study Narrative Builder',
    category: 'Productivity & Writing',
    added: '2025-11-18',
    type: 'CASE',
    users: '1,345',
    rating: '4.5%',
    prompt: `Build a compelling case study that advances understanding, demonstrates method, and makes findings accessible to a non-specialist audience.

Step 1 — Subject and scope: Define the case precisely. A case study answers a specific question through detailed examination of a specific instance. What is the question? What is the instance?

Step 2 — Evidence inventory: What data, observations, documents, testimonials, or artifacts do you have access to? Audit completeness and gaps.

Step 3 — Narrative architecture:
- Setup: What was the situation before the intervention or event?
- Complication: What problem, question, or disruption drove the study?
- Investigation: What was examined, by what method, with what rigor?
- Finding: What was discovered that was not already known?
- Implication: What does this mean for theory, practice, or policy?

Step 4 — Methodological transparency: A case study is only as credible as its method is visible. What did you observe? How? With what acknowledged limitations?

Step 5 — Generalizability statement: What can be generalized from this case, and to what? Be specific about scope — overclaiming destroys credibility.

Step 6 — Practitioner takeaway: If someone were to apply one insight from this case study to their own context, what would it be?

Output: A structured case study draft with methodology section, narrative arc, and practitioner summary.`,
  },
  {
    name: 'Research Paper Outliner',
    category: 'Productivity & Writing',
    added: '2025-11-15',
    type: 'RESEARCH',
    users: '2,234',
    rating: '4.8%',
    prompt: `Build the structural foundation for a research paper that makes a genuine contribution to its field.

Step 1 — Contribution statement: What does this paper argue that has not been argued before, or argues with evidence or precision that did not previously exist? This is your north star — every section must serve it.

Step 2 — Literature positioning: What are the three to five most directly relevant prior works? For each, state: what it argued, what it got right, and what gap your paper addresses.

Step 3 — Method design: What is your method for generating or analyzing evidence? Why is this method appropriate to your research question? What are its limitations?

Step 4 — Structure architecture:
- Introduction: question, gap, contribution preview
- Background/literature: what is already known
- Method: how evidence was generated or selected
- Findings: what the evidence shows
- Discussion: what the findings mean and for whom
- Conclusion: contribution statement, limitations, future work

Step 5 — Argument flow: Within each section, write the one-sentence argument. The sections should form a logical chain — each following necessarily from the last.

Step 6 — Objection anticipation: What are the three strongest objections a reviewer would raise? Where in the paper do you address each?

Output: A complete annotated outline with argument chain, literature positioning, method justification, and objection map.`,
  },

  // Context & Management
  {
    name: 'Context Management',
    category: 'Context & Management',
    added: '2025-11-12',
    type: 'CTX',
    users: '2,345',
    rating: '4.8%',
    prompt: `Design a system for managing the information context required to work effectively on complex, long-horizon projects.

Step 1 — Context audit: For your most demanding current project, list every category of information you need to hold in working memory to make good decisions. What do you currently forget, lose, or have to rediscover?

Step 2 — Context decay analysis: Which information decays fastest (becomes stale or irrelevant)? Which is stable and reusable? Design different retention and refresh protocols for each.

Step 3 — External storage design: What information should be externalized into documentation, structured notes, or shared systems rather than held in individual memory?

Step 4 — Context transfer protocol: When handing a project to a collaborator or returning to it after time away, what information must be transferred to restore full working context? Write that transfer protocol.

Step 5 — Meeting and decision context: Before each significant meeting or decision, what context must be loaded? Design a pre-session context-loading routine that takes less than 10 minutes.

Step 6 — Context overload response: When you are holding too much context simultaneously, what is your triage protocol? Which information gets dropped first, and how do you recover it when needed?

Output: A context management system with storage architecture, refresh cadence, transfer protocol, and overload triage plan.`,
  },
  {
    name: 'Root Cause Tracing',
    category: 'Context & Management',
    added: '2025-11-10',
    type: 'DEBUG',
    users: '1,432',
    rating: '4.6%',
    prompt: `Apply structured root cause analysis to a recurring problem in your work or life.

Step 1 — Problem statement precision: Describe the problem in one sentence. Include what is happening, where, when, and at what frequency. Vague problem statements produce vague causes.

Step 2 — Symptom vs. cause separation: List everything you observe about this problem. Separate observations (symptoms) from explanations (hypothesized causes). Do not conflate them.

Step 3 — Five whys cascade: Take your most plausible surface cause and ask why it exists. Take that answer and ask why again. Repeat five times or until you reach a root cause — a cause that, if removed, would prevent the problem from recurring.

Step 4 — Causal tree expansion: The five whys produces a single chain. Reality is usually a tree. Map the other causal branches — the contributing factors that are not the root but enable it.

Step 5 — Root cause verification: Test your root cause hypothesis. If this cause is removed or modified, does the problem resolve? What evidence would confirm or disconfirm your hypothesis?

Step 6 — Solution design: Interventions at symptom level produce temporary relief. Interventions at root cause level produce resolution. Design interventions at each level — triage now, resolution over time.

Step 7 — Recurrence prevention: What monitoring system detects early signs of this problem recurring before it reaches full expression?

Output: A root cause map with causal tree, verified root hypothesis, and tiered intervention plan.`,
  },
];

const CATEGORY_FILTERS = [
  'All Categories',
  'Simulation Prompts',
  'Cognitive Dissonance Experiments',
  'Clinical & Personality Reflection',
  'Social Dynamics Simulation',
  'Cultural Bias & Opinion Mapping',
  'AI & Automation',
  'Business & Marketing',
  'Productivity & Writing',
  'Context & Management',
];

export default function LibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const { play } = useSound();

  const showNotification = () => {
    setShowCopyNotification(true);
    setIsFadingOut(false);
    setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setShowCopyNotification(false);
      }, 300);
    }, 2000);
  };

  const formatSkillPrompt = (skill: Skill): string => {
    return skill.prompt;
  };

  const filteredSkills = SKILLS.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All Categories' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setFilterOpen(false);
    play('click');
  };

  return (
    <>
      <SideNavigation />
      <main className={styles.pageLayout}>
        <div className={styles.container}>
          {/* Main Content Area */}
          <div className={styles.contentWrapper}>
            {/* Left Content Area */}
            <div className={styles.mainArea}>
              {/* Header Section */}
              <div className={styles.headerSection}>
                <div className={styles.headerCopy}>
                  <h1 className={styles.title}>Prompt Library</h1>
                  <p className={styles.subtitle}>Browse featured prompts and AI art styles.<span className={styles.subtitleCopyHint}> Click any item to copy to clipboard.</span></p>
                </div>
                <button
                  className={styles.scanButton}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/prompts/CharacterBlue.png';
                    link.download = 'CharacterBlue.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    play('click');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Character
                </button>
              </div>

              {/* Featured Art Styles Section */}
              <div className={styles.featuredSection}>
                <h2 className={styles.featuredTitle}>FEATURED PROMPTS</h2>
                <p className={styles.featuredCopyHint}>Click any item to copy to clipboard.</p>
                <div className={styles.artStylesContainer}>
                  {ART_STYLES.map((style) => (
                    <div
                      key={style.id}
                      className={styles.artStyleCard}
                      onClick={() => {
                        navigator.clipboard.writeText(style.copyText ?? style.description);
                        play('click');
                        showNotification();
                      }}
                      title="Click to copy"
                    >
                      <div className={styles.artStyleHeader}>
                        <h3 className={styles.artStyleName}>{style.name}</h3>
                        <span className={styles.artStyleMood}>{style.mood}</span>
                      </div>
                      <p className={styles.artStyleDescription}>
                        {style.description.length > DESCRIPTION_MAX
                          ? `${style.description.slice(0, DESCRIPTION_MAX)}…`
                          : style.description}
                      </p>
                      {style.image && (
                        <div className={styles.artStyleImage}>
                          <img src={style.image} alt={style.name} />
                        </div>
                      )}
                      <div className={styles.artStyleFooter}>
                        <span className={styles.artStyleUseCase}>{style.useCase}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search & Filter Section */}
              <div className={styles.filterSection}>
                <div className={styles.searchBox}>
                  <svg
                    className={styles.searchIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search skills..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Category Filter Dropdown */}
                <div className={styles.filterDropdown}>
                  <button
                    className={styles.filterButton}
                    onClick={() => setFilterOpen(!filterOpen)}
                    onMouseEnter={() => play('hover')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                    <span className={styles.filterLabel}>
                      {selectedCategory === 'All Categories' ? 'All' : selectedCategory}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.filterChevron}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {filterOpen && (
                    <div className={styles.filterMenu}>
                      {CATEGORY_FILTERS.map((category) => (
                        <button
                          key={category}
                          className={`${styles.filterOption} ${
                            category === selectedCategory ? styles.filterOptionActive : ''
                          }`}
                          onClick={() => handleCategorySelect(category)}
                          onMouseEnter={() => play('hover')}
                        >
                          {category}
                          {category === selectedCategory && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Results Count */}
              <div className={styles.resultsInfo}>
                <p className={styles.resultsText}>
                  {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Excel Sheet Styled Skills Table */}
              <div className={styles.tableContainer}>
                <div className={styles.tableScroll}>
                  <table className={styles.skillsTable}>
                    <thead>
                      <tr>
                        <th>SKILL</th>
                        <th>CATEGORY</th>
                        <th>ADDED</th>
                        <th>TYPE</th>
                        <th>USERS</th>
                        <th>RATING</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSkills.length > 0 ? (
                        filteredSkills.map((skill, idx) => (
                          <tr
                            key={idx}
                            onClick={() => {
                              navigator.clipboard.writeText(formatSkillPrompt(skill));
                              play('click');
                              showNotification();
                            }}
                            className={styles.tableRow}
                            title="Click to copy"
                          >
                            <td>{skill.name}</td>
                            <td className={styles.categoryCell}>{skill.category}</td>
                            <td>{skill.added}</td>
                            <td>{skill.type}</td>
                            <td>{skill.users}</td>
                            <td>{skill.rating}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className={styles.emptyState}>
                            No skills found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showCopyNotification && (
          <div className={`${styles.copyNotification} ${isFadingOut ? styles.fadeOut : ''}`}>
            ✓ Copied to clipboard
          </div>
        )}
      </main>
    </>
  );
}
