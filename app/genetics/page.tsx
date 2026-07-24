'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { usePrivy } from '@privy-io/react-auth';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSNPMatcherWorker, proxy } from '@/hooks/useSNPMatcherWorker';
import { FileUpload } from '@/components/genetics/FileUpload';
import { GenosetDisplay } from '@/components/genetics/GenosetDisplay';
import { WikiContent } from '@/components/genetics/WikiContent';
import { TraitPanel } from '@/components/genetics/gallery/TraitPanel';
import { ART_COLLECTION } from '@/components/genetics/gallery/artCollection';
import type { Piece } from '@/components/genetics/gallery/snpArt';
import type { ParseResult, MatchedSNP, MatchedGenoset, SNPRecord } from '@/types/genetics';
import styles from './page.module.css';

const OsirisGallery = dynamic(
  () => import('@/components/genetics/gallery/OsirisGallery').then((m) => m.OsirisGallery),
  { ssr: false, loading: () => <div className={styles.galleryFallback} /> },
);

const ProMembershipModal = dynamic(
  () => import('@/components/pro-membership-modal/ProMembershipModal'),
  { ssr: false },
);

type AppMode = 'collection' | 'upload' | 'browse';
/** What the panel over the room is currently reading. */
type Panel = 'artwork' | 'marker' | 'genosets' | 'upload';
type AccessState = 'checking' | 'granted' | 'locked';

/**
 * How many markers can hang at once. This is a ceiling on the map, not on the
 * archive — only the pieces either side of you are ever painted. It was 600,
 * which quietly put most of a real genome out of reach.
 */
const HANG_LIMIT = 2000;

const CHROMOSOMES = [
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','X','Y','MT',
];

const CLINICAL_SIGNIFICANCE_OPTIONS = [
  'Pathogenic','Likely pathogenic','Benign','Likely benign',
  'Uncertain significance','risk factor','association',
];

