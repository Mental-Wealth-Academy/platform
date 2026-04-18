'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import styles from './FieldScanner.module.css';
import type { FieldTask } from '@/components/field-task-card/FieldTaskCard';

// Niantic Lightship Maps SDK
// Install: npm install @niantic-lightship/maps
// Provides location-based AR context for field research tasks
// import { LightshipMap } from '@niantic-lightship/maps';

interface AnalysisResult {
  identification: string;
  properties: string[];
  applications: string[];
  fieldNote: string;
}

interface Props {
  task: FieldTask;
  onClose: () => void;
}

type Phase = 'scanning' | 'analyzing' | 'result' | 'error';

export default function FieldScanner({ task, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>('scanning');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    startCamera();
    getLocation();
    return stopCamera;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setErrorMsg('Camera access denied. Enable camera permissions to scan.');
      setPhase('error');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 }
    );
  };

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    const base64 = dataUrl.split(',')[1];
    setCapturedImage(dataUrl);
    setPhase('analyzing');
    stopCamera();

    try {
      const res = await fetch('/api/field-research/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          taskType: task.category,
          coords,
        }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data: AnalysisResult = await res.json();
      setResult(data);
      setPhase('result');
    } catch {
      setErrorMsg('Analysis failed. Please try again.');
      setPhase('error');
    }
  }, [task.category, coords]);

  const retry = () => {
    setCapturedImage(null);
    setResult(null);
    setErrorMsg(null);
    setPhase('scanning');
    startCamera();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`${task.name} scanner`}>
      <canvas ref={canvasRef} className={styles.hiddenCanvas} aria-hidden="true" />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerEmoji} aria-hidden="true">{task.illustrationEmoji}</span>
          <div>
            <span className={styles.headerTitle}>{task.name}</span>
            <span className={styles.headerSub}>{task.category}</span>
          </div>
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close scanner">
          ✕
        </button>
      </div>

      {/* Camera / captured image */}
      {(phase === 'scanning' || phase === 'analyzing') && (
        <div className={styles.cameraWrap}>
          {capturedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedImage} alt="Captured" className={styles.cameraFeed} />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.cameraFeed}
            />
          )}

          {/* AR grid overlay */}
          <div className={styles.arGrid} aria-hidden="true">
            <div className={styles.arCornerTL} />
            <div className={styles.arCornerTR} />
            <div className={styles.arCornerBL} />
            <div className={styles.arCornerBR} />
            <div className={styles.arCrosshair} />
          </div>

          {/* Azura feedback during scanning */}
          <div className={styles.azuraPeek}>
            <Image
              src={task.azuraImage}
              alt="Azura"
              width={56}
              height={56}
              className={styles.azuraPeekImg}
              unoptimized
            />
            <div className={styles.azuraSpeech}>
              {phase === 'analyzing' ? 'Analyzing…' : `Point at a ${task.category} resource`}
            </div>
          </div>

          {/* Location pill */}
          {coords && (
            <div className={styles.coordPill}>
              📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </div>
          )}
        </div>
      )}

      {/* Result view */}
      {phase === 'result' && result && (
        <div className={styles.resultWrap}>
          {capturedImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedImage} alt="Scanned" className={styles.resultThumb} />
          )}
          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <Image
                src={task.azuraImage}
                alt="Azura"
                width={40}
                height={40}
                className={styles.resultAzura}
                unoptimized
              />
              <div>
                <span className={styles.resultLabel}>Identified</span>
                <p className={styles.resultIdentification}>{result.identification}</p>
              </div>
            </div>

            {result.properties?.length > 0 && (
              <div className={styles.resultSection}>
                <span className={styles.resultSectionTitle}>Key Properties</span>
                <ul className={styles.resultList}>
                  {result.properties.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.applications?.length > 0 && (
              <div className={styles.resultSection}>
                <span className={styles.resultSectionTitle}>Make with This</span>
                <ul className={styles.resultList}>
                  {result.applications.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.fieldNote && (
              <div className={styles.fieldNote}>
                <span>🔬</span>
                <p>{result.fieldNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <div className={styles.errorWrap}>
          <span className={styles.errorIcon}>⚠️</span>
          <p className={styles.errorMsg}>{errorMsg}</p>
          <button type="button" className={styles.retryBtn} onClick={retry}>
            Try Again
          </button>
        </div>
      )}

      {/* Footer actions */}
      <div className={styles.footer}>
        {phase === 'scanning' && (
          <button type="button" className={styles.captureBtn} onClick={capture}>
            <span className={styles.captureBtnInner} />
          </button>
        )}
        {phase === 'analyzing' && (
          <div className={styles.analyzingIndicator}>
            <div className={styles.analyzingDot} />
            <div className={styles.analyzingDot} />
            <div className={styles.analyzingDot} />
          </div>
        )}
        {(phase === 'result' || phase === 'error') && (
          <div className={styles.resultActions}>
            <button type="button" className={styles.scanAgainBtn} onClick={retry}>
              Scan Again
            </button>
            {phase === 'result' && (
              <button type="button" className={styles.claimBtn} onClick={onClose}>
                Claim ◆ {task.shards}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
