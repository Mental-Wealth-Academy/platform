import SideNavigation from '@/components/side-navigation/SideNavigation';
import LottieLoader from '@/components/lottie-loader/LottieLoader';
import styles from '../home/loading.module.css';

export default function QuestsLoading() {
  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
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
