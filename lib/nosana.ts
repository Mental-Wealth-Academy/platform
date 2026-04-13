// Nosana GPU API — decentralized GPU compute marketplace on Solana
// Docs: https://learn.nosana.com
// API:  https://dashboard.k8s.prd.nos.ci/api

const NOSANA_API_BASE = 'https://dashboard.k8s.prd.nos.ci/api';

export type GpuTier = 'focus' | 'deep' | 'elite';

// Three GPU compute tiers — model specs verified from Nosana documentation
export const GPU_TIERS = {
  focus: {
    label: 'Focus',
    model: 'Llama 3.1 8B Instruct (AWQ)',
    gpu: 'RTX 4070',
    shardCost: 3000,
    market: 'EzuHhkrhmV98HWzREsgLenKj2iHdJgrKmzfL8psP8Aso',
    maxTokens: 1200,
    maxModelLen: 2176,
    vram: 12,
    modelPath:
      '/root/.cache/huggingface/hub/models--hugging-quants--Meta-Llama-3.1-8B-Instruct-AWQ-INT4/snapshots/db1f81ad4b8c7e39777509fac66c652eb0a52f91',
    s3Url:
      'https://models.nosana.io/hugging-face/llama3.1/8b/4x/models--hugging-quants--Meta-Llama-3.1-8B-Instruct-AWQ-INT4',
    s3Target:
      '/root/.cache/huggingface/hub/models--hugging-quants--Meta-Llama-3.1-8B-Instruct-AWQ-INT4',
  },
  deep: {
    label: 'Deep',
    model: 'Llama 3.1 8B',
    gpu: 'RTX 4090',
    shardCost: 8000,
    market: '97G9NnvBDQ2WpKu6fasoMsAKmfj63C9rhysJnkeWodAf',
    maxTokens: 1800,
    maxModelLen: 2176,
    vram: 18,
    modelPath:
      '/root/.cache/huggingface/hub/models--unsloth--Meta-Llama-3.1-8B/snapshots/069adfb3ab0ceba60b9af8f11fa51558b9f9d396',
    s3Url:
      'https://models.nosana.io/hugging-face/llama3.1/8b/models--unsloth--Meta-Llama-3.1-8B',
    s3Target:
      '/root/.cache/huggingface/hub/models--unsloth--Meta-Llama-3.1-8B',
  },
  elite: {
    label: 'Elite',
    model: 'Llama 3.1 70B Instruct (AWQ)',
    gpu: 'A100',
    shardCost: 20000,
    market: 'GLJHzqRN9fKGBsvsFzmGnaQGknUtLN1dqaFR8n3YdM22',
    maxTokens: 2500,
    maxModelLen: 2176,
    vram: 40,
    modelPath:
      '/root/.cache/huggingface/hub/models--hugging-quants--Meta-Llama-3.1-70B-Instruct-AWQ-INT4/snapshots/2123003760781134cfc31124aa6560a45b491fdf',
    s3Url:
      'https://models.nosana.io/hugging-face/llama3.1/70b/4x/models--hugging-quants--Meta-Llama-3.1-70B-Instruct-AWQ-INT4',
    s3Target:
      '/root/.cache/huggingface/hub/models--hugging-quants--Meta-Llama-3.1-70B-Instruct-AWQ-INT4',
  },
} as const;

function buildJobDefinition(tier: GpuTier) {
  const t = GPU_TIERS[tier];
  return {
    version: '0.1',
    type: 'container',
    meta: {
      trigger: 'api',
      system_resources: { required_vram: t.vram },
    },
    ops: [
      {
        type: 'container/run',
        id: 'research-llm',
        args: {
          image: 'docker.io/vllm/vllm-openai:v0.5.4',
          gpu: true,
          expose: 8000,
          cmd: [
            '--model', t.modelPath,
            '--served-model-name', 'llama3.1',
            '--quantization', 'awq',
            '--max-model-len', String(t.maxModelLen),
          ],
          resources: [
            { type: 'S3', url: t.s3Url, target: t.s3Target },
          ],
        },
      },
    ],
  };
}

const GPU_RESEARCH_SYSTEM =
  `You are a rigorous academic research synthesizer embedded in Mental Wealth Academy. Given a research topic and optional source material, produce a comprehensive, graduate-level synthesis. Use precise technical vocabulary. Reference theoretical frameworks, empirical findings, and conceptual models directly. Write in dense, information-rich prose. No bullet points. No markdown. No hedging.`;

function nosanaHeaders() {
  const key = process.env.NOSANA_API_KEY;
  if (!key) throw new Error('NOSANA_API_KEY not configured');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function extractEndpoint(data: Record<string, unknown>): string | null {
  const endpoints = data.endpoints;
  if (Array.isArray(endpoints) && endpoints.length > 0) return endpoints[0] as string;
  if (typeof endpoints === 'string' && endpoints) return endpoints;
  if (typeof data.url === 'string' && data.url) return data.url;
  if (typeof data.endpoint === 'string' && data.endpoint) return data.endpoint;
  return null;
}

export async function createResearchDeployment(userId: string, tier: GpuTier): Promise<string> {
  const t = GPU_TIERS[tier];
  const name = `mwa-${tier}-${userId.slice(0, 8)}-${Date.now()}`;

  const res = await fetch(`${NOSANA_API_BASE}/deployments/create`, {
    method: 'POST',
    headers: nosanaHeaders(),
    body: JSON.stringify({
      name,
      market: t.market,
      timeout: 30,
      replicas: 1,
      strategy: 'SIMPLE',
      job_definition: buildJobDefinition(tier),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nosana deployment failed: ${res.status} ${err}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const id = data.id as string | undefined;
  if (!id) throw new Error('Nosana response missing deployment ID');
  return id;
}

export async function getDeploymentState(deploymentId: string): Promise<{
  status: string;
  endpoint: string | null;
}> {
  const res = await fetch(`${NOSANA_API_BASE}/deployments/${deploymentId}`, {
    headers: nosanaHeaders(),
  });

  if (!res.ok) throw new Error(`Nosana status check failed: ${res.status}`);

  const data = await res.json() as Record<string, unknown>;
  return {
    status: (data.status as string) || 'unknown',
    endpoint: extractEndpoint(data),
  };
}

export async function stopDeployment(deploymentId: string): Promise<void> {
  try {
    await fetch(`${NOSANA_API_BASE}/deployments/${deploymentId}/stop`, {
      method: 'POST',
      headers: nosanaHeaders(),
    });
  } catch {
    // best-effort cleanup — do not block the caller
  }
}

export async function checkEndpointHealth(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function synthesizeOnGPU(
  endpoint: string,
  topic: string,
  tier: GpuTier,
  sourceContext?: string
): Promise<string> {
  const t = GPU_TIERS[tier];
  const userPrompt = sourceContext
    ? `Research topic: ${topic}\n\nSource material:\n${sourceContext}\n\nSynthesize the above into a comprehensive research report.`
    : `Research topic: ${topic}\n\nProvide a comprehensive, evidence-based synthesis drawing from academic and scientific literature.`;

  const res = await fetch(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1',
      messages: [
        { role: 'system', content: GPU_RESEARCH_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: t.maxTokens,
      temperature: 0.25,
    }),
    signal: AbortSignal.timeout(150_000),
  });

  if (!res.ok) throw new Error(`vLLM query failed: ${res.status}`);

  const data = await res.json() as Record<string, unknown>;
  const choices = data.choices as Array<{ message: { content: string } }> | undefined;
  const text = choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from GPU model');
  return text.trim();
}
