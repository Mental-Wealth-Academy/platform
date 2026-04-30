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

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          messages: request.messages,
          id: request.id || 'gpt-4o',
        }),
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
      console.log('Eliza API raw response:', {
        status: response.status,
        statusText: response.statusText,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 300),
      });

      // Check if response is SSE streaming format (starts with "data:")
      if (responseText.trimStart().startsWith('data:')) {
        const fullText = this.parseSSEResponse(responseText);
        console.log('Parsed SSE response, length:', fullText.length);
        if (!fullText) {
          throw new Error('Eliza API returned empty SSE response');
        }
        return fullText;
      }

      // Try parsing as standard JSON response
      let data: ElizaChatResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Eliza API response as JSON:', {
          error: parseError,
          responseText: responseText.substring(0, 500),
        });
        throw new Error(`Eliza API returned invalid response format: ${responseText.substring(0, 100)}`);
      }

      console.log('Eliza API parsed response:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasError: !!data.error,
        errorMessage: data.error?.message,
      });

      // Check for error in response
      if (data.error) {
        console.error('Eliza API returned error:', data.error);
        throw new Error(data.error.message || 'Eliza API returned an error');
      }

      // Handle different response formats
      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message.content || '';
        console.log('Extracted content length:', content.length);
        if (!content) {
          console.error('Eliza API returned empty content in choices:', data.choices[0]);
          throw new Error('Eliza API returned empty content');
        }
        return content;
      }

      // Fallback: try to extract text from response
      const text = (data as any).text || (data as any).content || '';
      if (text) {
        console.log('Using fallback text, length:', text.length);
        return text;
      }

      console.error('No content found in Eliza API response:', JSON.stringify(data, null, 2));
      throw new Error('No response content from Eliza API');
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
      if (trimmed.startsWith('data:')) {
        sawEventPayload = true;
        const jsonStr = trimmed.slice(5).trimStart();
        if (jsonStr === '[DONE]') continue;
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          fullText += this.extractTextFromEvent(event);
        } catch {
          fullText += jsonStr;
        }
      }
    }

    if (!fullText && !sawEventPayload) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '[DONE]') continue;
        try {
          const event = JSON.parse(trimmed);
          fullText += this.extractTextFromEvent(event);
        } catch {
          fullText += trimmed;
        }
      }
    }

    return fullText;
  }

  private extractTextFromEvent(event: unknown): string {
    if (typeof event === 'string') return event;
    if (typeof event === 'number' || typeof event === 'boolean') return String(event);
    if (!event || typeof event !== 'object') return '';

    if (Array.isArray(event)) {
      return event.map((item) => this.extractTextFromEvent(item)).join('');
    }

    const data = event as Record<string, any>;
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
