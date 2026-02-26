'use client';

import { useState, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { MatchedSNP, MatchedGenoset } from '@/types/genetics';
import { WikiContent } from './WikiContent';
import { GenosetDisplay } from './GenosetDisplay';
import styles from './ResultsDisplay.module.css';

type ViewMode = 'snps' | 'genosets';

interface ResultsDisplayProps {
  matches: MatchedSNP[];
  genosets: MatchedGenoset[];
}

export function ResultsDisplay({ matches, genosets }: ResultsDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('snps');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSNP, setSelectedSNP] = useState<MatchedSNP | null>(null);
  const [onlyWithGenotype, setOnlyWithGenotype] = useState(true);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (onlyWithGenotype) {
      filtered = filtered.filter((m) => m.genotypeData !== undefined);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.rsid.toLowerCase().includes(term) ||
          m.genotype.toLowerCase().includes(term) ||
          m.snpData.content.toLowerCase().includes(term) ||
          m.genotypeData?.content.toLowerCase().includes(term),
      );
    }
    return filtered.sort((a, b) => {
      const magA = a.parsedData.magnitude ?? -1;
      const magB = b.parsedData.magnitude ?? -1;
      return magB - magA;
    });
  }, [matches, searchTerm, onlyWithGenotype]);

  const itemContent = (index: number) => {
    const match = filteredMatches[index];
    const isSelected = selectedSNP?.rsid === match.rsid;

    return (
      <div
        className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
        onClick={() => setSelectedSNP(match)}
      >
        <div className={styles.listItemHeader}>
          <div className={styles.listItemHeaderLeft}>
            <span className={styles.listItemId}>{match.rsid.toUpperCase()}</span>
            {match.parsedData.magnitude !== undefined && (
              <span className={styles.magnitudeBadge}>Mag: {match.parsedData.magnitude}</span>
            )}
          </div>
        </div>
        <div className={styles.listItemMeta}>
          Your Genotype: <strong>{match.genotype.toUpperCase()}</strong> | Chr: {match.chromosome} | Pos: {match.position}
        </div>
        {match.genotypeData?.content && (
          <div className={styles.listItemPreview}>{match.genotypeData.content.substring(0, 100)}...</div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {genosets.length > 0 && (
        <div className={styles.tabBar}>
          <button
            onClick={() => setViewMode('snps')}
            className={`${styles.tab} ${viewMode === 'snps' ? styles.tabActive : ''}`}
          >
            SNPs ({matches.length.toLocaleString()})
          </button>
          <button
            onClick={() => setViewMode('genosets')}
            className={`${styles.tab} ${viewMode === 'genosets' ? styles.tabActive : ''}`}
          >
            Genosets ({genosets.length.toLocaleString()})
          </button>
        </div>
      )}

      {viewMode === 'snps' && (
        <div className={styles.snpView}>
          <div className={styles.searchSection}>
            <h2 className={styles.sectionTitle}>
              Found {matches.length.toLocaleString()} matching SNP{matches.length !== 1 ? 's' : ''}
            </h2>
            <input
              type="text"
              placeholder="Search by rsid, genotype, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <div className={styles.searchMeta}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={onlyWithGenotype}
                  onChange={(e) => setOnlyWithGenotype(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>Only show SNPs with matching genotype data</span>
              </label>
              <span className={styles.resultCount}>
                Showing {filteredMatches.length.toLocaleString()} of {matches.length.toLocaleString()} results
              </span>
            </div>
          </div>

          <div className={styles.splitView}>
            <div className={styles.detailPanel}>
              {selectedSNP ? (
                <div>
                  <h3
                    className={styles.detailTitle}
                    onClick={() => window.open(`https://www.snpedia.com/index.php/${selectedSNP.rsid}`, '_blank')}
                  >
                    {selectedSNP.rsid.toUpperCase()}
                  </h3>

                  <div className={styles.genotypeCard}>
                    <div className={styles.cardLabel}>Your Genotype</div>
                    <div className={styles.genotypeInfo}>
                      <span className={styles.genotypeValue}>{selectedSNP.genotype.toUpperCase()}</span>
                      {selectedSNP.parsedData.magnitude !== undefined && (
                        <span className={styles.magnitudeLarge}>Magnitude: {selectedSNP.parsedData.magnitude}</span>
                      )}
                    </div>
                    <div className={styles.positionInfo}>Chr {selectedSNP.chromosome} : {selectedSNP.position}</div>
                  </div>

                  {selectedSNP.genotypeData?.content && (
                    <div className={styles.infoCard}>
                      <div className={styles.cardLabel}>Genotype-Specific Information ({selectedSNP.genotype})</div>
                      <WikiContent content={selectedSNP.genotypeData.content} />
                    </div>
                  )}

                  {selectedSNP.snpData.content && (
                    <div className={styles.infoCard}>
                      <div className={styles.cardLabel}>General SNP Information</div>
                      <WikiContent content={selectedSNP.snpData.content} />
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.emptyDetail}>Select a SNP from the list to view details</div>
              )}
            </div>

            <div className={styles.listPanel}>
              <Virtuoso style={{ height: '100%' }} totalCount={filteredMatches.length} itemContent={itemContent} />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'genosets' && <GenosetDisplay genosets={genosets} />}
    </div>
  );
}
