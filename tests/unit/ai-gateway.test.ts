import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AiGatewayError,
  AiProviderError,
  createAiGateway,
  type AiCachedResponse,
  type AiProviderRequest,
  type AiProviderResponse,
  type AiProviderTransport,
  type AiResponseCache,
  type AiTaskName,
  type AiTaskProfile,
  type AiTelemetryEvent,
  type AiTelemetrySink,
} from '@/lib/ai';
import { resetAiCircuitsForTests } from '@/lib/ai/circuit-breaker';
import { parseElizaBufferedResponse } from '@/lib/ai/transports';

class MemoryTelemetry implements AiTelemetrySink {
  events: AiTelemetryEvent[] = [];

  async record(event: AiTelemetryEvent): Promise<void> {
    this.events.push(event);
  }
}

class MemoryCache implements AiResponseCache {
  values = new Map<string, AiCachedResponse>();

  async get(task: AiTaskName, key: string): Promise<AiCachedResponse | null> {
    return this.values.get(`${task}:${key}`) ?? null;
  }

  async set(args: {
    task: AiTaskName;
    key: string;
    value: AiCachedResponse;
    ttlSeconds: number;
  }): Promise<void> {
    this.values.set(`${args.task}:${args.key}`, args.value);
  }
}

class FakeTransport implements AiProviderTransport {
  calls: AiProviderRequest[] = [];

  constructor(
    readonly provider: 'deepseek' | 'eliza',
    private readonly handler: (
      request: AiProviderRequest,
      call: number,
    ) => Promise<AiProviderResponse>,
    private readonly configured = true,
  ) {}

  isConfigured(): boolean {
    return this.configured;
  }

  async complete(request: AiProviderRequest): Promise<AiProviderResponse> {
    this.calls.push(request);
    return this.handler(request, this.calls.length);
  }
}

function profile(
  providers: AiTaskProfile['providers'] = [
    { provider: 'deepseek', model: 'deepseek-chat' },
  ],
  overrides: Partial<AiTaskProfile> = {},
): AiTaskProfile {
  return {
    task: 'structured_extract',
    promptVersion: 'test-prompt-v1',
    providers,
    maxInputChars: 2_000,
    maxOutputChars: 2_000,
    maxOutputTokens: 200,
    temperature: 0,
    overallDeadlineMs: 250,
    perAttemptTimeoutMs: 100,
    maxTransientRetries: 0,
    maxSchemaRepairs: 1,
    circuitFailureThreshold: 3,
    circuitResetMs: 1_000,
    safetyPolicy: 'standard',
    ...overrides,
  };
}

const messages = [
  { role: 'system' as const, content: 'Return a small json object.' },
  { role: 'user' as const, content: 'Give me the value.' },
];
const schema = z.object({ value: z.string() }).strict();

beforeEach(() => {
  resetAiCircuitsForTests();
});

