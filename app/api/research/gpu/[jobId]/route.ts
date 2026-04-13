import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import {
  getDeploymentState,
  checkEndpointHealth,
  synthesizeOnGPU,
  stopDeployment,
  type GpuTier,
} from '@/lib/nosana';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180; // 3 min — covers model health check + inference

const RUNNING_STATUSES = new Set(['RUNNING', 'running', 'ACTIVE', 'active']);

interface JobRow {
  id: string;
  user_id: string;
  tier: string;
  topic: string;
  status: string;
  endpoint: string | null;
  result: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { jobId } = params;
  const url = new URL(request.url);
  const topic = url.searchParams.get('topic') || '';

  const rows = await sqlQuery<JobRow[]>(
    'SELECT * FROM nosana_research_jobs WHERE id = :id AND user_id = :userId LIMIT 1',
    { id: jobId, userId: user.id }
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const job = rows[0];

  // Return cached result immediately
  if (job.status === 'completed' && job.result) {
    return NextResponse.json({ status: 'completed', result: job.result });
  }

  if (job.status === 'failed') {
    return NextResponse.json({ status: 'failed', error: 'GPU research failed' });
  }

  // Synthesis already underway — avoid duplicate inference calls
  if (job.status === 'synthesizing') {
    return NextResponse.json({ status: 'synthesizing' });
  }

  // Check Nosana deployment status
  let nosanaState: { status: string; endpoint: string | null };
  try {
    nosanaState = await getDeploymentState(jobId);
  } catch {
    return NextResponse.json({ status: 'provisioning' });
  }

  const isRunning = RUNNING_STATUSES.has(nosanaState.status);
  const endpoint = nosanaState.endpoint || job.endpoint;

  if (!isRunning || !endpoint) {
    if (nosanaState.endpoint && !job.endpoint) {
      await sqlQuery(
        'UPDATE nosana_research_jobs SET endpoint = :ep WHERE id = :id',
        { ep: nosanaState.endpoint, id: jobId }
      );
    }
    return NextResponse.json({ status: 'provisioning', nosanaStatus: nosanaState.status });
  }

  // GPU is running — check if vLLM model has finished loading
  const healthy = await checkEndpointHealth(endpoint);
  if (!healthy) {
    return NextResponse.json({ status: 'provisioning', detail: 'loading model' });
  }

  // Claim the synthesis slot — conditional update prevents duplicate inference
  const claimed = await sqlQuery<Array<{ id: string }>>(
    `UPDATE nosana_research_jobs
     SET status = 'synthesizing', endpoint = :ep, topic = :topic
     WHERE id = :id AND status NOT IN ('synthesizing', 'completed', 'failed')
     RETURNING id`,
    { ep: endpoint, topic: topic || job.topic, id: jobId }
  );

  if (!claimed.length) {
    return NextResponse.json({ status: 'synthesizing' });
  }

  const tier = (job.tier || 'deep') as GpuTier;

  let result: string;
  try {
    result = await synthesizeOnGPU(endpoint, topic || job.topic, tier);
  } catch (err) {
    await sqlQuery(
      `UPDATE nosana_research_jobs SET status = 'failed' WHERE id = :id`,
      { id: jobId }
    );
    void stopDeployment(jobId);
    const msg = err instanceof Error ? err.message : 'Inference failed';
    console.error('GPU synthesis error:', msg);
    return NextResponse.json({ status: 'failed', error: msg });
  }

  await sqlQuery(
    `UPDATE nosana_research_jobs
     SET status = 'completed', result = :result, completed_at = NOW()
     WHERE id = :id`,
    { result, id: jobId }
  );

  void stopDeployment(jobId);

  return NextResponse.json({ status: 'completed', result });
}
