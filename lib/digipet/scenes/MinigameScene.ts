import Phaser from 'phaser';
import type { GameSave, ChaoData, ChaoStats } from '@/lib/digipet/types';
import { GW, GH, clamp } from '@/lib/digipet/data';
import { sfx } from '@/lib/digipet/audio';
import { getShards, getSave, doSave, earnShards } from '@/lib/digipet/helpers';

// -- Hub Scene --

export class MinigameScene extends Phaser.Scene {
  save!: GameSave;
  mode: 'hub' | 'bounce' | 'catch' = 'hub';

  // Bounce game state
  chaoX = 0; chaoY = 0; vy = 0;
  platforms: { x: number; y: number; w: number; hasSpike: boolean; hasCoin: boolean; coinTaken: boolean }[] = [];
  coins = 0;
  gameOver = false;
  scrollY = 0;
  maxHeight = 0;
  chaoSprite!: Phaser.GameObjects.Graphics;
  platGraphics!: Phaser.GameObjects.Graphics;
  coinSprites: Phaser.GameObjects.Image[] = [];
  scoreTxt!: Phaser.GameObjects.Text;
  inputDir = 0;
  selectedChao: ChaoData | null = null;

  // Catch game state
  catchX = 0;
  fallingItems: { x: number; y: number; type: 'coin' | 'bomb'; sprite: Phaser.GameObjects.Graphics }[] = [];
  catchScore = 0;
  catchLives = 3;
  spawnTimer = 0;

  constructor() { super('Minigame'); }

  create() {
    this.save = getSave(this);
    this.mode = 'hub';
    this.buildHub();
  }

  buildHub() {
    this.children.removeAll();
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a3a2f, 0x1a3a2f, 0x0d1b1a, 0x0d1b1a);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 20, 'MINIGAMES', {
      fontSize: '14px', fontFamily: 'monospace', color: '#2ecc71',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Select chao hint
    if (this.save.chao.length > 0) {
      this.selectedChao = this.save.chao[0];
      this.add.text(GW / 2, 42, `Playing as: ${this.selectedChao.name}`, {
        fontSize: '8px', fontFamily: 'monospace', color: '#aaa',
      }).setOrigin(0.5);
    }

    // Game cards
    this.gameCard(GW / 2 - 90, 120, 'Pet Bounce', 'Bounce high!\nCollect Shards!', '#3498db', () => this.startBounce());
    this.gameCard(GW / 2 + 90, 120, 'Pet Catch', 'Catch Shards!\nDodge bombs!', '#e67e22', () => this.startCatch());

    // Stats bonus info
    this.add.text(GW / 2, 210, 'Minigames earn Shards and boost your pet\'s stats!', {
      fontSize: '7px', fontFamily: 'monospace', color: '#666',
    }).setOrigin(0.5);

    // Back
    this.makeBtn(GW / 2, GH - 25, 80, 22, 'Back', () => {
      sfx('click'); doSave(this); this.scene.start('Garden');
    }, 0x888888);
  }

  gameCard(x: number, y: number, title: string, desc: string, color: string, cb: () => void) {
    const g = this.add.graphics();
    const c = parseInt(color.slice(1), 16);
    g.fillStyle(0x2c3e50, 0.9); g.fillRoundedRect(x - 70, y - 50, 140, 100, 6);
    g.lineStyle(2, c); g.strokeRoundedRect(x - 70, y - 50, 140, 100, 6);

    this.add.text(x, y - 30, title, {
      fontSize: '10px', fontFamily: 'monospace', color,
    }).setOrigin(0.5);

    this.add.text(x, y + 2, desc, {
      fontSize: '7px', fontFamily: 'monospace', color: '#aaa', align: 'center',
    }).setOrigin(0.5);

    this.makeBtn(x, y + 35, 60, 18, 'Play', cb, c);
  }

  // -- Bounce Game --

