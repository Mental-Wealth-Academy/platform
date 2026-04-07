import Phaser from 'phaser';
import type { GameSave, ChaoData, ChaoStats } from '@/lib/digipet/types';
import { GW, GH, RACES, getChaoLevel, clamp } from '@/lib/digipet/data';
import { sfx } from '@/lib/digipet/audio';
import { getShards, getSave, doSave, earnShards } from '@/lib/digipet/helpers';

export class RaceScene extends Phaser.Scene {
  save!: GameSave;
  mode: 'select' | 'race' | 'result' = 'select';
  selectedChao: ChaoData | null = null;
  selectedRace = 0;

  // Race state
  playerProgress = 0;
  cpuProgress = 0;
  raceTime = 0;
  currentSection = 0;
  raceOver = false;
  playerWon = false;

  // Graphics
  raceGraphics!: Phaser.GameObjects.Graphics;
  statusTxt!: Phaser.GameObjects.Text;

  constructor() { super('Race'); }

  create() {
    this.save = getSave(this);
    this.mode = 'select';
    this.buildSelect();
  }

  buildSelect() {
    this.children.removeAll();
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2c1810, 0x2c1810, 0x1a0f0a, 0x1a0f0a);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 14, 'DIGIPET RACES', {
      fontSize: '14px', fontFamily: 'monospace', color: '#e67e22',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    if (this.save.chao.length === 0) {
      this.add.text(GW / 2, GH / 2, 'No Chao available to race!', {
        fontSize: '9px', fontFamily: 'monospace', color: '#e74c3c',
      }).setOrigin(0.5);
      this.makeBtn(GW / 2, GH - 25, 80, 22, 'Back', () => this.goBack(), 0x888888);
      return;
    }

    // Chao selector
    this.selectedChao = this.selectedChao || this.save.chao[0];
    const chaoIdx = this.save.chao.indexOf(this.selectedChao);
    this.add.text(16, 32, `Racer: ${this.selectedChao.name} (Lv.${getChaoLevel(this.selectedChao.stats)})`, {
      fontSize: '8px', fontFamily: 'monospace', color: '#fff',
    });

    if (this.save.chao.length > 1) {
      this.makeBtn(GW - 50, 36, 50, 16, 'Switch', () => {
        const idx = (this.save.chao.indexOf(this.selectedChao!) + 1) % this.save.chao.length;
        this.selectedChao = this.save.chao[idx];
        this.buildSelect();
      }, 0x3498db);
    }

    // Race list
    RACES.forEach((race, i) => {
      const y = 58 + i * 38;
      const lv = getChaoLevel(this.selectedChao!.stats);
      const canRace = lv >= race.requiredLevel;

      const p = this.add.graphics();
      p.fillStyle(canRace ? 0x2c3e50 : 0x1a1a1a, 0.85);
      p.fillRoundedRect(16, y, GW - 32, 34, 3);
      if (canRace) { p.lineStyle(1, 0xe67e22, 0.5); p.strokeRoundedRect(16, y, GW - 32, 34, 3); }

      this.add.text(24, y + 4, race.name, {
        fontSize: '9px', fontFamily: 'monospace', color: canRace ? '#fff' : '#555',
      });

      const terrainStr = race.terrain.map(t => t.slice(0, 3).toUpperCase()).join(' \u2192 ');
      this.add.text(24, y + 16, `Req: Lv.${race.requiredLevel}  Terrain: ${terrainStr}`, {
        fontSize: '6px', fontFamily: 'monospace', color: canRace ? '#aaa' : '#444',
      });

      this.add.text(GW - 100, y + 4, `${race.coinReward}`, {
        fontSize: '8px', fontFamily: 'monospace', color: '#f1c40f',
      });
      this.add.image(GW - 110, y + 8, 'coin').setScale(0.8);

      if (canRace) {
        this.makeBtn(GW - 50, y + 17, 46, 18, 'Race!', () => {
          this.selectedRace = i;
          this.startRace();
        }, 0xe67e22);
      }
    });

    this.makeBtn(GW / 2, GH - 18, 80, 22, 'Back', () => this.goBack(), 0x888888);
  }

