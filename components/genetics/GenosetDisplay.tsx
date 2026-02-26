'use client';

import { useState, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { MatchedGenoset } from '@/types/genetics';
import { WikiContent } from './WikiContent';
import styles from './GenosetDisplay.module.css';

interface GenosetDisplayProps {
  genosets: MatchedGenoset[];
}

export function GenosetDisplay({ genosets }: GenosetDisplayProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenoset, setSelectedGenoset] = useState<MatchedGenoset | null>(null);

  const filteredGenosets = useMemo(() => {
    let filtered = genosets;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (g) => g.genoset.id.toLowerCase().includes(term) || g.genoset.content.toLowerCase().includes(term),
      );
    }
    return filtered.sort((a, b) => {
      const magA = a.parsedData.magnitude ?? -1;
      const magB = b.parsedData.magnitude ?? -1;
      return magB - magA;
    });
  }, [genosets, searchTerm]);

  const itemContent = (index: number) => {
    const genoset = filteredGenosets[index];
    const isSelected = selectedGenoset?.genoset.id === genoset.genoset.id;

    return (
      <div
        className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
        onClick={() => setSelectedGenoset(genoset)}
      >
        <div className={styles.listItemHeader}>
          <span className={styles.listItemId}>{genoset.genoset.id.toUpperCase()}</span>
          {genoset.parsedData.magnitude !== undefined && (
            <span className={styles.magnitudeBadge}>Mag: {genoset.parsedData.magnitude}</span>
          )}
        </div>
        <div className={styles.listItemMeta}>
          {genoset.matchedGenotypes.length} matching genotype{genoset.matchedGenotypes.length !== 1 ? 's' : ''}
        </div>
        <div className={styles.listItemPreview}>
          {genoset.genoset.content.substring(0, 100)}...
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchSection}>
        <h2 className={styles.sectionTitle}>
          Found {genosets.length.toLocaleString()} matching genoset{genosets.length !== 1 ? 's' : ''}
        </h2>
        <p className={styles.sectionDesc}>
          Genosets are collections of genotypes that together indicate a trait, condition, or characteristic.
        </p>
        <input
          type="text"
          placeholder="Search by ID or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.resultCount}>
          Showing {filteredGenosets.length.toLocaleString()} of {genosets.length.toLocaleString()} results
        </div>
      </div>

      <div className={styles.splitView}>
        <div className={styles.listPanel}>
          <Virtuoso style={{ height: '100%' }} totalCount={filteredGenosets.length} itemContent={itemContent} />
        </div>

        <div className={styles.detailPanel}>
          {selectedGenoset ? (
            <div>
              <h3
                className={styles.detailTitle}
                onClick={() => window.open(`https://www.snpedia.com/index.php/${selectedGenoset.genoset.id}`, '_blank')}
              >
                {selectedGenoset.genoset.id.toUpperCase()}
              </h3>

              {selectedGenoset.parsedData.magnitude !== undefined && (
                <div className={styles.magnitudeCard}>
                  <div className={styles.cardLabel}>Magnitude</div>
                  <div className={styles.magnitudeValueLarge}>{selectedGenoset.parsedData.magnitude}</div>
                </div>
              )}

              <div className={styles.genotypesCard}>
                <div className={styles.cardLabel}>Your Matching Genotypes</div>
                <div className={styles.genotypesList}>
                  {selectedGenoset.matchedGenotypes.map((match) => (
                    <div key={match.rsid} className={styles.genotypeItem}>
                      <span className={styles.genotypeRsid}>{match.rsid.toUpperCase()}: {match.genotype.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedGenoset.genoset.content && (
                <div className={styles.infoCard}>
                  <div className={styles.cardLabel}>Genoset Information</div>
                  <WikiContent content={selectedGenoset.genoset.content} />
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyDetail}>Select a genoset from the list to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
