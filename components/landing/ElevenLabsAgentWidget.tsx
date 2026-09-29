'use client';

import { useEffect, useState } from 'react';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

const SCRIPT_ID = 'elevenlabs-convai-embed';
const BLUE_AGENT_ID = 'agent_9801kx535dzwefxar95qgenx5a7z';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id'?: string;
      };
    }
  }
}

/**
 * Floating voice-chat widget for Blue's ElevenLabs agent. Renders the
 * collapsed orb bottom-right on desktop; disabled on mobile screens.
 */
export function ElevenLabsAgentWidget() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth > 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    if (document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    document.body.appendChild(script);
  }, [isDesktop]);

  if (!isDesktop) return null;

  return <elevenlabs-convai agent-id={BLUE_AGENT_ID} />;
}

export default ElevenLabsAgentWidget;
