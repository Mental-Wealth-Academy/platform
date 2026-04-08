// Generative pentatonic sound engine — pure Web Audio API, zero dependencies

export type SoundType =
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'navigation'
  | 'toggle-on'
  | 'toggle-off'
  | 'celebration'
  | 'alarm'
  | 'hum';

// C pentatonic scale frequencies
const PENTATONIC_C4 = [261.63, 293.66, 329.63, 392.0, 440.0];
const PENTATONIC_C3 = PENTATONIC_C4.map((f) => f / 2);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickIndex(len: number): number {
  return Math.floor(Math.random() * len);
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbInput: GainNode | null = null;
  private _volume = 0.7;
  private _muted = false;
  private _tempo = 1.0;

  get volume() {
    return this._volume;
  }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    this.syncGain();
  }

  get muted() {
    return this._muted;
  }
  set muted(m: boolean) {
    this._muted = m;
    this.syncGain();
  }

  get tempo() {
    return this._tempo;
  }
  set tempo(t: number) {
    this._tempo = t;
    this.rebuildReverb();
  }

  private syncGain() {
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
    }
  }

  /** Initialize AudioContext — call from a user gesture handler */
  init(): boolean {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);
      this.rebuildReverb();
      // Eagerly resume — required by Chrome/Safari autoplay policy
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return true;
    } catch (e) {
      console.warn('SoundEngine: failed to init AudioContext', e);
      return false;
    }
  }

  private rebuildReverb() {
    if (!this.ctx || !this.masterGain) return;
    // Disconnect old
    if (this.reverbInput) {
      try { this.reverbInput.disconnect(); } catch { /* ok */ }
    }

    const isSlowMode = this._tempo < 1;
    const input = this.ctx.createGain();
    input.gain.value = 1;

    // Dry path straight to master
    input.connect(this.masterGain);

    // Wet path: delay → filter → feedback loop → master
    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = isSlowMode ? 0.25 : 0.1;
    const fb = this.ctx.createGain();
    fb.gain.value = isSlowMode ? 0.5 : 0.2;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;

    input.connect(delay);
    delay.connect(filter);
    filter.connect(fb);
    fb.connect(delay); // feedback loop
    filter.connect(this.masterGain); // wet out

    this.reverbInput = input;
  }

  private scale(): number[] {
    return this._tempo < 1 ? PENTATONIC_C3 : PENTATONIC_C4;
  }

  private dur(base: number): number {
    return base / this._tempo;
  }

  /** Play a single tone. Uses setTargetAtTime for reliable envelope (no zero-value issues). */
  private tone(
    freq: number,
    startTime: number,
    duration: number,
    waveform: OscillatorType = 'triangle',
    gainPeak = 0.5,
  ) {
    const ctx = this.ctx;
    const dest = this.reverbInput;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveform;
    osc.frequency.value = freq;

    // Envelope: quick attack, hold, then release
    const attackTime = Math.min(duration * 0.15, 0.02);
    const releaseStart = startTime + duration * 0.5;

    gain.gain.setValueAtTime(0.0001, startTime); // start near-zero (not 0, avoids exponential issues)
    gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + attackTime);
    gain.gain.setValueAtTime(gainPeak, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  play(type: SoundType) {
    const ctx = this.ctx;
    if (!ctx || this._muted) return;

    // Resume if suspended (iOS Safari, Chrome autoplay)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Schedule slightly in the future to avoid past-time issues after resume
    const now = ctx.currentTime + 0.02;
    const scale = this.scale();

    switch (type) {
      case 'click': {
        this.tone(pick(scale), now, this.dur(0.2), 'sine', 0.4);
        break;
      }

      case 'hover': {
        // Lower octave, wide interval (P5), snappy attack with dreamy sine tail
        const hoverBase = pick(scale) / 2;
        this.tone(hoverBase, now, this.dur(0.08), 'sine', 0.2);
        this.tone(hoverBase * 1.5, now + this.dur(0.03), this.dur(0.14), 'sine', 0.15);
        break;
      }

      case 'success': {
        // 3-note ascending arpeggio
        const startIdx = pickIndex(scale.length - 2);
        for (let i = 0; i < 3; i++) {
          this.tone(scale[startIdx + i], now + i * this.dur(0.12), this.dur(0.2));
        }
        break;
      }

      case 'error': {
        // 2 notes, second a half-step below (gentle dissonance)
        const freq = pick(scale);
        this.tone(freq, now, this.dur(0.2));
        this.tone(freq * 0.944, now + this.dur(0.15), this.dur(0.2), 'triangle', 0.35);
        break;
      }

      case 'navigation': {
        // Soft washy P5 interval — sine, lower gain, longer release
        const base = pick(scale) / 2;
        const interval = Math.random() > 0.5 ? 4 / 3 : 3 / 2;
        this.tone(base, now, this.dur(0.25), 'sine', 0.15);
        this.tone(base * interval, now + this.dur(0.06), this.dur(0.3), 'sine', 0.12);
        break;
      }

      case 'toggle-on': {
        // Ascending pair — soft sine, matching click character
        this.tone(scale[0], now, this.dur(0.18), 'sine', 0.3);
        this.tone(scale[2], now + this.dur(0.1), this.dur(0.2), 'sine', 0.25);
        break;
      }

      case 'toggle-off': {
        // Descending pair — soft sine, matching click character
        this.tone(scale[2], now, this.dur(0.18), 'sine', 0.3);
        this.tone(scale[0], now + this.dur(0.1), this.dur(0.2), 'sine', 0.25);
        break;
      }

      case 'hum': {
        // Like hover but one octave deeper — same snappy two-tone P5
        const humBase = pick(scale) / 4;
        this.tone(humBase, now, this.dur(0.08), 'sine', 0.2);
        this.tone(humBase * 1.5, now + this.dur(0.03), this.dur(0.14), 'sine', 0.15);
        break;
      }

      case 'celebration': {
        // Full pentatonic run + shimmer
        for (let i = 0; i < scale.length; i++) {
          this.tone(scale[i], now + i * this.dur(0.1), this.dur(0.25), 'triangle', 0.4);
        }
        // Shimmer: high sine with LFO vibrato
        if (ctx && this.reverbInput) {
          const shimmer = ctx.createOscillator();
          const shimmerGain = ctx.createGain();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();

          shimmer.type = 'sine';
          shimmer.frequency.value = scale[scale.length - 1] * 2;
          lfo.type = 'sine';
          lfo.frequency.value = 6;
          lfoGain.gain.value = 15;

          lfo.connect(lfoGain);
          lfoGain.connect(shimmer.frequency);
          shimmer.connect(shimmerGain);
          shimmerGain.connect(this.reverbInput);

          const shimmerStart = now + scale.length * this.dur(0.1);
          shimmerGain.gain.setValueAtTime(0.0001, shimmerStart);
          shimmerGain.gain.exponentialRampToValueAtTime(0.25, shimmerStart + this.dur(0.05));
          shimmerGain.gain.setValueAtTime(0.25, shimmerStart + this.dur(0.2));
          shimmerGain.gain.exponentialRampToValueAtTime(0.0001, shimmerStart + this.dur(0.5));

          shimmer.start(shimmerStart);
          shimmer.stop(shimmerStart + this.dur(0.6));
          lfo.start(shimmerStart);
          lfo.stop(shimmerStart + this.dur(0.6));
        }
        break;
      }

      case 'alarm': {
        const base = scale[3];
        this.tone(base, now, this.dur(0.18), 'square', 0.28);
        this.tone(base * 1.5, now + this.dur(0.12), this.dur(0.2), 'triangle', 0.24);
        this.tone(scale[4] * 2, now + this.dur(0.3), this.dur(0.34), 'sine', 0.18);
        break;
      }
    }
  }

  destroy() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.reverbInput = null;
    }
  }
}
