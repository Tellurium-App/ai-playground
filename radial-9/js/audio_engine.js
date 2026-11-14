(function (root) {
  'use strict';
  class RadialAudio {
    constructor() { this.context = null; this.enabled = false; this.events = 0; this.scheduledAngles = []; this.nodes = []; this.transport = null; }
    async enable() {
      if (!this.context) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) throw new Error('Web Audio unavailable');
        this.context = new AC(); this.master = this.context.createGain(); this.master.gain.value = .18;
        const compressor = this.context.createDynamicsCompressor(); this.master.connect(compressor); compressor.connect(this.context.destination);
        const n = Math.floor(this.context.sampleRate * .045), buffer = this.context.createBuffer(1, n, this.context.sampleRate);
        const data = buffer.getChannelData(0); let seed = 7391;
        for (let i = 0; i < n; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 1073741824 - 1) * Math.exp(-i / (n * .19)); } this.noise = buffer;
      }
      await this.context.resume(); this.enabled = true; this.master.gain.setTargetAtTime(.18, this.context.currentTime, .02);
    }
    disable() { this.enabled = false; this.cancel(); if (this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, .015); }
    cancel() { for (const node of this.nodes) { try { node.stop(); } catch (_) { /* Already stopped. */ } } this.nodes = []; }
    setTransport(angle, rpm, playing) {
      if (!this.context) return;
      this.cancel(); this.transport = { angle, rpm, playing, time: this.context.currentTime };
      this.nextAngle = (Math.floor(angle / 80) + 1) * 80;
    }
    clockAngle() {
      const a = this.transport;
      return a.angle + (a.playing ? (this.context.currentTime - a.time) * a.rpm * 6 : 0);
    }
    pulse(time, cylinder, angle) {
      if (!this.enabled) return;
      const c = this.context, t = Math.max(c.currentTime, time);
      const osc = c.createOscillator(), gain = c.createGain(), lowpass = c.createBiquadFilter();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(86 + cylinder * .7, t); osc.frequency.exponentialRampToValueAtTime(32, t + .14);
      gain.gain.setValueAtTime(.001, t); gain.gain.exponentialRampToValueAtTime(.9, t + .003); gain.gain.exponentialRampToValueAtTime(.001, t + .2);
      lowpass.type = 'lowpass'; lowpass.frequency.value = 420; osc.connect(lowpass); lowpass.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + .21);
      const tick = c.createBufferSource(), tickGain = c.createGain(); tick.buffer = this.noise; tickGain.gain.value = .11; tick.connect(tickGain); tickGain.connect(this.master); tick.start(t);
      this.nodes.push(osc, tick); osc.onended = () => { this.nodes = this.nodes.filter(n => n !== osc && n !== tick); };
      this.events++; this.scheduledAngles.push(angle); if (this.scheduledAngles.length > 64) this.scheduledAngles.shift();
    }
    schedule() {
      const a = this.transport;
      if (!this.enabled || !a || !a.playing || a.rpm <= 0) return;
      const horizon = this.clockAngle() + a.rpm * 6 * .08;
      while (this.nextAngle <= horizon) {
        const cylinder = root.RadialKinematics.SPEC.firingOrder[root.RadialKinematics.mod(this.nextAngle / 80, 9)];
        this.pulse(a.time + (this.nextAngle - a.angle) / (a.rpm * 6), cylinder, this.nextAngle);
        this.nextAngle += 80;
      }
    }
  }
  root.RadialAudio = RadialAudio;
})(window);
