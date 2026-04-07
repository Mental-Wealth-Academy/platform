import Phaser from 'phaser';
import type { GameSave, FoodType, ItemType } from '@/lib/digipet/types';
import { GW, GH, FOODS, ITEMS, COLORS } from '@/lib/digipet/data';
import { sfx } from '@/lib/digipet/audio';
import { getShards, getSave, doSave, spendShards } from '@/lib/digipet/helpers';

type Tab = 'food' | 'items' | 'colors';

export class ShopScene extends Phaser.Scene {
  save!: GameSave;
  tab: Tab = 'food';
  content!: Phaser.GameObjects.Container;
  shardTxt!: Phaser.GameObjects.Text;

  constructor() { super('Shop'); }

  create() {
    this.save = getSave(this);

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a252f, 0x1a252f, 0x0d1b2a, 0x0d1b2a);
    bg.fillRect(0, 0, GW, GH);

    // Title
    this.add.text(GW / 2, 12, 'SHOP', {
      fontSize: '14px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Shard display
    this.add.image(GW - 60, 12, 'coin').setScale(1.2);
    this.shardTxt = this.add.text(GW - 50, 8, `${getShards(this)}`, {
      fontSize: '9px', fontFamily: 'monospace', color: '#f1c40f',
      stroke: '#000', strokeThickness: 2,
    });

    // Tabs
    const tabs: [Tab, string, number][] = [['food', 'Food', 0xe67e22], ['items', 'Items', 0x3498db], ['colors', 'Colors', 0x9b59b6]];
    tabs.forEach(([key, label, color], i) => {
      const x = 80 + i * 120;
      const g = this.add.graphics();
      const isActive = this.tab === key;
      g.fillStyle(isActive ? color : 0x444444, 0.9);
      g.fillRoundedRect(x - 45, 28, 90, 18, 3);
      const t = this.add.text(x, 37, label, {
        fontSize: '9px', fontFamily: 'monospace', color: '#fff',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => { sfx('click'); this.tab = key; this.buildContent(); });
    });

    // Content area
    this.content = this.add.container(0, 0);
    this.buildContent();

    // Back button
    this.makeBtn(GW / 2, GH - 18, 80, 22, 'Back', () => {
      sfx('click');
      doSave(this);
      this.scene.start('Garden');
    }, 0x888888);
  }

  buildContent() {
    this.content.removeAll(true);
    switch (this.tab) {
      case 'food': this.buildFoodTab(); break;
      case 'items': this.buildItemsTab(); break;
      case 'colors': this.buildColorsTab(); break;
    }
  }

  buildFoodTab() {
    const foods = Object.values(FOODS);
    foods.forEach((food, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 60 + col * 210;
      const y = 65 + row * 50;

      // Panel
      const p = this.add.graphics();
      p.fillStyle(0x2c3e50, 0.8); p.fillRoundedRect(x - 50, y - 18, 200, 42, 3);
      this.content.add(p);

      // Food circle
      const c = this.add.graphics();
      c.fillStyle(parseInt(food.color.slice(1), 16)); c.fillCircle(x - 30, y, 8);
      this.content.add(c);

      // Name + stat
      const boosts = Object.entries(food.statBoost).map(([k, v]) => `+${v} ${k}`).join(' ');
      this.content.add(this.add.text(x - 15, y - 10, food.name, {
        fontSize: '8px', fontFamily: 'monospace', color: '#fff' }));
      this.content.add(this.add.text(x - 15, y + 2, boosts || `+${food.hpRestore} HP`, {
        fontSize: '6px', fontFamily: 'monospace', color: '#aaa' }));

      // Inventory count
      const owned = this.save.inventory.food[food.type] || 0;
      this.content.add(this.add.text(x + 100, y - 8, `Own: ${owned}`, {
        fontSize: '7px', fontFamily: 'monospace', color: '#85c1e9' }));

      // Buy button
      this.shopBtn(x + 130, y + 4, `${food.price}`, () => {
        this.buyFood(food.type, food.price);
      });
    });
  }

  async buyFood(type: FoodType, price: number) {
    if (getShards(this) < price) { sfx('error'); return; }
    if (await spendShards(this, price, 'chao-shop')) {
      this.save.inventory.food[type] = (this.save.inventory.food[type] || 0) + 1;
      sfx('buy');
      this.shardTxt.setText(`${getShards(this)}`);
      this.buildContent();
    } else {
      sfx('error');
    }
  }

  buildItemsTab() {
    const items = Object.values(ITEMS);
    items.forEach((item, i) => {
      const y = 65 + i * 55;

      const p = this.add.graphics();
      p.fillStyle(0x2c3e50, 0.8); p.fillRoundedRect(20, y - 18, GW - 40, 48, 3);
      this.content.add(p);

      // Item sprite
      const key = `item_${item.type}`;
      if (this.textures.exists(key)) {
        this.content.add(this.add.image(50, y + 2, key));
      }

      // Info
      this.content.add(this.add.text(75, y - 10, item.name, {
        fontSize: '9px', fontFamily: 'monospace', color: '#fff' }));
      this.content.add(this.add.text(75, y + 4, item.description, {
        fontSize: '6px', fontFamily: 'monospace', color: '#aaa' }));

      // Owned check
      const owned = this.save.inventory.items[item.type] || 0;
      const placed = this.save.gardenItems.filter(g => g.type === item.type).length;

      if (owned > 0 || placed > 0) {
        this.content.add(this.add.text(GW - 90, y - 6, 'Owned', {
          fontSize: '8px', fontFamily: 'monospace', color: '#2ecc71' }));
        if (owned > 0 && placed === 0) {
          // Place button
          this.shopBtn(GW - 55, y + 10, 'Place', () => {
            this.save.inventory.items[item.type] = (this.save.inventory.items[item.type] || 0) - 1;
            if (this.save.inventory.items[item.type]! <= 0) delete this.save.inventory.items[item.type];
            this.save.gardenItems.push({
              type: item.type,
              x: 200 + Math.random() * 80,
              y: 150 + Math.random() * 80,
            });
            sfx('click');
            this.buildContent();
          });
        }
      } else {
        this.shopBtn(GW - 70, y, `${item.price}`, () => {
          this.buyItem(item.type, item.price);
        });
      }
    });
  }

  async buyItem(type: ItemType, price: number) {
    if (getShards(this) < price) { sfx('error'); return; }
    if (await spendShards(this, price, 'chao-shop')) {
      this.save.inventory.items[type] = (this.save.inventory.items[type] || 0) + 1;
      sfx('buy');
      this.shardTxt.setText(`${getShards(this)}`);
      this.buildContent();
    } else {
      sfx('error');
    }
  }

  buildColorsTab() {
    const scrollY = 0;
    COLORS.forEach((color, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 60 + col * 145;
      const y = 65 + row * 42 + scrollY;
      if (y > GH - 45) return; // off screen

      const p = this.add.graphics();
      p.fillStyle(0x2c3e50, 0.8); p.fillRoundedRect(x - 50, y - 14, 135, 34, 3);
      this.content.add(p);

      // Color swatch
      const c = this.add.graphics();
      if (color.r >= 0) {
        c.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
        c.fillCircle(x - 30, y + 2, 8);
      } else {
        // Rainbow - draw multi-color
        const rc = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0xff00ff];
        rc.forEach((cl, j) => { c.fillStyle(cl); c.fillRect(x - 38 + j * 3, y - 4, 3, 12); });
      }
      this.content.add(c);

      this.content.add(this.add.text(x - 15, y - 6, color.name, {
        fontSize: '7px', fontFamily: 'monospace', color: '#fff' }));

      const owned = this.save.purchasedColors.includes(i);
      if (owned) {
        this.content.add(this.add.text(x + 50, y - 2, '\u2713', {
          fontSize: '10px', fontFamily: 'monospace', color: '#2ecc71' }));
      } else if (color.price > 0) {
        this.shopBtn(x + 55, y + 2, `${color.price}`, () => {
          this.buyColor(i, color.price);
        });
      }
    });
  }

  async buyColor(colorIndex: number, price: number) {
    if (getShards(this) < price) { sfx('error'); return; }
    if (await spendShards(this, price, 'chao-shop')) {
      this.save.purchasedColors.push(colorIndex);
      sfx('buy');
      this.shardTxt.setText(`${getShards(this)}`);
      this.buildContent();
    } else {
      sfx('error');
    }
  }

  shopBtn(x: number, y: number, label: string, cb: () => void) {
    const g = this.add.graphics();
    g.fillStyle(0xe67e22, 0.9); g.fillRoundedRect(x - 22, y - 8, 44, 16, 2);
    this.content.add(g);
    const cIcon = this.add.image(x - 12, y, 'coin').setScale(0.7);
    this.content.add(cIcon);
    const t = this.add.text(x + 2, y, label, {
      fontSize: '7px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0, 0.5);
    this.content.add(t);
    const hit = this.add.rectangle(x, y, 44, 16).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    hit.on('pointerdown', () => cb());
    this.content.add(hit);
  }

  makeBtn(x: number, y: number, w: number, h: number, label: string, cb: () => void, color = 0x3498db) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.9); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
    const t = this.add.text(x, y, label, {
      fontSize: '9px', fontFamily: 'monospace', color: '#fff' }).setOrigin(0.5);
    const hit = this.add.rectangle(x, y, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    hit.on('pointerover', () => t.setColor('#ffd700'));
    hit.on('pointerout', () => t.setColor('#fff'));
    hit.on('pointerdown', () => cb());
  }
}
