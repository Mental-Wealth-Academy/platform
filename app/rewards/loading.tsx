import LottieLoader from '@/components/lottie-loader/LottieLoader';
import styles from '../dao/loading.module.css';

export default function RewardsLoading() {
  return (
    <div className={styles.pageLayout}>
      <main className={styles.page}>
        <div className={styles.loaderCard}>
          <LottieLoader
            src="/loaders/Treasure%20Chest.lottie"
            label="Loading quests"
          />
        </div>
      </main>
    </div>
  );
}
