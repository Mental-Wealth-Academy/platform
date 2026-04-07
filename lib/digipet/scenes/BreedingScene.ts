import Phaser from 'phaser';
import type { GameSave, ChaoData, EggData, ChaoGenes } from '@/lib/digipet/types';
import { GW, GH, getChaoLevel, breedGenes, uid, clamp, rgbToHex, MAX_CHAO } from '@/lib/digipet/data';
import { sfx } from '@/lib/digipet/audio';
import { getSave, doSave } from '@/lib/digipet/helpers';

export class BreedingScene extends Phaser.Scene {
  save!: GameSave;
  adults: ChaoData[] = [];
  parent1: ChaoData | null = null;
  parent2: ChaoData | null = null;
  previewGenes: ChaoGenes | null = null;
  content!: Phaser.GameObjects.Container;

  constructor() { super('Breeding'); }

  create() {
    this.save = getSave(this);
    this.adults = this.save.chao.filter(c => c.stage === 'evolved1' || c.stage === 'evolved2');
    this.parent1 = null;
    this.parent2 = null;
    this.previewGenes = null;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2a1a2e, 0x2a1a2e, 0x1a0d1e, 0x1a0d1e);
    bg.fillRect(0, 0, GW, GH);

    this.add.text(GW / 2, 14, 'BREEDING', {
      fontSize: '14px', fontFamily: 'monospace', color: '#e91e8c',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.content = this.add.container(0, 0);
    this.buildUI();

    this.makeBtn(GW / 2, GH - 18, 80, 22, 'Back', () => {
      sfx('click'); doSave(this);
      this.scene.start('Garden');
    }, 0x888888);
  }

  buildUI() {
    this.content.removeAll(true);

    if (this.adults.length < 2) {
      this.content.add(this.add.text(GW / 2, GH / 2 - 20, 'Need at least 2 evolved Chao to breed!', {
        fontSize: '9px', fontFamily: 'monospace', color: '#e74c3c',
      }).setOrigin(0.5));
      this.content.add(this.add.text(GW / 2, GH / 2, 'Train your Chao until they evolve.', {
        fontSize: '7px', fontFamily: 'monospace', color: '#aaa',
      }).setOrigin(0.5));
      return;
    }

    // Parent selection
    this.content.add(this.add.text(GW / 2, 34, 'Select two parents:', {
      fontSize: '8px', fontFamily: 'monospace', color: '#aaa',
    }).setOrigin(0.5));

    // Parent 1 slot
    this.drawParentSlot(GW / 4, 90, 1, this.parent1);
    // Heart
    this.content.add(this.add.text(GW / 2, 90, '\u2665', {
      fontSize: '16px', fontFamily: 'monospace', color: '#e91e8c',
    }).setOrigin(0.5));
    // Parent 2 slot
    this.drawParentSlot(3 * GW / 4, 90, 2, this.parent2);

    // Chao list for selection
    this.content.add(this.add.text(16, 140, 'Available Chao:', {
      fontSize: '8px', fontFamily: 'monospace', color: '#aaa',
    }));

    this.adults.forEach((chao, i) => {
      const x = 30 + (i % 4) * 110;
      const y = 158 + Math.floor(i / 4) * 44;
      const isP1 = this.parent1 === chao;
      const isP2 = this.parent2 === chao;
      const selected = isP1 || isP2;

      const p = this.add.graphics();
      p.fillStyle(selected ? 0x4a2050 : 0x2c3e50, 0.85);
      p.fillRoundedRect(x - 8, y - 6, 100, 36, 3);
      if (selected) { p.lineStyle(1, 0xe91e8c); p.strokeRoundedRect(x - 8, y - 6, 100, 36, 3); }
      this.content.add(p);

      // Color swatch
      const cs = this.add.graphics();
      cs.fillStyle(Phaser.Display.Color.GetColor(chao.color.r, chao.color.g, chao.color.b));
      cs.fillCircle(x + 6, y + 10, 6);
      this.content.add(cs);

      this.content.add(this.add.text(x + 16, y, chao.name, {
        fontSize: '7px', fontFamily: 'monospace', color: '#fff',
      }));
      this.content.add(this.add.text(x + 16, y + 10, `Lv.${getChaoLevel(chao.stats)} ${chao.type}`, {
        fontSize: '6px', fontFamily: 'monospace', color: '#aaa',
      }));

      if (isP1) {
        this.content.add(this.add.text(x + 16, y + 20, 'Parent 1', {
          fontSize: '6px', fontFamily: 'monospace', color: '#e91e8c',
        }));
      } else if (isP2) {
        this.content.add(this.add.text(x + 16, y + 20, 'Parent 2', {
          fontSize: '6px', fontFamily: 'monospace', color: '#e91e8c',
        }));
      }

      const hit = this.add.rectangle(x + 42, y + 12, 100, 36).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      hit.on('pointerdown', () => this.selectParent(chao));
      this.content.add(hit);
    });

    // Preview & Breed button
    if (this.parent1 && this.parent2) {
      this.previewGenes = breedGenes(this.parent1.genes, this.parent2.genes);
      this.drawPreview();

      // Check egg capacity
      const totalChao = this.save.chao.length + this.save.eggs.length;
      if (totalChao >= MAX_CHAO) {
        this.content.add(this.add.text(GW / 2, GH - 50, 'Garden is full! (max 8)', {
          fontSize: '8px', fontFamily: 'monospace', color: '#e74c3c',
        }).setOrigin(0.5));
      } else {
        const bBtn = this.add.graphics();
        bBtn.fillStyle(0xe91e8c, 0.9); bBtn.fillRoundedRect(GW / 2 - 50, GH - 58, 100, 26, 4);
        this.content.add(bBtn);
        const bTxt = this.add.text(GW / 2, GH - 45, '\u2665 Breed \u2665', {
          fontSize: '10px', fontFamily: 'monospace', color: '#fff',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        bTxt.on('pointerdown', () => this.doBreed());
        this.content.add(bTxt);
      }
    }
  }

  selectParent(chao: ChaoData) {
    sfx('tap');
    if (this.parent1 === chao) { this.parent1 = null; }
    else if (this.parent2 === chao) { this.parent2 = null; }
    else if (!this.parent1) { this.parent1 = chao; }
    else if (!this.parent2 && chao !== this.parent1) { this.parent2 = chao; }
    else {
      // Replace parent1
      this.parent1 = chao;
      if (this.parent2 === chao) this.parent2 = null;
    }
    this.buildUI();
  }

  drawParentSlot(x: number, y: number, num: number, parent: ChaoData | null) {
    const p = this.add.graphics();
    p.fillStyle(0x2c3e50, 0.7); p.fillRoundedRect(x - 50, y - 30, 100, 60, 4);
    p.lineStyle(1, 0x4a6278); p.strokeRoundedRect(x - 50, y - 30, 100, 60, 4);
    this.content.add(p);

    if (parent) {
      const cs = this.add.graphics();
      cs.fillStyle(Phaser.Display.Color.GetColor(parent.color.r, parent.color.g, parent.color.b));
      cs.fillCircle(x - 25, y, 10);
      this.content.add(cs);
      this.content.add(this.add.text(x - 10, y - 12, parent.name, {
        fontSize: '8px', fontFamily: 'monospace', color: '#fff',
      }));
      this.content.add(this.add.text(x - 10, y, `Lv.${getChaoLevel(parent.stats)}`, {
        fontSize: '7px', fontFamily: 'monospace', color: '#aaa',
      }));
      this.content.add(this.add.text(x - 10, y + 12, parent.type, {
        fontSize: '7px', fontFamily: 'monospace', color: '#85c1e9',
      }));
    } else {
      this.content.add(this.add.text(x, y - 5, `Parent ${num}`, {
        fontSize: '8px', fontFamily: 'monospace', color: '#666',
      }).setOrigin(0.5));
      this.content.add(this.add.text(x, y + 8, 'Tap to select', {
        fontSize: '6px', fontFamily: 'monospace', color: '#444',
      }).setOrigin(0.5));
    }
  }

  drawPreview() {
    if (!this.previewGenes) return;
    const g = this.previewGenes;
    const color = rgbToHex(clamp(g.colorR, 0, 255), clamp(g.colorG, 0, 255), clamp(g.colorB, 0, 255));

    const y = 128;
    this.content.add(this.add.text(GW / 2, y, 'Offspring Preview:', {
      fontSize: '7px', fontFamily: 'monospace', color: '#e91e8c',
    }).setOrigin(0.5));

    // Color preview
    const cs = this.add.graphics();
    cs.fillStyle(parseInt(color.slice(1), 16));
    cs.fillCircle(GW / 2 - 60, y + 14, 5);
    this.content.add(cs);

    const growths = `S:${g.swimGrowth.toFixed(1)} F:${g.flyGrowth.toFixed(1)} R:${g.runGrowth.toFixed(1)} P:${g.powerGrowth.toFixed(1)}`;
    this.content.add(this.add.text(GW / 2 - 45, y + 10, growths, {
      fontSize: '6px', fontFamily: 'monospace', color: '#aaa',
    }));

    if (g.sparkle) {
      this.content.add(this.add.text(GW / 2 + 50, y + 10, '\u2726 Sparkle!', {
        fontSize: '6px', fontFamily: 'monospace', color: '#ffd700',
      }));
    }
  }

  doBreed() {
    if (!this.parent1 || !this.parent2 || !this.previewGenes) return;
    sfx('breed');

    // Create egg
    const genes = this.previewGenes;
    const egg: EggData = {
      id: uid(),
      genes,
      color: { r: clamp(genes.colorR, 0, 255), g: clamp(genes.colorG, 0, 255), b: clamp(genes.colorB, 0, 255) },
      hatchProgress: 25, // Bred eggs start partially hatched
      x: 200 + Math.random() * 80,
      y: 160 + Math.random() * 60,
    };
    this.save.eggs.push(egg);

    // Hearts animation
    for (let i = 0; i < 10; i++) {
      const h = this.add.image(
        GW / 2 + (Math.random() - 0.5) * 200,
        80 + Math.random() * 40,
        'heart'
      ).setDepth(999);
      this.tweens.add({
        targets: h,
        y: h.y - 30 - Math.random() * 30,
        alpha: 0,
        duration: 1000 + Math.random() * 500,
        delay: i * 80,
        onComplete: () => h.destroy(),
      });
    }

    doSave(this);

    // Show success message
    const msg = this.add.text(GW / 2, GH / 2, 'An egg appeared in the garden!', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
      backgroundColor: '#2c3e50cc', padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: msg, alpha: 0, y: GH / 2 - 30,
      duration: 2000, delay: 1500,
      onComplete: () => {
        msg.destroy();
        // Go back to garden
        this.scene.start('Garden');
      },
    });
  }

  makeBtn(x: number, y: number, w: number, h: number, label: string, cb: () => void, color = 0x3498db) {
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(color, 0.9); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
    const t = this.add.text(x, y, label, {
      fontSize: '9px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0.5).setDepth(10);
    const hit = this.add.rectangle(x, y, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(10);
    hit.on('pointerover', () => t.setColor('#ffd700'));
    hit.on('pointerout', () => t.setColor('#fff'));
    hit.on('pointerdown', () => cb());
  }
}
