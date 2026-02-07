import Image from 'next/image';
import styles from './FeaturesSection.module.css';

const features = [
  {
    icon: '/icons/4b31ae03-5c43-4b80-9526-730a6b5a6c09 1.png',
    title: 'Intellectual Refreshment',
    description: 'Weekly workshops, writing exercises, and guided tasks designed to help you process, reflect, and grow at your own pace.',
  },
  {
    icon: '/icons/c4c15e74-d725-4715-8000-edd05808a0ed 1.png',
    title: 'Quests & Learning',
    description: 'Complete interactive quests, earn rewards, and build your mental wealth through gamified education experiences.',
  },
  {
    icon: '/icons/f36a4cca-81ba-4103-8cf1-114190d63f4c 1.png',
    title: 'Connect In New Ways',
    description: 'Reach out whenever you need it. Our team is just a text away to help you through the hard moments.',
  },
  {
    icon: '/icons/f619761a-7a68-4cc2-ab38-bbc05ba27486 1.png',
    title: 'Collaborative Ecosystem',
    description: 'Participate in transparent decision-making to fund research and shape the future of mental health care.',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section className={styles.featuresSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Connect with some of the brightest minds across the world
          </h2>
          <p className={styles.description}>
            Feeling lost? Not sure what&apos;s next? You&apos;re not alone. We built this for the ones still figuring it out, because clarity comes from connection.
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureItem}>
              <div className={styles.iconWrapper}>
                <Image
                  src={feature.icon}
                  alt={feature.title}
                  width={80}
                  height={120}
                  className={styles.icon}
                />
              </div>
              <div className={styles.content}>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
