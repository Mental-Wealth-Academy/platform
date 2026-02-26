'use client';

import { useState, useCallback, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { Remote } from 'comlink';
import type { SNPRecord } from '@/types/genetics';
import type { SNPMatcherWorkerApi } from '@/workers/snpMatcher.worker';
import { WikiContent } from './WikiContent';
import styles from './SNPBrowser.module.css';

interface SNPBrowserProps {
  workerApi: Remote<SNPMatcherWorkerApi>;
}

const CHROMOSOMES = [
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','X','Y','MT',
];

const CLINICAL_SIGNIFICANCE_OPTIONS = [
  'Pathogenic','Likely pathogenic','Benign','Likely benign',
  'Uncertain significance','risk factor','association',
];

export function SNPBrowser({ workerApi }: SNPBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [chromosome, setChromosome] = useState('');
  const [gene, setGene] = useState('');
  const [clinicalSignificance, setClinicalSignificance] = useState('');
  const [disease, setDisease] = useState('');
  const [results, setResults] = useState<SNPRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedSNP, setSelectedSNP] = useState<SNPRecord | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const { results: newResults, total: newTotal } = await workerApi.searchSNPs({
        searchTerm: searchTerm || undefined,
        chromosome: chromosome || undefined,
        gene: gene || undefined,
        clinicalSignificance: clinicalSignificance || undefined,
        disease: disease || undefined,
        limit: 1000000,
      });
      setResults(newResults);
      setTotal(newTotal);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [workerApi, searchTerm, chromosome, gene, clinicalSignificance, disease]);

  useEffect(() => { performSearch(); }, [performSearch]);

  const handleClearFilters = () => {
    setSearchTerm(''); setChromosome(''); setGene('');
    setClinicalSignificance(''); setDisease('');
  };

  const hasActiveFilters = searchTerm || chromosome || gene || clinicalSignificance || disease;

  const itemContent = (index: number) => {
    const snp = results[index];
    if (!snp) return null;
    const isSelected = selectedSNP?.rsid === snp.rsid;
    return (
      <div
        className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
        onClick={() => setSelectedSNP(snp)}
      >
        <div className={styles.listItemId}>{snp.rsid.toUpperCase()}</div>
        {snp.content && (
          <div className={styles.listItemPreview}>{snp.content.substring(0, 100)}...</div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <h2 className={styles.filterTitle}>Browse SNP Database</h2>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className={styles.clearButton}>Clear all filters</button>
          )}
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.filterFullWidth}>
            <label className={styles.filterLabel}>Search</label>
            <input
              type="text"
              placeholder="Search by rsid, gene, disease, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>Chromosome</label>
            <select value={chromosome} onChange={(e) => setChromosome(e.target.value)} className={styles.filterSelect}>
              <option value="">All</option>
              {CHROMOSOMES.map((chr) => <option key={chr} value={chr}>{chr}</option>)}
            </select>
          </div>

          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>Gene</label>
            <input
              type="text"
              placeholder="e.g. BRCA1"
              value={gene}
              onChange={(e) => setGene(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>Clinical Significance</label>
            <select value={clinicalSignificance} onChange={(e) => setClinicalSignificance(e.target.value)} className={styles.filterSelect}>
              <option value="">All</option>
              {CLINICAL_SIGNIFICANCE_OPTIONS.map((sig) => <option key={sig} value={sig}>{sig}</option>)}
            </select>
          </div>

          <div className={styles.filterItemWide}>
            <label className={styles.filterLabel}>Disease</label>
            <input
              type="text"
              placeholder="e.g. diabetes, cancer..."
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className={styles.filterInput}
            />
          </div>
        </div>

        <div className={styles.resultSummary}>
          {isSearching ? 'Searching...' : (
            <>Showing {results.length.toLocaleString()} of {total.toLocaleString()} SNP{total !== 1 ? 's' : ''}{hasActiveFilters && ' (filtered)'}</>
          )}
        </div>
      </div>

      <div className={styles.splitView}>
        <div className={styles.listPanel}>
          <Virtuoso style={{ height: '600px' }} totalCount={results.length} itemContent={itemContent} />
        </div>

        <div className={styles.detailPanel}>
          {selectedSNP ? (
            <div>
              <h3 className={styles.detailTitle}>{selectedSNP.rsid.toUpperCase()}</h3>
              {selectedSNP.content && (
                <div className={styles.infoCard}>
                  <div className={styles.cardLabel}>SNPedia Information</div>
                  <WikiContent content={selectedSNP.content} />
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyDetail}>Select a SNP from the list to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
