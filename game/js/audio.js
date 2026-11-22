// audio.js — all sound is synthesised with WebAudio: engine hum, sirens, gunshots,
// pickups, mission stingers and a lazy ambient music loop. No audio files are loaded.

export class SoundBank {
  constructor() { this.ctx = null; this.master = null; this.engineOsc = null; this.engineGain = null; this.sirenOsc = null; this.sirenGain = null; this.musicTimer = 0; this.muted = false; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }
  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.25, freq = 1200) {
    if (!this.ctx || this.muted) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
  }
  shot() { this.noise(0.12, 0.35, 2600); this.tone(140, 0.08, 'square', 0.12, 60); }
  punch() { this.noise(0.07, 0.2, 700); }
  crash() { this.noise(0.3, 0.4, 500); this.tone(90, 0.25, 'sawtooth', 0.15, 40); }
  pickup() { this.tone(660, 0.09, 'sine', 0.2); this.tone(990, 0.14, 'sine', 0.2, null, 0.08); }
  cash() { this.tone(880, 0.07, 'triangle', 0.22); this.tone(1320, 0.12, 'triangle', 0.22, null, 0.06); }
  missionDone() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, null, i * 0.11)); }
  missionStart() { [392, 523, 659].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.2, null, i * 0.09)); }
  busted() { [440, 415, 392, 370].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.14, null, i * 0.16)); }
  horn() { this.tone(370, 0.25, 'square', 0.12); this.tone(466, 0.25, 'square', 0.1); }
  door() { this.tone(180, 0.08, 'square', 0.15, 90); }
  setEngine(on, speedRatio = 0) {
    if (!this.ctx || this.muted) return;
    if (on && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator(); this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth'; this.engineGain.gain.value = 0.0;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master); this.engineOsc.start();
    }
    if (this.engineOsc) {
      this.engineOsc.frequency.value = 55 + Math.abs(speedRatio) * 130;
      this.engineGain.gain.value = on ? 0.06 + Math.abs(speedRatio) * 0.05 : 0;
      if (!on) { const o = this.engineOsc, g = this.engineGain; setTimeout(() => { try { o.stop(); } catch {} }, 120); this.engineOsc = null; this.engineGain = null; void g; }
    }
  }
  setSiren(on) {
    if (!this.ctx || this.muted) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator(); this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = 'triangle'; this.sirenGain.gain.value = 0.035;
      const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      lfo.frequency.value = 0.7; lg.gain.value = 180; lfo.connect(lg); lg.connect(this.sirenOsc.frequency);
      this.sirenOsc.frequency.value = 760; this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start(); lfo.start(); this.sirenLfo = lfo;
    }
    if (!on && this.sirenOsc) { try { this.sirenOsc.stop(); this.sirenLfo.stop(); } catch {} this.sirenOsc = null; }
  }
  music(dt) { // gentle marimba-ish loop over a I–vi–IV–V progression
    if (!this.ctx || this.muted) return;
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer = 2.4;
      const roots = [261.6, 220, 174.6, 196];
      const root = roots[Math.floor(Math.random() * roots.length)];
      [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(root * m, 0.5, 'sine', 0.045, null, i * 0.3));
      this.tone(root / 2, 1.6, 'triangle', 0.05);
    }
  }
}
