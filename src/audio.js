// Tiny WebAudio synth for game SFX; no asset files needed.
export class Audio {
  constructor() {
    this.ctx = null;
    this.volume = 0.35;
    this.muted = false;
    this.last = {};
  }
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }
  tone({ freq = 440, freq2 = null, dur = 0.1, type = 'square', vol = 0.3, delay = 0, noise = false }) {
    const c = this.ctx;
    if (!c || this.muted) return;
    const t0 = c.currentTime + delay;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    g.connect(this.master);
    if (noise) {
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq;
      src.connect(f); f.connect(g);
      src.start(t0);
      return;
    }
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, t0 + dur);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  // Rate-limited named effects.
  play(name) {
    if (!this.ctx) return;
    const now = performance.now();
    const gap = { hit: 45, shoot: 60, gem: 35, coin: 50, explode: 90, zap: 80, hurt: 150 }[name] ?? 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'hit': this.tone({ freq: 220 + Math.random() * 60, freq2: 90, dur: 0.06, type: 'square', vol: 0.08 }); break;
      case 'shoot': this.tone({ freq: 700, freq2: 300, dur: 0.06, type: 'triangle', vol: 0.06 }); break;
      case 'swing': this.tone({ freq: 1800, dur: 0.12, noise: true, vol: 0.15 }); break;
      case 'explode': this.tone({ freq: 600, dur: 0.35, noise: true, vol: 0.3 }); break;
      case 'zap': this.tone({ freq: 1400, freq2: 200, dur: 0.15, type: 'sawtooth', vol: 0.08 }); break;
      case 'gem': this.tone({ freq: 900 + Math.random() * 300, freq2: 1500, dur: 0.05, type: 'sine', vol: 0.07 }); break;
      case 'coin': this.tone({ freq: 1300, dur: 0.05, type: 'square', vol: 0.05 }); this.tone({ freq: 1750, dur: 0.08, type: 'square', vol: 0.05, delay: 0.05 }); break;
      case 'hurt': this.tone({ freq: 200, freq2: 60, dur: 0.2, type: 'sawtooth', vol: 0.2 }); break;
      case 'jump': this.tone({ freq: 300, freq2: 600, dur: 0.1, type: 'sine', vol: 0.1 }); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.15, type: 'triangle', vol: 0.15, delay: i * 0.07 })); break;
      case 'chest': [392, 523, 659, 880].forEach((f, i) => this.tone({ freq: f, dur: 0.2, type: 'square', vol: 0.08, delay: i * 0.06 })); break;
      case 'shrine': [440, 554, 659].forEach((f, i) => this.tone({ freq: f, dur: 0.4, type: 'sine', vol: 0.15, delay: i * 0.1 })); break;
      case 'boss': this.tone({ freq: 90, freq2: 40, dur: 1.2, type: 'sawtooth', vol: 0.3 }); this.tone({ freq: 400, dur: 1.0, noise: true, vol: 0.2 }); break;
      case 'warn': this.tone({ freq: 880, dur: 0.12, type: 'square', vol: 0.08 }); break;
      case 'death': this.tone({ freq: 400, freq2: 50, dur: 1.2, type: 'triangle', vol: 0.3 }); break;
      case 'portal': this.tone({ freq: 200, freq2: 1200, dur: 0.8, type: 'sine', vol: 0.2 }); break;
      case 'buy': this.tone({ freq: 200, dur: 0.1, type: 'square', vol: 0.1 }); break;
      case 'deny': this.tone({ freq: 150, dur: 0.15, type: 'square', vol: 0.1 }); break;
      case 'break': this.tone({ freq: 2500, dur: 0.15, noise: true, vol: 0.15 }); break;
    }
  }
}
