(function(root){
  'use strict';
  function create(){
    let context=null,enabled=false,accumulator=0,tickCount=0;const events=[];
    async function setEnabled(value){
      if(value&&!context){const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return false;context=new Audio();}
      if(value&&context.state==='suspended')await context.resume();enabled=!!value;return enabled;
    }
    function tick(velocity,delay=0){
      if(!context||!enabled)return;const now=context.currentTime+delay,osc=context.createOscillator(),gain=context.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(tickCount++%2?2350:3100,now);gain.gain.setValueAtTime(.021,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.035);osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+.04);
      const ring=context.createOscillator(),rg=context.createGain();ring.frequency.value=620+Math.min(300,Math.abs(velocity)*10);rg.gain.setValueAtTime(.004,now);rg.gain.exponentialRampToValueAtTime(.0001,now+.16);ring.connect(rg);rg.connect(context.destination);ring.start(now);ring.stop(now+.17);
      events.push({at:now,velocity});if(events.length>100)events.shift();
    }
    function advance(deltaYears){if(!enabled)return;const velocity=Math.abs(deltaYears)*365.25636;accumulator+=velocity;const n=Math.min(4,Math.floor(accumulator/2));if(n){accumulator%=2;for(let i=0;i<n;i++)tick(velocity,i*.012);}}
    return{setEnabled,advance,events,get enabled(){return enabled;},get state(){return context?context.state:'off';}};
  }
  root.OrreryAudio={create};
})(typeof window!=='undefined'?window:globalThis);
