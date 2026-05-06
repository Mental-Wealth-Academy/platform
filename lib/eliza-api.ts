/**
 * Eliza Cloud API Client
 * Handles communication with Eliza Cloud API for chat completions and TTS
 */

interface ElizaChatMessage {
  role: 'user' | 'assistant' | 'system';
  parts: Array<{
    type: 'text';
    text: string;
  }>;
}

interface ElizaChatRequest {
  messages: ElizaChatMessage[];
  id?: string; // Model ID (optional, defaults to gpt-4o)
}

interface ElizaChatResponse {
  choices?: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}


class ElizaAPIClient {
  private baseUrl: string;
  private apiKey: string | null;

  constructor() {
    // Default to localhost for development, can be overridden with env var
    let baseUrl = process.env.ELIZA_API_BASE_URL || 'http://localhost:3001';
    
    // Remove trailing slashes and /api/v1 if present (the path is added in the methods)
    baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    baseUrl = baseUrl.replace(/\/api\/v1$/, ''); // Remove /api/v1 if present
    
    this.baseUrl = baseUrl;
    this.apiKey = process.env.ELIZA_API_KEY || null;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-API-Key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Chat completion using Eliza API
   * Uses Vercel AI SDK format with role and parts
   * Handles streaming SSE responses from Eliza Cloud
   */
  async chat(request: ElizaChatRequest): Promise<string> {
    try {
      const url = `${this.baseUrl}/api/v1/chat`;
      console.log('Calling Eliza API:', { url, hasApiKey: !!this.apiKey, modelId: request.id || 'gpt-4o' });

      const body: Record<string, unknown> = { messages: request.messages };
      if (request.id) body.id = request.id;

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || response.statusText };
        }
        console.error('Eliza API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url,
          hasApiKey: !!this.apiKey,
        });

        // Provide specific error messages for common issues
        if (response.status === 401) {
          if (!this.apiKey) {
            throw new Error('Eliza API key is missing. Please set ELIZA_API_KEY in your environment variables.');
          } else {
            throw new Error('Eliza API key is invalid or expired. Please check your ELIZA_API_KEY configuration.');
          }
        }

        throw new Error(errorData.error?.message || errorData.message || `Eliza API error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      const preview = responseText.substring(0, 400);
      console.log('Eliza API raw response:', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        responseLength: responseText.length,
        responsePreview: preview,
      });

      const trimmed = responseText.trimStart();

      // SSE format: starts with "data:"
      if (trimmed.startsWith('data:')) {
        const fullText = this.parseSSEResponse(responseText);
        console.log('Parsed SSE response, length:', fullText.length);
        if (!fullText) {
          throw new Error(`Eliza API returned empty SSE response. Raw: ${preview}`);
        }
        return fullText;
      }

      // Vercel AI SDK Data Stream Protocol (no data: wrapper): starts with hex digit + colon
      if (/^[0-9a-f]:/.test(trimmed)) {
        const fullText = this.parseSSEResponse(responseText);
        console.log('Parsed data-stream response, length:', fullText.length);
        if (!fullText) {
          throw new Error(`Eliza API returned empty data-stream response. Raw: ${preview}`);
        }
        return fullText;
      }

      // JSON response
      let data: ElizaChatResponse;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Eliza API returned unrecognised format. Raw: ${preview}`);
      }

      if (data.error) {
        throw new Error(data.error.message || 'Eliza API returned an error');
      }

      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message?.content || '';
        if (!content) throw new Error(`Eliza API returned empty choices content. Raw: ${preview}`);
        return content;
      }

      const text = (data as any).text || (data as any).content || (data as any).response || '';
      if (text) return text;

      throw new Error(`No content found in Eliza API response. Raw: ${preview}`);
    } catch (error: any) {
      // Handle fetch errors specifically
      if (error.message?.includes('fetch') || error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        const connectionError = new Error(`Unable to connect to Eliza API at ${this.baseUrl}. Please ensure Eliza Cloud API is running or check your ELIZA_API_BASE_URL configuration.`);
        console.error('Eliza API connection error:', {
          message: connectionError.message,
          baseUrl: this.baseUrl,
          hasApiKey: !!this.apiKey,
          originalError: error.message,
        });
        throw connectionError;
      }

      console.error('Eliza API chat error:', {
        message: error.message,
        stack: error.stack,
        baseUrl: this.baseUrl,
        hasApiKey: !!this.apiKey,
        errorCode: error.code,
      });
      throw error;
    }
  }

  /**
   * Parse Server-Sent Events (SSE) streaming response from Eliza Cloud
   * Extracts text-delta events and concatenates them into full response
   */
  private parseSSEResponse(sseText: string): string {
    const lines = sseText.split('\n');
    let fullText = '';
    let sawEventPayload = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('data:')) {
        sawEventPayload = true;
        const payload = trimmed.slice(5).trimStart();
        if (payload === '[DONE]') continue;
        if (!payload) continue;
        fullText += this.parseSSEPayload(payload);
      }
    }

    if (!fullText && !sawEventPayload) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '[DONE]') continue;
        fullText += this.parseSSEPayload(trimmed);
      }
    }

    return fullText;
  }

  private parseSSEPayload(payload: string): string {
    // Vercel AI SDK Data Stream Protocol: 0:"text delta", e:{...}, d:{...}
    const dataStreamMatch = payload.match(/^([0-9a-f]):([\s\S]*)$/);
    if (dataStreamMatch) {
      const [, streamType, streamValue] = dataStreamMatch;
      if (streamType === '0') {
        try {
          const text = JSON.parse(streamValue);
          return typeof text === 'string' ? text : '';
        } catch {
          return streamValue;
        }
      }
      // Non-text stream parts (e, d, 2, 8, etc.) are metadata — skip
      return '';
    }

    try {
      const event = JSON.parse(payload);
      return this.extractTextFromEvent(event);
    } catch {
      return payload;
    }
  }

  private extractTextFromEvent(event: unknown): string {
    if (typeof event === 'string') return event;
    if (typeof event === 'number' || typeof event === 'boolean') return String(event);
    if (!event || typeof event !== 'object') return '';

    if (Array.isArray(event)) {
      return event.map((item) => this.extractTextFromEvent(item)).join('');
    }

    const data = event as Record<string, any>;

    // Surface API errors embedded in SSE events
    const errMsg = data.error?.message || (typeof data.error === 'string' ? data.error : null);
    if (errMsg) throw new Error(`Eliza API stream error: ${errMsg}`);

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
    for (const key of ['content', 'text', 'delta', 'response', 'result', 'message', 'output']) {
      const value = data[key];
      const extracted = this.extractTextFromEvent(value);
      if (extracted) return extracted;
    }
    return '';
  }

}

// Export singleton instance
export const elizaAPI = new ElizaAPIClient();

// Export types
export type { ElizaChatMessage, ElizaChatRequest };
