'use client';

import styles from './Skeleton.module.css';

export function CalendarDaysSkeleton() {
  return (
    <div className={styles.calendarSkeleton}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className={styles.calendarDaySkeleton}>
          <div className={`${styles.skeleton} ${styles.calendarDayName}`} />
          <div className={`${styles.skeleton} ${styles.calendarDayDate}`} />
        </div>
      ))}
    </div>
  );
}

export function CheckinCardSkeleton() {
  return (
    <div className={styles.checkinSkeleton}>
      <div className={styles.checkinLeft}>
        <div className={`${styles.skeleton} ${styles.checkinIcon}`} />
        <div className={`${styles.skeleton} ${styles.checkinText}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.checkinRight}`} />
    </div>
  );
}

export function EventsCarouselSkeleton() {
  return (
    <div className={styles.eventsSkeleton}>
      <div className={styles.eventsTrack}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={styles.eventCardSkeleton}>
            <div className={`${styles.skeleton} ${styles.eventImageSkeleton}`} />
            <div className={styles.eventContentSkeleton}>
              <div className={`${styles.skeleton} ${styles.eventTitleSkeleton}`} />
              <div className={`${styles.skeleton} ${styles.eventDateSkeleton}`} />
              <div className={`${styles.skeleton} ${styles.eventTimeSkeleton}`} />
              <div className={`${styles.skeleton} ${styles.eventDescSkeleton}`} />
              <div className={`${styles.skeleton} ${styles.eventButtonSkeleton}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SurveysSkeleton() {
  return (
    <div className={styles.surveysSkeleton}>
      <div className={`${styles.skeleton} ${styles.surveysTitleSkeleton}`} />
      <div className={styles.surveysGrid}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={styles.surveyCardSkeleton}>
            <div className={`${styles.skeleton} ${styles.surveyIconSkeleton}`} />
            <div className={styles.surveyTitleGroup}>
              <div className={`${styles.skeleton} ${styles.surveyTitleSkeleton}`} />
              <div className={`${styles.skeleton} ${styles.surveyMetaSkeleton}`} />
            </div>
            <div className={`${styles.skeleton} ${styles.surveyButtonSkeleton}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className={styles.dashboardSkeleton}>
      <div className={styles.dashboardScannerSkeleton}>
        <div className={styles.dashboardScannerTop}>
          <div className={`${styles.skeleton} ${styles.dashboardAvatarSkeleton}`} />
          <div className={styles.dashboardScannerTitles}>
            <div className={`${styles.skeleton} ${styles.dashboardScannerTitleSkeleton}`} />
            <div className={`${styles.skeleton} ${styles.dashboardScannerSubSkeleton}`} />
          </div>
        </div>
        <div className={`${styles.skeleton} ${styles.dashboardScannerDescSkeleton}`} />
        <div className={styles.dashboardChipsSkeleton}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.dashboardChipSkeleton}`} />
          ))}
        </div>
        <div className={`${styles.skeleton} ${styles.dashboardScannerButtonSkeleton}`} />
      </div>
      <div className={styles.dashboardTabsSkeleton}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.dashboardTabSkeleton}`} />
        ))}
      </div>
      <div className={`${styles.skeleton} ${styles.dashboardPanelSkeleton}`} />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <>
      <CalendarDaysSkeleton />
      <DashboardSkeleton />
      <CheckinCardSkeleton />
      <SurveysSkeleton />
    </>
  );
}

// ==================== LIBRARY PAGE SKELETONS ====================

export function LibraryTabsSkeleton() {
  return (
    <div className={styles.tabsSkeleton}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`${styles.skeleton} ${styles.tabSkeleton}`} />
      ))}
    </div>
  );
}

export function LibraryBookCardSkeleton() {
  return (
    <div className={styles.bookCardSkeleton}>
      <div className={`${styles.skeleton} ${styles.bookImageSkeleton}`} />
      <div className={styles.bookContentSkeleton}>
        <div className={`${styles.skeleton} ${styles.bookCategorySkeleton}`} />
        <div className={`${styles.skeleton} ${styles.bookTitleSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.bookAuthorSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.bookDescSkeleton}`} />
      </div>
    </div>
  );
}

