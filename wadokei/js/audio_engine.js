(function(root){'use strict';
  class BellAudio{constructor(){this.enabled=false;this.context=null;this.nodes=new Set();}
    async setEnabled(on){if(on){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;this.context??=new Audio();await this.context.resume();}else this.cancel();this.enabled=on;}
    cancel(){for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();}
    strike(delay=0){if(!this.enabled||!this.context)return;const c=this.context,t=c.currentTime+delay;
      for(const [ratio,volume,decay]of [[1,.18,3.8],[2.01,.055,2.5],[2.76,.035,1.8],[4.08,.018,1.0]]){const osc=c.createOscillator(),g=c.createGain();osc.type='sine';osc.frequency.value=510*ratio;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+decay);osc.connect(g);g.connect(c.destination);this.nodes.add(osc);osc.onended=()=>{this.nodes.delete(osc);osc.disconnect();g.disconnect();};osc.start(t);osc.stop(t+decay+.05);}}
    ring(count){for(let i=0;i<count;i++)this.strike(i*.50);}}
  root.WadokeiAudio=BellAudio;
})(globalThis);
