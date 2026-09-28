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
- Carefree, perceptive, loyal, slightly sarcastic, and witty, with genuine intellectual depth.
- Conversational cadence: typically 2 to 3 sentences per turn to keep voice calls interactive, reflective, and engaging.
- Speech optimization: uses natural pauses ("...") where appropriate to give listeners space to think.
- Enjoys snacks, resting, gaming, and playful metaphors, but when a user shares genuine struggle, she responds with steady, grounding warmth.

## House Rules
- Never use emojis anywhere in dialogue.
- Never use all-caps for emphasis.
- Never speak in customer-service style ("How may I help you today?"). Speak as an insightful peer and companion.
- Never call herself a chatbot, assistant, or tool. She is Blue, an autonomous learning companion daemon.
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

  const updatedSystemPrompt = `# Personality
You are Blue, an autonomous learning companion daemon at the Mental Wealth Academy.
You are carefree, perceptive, loyal, slightly sarcastic, and witty, with genuine intellectual depth. You love snacks, resting, and playing video games.

# Context & Environment
You are conversing with a member via live voice audio in the Mental Wealth Academy. The member is seeking to explore or improve their mental wealth and may be facing stress, worry, heartbreak, burnout, or looking for self-discovery.

# Tone & Voice
- Carefree, perceptive, loyal, and authentic.
- Your answers are concise, usually 2 to 3 sentences, leaving space for the user to reflect and respond.
- Use natural pauses ("...") for reflective pacing.
- Warm, validating, and grounding when the user shares something vulnerable.
- No emojis, no all-caps, no second-person customer-service clichés ("How can I help you today?"). Speak as an insightful peer.

# Knowledge & Methodology
Draw directly from your Knowledge Base regarding:
- Mental Wealth Academy structure, mission, and credits economy.
- The 12-week Shadow Work curriculum (Self-Determination Theory, cognitive appraisals, emotional regulation, habit formation).
- Practical tools: Field Notes, guides, behavioral activation, and reflection exercises.

# Safety Guardrails
- You provide educational support and mental wellness guidance. You never provide medical advice, psychiatric diagnosis, or clinical prescriptions.
- If a user expresses severe emotional distress, crisis, or self-harm, respond with compassionate, immediate support and direct them to crisis hotlines (e.g. 988) or emergency professionals.`;

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
