(function(root){'use strict';
  function createAudio(){let context=null,enabled=false,last=-Infinity;
    function setEnabled(value){enabled=value;if(value){context=context||new (root.AudioContext||root.webkitAudioContext)();context.resume();}return enabled;}
    function play(event,speed){if(!enabled||!context)return;const now=context.currentTime;if(now-last<(speed>60?.35:.07))return;last=now;
      const kind=event.type,frequency={trip:160,step:250,shi_chu:1480,shi_zheng:520,ke:110}[kind]||200,duration=kind==='ke'?.17:kind==='shi_zheng'?1:.35;
      const gain=context.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='trip'||kind==='step'?.025:.065,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(context.destination);
      for(const ratio of (kind==='shi_chu'||kind==='shi_zheng'?[1,2.73,4.07]:[1])){const oscillator=context.createOscillator();oscillator.type=kind==='ke'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency*ratio,now);if(kind==='ke')oscillator.frequency.exponentialRampToValueAtTime(50,now+duration);oscillator.connect(gain);oscillator.start(now);oscillator.stop(now+duration);}
    }
    return {setEnabled,play,get enabled(){return enabled;}};
  }root.SuiunAudio={createAudio};
}(globalThis));
