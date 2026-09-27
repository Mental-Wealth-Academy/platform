import BlueRadio from './BlueRadio';
import manifest from '@/lib/blue-radio-manifest.json';
import styles from './BlueScene.module.css';

export default function LivestreamFeed({
  gardenBackground,
  headerControlsTarget,
}: {
  gardenBackground: string;
  headerControlsTarget?: HTMLDivElement | null;
}) {
  const streamUrl = process.env.NEXT_PUBLIC_LIVESTREAM_EMBED_URL?.trim();
  const hasBroadcast = Array.isArray(manifest.segments) && manifest.segments.length > 0;

  return (
    <div className={styles.liveFeed}>
      {streamUrl ? (
        <iframe
          className={styles.liveFrame}
          src={streamUrl}
          title="Mental Wealth Academy live session"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : hasBroadcast ? (
        <BlueRadio gardenBackground={gardenBackground} headerControlsTarget={headerControlsTarget} />
      ) : (
        <div className={styles.offlineState}>
          <span className={styles.offlineIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M17 10.5V7C17 6.45 16.55 6 16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="currentColor" />
              <circle cx="8" cy="12" r="2" fill="currentColor" opacity="0.4" />
            </svg>
          </span>
          <h2 className={styles.offlineTitle}>We&apos;ll be back shortly :)</h2>
          <p className={styles.offlineText}>Gather your thoughts and your notebooks and relax</p>
        </div>
      )}
    </div>
  );
}
