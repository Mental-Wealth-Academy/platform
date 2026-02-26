'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AngelMintSection from '@/components/angel-mint-section/AngelMintSection';
import MintModal from '@/components/mint-modal/MintModal';
import { useSNPMatcherWorker, proxy } from '@/hooks/useSNPMatcherWorker';
import { FileUpload } from '@/components/genetics/FileUpload';
import { ResultsDisplay } from '@/components/genetics/ResultsDisplay';
import { SNPBrowser } from '@/components/genetics/SNPBrowser';
import { GeneticsChat } from '@/components/genetics/GeneticsChat';
import type { ParseResult, MatchedSNP, MatchedGenoset } from '@/types/genetics';
import styles from './page.module.css';

type AppMode = 'upload' | 'browse';

export default function GeneticsPage() {
  const [showMintModal, setShowMintModal] = useState(false);
  const [mode, setMode] = useState<AppMode>('upload');
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [dbError, setDbError] = useState<Error | null>(null);
  const [dbStats, setDbStats] = useState<{ totalSNPs: number } | null>(null);

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [matches, setMatches] = useState<MatchedSNP[] | null>(null);
  const [genosets, setGenosets] = useState<MatchedGenoset[] | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isMatchingGenosets, setIsMatchingGenosets] = useState(false);
  const [matchError, setMatchError] = useState<Error | null>(null);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLParagraphElement>(null);

  const { api: workerApi, isReady: isWorkerReady, error: workerError } = useSNPMatcherWorker();

  // Load database when worker is ready
  useEffect(() => {
    if (!isWorkerReady || !workerApi) return;

    async function loadDB() {
      if (!workerApi) return;
      try {
        setIsDbLoading(true);
        setDbError(null);

        await workerApi.loadDatabase(
          '/api/proxy/snpedia-db',
          proxy((progress: number) => {
            if (progressBarRef.current) progressBarRef.current.style.width = `${progress}%`;
            if (progressTextRef.current) progressTextRef.current.textContent = `${Math.round(progress)}% complete`;
          }),
        );

        const stats = await workerApi.getDatabaseStats();
        setDbStats(stats);
        setIsDbLoading(false);
      } catch (err) {
        console.error('Error loading database:', err);
        setDbError(err instanceof Error ? err : new Error('Failed to load database'));
        setIsDbLoading(false);
      }
    }

    loadDB();
  }, [isWorkerReady, workerApi]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!workerApi) return;

      try {
        const content = await file.text();
        setIsParsing(true);
        setMatchError(null);

        const result = await workerApi.parseFile(
          content,
          proxy((current: number, total: number) => {
            const progress = total > 0 ? (current / total) * 100 : 0;
            if (progressBarRef.current) progressBarRef.current.style.width = `${progress}%`;
            if (progressTextRef.current) progressTextRef.current.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} lines processed`;
          }),
        );

        setParseResult(result);
        setDetectedFormat(result.detectedFormat || null);
        setIsParsing(false);

        if (result.genotypes.length === 0) throw new Error('No valid SNP data found in file');

        setIsMatching(true);
        const matchedSNPs = await workerApi.matchSNPs(
          result.genotypes,
          proxy((current: number, total: number) => {
            const progress = total > 0 ? (current / total) * 100 : 0;
            if (progressBarRef.current) progressBarRef.current.style.width = `${progress}%`;
            if (progressTextRef.current) progressTextRef.current.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} SNPs processed`;
          }),
        );

        setMatches(matchedSNPs);
        setIsMatching(false);

        setIsMatchingGenosets(true);
        const matchedGenosets = await workerApi.matchGenosets(
          matchedSNPs,
          proxy((current: number, total: number) => {
            const progress = total > 0 ? (current / total) * 100 : 0;
            if (progressBarRef.current) progressBarRef.current.style.width = `${progress}%`;
            if (progressTextRef.current) progressTextRef.current.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} genosets checked`;
          }),
        );

        setGenosets(matchedGenosets);
        setIsMatchingGenosets(false);
      } catch (err) {
        console.error('Error processing file:', err);
        setMatchError(err instanceof Error ? err : new Error('Unknown error'));
        setIsParsing(false);
        setIsMatching(false);
        setIsMatchingGenosets(false);
      }
    },
    [workerApi],
  );

  const handleReset = useCallback(() => {
    setParseResult(null);
    setDetectedFormat(null);
    setMatches(null);
    setGenosets(null);
    setMatchError(null);
    setMode('upload');
  }, []);

  const hasResults = matches && matches.length >= 0 && genosets !== null;
  const hasError = dbError || matchError || workerError;
  const isProcessing = isParsing || isMatching || isMatchingGenosets;

  return (
    <>
      <SideNavigation />
      <main className={styles.pageLayout}>
        <div className={styles.content}>
          {/* Hero */}
          <div className={styles.hero}>
            {dbStats && !isDbLoading && (
              <div className={styles.statBadge}>
                {dbStats.totalSNPs.toLocaleString()} SNPs in database
              </div>
            )}
            <div className={styles.heroContent}>
              <p className={styles.eyebrow}>Genomics Lab</p>
              <h1 className={styles.title}>Genetics Browser</h1>
              <p className={styles.subtitle}>
                Explore genetic variants from SNPedia and match with your DNA data. All processing happens in your browser — no data is sent to any server.
              </p>
            </div>

            {!isDbLoading && !hasError && !hasResults && !isProcessing && (
              <div className={styles.modeToggle}>
                <button
                  onClick={() => setMode('browse')}
                  className={`${styles.modeButton} ${mode === 'browse' ? styles.modeButtonActive : ''}`}
                >
                  Browse Database
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className={`${styles.modeButton} ${mode === 'upload' ? styles.modeButtonActive : ''}`}
                >
                  Upload Your Data
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isDbLoading && (
            <div className={styles.loadingCard}>
              <div className={styles.loadingIcon}>
                <div className={styles.spinner} />
              </div>
              <h2 className={styles.loadingTitle}>Loading SNP Database...</h2>
              <div className={styles.progressBar}>
                <div ref={progressBarRef} className={styles.progressFill} style={{ width: '0%' }} />
              </div>
              <p ref={progressTextRef} className={styles.progressText}>0% complete</p>
              <p className={styles.loadingHint}>Loading 155MB database (~30-60 seconds)</p>
            </div>
          )}

          {/* Error State */}
          {hasError && !isDbLoading && (
            <div className={styles.errorCard}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <h2 className={styles.errorTitle}>Error</h2>
              <p className={styles.errorText}>
                {dbError?.message || matchError?.message || workerError?.message || 'An unknown error occurred'}
              </p>
              <button onClick={() => window.location.reload()} className={styles.retryButton}>
                Reload Page
              </button>
            </div>
          )}

          {/* Main Content */}
          {!isDbLoading && !hasError && !hasResults && !isProcessing && (
            <>
              {mode === 'browse' && workerApi && <SNPBrowser workerApi={workerApi} />}
              {mode === 'upload' && <FileUpload onFileSelect={handleFileSelect} />}
            </>
          )}

          {/* Processing States */}
          {isParsing && (
            <div className={styles.processingCard}>
              <div className={styles.spinner} />
              <h2 className={styles.processingTitle}>Parsing your file...</h2>
              <div className={styles.progressBar}>
                <div ref={progressBarRef} className={styles.progressFill} style={{ width: '0%' }} />
              </div>
              <p ref={progressTextRef} className={styles.progressText}>0 / 0 lines processed</p>
            </div>
          )}

          {isMatching && (
            <div className={styles.processingCard}>
              <div className={styles.spinner} />
              <h2 className={styles.processingTitle}>Matching SNPs with database...</h2>
              {parseResult && (
                <p className={styles.processingSubtext}>Found {parseResult.genotypes.length.toLocaleString()} SNPs in your file</p>
              )}
              <div className={styles.progressBar}>
                <div ref={progressBarRef} className={`${styles.progressFill} ${styles.progressGreen}`} style={{ width: '0%' }} />
              </div>
              <p ref={progressTextRef} className={styles.progressText}>0 / 0 SNPs processed</p>
            </div>
          )}

          {isMatchingGenosets && (
            <div className={styles.processingCard}>
              <div className={styles.spinner} />
              <h2 className={styles.processingTitle}>Finding matching genosets...</h2>
              {matches && (
                <p className={styles.processingSubtext}>Checking genosets against {matches.length.toLocaleString()} matched SNPs</p>
              )}
              <div className={styles.progressBar}>
                <div ref={progressBarRef} className={`${styles.progressFill} ${styles.progressPurple}`} style={{ width: '0%' }} />
              </div>
              <p ref={progressTextRef} className={styles.progressText}>0 / 0 genosets checked</p>
            </div>
          )}

          {/* Results */}
          {hasResults && matches && genosets && !isMatching && !isMatchingGenosets && (
            <>
              <div className={styles.resultsHeader}>
                {parseResult && (
                  <p className={styles.resultsText}>
                    Processed {parseResult.genotypes.length.toLocaleString()} SNPs from your file
                    {parseResult.errors.length > 0 && ` (${parseResult.errors.length} errors)`}
                  </p>
                )}
                {detectedFormat && (
                  <p className={styles.formatText}>
                    Detected format: <strong>{detectedFormat.replace('-', ' ')}</strong>
                  </p>
                )}
                <button onClick={handleReset} className={styles.resetButton}>Upload New File</button>
              </div>
              <ResultsDisplay matches={matches} genosets={genosets} />
            </>
          )}

          {/* Chat */}
          <GeneticsChat matches={matches} genosets={genosets} />

          {/* Angel Mint */}
          <AngelMintSection onOpenMintModal={() => setShowMintModal(true)} />
        </div>
      </main>
      <MintModal isOpen={showMintModal} onClose={() => setShowMintModal(false)} />
    </>
  );
}
