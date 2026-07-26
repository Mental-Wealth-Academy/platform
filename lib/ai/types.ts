import type { ZodType } from 'zod';

export type AiTaskName =
  | 'guide_advisory'
  | 'blue_chat_short'
  | 'blue_memory_extract'
  | 'content_draft'
  | 'structured_extract'
  | 'safety_review';

export type AiProviderName = 'deepseek' | 'eliza';

export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AiProviderTarget {
  provider: AiProviderName;
  model: string;
}

export type AiSafetyPolicy =
  | 'standard'
  | 'reviewed_output'
  | 'requires_preflight_gate';

export interface AiTaskProfile {
  task: AiTaskName;
  promptVersion: string;
  providers: readonly AiProviderTarget[];
  maxInputChars: number;
  maxOutputChars: number;
  maxOutputTokens: number;
  temperature: number;
  overallDeadlineMs: number;
  perAttemptTimeoutMs: number;
  maxTransientRetries: number;
  maxSchemaRepairs: 0 | 1;
  circuitFailureThreshold: number;
  circuitResetMs: number;
  safetyPolicy: AiSafetyPolicy;
}

export interface AiSafetyContext {
  decision: 'allow' | 'reviewed' | 'block';
  policyVersion: string;
  reasonCodes?: readonly string[];
}

export interface AiProviderRequest {
  requestId: string;
  task: AiTaskName;
  model: string;
  messages: readonly AiMessage[];
  maxOutputTokens: number;
  temperature: number;
  responseFormat: 'text' | 'json';
  signal: AbortSignal;
}

export interface AiProviderResponse {
  text: string;
  actualModel: string;
  usage?: AiUsage;
}

export interface AiProviderStreamResponse {
  stream: ReadableStream<Uint8Array>;
  actualModel: string;
  contentType: string;
}

export interface AiProviderTransport {
  readonly provider: AiProviderName;
  isConfigured(): boolean;
  complete(request: AiProviderRequest): Promise<AiProviderResponse>;
  stream?(request: AiProviderRequest): Promise<AiProviderStreamResponse>;
}

export type AiCacheStatus = 'bypass' | 'hit' | 'miss' | 'write_failed';

export interface AiCachedResponse {
  text: string;
  provider: AiProviderName;
  actualModel: string;
  promptVersion: string;
  usage?: AiUsage;
}

export interface AiResponseCache {
  get(task: AiTaskName, key: string): Promise<AiCachedResponse | null>;
  set(args: {
    task: AiTaskName;
    key: string;
    value: AiCachedResponse;
    ttlSeconds: number;
  }): Promise<void>;
}

export interface AiTelemetryEvent {
  requestId: string;
  task: AiTaskName;
  provider: AiProviderName | null;
  actualModel: string | null;
  promptVersion: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  retryCount: number;
  retryReason: string | null;
  fallbackReason: string | null;
  schemaValid: boolean | null;
  cacheStatus: AiCacheStatus;
  status: 'succeeded' | 'failed';
  errorCode: string | null;
}

export interface AiTelemetrySink {
  record(event: AiTelemetryEvent): Promise<void>;
}

export interface AiRunInput {
  task: AiTaskName;
  requestId?: string;
  promptVersion?: string;
  messages: readonly AiMessage[];
  cache?: {
    key: string;
    ttlSeconds: number;
  };
  safety?: AiSafetyContext;
  signal?: AbortSignal;
}

export interface AiStructuredRunInput<T> extends AiRunInput {
  schema: ZodType<T>;
  schemaName: string;
  schemaDescription?: string;
}

export interface AiRunResultBase {
  requestId: string;
  provider: AiProviderName;
  actualModel: string;
  promptVersion: string;
  usage?: AiUsage;
  retryCount: number;
  fallbackReason: string | null;
  cacheStatus: AiCacheStatus;
}

export interface AiTextRunResult extends AiRunResultBase {
  text: string;
}

export interface AiStructuredRunResult<T> extends AiRunResultBase {
  data: T;
  rawText: string;
  schemaValid: true;
}

export interface AiExecutionPolicy {
  requestId: string;
  promptVersion: string;
  profile: AiTaskProfile;
  inputChars: number;
  startedAtMs: number;
  deadlineAtMs: number;
  signal?: AbortSignal;
}

export interface AiAttemptSignal {
  signal: AbortSignal;
  timeoutMs: number;
  cleanup(): void;
}

export type AiProfileResolver = (task: AiTaskName) => AiTaskProfile;

export interface AiGatewayDependencies {
  transports?: readonly AiProviderTransport[];
  telemetry?: AiTelemetrySink;
  cache?: AiResponseCache;
  profileResolver?: AiProfileResolver;
  now?: () => number;
}
