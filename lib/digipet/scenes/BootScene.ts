import Phaser from 'phaser';
import { generateAllSprites } from '@/lib/digipet/sprites';
import { initAudio } from '@/lib/digipet/audio';
import { GW, GH } from '@/lib/digipet/data';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const txt = this.add.text(GW / 2, GH / 2, 'Loading...', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    // Generate all sprites then go straight to Garden (no title scene in MWA)
    this.time.delayedCall(50, () => {
      generateAllSprites(this);
      initAudio();
      txt.setText('Ready!');
      this.time.delayedCall(200, () => this.scene.start('Garden'));
    });
  }
}
