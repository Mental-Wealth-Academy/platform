import React from 'react';
import Image from 'next/image';
import blueStyles from '@/components/blue-chat/BlueChat.module.css';
import pageStyles from './page.module.css';

export default function ChatLoading() {
  return (
    <div className={pageStyles.pageLayout}>
      <main className={pageStyles.content}>
        <div className={`${blueStyles.chatContainer} ${blueStyles.chatContainerFullPage}`}>
          <div className={blueStyles.compactTopBar}>
            <div className={blueStyles.compactTopBarBrand}>
              <Image
                src="/blue/blue-home.png"
                alt=""
                width={40}
                height={40}
                className={blueStyles.compactTopBarFace}
                unoptimized
              />
              <span className={blueStyles.compactTopBarName}>Blue</span>
            </div>
          </div>
          <div
            className={blueStyles.messagesArea}
            aria-busy="true"
            aria-label="Loading chat"
            style={{ opacity: 0.6 }}
          />
        </div>
      </main>
    </div>
  );
}
