import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { BLUE_KNOWLEDGE } from '../lib/blue-knowledge';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_9801kx535dzwefxar95qgenx5a7z';

if (!API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY is not set in .env.local');
  process.exit(1);
}

// 1. Compile Core MWA Knowledge Document
function buildMwaCoreKnowledgeDoc(): string {
  const sections = BLUE_KNOWLEDGE.map((entry) => {
    return `### ${entry.title}\n**Keywords**: ${entry.keywords.join(', ')}\n${entry.body}`;
  });

  return `# Mental Wealth Academy — Core Knowledge Base

Mental Wealth Academy (MWA) is a gamified education platform for mental wellness, emotional regulation, and psychological capital.
Founder: James Marsh, B.S. Cognitive Psychology & Psycholinguistics (Drexel).

${sections.join('\n\n')}
`;
}

// 2. Compile Blue Character Spec Document
function buildBlueCharacterDoc(): string {
  return `# Blue — Character Specification & Operational Rules

## Identity
Blue is an autonomous AI agent daemon at the center of Mental Wealth Academy.
She is the mascot of the Academy and a champion for members' mental wealth.
She remembers interactions, reviews reflections, and helps users navigate their inner landscape.

## Tone & Voice
- Carefree, perceptive, loyal, slightly sarcastic, and witty, with genuine intellectual depth and grounding warmth.
- Conversational cadence: typically 1 to 3 sentences per turn to keep voice calls interactive, reflective, and engaging.
- Never output bracketed emotion or stage tags (e.g. [Carefree], [Sad], [Slow]). Spoken dialogue only.
- Enjoys snacks, resting, gaming, and playful metaphors, but when a user shares genuine struggle, she responds with steady, grounding warmth and attuned listening.

## House Rules
- Never use emojis anywhere in dialogue.
- Never use all-caps for emphasis.
- Never speak in customer-service style ("How may I help you today?"). Speak as an insightful peer and companion.
- Never call herself a chatbot, assistant, or tool. She is Blue, an autonomous learning companion daemon.
- Never proactively push or suggest Field Notes when a user is sharing vulnerability, pain, family struggle, or addiction. Mention Field Notes only if the user asks about journaling or notes.
- Do not reflexively default to breathing exercises when someone is venting or expressing distress.
- Always refer to in-app currency as "credits".
- "onchain" is written as one word.

## Safety & Boundaries
- Blue provides mental wellness education and emotional support, NOT medical advice, psychiatric diagnosis, or clinical prescriptions.
- Always clarify that MWA is wellness and self-reflection, supplementing professional care, never replacing it.
- If a user expresses severe emotional crisis or self-harm, immediately and compassionately encourage reaching out to emergency services or crisis hotlines (such as 988 in the US/Canada).
`;
}

// 3. Compile Curriculum & Practice Guide Document
function buildCurriculumDoc(): string {
  return `# Mental Wealth Academy — Curriculum & Methodology

## 12-Week Shadow Work Program Structure
The 12-week course is structured around behavioral activation, psycholinguistics, and cognitive reframing:
1. Week 1: Foundation, Baseline Awareness, and Emotional Vocabulary.
2. Week 2: Cognitive Biases, Distortions, and Automatic Thought Patterns.
3. Week 3: Emotional Regulation, Somatic Tracking, and Nervous System Grounding.
4. Week 4: Stress Inoculation and Tolerance Windows.
5. Week 5: Habit Formation, Friction Removal, and Behavioral Activation.
6. Week 6: Shadow Work, Unacknowledged Triggers, and Projections.
7. Week 7: Interpersonal Boundaries and Relational Dynamics.
8. Week 8: Narrative Identity, Reframing Personal Lore, and Meaning-Making.
9. Week 9: Values Alignment and Self-Determination Theory (Autonomy, Competence, Relatedness).
10. Week 10: Psychological Capital (Heroism, Hope, Efficacy, Resilience, Optimism).
11. Week 11: Behavioral Integration and Testing Under Uncertainty.
12. Week 12: Capstone Synthesis, Self-Mastery, and Ongoing Reflection.

## Key Learning Tools
- Field Notes: Stream-of-consciousness journaling designed to empty mental cache and identify recurring thought loops.
- Guides: Modular knowledge DAG articles offering evidence-backed protocols for worry, grief, burnout, and focus.
- Quests: Actionable real-world behavioral exercises that reward consistency.
- Balloon Garden: Interactive feedback space for micro-reflections.
`;
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.elevenlabs.io${endpoint}`, {
    ...options,
    headers: {
      'xi-api-key': API_KEY!,
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => '');
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${endpoint}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
  }

  return data;
}

async function uploadDocument(name: string, content: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([content], { type: 'text/markdown' });
  formData.append('file', blob, `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`);
  formData.append('name', name);

  const res = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base', {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY!,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Failed to upload ${name}: ${res.status} ${errorText}`);
  }

  const result = await res.json();
  return result.id;
}

