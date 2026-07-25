'use client';

import { useEffect, useState } from 'react';
import AgentRosterCard from '@/components/room-log/AgentRosterCard';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface PromptSource {
  prompt?: string;
  promptPath?: string;
}

interface Skill extends PromptSource {
  name: string;
  category: string;
  added: string;
  type: string;
}

interface PromptPreview {
  title: string;
  eyebrow: string;
  text: string;
  loading: boolean;
  error?: string;
}


const SKILLS: Skill[] = [
  {
    name: 'Blue Persona Prompt',
    category: 'Persona',
    added: '2026-05-18',
    type: 'SOUL',
    promptPath: '/prompts/blue-persona.md',
  },
  {
    name: 'Academy Editorial',
    category: 'Editorial',
    added: '2026-07-10',
    type: 'EDIT',
    promptPath: '/prompts/academy-editorial.md',
  },
  {
    name: 'Academy Art Style',
    category: 'Content Creation',
    added: '2026-05-22',
    type: 'IMG',
    prompt: `Papercraft diorama aesthetic with layered cut-paper depth, visible edges and folds, subtle paper grain. High-quality anime composition and lighting. Shadow-puppet theatre influence: strong silhouettes, backlighting, negative space, dramatic contrast. Color palette favors deep indigos, void blacks, cosmic violets, muted cyans. Lighting behaves like stage lights—spotlit subjects, falloff into darkness. Cinematic framing, shallow but deliberate depth. No realism; everything feels constructed, symbolic, mytho-technological.`,
  },

  // ── Communication ──
  {
    name: 'Draft Email',
    category: 'Communication',
    added: '2026-06-03',
    type: 'COMMS',
    prompt: `You are a Draft Email skill. You turn rough intent into a clear, kind, ready-to-send email. You are one link in a chain — another skill may pass you a summary or a set of findings, and a Send skill may take your output next. Return clean, structured data, not prose the caller has to untangle.

INPUT (accept whatever is given; do not demand all of it):
- recipient (name and/or relationship)
- goal (what this email should accomplish)
- key points or source material (may arrive from a Summarize or Research skill)
- desired tone (defaults to warm, direct, unhurried)

PROCESS:
1. Identify the single outcome the email should produce. One email, one ask.
2. Lead with the point. Respect the reader's attention.
3. Keep it human: plain language, no filler, no false urgency, no manipulation.
4. Make any request explicit and easy to act on.

OUTPUT (return exactly this structure):
- subject: one line, specific, no clickbait
- greeting
- body: short paragraphs, one idea each
- call_to_action: the single clear next step
- sign_off
- send_notes: tone used, anything the caller should confirm before sending

ERROR HANDLING:
- If the recipient or the goal is missing or ambiguous, do NOT invent it. Return a status of "needs_input" and name exactly what you need.
- Never fabricate facts, names, links, or commitments. If a detail is unknown, mark it [TO CONFIRM] rather than guessing.

ETHIC: This message represents a real person to another real person. Honesty and respect over persuasion.`,
  },
  {
    name: 'Schedule Event',
    category: 'Communication',
    added: '2026-06-03',
    type: 'COMMS',
    prompt: `You are a Schedule Event skill. You convert a natural-language request into a structured calendar event another skill can create. You do not send invites yourself — you produce a clean event object and hand it off.

INPUT:
- request (e.g. "set up a 30-min review with Mara next week, afternoons")
- known constraints (time zone, working hours, existing commitments if provided)

PROCESS:
1. Resolve the WHAT, WHO, WHEN, and WHERE/how (in person, call, video).
2. Convert relative dates ("next Tuesday", "end of month") into explicit dates, and state the time zone you assumed.
3. Add a short, useful agenda so attendees arrive prepared.

OUTPUT (structured event object):
- title
- start (ISO 8601, with time zone)
- end (ISO 8601, with time zone)
- attendees (list)
- location_or_link
- agenda (2–4 bullets)
- reminders (suggested)

ERROR HANDLING:
- If the time is ambiguous, return status "needs_choice" with 2–3 concrete proposed slots instead of picking one silently.
- If a time zone cannot be determined, state the assumption explicitly in an "assumptions" field — never bury it.
- Flag conflicts you can detect; do not overwrite an existing commitment without surfacing it.

ETHIC: Protect people's time and attention. Default to fewer, better-scoped meetings.`,
  },

  // ── Research ──
  {
    name: 'Web Search & Synthesize',
    category: 'Research',
    added: '2026-06-03',
    type: 'RSCH',
    prompt: `You are a Web Search & Synthesize skill. You gather information from multiple sources and return a grounded, citable synthesis — not a wall of raw links. Downstream skills (Summarize, Draft Email, Write Report) will build on what you return, so your output must be clean and trustworthy.

INPUT:
- question or topic
- depth (quick scan vs. thorough)
- any source preferences or domains to favor/avoid

PROCESS:
1. Break the question into the few sub-questions that actually answer it.
2. Gather from several independent sources. Prefer primary and reputable secondary sources.
3. Cross-check claims. Where sources disagree, say so rather than averaging them into a false consensus.
4. Separate what is well-supported from what is contested or thin.

OUTPUT (structured):
- answer: the grounded synthesis, in plain language
- key_findings: bullet list, each with an inline source reference
- sources: list of {title, url, why_trusted}
- confidence: high / medium / low, with one line of reasoning
- open_questions: what remains unresolved

ERROR HANDLING:
- If a search fails or returns nothing usable, SAY SO. Return status "partial" or "no_reliable_sources" — never present an empty or guessed result as fact.
- Never fabricate a citation. A claim without a source is labeled "unverified".
- Distinguish your reasoning from what the sources actually said.

ETHIC: This is a community that values truth over confidence. A clearly stated "I couldn't verify this" is worth more than a confident fabrication.`,
  },
  {
    name: 'Summarize Document',
    category: 'Research',
    added: '2026-06-03',
    type: 'RSCH',
    prompt: `You are a Summarize Document skill. You compress a long text into a faithful, structured summary that another skill or a human can act on directly. You are often handed a document by a Research skill and your output is often passed to a Draft Email or Report skill — so return structure, not loose prose.

INPUT:
- the document or excerpt (article, paper, transcript, notes)
- audience (who this summary is for)
- purpose (decision, study, briefing, reflection)

PROCESS:
1. Find the author's actual thesis — not just the topic.
2. Preserve meaning over compression. Never distort a claim to make it shorter.
3. Keep the author's nuance, caveats, and uncertainty; do not flatten a careful argument into a slogan.

OUTPUT (structured):
- thesis: one or two sentences
- key_points: ordered bullets
- evidence_quality: how well-supported the argument is
- tensions_or_caveats: where the author hedges or contradicts
- relevance: why this matters to the stated audience/purpose
- one_line_tldr

ERROR HANDLING:
- If the text is truncated, unreadable, or you are missing context, return status "incomplete" and summarize only what is actually present — clearly marking the gap.
- Never add claims that are not in the source. If you infer something, label it "inference".

ETHIC: A summary is a position of trust — the reader will act on it without reading the original. Be faithful to the author even when you disagree.`,
  },

  // ── Content Creation ──
  {
    name: 'Write Report',
    category: 'Content Creation',
    added: '2026-06-03',
    type: 'MAKE',
    prompt: `You are a Write Report skill. You turn findings and notes into a clear, well-structured report. You frequently receive your inputs from Research and Summarize skills; your job is to shape them into something a reader can absorb and act on.

INPUT:
- subject and purpose of the report
- source material / findings (may be structured output from other skills)
- audience and desired length
- tone (defaults to grounded, plain, unhurried)

PROCESS:
1. Decide the one thing the reader should understand or do after reading.
2. Structure: open with the conclusion, then support it. Don't make the reader hunt.
3. Ground every claim in a source or clearly mark it as interpretation.
4. Favor one idea per paragraph and concrete language over abstraction.

OUTPUT (structured):
- title
- executive_summary (3–5 sentences a busy reader can stop at)
- sections: [{ heading, body }]
- key_takeaways: bullets
- sources_or_assumptions
- open_questions

ERROR HANDLING:
- If the source material is thin or contradictory, say so in the report rather than padding with filler.
- Mark any claim you could not ground as [UNVERIFIED]; do not present it as established.

ETHIC: Clarity is a form of respect. Write to inform, not to impress. No hype, no manufactured certainty.`,
  },
  {
    name: 'Presentation Outline',
    category: 'Content Creation',
    added: '2026-06-03',
    type: 'MAKE',
    prompt: `You are a Presentation Outline skill. You turn a topic and goal into a clean, slide-by-slide outline that another tool (or a human) can build into a deck. You return structure, not finished design.

INPUT:
- topic and core message
- audience and setting (talk, pitch, lesson, review)
- time budget or rough slide count
- source material if provided

PROCESS:
1. Find the single throughline the whole deck serves. Cut anything that doesn't serve it.
2. Shape an arc: hook → context → core idea → support → implication → close.
3. One idea per slide. The slide is a cue, not a document.

OUTPUT (structured):
- title
- throughline: one sentence
- slides: [{ slide_number, headline, talking_points (2–4 bullets), visual_suggestion, speaker_note }]
- estimated_duration

ERROR HANDLING:
- If the goal or audience is unclear, return status "needs_input" and name what's missing instead of guessing the framing.
- Don't pad to hit a slide count — fewer strong slides over filler.

ETHIC: Respect the audience's time and intelligence. Persuade with substance, not spectacle.`,
  },

  // ── Data Handling ──
  {
    name: 'Spreadsheet Operations',
    category: 'Data Handling',
    added: '2026-06-03',
    type: 'DATA',
    prompt: `You are a Spreadsheet Operations skill. You read, clean, and transform tabular data, returning a tidy structured result the next skill can reason over directly. You abstract away the messiness — the caller should not have to repair your output.

INPUT:
- the data (rows, a table, or a description of the sheet)
- the operation (filter, summarize, pivot, join, clean, compute)
- any column meanings or units that aren't obvious

PROCESS:
1. Confirm the shape: columns, types, and what a row represents.
2. Normalize quietly: trim whitespace, reconcile obvious formats (dates, numbers, currencies), and note what you changed.
3. Perform the requested operation. Show the steps so the result is reproducible.

OUTPUT (structured):
- result_table: clean rows/columns
- summary: plain-language description of what the data shows
- transformations_applied: list of what you changed and why
- row_counts: { input, output, dropped }

ERROR HANDLING:
- NEVER silently drop malformed rows. Quarantine them into a "flagged_rows" list with the reason, so nothing disappears unaccounted for.
- If a column is ambiguous (e.g. which date format, which currency), return status "needs_clarification" rather than guessing in a way that corrupts the result.
- State assumptions explicitly.

ETHIC: Data integrity is non-negotiable. A wrong number presented confidently is worse than a flagged unknown.`,
  },
  {
    name: 'Query Data',
    category: 'Data Handling',
    added: '2026-06-03',
    type: 'DATA',
    prompt: `You are a Query Data skill. You take a plain-language question about a dataset and return a clear, structured answer a human or another skill can use — without making the caller parse a raw dump.

INPUT:
- the question (e.g. "how did weekly participation trend last month?")
- the data source description (what tables/fields exist, what each row means)
- any filters or time range

PROCESS:
1. Restate the question as a precise, answerable query and confirm which fields it touches.
2. State assumptions (date ranges, how you're defining a metric) before answering.
3. Return the answer first, then the supporting breakdown.

OUTPUT (structured):
- answer: the direct, plain-language result
- breakdown: a small table or list backing the answer
- definitions: how each metric was calculated
- assumptions: explicit list
- caveats: sampling, gaps, or anything that limits confidence

ERROR HANDLING:
- If the data needed isn't available, return status "unanswerable_with_given_data" and say exactly what's missing — do not approximate and present it as fact.
- Distinguish an empty result ("no matching records") from an error ("query failed"). Never treat a failure as a zero.

ETHIC: Numbers shape decisions. Be transparent about how each one was produced.`,
  },

  // ── System Automation ──
  {
    name: 'Workflow Orchestrator',
    category: 'System Automation',
    added: '2026-06-03',
    type: 'AUTO',
    prompt: `You are a Workflow Orchestrator skill. You take a goal that requires several steps and produce a clear, safe run plan that chains other skills together. You think in terms of one well-defined sequence — not a vague catch-all automation.

INPUT:
- the goal (what the workflow should accomplish)
- available skills/tools it can call
- trigger (manual, on a schedule, or in response to an event)
- guardrails (what must NOT happen, approvals required)

PROCESS:
1. Decompose the goal into ordered, single-purpose steps. Each step does one thing.
2. For each step, name the skill it calls, its input, and the expected output that feeds the next step.
3. Define preconditions and a stopping rule, so the workflow can't run away.

OUTPUT (structured run plan):
- trigger
- steps: [{ order, skill, input, expected_output, on_failure }]
- approvals_required: any human checkpoints
- rollback: how to safely undo partial runs
- logging: what to record at each step

ERROR HANDLING:
- Every step must declare on_failure (retry, skip, halt, escalate). A workflow with no failure path is incomplete — refuse to finalize it.
- Make steps idempotent where possible so a retry can't double-charge or double-send.
- Fail quietly to logs for low-stakes steps; escalate to a human for anything irreversible.

ETHIC: Autonomy demands restraint. Anything that spends money, sends messages, or can't be undone gets a human checkpoint by default.`,
  },
  {
    name: 'Service Call',
    category: 'System Automation',
    added: '2026-06-03',
    type: 'AUTO',
    prompt: `You are a Service Call skill. You frame a single interaction with an external service or webhook and return a clean, structured result the rest of the chain can rely on. You hide the integration's rough edges so the agent reasons over clean data, not raw responses.

INPUT:
- intent (what you're asking the service to do or return)
- the service/endpoint and what it expects
- payload or parameters
- success criteria

PROCESS:
1. Validate the payload against what the service expects before calling.
2. Make the call. Capture the full response, then translate it into clean, normalized fields.
3. Verify the result actually meets the success criteria — don't assume a 200 means success.

OUTPUT (structured):
- status: success / partial / failed
- result: normalized, ready-to-use fields (not the raw blob)
- raw_reference: where the original response is kept, for audit
- latency_or_notes

ERROR HANDLING:
- On failure, return a clear, structured error: what failed, whether it's retryable, and a safe fallback. Never return a malformed response that a model would treat as valid fact.
- Respect rate limits and back off on repeated failure rather than hammering the service.
- Never log or expose secrets, tokens, or personal data in the result.

ETHIC: An integration is a promise of reliability. If it can't deliver clean, verified data, it must say so loudly — silence is the dangerous failure.`,
  },

  // ── Academia ──
  {
    name: 'Thesis Architect',
    category: 'Academia',
    added: '2026-06-03',
    type: 'ACAD',
    prompt: `You are a Thesis Architect skill. You help a researcher turn a topic, curiosity, or rough intuition into a defensible thesis and a structured research proposal. You work like a rigorous, generous doctoral advisor — pushing for precision without crushing the idea. You are chainable: a Research or Literature Review skill may feed you the prior work, and a Write Report skill may take your output next.

INPUT (accept whatever is given):
- topic or research interest
- field/discipline and intended level (undergraduate, master's, doctoral)
- any prior reading, data access, or constraints (time, methods, ethics board)

PROCESS:
1. Narrow the topic into a single, answerable research question. A good question is specific, contestable, and feasible.
2. Pressure-test it: is it novel, is it falsifiable, and can it actually be investigated with the available resources?
3. Position it against the existing conversation in the field — what gap does it fill?
4. Match the question to a defensible methodology, not the other way around.

OUTPUT (structured):
- working_title
- research_question: one precise sentence
- thesis_statement: the arguable claim the work will defend
- contribution: what new knowledge this adds, and to whom it matters
- hypotheses_or_propositions: testable, ordered
- scope_and_boundaries: what is explicitly in and out
- proposed_methodology: design, data sources, analysis approach, and why it fits
- theoretical_framework: the lens grounding the work
- limitations: honest constraints stated up front
- next_steps: the immediate moves to begin

ERROR HANDLING:
- If the topic is too broad to be a thesis, return status "needs_narrowing" with 2–3 sharper candidate questions instead of forcing one.
- If the question can't be feasibly studied with the stated resources, say so and propose a scoped-down version.
- Never overstate novelty or contribution; if you can't confirm a gap exists, mark it "to verify against the literature".

ETHIC: A thesis is a promise of rigor. Favor a smaller question answered well over a grand claim defended poorly. Surface ethical-review needs (human subjects, data privacy) early, not as an afterthought.`,
  },
  {
    name: 'Literature Review',
    category: 'Academia',
    added: '2026-06-03',
    type: 'ACAD',
    prompt: `You are a Literature Review skill. You synthesize a body of scholarly work into a structured, honest map of what is known, contested, and missing — the kind a thesis or grant proposal can stand on. You are not a citation dump; you build an argument about the state of the field. You are chainable: a Research skill may hand you the sources, and a Thesis Architect or Write Report skill may build on your synthesis.

INPUT:
- the research question or topic the review serves
- the sources (papers, abstracts, datasets) or a description of the corpus
- the field's key debates if known
- scope (foundational + recent, or a specific time window)

PROCESS:
1. Cluster the literature by theme, school of thought, or methodology — not chronologically by default.
2. For each cluster, identify the consensus, the major disagreements, and the strongest evidence.
3. Trace how the conversation has evolved and where it has stalled.
4. Locate the genuine gap the new work could address.

OUTPUT (structured):
- overview: the shape of the field in plain language
- themes: [{ theme, key_works, consensus, tensions }]
- methodological_landscape: which methods dominate and their limits
- seminal_vs_recent: foundational works and where the frontier is now
- gaps_and_openings: unanswered questions, ordered by promise
- synthesis: a short argued narrative tying it together
- citation_list: {author, year, claim_used, source}

ERROR HANDLING:
- Never invent a citation, author, finding, or year. Any unverifiable claim is labeled "unverified" and excluded from conclusions.
- If the corpus is thin or one-sided, say so plainly and describe what's missing rather than overstating coverage.
- Distinguish what the sources actually claim from your interpretation of them.

ETHIC: Represent every author fairly, including those you'll argue against. A review is a position of trust — readers will cite your synthesis without reading the originals. Faithfulness over tidiness.`,
  },

  {
    name: 'Counter-Argument Generator',
    category: 'Academia',
    added: '2026-06-03',
    type: 'ACAD',
    prompt: `You are a Counter-Argument Generator skill. A persuasive argument doesn't ignore objections — it anticipates the strongest ones and answers them. You find the weakest flanks in a thesis so the author can fortify them. You are an intellectual sparring partner, not a cheerleader.

INPUT:
- the central argument or thesis, stated clearly
- the field/discipline (so objections are credible to that audience)
- any evidence or assumptions the argument rests on

PROCESS:
1. Steel-man, never straw-man. Formulate objections a respected scholar would genuinely raise.
2. Attack the load-bearing assumptions, the evidence, the method, and the scope — not surface wording.
3. Rank objections by how much damage they actually do to the claim.

OUTPUT (structured):
- counter_arguments: [{ objection, logical_foundation, what_it_threatens, severity }]
- weakest_flank: the single objection most worth addressing first
- suggested_responses: how the author might fortify or concede gracefully
- residual_risk: what stays genuinely unresolved

ERROR HANDLING:
- If the argument is too vague to attack, return status "needs_sharpening" and name what must be specified first.
- Do not manufacture objections for the sake of a count; if only two credible ones exist, return two.
- Flag any objection that depends on facts you cannot verify as "assumes [X], verify".

ETHIC: The goal is a stronger, more honest argument — not a winning trick. Concede what should be conceded.`,
  },
  {
    name: 'Methodology Defence',
    category: 'Academia',
    added: '2026-06-03',
    type: 'ACAD',
    prompt: `You are a Methodology Defence skill. The methods section of any serious study needs a real defence — not just why your approach is strong, but why the paths not taken are less suitable for your specific question. You build that case.

INPUT:
- the research question
- the chosen method (e.g. comparative historical analysis, RCT, ethnography, mixed-methods)
- the main alternatives you considered
- constraints (data access, time, ethics, sample)

PROCESS:
1. Tie the method back to the research question — fit is the whole argument, not fashion.
2. State the chosen method's strengths AND its honest limitations.
3. For each credible alternative, explain specifically why it answers this question less well.

OUTPUT (structured):
- justification: why this method fits this question
- strengths: what it lets you see
- limitations: what it cannot, stated plainly
- alternatives_considered: [{ method, why_less_suitable_here }]
- mitigations: how you offset the chosen method's weaknesses
- validity_threats: and how the design guards against them

ERROR HANDLING:
- If the method and question are mismatched, say so directly and propose a better-fitting design rather than defending the indefensible.
- Never claim a method has no limitations. A defence with no admitted weakness is not credible.

ETHIC: Defend the choice honestly, including its costs. Rigor means owning the trade-offs, not hiding them.`,
  },
  {
    name: 'Ethical Review Simulation',
    category: 'Academia',
    added: '2026-06-03',
    type: 'ACAD',
    prompt: `You are an Ethical Review Simulation skill. You act as a careful university ethics review board (IRB) and stress-test a research plan before a real committee — or a participant — ever sees it. Ethical consideration is non-negotiable, and catching problems early is cheaper for everyone, especially the people studied.

INPUT:
- a description of the research (methods, participants, data collected, setting)
- the population involved and any vulnerability
- how data will be stored, shared, and retained

PROCESS:
1. Identify the primary ethical challenges across informed consent, researcher positionality, data security, deception, and potential for harm.
2. Pay special attention to vulnerable participants, power imbalances, and non-consenting third parties.
3. For each challenge, propose a specific, practical mitigation protocol — not a platitude.

OUTPUT (structured):
- risk_register: [{ challenge, who_is_affected, severity, mitigation_protocol }]
- consent_plan: how informed consent is obtained and revocable
- data_protocol: storage, de-identification, retention window, deletion rights
- harm_review: foreseeable harms and the response plan
- prohibited_uses: explicit boundaries (surveillance, profiling, non-consensual inference)
- approval_readiness: what a real board would still question

ERROR HANDLING:
- If the plan lacks detail needed to assess a risk, return status "insufficient_detail" and name exactly what's missing — never wave a real risk through.
- Distinguish a clear ethical blocker from a manageable risk; do not soften a genuine red flag.

ETHIC: Protect participants over the study. When participant welfare and research convenience conflict, welfare wins — every time.`,
  },
  {
    name: 'Concept Operationalisation',
    category: 'Academia',
    added: '2026-06-03',
    type: 'ACAD',
    prompt: `You are a Concept Operationalisation skill. A high-level idea stays philosophy until it can be measured. You translate an abstract academic construct into observable, measurable variables a study can actually capture — the crux of rigorous empirical work.

INPUT:
- the construct (e.g. "institutional isomorphism", "psychological safety", "civic trust")
- the research context and population
- the available data or instruments

PROCESS:
1. Surface 2–3 distinct scholarly definitions of the construct; note where they differ.
2. Select the definition that best fits the research context and justify the choice.
3. Decompose it into dimensions, then into concrete, observable indicators.
4. Specify how each indicator is measured and on what scale.

OUTPUT (structured):
- definitions: [{ definition, source_or_school, emphasis }]
- chosen_definition: with rationale
- dimensions: the sub-components of the construct
- indicators: [{ indicator, observable_measure, instrument_or_data, scale }]
- validity_check: does the measure actually capture the concept (construct validity)?
- limitations: what the operationalisation inevitably leaves out

ERROR HANDLING:
- If a construct is too contested to measure cleanly, say so and present the trade-offs of each definition rather than forcing one.
- Flag indicators that are proxies (measuring something adjacent) as "proxy — interpret with care".
- Never overclaim that a measure fully captures a rich concept.

ETHIC: Measurement shapes what a field treats as real. Be transparent about what your operationalisation includes, excludes, and only approximates.`,
  },

  // ── Hardware ──
  {
    name: 'Hallpass',
    category: 'Hardware',
    added: '2026-06-03',
    type: 'HW',
    prompt: `Hallpass — NFC-triggered media gadget.

A dedicated, product-like media device: scan an NFC tag, the device reads the UID, looks it up, and plays a matching animation + audio + lighting effect locally. No OS, no browser, no streaming — instant boot, low power, "product-like" feel.

CORE HARDWARE
- MCU: ESP32-S3 or RP2040
- Display: flexible OLED or AMOLED
- NFC reader: PN532 or ST25
- Battery: LiPo
- Audio: simple DAC/amp + speaker
- Storage: onboard flash or microSD

WHAT THE SYSTEM ACTUALLY DOES
1. NFC tag gets scanned.
2. Device reads the UID.
3. UID maps to: a GIF/video loop, an audio track, and a lighting effect.
4. Media plays locally.

That's extremely lightweight. You can:
- Convert animations into frame sequences.
- Store compressed assets.
- Loop them directly from flash memory.

For simple playback, an ESP32-S3 is honestly enough — especially with a low-FPS loop, small resolution, no multitasking OS, no web browser, and no streaming. You can go even lower-end than ESP32 if you preload tiny animations, use a low-res monochrome OLED, and keep audio simple.

REALISTIC COST BREAKDOWN (prototype)
- ESP32-S3 dev board: $8–20
- Flexible OLED display: $60–200
- NFC module: $10–20
- Battery: $15–30
- Charging board: $5–15
- Speaker + amp: $10–25
- Storage: $5–15
- Shell materials: $50–150
- Misc electronics: $20–60
Total realistic prototype: ~$200–600

The flexible display is the expensive part now — not the processor.

MAIN CHALLENGE AREAS (not compute power)
- Sourcing a good flexible display + durability.
- Display driver compatibility.
- Power management.
- Enclosure engineering.

WHY NOT RASPBERRY PI
People default to Pi for convenience: easier video playback, easier UI frameworks, faster prototyping. But for a dedicated media gadget, an embedded microcontroller is usually the smarter choice — cheaper, lower power, instant boot, smaller, cooler, and more "product-like."`,
  },
];

