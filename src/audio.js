// Tiny WebAudio synth for SFX plus a procedural music sequencer; no asset files needed.

// Per-realm music: scale (semitones from root), root note (MIDI), tempo and voices.
const THEMES = {
  menu: { root: 50, scale: [0, 2, 4, 7, 9], bpm: 84, prog: [0, 3, 4, 2], lead: 'triangle', bass: 'sine', drums: 0 },
  woods: { root: 48, scale: [0, 2, 4, 7, 9], bpm: 112, prog: [0, 4, 3, 1], lead: 'triangle', bass: 'triangle', drums: 1 },
  dunes: { root: 50, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 104, prog: [0, 1, 0, 5], lead: 'sawtooth', bass: 'triangle', drums: 1 },
  graveyard: { root: 45, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 92, prog: [0, 5, 3, 4], lead: 'square', bass: 'sine', drums: 1 },
  tundra: { root: 52, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 98, prog: [0, 3, 5, 4], lead: 'sine', bass: 'triangle', drums: 1 },
  caldera: { root: 42, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 132, prog: [0, 5, 6, 4], lead: 'sawtooth', bass: 'sawtooth', drums: 2 },
};

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, music: 0.5, sfx: 0.8 };
    this.muted = false;
    this.last = {};
    this.theme = 'menu';
    this.intensity = 0; // 0 normal, 1 boss, 2 final swarm
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.musicGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      this.startMusic();
    } catch { this.ctx = null; }
  }

  setVolumes(v) { Object.assign(this.vol, v); this.applyVolumes(); }
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : this.vol.master;
    this.sfxGain.gain.value = this.vol.sfx * 0.45;
    this.musicGain.gain.value = this.vol.music * 0.22;
  }
  setMuted(m) { this.muted = m; this.applyVolumes(); }

  tone({ freq = 440, freq2 = null, dur = 0.1, type = 'square', vol = 0.3, delay = 0, noise = false, out = null, at = null }) {
    const c = this.ctx;
    if (!c) return;
    const dest = out || this.sfxGain;
    const t0 = at ?? c.currentTime + delay;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    g.connect(dest);
    if (noise) {
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = freq > 3000 ? 'highpass' : 'lowpass';
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
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    const gap = { hit: 45, shoot: 60, gem: 35, coin: 50, explode: 90, zap: 80, hurt: 150, crit: 70 }[name] ?? 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'hit': this.tone({ freq: 220 + Math.random() * 60, freq2: 90, dur: 0.06, type: 'square', vol: 0.08 }); break;
      case 'crit': this.tone({ freq: 900, freq2: 300, dur: 0.08, type: 'square', vol: 0.1 }); break;
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
      case 'legendary': [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.14, delay: i * 0.07 })); break;
      case 'shrine': [440, 554, 659].forEach((f, i) => this.tone({ freq: f, dur: 0.4, type: 'sine', vol: 0.15, delay: i * 0.1 })); break;
      case 'boss': this.tone({ freq: 90, freq2: 40, dur: 1.2, type: 'sawtooth', vol: 0.3 }); this.tone({ freq: 400, dur: 1.0, noise: true, vol: 0.2 }); break;
      case 'warn': this.tone({ freq: 880, dur: 0.12, type: 'square', vol: 0.08 }); break;
      case 'death': this.tone({ freq: 400, freq2: 50, dur: 1.2, type: 'triangle', vol: 0.3 }); break;
      case 'portal': this.tone({ freq: 200, freq2: 1200, dur: 0.8, type: 'sine', vol: 0.2 }); break;
      case 'buy': this.tone({ freq: 200, dur: 0.1, type: 'square', vol: 0.1 }); break;
      case 'deny': this.tone({ freq: 150, dur: 0.15, type: 'square', vol: 0.1 }); break;
      case 'break': this.tone({ freq: 2500, dur: 0.15, noise: true, vol: 0.15 }); break;
      case 'click': this.tone({ freq: 1200, dur: 0.04, type: 'square', vol: 0.05 }); break;
    }
  }

  // ───────────────────────── music ─────────────────────────
  setTheme(name, intensity = 0) {
    if (!THEMES[name]) name = 'menu';
    if (name !== this.theme) { this.theme = name; this.bar = 0; }
    this.intensity = intensity;
  }

  startMusic() {
    this.step = 0;
    this.bar = 0;
    this.nextNote = this.ctx.currentTime + 0.1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const th = THEMES[this.theme];
    const bpm = th.bpm * (this.intensity === 2 ? 1.15 : this.intensity === 1 ? 1.08 : 1);
    const stepDur = 60 / bpm / 4; // 16th notes
    if (this.nextNote < c.currentTime - 0.05) this.nextNote = c.currentTime + 0.05; // tab was throttled
    while (this.nextNote < c.currentTime + 0.12) {
      this.playStep(th, this.step, this.nextNote, stepDur);
      this.nextNote += stepDur;
      this.step++;
      if (this.step % 16 === 0) this.bar++;
    }
  }

  playStep(th, step, t, sd) {
    const out = this.musicGain;
    const s = step % 16;
    const degree = th.prog[this.bar % th.prog.length];
    const sc = th.scale;
    const note = (deg, oct = 0) => th.root + sc[((deg % sc.length) + sc.length) % sc.length] + 12 * (oct + Math.floor(deg / sc.length));
    const hard = this.intensity > 0;
    // bass: root on 8ths, octave jump on the offbeat
    if (s % 4 === 0 || (hard && s % 2 === 0)) {
      const n = note(degree, s % 8 === 4 ? 0 : -1);
      this.tone({ freq: midi(n), dur: sd * (hard ? 1.6 : 3.2), type: th.bass, vol: 0.32, out, at: t });
    }
    // arpeggio: chord tones (1-3-5) climbing; sparser in the menu
    const arpEvery = this.theme === 'menu' ? 4 : hard ? 1 : 2;
    if (s % arpEvery === 0) {
      const chord = [0, 2, 4, 7];
      const idx = (s / arpEvery + this.bar) % chord.length;
      const n = note(degree + chord[idx], 1);
      this.tone({ freq: midi(n), dur: sd * 1.8, type: th.lead, vol: th.lead === 'sawtooth' || th.lead === 'square' ? 0.06 : 0.11, out, at: t });
    }
    // melody fragment every other bar
    if (this.bar % 2 === 1 && (s === 0 || s === 6 || s === 10) && this.theme !== 'menu') {
      const n = note(degree + [4, 2, 5][s === 0 ? 0 : s === 6 ? 1 : 2], 2);
      this.tone({ freq: midi(n), dur: sd * 3.5, type: 'triangle', vol: 0.09, out, at: t });
    }
    // drums
    const dr = th.drums + (hard ? 1 : 0);
    if (dr > 0) {
      if (s === 0 || s === 8 || (dr > 1 && (s === 10 || s === 14 && this.intensity === 2))) this.tone({ freq: 140, freq2: 45, dur: 0.18, type: 'sine', vol: 0.5, out, at: t });
      if (dr > 1 && (s === 4 || s === 12)) this.tone({ freq: 1800, dur: 0.12, noise: true, vol: 0.18, out, at: t });
      if (s % 2 === 0) this.tone({ freq: 7000, dur: 0.03, noise: true, vol: s % 4 === 2 ? 0.08 : 0.04, out, at: t });
    }
  }
}
