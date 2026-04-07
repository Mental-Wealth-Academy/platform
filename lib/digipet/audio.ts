let audioCtx: AudioContext | null = null;
let enabled = true;

export function initAudio() {
  try { audioCtx = new AudioContext(); } catch { /* no audio support */ }
}

export function setAudioEnabled(on: boolean) { enabled = on; }

function beep(freq: number, dur: number, vol = 0.15, type: OscillatorType = 'square') {
  if (!audioCtx || !enabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

export function sfx(name: string) {
  if (!audioCtx || !enabled) return;
  switch (name) {
    case 'click':
      beep(800, 0.06, 0.1);
      break;
    case 'coin':
      beep(800, 0.08, 0.1);
      setTimeout(() => beep(1200, 0.1, 0.1), 60);
      break;
    case 'feed':
      beep(400, 0.05, 0.08);
      setTimeout(() => beep(500, 0.05, 0.08), 40);
      setTimeout(() => beep(600, 0.05, 0.08), 80);
      break;
    case 'pet':
      beep(600, 0.1, 0.08, 'sine');
      setTimeout(() => beep(800, 0.15, 0.08, 'sine'), 80);
      break;
    case 'happy':
      beep(523, 0.12, 0.1, 'sine');
      setTimeout(() => beep(659, 0.12, 0.1, 'sine'), 100);
      setTimeout(() => beep(784, 0.2, 0.1, 'sine'), 200);
      break;
    case 'sad':
      beep(400, 0.15, 0.08, 'sine');
      setTimeout(() => beep(300, 0.2, 0.08, 'sine'), 120);
      break;
    case 'levelup':
      beep(523, 0.1, 0.12, 'sine');
      setTimeout(() => beep(659, 0.1, 0.12, 'sine'), 100);
      setTimeout(() => beep(784, 0.1, 0.12, 'sine'), 200);
      setTimeout(() => beep(1047, 0.3, 0.12, 'sine'), 300);
      break;
    case 'evolve':
      for (let i = 0; i < 8; i++) {
        setTimeout(() => beep(400 + i * 100, 0.15, 0.1, 'sine'), i * 100);
      }
      break;
    case 'hatch':
      beep(300, 0.05, 0.1);
      setTimeout(() => beep(400, 0.05, 0.1), 50);
      setTimeout(() => beep(600, 0.08, 0.12), 100);
      setTimeout(() => beep(800, 0.15, 0.12, 'sine'), 200);
      setTimeout(() => beep(1000, 0.3, 0.12, 'sine'), 350);
      break;
    case 'error':
      beep(300, 0.15, 0.1);
      setTimeout(() => beep(200, 0.2, 0.1), 120);
      break;
    case 'buy':
      beep(600, 0.05, 0.1);
      setTimeout(() => beep(900, 0.1, 0.1), 60);
      break;
    case 'race_start':
      beep(400, 0.15, 0.1);
      setTimeout(() => beep(400, 0.15, 0.1), 300);
      setTimeout(() => beep(800, 0.3, 0.12), 600);
      break;
    case 'win':
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
        setTimeout(() => beep(f, 0.15, 0.12, 'sine'), i * 120);
      });
      break;
    case 'tap':
      beep(500, 0.03, 0.06);
      break;
    case 'egg_crack':
      // Crunchy crack sound — noise-like burst
      beep(150, 0.04, 0.12, 'sawtooth');
      setTimeout(() => beep(120, 0.06, 0.1, 'sawtooth'), 30);
      setTimeout(() => beep(180, 0.04, 0.08, 'sawtooth'), 70);
      break;
    case 'breed':
      // Romantic jingle
      [392, 494, 587, 659, 784].forEach((f, i) => {
        setTimeout(() => beep(f, 0.2, 0.1, 'sine'), i * 140);
      });
      break;
    case 'snore':
      beep(120, 0.3, 0.04, 'sine');
      setTimeout(() => beep(100, 0.4, 0.03, 'sine'), 350);
      break;
    case 'bounce':
      beep(350, 0.06, 0.1, 'triangle');
      break;
    case 'splash':
      beep(200, 0.08, 0.06, 'sawtooth');
      setTimeout(() => beep(250, 0.06, 0.05, 'sawtooth'), 50);
      setTimeout(() => beep(180, 0.1, 0.04, 'sawtooth'), 100);
      break;
  }
}