export function LibraryPageSkeleton() {
  return (
    <div className={styles.libraryPageSkeleton}>
      <LibraryTabsSkeleton />
      <div className={styles.booksGridSkeleton}>
        {[...Array(6)].map((_, i) => (
          <LibraryBookCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ==================== QUESTS PAGE SKELETONS ====================

export function QuestsHeroSkeleton() {
  return (
    <div className={styles.heroSkeleton}>
      <div className={`${styles.skeleton} ${styles.heroEyebrowSkeleton}`} />
      <div className={`${styles.skeleton} ${styles.heroTitleSkeleton}`} />
      <div className={`${styles.skeleton} ${styles.heroSubtitleSkeleton}`} />
      <div className={styles.heroActionsSkeleton}>
        <div className={`${styles.skeleton} ${styles.heroButtonSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.heroButtonSkeleton}`} />
      </div>
    </div>
  );
}

export function QuestCardSkeleton() {
  return (
    <div className={styles.questCardSkeleton}>
      <div className={styles.questCardLeft}>
        <div className={`${styles.skeleton} ${styles.questBadgeSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.questTitleSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.questDescSkeleton}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.questArrowSkeleton}`} />
    </div>
  );
}

export function QuestsMainCardSkeleton() {
  return (
    <div className={styles.mainCardSkeleton}>
      <div className={`${styles.skeleton} ${styles.mainCardAmountSkeleton}`} />
      <div className={`${styles.skeleton} ${styles.mainCardLabelSkeleton}`} />
      <div className={styles.cryptoIconsSkeleton}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.cryptoIconSkeleton}`} />
        ))}
      </div>
    </div>
  );
}

export function QuestsPageSkeleton() {
  return (
    <div className={styles.questsPageSkeleton}>
      <QuestsHeroSkeleton />
      <div className={styles.questsListSkeleton}>
        {[...Array(4)].map((_, i) => (
          <QuestCardSkeleton key={i} />
        ))}
      </div>
      <QuestsMainCardSkeleton />
    </div>
  );
}

// ==================== VOTING PAGE SKELETONS ====================

export function VotingHeroSkeleton() {
  return (
    <div className={styles.votingHeroSkeleton}>
      <div className={styles.votingHeroContentSkeleton}>
        <div className={styles.votingHeroLeftSkeleton}>
          <div className={`${styles.skeleton} ${styles.heroEyebrowSkeleton}`} />
          <div className={`${styles.skeleton} ${styles.heroTitleSkeleton}`} />
          <div className={`${styles.skeleton} ${styles.heroSubtitleSkeleton}`} />
          <div className={styles.heroActionsSkeleton}>
            <div className={`${styles.skeleton} ${styles.heroButtonSkeleton}`} />
            <div className={`${styles.skeleton} ${styles.heroButtonSkeleton}`} />
          </div>
        </div>
        <div className={styles.votingHeroRightSkeleton}>
          <div className={styles.statCardSkeleton}>
            <div className={`${styles.skeleton} ${styles.statLabelSkeleton}`} />
            <div className={`${styles.skeleton} ${styles.statValueSkeleton}`} />
          </div>
          <div className={styles.statCardSkeleton}>
            <div className={`${styles.skeleton} ${styles.statLabelSkeleton}`} />
            <div className={`${styles.skeleton} ${styles.statValueSkeleton}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VotingBannerSkeleton() {
  return (
    <div className={`${styles.skeleton} ${styles.bannerImageSkeleton}`} />
  );
}

export function ProposalCardSkeleton() {
  return (
    <div className={styles.proposalCardSkeleton}>
      <div className={styles.proposalHeaderSkeleton}>
        <div className={`${styles.skeleton} ${styles.proposalTitleSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.proposalStatusSkeleton}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.proposalBodySkeleton}`} />
      <div className={styles.proposalFooterSkeleton}>
        <div className={`${styles.skeleton} ${styles.proposalMetaSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.proposalButtonSkeleton}`} />
      </div>
    </div>
  );
}

export function VotingPageSkeleton() {
  return (
    <div className={styles.votingPageSkeleton}>
      <VotingHeroSkeleton />
      <VotingBannerSkeleton />
      <div className={styles.proposalsGridSkeleton}>
        {[...Array(3)].map((_, i) => (
          <ProposalCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ==================== DAEMON PAGE SKELETONS ====================

export function DaemonToolCardSkeleton() {
  return (
    <div className={styles.daemonToolCardSkeleton}>
      <div className={`${styles.skeleton} ${styles.daemonToolIconSkeleton}`} />
      <div className={`${styles.skeleton} ${styles.daemonToolTitleSkeleton}`} />
      <div className={`${styles.skeleton} ${styles.daemonToolDescSkeleton}`} />
    </div>
  );
}

export function DaemonPageSkeleton() {
  return (
    <div className={styles.daemonPageSkeleton}>
      <div className={styles.daemonTerminalSkeleton}>
        <div className={styles.daemonHeaderSkeleton}>
          <div className={styles.daemonDotsSkeleton}>
            <div className={`${styles.skeleton} ${styles.daemonDotSkeleton}`} />
            <div className={`${styles.skeleton} ${styles.daemonDotSkeleton}`} />
            <div className={`${styles.skeleton} ${styles.daemonDotSkeleton}`} />
          </div>
          <div className={`${styles.skeleton} ${styles.daemonHeaderTitleSkeleton}`} />
          <div style={{ width: 56 }} />
        </div>
        <div className={styles.daemonToolGridSkeleton}>
          {[...Array(4)].map((_, i) => (
            <DaemonToolCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== LIVESTREAM PAGE SKELETONS ====================

export function LivestreamVideoSkeleton() {
  return (
    <div className={styles.livestreamVideoSkeleton}>
      <div className={`${styles.skeleton} ${styles.livestreamVideoPlayerSkeleton}`} />
      <div className={styles.livestreamVideoInfoSkeleton}>
        <div className={styles.livestreamVideoTitleRowSkeleton}>
          <div className={`${styles.skeleton} ${styles.livestreamTitleSkeleton}`} />
          <div className={`${styles.skeleton} ${styles.livestreamLiveBadgeSkeleton}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.livestreamHostSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.livestreamDescSkeleton}`} />
        <div className={styles.livestreamTagsSkeleton}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.livestreamTagSkeleton}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LivestreamChatSkeleton() {
  return (
    <div className={styles.livestreamChatSkeleton}>
      <div className={`${styles.skeleton} ${styles.livestreamChatHeaderSkeleton}`} />
      <div className={styles.livestreamChatMessagesSkeleton}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={styles.livestreamChatMessageSkeleton}>
            <div className={`${styles.skeleton} ${styles.livestreamChatAvatarSkeleton}`} />
            <div className={styles.livestreamChatContentSkeleton}>
              <div className={`${styles.skeleton} ${styles.livestreamChatUsernameSkeleton}`} />
              <div className={`${styles.skeleton} ${styles.livestreamChatTextSkeleton}`} />
            </div>
          </div>
        ))}
      </div>
      <div className={`${styles.skeleton} ${styles.livestreamChatInputSkeleton}`} />
    </div>
  );
}

export function LivestreamUpcomingCardSkeleton() {
  return (
    <div className={styles.livestreamUpcomingCardSkeleton}>
      <div className={styles.livestreamUpcomingTimeSkeleton}>
        <div className={`${styles.skeleton} ${styles.livestreamUpcomingDaySkeleton}`} />
        <div className={`${styles.skeleton} ${styles.livestreamUpcomingHourSkeleton}`} />
      </div>
      <div className={styles.livestreamUpcomingInfoSkeleton}>
        <div className={`${styles.skeleton} ${styles.livestreamUpcomingTitleSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.livestreamUpcomingDescSkeleton}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.livestreamUpcomingButtonSkeleton}`} />
    </div>
  );
}

export function LivestreamPageSkeleton() {
  return (
    <div className={styles.livestreamPageSkeleton}>
      <div className={styles.livestreamHeroSkeleton}>
        <div className={`${styles.skeleton} ${styles.livestreamEyebrowSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.livestreamPageTitleSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.livestreamSubtitleSkeleton}`} />
      </div>
      <div className={styles.livestreamStreamContainerSkeleton}>
        <LivestreamVideoSkeleton />
        <LivestreamChatSkeleton />
      </div>
      <div className={styles.livestreamUpcomingSkeleton}>
        <div className={`${styles.skeleton} ${styles.livestreamSectionTitleSkeleton}`} />
        <div className={styles.livestreamUpcomingGridSkeleton}>
          {[...Array(3)].map((_, i) => (
            <LivestreamUpcomingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== SURVEYS PAGE SKELETONS ====================

export function SurveyTaskCardSkeleton() {
  return (
    <div className={styles.surveyTaskCardSkeleton}>
      <div className={styles.surveyTaskHeaderSkeleton}>
        <div className={`${styles.skeleton} ${styles.surveyTaskTitleSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.surveyTaskCopyButtonSkeleton}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.surveyTaskTextSkeleton}`} />
      <div className={styles.surveyTaskFooterSkeleton}>
        <div className={`${styles.skeleton} ${styles.surveyTaskSubmitterSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.surveyTaskViewButtonSkeleton}`} />
      </div>
      <div className={styles.surveyTaskActionBarSkeleton}>
        <div className={styles.surveyTaskStarsSkeleton}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.surveyTaskStarSkeleton}`} />
          ))}
        </div>
        <div className={`${styles.skeleton} ${styles.surveyTaskSaveButtonSkeleton}`} />
      </div>
    </div>
  );
}

export function SurveysPageSkeleton() {
  return (
    <div className={styles.surveysPageSkeleton}>
      <div className={styles.surveysHeroSkeleton}>
        <div className={`${styles.skeleton} ${styles.surveysEyebrowSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.surveysTitleSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.surveysSubtitleSkeleton}`} />
      </div>
      <div className={styles.surveysFilterSkeleton}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.surveysFilterTabSkeleton}`} />
        ))}
      </div>
      <div className={styles.surveysGridSkeleton}>
        {[...Array(6)].map((_, i) => (
          <SurveyTaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