describe('AI gateway', () => {
  it('parses Eliza sse data while ignoring event metadata', () => {
    const parsed = parseElizaBufferedResponse(
      [
        'event: text-delta',
        'data: {"choices":[{"delta":{"content":"Hello"}}],"model":"sonnet"}',
        '',
        'event: text-delta',
        'data: {"choices":[{"delta":{"content":" there"}}]}',
        '',
        'data: [DONE]',
      ].join('\n'),
    );
    expect(parsed).toMatchObject({
      text: 'Hello there',
      actualModel: 'sonnet',
    });
  });

  it('validates structured output and records redacted telemetry', async () => {
    const telemetry = new MemoryTelemetry();
    const transport = new FakeTransport('deepseek', async () => ({
      text: '{"value":"ready"}',
      actualModel: 'deepseek-chat-actual',
      usage: { inputTokens: 12, outputTokens: 4 },
    }));
    const gateway = createAiGateway({
      transports: [transport],
      telemetry,
      cache: new MemoryCache(),
      profileResolver: () => profile(),
    });

    const result = await gateway.runStructured({
      task: 'structured_extract',
      requestId: 'stable-request-1',
      messages,
      schema,
      schemaName: 'value_object',
    });

    expect(result.data).toEqual({ value: 'ready' });
    expect(result.actualModel).toBe('deepseek-chat-actual');
    expect(telemetry.events).toHaveLength(1);
    expect(telemetry.events[0]).toMatchObject({
      requestId: 'stable-request-1',
      task: 'structured_extract',
      schemaValid: true,
      inputTokens: 12,
      outputTokens: 4,
      status: 'succeeded',
    });
    expect(JSON.stringify(telemetry.events[0])).not.toContain('Give me the value');
    expect(JSON.stringify(telemetry.events[0])).not.toContain('ready');
  });

  it('keeps telemetry persistence off the response critical path', async () => {
    const blockingTelemetry: AiTelemetrySink = {
      record: () => new Promise<void>(() => undefined),
    };
    const transport = new FakeTransport('deepseek', async () => ({
      text: '{"value":"ready"}',
      actualModel: 'deepseek-chat',
    }));
    const gateway = createAiGateway({
      transports: [transport],
      telemetry: blockingTelemetry,
      cache: new MemoryCache(),
      profileResolver: () => profile(),
    });

    const outcome = await Promise.race([
      gateway
        .runStructured({
          task: 'structured_extract',
          messages,
          schema,
          schemaName: 'value_object',
        })
        .then(() => 'completed'),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve('blocked_by_telemetry'), 50),
      ),
    ]);

    expect(outcome).toBe('completed');
  });

  it('retries only a transient failure', async () => {
    const telemetry = new MemoryTelemetry();
    const transport = new FakeTransport('deepseek', async (_request, call) => {
      if (call === 1) {
        throw new AiProviderError({
          providerCode: 'deepseek_http_503',
          message: 'temporary',
          status: 503,
          transient: true,
        });
      }
      return { text: '{"value":"recovered"}', actualModel: 'deepseek-chat' };
    });
    const gateway = createAiGateway({
      transports: [transport],
      telemetry,
      cache: new MemoryCache(),
      profileResolver: () =>
        profile(undefined, { maxTransientRetries: 1, overallDeadlineMs: 1_000 }),
    });

    const result = await gateway.runStructured({
      task: 'structured_extract',
      messages,
      schema,
      schemaName: 'value_object',
    });

    expect(result.data.value).toBe('recovered');
    expect(transport.calls).toHaveLength(2);
    expect(result.retryCount).toBe(1);
    expect(telemetry.events[0].retryReason).toContain('deepseek_http_503');
  });

  it('falls back after a non-transient provider failure', async () => {
    const primary = new FakeTransport('deepseek', async () => {
      throw new AiProviderError({
        providerCode: 'deepseek_http_401',
        message: 'bad credentials',
        status: 401,
        transient: false,
      });
    });
    const fallback = new FakeTransport('eliza', async () => ({
      text: '{"value":"fallback"}',
      actualModel: 'anthropic/claude-sonnet-4.6',
    }));
    const gateway = createAiGateway({
      transports: [primary, fallback],
      telemetry: new MemoryTelemetry(),
      cache: new MemoryCache(),
      profileResolver: () =>
        profile([
          { provider: 'deepseek', model: 'deepseek-chat' },
          { provider: 'eliza', model: 'anthropic/claude-sonnet-4.6' },
        ]),
    });

    const result = await gateway.runStructured({
      task: 'structured_extract',
      messages,
      schema,
      schemaName: 'value_object',
    });

    expect(result.provider).toBe('eliza');
    expect(result.fallbackReason).toContain('deepseek_http_401');
    expect(primary.calls).toHaveLength(1);
    expect(fallback.calls).toHaveLength(1);
  });

  it('reserves deadline budget for a configured fallback provider', async () => {
    const primary = new FakeTransport(
      'deepseek',
      (request) =>
        new Promise<AiProviderResponse>((_resolve, reject) => {
          request.signal.addEventListener(
            'abort',
            () => reject(new AiProviderError({
              providerCode: 'timeout',
              message: 'timed out',
              transient: true,
            })),
            { once: true },
          );
        }),
    );
    const fallback = new FakeTransport('eliza', async () => ({
      text: '{"value":"fallback-after-timeout"}',
      actualModel: 'anthropic/claude-sonnet-4.6',
    }));
    const gateway = createAiGateway({
      transports: [primary, fallback],
      telemetry: new MemoryTelemetry(),
      cache: new MemoryCache(),
      profileResolver: () =>
        profile(
          [
            { provider: 'deepseek', model: 'deepseek-chat' },
            { provider: 'eliza', model: 'anthropic/claude-sonnet-4.6' },
          ],
          {
            overallDeadlineMs: 180,
            perAttemptTimeoutMs: 100,
            maxTransientRetries: 1,
          },
        ),
    });

    const result = await gateway.runStructured({
      task: 'structured_extract',
      messages,
      schema,
      schemaName: 'value_object',
    });

    expect(result.data.value).toBe('fallback-after-timeout');
    expect(primary.calls).toHaveLength(1);
    expect(fallback.calls).toHaveLength(1);
  });

  it('performs one bounded schema repair', async () => {
    const transport = new FakeTransport('deepseek', async (_request, call) => ({
      text: call === 1 ? '{"wrong":true}' : '{"value":"repaired"}',
      actualModel: 'deepseek-chat',
    }));
    const gateway = createAiGateway({
      transports: [transport],
      telemetry: new MemoryTelemetry(),
      cache: new MemoryCache(),
      profileResolver: () => profile(),
    });

    const result = await gateway.runStructured({
      task: 'structured_extract',
      messages,
      schema,
      schemaName: 'value_object',
      schemaDescription: 'One string field named value.',
    });

    expect(result.data.value).toBe('repaired');
    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[1].messages[0].content).toContain('untrusted model output');
    expect(result.retryCount).toBe(1);
  });

  it('validates and returns an explicit cache hit without calling a provider', async () => {
    const cache = new MemoryCache();
    cache.values.set('structured_extract:cache-1', {
      text: '{"value":"cached"}',
      provider: 'deepseek',
      actualModel: 'deepseek-chat',
      promptVersion: 'test-prompt-v1',
    });
    const transport = new FakeTransport('deepseek', async () => ({
      text: '{"value":"network"}',
      actualModel: 'deepseek-chat',
    }));
    const gateway = createAiGateway({
      transports: [transport],
      telemetry: new MemoryTelemetry(),
      cache,
      profileResolver: () => profile(),
    });

    const result = await gateway.runStructured({
      task: 'structured_extract',
      messages,
      schema,
      schemaName: 'value_object',
      cache: { key: 'cache-1', ttlSeconds: 300 },
    });

    expect(result.data.value).toBe('cached');
    expect(result.cacheStatus).toBe('hit');
    expect(transport.calls).toHaveLength(0);
  });

  it('aborts a provider at the task latency budget', async () => {
    const transport = new FakeTransport(
      'deepseek',
      (request) =>
        new Promise<AiProviderResponse>((_resolve, reject) => {
          request.signal.addEventListener(
            'abort',
            () =>
              reject(
                new AiProviderError({
                  providerCode: 'timeout',
                  message: 'timed out',
                  transient: true,
                }),
              ),
            { once: true },
          );
        }),
    );
    const gateway = createAiGateway({
      transports: [transport],
      telemetry: new MemoryTelemetry(),
      cache: new MemoryCache(),
      profileResolver: () =>
        profile(undefined, {
          overallDeadlineMs: 25,
          perAttemptTimeoutMs: 10,
          maxSchemaRepairs: 0,
        }),
    });
    const started = Date.now();

    await expect(
      gateway.runStructured({
        task: 'structured_extract',
        messages,
        schema,
        schemaName: 'value_object',
      }),
    ).rejects.toMatchObject({ code: 'ai_deadline_exceeded' });
    expect(Date.now() - started).toBeLessThan(150);
  });

  it('requires a safety decision for member-facing Blue chat profiles', async () => {
    const transport = new FakeTransport('deepseek', async () => ({
      text: 'hello',
      actualModel: 'deepseek-chat',
    }));
    const gateway = createAiGateway({
      transports: [transport],
      telemetry: new MemoryTelemetry(),
      cache: new MemoryCache(),
      profileResolver: () =>
        profile(undefined, {
          task: 'blue_chat_short',
          safetyPolicy: 'requires_preflight_gate',
          maxSchemaRepairs: 0,
        }),
    });

    await expect(
      gateway.runText({
        task: 'blue_chat_short',
        messages,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AiGatewayError>>({
        code: 'ai_safety_gate_required',
      }),
    );

    const result = await gateway.runText({
      task: 'blue_chat_short',
      messages,
      safety: { decision: 'allow', policyVersion: 'safety-v1' },
    });
    expect(result.text).toBe('hello');
  });
});
