import Phaser from 'phaser';
import type { ChaoBridge, GameSave } from './types';
import { BootScene } from './scenes/BootScene';
import { GardenScene } from './scenes/GardenScene';
import { ShopScene } from './scenes/ShopScene';
import { MinigameScene } from './scenes/MinigameScene';
import { RaceScene } from './scenes/RaceScene';
import { BreedingScene } from './scenes/BreedingScene';
import { GW, GH } from './data';

export function createDigipetGame(
  container: HTMLElement,
  bridge: ChaoBridge,
  initialSave: GameSave,
  initialShards: number,
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GW,
    height: GH,
    parent: container,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    backgroundColor: '#111111',
    scene: [BootScene, GardenScene, ShopScene, MinigameScene, RaceScene, BreedingScene],
  };

  const game = new Phaser.Game(config);
  game.registry.set('bridge', bridge);
  game.registry.set('save', initialSave);
  game.registry.set('shards', initialShards);
  return game;
}
