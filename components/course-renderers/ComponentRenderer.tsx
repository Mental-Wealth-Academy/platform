'use client';

import dynamic from 'next/dynamic';
import type { CourseComponentRecord } from '@/lib/vip-course-db';
import styles from './ComponentRenderer.module.css';

const RichTextRenderer = dynamic(() => import('./RichTextRenderer'), { ssr: false });
const MultipleChoiceRenderer = dynamic(() => import('./MultipleChoiceRenderer'), { ssr: false });
const MediaEmbedRenderer = dynamic(() => import('./MediaEmbedRenderer'), { ssr: false });
const ImageEmbedRenderer = dynamic(() => import('./ImageEmbedRenderer'), { ssr: false });
const VideoEmbedRenderer = dynamic(() => import('./VideoEmbedRenderer'), { ssr: false });
const FileUploadRenderer = dynamic(() => import('./FileUploadRenderer'), { ssr: false });
const TextInputRenderer = dynamic(() => import('./TextInputRenderer'), { ssr: false });
const RatingScaleRenderer = dynamic(() => import('./RatingScaleRenderer'), { ssr: false });
const ReflectionJournalRenderer = dynamic(() => import('./ReflectionJournalRenderer'), { ssr: false });
const QuizBlockRenderer = dynamic(() => import('./QuizBlockRenderer'), { ssr: false });
const NftGateRenderer = dynamic(() => import('./NftGateRenderer'), { ssr: false });

type RendererProps = {
  component: CourseComponentRecord;
  onComponentUpdate?: (updates: Partial<CourseComponentRecord>) => void;
  grading?: { courseId: string; blockId: string };
};

const RENDERER_MAP: Record<string, React.ComponentType<RendererProps>> = {
  rich_text: RichTextRenderer as React.ComponentType<RendererProps>,
  multiple_choice: MultipleChoiceRenderer as React.ComponentType<RendererProps>,
  media_embed: MediaEmbedRenderer as React.ComponentType<RendererProps>,
  image_embed: ImageEmbedRenderer as React.ComponentType<RendererProps>,
  video_embed: VideoEmbedRenderer as React.ComponentType<RendererProps>,
  file_upload: FileUploadRenderer as React.ComponentType<RendererProps>,
  text_input: TextInputRenderer as React.ComponentType<RendererProps>,
  rating_scale: RatingScaleRenderer as React.ComponentType<RendererProps>,
  reflection_journal: ReflectionJournalRenderer as React.ComponentType<RendererProps>,
  quiz_block: QuizBlockRenderer as React.ComponentType<RendererProps>,
  nft_gate: NftGateRenderer as React.ComponentType<RendererProps>,
};

export default function ComponentRenderer({
  component,
  onComponentUpdate,
  courseId,
}: {
  component: CourseComponentRecord;
  onComponentUpdate?: (updates: Partial<CourseComponentRecord>) => void;
  courseId?: string;
}) {
  // Container mission — render each block
  if (component.componentType === 'mission_container') {
    const blocks = component.blocks || [];
    return (
      <div className={styles.container}>
        {blocks.map((block) => {
          const BlockRenderer = RENDERER_MAP[block.blockType];
          if (!BlockRenderer) return null;
          // Adapt the block to look like a component for the renderer
          const blockAsComponent: CourseComponentRecord = {
            ...component,
            componentType: block.blockType as any,
            config: block.config,
            title: '',
            blocks: [],
          };
          return (
            <div key={block.id} className={styles.blockWrapper}>
              <BlockRenderer
                component={blockAsComponent}
                onComponentUpdate={onComponentUpdate}
                grading={courseId ? { courseId, blockId: block.id } : undefined}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Single-type component (legacy or non-container)
  const Renderer = RENDERER_MAP[component.componentType];
  if (!Renderer) return null;
  return (
    <Renderer
      component={component}
      onComponentUpdate={onComponentUpdate}
      grading={courseId ? { courseId, blockId: component.id } : undefined}
    />
  );
}
