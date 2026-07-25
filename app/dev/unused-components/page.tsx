'use client';

import React, { Component, ReactNode, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

interface ErrorBoundaryProps {
  name: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ComponentCardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn(`Error rendering ${this.props.name}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorState}>
          <strong>Render Error in {this.props.name}:</strong>
          <br />
          {this.state.error?.message || 'Unknown error during render'}
        </div>
      );
    }
    return this.props.children;
  }
}

function ShowcaseCard({
  title,
  path,
  children,
}: {
  title: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <span className={styles.cardPath}>{path}</span>
      </div>
      <div className={styles.cardBody}>
        <ComponentCardErrorBoundary name={title}>{children}</ComponentCardErrorBoundary>
      </div>
    </div>
  );
}

// ── 9 KEPT DEPRECATED COMPONENTS ──
const OrbitalDiagram = dynamic(() => import('@/components/landing/OrbitalDiagram'), { ssr: false });
const EcosystemSection = dynamic(() => import('@/components/landing/EcosystemSection'), { ssr: false });
const KeyFiguresSection = dynamic(() => import('@/components/landing/KeyFiguresSection'), { ssr: false });
const MagazineSection = dynamic(() => import('@/components/landing/MagazineSection'), { ssr: false });
const ShardsAltar = dynamic(() => import('@/components/landing/ShardsAltar'), { ssr: false });
const GeneticsChat = dynamic(() => import('@/components/genetics/GeneticsChat').then(m => m.GeneticsChat), { ssr: false });
const ResultsDisplay = dynamic(() => import('@/components/genetics/ResultsDisplay').then(m => m.ResultsDisplay), { ssr: false });
const SNPBrowser = dynamic(() => import('@/components/genetics/SNPBrowser').then(m => m.SNPBrowser), { ssr: false });
const BookCard = dynamic(() => import('@/components/book-card/BookCard'), { ssr: false });

const AngelUpsellModal = dynamic(() => import('@/components/angel-upsell-modal/AngelUpsellModal'), { ssr: false });
const AcademyAccessGate = dynamic(() => import('@/components/auth/AcademyAccessGate'), { ssr: false });
const AvatarSelectorModal = dynamic(() => import('@/components/avatar-selector/AvatarSelectorModal'), { ssr: false });
const Banner = dynamic(() => import('@/components/banner/Banner'), { ssr: false });
const ScrollingBanner = dynamic(() => import('@/components/banner/ScrollingBanner'), { ssr: false });
const BlockchainAccountModal = dynamic(() => import('@/components/blockchain-account/BlockchainAccountModal').then(m => m.BlockchainAccountModal), { ssr: false });
const BlueCallingOverlay = dynamic(() => import('@/components/blue-calling-overlay/BlueCallingOverlay'), { ssr: false });
const BlueChat = dynamic(() => import('@/components/blue-chat/BlueChat'), { ssr: false });
const GuideCardsInline = dynamic(() => import('@/components/blue-chat/GuideCardsInline'), { ssr: false });
const ListsPanel = dynamic(() => import('@/components/blue-chat/ListsPanel'), { ssr: false });
const QuestForgeInline = dynamic(() => import('@/components/blue-chat/QuestForgeInline'), { ssr: false });
const BlueChatBubble = dynamic(() => import('@/components/blue-chat-bubble/BlueChatBubble'), { ssr: false });
const BlueDialogue = dynamic(() => import('@/components/blue-dialogue/BlueDialogue'), { ssr: false });
const BlueRadio = dynamic(() => import('@/components/blue-scene/BlueRadio'), { ssr: false });
const BlueTerminal = dynamic(() => import('@/components/blue-terminal/BlueTerminal'), { ssr: false });
const BookReaderModal = dynamic(() => import('@/components/book-reader/BookReaderModal'), { ssr: false });
const Button = dynamic(() => import('@/components/button/Button'), { ssr: false });
const ChatRoom = dynamic(() => import('@/components/chat-room/ChatRoom'), { ssr: false });
const ComponentRenderer = dynamic(() => import('@/components/course-renderers/ComponentRenderer'), { ssr: false });
const FileUploadRenderer = dynamic(() => import('@/components/course-renderers/FileUploadRenderer'), { ssr: false });
const ImageEmbedRenderer = dynamic(() => import('@/components/course-renderers/ImageEmbedRenderer'), { ssr: false });
const MediaEmbedRenderer = dynamic(() => import('@/components/course-renderers/MediaEmbedRenderer'), { ssr: false });
const MultipleChoiceRenderer = dynamic(() => import('@/components/course-renderers/MultipleChoiceRenderer'), { ssr: false });
const NftGateRenderer = dynamic(() => import('@/components/course-renderers/NftGateRenderer'), { ssr: false });
const QuizBlockRenderer = dynamic(() => import('@/components/course-renderers/QuizBlockRenderer'), { ssr: false });
const RatingScaleRenderer = dynamic(() => import('@/components/course-renderers/RatingScaleRenderer'), { ssr: false });
const ReflectionJournalRenderer = dynamic(() => import('@/components/course-renderers/ReflectionJournalRenderer'), { ssr: false });
const RichTextRenderer = dynamic(() => import('@/components/course-renderers/RichTextRenderer'), { ssr: false });
const TextInputRenderer = dynamic(() => import('@/components/course-renderers/TextInputRenderer'), { ssr: false });
const VideoEmbedRenderer = dynamic(() => import('@/components/course-renderers/VideoEmbedRenderer'), { ssr: false });
const ComponentConfigEditor = dynamic(() => import('@/components/course-studio/ComponentConfigEditor'), { ssr: false });
const ComponentPalette = dynamic(() => import('@/components/course-studio/ComponentPalette'), { ssr: false });
const ComponentPanel = dynamic(() => import('@/components/course-studio/ComponentPanel'), { ssr: false });
const CourseBuilderTour = dynamic(() => import('@/components/course-studio/CourseBuilderTour'), { ssr: false });
const CoursePreview = dynamic(() => import('@/components/course-studio/CoursePreview'), { ssr: false });
const CourseStudioModal = dynamic(() => import('@/components/course-studio/CourseStudioModal'), { ssr: false });
const GuideStudio = dynamic(() => import('@/components/course-studio/GuideStudio'), { ssr: false });
const MissionEditor = dynamic(() => import('@/components/course-studio/MissionEditor'), { ssr: false });
const MultipleChoiceEditor = dynamic(() => import('@/components/course-studio/MultipleChoiceEditor'), { ssr: false });
const ReadingEditor = dynamic(() => import('@/components/course-studio/ReadingEditor'), { ssr: false });
const CyberpunkDataViz = dynamic(() => import('@/components/cyberpunk-data-viz/CyberpunkDataViz'), { ssr: false });
const DailyNotes = dynamic(() => import('@/components/daily-notes/DailyNotes'), { ssr: false });
const Dashboard = dynamic(() => import('@/components/dashboard/Dashboard'), { ssr: false });
const DotmSquare15 = dynamic(() => import('@/components/dot-matrix/DotmSquare15').then(m => m.DotmSquare15), { ssr: false });
const CtaButton = dynamic(() => import('@/components/shared/CtaButton'), { ssr: false });
const HolographicFolder = dynamic(() => import('@/components/shared/HolographicFolder'), { ssr: false });
const HoverSlideText = dynamic(() => import('@/components/shared/HoverSlideText'), { ssr: false });

export default function ComponentShowcasePage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Components (59)' },
    { id: 'kept', label: 'Kept Deprecated (9)' },
    { id: 'blue', label: 'Blue Agent & AI (10)' },
    { id: 'renderers', label: 'Course Renderers & Studio (20)' },
    { id: 'modals', label: 'Modals & Gates (8)' },
    { id: 'ui', label: 'UI Controls & Cards (12)' },
  ];

  const showCategory = (cat: string) => activeCategory === 'all' || activeCategory === cat;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Component Design System & Showcase</h1>
        <p className={styles.subtitle}>
          Interactive gallery featuring 9 preserved components and 50 active system components.
        </p>
        <div className={styles.metaBar}>
          <span className={styles.badge}>59 Components Showcase</span>
          <span className={styles.badge}>49 Deprecated Components Removed</span>
          <span className={styles.badge}>Isolated Error Boundaries</span>
        </div>
      </header>

      <nav className={styles.navTabs}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`${styles.tabBtn} ${activeCategory === cat.id ? styles.tabBtnActive : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      {/* KEPT DEPRECATED COMPONENTS */}
      {showCategory('kept') && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Kept Deprecated Components
            <span className={styles.sectionCount}>(9 components)</span>
          </h2>
          <div className={styles.grid}>
            <ShowcaseCard title="OrbitalDiagram" path="components/landing/OrbitalDiagram.tsx">
              <OrbitalDiagram />
            </ShowcaseCard>
            <ShowcaseCard title="EcosystemSection" path="components/landing/EcosystemSection.tsx">
              <EcosystemSection />
            </ShowcaseCard>
            <ShowcaseCard title="KeyFiguresSection" path="components/landing/KeyFiguresSection.tsx">
              <KeyFiguresSection />
            </ShowcaseCard>
            <ShowcaseCard title="MagazineSection" path="components/landing/MagazineSection.tsx">
              <MagazineSection />
            </ShowcaseCard>
            <ShowcaseCard title="ShardsAltar" path="components/landing/ShardsAltar.tsx">
              <ShardsAltar />
            </ShowcaseCard>
            <ShowcaseCard title="GeneticsChat" path="components/genetics/GeneticsChat.tsx">
              <GeneticsChat matches={[]} genosets={[]} />
            </ShowcaseCard>
            <ShowcaseCard title="ResultsDisplay" path="components/genetics/ResultsDisplay.tsx">
              <ResultsDisplay matches={[]} genosets={[]} />
            </ShowcaseCard>
            <ShowcaseCard title="SNPBrowser" path="components/genetics/SNPBrowser.tsx">
              <SNPBrowser workerApi={{} as any} />
            </ShowcaseCard>
            <ShowcaseCard title="BookCard" path="components/book-card/BookCard.tsx">
              <BookCard title="The Sovereign Individual" author="Davidson" />
            </ShowcaseCard>
          </div>
        </section>
      )}

      {/* BLUE AGENT & AI */}
      {showCategory('blue') && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Blue Agent & Communication
            <span className={styles.sectionCount}>(10 components)</span>
          </h2>
          <div className={styles.grid}>
            <ShowcaseCard title="BlueDialogue" path="components/blue-dialogue/BlueDialogue.tsx">
              <BlueDialogue open={true} lines={['Welcome back.']} onClose={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="BlueChatBubble" path="components/blue-chat-bubble/BlueChatBubble.tsx">
              <BlueChatBubble message="Blue agent active." />
            </ShowcaseCard>
            <ShowcaseCard title="BlueCallingOverlay" path="components/blue-calling-overlay/BlueCallingOverlay.tsx">
              <BlueCallingOverlay onAccept={() => {}} onDecline={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="BlueTerminal" path="components/blue-terminal/BlueTerminal.tsx">
              <BlueTerminal />
            </ShowcaseCard>
            <ShowcaseCard title="BlueRadio" path="components/blue-scene/BlueRadio.tsx">
              <BlueRadio gardenBackground="/images/bg.jpg" />
            </ShowcaseCard>
            <ShowcaseCard title="BlueChat" path="components/blue-chat/BlueChat.tsx">
              <BlueChat isOpen={true} onClose={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="GuideCardsInline" path="components/blue-chat/GuideCardsInline.tsx">
              <GuideCardsInline cards={[]} />
            </ShowcaseCard>
            <ShowcaseCard title="ListsPanel" path="components/blue-chat/ListsPanel.tsx">
              <ListsPanel authHeaders={async () => ({})} isAuthenticated={true} />
            </ShowcaseCard>
            <ShowcaseCard title="QuestForgeInline" path="components/blue-chat/QuestForgeInline.tsx">
              <QuestForgeInline isBusy={false} draft={null} draftNonce={1} creditBalance={100} onSubmit={() => {}} onClose={() => {}} />
            </ShowcaseCard>
          </div>
        </section>
      )}

      {/* COURSE RENDERERS & STUDIO */}
      {showCategory('renderers') && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Course Renderers & Studio Editors
            <span className={styles.sectionCount}>(20 components)</span>
          </h2>
          <div className={styles.grid}>
            <ShowcaseCard title="ComponentRenderer" path="components/course-renderers/ComponentRenderer.tsx">
              <ComponentRenderer component={{ id: '1', block_type: 'rich_text', config: { text: 'Sample Block' } } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="RichTextRenderer" path="components/course-renderers/RichTextRenderer.tsx">
              <RichTextRenderer component={{ id: '1', block_type: 'rich_text', config: { text: 'Rich Text' } } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="MultipleChoiceRenderer" path="components/course-renderers/MultipleChoiceRenderer.tsx">
              <MultipleChoiceRenderer component={{ id: '1', block_type: 'multiple_choice', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="QuizBlockRenderer" path="components/course-renderers/QuizBlockRenderer.tsx">
              <QuizBlockRenderer component={{ id: '1', block_type: 'quiz_block', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="RatingScaleRenderer" path="components/course-renderers/RatingScaleRenderer.tsx">
              <RatingScaleRenderer component={{ id: '1', block_type: 'rating_scale', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="ReflectionJournalRenderer" path="components/course-renderers/ReflectionJournalRenderer.tsx">
              <ReflectionJournalRenderer component={{ id: '1', block_type: 'reflection_journal', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="TextInputRenderer" path="components/course-renderers/TextInputRenderer.tsx">
              <TextInputRenderer component={{ id: '1', block_type: 'text_input', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="VideoEmbedRenderer" path="components/course-renderers/VideoEmbedRenderer.tsx">
              <VideoEmbedRenderer component={{ id: '1', block_type: 'video_embed', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="FileUploadRenderer" path="components/course-renderers/FileUploadRenderer.tsx">
              <FileUploadRenderer component={{ id: '1', block_type: 'file_upload', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="ImageEmbedRenderer" path="components/course-renderers/ImageEmbedRenderer.tsx">
              <ImageEmbedRenderer component={{ id: '1', block_type: 'image_embed', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="MediaEmbedRenderer" path="components/course-renderers/MediaEmbedRenderer.tsx">
              <MediaEmbedRenderer component={{ id: '1', block_type: 'media_embed', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="NftGateRenderer" path="components/course-renderers/NftGateRenderer.tsx">
              <NftGateRenderer component={{ id: '1', block_type: 'nft_gate', config: {} } as any} />
            </ShowcaseCard>
            <ShowcaseCard title="ComponentConfigEditor" path="components/course-studio/ComponentConfigEditor.tsx">
              <ComponentConfigEditor componentType="rich_text" config={{}} onUpdate={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="ComponentPalette" path="components/course-studio/ComponentPalette.tsx">
              <ComponentPalette onAddComponent={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="ComponentPanel" path="components/course-studio/ComponentPanel.tsx">
              <ComponentPanel weeks={[]} selectedWeekId="1" onSelectWeek={() => {}} onAddWeek={() => {}} onDeleteWeek={() => {}} onUpdateWeek={() => {}} missions={[]} selectedMissionId={null} onSelectMission={() => {}} onDeleteMission={() => {}} onAddBlankMission={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="CourseBuilderTour" path="components/course-studio/CourseBuilderTour.tsx">
              <CourseBuilderTour />
            </ShowcaseCard>
            <ShowcaseCard title="CoursePreview" path="components/course-studio/CoursePreview.tsx">
              <CoursePreview weeks={[]} readingByWeek={{}} />
            </ShowcaseCard>
            <ShowcaseCard title="CourseStudioModal" path="components/course-studio/CourseStudioModal.tsx">
              <CourseStudioModal authHeaders={async () => ({})} onClose={() => {}} onCourseCreated={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="GuideStudio" path="components/course-studio/GuideStudio.tsx">
              <GuideStudio authHeaders={async () => ({})} onExit={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="MissionEditor" path="components/course-studio/MissionEditor.tsx">
              <MissionEditor component={{ id: '1', block_type: 'rich_text', config: {} } as any} onUpdate={() => {}} onDelete={() => {}} />
            </ShowcaseCard>
          </div>
        </section>
      )}

      {/* MODALS & GATES */}
      {showCategory('modals') && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Modals & Access Gates
            <span className={styles.sectionCount}>(8 components)</span>
          </h2>
          <div className={styles.grid}>
            <ShowcaseCard title="AngelUpsellModal" path="components/angel-upsell-modal/AngelUpsellModal.tsx">
              <AngelUpsellModal isOpen={true} onClose={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="AcademyAccessGate" path="components/auth/AcademyAccessGate.tsx">
              <AcademyAccessGate>Protected Content</AcademyAccessGate>
            </ShowcaseCard>
            <ShowcaseCard title="AvatarSelectorModal" path="components/avatar-selector/AvatarSelectorModal.tsx">
              <AvatarSelectorModal onClose={() => {}} onAvatarSelected={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="BlockchainAccountModal" path="components/blockchain-account/BlockchainAccountModal.tsx">
              <BlockchainAccountModal isOpen={true} onClose={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="BookReaderModal" path="components/book-reader/BookReaderModal.tsx">
              <BookReaderModal isOpen={true} onClose={() => {}} title="Book Title" markdownPath="/path" slug="book-slug" />
            </ShowcaseCard>
            <ShowcaseCard title="ChatRoom" path="components/chat-room/ChatRoom.tsx">
              <ChatRoom />
            </ShowcaseCard>
          </div>
        </section>
      )}

      {/* UI CONTROLS & CARDS */}
      {showCategory('ui') && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            UI Controls & System Primitives
            <span className={styles.sectionCount}>(12 components)</span>
          </h2>
          <div className={styles.grid}>
            <ShowcaseCard title="Button" path="components/button/Button.tsx">
              <Button>Click Me</Button>
            </ShowcaseCard>
            <ShowcaseCard title="CtaButton" path="components/shared/CtaButton.tsx">
              <CtaButton>Action Button</CtaButton>
            </ShowcaseCard>
            <ShowcaseCard title="HolographicFolder" path="components/shared/HolographicFolder.tsx">
              <HolographicFolder label="Folder" fileAlt="folder" fileHeight={100} fileWidth={100} fileSrc="/images/folder.png" />
            </ShowcaseCard>
            <ShowcaseCard title="HoverSlideText" path="components/shared/HoverSlideText.tsx">
              <HoverSlideText>Hover Text</HoverSlideText>
            </ShowcaseCard>
            <ShowcaseCard title="Banner" path="components/banner/Banner.tsx">
              <Banner />
            </ShowcaseCard>
            <ShowcaseCard title="ScrollingBanner" path="components/banner/ScrollingBanner.tsx">
              <ScrollingBanner onClick={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="CyberpunkDataViz" path="components/cyberpunk-data-viz/CyberpunkDataViz.tsx">
              <CyberpunkDataViz />
            </ShowcaseCard>
            <ShowcaseCard title="DailyNotes" path="components/daily-notes/DailyNotes.tsx">
              <DailyNotes />
            </ShowcaseCard>
            <ShowcaseCard title="Dashboard" path="components/dashboard/Dashboard.tsx">
              <Dashboard />
            </ShowcaseCard>
            <ShowcaseCard title="DotmSquare15" path="components/dot-matrix/DotmSquare15.tsx">
              <DotmSquare15 />
            </ShowcaseCard>
            <ShowcaseCard title="MultipleChoiceEditor" path="components/course-studio/MultipleChoiceEditor.tsx">
              <MultipleChoiceEditor config={{} as any} onUpdate={() => {}} />
            </ShowcaseCard>
            <ShowcaseCard title="ReadingEditor" path="components/course-studio/ReadingEditor.tsx">
              <ReadingEditor content="" onSave={() => {}} onClose={() => {}} />
            </ShowcaseCard>
          </div>
        </section>
      )}
    </div>
  );
}
