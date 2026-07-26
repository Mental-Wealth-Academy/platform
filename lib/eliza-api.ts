/**
 * Eliza Cloud API client.
 *
 * The production gateway requires stream mode. This client normalizes its SSE
 * and data-stream variants into plain text chunks while enforcing a deadline,
 * one bounded transient retry, and a small process-local circuit breaker.
 */

interface ElizaChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ElizaChatRequest {
  messages: ElizaChatMessage[];
  id?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface ElizaChatStream {
  stream: ReadableStream<string>;
  provider: 'eliza';
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 60_000;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 30_000;
const TRANSIENT_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function boundedTimeout(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.max(2_000, Math.min(MAX_TIMEOUT_MS, Number(value)));
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

class ElizaAPIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | null;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor() {
    let baseUrl = process.env.ELIZA_API_BASE_URL || 'http://localhost:3001';
    baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    this.baseUrl = baseUrl;
    this.apiKey = process.env.ELIZA_API_KEY || null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  private recordSuccess() {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  private recordFailure() {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
    }
  }

  private createAbortContext(signal: AbortSignal | undefined, timeoutMs: number) {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abortFromCaller, { once: true });
    const timer = setTimeout(
      () => controller.abort(new DOMException('Provider deadline exceeded', 'TimeoutError')),
      timeoutMs,
    );

    return {
      controller,
      cleanup: () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abortFromCaller);
      },
    };
  }

  private async openCompletion(request: ElizaChatRequest) {
    if (Date.now() < this.circuitOpenUntil) {
      throw new Error('Eliza provider circuit is temporarily open');
    }

    const url = `${this.baseUrl}/api/v1/chat/completions`;
    const model = request.id
      || process.env.ELIZA_CHAT_MODEL
      || 'anthropic/claude-sonnet-4.6';
    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
      stream: true,
    };
    if (typeof request.maxTokens === 'number') {
      body.max_tokens = Math.max(1, Math.floor(request.maxTokens));
    }
    if (typeof request.temperature === 'number') {
      body.temperature = Math.max(0, Math.min(2, request.temperature));
    }

