import { GuideArticleSkeleton, GuideDetailsSkeleton } from './GuideSkeleton';
import frame from './page.module.css';

/**
 * Route-level loader for the DAG guide article page (/learn/guides/[slug] and
 * /home/guides/[slug]). It borrows the loaded page's own frame classes — outer
 * gutter, panel, header band, details rail — so the hand-off to the real page
 * changes only the contents, never the layout.
 */
export default function GuideLoading() {
  return (
    <div className={frame.layout} aria-busy="true" aria-label="Loading guide">
      <div className={frame.scene} aria-hidden="true" />
      <div className={frame.guideWrapper}>
        <div className={frame.guideLayout}>
          <div className={frame.globalPanel}>
            <div className={frame.panelHeader}>
              <span className={frame.panelTitleJa}>知識</span>
              <span className={frame.panelTitle}>Learn anything</span>
            </div>
            <GuideArticleSkeleton />
          </div>
          <GuideDetailsSkeleton />
        </div>
      </div>
    </div>
  );
}