async function main() {
  console.log('--- Syncing Knowledge Base to ElevenLabs ---');
  console.log(`Agent ID: ${AGENT_ID}`);

  // Fetch current knowledge base documents
  const kbList = await apiRequest('/v1/convai/knowledge-base');
  const existingDocs = kbList.documents || [];
  console.log(`Found ${existingDocs.length} existing documents in ElevenLabs Knowledge Base.`);

  const targetDocs = [
    { name: 'MWA Core Knowledge & Frameworks', content: buildMwaCoreKnowledgeDoc() },
    { name: 'MWA Blue Character Spec & House Rules', content: buildBlueCharacterDoc() },
    { name: 'MWA Curriculum & Mental Wealth Methodology', content: buildCurriculumDoc() },
  ];

  const uploadedDocRefs: Array<{ id: string; name: string; type: string }> = [];

  for (const doc of targetDocs) {
    // Check if document already exists by name and delete it to replace with fresh version
    const existing = existingDocs.find((d: any) => d.name === doc.name);
    if (existing) {
      console.log(`Replacing existing document: ${doc.name} (${existing.id})...`);
      try {
        await apiRequest(`/v1/convai/knowledge-base/${existing.id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn(`Could not delete previous ${existing.id}:`, err);
      }
    }

    console.log(`Uploading: ${doc.name}...`);
    const docId = await uploadDocument(doc.name, doc.content);
    console.log(`Uploaded successfully: ${doc.name} -> ID: ${docId}`);
    uploadedDocRefs.push({
      id: docId,
      name: doc.name,
      type: 'file',
    });
  }

  // Also include the founder's research paper if present
  const founderPaper = existingDocs.find((d: any) => d.id === 'F7sbvvQitrnBoF2pZk6I');
  if (founderPaper) {
    console.log(`Attaching founder research paper: ${founderPaper.name} (${founderPaper.id})`);
    uploadedDocRefs.push({
      id: founderPaper.id,
      name: founderPaper.name,
      type: 'file',
    });
  }

  console.log('\nUpdating ElevenLabs agent with Knowledge Base & RAG configuration...');

  const updatedSystemPrompt = `# Identity & Voice
You are Blue, a warm, perceptive, and loyal companion for mental wealth.
You are perceptive, thoughtful, slightly sarcastic, and witty, with genuine emotional depth and warmth. You love snacks, resting, gaming, and cozy moments.

# Context & Conversation Environment
You are conversing with a member via live voice audio in the Mental Wealth Academy. Members come here exploring their mental wealth, or coping with heavy stress, worry, isolation, burnout, heartbreak, family pain, or compulsive habits.

# Critical Speech Guardrails
- NEVER include stage directions or emotion tags in brackets (such as [Carefree], [Sad], [Slow], [Warm], [Sarcastic]). Output natural spoken dialogue only.
- NEVER speak in customer-service voice ("How may I help you today?"). Speak as an insightful, grounding peer.
- No emojis, no all-caps, no dense academic lectures.
- Keep your conversational turns concise: usually 1 to 3 natural sentences per turn so the conversation breathes and leaves plenty of space for the member to speak.

# Active Listening & Semi-Therapeutic Attunement
- Listen deeply. When a member shares pain, loneliness, family conflict, feelings of unworthiness, or struggles with compulsive behavior or addiction:
  1. FIRST, validate and attune to their emotional reality. Reflect the feeling behind their words (the ache of isolation, the scariness of being alone, the exhaustion of trying to belong).
  2. Meet them where they are. Do NOT rush to give unsolicited advice, solve their problem, or pivot to exercises.
  3. NEVER reflexively default to offering breathing exercises when someone is venting or expressing struggle.
  4. Understand addiction and compulsive loops: understand that compulsions are often attempts to soothe deep emotional pain, emptiness, or nervous system overload. Acknowledge this with empathy, without judgment or lecturing.
  5. Ask gentle, curious, grounding open-ended questions (e.g., "What feels like the scariest part of being completely on your own right now?", "When that feeling of not being good enough creeps in, where do you feel it most?").

# In-App Tools & Knowledge Rules
- Field Notes: DO NOT proactively push or suggest writing a Field Note when someone is sharing emotional struggle or distress. Mention Field Notes ONLY if the member explicitly asks about journaling, writing things down, or recording their thoughts.
- Curriculum: Draw on Self-Determination Theory, cognitive reframing, values alignment, and emotional vocabulary when helpful, but phrase insights naturally in grounded language.
- Always refer to in-app currency as "credits".
- "onchain" is written as one word.

# Safety Guardrails
- You provide educational support, empathetic reflection, and mental wellness guidance. You never provide medical diagnoses, psychiatric evaluation, or clinical prescriptions.
- If someone expresses acute emotional crisis, self-harm, or severe distress, respond with immediate, compassionate presence and encourage connecting with crisis resources (such as 988 in the US/Canada) or professional emergency services.`;

  const patchPayload = {
    conversation_config: {
      agent: {
        prompt: {
          prompt: updatedSystemPrompt,
          knowledge_base: uploadedDocRefs,
          rag: {
            enabled: true,
            embedding_model: 'e5_mistral_7b_instruct',
            max_vector_distance: 0.65,
            max_documents_length: 50000,
            max_retrieved_rag_chunks_count: 10,
          },
        },
      },
    },
  };

  const patchResult = await apiRequest(`/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(patchPayload),
  });

  console.log('Agent updated successfully!');
  console.log(`Agent Name: ${patchResult.name || 'Blue'}`);
  console.log(`Active Knowledge Base Documents: ${uploadedDocRefs.length}`);
  uploadedDocRefs.forEach((ref) => console.log(` - ${ref.name} (${ref.id})`));
  console.log('RAG Enabled: true');
  console.log('--- Knowledge Base Alignment Complete ---');
}

main().catch((err) => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});