/** Wiki markup makes a poor wall label. Reduce it to one plain sentence. */
function toCaption(content: string | undefined): string | undefined {
  if (!content) return undefined;
  const plain = content
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
    .replace(/<[^>]+>/g, ' ')
    .replace(/['"=*#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return undefined;
  const sentence = plain.split(/(?<=\.)\s/)[0];
  return sentence.length > 96 ? `${sentence.slice(0, 96).trimEnd()}…` : sentence;
}

function toMagnitude(content: string | undefined): number | undefined {
  if (!content) return undefined;
  const m = content.match(/magnitude\s*[=|:]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  return m ? Number(m[1]) : undefined;
}

interface GeneticsLabProps {
  canAccessGenetics: boolean;
  accessChecking: boolean;
  onRequireMembership: () => void;
}

function GeneticsLab({
  canAccessGenetics,
  accessChecking,
  onRequireMembership,
}: GeneticsLabProps) {
  // The room opens on the art. It is the one wing that is hung for everyone —
  // the archive needs membership, and a genome needs a file.
  const [mode, setMode] = useState<AppMode>('collection');
  const [panel, setPanel] = useState<Panel | null>(null);
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

  // Browse (the public wing)
  const [searchTerm, setSearchTerm] = useState('');
  const [chromosome, setChromosome] = useState('');
  const [gene, setGene] = useState('');
  const [clinicalSignificance, setClinicalSignificance] = useState('');
  const [disease, setDisease] = useState('');
  const [browseResults, setBrowseResults] = useState<SNPRecord[]>([]);
  /** Markers with no call of your own are noise in your own wing — but they are
      yours to look at if you want them. */
  const [onlyWithGenotype, setOnlyWithGenotype] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLParagraphElement>(null);

  const { api: workerApi, isReady: isWorkerReady, error: workerError } = useSNPMatcherWorker();

  useEffect(() => {
    if (!canAccessGenetics || !isWorkerReady || !workerApi) return;

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
  }, [canAccessGenetics, isWorkerReady, workerApi]);

  // Search only runs once the archive is actually open.
  useEffect(() => {
    if (mode !== 'browse' || !workerApi || isDbLoading) return;
    let stale = false;

    (async () => {
      try {
        const { results } = await workerApi.searchSNPs({
          searchTerm: searchTerm || undefined,
          chromosome: chromosome || undefined,
          gene: gene || undefined,
          clinicalSignificance: clinicalSignificance || undefined,
          disease: disease || undefined,
          limit: HANG_LIMIT,
        });
        if (stale) return;
        setBrowseResults(results);
        setSelectedId(results[0]?.rsid ?? null);
      } catch (error) {
        console.error('Search error:', error);
      }
    })();

    return () => { stale = true; };
  }, [mode, workerApi, isDbLoading, searchTerm, chromosome, gene, clinicalSignificance, disease]);

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
            if (progressTextRef.current) progressTextRef.current.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} lines read`;
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
            if (progressTextRef.current) progressTextRef.current.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} markers spliced`;
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
    setSelectedId(null);
    setMode('upload');
    setSearchTerm('');
    setPanel(null);
  }, []);

  const hasResults = !!matches && genosets !== null;
  const hasError = dbError || matchError || workerError;
  const isProcessing = isParsing || isMatching || isMatchingGenosets;

  /**
   * The user's own markers, loudest first — the private wing. The same search
   * box serves both wings: here it filters your matches on the spot, since your
   * genome is already in memory and never goes near the archive query.
   */
  const ownPieces = useMemo<Piece[]>(() => {
    if (!matches) return [];
    const term = searchTerm.trim().toLowerCase();
    return matches
      .filter((m) => onlyWithGenotype ? m.genotypeData !== undefined : true)
      .filter((m) => {
        if (!term) return true;
        return (
          m.rsid.toLowerCase().includes(term) ||
          m.genotype.toLowerCase().includes(term) ||
          m.snpData.content.toLowerCase().includes(term) ||
          !!m.genotypeData?.content.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (b.parsedData.magnitude ?? -1) - (a.parsedData.magnitude ?? -1))
      .slice(0, HANG_LIMIT)
      .map((m) => ({
        id: m.rsid,
        genotype: m.genotype,
        magnitude: m.parsedData.magnitude,
        label: `${m.rsid.toUpperCase()} · ${m.genotype}`,
        caption: toCaption(m.genotypeData?.content ?? m.snpData.content),
      }));
  }, [matches, searchTerm, onlyWithGenotype]);

  const browsePieces = useMemo<Piece[]>(
    () =>
      browseResults.map((r) => ({
        id: r.rsid,
        magnitude: toMagnitude(r.content),
        label: r.rsid.toUpperCase(),
        caption: toCaption(r.content),
      })),
    [browseResults],
  );

  const collectionPieces = useMemo<Piece[]>(
    () =>
      ART_COLLECTION.map((artwork, index) => ({
        id: `collection-${index + 1}`,
        label: artwork.title,
        caption: artwork.desc,
        imageUrl: `/api/genetics/artwork-image?id=${index + 1}`,
        artist: artwork.artist,
        year: artwork.year,
        era: artwork.era,
        description: artwork.desc,
        externalUrl: artwork.linkUrl,
      })),
    [],
  );

  const pieces = mode === 'collection'
    ? collectionPieces
    : mode === 'browse'
      ? browsePieces
      : ownPieces;

  const selectedArtwork = useMemo(
    () => (mode === 'collection' ? collectionPieces.find((piece) => piece.id === selectedId) ?? null : null),
    [collectionPieces, mode, selectedId],
  );

  const selectedMatch = useMemo(
    () => (mode === 'upload' ? matches?.find((m) => m.rsid === selectedId) ?? null : null),
    [mode, matches, selectedId],
  );
  const selectedRecord = useMemo(
    () => (mode === 'browse' ? browseResults.find((r) => r.rsid === selectedId) ?? null : null),
    [mode, browseResults, selectedId],
  );

  /** Clicking a hanging is how you read it. Walking past one only selects it. */
  const handleSelect = useCallback((piece: Piece) => {
    setSelectedId(piece.id);
    setPanel(piece.externalUrl ? 'artwork' : 'marker');
  }, []);

  const handleFocus = useCallback((piece: Piece) => {
    setSelectedId(piece.id);
  }, []);

  const hasActiveFilters = !!(searchTerm || chromosome || gene || clinicalSignificance || disease);
  const clearFilters = () => {
    setSearchTerm(''); setChromosome(''); setGene('');
    setClinicalSignificance(''); setDisease('');
  };

  const chooseMode = (nextMode: AppMode) => {
    if (nextMode !== 'collection' && !canAccessGenetics) {
      onRequireMembership();
      return;
    }
    setMode(nextMode);
    setSelectedId(null);
    setPanel(null);
  };

  /* ---------- the panel over the room ---------- */
  const markerContent = selectedMatch
    ? selectedMatch.genotypeData?.content || selectedMatch.snpData.content
    : selectedRecord?.content;

  const panelTitle = (() => {
    if (panel === 'artwork') return selectedArtwork?.label || 'Collection piece';
    if (panel === 'genosets') return 'Genosets';
    if (panel === 'upload') return 'Bring your own genome';
    return (selectedId || '').toUpperCase();
  })();

  const panelSubtitle = (() => {
    if (panel === 'artwork') {
      return [selectedArtwork?.artist, selectedArtwork?.year].filter(Boolean).join(', ');
    }
    if (panel === 'genosets') return `${genosets?.length.toLocaleString() ?? 0} matched in your genome`;
    if (panel === 'upload') return 'Read on this device. Nothing is uploaded.';
    return undefined;
  })();

  const panelChips = (() => {
    if (panel !== 'marker' || !selectedMatch) return undefined;
    const out = [`Your call: ${selectedMatch.genotype}`];
    if (selectedMatch.parsedData.magnitude !== undefined) {
      out.push(`Magnitude ${selectedMatch.parsedData.magnitude}`);
    }
    return out;
  })();

  const renderPanel = () => {
    if (panel === 'artwork') {
      if (!selectedArtwork) return null;
      return (
        <div className={styles.artworkDetails}>
          {selectedArtwork.description && (
            <p className={styles.artworkDescription}>{selectedArtwork.description}</p>
          )}
          {selectedArtwork.era && (
            <p className={styles.artworkEra}>{selectedArtwork.era}</p>
          )}
          {selectedArtwork.externalUrl && (
            <a
              href={selectedArtwork.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.artworkLink}
            >
              View original artwork
            </a>
          )}
        </div>
      );
    }
    if (panel === 'genosets') {
      return genosets ? <GenosetDisplay genosets={genosets} /> : null;
    }
    if (panel === 'upload') {
      return (
        <>
          <p className={styles.panelHint}>
            23andMe, AncestryDNA, MyHeritage, or FamilyTreeDNA. Your file is parsed and
            matched against SNPedia in a worker on this device, then hung on the wall
            behind this panel.
          </p>
          <FileUpload onFileSelect={handleFileSelect} />
        </>
      );
    }
    if (!markerContent) {
      return <p className={styles.panelHint}>SNPedia has no entry body for this marker.</p>;
    }
    return <WikiContent content={markerContent} />;
  };

  return (
    <main className={styles.content}>
      {/* The room, and the panel that reads what is in it */}
      <section className={styles.galleryBand}>
        <OsirisGallery
          pieces={pieces}
          selectedId={selectedId}
          onSelect={handleSelect}
          onFocus={handleFocus}
        />
        <TraitPanel
          open={panel !== null}
          title={panelTitle}
          subtitle={panelSubtitle}
          chips={panelChips}
          onClose={() => setPanel(null)}
        >
          {panel !== null && renderPanel()}
        </TraitPanel>
      </section>

      {/* The terminal is a caption strip: it is sized by its contents, so there is
          never a pool of dead space under the room. */}
      <section className={styles.terminal} data-theme="dark">
        <p className={styles.statement}>
          {mode === 'collection'
            ? 'The Osiris collection brings Academy art, concept studies, and interface experiments into one walkable room. Select a work to read its notes and visit the original.'
            : 'Under the Humane Genome Project License, Maverick Blue splices epigenetic markers into digital studies. Every rsid produces one repeatable canvas. Your file stays on this device.'}
        </p>

        <div className={styles.strip}>
          <div className={styles.segmented}>
            <button
              type="button"
              onClick={() => chooseMode('collection')}
              disabled={isProcessing}
              className={`${styles.segmentBtn} ${mode === 'collection' ? styles.segmentBtnActive : ''}`}
            >
              Art collection
            </button>
            <button
              type="button"
              onClick={() => chooseMode('browse')}
              disabled={isProcessing}
              className={`${styles.segmentBtn} ${mode === 'browse' ? styles.segmentBtnActive : ''}`}
            >
              Genetic archive
            </button>
            <button
              type="button"
              onClick={() => chooseMode('upload')}
              disabled={isProcessing}
              className={`${styles.segmentBtn} ${mode === 'upload' ? styles.segmentBtnActive : ''}`}
            >
              {hasResults ? 'Your genome' : 'Bring a genome'}
            </button>
          </div>

          <span className={styles.statusPill}>
            <span className={`${styles.statusDot} ${mode !== 'collection' && isDbLoading ? styles.statusDotLoading : ''}`} />
            {mode === 'collection'
              ? `${ART_COLLECTION.length.toLocaleString()} works catalogued`
              : !canAccessGenetics
                ? (accessChecking ? 'Checking membership' : 'Membership required')
                : isDbLoading
                  ? 'Uncrating the archive'
                  : dbStats
                    ? `${dbStats.totalSNPs.toLocaleString()} markers catalogued`
                    : 'Archive idle'}
          </span>

          {/* One search box for both wings: it queries the archive in the public
              wing and filters your own matches in yours. */}
          {(mode === 'browse' || (mode === 'upload' && hasResults)) && (
            <input
              type="text"
              placeholder={mode === 'browse' ? 'rsid, gene, disease, or text' : 'Search your markers'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${styles.field} ${styles.fieldSearch}`}
            />
          )}

          {mode === 'browse' && (
            <>
              <select
                value={chromosome}
                onChange={(e) => setChromosome(e.target.value)}
                className={styles.field}
                aria-label="Chromosome"
              >
                <option value="">Any chromosome</option>
                {CHROMOSOMES.map((chr) => <option key={chr} value={chr}>Chromosome {chr}</option>)}
              </select>
              <input
                type="text"
                placeholder="Gene"
                value={gene}
                onChange={(e) => setGene(e.target.value)}
                className={`${styles.field} ${styles.fieldNarrow}`}
              />
              <select
                value={clinicalSignificance}
                onChange={(e) => setClinicalSignificance(e.target.value)}
                className={styles.field}
                aria-label="Clinical significance"
              >
                <option value="">Any significance</option>
                {CLINICAL_SIGNIFICANCE_OPTIONS.map((sig) => <option key={sig} value={sig}>{sig}</option>)}
              </select>
              <input
                type="text"
                placeholder="Disease"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                className={`${styles.field} ${styles.fieldNarrow}`}
              />
            </>
          )}

          {mode === 'upload' && hasResults && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={onlyWithGenotype}
                onChange={(e) => setOnlyWithGenotype(e.target.checked)}
              />
              Only markers you have a call for
            </label>
          )}

          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className={styles.linkButton}>
              Reset
            </button>
          )}

          <div className={styles.stripRight}>
            {mode === 'upload' && !hasResults && !isProcessing && !isDbLoading && (
              <button type="button" onClick={() => setPanel('upload')} className={styles.terminalButton}>
                Choose a file
              </button>
            )}
            {hasResults && (
              <>
                <button type="button" onClick={() => setPanel('genosets')} className={styles.terminalButton}>
                  Genosets
                </button>
                <button type="button" onClick={handleReset} className={styles.terminalButton}>
                  New genome
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress and failure live in the strip so the room keeps the space. */}
        {mode !== 'collection' && canAccessGenetics && (isDbLoading || isProcessing) && (
          <div className={styles.progressRow}>
            <div className={styles.progressBar}>
              <div ref={progressBarRef} className={styles.progressFill} style={{ width: '0%' }} />
            </div>
            <p ref={progressTextRef} className={styles.progressText}>
              {isDbLoading ? '0% complete' : '0 / 0'}
            </p>
            <span className={styles.railNote}>
              {isDbLoading
                ? 'Roughly 155MB of SNPedia, once'
                : isParsing
                  ? 'Reading your file'
                  : isMatching
                    ? 'Splicing markers to canvas'
                    : 'Checking genosets'}
            </span>
          </div>
        )}

        {mode !== 'collection' && hasError && (
          <p className={styles.stateError}>
            {dbError?.message || matchError?.message || workerError?.message || 'An unknown error occurred'}
          </p>
        )}
      </section>
    </main>
  );
}

export default function GeneticsPage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [access, setAccess] = useState<AccessState>('checking');
  const [showProModal, setShowProModal] = useState(false);

  const checkAccess = useCallback(async () => {
    if (!ready) return;
    if (!authenticated) {
      setAccess('locked');
      return;
    }
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/membership/holding-status', {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setAccess(data.hasVipMembershipCard ? 'granted' : 'locked');
        return;
      }
      setAccess('locked');
    } catch {
      setAccess('locked');
    }
  }, [ready, authenticated, getAccessToken]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const handleProModalClose = useCallback(() => {
    setShowProModal(false);
    setAccess('checking');
    checkAccess();
  }, [checkAccess]);

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <GeneticsLab
        canAccessGenetics={access === 'granted'}
        accessChecking={access === 'checking'}
        onRequireMembership={() => setShowProModal(true)}
      />
      <ProMembershipModal isOpen={showProModal} onClose={handleProModalClose} />
    </div>
  );
}
