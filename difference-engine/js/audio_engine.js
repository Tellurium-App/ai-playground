(function(root){
  'use strict';
  root.DE2Audio=class{
    constructor(){this.enabled=false;this.context=null;this.previous=null;}
    async toggle(){this.enabled=!this.enabled;if(this.enabled){if(!this.context)this.context=new(window.AudioContext||window.webkitAudioContext)();await this.context.resume();}return this.enabled;}
    click(carry){if(!this.enabled)return;const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
      osc.type=carry?'triangle':'square';osc.frequency.setValueAtTime(carry?1800:260,t);osc.frequency.exponentialRampToValueAtTime(carry?380:85,t+.025);
      gain.gain.setValueAtTime(carry?.045:.018,t);gain.gain.exponentialRampToValueAtTime(.001,t+.035);osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.04);}
    update(state){const key=state.cycle+':'+state.phase+':'+state.operation+':'+Math.floor(state.progress*(state.operation==='carry'?31:10));
      if(key!==this.previous){const i=Math.min(30,Math.floor(state.progress*31)),hasCarry=state.pulse.some(col=>col[i]>.5);if(state.operation==='add'||hasCarry)this.click(hasCarry);}this.previous=key;}
  };
})(globalThis);
