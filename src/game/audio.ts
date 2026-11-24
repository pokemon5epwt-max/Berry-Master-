import type { WeatherType } from './types.ts';

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmActive = false;

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureCtx();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute) {
      this.stopBgm();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delay = 0,
    endFreq?: number
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.018, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noiseBurst(duration: number, filterFreq: number, volume = 0.1, delay = 0): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  public playPickup(): void {
    this.tone(360, 0.09, 'triangle', 0.16, 0, 520);
    this.tone(540, 0.1, 'sine', 0.1, 0.045, 680);
  }

  public playPutdown(): void {
    this.tone(420, 0.08, 'triangle', 0.14, 0, 290);
  }

  public playError(): void {
    this.tone(240, 0.09, 'triangle', 0.11, 0, 190);
  }

  public playWater(): void {
    this.noiseBurst(0.2, 1600, 0.09);
    this.tone(520, 0.1, 'sine', 0.1, 0.02, 760);
    this.tone(680, 0.12, 'sine', 0.09, 0.07, 920);
    this.tone(860, 0.14, 'sine', 0.08, 0.12, 1080);
  }

  public playRefill(): void {
    this.tone(440, 0.1, 'sine', 0.11, 0);
    this.tone(587.33, 0.11, 'sine', 0.11, 0.06);
    this.tone(783.99, 0.16, 'sine', 0.12, 0.12);
    this.noiseBurst(0.18, 1200, 0.06, 0.02);
  }

  public playPump(): void {
    this.tone(185, 0.09, 'triangle', 0.13, 0, 260);
    this.noiseBurst(0.14, 1400, 0.08, 0.05);
    this.tone(490, 0.12, 'sine', 0.1, 0.07, 720);
  }

  public playHarvest(): void {
    this.tone(523.25, 0.09, 'triangle', 0.14, 0);
    this.tone(659.25, 0.1, 'triangle', 0.14, 0.05);
    this.tone(783.99, 0.14, 'sine', 0.12, 0.1);
  }

  public playDeliver(): void {
    this.tone(523.25, 0.15, 'triangle', 0.14, 0);
    this.tone(659.25, 0.15, 'triangle', 0.14, 0.05);
    this.tone(783.99, 0.18, 'triangle', 0.14, 0.1);
    this.tone(1046.5, 0.28, 'sine', 0.15, 0.15);
  }

  public playBerryMasterCheer(): void {
    this.tone(783.99, 0.12, 'sine', 0.09, 0.18);
    this.tone(1174.66, 0.18, 'sine', 0.09, 0.25);
  }

  public playWeatherChange(weather: WeatherType): void {
    if (weather === 'rainy') {
      this.noiseBurst(0.32, 1900, 0.07, 0);
      this.tone(659.25, 0.14, 'sine', 0.08, 0.04, 523.25);
      this.tone(523.25, 0.18, 'sine', 0.08, 0.13, 392);
    } else if (weather === 'heatwave') {
      this.tone(440, 0.12, 'triangle', 0.08, 0, 587.33);
      this.tone(587.33, 0.16, 'sine', 0.08, 0.08, 783.99);
    } else {
      this.tone(523.25, 0.12, 'sine', 0.08, 0);
      this.tone(659.25, 0.16, 'sine', 0.08, 0.08);
    }
  }

  public playRake(): void {
    this.noiseBurst(0.16, 2200, 0.11, 0);
    this.noiseBurst(0.14, 2800, 0.09, 0.08);
    this.tone(480, 0.1, 'sine', 0.08, 0.11, 640);
  }

  public playWhistle(repelled: boolean): void {
    this.tone(920, 0.11, 'sine', 0.14, 0, 1180);
    this.tone(1180, 0.12, 'triangle', 0.11, 0.06, 980);
    if (repelled) {
      this.tone(784, 0.1, 'triangle', 0.13, 0.12);
      this.tone(1046.5, 0.12, 'triangle', 0.13, 0.18);
      this.tone(1318.5, 0.2, 'sine', 0.14, 0.24);
    }
  }

  public playCritterMunch(): void {
    this.tone(240, 0.07, 'square', 0.04, 0, 170);
    this.tone(210, 0.07, 'square', 0.04, 0.09, 150);
  }

  public playCritterAlert(): void {
    this.tone(490, 0.08, 'triangle', 0.08, 0, 620);
  }

  public playVictory(): void {
    this.stopBgm();
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5];
    const times = [0, 0.11, 0.22, 0.34, 0.48, 0.62];
    const durs = [0.14, 0.14, 0.14, 0.16, 0.14, 0.45];
    notes.forEach((n, i) => {
      this.tone(n, durs[i], i === notes.length - 1 ? 'sine' : 'triangle', 0.15, times[i]);
    });
  }

  public playGameOver(): void {
    this.stopBgm();
    const notes = [440, 392, 349.23, 293.66];
    notes.forEach((n, i) => {
      this.tone(n, 0.28, 'sine', 0.13, i * 0.18);
    });
  }

  public startBgm(): void {
    if (this.muted || this.bgmActive) return;
    this.bgmActive = true;
    // Cozy C-major pentatonic kalimba/marimba pattern
    const melody = [
      523.25, 0, 659.25, 587.33, 523.25, 0, 783.99, 659.25,
      440.0, 0, 523.25, 587.33, 659.25, 0, 523.25, 0,
      392.0, 0, 523.25, 659.25, 587.33, 0, 440.0, 392.0,
      523.25, 0, 587.33, 659.25, 523.25, 0, 0, 0,
    ];
    const bass = [261.63, 0, 0, 0, 261.63, 0, 0, 0, 220.0, 0, 0, 0, 174.61, 0, 196.0, 0];

    const tick = () => {
      if (!this.bgmActive || this.muted) return;
      const ctx = this.ensureCtx();
      if (ctx && ctx.state === 'running') {
        const m = melody[this.bgmStep % melody.length];
        if (m > 0) {
          this.tone(m, 0.24, 'sine', 0.032, 0);
        }
        const b = bass[this.bgmStep % bass.length];
        if (b > 0) {
          this.tone(b, 0.35, 'triangle', 0.025, 0);
        }
      }
      this.bgmStep++;
      this.bgmTimer = window.setTimeout(tick, 320);
    };

    tick();
  }

  public stopBgm(): void {
    this.bgmActive = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const soundManager = new SoundManager();