  startBounce() {
    sfx('click');
    this.mode = 'bounce';
    this.children.removeAll();
    this.coins = 0;
    this.gameOver = false;
    this.scrollY = 0;
    this.maxHeight = 0;
    this.chaoX = GW / 2;
    this.chaoY = GH - 60;
    this.vy = -300;
    this.inputDir = 0;
    this.platforms = [];
    this.coinSprites = [];

    // Generate platforms
    for (let i = 0; i < 100; i++) {
      this.platforms.push({
        x: 40 + Math.random() * (GW - 80),
        y: GH - 80 - i * 70 - Math.random() * 30,
        w: 40 + Math.random() * 30,
        hasSpike: i > 5 && Math.random() < 0.15,
        hasCoin: Math.random() < 0.6,
        coinTaken: false,
      });
    }
    // Starting platform
    this.platforms[0].x = GW / 2;
    this.platforms[0].hasSpike = false;
    this.platforms[0].hasCoin = true;

    this.platGraphics = this.add.graphics();
    this.chaoSprite = this.add.graphics();

    this.scoreTxt = this.add.text(8, 8, 'Shards: 0', {
      fontSize: '10px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(10);

    this.add.text(GW / 2, GH - 12, 'Tap left/right to move', {
      fontSize: '7px', fontFamily: 'monospace', color: '#666',
    }).setOrigin(0.5).setDepth(10);

    // Input
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.gameOver) return;
      this.inputDir = p.x < GW / 2 ? -1 : 1;
    });
    this.input.on('pointerup', () => { this.inputDir = 0; });
  }

  updateBounce(dt: number) {
    if (this.gameOver) return;
    const dtS = dt / 1000;

    // Gravity
    this.vy += 600 * dtS;
    this.chaoY += this.vy * dtS;
    this.chaoX += this.inputDir * 180 * dtS;
    this.chaoX = clamp(this.chaoX, 16, GW - 16);

    // Track height
    const height = -this.chaoY + GH;
    if (height > this.maxHeight) {
      this.maxHeight = height;
      this.scrollY = Math.max(0, this.maxHeight - GH / 2);
    }

    // Platform collision (only when falling)
    if (this.vy > 0) {
      for (const plat of this.platforms) {
        const py = plat.y + this.scrollY;
        const cy = this.chaoY + this.scrollY;
        if (cy + 16 > py && cy + 16 < py + 8 &&
            this.chaoX > plat.x - plat.w / 2 - 8 && this.chaoX < plat.x + plat.w / 2 + 8) {
          if (plat.hasSpike) {
            this.endBounce();
            return;
          }
          this.vy = -320 - (this.selectedChao ? this.selectedChao.stats.fly * 2 : 0);
          sfx('tap');
          break;
        }
      }
    }

    // Collect coins (shards)
    for (const plat of this.platforms) {
      if (plat.hasCoin && !plat.coinTaken) {
        const py = plat.y - 20 + this.scrollY;
        const cy = this.chaoY + this.scrollY;
        if (Math.abs(this.chaoX - plat.x) < 16 && Math.abs(cy - py) < 16) {
          plat.coinTaken = true;
          this.coins++;
          sfx('coin');
          this.scoreTxt.setText(`Shards: ${this.coins}`);
        }
      }
    }

    // Fall off bottom = game over
    if (this.chaoY + this.scrollY > GH + 40) {
      this.endBounce();
      return;
    }

    // Draw
    this.platGraphics.clear();
    this.chaoSprite.clear();

    // Background
    this.platGraphics.fillStyle(0x0d1b2a);
    this.platGraphics.fillRect(0, 0, GW, GH);

    // Platforms
    for (const plat of this.platforms) {
      const sy = plat.y + this.scrollY;
      if (sy < -20 || sy > GH + 20) continue;
      this.platGraphics.fillStyle(plat.hasSpike ? 0xe74c3c : 0x27ae60);
      this.platGraphics.fillRect(plat.x - plat.w / 2, sy, plat.w, 6);
      if (plat.hasSpike) {
        this.platGraphics.fillStyle(0xff0000);
        for (let s = 0; s < 3; s++) {
          const sx = plat.x - 8 + s * 8;
          this.platGraphics.fillTriangle(sx, sy, sx + 4, sy - 6, sx + 8, sy);
        }
      }
      if (plat.hasCoin && !plat.coinTaken) {
        this.platGraphics.fillStyle(0xf1c40f);
        this.platGraphics.fillCircle(plat.x, sy - 18, 4);
        this.platGraphics.fillStyle(0xf7dc6f);
        this.platGraphics.fillCircle(plat.x, sy - 18, 3);
      }
    }

    // Chao
    const cy = this.chaoY + this.scrollY;
    this.chaoSprite.fillStyle(0x5b9bd5);
    this.chaoSprite.fillCircle(this.chaoX, cy - 4, 8);
    this.chaoSprite.fillCircle(this.chaoX, cy + 8, 6);
    this.chaoSprite.fillStyle(0xa8d4f2);
    this.chaoSprite.fillCircle(this.chaoX, cy + 8, 4);
    // Eyes
    this.chaoSprite.fillStyle(0xffffff);
    this.chaoSprite.fillRect(this.chaoX - 4, cy - 6, 2, 2);
    this.chaoSprite.fillRect(this.chaoX + 2, cy - 6, 2, 2);
    this.chaoSprite.fillStyle(0x111111);
    this.chaoSprite.fillRect(this.chaoX - 3, cy - 5, 1, 1);
    this.chaoSprite.fillRect(this.chaoX + 3, cy - 5, 1, 1);
    // Emotiball
    this.chaoSprite.fillStyle(0xffd700);
    this.chaoSprite.fillCircle(this.chaoX, cy - 16, 3);
    this.chaoSprite.fillStyle(0x333333);
    this.chaoSprite.fillRect(this.chaoX, cy - 13, 1, 3);

    // Height indicator
    this.scoreTxt.setText(`Shards: ${this.coins}  Height: ${Math.floor(this.maxHeight / 10)}m`);
  }

  async endBounce() {
    this.gameOver = true;
    sfx(this.coins > 0 ? 'win' : 'sad');

    // Award shards + stat boosts
    if (this.coins > 0) {
      await earnShards(this, this.coins, 'chao-bounce');
    }
    if (this.selectedChao) {
      this.selectedChao.stats.fly = clamp(this.selectedChao.stats.fly + this.coins * 0.3, 0, 99);
      this.selectedChao.stats.stamina = clamp(this.selectedChao.stats.stamina + this.coins * 0.1, 0, 99);
    }
    doSave(this);

    // Results panel
    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x000000, 0.7); bg.fillRect(0, 0, GW, GH);
    bg.fillStyle(0x2c3e50, 0.95); bg.fillRoundedRect(GW / 2 - 100, GH / 2 - 60, 200, 120, 6);

    this.add.text(GW / 2, GH / 2 - 40, 'Game Over!', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5).setDepth(21);

    this.add.text(GW / 2, GH / 2 - 15, `Shards earned: ${this.coins}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#f1c40f',
    }).setOrigin(0.5).setDepth(21);

    this.add.text(GW / 2, GH / 2 + 5, `Height: ${Math.floor(this.maxHeight / 10)}m`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#aaa',
    }).setOrigin(0.5).setDepth(21);

    if (this.selectedChao && this.coins > 0) {
      this.add.text(GW / 2, GH / 2 + 20, `+${(this.coins * 0.3).toFixed(1)} Fly  +${(this.coins * 0.1).toFixed(1)} Sta`, {
        fontSize: '8px', fontFamily: 'monospace', color: '#2ecc71',
      }).setOrigin(0.5).setDepth(21);
    }

    this.makeBtn(GW / 2 - 50, GH / 2 + 45, 60, 20, 'Retry', () => this.startBounce(), 0x27ae60);
    this.makeBtn(GW / 2 + 50, GH / 2 + 45, 60, 20, 'Back', () => this.buildHub(), 0x888888);
  }

  // -- Catch Game --

  startCatch() {
    sfx('click');
    this.mode = 'catch';
    this.children.removeAll();
    this.catchScore = 0;
    this.catchLives = 3;
    this.catchX = GW / 2;
    this.fallingItems = [];
    this.spawnTimer = 0;
    this.gameOver = false;

    this.platGraphics = this.add.graphics();
    this.chaoSprite = this.add.graphics();
    this.scoreTxt = this.add.text(8, 8, 'Shards: 0  Lives: \u2665\u2665\u2665', {
      fontSize: '9px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(10);

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.gameOver) this.catchX = clamp(p.x, 20, GW - 20);
    });
  }

  updateCatch(dt: number) {
    if (this.gameOver) return;
    const dtS = dt / 1000;

    // Spawn items
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const isBomb = Math.random() < 0.25;
      this.fallingItems.push({
        x: 30 + Math.random() * (GW - 60),
        y: -10,
        type: isBomb ? 'bomb' : 'coin',
        sprite: this.add.graphics(),
      });
      this.spawnTimer = 400 + Math.random() * 600;
    }

    // Move items
    const speed = 120 + this.catchScore * 2;
    for (const item of this.fallingItems) {
      item.y += speed * dtS;

      // Catch check
      if (item.y > GH - 35 && item.y < GH - 15 && Math.abs(item.x - this.catchX) < 18) {
        if (item.type === 'coin') {
          this.catchScore++;
          sfx('coin');
        } else {
          this.catchLives--;
          sfx('error');
          if (this.catchLives <= 0) { this.endCatch(); return; }
        }
        item.y = GH + 50; // remove
      }

      // Miss coin
      if (item.type === 'coin' && item.y > GH + 10) {
        // Missed coins don't cost lives
      }
    }

    // Remove off-screen items
    for (const item of this.fallingItems) {
      if (item.y > GH + 40) item.sprite.destroy();
    }
    this.fallingItems = this.fallingItems.filter(i => i.y <= GH + 40);

    // Draw
    this.platGraphics.clear();
    this.chaoSprite.clear();

    this.platGraphics.fillStyle(0x0d1b2a);
    this.platGraphics.fillRect(0, 0, GW, GH);

    // Draw items
    for (const item of this.fallingItems) {
      item.sprite.clear();
      if (item.type === 'coin') {
        item.sprite.fillStyle(0xf1c40f);
        item.sprite.fillCircle(item.x, item.y, 6);
        item.sprite.fillStyle(0xf7dc6f);
        item.sprite.fillCircle(item.x, item.y, 4);
      } else {
        item.sprite.fillStyle(0x333333);
        item.sprite.fillCircle(item.x, item.y, 7);
        item.sprite.fillStyle(0xe74c3c);
        item.sprite.fillCircle(item.x, item.y, 5);
        // Fuse
        item.sprite.fillStyle(0xf1c40f);
        item.sprite.fillRect(item.x - 1, item.y - 9, 2, 4);
      }
    }

    // Chao basket
    const cy = GH - 25;
    this.chaoSprite.fillStyle(0x5b9bd5);
    this.chaoSprite.fillCircle(this.catchX, cy - 6, 8);
    this.chaoSprite.fillCircle(this.catchX, cy + 6, 6);
    this.chaoSprite.fillStyle(0xa8d4f2);
    this.chaoSprite.fillCircle(this.catchX, cy + 6, 4);
    this.chaoSprite.fillStyle(0xffffff);
    this.chaoSprite.fillRect(this.catchX - 4, cy - 8, 2, 2);
    this.chaoSprite.fillRect(this.catchX + 2, cy - 8, 2, 2);
    // Hands up (catching pose)
    this.chaoSprite.fillStyle(0x5b9bd5);
    this.chaoSprite.fillRect(this.catchX - 14, cy - 2, 4, 3);
    this.chaoSprite.fillRect(this.catchX + 10, cy - 2, 4, 3);

    const hearts = '\u2665'.repeat(this.catchLives) + '\u2661'.repeat(3 - this.catchLives);
    this.scoreTxt.setText(`Shards: ${this.catchScore}  Lives: ${hearts}`);
  }

  async endCatch() {
    this.gameOver = true;
    sfx(this.catchScore > 0 ? 'win' : 'sad');

    // Award shards + stat boosts
    if (this.catchScore > 0) {
      await earnShards(this, this.catchScore, 'chao-catch');
    }
    if (this.selectedChao) {
      this.selectedChao.stats.run = clamp(this.selectedChao.stats.run + this.catchScore * 0.25, 0, 99);
      this.selectedChao.stats.power = clamp(this.selectedChao.stats.power + this.catchScore * 0.15, 0, 99);
    }
    doSave(this);

    // Clean up falling items
    for (const item of this.fallingItems) item.sprite.destroy();
    this.fallingItems = [];

    const bg = this.add.graphics().setDepth(20);
    bg.fillStyle(0x000000, 0.7); bg.fillRect(0, 0, GW, GH);
    bg.fillStyle(0x2c3e50, 0.95); bg.fillRoundedRect(GW / 2 - 100, GH / 2 - 60, 200, 120, 6);

    this.add.text(GW / 2, GH / 2 - 40, 'Game Over!', {
      fontSize: '12px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5).setDepth(21);

    this.add.text(GW / 2, GH / 2 - 15, `Shards earned: ${this.catchScore}`, {
      fontSize: '10px', fontFamily: 'monospace', color: '#f1c40f',
    }).setOrigin(0.5).setDepth(21);

    if (this.selectedChao && this.catchScore > 0) {
      this.add.text(GW / 2, GH / 2 + 5, `+${(this.catchScore * 0.25).toFixed(1)} Run  +${(this.catchScore * 0.15).toFixed(1)} Pow`, {
        fontSize: '8px', fontFamily: 'monospace', color: '#2ecc71',
      }).setOrigin(0.5).setDepth(21);
    }

    this.makeBtn(GW / 2 - 50, GH / 2 + 45, 60, 20, 'Retry', () => this.startCatch(), 0xe67e22);
    this.makeBtn(GW / 2 + 50, GH / 2 + 45, 60, 20, 'Back', () => { this.mode = 'hub'; this.buildHub(); }, 0x888888);
  }

  // -- Update --

  update(_time: number, delta: number) {
    if (this.mode === 'bounce') this.updateBounce(delta);
    else if (this.mode === 'catch') this.updateCatch(delta);
  }

  makeBtn(x: number, y: number, w: number, h: number, label: string, cb: () => void, color = 0x3498db) {
    const g = this.add.graphics().setDepth(22);
    g.fillStyle(color, 0.9); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
    const t = this.add.text(x, y, label, {
      fontSize: '8px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0.5).setDepth(22);
    const hit = this.add.rectangle(x, y, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(22);
    hit.on('pointerdown', () => cb());
  }
}
