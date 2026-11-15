(function(){'use strict';
  const E=WadokeiEngine,B=WadokeiBuilder,T=WadokeiStudio.THREE,$=id=>document.getElementById(id);
  const en={eyebrow:'MECHANICAL EXHIBITION / 1817',title:'Double-foliot tower clock',about:'About',speed:'Speed',speed1:'Real time (1 s = 1 s)',speed60:'1 s = 1 minute',speed600:'1 s = 10 minutes',speed7200:'1 s = 1 koku',observe:'Watch the foliot in real time',theta:'Elapsed koku θ',seek:'Stop at this koku',nextSwitch:'Just before the next six-bell switch',overview:'Overview',switchView:'Foliot exchange',escapement:'Escapement & foliots',dial:'Dial',orbit:'Drag to orbit · Two fingers on touchscreens',comparison:'CLOCK / APPARENT SOLAR TIME',indicated:'Clock indication',trueTime:'True seasonal time',realign:'Realign the clock',driftNote:'Only 26 grooves. Drift from true seasonal time is part of this clock’s behaviour.',conditions:'Date and location',preset:'Case preset',edo_geshi:'Edo · summer solstice / 3 days',edo_toji:'Edo · winter solstice / 3 days',kyoto_shunbun:'Kyoto · spring equinox / 3 days',edo_sekki_cross:'Edo · solar-term boundary / 4 days',edo_two_weeks:'Edo · two weeks in spring',nagasaki_aki:'Nagasaki · autumn equinox / 3 days',compare:'Compare summer and winter solstices',start:'Start date',days:'Days',place:'Location',latitude:'Latitude (°)',edo:'Edo',kyoto:'Kyoto',nagasaki:'Nagasaki',custom:'Custom latitude',apply:'Start at dawn with these settings',foliots:'Two foliots, day and night',dayFoliot:'Day foliot / 7g weights',nightFoliot:'Night foliot / 4g weights',period:'Full oscillation period',solarDay:'Today’s daylight and night',dawn:'Dawn six',dusk:'Dusk six',dayLength:'One daytime koku',nightLength:'One night-time koku',sekki:'Current solar term',setSekki:'Term used to set the weights',solarNote:'Local apparent solar time. Noon nine (solar transit) is 12:00.',inside:'Frame and wheel train',displayMode:'Display',normal:'Normal exhibition',cut:'Frame cutaway',focus:'Mechanism focus',explode:'Exploded view',rotations:'Wheel revolutions',dialWheel:'Dial / 72 teeth',wheel1:'First wheel / 64 teeth',wheel2:'Second wheel / 72 teeth',wheel3:'Third wheel / 66 teeth',escapeWheel:'Crown escapement / 15 teeth',yukiwa:'Snow wheel / 2 rev per day',oscillations:'Full foliot oscillations',footer:'Exhibition model combining the numerical basis of an 1817 clock with a general switching mechanism.',aboutTitle:'Two foliots and seasonal hours',close:'Close'};
  const ja={};document.querySelectorAll('[data-i18n]').forEach(el=>ja[el.dataset.i18n]=el.textContent);
  const app={language:'ja',playing:true,speed:1,sim:null,state:null,view:'overview',mode:'normal',explode:0,error:null,audio:new WadokeiAudio(),studio:null,lastNow:0};
  function setText(id,text,value){const el=$(id);el.textContent=text;if(value!==undefined)el.dataset.value=String(value);}
  const word=(jp,english)=>app.language==='ja'?jp:english;
  const timeLabel=sec=>{const m=Math.round(sec/60);return String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
  function clockLabel(th){const value=E.mod(th,12),i=Math.floor(value);return {name:(app.language==='ja'?E.HOUR_NAMES:E.HOUR_EN)[i],progress:(100*(value-i)).toFixed(1)+'%'};}
  function display(){const s=app.state;if(!s)return;const ind=clockLabel(s.theta_ind),truth=clockLabel(s.theta_true);
    setText('clockName',ind.name);setText('trueName',truth.name);setText('clockProgress',ind.progress);setText('trueProgress',truth.progress);
    setText('clockTheta',s.theta_ind.toFixed(9),s.theta_ind);setText('trueTheta',s.theta_true.toFixed(9),s.theta_true);
    const mins=Math.abs(s.error_s/60).toFixed(3),zero=Math.abs(s.error_s)<.03;
    setText('drift',zero?word('ずれ 0.000分','Drift 0.000 min'):word(mins+'分'+(s.error_s>0?'遅れ':'進み'),mins+' min '+(s.error_s>0?'slow':'fast')),s.error_s/60);
    setText('errorSeconds',s.error_s.toFixed(3)+word(' 秒',' s'),s.error_s);
    setText('active',word(s.active==='day'?'昼用が稼働中':'夜用が稼働中',s.active==='day'?'Day foliot active':'Night foliot active'),s.active);
    setText('stageActive',$('active').textContent);
    for(const f of ['day','night']){setText(f+'Groove',s['groove_'+f]+word(' 溝',' groove'),s['groove_'+f]);setText(f+'Distance',s['distance_'+f].toFixed(2)+' mm',s['distance_'+f]);setText(f+'Period',s['period_'+f].toFixed(3)+word(' 秒',' s'),s['period_'+f]);}
    setText('currentDate',s.date,s.date);setText('ake',timeLabel(s.ake),s.ake);setText('kure',timeLabel(s.kure),s.kure);
    setText('dayKoku',(s.dayKoku/60).toFixed(2)+word(' 分',' min'),s.dayKoku);setText('nightKoku',(s.nightKoku/60).toFixed(2)+word(' 分',' min'),s.nightKoku);
    const terms=app.language==='ja'?E.SEKKI:E.SEKKI_EN;setText('sekki',terms[s.calendarSekki]+' / '+s.calendarSekki,s.calendarSekki);setText('setSekki',terms[s.sekki]+' / '+s.sekki,s.sekki);
    for(const [k,id]of Object.entries({dial:'revDial',wheel1:'revWheel1',wheel2:'revWheel2',wheel3:'revWheel3',escape:'revEscape',yukiwa:'revYukiwa'}))setText(id,s.rev[k].toFixed(9),s.rev[k]);setText('osc',s.osc.toFixed(6),s.osc);
    if(document.activeElement!==$('theta'))$('theta').value=s.theta_ind.toFixed(6);
    $('play').textContent=app.playing?word('一時停止','Pause'):word('再開','Resume');$('play').setAttribute('aria-pressed',String(app.playing));
    $('nextSwitch').disabled=s.rawTheta>=app.sim.maxTheta-.001;
    const activeName=word(s.active==='day'?'昼用':'夜用',s.active==='day'?'day':'night');
    setText('guide',app.studio?.model.pose?.switching?word('六つの切替中：切替車が60°進み、梃子板が天符を入れ替えています。','Six-bell switch: the wheel advances 60° and the levers exchange the foliots.'):app.playing?word(activeName+'天符が稼働中。次の六つで、もう片方に切り替わります。','The '+activeName+' foliot is running. The next six-bell boundary exchanges the foliots.'):word('停止中。刻を指定するか、「再開」で天符の動きを観察できます。','Paused. Choose a koku or resume to observe the foliot.'));
    setText('phaseNote',app.speed===1?word('実時間：2970回/刻の実際の振れと周期を表示しています。','Real time: the physical 2,970 oscillations per koku and their true period.'):word('早送り：天符の見た目の振れを圧縮しています。周期は上の実測表由来の数値です。','Fast forward: visual oscillations are compressed. The periods above retain the physical model.'));
    const year=Number(app.sim.input.start.slice(0,4));$('precisionNote').hidden=year>=1950&&year<=2050;setText('precisionNote',word('太陽の低精度式の精度目安（1950〜2050年で約0.01°）の外側です','Outside the low-precision solar formula’s accuracy reference (about 0.01° for 1950–2050).'));
    $('audio').textContent=word('音 ','Sound ')+(app.audio.enabled?'ON':'OFF');$('audio').setAttribute('aria-pressed',String(app.audio.enabled));
    setText('seasonCompare',word('夏至：昼23溝 / 3.203秒　冬至：昼9溝 / 2.229秒','Summer: day groove 23 / 3.203 s · Winter: day groove 9 / 2.229 s'));
    $('validation').hidden=!app.error;if(app.error)setText('validation',app.error==='polar'?word('この緯度では明六つ・暮六つが成立しない日があります。白夜・極夜の地域は対象外です。緯度を変更してください。','Dawn or dusk does not occur at this latitude on some dates. Polar day and night are outside this model; choose another latitude.'):app.error==='drift'?word('時計のずれが計算できる期間を超えました。日数を短くするか緯度を変更してください。','Clock drift exceeds the calculated time range. Use fewer days or another latitude.'):word('日付は1800〜2100年、日数は1〜31日で指定してください。','Use a date from 1800–2100 and a duration of 1–31 days.'));
  }
  function visualCycles(){return ({1:2970,60:60,600:6,7200:.5})[app.speed]||2970;}
  function paint(s){app.state=s;if(app.studio){app.studio.model.update(s,visualCycles());app.studio.model.setDisplay(app.mode,app.explode);app.studio.renderer.render(app.studio.scene,app.studio.camera);}display();return s;}
  app.pause=()=>{app.playing=false;app.audio.cancel();display();};app.play=()=>{if(app.state.rawTime>=app.sim.endTime)app.seekTheta(0);app.playing=true;app.lastNow=performance.now();display();};
  app.seekTime=t=>{app.pause();return paint(app.sim.snapshot(t));};
  app.seekTheta=theta=>{app.pause();return paint(app.sim.snapshotTheta(Number(theta)));};
  app.seekSample=index=>{app.pause();return paint(app.sim.sampleAt(index));};
  app.configure=(input,options={})=>{try{const sim=E.createSimulation(input);app.sim=sim;app.playing=options.autoplay??false;app.lastNow=performance.now();app.error=null;$('validation').hidden=true;
      $('start').value=sim.input.start;$('days').value=sim.input.days;$('latitude').value=sim.input.lat;$('theta').max=sim.maxTheta;
      $('place').value=['35.68','35.01','32.75'].includes(String(sim.input.lat))?String(sim.input.lat):'custom';
      $('preset').value=E.SPEC.cases.some(c=>c.id===sim.input.id)?sim.input.id:'';paint(sim.snapshot(sim.startTime));return true;
    }catch(err){app.error=err.message;display();return false;}};
  app.realign=()=>app.configure({...app.sim.input,start:app.state.date},{autoplay:false});
  app.setSpeed=speed=>{app.speed=Number(speed);$('speed').value=String(app.speed);if(app.state)paint(app.state);};
  app.setView=view=>{app.view=view;const preset=B.VIEWS[view];if(app.studio){const s=app.studio,dy=app.explode*(view==='overview'?.25:(preset.target[1]-2.6)*.55);s.camera.position.set(preset.position[0],preset.position[1]+dy,preset.position[2]);s.controls.target.set(preset.target[0],preset.target[1]+dy,preset.target[2]);s.viewSize=preset.size*(1+app.explode*.50);s.controls.update();resize();}
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    const captions={overview:word('欅の櫓台・重錘・二挺天符','Keyaki tower · weight · two foliots'),switch:word('雪輪 → 6歯切替車 → 三角カム → 梃子板','Snow wheel → 6-tooth switch → cams → levers'),escapement:word('上下2重の冠形ガンギ車と26本の分銅溝','Two crown escapements and 26 weight grooves'),dial:word('72歯の指針盤が回転。上部の針は固定。','72-tooth dial rotates beneath a fixed upper pointer')};setText('viewCaption',captions[view]);};
  app.setDisplay=(mode,explode=app.explode)=>{app.mode=mode;app.explode=explode;$('mode').value=mode;$('explode').value=explode*100;$('explodeValue').textContent=Math.round(explode*100)+'%';app.setView(app.view);if(app.state)paint(app.state);};
  app.setLanguage=language=>{app.language=language;document.documentElement.lang=language;document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=(language==='ja'?ja:en)[el.dataset.i18n]);document.querySelectorAll('[data-lang]').forEach(el=>el.hidden=el.dataset.lang!==language);$('language').textContent=language==='ja'?'English':'日本語';$('scene').setAttribute('aria-label',word('回転・拡大できる二挺天符の櫓時計','Interactive double-foliot tower clock; drag to rotate'));app.setView(app.view);display();};
  function resize(){if(!app.studio)return;const s=app.studio,r=$('stage').getBoundingClientRect(),aspect=r.width/r.height,h=s.viewSize;
    s.camera.left=-h*aspect/2;s.camera.right=h*aspect/2;s.camera.top=h/2;s.camera.bottom=-h/2;s.camera.updateProjectionMatrix();s.renderer.setSize(r.width,r.height,false);s.renderer.render(s.scene,s.camera);}
  function initStudio(){const renderer=new T.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-3,3,3,-3,.05,100),controls=new WadokeiStudio.OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minZoom=.35;controls.maxZoom=4;controls.maxPolarAngle=Math.PI*.90;controls.mouseButtons.LEFT=T.MOUSE.ROTATE;controls.touches.ONE=T.TOUCH.ROTATE;
    const pmrem=new T.PMREMGenerator(renderer),environment=new WadokeiStudio.RoomEnvironment(),env=pmrem.fromScene(environment,.03);scene.environment=env.texture;pmrem.dispose();environment.dispose();
    scene.environmentIntensity=.65;renderer.toneMappingExposure=1.0;scene.add(new T.HemisphereLight('#fff0d4','#53685b',1.2));const key=new T.DirectionalLight('#fff0d4',2.5);key.position.set(3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:5,bottom:-3,near:.1,far:18});key.shadow.bias=-.0005;scene.add(key);
    const fill=new T.DirectionalLight('#b6d2ca',1.3);fill.position.set(-4,4,-3);scene.add(fill);
    const ground=new T.Mesh(new T.CircleGeometry(5,64),new T.ShadowMaterial({opacity:.20}));ground.rotation.x=-Math.PI/2;ground.position.y=-.015;ground.receiveShadow=true;scene.add(ground);
    renderer.domElement.style.touchAction='pan-y';controls.touches.ONE=null;controls.touches.TWO=T.TOUCH.DOLLY_ROTATE;
    const model=B.createModel();scene.add(model.root);app.studio={renderer,scene,camera,controls,model,viewSize:5.70};controls.addEventListener('change',()=>renderer.render(scene,camera));new ResizeObserver(resize).observe($('stage'));app.setView('overview');}
  $('play').addEventListener('click',()=>app.playing?app.pause():app.play());$('speed').addEventListener('change',e=>app.setSpeed(e.target.value));$('observe').addEventListener('click',()=>{app.setSpeed(1);app.setView('escapement');app.play();});
  $('seek').addEventListener('click',()=>{const v=Number($('theta').value);if(Number.isFinite(v)&&v>=0&&v<=app.sim.maxTheta)app.seekTheta(v);else $('theta').reportValidity();});
  $('theta').addEventListener('keydown',e=>{if(e.key==='Enter')$('seek').click();});
  $('nextSwitch').addEventListener('click',()=>{const th=Math.min(app.sim.maxTheta,(Math.floor((app.state.rawTheta+1e-8)/6)+1)*6);app.seekTheta(th-.00015);app.setView('switch');app.setSpeed(1);app.play();});
  $('preset').addEventListener('change',e=>{const c=E.SPEC.cases.find(c=>c.id===e.target.value);if(c)app.configure(c,{autoplay:true});});
  $('compare').addEventListener('click',()=>{const id=app.sim.input.id==='edo_toji'?'edo_geshi':'edo_toji';app.configure(E.SPEC.cases.find(c=>c.id===id),{autoplay:true});app.setSpeed(1);app.setView('escapement');});
  $('place').addEventListener('change',e=>{if(e.target.value!=='custom')$('latitude').value=e.target.value;});$('latitude').addEventListener('input',()=>{$('place').value='custom';});
  $('apply').addEventListener('click',()=>app.configure({id:'custom',start:$('start').value,lat:Number($('latitude').value),days:Number($('days').value)},{autoplay:true}));$('realign').addEventListener('click',()=>app.realign());
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>app.setView(b.dataset.view)));$('mode').addEventListener('change',e=>app.setDisplay(e.target.value));$('explode').addEventListener('input',e=>app.setDisplay(app.mode,Number(e.target.value)/100));
  $('about').addEventListener('click',()=>{$('aboutDialog').showModal();});$('closeAbout').addEventListener('click',()=>$('aboutDialog').close());$('language').addEventListener('click',()=>app.setLanguage(app.language==='ja'?'en':'ja'));
  $('audio').addEventListener('click',async()=>{await app.audio.setEnabled(!app.audio.enabled);if(app.audio.enabled)app.audio.strike();display();});
  try{initStudio();}catch(err){$('renderError').hidden=false;setText('renderError','3D表示を開始できませんでした。WebGL対応のブラウザで開いてください。');console.error(err);}
  globalThis.wadokeiApp=app;app.configure(E.SPEC.cases[0],{autoplay:true});
  app.advance=dt=>{const previous=app.state.rawTime,s=app.speed===7200?app.sim.snapshotTheta(Math.min(app.sim.maxTheta,app.state.rawTheta+dt)):app.sim.snapshot(Math.min(app.sim.endTime,previous+dt*app.speed)),t=s.rawTime;
    if(app.audio.enabled&&s.eventTime>previous&&s.eventTime<=t)app.audio.ring(s.strikes);paint(s);if(t>=app.sim.endTime)app.pause();return s;};
  function tick(now){const dt=Math.min(.1,Math.max(0,(now-(app.lastNow||now))/1000));app.lastNow=now;
    if(app.playing&&!$('aboutDialog').open)app.advance(dt);
    requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
})();