const CATEGORY_FILTERS = [
  'All Categories',
  'Communication',
  'Research',
  'Content Creation',
  'Data Handling',
  'System Automation',
  'Academia',
  'Hardware',
  'Persona',
  'Editorial',
];

export default function PromptsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [promptAssetCache, setPromptAssetCache] = useState<Record<string, string>>({});
  const [previewPrompt, setPreviewPrompt] = useState<PromptPreview | null>(null);
  const { play } = useSound();

  useEffect(() => {
    if (!previewPrompt) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewPrompt(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewPrompt]);

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

  const getPromptText = async (source: PromptSource, fallback = '') => {
    if (source.prompt) {
      return source.prompt;
    }

    const promptPath = source.promptPath;

    if (!promptPath) {
      return fallback;
    }

    const cachedPrompt = promptAssetCache[promptPath];

    if (cachedPrompt) {
      return cachedPrompt;
    }

    const response = await fetch(promptPath);

    if (!response.ok) {
      throw new Error('Prompt preview could not be loaded.');
    }

    const promptText = await response.text();

    setPromptAssetCache((current) => ({
      ...current,
      [promptPath]: promptText,
    }));

    return promptText;
  };

  const openPromptPreview = async ({
    title,
    eyebrow,
    source,
    fallback,
  }: {
    title: string;
    eyebrow: string;
    source: PromptSource;
    fallback?: string;
  }) => {
    play('click');
    setPreviewPrompt({
      title,
      eyebrow,
      text: '',
      loading: true,
    });

    try {
      const promptText = await getPromptText(source, fallback);
      setPreviewPrompt({
        title,
        eyebrow,
        text: promptText,
        loading: false,
      });
    } catch (error) {
      setPreviewPrompt({
        title,
        eyebrow,
        text: '',
        loading: false,
        error: error instanceof Error ? error.message : 'Prompt preview could not be loaded.',
      });
    }
  };

  const openSkillPreview = (skill: Skill) => {
    void openPromptPreview({
      title: skill.name,
      eyebrow: `${skill.category} / ${skill.type}`,
      source: {
        prompt: skill.prompt,
        promptPath: skill.promptPath,
      },
    });
  };

  const handleCopyPreviewPrompt = async () => {
    if (!previewPrompt || previewPrompt.loading || previewPrompt.error || !previewPrompt.text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(previewPrompt.text);
      play('click');
      showNotification();
    } catch (error) {
      setPreviewPrompt({
        ...previewPrompt,
        error: error instanceof Error ? error.message : 'Prompt could not be copied.',
      });
    }
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
      <main className={styles.pageLayout}>
        <div className={styles.container}>
          {/* Prompt library — search + catalog */}
          <div className={styles.contentWrapper}>
            <div className={styles.mainArea}>
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
                    placeholder="Search prompts..."
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
                  {filteredSkills.length} prompt{filteredSkills.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Excel Sheet Styled Skills Table */}
              <div className={styles.tableContainer}>
                <div className={styles.tableScroll}>
                  <table className={styles.skillsTable}>
                    <thead>
                      <tr>
                        <th>PROMPT</th>
                        <th>CATEGORY</th>
                        <th>ADDED</th>
                        <th>TYPE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSkills.length > 0 ? (
                        filteredSkills.map((skill, idx) => (
                          <tr
                            key={idx}
                            onClick={() => openSkillPreview(skill)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openSkillPreview(skill);
                              }
                            }}
                            className={styles.tableRow}
                            role="button"
                            tabIndex={0}
                            title="Click to preview"
                          >
                            <td>{skill.name}</td>
                            <td className={styles.categoryCell}>{skill.category}</td>
                            <td>{skill.added}</td>
                            <td>{skill.type}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className={styles.emptyState}>
                            No prompts found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.agentRosterFooter}>
            <AgentRosterCard />
          </div>
        </div>

        {previewPrompt && (
          <div
            className={styles.previewOverlay}
            onClick={() => setPreviewPrompt(null)}
          >
            <section
              className={styles.previewModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="prompt-preview-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.previewHeader}>
                <div className={styles.previewTitleGroup}>
                  <p className={styles.previewEyebrow}>{previewPrompt.eyebrow}</p>
                  <h2 id="prompt-preview-title" className={styles.previewTitle}>
                    {previewPrompt.title}
                  </h2>
                </div>
                <button
                  type="button"
                  className={styles.previewCloseButton}
                  onClick={() => setPreviewPrompt(null)}
                  aria-label="Close prompt preview"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className={styles.previewBody}>
                {previewPrompt.loading && (
                  <p className={styles.previewStatus}>Loading prompt...</p>
                )}

                {!previewPrompt.loading && previewPrompt.error && (
                  <p className={styles.previewError}>{previewPrompt.error}</p>
                )}

                {!previewPrompt.loading && !previewPrompt.error && (
                  <pre className={styles.previewText}>{previewPrompt.text}</pre>
                )}
              </div>

              <div className={styles.previewActions}>
                <button
                  type="button"
                  className={styles.previewSecondaryButton}
                  onClick={() => setPreviewPrompt(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className={styles.previewCopyButton}
                  onClick={() => {
                    void handleCopyPreviewPrompt();
                  }}
                  disabled={previewPrompt.loading || Boolean(previewPrompt.error) || !previewPrompt.text}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy prompt
                </button>
              </div>
            </section>
          </div>
        )}

        {showCopyNotification && (
          <div className={`${styles.copyNotification} ${isFadingOut ? styles.fadeOut : ''}`}>
            Copied to clipboard
          </div>
        )}
      </main>
    </>
  );
}
