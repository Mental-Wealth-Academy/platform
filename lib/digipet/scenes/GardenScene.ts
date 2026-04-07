import Phaser from 'phaser';
import type { ChaoData, EggData, GameSave, ChaoState, FoodType, Personality, ChaoType, ChaoStats } from '@/lib/digipet/types';
import { GW, GH, EVO_THRESHOLD_1, EVO_THRESHOLD_2, HUNGER_RATE, HAPPINESS_DECAY, GAME_MINUTE_MS,
  FOODS, getChaoLevel, getDominantType, clamp, MAX_CHAO } from '@/lib/digipet/data';
import { applyOfflineTime, hatchEgg as doHatchEgg } from '@/lib/digipet/save';
import { generateChaoSheet, createChaoAnims, chaoTexKey, generateColoredEgg } from '@/lib/digipet/sprites';
import { sfx } from '@/lib/digipet/audio';
import { getShards, getSave, doSave } from '@/lib/digipet/helpers';

const BOUNDS = { x1: 35, y1: 108, x2: 455, y2: 278 };
const POND = { cx: 80, cy: 190, rx: 58, ry: 38 };
const BAR_Y = 280;
const BAR_H = 40;

interface ChaoEntity {
  data: ChaoData; sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text;
  state: ChaoState; timer: number; tx: number; ty: number; texKey: string;
}
interface EggEntity { data: EggData; sprite: Phaser.GameObjects.Image; prog: Phaser.GameObjects.Graphics; }

export class GardenScene extends Phaser.Scene {
  save!: GameSave;
  ents: ChaoEntity[] = [];
  eggs: EggEntity[] = [];
  sel: ChaoEntity | null = null;
  bar!: Phaser.GameObjects.Container;
  shardTxt!: Phaser.GameObjects.Text;
  ring!: Phaser.GameObjects.Graphics;
  gt = 0; st = 0;
  mode: 'nav' | 'act' | 'feed' = 'nav';

  constructor() { super('Garden'); }

