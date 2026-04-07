import type { GameSave, ChaoBridge } from './types';

export function getShards(scene: Phaser.Scene): number {
  return (scene.registry.get('shards') as number) || 0;
}

export function getSave(scene: Phaser.Scene): GameSave {
  return scene.registry.get('save') as GameSave;
}

export function getBridge(scene: Phaser.Scene): ChaoBridge {
  return scene.registry.get('bridge') as ChaoBridge;
}

export function doSave(scene: Phaser.Scene): void {
  const bridge = getBridge(scene);
  const save = getSave(scene);
  save.lastSaveTime = Date.now();
  bridge.saveGame(JSON.stringify(save)).catch(() => {});
}

export async function spendShards(scene: Phaser.Scene, amount: number, reason: string): Promise<boolean> {
  const bridge = getBridge(scene);
  try {
    const result = await bridge.spendShards(amount, reason);
    if (result.ok) {
      scene.registry.set('shards', result.newBalance);
      return true;
    }
  } catch { /* network error */ }
  return false;
}

export async function earnShards(scene: Phaser.Scene, amount: number, reason: string): Promise<void> {
  const bridge = getBridge(scene);
  try {
    const result = await bridge.earnShards(amount, reason);
    if (result.ok) scene.registry.set('shards', result.newBalance);
  } catch { /* network error */ }
}
