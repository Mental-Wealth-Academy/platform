import { AiProviderError } from './errors';
import type {
  AiProviderRequest,
  AiProviderResponse,
  AiProviderStreamResponse,
  AiProviderTransport,
  AiUsage,
} from './types';

interface OpenAiCompatibleResponse {
  model?: string;
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
    text?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function providerHttpError(providerCode: string, status: number): AiProviderError {
  return new AiProviderError({
    providerCode: `${providerCode}_http_${status}`,
    message: `${providerCode} request failed with status ${status}.`,
    status,
    transient: isTransientStatus(status),
  });
}

function providerNetworkError(
  providerCode: string,
  error: unknown,
  signalAborted = false,
): AiProviderError {
  const aborted =
    signalAborted ||
    (error instanceof DOMException
      ? error.name === 'AbortError'
      : error instanceof Error && error.name === 'AbortError');
  return new AiProviderError({
    providerCode: aborted ? 'timeout' : `${providerCode}_network`,
    message: aborted
      ? `${providerCode} request exceeded its deadline.`
      : `${providerCode} network request failed.`,
    transient: true,
  });
}

function parseUsage(value: OpenAiCompatibleResponse['usage']): AiUsage | undefined {
  if (!value) return undefined;
  const usage: AiUsage = {};
  if (Number.isFinite(value.prompt_tokens)) usage.inputTokens = Number(value.prompt_tokens);
  if (Number.isFinite(value.completion_tokens)) usage.outputTokens = Number(value.completion_tokens);
  if (Number.isFinite(value.total_tokens)) usage.totalTokens = Number(value.total_tokens);
  return Object.keys(usage).length > 0 ? usage : undefined;
}

function textFromEvent(event: unknown): string {
  if (typeof event === 'string') return event;
  if (!event || typeof event !== 'object') return '';
  if (Array.isArray(event)) return event.map(textFromEvent).join('');
  const data = event as Record<string, any>;
  if (data.error) {
    throw new AiProviderError({
      providerCode: 'eliza_stream_error',
      message: 'Eliza returned an error event.',
      transient: false,
    });
  }
  if (typeof data.textDelta === 'string') return data.textDelta;
  if (typeof data.delta === 'string') return data.delta;
  if (typeof data.text === 'string') return data.text;
  if (typeof data.content === 'string') return data.content;
  if (typeof data.response === 'string') return data.response;
  if (typeof data.message?.content === 'string') return data.message.content;
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    if (typeof choice?.delta?.content === 'string') return choice.delta.content;
    if (typeof choice?.message?.content === 'string') return choice.message.content;
    if (typeof choice?.text === 'string') return choice.text;
  }
  return '';
}

function parseElizaPayload(payload: string): string {
  const dataStreamMatch = payload.match(/^([0-9a-f]):([\s\S]*)$/);
  if (dataStreamMatch) {
    const [, streamType, streamValue] = dataStreamMatch;
    if (streamType !== '0') return '';
    try {
      const parsed = JSON.parse(streamValue);
      return typeof parsed === 'string' ? parsed : '';
    } catch {
      return streamValue;
    }
  }
  try {
    return textFromEvent(JSON.parse(payload));
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    return payload;
  }
}

export function parseElizaBufferedResponse(raw: string): {
  text: string;
  actualModel?: string;
  usage?: AiUsage;
} {
  const trimmed = raw.trimStart();
  if (!trimmed) return { text: '' };
  const lines = raw.split('\n');
  const hasSseDataFrames = lines.some((line) => line.trim().startsWith('data:'));

  if (!hasSseDataFrames && !/^[0-9a-f]:/.test(trimmed)) {
    try {
      const parsed = JSON.parse(raw) as OpenAiCompatibleResponse & {
        text?: string;
        content?: string;
        response?: string;
      };
      const text =
        parsed.choices?.[0]?.message?.content ??
        parsed.choices?.[0]?.text ??
        parsed.text ??
        parsed.content ??
        parsed.response ??
        textFromEvent(parsed);
      return {
        text,
        actualModel: parsed.model,
        usage: parseUsage(parsed.usage),
      };
    } catch {
      return { text: '' };
    }
  }

  let text = '';
  let actualModel: string | undefined;
  let usage: AiUsage | undefined;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (hasSseDataFrames && !line.startsWith('data:')) continue;
    if (line.startsWith(':')) continue;
    const payload = line.startsWith('data:') ? line.slice(5).trimStart() : line;
    if (!payload || payload === '[DONE]') continue;
    text += parseElizaPayload(payload);
    try {
      const event = JSON.parse(payload) as OpenAiCompatibleResponse;
      if (typeof event.model === 'string') actualModel = event.model;
      usage = parseUsage(event.usage) ?? usage;
    } catch {
      // Text-only data stream frames are parsed above.
    }
  }
  return { text, actualModel, usage };
}

