'use client';

import dynamic from 'next/dynamic';
import {
  Component,
  useCallback,
  useEffect,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import styles from './BlueScene.module.css';

const BlueVrmCanvas = dynamic(() => import('./BlueVrmCanvas'), { ssr: false });

interface BlueVrmStageProps {
  active: boolean;
  analyserRef?: MutableRefObject<AnalyserNode | null>;
  audioRef?: MutableRefObject<HTMLAudioElement | null>;
  companionVolumeRef?: MutableRefObject<number>;
  companionMode?: 'idle' | 'listening' | 'speaking';
  onError?: () => void;
  onReady?: () => void;
}

interface BlueVrmBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

class BlueVrmBoundary extends Component<BlueVrmBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function canUseWebGl(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

const noop = () => {};

export default function BlueVrmStage({
  active,
  analyserRef,
  audioRef,
  companionVolumeRef,
  companionMode,
  onError = noop,
  onReady = noop,
}: BlueVrmStageProps) {
  const [mountCanvas, setMountCanvas] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!canUseWebGl()) {
      onError();
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = () => setReducedMotion(mediaQuery.matches);
    handleMotionChange();
    mediaQuery.addEventListener('change', handleMotionChange);

    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number;
    if (typeof win.requestIdleCallback === 'function') {
      idleId = win.requestIdleCallback(() => setMountCanvas(true), { timeout: 200 });
    } else {
      idleId = window.setTimeout(() => setMountCanvas(true), 100);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      if (typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [onError]);

  const handleReady = useCallback(() => {
    setReady(true);
    onReady();
  }, [onReady]);

  if (!mountCanvas) return null;

  return (
    <div
      className={`${styles.radioVrmCanvas} ${ready ? styles.radioVrmCanvasReady : ''}`}
      aria-hidden="true"
    >
      <BlueVrmBoundary onError={onError}>
        <BlueVrmCanvas
          active={active}
          analyserRef={analyserRef}
          audioRef={audioRef}
          companionVolumeRef={companionVolumeRef}
          companionMode={companionMode}
          reducedMotion={reducedMotion}
          onError={onError}
          onReady={handleReady}
        />
      </BlueVrmBoundary>
    </div>
  );
}
