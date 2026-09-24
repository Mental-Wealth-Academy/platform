import BlueScene from '@/components/blue-scene/BlueScene';
import ChatRoom from '@/components/chat-room/ChatRoom';
import SidebarFieldNotes from '@/components/dashboard/SidebarFieldNotes';
import MoodSelector from '@/components/mood-selector/MoodSelector';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  return (
    <div className={styles.dashboard}>

      {/* ── Mood Selector: Mobile-first above Blue ── */}
      <div className={styles.moodSelectorWrap}>
        <MoodSelector />
      </div>

      {/* ── BlueScene ── */}
      <div className={styles.blueSceneWrap}>
        <BlueScene />
      </div>

      {/* ── Sidebar: Field Notes + Global Chat ── */}
      <aside className={styles.sidebarWrap}>
        <div className={styles.fieldNotesWrapper}>
          <SidebarFieldNotes />
        </div>
        <div className={styles.chatRoomDesktopOnly}><ChatRoom fullPage /></div>
      </aside>
    </div>
  );
}