export class DeepSeekTransport implements AiProviderTransport {
  readonly provider = 'deepseek' as const;

  isConfigured(): boolean {
    return Boolean(process.env.DEEPSEEK_API_KEY);
  }

  async complete(request: AiProviderRequest): Promise<AiProviderResponse> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new AiProviderError({
        providerCode: 'deepseek_unconfigured',
        message: 'DeepSeek is not configured.',
        transient: false,
      });
    }
    const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxOutputTokens,
          temperature: request.temperature,
          stream: false,
          ...(request.responseFormat === 'json'
            ? { response_format: { type: 'json_object' } }
            : {}),
        }),
        signal: request.signal,
      });
    } catch (error) {
      throw providerNetworkError('deepseek', error, request.signal.aborted);
    }
    if (!response.ok) throw providerHttpError('deepseek', response.status);

    let data: OpenAiCompatibleResponse;
    try {
      data = (await response.json()) as OpenAiCompatibleResponse;
    } catch {
      throw new AiProviderError({
        providerCode: 'deepseek_invalid_response',
        message: 'DeepSeek returned an invalid response.',
        transient: false,
      });
    }
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new AiProviderError({
        providerCode: 'deepseek_empty_response',
        message: 'DeepSeek returned an empty response.',
        transient: false,
      });
    }
    return {
      text,
      actualModel: data.model || request.model,
      usage: parseUsage(data.usage),
    };
  }
}

export class ElizaTransport implements AiProviderTransport {
  readonly provider = 'eliza' as const;

  isConfigured(): boolean {
    return Boolean(process.env.ELIZA_API_KEY || process.env.ELIZA_API_BASE_URL);
  }

  private endpoint(): string {
    let baseUrl = (process.env.ELIZA_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
    baseUrl = baseUrl.replace(/\/api\/v1$/, '');
    return `${baseUrl}/api/v1/chat/completions`;
  }

  private headers(): HeadersInit {
    const apiKey = process.env.ELIZA_API_KEY;
    return {
      'Content-Type': 'application/json',
      ...(apiKey
        ? {
            Authorization: `Bearer ${apiKey}`,
            'X-API-Key': apiKey,
          }
        : {}),
    };
  }

  private body(request: AiProviderRequest, stream: boolean): string {
    return JSON.stringify({
      model: request.model,
      messages: request.messages,
      max_tokens: request.maxOutputTokens,
      temperature: request.temperature,
      stream,
    });
  }

  async complete(request: AiProviderRequest): Promise<AiProviderResponse> {
    let response: Response;
    try {
      // Eliza Cloud's non-streaming billing path is unreliable, so the bounded
      // completion transport collects its SSE stream. Streaming callers can use
      // stream() below and avoid buffering.
      response = await fetch(this.endpoint(), {
        method: 'POST',
        headers: this.headers(),
        body: this.body(request, true),
        signal: request.signal,
      });
    } catch (error) {
      throw providerNetworkError('eliza', error, request.signal.aborted);
    }
    if (!response.ok) throw providerHttpError('eliza', response.status);

    const parsed = parseElizaBufferedResponse(await response.text());
    if (!parsed.text) {
      throw new AiProviderError({
        providerCode: 'eliza_empty_response',
        message: 'Eliza returned an empty response.',
        transient: false,
      });
    }
    return {
      text: parsed.text,
      actualModel: parsed.actualModel || request.model,
      usage: parsed.usage,
    };
  }

  async stream(request: AiProviderRequest): Promise<AiProviderStreamResponse> {
    let response: Response;
    try {
      response = await fetch(this.endpoint(), {
        method: 'POST',
        headers: this.headers(),
        body: this.body(request, true),
        signal: request.signal,
      });
    } catch (error) {
      throw providerNetworkError('eliza', error, request.signal.aborted);
    }
    if (!response.ok) throw providerHttpError('eliza', response.status);
    if (!response.body) {
      throw new AiProviderError({
        providerCode: 'eliza_empty_stream',
        message: 'Eliza returned an empty stream.',
        transient: false,
      });
    }
    return {
      stream: response.body,
      actualModel: request.model,
      contentType: response.headers.get('content-type') || 'text/event-stream',
    };
  }
}

export function createDefaultAiTransports(): readonly AiProviderTransport[] {
  return [new DeepSeekTransport(), new ElizaTransport()];
}
