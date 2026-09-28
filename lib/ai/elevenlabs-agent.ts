import WebSocket from 'ws';

export interface ElevenLabsAgentStreamOptions {
  agentId?: string;
  apiKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  chunkIntervalMs?: number;
}

export interface ElevenLabsTextStreamResult {
  source: 'elevenlabs';
  stream: ReadableStream<string>;
}

export function cleanAgentSpeechTags(text: string): string {
  return text
    .replace(/\[[A-Za-z][A-Za-z\s,.'"-]*\]\s*/g, '')
    .trim();
}

export async function callElevenLabsAgentStream(
  userMessage: string,
  options: ElevenLabsAgentStreamOptions = {},
): Promise<ElevenLabsTextStreamResult> {
  const apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY || '';
  const agentId = options.agentId || process.env.ELEVENLABS_AGENT_ID || 'agent_9801kx535dzwefxar95qgenx5a7z';
  const timeoutMs = options.timeoutMs ?? 25_000;
  const chunkIntervalMs = options.chunkIntervalMs ?? 15;

  if (!apiKey) {
    throw new Error('ElevenLabs API key is not configured');
  }
  if (!agentId) {
    throw new Error('ElevenLabs Agent ID is not configured');
  }

  // Obtain signed WebSocket URL
  const signedUrlRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
      signal: options.signal,
    },
  );

  if (!signedUrlRes.ok) {
    const errorBody = await signedUrlRes.text().catch(() => '');
    throw new Error(`ElevenLabs signed URL request failed (${signedUrlRes.status}): ${errorBody}`);
  }

  const { signed_url: signedUrl } = (await signedUrlRes.json()) as { signed_url?: string };
  if (!signedUrl) {
    throw new Error('ElevenLabs returned empty signed URL');
  }

  let ws: WebSocket | null = null;
  let timer: NodeJS.Timeout | null = null;
  let isCancelled = false;

  const cleanup = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        // ignore close errors
      }
      ws = null;
    }
  };

  const stream = new ReadableStream<string>({
    start(controller) {
      if (options.signal?.aborted) {
        controller.error(new DOMException('Request aborted', 'AbortError'));
        return;
      }

      const onAbort = () => {
        isCancelled = true;
        cleanup();
        controller.error(new DOMException('Request aborted', 'AbortError'));
      };

      options.signal?.addEventListener('abort', onAbort, { once: true });

      timer = setTimeout(() => {
        isCancelled = true;
        cleanup();
        controller.error(new DOMException('ElevenLabs agent response deadline exceeded', 'TimeoutError'));
      }, timeoutMs);

      try {
        ws = new WebSocket(signedUrl);
      } catch (err) {
        cleanup();
        controller.error(err);
        return;
      }

      let hasReceivedResponse = false;

      ws.on('open', () => {
        // Connected
      });

      ws.on('message', async (data: WebSocket.Data) => {
        if (isCancelled) return;
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf8');
          const message = JSON.parse(raw) as {
            type?: string;
            conversation_initiation_metadata_event?: unknown;
            agent_response_event?: { agent_response?: string };
            error?: string;
          };

          if (message.type === 'conversation_initiation_metadata') {
            // Session established; send user's turn
            ws?.send(
              JSON.stringify({
                type: 'user_message',
                text: userMessage,
              }),
            );
          } else if (message.type === 'agent_response') {
            const rawResponse = message.agent_response_event?.agent_response || '';
            const cleanText = cleanAgentSpeechTags(rawResponse);
            if (!cleanText) {
              controller.error(new Error('ElevenLabs returned empty agent response'));
              cleanup();
              return;
            }

            hasReceivedResponse = true;

            // Stream chunks smoothly to emulate typing
            const words = cleanText.match(/\S+\s*/g) || [cleanText];
            for (const word of words) {
              if (isCancelled) break;
              controller.enqueue(word);
              if (chunkIntervalMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, chunkIntervalMs));
              }
            }

            if (!isCancelled) {
              controller.close();
            }
            cleanup();
          } else if (message.type === 'error' || message.error) {
            controller.error(new Error(message.error || 'ElevenLabs agent returned error'));
            cleanup();
          }
        } catch (parseErr) {
          // ignore unparseable non-critical frame
        }
      });

      ws.on('error', (err) => {
        if (!isCancelled && !hasReceivedResponse) {
          cleanup();
          controller.error(err);
        }
      });

      ws.on('close', (code, reason) => {
        if (!isCancelled && !hasReceivedResponse) {
          cleanup();
          // If closed without having received response, emit error
          controller.error(
            new Error(`ElevenLabs WebSocket closed unexpectedly (${code}): ${reason.toString()}`),
          );
        }
      });
    },
    cancel() {
      isCancelled = true;
      cleanup();
    },
  });

  return {
    source: 'elevenlabs',
    stream,
  };
}