  create() {
    this.ents = []; this.eggs = []; this.sel = null; this.mode = 'nav';

    this.save = getSave(this);
    applyOfflineTime(this.save);

    // Background
    this.add.image(GW / 2, GH / 2, 'garden_bg').setDepth(0);

    // Selection ring
    this.ring = this.add.graphics().setDepth(998).setVisible(false);

    // Spawn chao
    for (const c of this.save.chao) this.ents.push(this.mkChao(c));
    // Spawn eggs
    for (const e of this.save.eggs) this.eggs.push(this.mkEgg(e));
    // Garden items
    for (const gi of this.save.gardenItems) {
      this.add.image(gi.x, gi.y, `item_${gi.type}`).setDepth(gi.y);
    }

    // HUD
    this.setupHUD();

    // Background click to deselect
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, objs: Phaser.GameObjects.GameObject[]) => {
      if (objs.length === 0 && this.sel) this.deselect();
    });

    if (this.save.chao.length === 0 && this.save.eggs.length > 0) {
      this.showMsg('Tap the egg to hatch your first Chao!');
    }
  }

  // -- Spawners --

  mkChao(d: ChaoData): ChaoEntity {
    const tk = chaoTexKey(d.color, d.stage, d.type);
    if (!this.textures.exists(tk)) {
      generateChaoSheet(this, tk, d.color, d.stage, d.type);
      createChaoAnims(this, tk);
    }
    const sp = this.add.sprite(d.x, d.y, tk, 0).setDepth(d.y).setInteractive({ useHandCursor: true });
    sp.play(`${tk}_idle`);
    const lb = this.add.text(d.x, d.y + 22, d.name, {
      fontSize: '7px', fontFamily: 'monospace', color: '#fff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(d.y + 0.1);
    const ent: ChaoEntity = { data: d, sprite: sp, label: lb, state: 'idle', timer: 2000 + Math.random() * 3000, tx: d.x, ty: d.y, texKey: tk };
    sp.on('pointerdown', (ptr: Phaser.Input.Pointer) => { ptr.event.stopPropagation(); this.selectChao(ent); });
    return ent;
  }

  mkEgg(d: EggData): EggEntity {
    const cracked = d.hatchProgress > 50;
    const key = generateColoredEgg(this, d.color, cracked);
    const sp = this.add.image(d.x, d.y, key).setDepth(d.y).setInteractive({ useHandCursor: true });
    const pg = this.add.graphics().setDepth(d.y + 0.1);
    this.drawEggProg(pg, d);
    const ent: EggEntity = { data: d, sprite: sp, prog: pg };
    sp.on('pointerdown', (ptr: Phaser.Input.Pointer) => { ptr.event.stopPropagation(); this.tapEgg(ent); });
    return ent;
  }

  drawEggProg(g: Phaser.GameObjects.Graphics, d: EggData) {
    g.clear();
    const x = d.x - 10, y = d.y - 18, w = 20, h = 3;
    g.fillStyle(0x333333); g.fillRect(x, y, w, h);
    g.fillStyle(0x2ecc71); g.fillRect(x, y, w * d.hatchProgress / 100, h);
  }

  // -- HUD --

  setupHUD() {
    // Shard display
    const ci = this.add.image(16, 10, 'coin').setDepth(1000).setScale(1.2);
    this.shardTxt = this.add.text(26, 6, `${getShards(this)}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(1000);

    // Chao count
    this.add.text(GW - 8, 6, '', { fontSize: '7px', fontFamily: 'monospace', color: '#aaa' })
      .setOrigin(1, 0).setDepth(1000);

    // Bottom bar container
    this.bar = this.add.container(0, 0).setDepth(999);
    this.buildNavBar();
  }

  clearBar() { this.bar.removeAll(true); }

  buildNavBar() {
    this.clearBar(); this.mode = 'nav';
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a252f, 0.92); bg.fillRect(0, BAR_Y, GW, BAR_H);
    bg.lineStyle(1, 0x4a6278); bg.lineBetween(0, BAR_Y, GW, BAR_Y);
    this.bar.add(bg);

    const btns: [string, () => void, number][] = [
      ['Shop', () => { sfx('click'); doSave(this); this.scene.start('Shop'); }, 0x2980b9],
      ['Games', () => { sfx('click'); doSave(this); this.scene.start('Minigame'); }, 0x27ae60],
      ['Race', () => { sfx('click'); doSave(this); this.scene.start('Race'); }, 0xe67e22],
      ['Breed', () => {
        sfx('click');
        const adults = this.save.chao.filter(c => c.stage !== 'child' && c.stage !== 'egg');
        if (adults.length < 2) { this.showMsg('Need 2+ evolved Chao to breed!'); return; }
        doSave(this); this.scene.start('Breeding');
      }, 0xe91e8c],
    ];
    const spacing = GW / (btns.length + 1);
    btns.forEach(([label, cb, color], i) => {
      this.mkBtn(this.bar, spacing * (i + 1), BAR_Y + BAR_H / 2, 60, 24, label, cb, color);
    });
  }

  buildActBar() {
    if (!this.sel) return;
    this.clearBar(); this.mode = 'act';
    const e = this.sel;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a252f, 0.92); bg.fillRect(0, BAR_Y, GW, BAR_H);
    bg.lineStyle(1, 0x4a6278); bg.lineBetween(0, BAR_Y, GW, BAR_Y);
    this.bar.add(bg);

    // Info
    const lv = getChaoLevel(e.data.stats);
    const info = this.add.text(8, BAR_Y + 4, `${e.data.name}  Lv.${lv}`, {
      fontSize: '8px', fontFamily: 'monospace', color: '#fff',
    });
    this.bar.add(info);

    // HP bar
    const hpBg = this.add.graphics(); hpBg.fillStyle(0x444444); hpBg.fillRect(8, BAR_Y + 16, 60, 5);
    hpBg.fillStyle(e.data.hp > 30 ? 0x2ecc71 : 0xe74c3c); hpBg.fillRect(8, BAR_Y + 16, 60 * e.data.hp / 100, 5);
    this.bar.add(hpBg);
    this.bar.add(this.add.text(70, BAR_Y + 14, 'HP', { fontSize: '6px', fontFamily: 'monospace', color: '#aaa' }));

    // Happy bar
    const hapBg = this.add.graphics(); hapBg.fillStyle(0x444444); hapBg.fillRect(8, BAR_Y + 24, 60, 5);
    hapBg.fillStyle(0xf1c40f); hapBg.fillRect(8, BAR_Y + 24, 60 * e.data.happiness / 100, 5);
    this.bar.add(hapBg);
    this.bar.add(this.add.text(70, BAR_Y + 22, '\u2665', { fontSize: '6px', fontFamily: 'monospace', color: '#f1c40f' }));

    // Action buttons
    const btns: [string, () => void, number][] = [
      ['Feed', () => this.buildFeedBar(), 0xe67e22],
      ['Pet', () => { this.petChao(e); this.buildActBar(); }, 0xe91e8c],
      ['Stats', () => { this.showStats(e); }, 0x3498db],
      ['Name', () => this.renameChao(e), 0x9b59b6],
      ['X', () => this.deselect(), 0x888888],
    ];
    const startX = 180;
    btns.forEach(([label, cb, color], i) => {
      this.mkBtn(this.bar, startX + i * 62, BAR_Y + BAR_H / 2, 56, 24, label, cb, color);
    });
  }

  buildFeedBar() {
    if (!this.sel) return;
    this.clearBar(); this.mode = 'feed';
    const bg = this.add.graphics();
    bg.fillStyle(0x1a252f, 0.92); bg.fillRect(0, BAR_Y, GW, BAR_H);
    bg.lineStyle(1, 0x4a6278); bg.lineBetween(0, BAR_Y, GW, BAR_Y);
    this.bar.add(bg);

    this.bar.add(this.add.text(8, BAR_Y + 4, 'Choose food:', { fontSize: '7px', fontFamily: 'monospace', color: '#aaa' }));

    const inv = this.save.inventory.food;
    const foods = Object.keys(inv).filter(k => (inv[k as FoodType] || 0) > 0);
    if (foods.length === 0) {
      this.bar.add(this.add.text(GW / 2, BAR_Y + 20, 'No food! Buy some at the Shop.', {
        fontSize: '7px', fontFamily: 'monospace', color: '#e74c3c' }).setOrigin(0.5));
    } else {
      foods.forEach((fk, i) => {
        const food = FOODS[fk];
        const cnt = inv[fk as FoodType] || 0;
        const x = 30 + i * 52;
        // Food circle
        const cir = this.add.graphics();
        cir.fillStyle(parseInt(food.color.slice(1), 16)); cir.fillCircle(x, BAR_Y + 22, 6);
        this.bar.add(cir);
        // Count
        this.bar.add(this.add.text(x, BAR_Y + 32, `x${cnt}`, { fontSize: '6px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0.5));
        // Clickable
        const hit = this.add.rectangle(x, BAR_Y + 22, 20, 20).setInteractive({ useHandCursor: true });
        hit.setAlpha(0.001);
        hit.on('pointerdown', () => { this.feedChao(this.sel!, fk as FoodType); });
        this.bar.add(hit);
      });
    }
    // Back button
    this.mkBtn(this.bar, GW - 40, BAR_Y + BAR_H / 2, 50, 24, 'Back', () => this.buildActBar(), 0x888888);
  }

  mkBtn(cont: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, label: string, cb: () => void, color = 0x3498db) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.85); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
    cont.add(g);
    const t = this.add.text(x, y, label, { fontSize: '8px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0.5);
    cont.add(t);
    const hit = this.add.rectangle(x, y, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    hit.on('pointerover', () => t.setColor('#ffd700'));
    hit.on('pointerout', () => t.setColor('#fff'));
    hit.on('pointerdown', (ptr: Phaser.Input.Pointer) => { ptr.event.stopPropagation(); cb(); });
    cont.add(hit);
  }

  // -- Selection --

  selectChao(e: ChaoEntity) {
    sfx('tap');
    this.sel = e;
    this.ring.setVisible(true);
    this.ring.clear();
    this.ring.lineStyle(1, 0xffd700, 0.8);
    this.ring.strokeEllipse(0, 0, 36, 14);
    this.ring.setPosition(e.sprite.x, e.sprite.y + 18);
    this.buildActBar();
  }

  deselect() {
    this.sel = null;
    this.ring.setVisible(false);
    this.buildNavBar();
  }

  // -- Actions --

  feedChao(e: ChaoEntity, ft: FoodType) {
    const inv = this.save.inventory.food;
    const cnt = inv[ft] || 0;
    if (cnt <= 0) return;
    inv[ft] = cnt - 1;
    if (inv[ft] === 0) delete inv[ft];

    const food = FOODS[ft];
    sfx('feed');
    this.setChaoState(e, 'eat');

    // Apply stats
    const boost = food.statBoost;
    const genes = e.data.genes;
    const stats = e.data.stats;
    if (boost.swim) stats.swim = clamp(stats.swim + boost.swim * genes.swimGrowth, 0, 99);
    if (boost.fly) stats.fly = clamp(stats.fly + boost.fly * genes.flyGrowth, 0, 99);
    if (boost.run) stats.run = clamp(stats.run + boost.run * genes.runGrowth, 0, 99);
    if (boost.power) stats.power = clamp(stats.power + boost.power * genes.powerGrowth, 0, 99);
    if (boost.stamina) stats.stamina = clamp(stats.stamina + boost.stamina * genes.staminaGrowth, 0, 99);
    e.data.hp = clamp(e.data.hp + food.hpRestore, 0, 100);
    e.data.happiness = clamp(e.data.happiness + food.happinessBoost, 0, 100);

    // Floating text for stat boosts
    let txt = '';
    if (boost.swim) txt += `+${Math.round(boost.swim * genes.swimGrowth)} Swim `;
    if (boost.fly) txt += `+${Math.round(boost.fly * genes.flyGrowth)} Fly `;
    if (boost.run) txt += `+${Math.round(boost.run * genes.runGrowth)} Run `;
    if (boost.power) txt += `+${Math.round(boost.power * genes.powerGrowth)} Pow `;
    if (boost.stamina) txt += `+${Math.round(boost.stamina * genes.staminaGrowth)} Sta `;
    if (txt) this.floatText(e.sprite.x, e.sprite.y - 24, txt.trim(), '#ffd700');
    if (food.hpRestore > 0) this.floatText(e.sprite.x, e.sprite.y - 34, `+${food.hpRestore} HP`, '#2ecc71');

    // Check evolution
    this.time.delayedCall(1600, () => this.checkEvo(e));

    // Rebuild feed bar
    this.time.delayedCall(100, () => { if (this.mode === 'feed') this.buildFeedBar(); });
    doSave(this);
  }

  petChao(e: ChaoEntity) {
    sfx('pet');
    e.data.happiness = clamp(e.data.happiness + 8, 0, 100);
    this.setChaoState(e, 'happy');
    // Hearts
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 200, () => {
        if (!e.sprite.active) return;
        const h = this.add.image(e.sprite.x + (Math.random() - 0.5) * 20, e.sprite.y - 10, 'heart').setDepth(999);
        this.tweens.add({ targets: h, y: h.y - 25, alpha: 0, duration: 800, onComplete: () => h.destroy() });
      });
    }
    doSave(this);
  }

  renameChao(e: ChaoEntity) {
    const name = window.prompt('Name your Chao:', e.data.name);
    if (name && name.trim()) {
      e.data.name = name.trim().slice(0, 10);
      e.label.setText(e.data.name);
      doSave(this);
      if (this.sel === e) this.buildActBar();
    }
  }

  showStats(e: ChaoEntity) {
    // Overlay stats panel
    const cont = this.add.container(0, 0).setDepth(1001);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6); bg.fillRect(0, 0, GW, GH);
    bg.fillStyle(0x2c3e50, 0.95); bg.fillRoundedRect(GW / 2 - 110, 30, 220, 230, 6);
    bg.lineStyle(1, 0x4a6278); bg.strokeRoundedRect(GW / 2 - 110, 30, 220, 230, 6);
    cont.add(bg);

    const d = e.data;
    const lv = getChaoLevel(d.stats);
    const lines = [
      `${d.name}  Lv.${lv}  [${d.stage}]`,
      `Type: ${d.type}  Personality: ${d.personality}`,
      `Age: ${Math.floor(d.age)} min`,
      '',
      `Swim:    ${this.statBar(d.stats.swim)}  ${Math.floor(d.stats.swim)}`,
      `Fly:     ${this.statBar(d.stats.fly)}  ${Math.floor(d.stats.fly)}`,
      `Run:     ${this.statBar(d.stats.run)}  ${Math.floor(d.stats.run)}`,
      `Power:   ${this.statBar(d.stats.power)}  ${Math.floor(d.stats.power)}`,
      `Stamina: ${this.statBar(d.stats.stamina)}  ${Math.floor(d.stats.stamina)}`,
      '',
      `HP: ${Math.floor(d.hp)}/100   Happy: ${Math.floor(d.happiness)}/100`,
      '',
      `Growth: S${d.genes.swimGrowth.toFixed(1)} F${d.genes.flyGrowth.toFixed(1)} R${d.genes.runGrowth.toFixed(1)} P${d.genes.powerGrowth.toFixed(1)}`,
      d.sparkle ? '\u2726 Sparkle Chao \u2726' : '',
    ];

    lines.forEach((line, i) => {
      cont.add(this.add.text(GW / 2, 45 + i * 14, line, {
        fontSize: '8px', fontFamily: 'monospace', color: i === 0 ? '#5dade2' : '#ddd',
      }).setOrigin(0.5, 0));
    });

    // Close
    const closeBtn = this.add.text(GW / 2, 240, '[ Close ]', {
      fontSize: '9px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => cont.destroy());
    cont.add(closeBtn);
  }

  statBar(v: number): string {
    const filled = Math.floor(v / 10);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
  }

  // -- Eggs --

  tapEgg(egg: EggEntity) {
    const wasCracked = egg.data.hatchProgress > 50;
    egg.data.hatchProgress = clamp(egg.data.hatchProgress + 8 + Math.random() * 5, 0, 100);
    const nowCracked = egg.data.hatchProgress > 50;

    // Different sounds based on progress
    if (nowCracked && !wasCracked) sfx('hatch');
    else if (egg.data.hatchProgress > 80) sfx('tap');
    else sfx('tap');

    // Rock animation
    const angle = 6 + egg.data.hatchProgress * 0.1;
    const reps = egg.data.hatchProgress > 70 ? 5 : 3;
    this.tweens.add({ targets: egg.sprite, angle, duration: 50, yoyo: true, repeat: reps, onComplete: () => { egg.sprite.angle = 0; } });

    // Swap to cracked colored texture
    if (nowCracked && !wasCracked) {
      const crackedKey = generateColoredEgg(this, egg.data.color, true);
      egg.sprite.setTexture(crackedKey);
    }
    this.drawEggProg(egg.prog, egg.data);

    if (egg.data.hatchProgress >= 100) {
      this.hatchEggEntity(egg);
    }
    doSave(this);
  }

  hatchEggEntity(egg: EggEntity) {
    sfx('hatch');
    const name = window.prompt('Your Chao hatched! Give it a name:', 'Chao');
    const finalName = (name && name.trim()) ? name.trim().slice(0, 10) : 'Chao';

    const chaoData = doHatchEgg(this.save, egg.data.id, finalName);
    if (!chaoData) return;

    // Remove egg visuals
    egg.sprite.destroy();
    egg.prog.destroy();
    this.eggs = this.eggs.filter(e => e !== egg);

    // Spawn chao
    const ent = this.mkChao(chaoData);
    this.ents.push(ent);

    // Celebration
    this.setChaoState(ent, 'happy');
    for (let i = 0; i < 6; i++) {
      const s = this.add.image(ent.sprite.x, ent.sprite.y, 'star').setDepth(999);
      this.tweens.add({
        targets: s,
        x: s.x + (Math.random() - 0.5) * 80,
        y: s.y + (Math.random() - 0.5) * 80 - 20,
        alpha: 0, scale: 0.5, duration: 1000 + Math.random() * 500,
        onComplete: () => s.destroy(),
      });
    }
    this.floatText(ent.sprite.x, ent.sprite.y - 30, `${finalName} was born!`, '#ffd700');
    doSave(this);
  }

  // -- AI --

  tickAI(e: ChaoEntity, dt: number) {
    e.timer -= dt;
    switch (e.state) {
      case 'idle':
        if (e.timer <= 0) {
          const r = Math.random();
          if (r < 0.5) { const p = this.rndPt(); e.tx = p.x; e.ty = p.y; this.setChaoState(e, 'wander'); }
          else if (r < 0.7) this.setChaoState(e, 'sit');
          else e.timer = 2000 + Math.random() * 3000;
        }
        break;
      case 'wander':
        this.moveChao(e, dt);
        if (e.timer <= 0) this.setChaoState(e, 'idle');
        break;
      case 'sit':
        if (e.timer <= 0) {
          if (Math.random() < 0.3 && e.data.happiness > 20) this.setChaoState(e, 'sleep');
          else this.setChaoState(e, 'idle');
        }
        break;
      case 'sleep':
        // Recover HP slightly while sleeping
        e.data.hp = clamp(e.data.hp + 0.002 * dt / 16.67, 0, 100);
        if (e.timer <= 0) this.setChaoState(e, 'idle');
        break;
      case 'eat':
        if (e.timer <= 0) this.setChaoState(e, 'happy');
        break;
      case 'happy':
        if (e.timer <= 0) this.setChaoState(e, 'idle');
        break;
      case 'sad':
        if (e.timer <= 0) this.setChaoState(e, 'idle');
        break;
    }
  }

  setChaoState(e: ChaoEntity, s: ChaoState) {
    e.state = s;
    const k = e.texKey;
    switch (s) {
      case 'idle': e.timer = 2000 + Math.random() * 4000; e.sprite.play(`${k}_idle`); break;
      case 'wander': e.timer = 10000; e.sprite.play(`${k}_walk`); break;
      case 'sit': e.timer = 3000 + Math.random() * 5000; e.sprite.play(`${k}_sit`); break;
      case 'sleep': e.timer = 8000 + Math.random() * 12000; e.sprite.play(`${k}_sleep`); break;
      case 'eat': e.timer = 1500; e.sprite.play(`${k}_eat`); break;
      case 'happy': e.timer = 1500; e.sprite.play(`${k}_happy`); break;
      case 'sad': e.timer = 2000; e.sprite.play(`${k}_sad`); break;
    }
  }

  moveChao(e: ChaoEntity, dt: number) {
    const spd = this.getSpd(e.data.personality);
    const dx = e.tx - e.sprite.x, dy = e.ty - e.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) { this.setChaoState(e, 'idle'); return; }
    const step = spd * dt / 1000;
    e.sprite.x += (dx / dist) * step;
    e.sprite.y += (dy / dist) * step;
    e.sprite.flipX = dx < 0;
    e.label.setPosition(e.sprite.x, e.sprite.y + 22);
    e.data.x = e.sprite.x; e.data.y = e.sprite.y;
  }

  getSpd(p: Personality): number {
    return p === 'active' ? 42 : p === 'curious' ? 32 : p === 'shy' ? 22 : 16;
  }

  // -- Evolution --

  checkEvo(e: ChaoEntity) {
    const d = e.data;
    const mx = Math.max(d.stats.swim, d.stats.fly, d.stats.run, d.stats.power, d.stats.stamina);
    let evolved = false;
    if (d.stage === 'child' && mx >= EVO_THRESHOLD_1) { d.stage = 'evolved1'; d.type = getDominantType(d.stats) as ChaoType; evolved = true; }
    else if (d.stage === 'evolved1' && mx >= EVO_THRESHOLD_2) { d.stage = 'evolved2'; d.type = getDominantType(d.stats) as ChaoType; evolved = true; }
    if (!evolved) return;

    sfx('evolve');
    const nk = chaoTexKey(d.color, d.stage, d.type);
    generateChaoSheet(this, nk, d.color, d.stage, d.type);
    createChaoAnims(this, nk);
    e.texKey = nk;
    e.sprite.setTexture(nk, 0);
    this.setChaoState(e, 'happy');
    e.sprite.play(`${nk}_happy`);

    this.floatText(e.sprite.x, e.sprite.y - 35, 'EVOLVED!', '#ffd700');
    // Stars
    for (let i = 0; i < 8; i++) {
      const st = this.add.image(e.sprite.x, e.sprite.y, 'star').setDepth(999);
      this.tweens.add({
        targets: st,
        x: st.x + (Math.random() - 0.5) * 70,
        y: st.y - 20 + (Math.random() - 0.5) * 50,
        alpha: 0, duration: 900, onComplete: () => st.destroy(),
      });
    }
    // Flash
    this.cameras.main.flash(400, 255, 255, 200);
    doSave(this);
  }

  // -- Update --

  update(_t: number, dt: number) {
    const gm = dt / GAME_MINUTE_MS;
    for (const e of this.ents) {
      this.tickAI(e, dt);
      e.data.hp = clamp(e.data.hp - HUNGER_RATE * gm, 0, 100);
      e.data.happiness = clamp(e.data.happiness - HAPPINESS_DECAY * gm, 0, 100);
      e.data.age += gm;
      if (e.data.hp < 20 && e.state === 'idle' && Math.random() < 0.0005 * dt) this.setChaoState(e, 'sad');
      e.sprite.setDepth(e.sprite.y);
      e.label.setDepth(e.sprite.y + 0.1);
    }
    if (this.sel) this.ring.setPosition(this.sel.sprite.x, this.sel.sprite.y + 18);
    // Refresh action bar periodically to update HP/happy bars
    this.st += dt;
    if (this.st > 2000 && this.mode === 'act' && this.sel) { this.st = 0; this.buildActBar(); }
    // Auto-save
    this.gt += dt;
    if (this.gt > 30000) { this.gt = 0; doSave(this); }
    this.shardTxt.setText(`${getShards(this)}`);
  }

  // -- Helpers --

  rndPt(): { x: number; y: number } {
    for (let i = 0; i < 30; i++) {
      const x = BOUNDS.x1 + Math.random() * (BOUNDS.x2 - BOUNDS.x1);
      const y = BOUNDS.y1 + Math.random() * (BOUNDS.y2 - BOUNDS.y1);
      const dx = x - POND.cx, dy = y - POND.cy;
      if ((dx * dx) / (POND.rx * POND.rx) + (dy * dy) / (POND.ry * POND.ry) > 1.3) return { x, y };
    }
    return { x: 240, y: 200 };
  }

  showMsg(msg: string) {
    const t = this.add.text(GW / 2, 40, msg, {
      fontSize: '8px', fontFamily: 'monospace', color: '#fff', backgroundColor: '#2c3e50aa',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(1002);
    this.tweens.add({ targets: t, alpha: 0, y: 30, duration: 3000, delay: 1500, onComplete: () => t.destroy() });
  }

  floatText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, {
      fontSize: '8px', fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(1000);
    this.tweens.add({ targets: t, y: y - 25, alpha: 0, duration: 1800, onComplete: () => t.destroy() });
  }
}
