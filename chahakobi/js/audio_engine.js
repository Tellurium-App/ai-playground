(function (root) {
  'use strict';
  function createAudio() {
    let context, enabled = false, last = -1;
    function setEnabled(value) {enabled = value; if (enabled) {context ||= new (root.AudioContext || root.webkitAudioContext)(); context.resume();}}
    function tick(s) {
      const n = Math.floor(s.osc);
      if (enabled && s.running && n !== last && context) {
        const osc = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
        osc.type = 'triangle'; osc.frequency.value = n % 2 ? 1200 : 950;
        gain.gain.setValueAtTime(.012, now); gain.gain.exponentialRampToValueAtTime(.0001, now + .018);
        osc.connect(gain).connect(context.destination); osc.start(now); osc.stop(now + .02);
      }
      last = n;
    }
    return {setEnabled, tick, get enabled() {return enabled;}};
  }
  root.ChahakobiAudio = {createAudio};
})(globalThis);
