'use client';

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import GuideWalkthrough from '@/components/guides/GuideWalkthrough';
import styles from '../page.module.css';

type PageProps = { params: { slug: string } };

export default function GuideWalkthroughPage({ params }: PageProps) {
  return (
    <div className={styles.layout}>
      <main className={styles.page}>
        <Link href={`/learn/guides/${params.slug}`} className={styles.back}>
          <ArrowLeft size={16} weight="bold" /> Back to guide
        </Link>
        <header className={styles.header}>
          <h1 className={styles.title}>Walkthrough</h1>
        </header>
        <section className={styles.walkthroughPanel}>
          <GuideWalkthrough slug={params.slug} />
        </section>
      </main>
    </div>
  );
}
