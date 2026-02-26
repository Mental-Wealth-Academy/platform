import { useEffect, useState, useRef } from 'react';
import { wrap, proxy, type Remote } from 'comlink';
import type { SNPMatcherWorkerApi } from '../workers/snpMatcher.worker';

export interface UseSNPMatcherWorkerResult {
  api: Remote<SNPMatcherWorkerApi> | null;
  isReady: boolean;
  error: Error | null;
}

export function useSNPMatcherWorker(): UseSNPMatcherWorkerResult {
  const [error, setError] = useState<Error | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Remote<SNPMatcherWorkerApi> | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const worker = new Worker(
        new URL('../workers/snpMatcher.worker.ts', import.meta.url)
      );
      workerRef.current = worker;
      apiRef.current = wrap<SNPMatcherWorkerApi>(worker);

      worker.onerror = (errorEvent: ErrorEvent) => {
        console.error('Worker error:', errorEvent);
        setError(new Error(`Worker error: ${errorEvent.message}`));
      };

      setIsReady(true);
    } catch (err) {
      console.error('Failed to initialize worker:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize worker'));
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        apiRef.current = null;
      }
    };
  }, []);

  return {
    api: apiRef.current,
    isReady,
    error,
  };
}

export { proxy };
