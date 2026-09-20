import React from 'react';
import chatStyles from '@/components/chat-room/ChatRoom.module.css';
import pageStyles from './page.module.css';

export default function ChatLoading() {
  return (
    <div className={pageStyles.pageLayout}>
      <main className={pageStyles.content}>
        <div className={`${chatStyles.chatRoom} ${chatStyles.chatRoomFullPage}`}>
          <div className={chatStyles.chatHeader}>
            <span className={chatStyles.chatTitle}>
              <span className={chatStyles.chatTitleJa}>連携</span> Global Chat
            </span>
          </div>

          <div className={chatStyles.chatList}>
            <div className={chatStyles.skeletonContainer} aria-busy="true" aria-label="Loading messages">
              {[
                { self: false, metaWidth: 72, bubbleWidth: '60%', height: 36 },
                { self: false, metaWidth: 96, bubbleWidth: '45%', height: 36 },
                { self: true, metaWidth: 64, bubbleWidth: '55%', height: 36 },
                { self: false, metaWidth: 84, bubbleWidth: '75%', height: 52 },
                { self: true, metaWidth: 70, bubbleWidth: '38%', height: 36 },
                { self: false, metaWidth: 90, bubbleWidth: '68%', height: 36 },
              ].map((s, idx) => (
                <div
                  key={idx}
                  className={`${chatStyles.chatMessage} ${s.self ? chatStyles.chatMessageSelf : ''} ${chatStyles.skeletonMsg}`}
                >
                  <div className={`${chatStyles.skeletonAvatar} ${chatStyles.skeletonBlock}`} />
                  <div className={chatStyles.msgBody}>
                    <div className={chatStyles.msgMeta}>
                      <div
                        className={`${chatStyles.skeletonMetaBar} ${chatStyles.skeletonBlock}`}
                        style={{ width: s.metaWidth }}
                      />
                    </div>
                    <div
                      className={`${chatStyles.skeletonBubble} ${chatStyles.skeletonBlock}`}
                      style={{ width: s.bubbleWidth, height: s.height }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={chatStyles.chatInputWrap}>
            <div
              className={`${chatStyles.chatInput} ${chatStyles.skeletonBlock}`}
              style={{ height: 40, opacity: 0.6 }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