  startRace() {
    sfx('race_start');
    this.mode = 'race';
    this.children.removeAll();
    this.playerProgress = 0;
    this.cpuProgress = 0;
    this.raceTime = 0;
    this.currentSection = 0;
    this.raceOver = false;
    this.playerWon = false;

    const race = RACES[this.selectedRace];

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x2d572c); bg.fillRect(0, 0, GW, GH);
    // Sky
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xb4e4f7, 0xb4e4f7);
    bg.fillRect(0, 0, GW, GH / 2);
    // Ground
    bg.fillStyle(0x6b8e23); bg.fillRect(0, GH / 2, GW, GH / 2);

    // Race title
    this.add.text(GW / 2, 12, race.name, {
      fontSize: '10px', fontFamily: 'monospace', color: '#fff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Terrain sections indicator
    const secW = (GW - 60) / race.terrain.length;
    race.terrain.forEach((t, i) => {
      const x = 30 + i * secW;
      const colors: Record<string, number> = { swim: 0x3498db, fly: 0xf1c40f, run: 0x2ecc71, power: 0xe74c3c, stamina: 0x9b59b6 };
      bg.fillStyle(colors[t] || 0x888888, 0.3); bg.fillRect(x, 30, secW, 12);
      this.add.text(x + secW / 2, 36, t.toUpperCase(), {
        fontSize: '6px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0.5);
    });

    this.raceGraphics = this.add.graphics();

    this.statusTxt = this.add.text(GW / 2, GH - 20, 'GO!', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
  }

  updateRace(dt: number) {
    if (this.raceOver) return;
    const dtS = dt / 1000;
    this.raceTime += dt;

    const race = RACES[this.selectedRace];
    const chao = this.selectedChao!;
    const totalLen = 100;
    const secLen = totalLen / race.terrain.length;

    // Current section
    this.currentSection = Math.min(Math.floor(this.playerProgress / secLen), race.terrain.length - 1);
    const curTerrain = race.terrain[this.currentSection];

    // Player speed: based on matching stat
    const stat = chao.stats[curTerrain as keyof ChaoStats] || 10;
    const playerSpeed = (5 + stat * 0.4 + chao.stats.stamina * 0.1) * dtS;

    // CPU speed: based on difficulty
    const cpuBase = race.difficulty * 4 + 8;
    const cpuSpeed = (cpuBase + Math.sin(this.raceTime * 0.002) * 2 + Math.random() * 1.5) * dtS;

    this.playerProgress = Math.min(totalLen, this.playerProgress + playerSpeed);
    this.cpuProgress = Math.min(totalLen, this.cpuProgress + cpuSpeed);

    // Draw race
    this.raceGraphics.clear();

    const trackY1 = 80, trackY2 = 160;
    const trackW = GW - 60;

    // Track backgrounds
    this.raceGraphics.fillStyle(0x8b5e3c);
    this.raceGraphics.fillRect(30, trackY1 - 5, trackW, 30);
    this.raceGraphics.fillRect(30, trackY2 - 5, trackW, 30);

    // Track lanes
    this.raceGraphics.fillStyle(0xa0724e);
    this.raceGraphics.fillRect(30, trackY1, trackW, 20);
    this.raceGraphics.fillRect(30, trackY2, trackW, 20);

    // Progress markers
    const playerX = 30 + (this.playerProgress / totalLen) * trackW;
    const cpuX = 30 + (this.cpuProgress / totalLen) * trackW;

    this.raceGraphics.fillStyle(0x333333);
    this.raceGraphics.fillRect(28, trackY1 - 15, 50, 12);
    this.raceGraphics.fillRect(28, trackY2 - 15, 50, 12);

    // Player chao (blue)
    this.raceGraphics.fillStyle(0x5b9bd5);
    this.raceGraphics.fillCircle(playerX, trackY1 + 6, 7);
    this.raceGraphics.fillCircle(playerX, trackY1 + 14, 5);
    this.raceGraphics.fillStyle(0xffd700);
    this.raceGraphics.fillCircle(playerX, trackY1 - 4, 2);
    this.raceGraphics.fillStyle(0xffffff);
    this.raceGraphics.fillRect(playerX - 3, trackY1 + 4, 2, 2);
    this.raceGraphics.fillRect(playerX + 1, trackY1 + 4, 2, 2);

    // CPU chao (red)
    this.raceGraphics.fillStyle(0xe74c3c);
    this.raceGraphics.fillCircle(cpuX, trackY2 + 6, 7);
    this.raceGraphics.fillCircle(cpuX, trackY2 + 14, 5);
    this.raceGraphics.fillStyle(0xffd700);
    this.raceGraphics.fillCircle(cpuX, trackY2 - 4, 2);
    this.raceGraphics.fillStyle(0xffffff);
    this.raceGraphics.fillRect(cpuX - 3, trackY2 + 4, 2, 2);
    this.raceGraphics.fillRect(cpuX + 1, trackY2 + 4, 2, 2);

    // Finish line
    const finX = 30 + trackW;
    for (let y = trackY1 - 5; y < trackY1 + 25; y += 4) {
      this.raceGraphics.fillStyle(y % 8 === 0 ? 0xffffff : 0x000000);
      this.raceGraphics.fillRect(finX - 3, y, 3, 4);
    }
    for (let y = trackY2 - 5; y < trackY2 + 25; y += 4) {
      this.raceGraphics.fillStyle(y % 8 === 0 ? 0xffffff : 0x000000);
      this.raceGraphics.fillRect(finX - 3, y, 3, 4);
    }

    // Names and progress bars
    // Player
    this.raceGraphics.fillStyle(0x222222, 0.7); this.raceGraphics.fillRect(30, trackY1 + 25, trackW, 12);
    this.raceGraphics.fillStyle(0x3498db); this.raceGraphics.fillRect(30, trackY1 + 25, trackW * this.playerProgress / totalLen, 12);
    // CPU
    this.raceGraphics.fillStyle(0x222222, 0.7); this.raceGraphics.fillRect(30, trackY2 + 25, trackW, 12);
    this.raceGraphics.fillStyle(0xe74c3c); this.raceGraphics.fillRect(30, trackY2 + 25, trackW * this.cpuProgress / totalLen, 12);

    // Status
    const lead = this.playerProgress > this.cpuProgress ? 'You\'re winning!' : 'CPU is ahead!';
    this.statusTxt.setText(`${chao.name} vs CPU  |  ${lead}`);

    // Check finish
    if (this.playerProgress >= totalLen || this.cpuProgress >= totalLen) {
      this.playerWon = this.playerProgress >= this.cpuProgress;
      this.endRace();
    }
  }

  async endRace() {
    this.raceOver = true;
    const race = RACES[this.selectedRace];
    const reward = this.playerWon ? race.coinReward : Math.floor(race.coinReward * 0.2);

    sfx(this.playerWon ? 'win' : 'sad');

    // Award shards
    if (reward > 0) {
      await earnShards(this, reward, 'chao-race');
    }

    // Stat boost from racing
    if (this.selectedChao) {
      for (const t of race.terrain) {
        const key = t as keyof ChaoStats;
        this.selectedChao.stats[key] = clamp(this.selectedChao.stats[key] + 0.5, 0, 99);
      }
      this.selectedChao.stats.stamina = clamp(this.selectedChao.stats.stamina + 0.3, 0, 99);
    }
    doSave(this);

    // Result overlay
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x000000, 0.7); bg.fillRect(0, 0, GW, GH);
    bg.fillStyle(0x2c3e50, 0.95); bg.fillRoundedRect(GW / 2 - 110, GH / 2 - 50, 220, 100, 6);

    this.add.text(GW / 2, GH / 2 - 30, this.playerWon ? 'YOU WIN!' : 'You lost...', {
      fontSize: '14px', fontFamily: 'monospace', color: this.playerWon ? '#ffd700' : '#e74c3c',
    }).setOrigin(0.5).setDepth(21);

    this.add.text(GW / 2, GH / 2 - 8, `+${reward} Shards`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#f1c40f',
    }).setOrigin(0.5).setDepth(21);

    this.add.text(GW / 2, GH / 2 + 8, 'Stats boosted from the race!', {
      fontSize: '7px', fontFamily: 'monospace', color: '#2ecc71',
    }).setOrigin(0.5).setDepth(21);

    this.makeBtn(GW / 2 - 55, GH / 2 + 35, 60, 20, 'Again', () => this.buildSelect(), 0xe67e22);
    this.makeBtn(GW / 2 + 55, GH / 2 + 35, 60, 20, 'Back', () => this.goBack(), 0x888888);
  }

  update(_t: number, dt: number) {
    if (this.mode === 'race') this.updateRace(dt);
  }

  goBack() {
    sfx('click');
    doSave(this);
    this.scene.start('Garden');
  }

  makeBtn(x: number, y: number, w: number, h: number, label: string, cb: () => void, color = 0x3498db) {
    const g = this.add.graphics().setDepth(22);
    g.fillStyle(color, 0.9); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
    const t = this.add.text(x, y, label, {
      fontSize: '8px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0.5).setDepth(22);
    const hit = this.add.rectangle(x, y, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(22);
    hit.on('pointerover', () => t.setColor('#ffd700'));
    hit.on('pointerout', () => t.setColor('#fff'));
    hit.on('pointerdown', () => cb());
  }
}