    const timeoutMs = boundedTimeout(request.timeoutMs);
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const abortContext = this.createAbortContext(request.signal, timeoutMs);
      const startedAt = Date.now();
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: abortContext.controller.signal,
        });

        if (!response.ok) {
          // Consume the body so the connection can be reused. Provider text is
          // deliberately excluded from logs and thrown errors.
          await response.text().catch(() => '');
          abortContext.cleanup();

          const retryable = TRANSIENT_STATUSES.has(response.status);
          console.warn('[Eliza] completion rejected', {
            status: response.status,
            model,
            attempt: attempt + 1,
            elapsedMs: Date.now() - startedAt,
            retryable,
          });

          lastError = new Error(
            response.status === 401 || response.status === 403
              ? 'Eliza authentication failed'
              : `Eliza request failed with status ${response.status}`,
          );
          if (retryable && attempt === 0 && !request.signal?.aborted) {
            await delay(180 + Math.floor(Math.random() * 120), request.signal);
            continue;
          }
          break;
        }

        if (!response.body) {
          abortContext.cleanup();
          lastError = new Error('Eliza returned an empty response body');
          break;
        }

        console.info('[Eliza] completion connected', {
          status: response.status,
          model,
          attempt: attempt + 1,
          elapsedMs: Date.now() - startedAt,
        });
        this.recordSuccess();
        return {
          response,
          cleanup: abortContext.cleanup,
          abort: () => abortContext.controller.abort(),
        };
      } catch (error: unknown) {
        abortContext.cleanup();
        lastError = error;
        if (request.signal?.aborted) throw error;
        if (attempt === 0) {
          await delay(180 + Math.floor(Math.random() * 120), request.signal);
          continue;
        }
      }
    }

    this.recordFailure();
    const name = lastError instanceof Error ? lastError.name : 'ProviderError';
    console.error('[Eliza] completion unavailable', { model, errorType: name });
    throw new Error(
      name === 'AbortError' || name === 'TimeoutError'
        ? 'Eliza request timed out'
        : 'Eliza provider is unavailable',
    );
  }

  async chatStream(request: ElizaChatRequest): Promise<ElizaChatStream> {
    const opened = await this.openCompletion(request);
    const source = opened.response.body!;
    const decoder = new TextDecoder();
    let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    const stream = new ReadableStream<string>({
      start: async (controller) => {
        upstreamReader = source.getReader();
        let buffer = '';
        let emitted = false;

        const emitPayload = (rawLine: string) => {
          const line = rawLine.trim();
          if (!line || line === '[DONE]' || line.startsWith(':') || line.startsWith('event:')) {
            return;
          }
          const payload = line.startsWith('data:')
            ? line.slice(5).trimStart()
            : line;
          if (!payload || payload === '[DONE]') return;
          const text = this.parseStreamPayload(payload);
          if (text) {
            emitted = true;
            controller.enqueue(text);
          }
        };

        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let newlineIndex = buffer.indexOf('\n');
            while (newlineIndex >= 0) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              emitPayload(line);
              newlineIndex = buffer.indexOf('\n');
            }
          }

          buffer += decoder.decode();
          if (buffer.trim()) emitPayload(buffer);
          if (!emitted) throw new Error('Eliza returned no assistant text');
          controller.close();
        } catch {
          this.recordFailure();
          controller.error(new Error('Eliza response stream failed'));
        } finally {
          opened.cleanup();
          upstreamReader?.releaseLock();
          upstreamReader = null;
        }
      },
      cancel: async () => {
        opened.abort();
        await upstreamReader?.cancel().catch(() => undefined);
        opened.cleanup();
      },
    });

    return { stream, provider: 'eliza' };
  }

  async chat(request: ElizaChatRequest): Promise<string> {
    const { stream } = await this.chatStream(request);
    const reader = stream.getReader();
    let fullText = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += value;
      }
    } finally {
      reader.releaseLock();
    }
    if (!fullText.trim()) throw new Error('Eliza returned no assistant text');
    return fullText;
  }

  private parseStreamPayload(payload: string): string {
    const dataStreamMatch = payload.match(/^([0-9a-f]):([\s\S]*)$/);
    if (dataStreamMatch) {
      const [, streamType, streamValue] = dataStreamMatch;
      if (streamType !== '0') return '';
      try {
        const text = JSON.parse(streamValue);
        return typeof text === 'string' ? text : '';
      } catch {
        return streamValue;
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return payload;
    }
    return this.extractTextFromEvent(parsed);
  }

  private extractTextFromEvent(event: unknown): string {
    if (typeof event === 'string') return event;
    if (!event || typeof event !== 'object') return '';
    if (Array.isArray(event)) {
      return event.map((item) => this.extractTextFromEvent(item)).join('');
    }

    const data = event as Record<string, any>;
    if (data.error) throw new Error('Eliza stream reported an error');
    if (typeof data.textDelta === 'string') return data.textDelta;
    if (typeof data.delta === 'string') return data.delta;
    if (typeof data.text === 'string') return data.text;
    if (typeof data.content === 'string') return data.content;
    if (typeof data.response === 'string') return data.response;
    if (typeof data.result === 'string') return data.result;
    if (typeof data.generated_text === 'string') return data.generated_text;
    if (typeof data.output_text === 'string') return data.output_text;
    if (typeof data.message?.content === 'string') return data.message.content;
    if (typeof data.message?.text === 'string') return data.message.text;
    if (typeof data.completion === 'string') return data.completion;
    if (Array.isArray(data.choices) && data.choices.length > 0) {
      const choice = data.choices[0];
      if (typeof choice?.delta?.content === 'string') return choice.delta.content;
      if (typeof choice?.message?.content === 'string') return choice.message.content;
      if (typeof choice?.text === 'string') return choice.text;
    }
    if (Array.isArray(data.output) && data.output.length > 0) {
      const first = data.output[0];
      if (typeof first?.content === 'string') return first.content;
      if (typeof first?.text === 'string') return first.text;
      if (typeof first?.delta === 'string') return first.delta;
    }
    return '';
  }
}

export const elizaAPI = new ElizaAPIClient();

export type {
  ElizaChatMessage,
  ElizaChatRequest,
  ElizaChatStream,
};
