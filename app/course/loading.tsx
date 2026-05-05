import SideNavigation from '@/components/side-navigation/SideNavigation';
import LottieLoader from '@/components/lottie-loader/LottieLoader';
import styles from './loading.module.css';

export default function CourseLoading() {
  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.page}>
        <div className={styles.loaderCard}>
          <LottieLoader
            src="/loaders/Book%20loading.lottie"
            label="Loading course"
          />
        </div>
      </main>
    </div>
  );
}
