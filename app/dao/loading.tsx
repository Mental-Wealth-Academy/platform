import HomeLoader from '@/components/home-bento/HomeLoader';
import styles from './loading.module.css';

export default function DaoLoading() {
  return (
    <div className={styles.pageLayout}>
      <main className={styles.page}>
        <HomeLoader />
      </main>
    </div>
  );
}
