(function(){
  'use strict';
  const K=window.OrreryKinematics,S=K.SPEC,$=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
  // Every entry identifies a visible control, measured value, or a specific mechanism.
  const I18N={
    ja:{observatory:'天文機構展示室',title:'真鍮の太陽系儀と渾天儀',subtitle:'同軸6層スリーブ・整数歯車列・地球と月のテルリオン',parts:'部品',timeHeading:'時間とクランク',audioOff:'音：OFF',audioOn:'音：ON',elapsed:'経過した地球年',days:'経過日数',scrub:'時刻を直接指定',speed:'1秒あたりの経過日数',slow:'5日',normal:'30日',fast:'180日',outer:'2年',play:'再生',pause:'一時停止',forward:'順行 ↺',reverse:'逆行 ↻',crankTitle:'手回しクランク',crankHint:'円周に沿ってドラッグ。← → キーでも回せます。',crankRatio:'20 : 20 マイター歯車 / 1回転＝1年',assemblyHeading:'外装と分解図',exhibition:'ガラス天板展示',cutaway:'台座カット断面',focus:'太陽系儀フォーカス',explode:'分解図',reset:'組立位置へ戻す',telemetryHeading:'黄経と機械式周期',mercury:'水星',venus:'金星',earth:'地球',mars:'火星',jupiter:'木星',saturn:'土星',moon:'月（地球基準）',period:'機械式周期',longitude:'黄経',overview:'全体斜視',earthCamera:'地球・月サブギア',gearsCamera:'内部歯車列',topCamera:'黄道真上視点',orbitHint:'ドラッグ：視点回転　/　ホイール：拡大　/　Space：再生・停止',mechanismTitle:'地軸23.44°の平行保持',mechanismBody:'36歯ギア11枚が地球アームの回転を相殺。地軸は公転中も空間の同じ方向を向きます。',moonNote:'53→12 / 28→10歯で、月は1年に371/30朔望周・401/30恒星周。軌道面は5.14°傾斜。',footer:'平均周期の機械模型。距離・天体径は展示用縮尺です。',fallbackTitle:'3D展示を開始できませんでした',fallbackBody:'WebGL 2が利用できません。対応ブラウザで開いてください。時刻操作と黄経表示は引き続き使えます。',canvasLabel:'真鍮の太陽系儀 3D展示',cameraLabel:'視点切替',crankLabel:'クランクで経過年を変更',daysUnit:'日',yearUnit:'年',moonUnit:'年 / 恒星周',renderInfo:'描画',fps:'fps'},
    en:{observatory:'CELESTIAL MECHANICS GALLERY',title:'Grand Orrery & Armillary',subtitle:'Six concentric sleeves · integer gear trains · Earth–Moon tellurion',parts:'parts',timeHeading:'Time & crank',audioOff:'Sound: OFF',audioOn:'Sound: ON',elapsed:'Elapsed Earth years',days:'Elapsed days',scrub:'Set elapsed time',speed:'Days per second',slow:'5 days',normal:'30 days',fast:'180 days',outer:'2 years',play:'Play',pause:'Pause',forward:'Prograde ↺',reverse:'Retrograde ↻',crankTitle:'Hand crank',crankHint:'Drag around the dial. Arrow keys also turn the crank.',crankRatio:'20 : 20 miter gears / 1 turn = 1 year',assemblyHeading:'Case & exploded view',exhibition:'Glass-top exhibition',cutaway:'Drum cutaway',focus:'Orrery focus',explode:'Exploded view',reset:'Restore assembled position',telemetryHeading:'Longitude & gear periods',mercury:'Mercury',venus:'Venus',earth:'Earth',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',moon:'Moon (Earth-relative)',period:'Mechanical period',longitude:'Longitude',overview:'Overview',earthCamera:'Earth & Moon',gearsCamera:'Gear train',topCamera:'Ecliptic top',orbitHint:'Drag: orbit camera / Wheel: zoom / Space: play or pause',mechanismTitle:'Parallel axis at 23.44°',mechanismBody:'Eleven 36-tooth gears cancel the Earth arm’s rotation. Its tilted axis keeps a constant direction in space.',moonNote:'53→12 / 28→10 teeth produce 371/30 synodic and 401/30 sidereal lunar turns per year, on a 5.14° inclined plane.',footer:'Mechanical mean periods. Distances and globe sizes use display scales.',fallbackTitle:'The 3D exhibit could not start',fallbackBody:'WebGL 2 is unavailable. Use a compatible browser. Time controls and longitude readings remain available.',canvasLabel:'Grand Orrery 3D exhibit',cameraLabel:'Camera views',crankLabel:'Change elapsed years with the crank',daysUnit:'days',yearUnit:'yr',moonUnit:'yr / sidereal turn',renderInfo:'Draw calls',fps:'fps'}
  };
  const state={years:S.renderYear,playing:true,direction:1,daysPerSecond:S.initialDaysPerSecond,explode:0,mode:'exhibition',camera:'overview',language:'ja'};
  const audio=window.OrreryAudio.create(),performanceStats={frameMs:[],drawCalls:0,triangles:0,renderer:null};
  let exhibit=null,renderer=null,scene=null,camera=null,controls=null,lastFrame=0,lastReadout=0,lastFollow=null,initializationError=null;
  const t=key=>I18N[state.language][key];
  function translate(){
    document.documentElement.lang=state.language;document.title=t('title');
    $$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
    $('#scene').setAttribute('aria-label',t('canvasLabel'));$('.stage').setAttribute('aria-label',t('canvasLabel'));$('.camera-bar').setAttribute('aria-label',t('cameraLabel'));$('#crank-pad').setAttribute('aria-label',t('crankLabel'));
    $('#lang-ja').setAttribute('aria-pressed',state.language==='ja');$('#lang-en').setAttribute('aria-pressed',state.language==='en');
    $('#part-count').textContent=`${exhibit?exhibit.stats().components:'—'} ${t('parts')} · 6 ${state.language==='ja'?'惑星':'planets'}`;
    $('#scrub-range').textContent=`0—30 ${t('yearUnit')}`;
    renderTelemetry();refreshControls();
  }
  function renderTelemetry(){
    const host=$('#telemetry');host.replaceChildren();
    for(const id of [...S.planets.map(p=>p.id),'moon']){
      const p=S.planets.find(p=>p.id===id),card=document.createElement('article');card.className='telemetry-card';card.dataset.body=id;
      const h=document.createElement('h3');h.textContent=t(id);const value=document.createElement('strong');value.dataset.longitude=id;
      const desc=document.createElement('p'),fraction=document.createElement('span');fraction.className='fraction';fraction.textContent=p?`${p.periodNumerator}/${p.periodDenominator} ${t('yearUnit')}`:`30/401 ${t('yearUnit')}`;
      desc.append(document.createTextNode(t('period')+' '),fraction);const period=document.createElement('p');period.textContent=p?`${(p.periodNumerator/p.periodDenominator).toFixed(6)} ${t('yearUnit')}`:`${(30/401).toFixed(6)} ${t('moonUnit')}`;
      card.append(h,value,desc,period);host.append(card);
    }readout();
  }
  function refreshControls(){
    $('#play').textContent=t(state.playing?'pause':'play');$('#play').setAttribute('aria-pressed',state.playing);
    $('#direction').textContent=t(state.direction===1?'forward':'reverse');$('#direction').setAttribute('aria-pressed',state.direction===-1);
    $('#audio').textContent=t(audio.enabled?'audioOn':'audioOff');$('#audio').setAttribute('aria-pressed',audio.enabled);
    $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));$$('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.camera===state.camera));
    $$('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',Math.abs(Number(b.dataset.speed)-state.daysPerSecond)<.02));
    $('#speed-value').textContent=`${state.daysPerSecond.toFixed(state.daysPerSecond%1?1:0)} ${t('daysUnit')}`;$('#explode-value').textContent=Math.round(state.explode*100)+'%';
  }
  function readout(){
    const solved=K.solve(state.years);$('#year-value').textContent=state.years.toFixed(3);$('#day-value').textContent=(state.years*S.earthYearDays).toFixed(1);
    $('#years').value=state.years;$('#crank-pad').setAttribute('aria-valuenow',state.years.toFixed(4));$('.pad-pointer').style.rotate=(-state.years*360)+'deg';
    for(const p of solved.planets){const el=$(`[data-longitude="${p.id}"]`);if(el)el.textContent=p.longitude.toFixed(2)+'°';}
    const m=$('[data-longitude="moon"]');if(m)m.textContent=solved.moonLongitude.toFixed(2)+'°';return solved;
  }
  function setYears(value){const before=state.years;state.years=Math.max(0,Math.min(30,Number(value)));audio.advance(state.years-before);if(exhibit)exhibit.update(state.years,state.explode);readout();}
  function setMode(mode){state.mode=mode;if(exhibit)exhibit.setMode(mode);refreshControls();}
  function setCamera(name){
    state.camera=name;if(exhibit)exhibit.setInspection(name);
    if(camera){
      camera.up.set(0,1,0);let target=new window.ORRERY_THREE.THREE.Vector3(0,6.6+state.explode*1.9,0),position;
      if(name==='earth'){target=exhibit.earthPosition();position=target.clone().add(new window.ORRERY_THREE.THREE.Vector3(1.7,1.3,2.2));lastFollow=target.clone();}
      else if(name==='gears'){target.set(-.6,1.9+state.explode*.5,0);position=new window.ORRERY_THREE.THREE.Vector3(5.5,5.0,8.2);}
      else if(name==='top'){target.set(0,6.6,0);position=new window.ORRERY_THREE.THREE.Vector3(0,30,0);camera.up.set(0,0,-1);}
      else position=new window.ORRERY_THREE.THREE.Vector3(17,13.3,23);
      camera.position.copy(position);controls.target.copy(target);camera.lookAt(target);controls.update();
    }refreshControls();
  }
  function initialize3D(){
    const E=window.ORRERY_THREE,T=E.THREE,canvas=$('#scene');
    const context=canvas.getContext('webgl2',{antialias:true,alpha:true,preserveDrawingBuffer:true});
    if(!context){$('#fallback').hidden=false;return;}
    renderer=new T.WebGLRenderer({canvas,context,antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    scene=new T.Scene();camera=new T.PerspectiveCamera(43,1,.025,180);
    controls=new E.OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=1.3;controls.maxDistance=60;controls.maxPolarAngle=Math.PI*.95;
    const pmrem=new T.PMREMGenerator(renderer),room=new E.RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
    scene.add(new T.HemisphereLight('#dbe9ff','#51402e',.8));
    for(const [p,c,power]of[[[4,14,6],'#ffe6bb',3],[[-8,9,-6],'#92b9e0',2],[[7,5,-8],'#ffcc80',1.5]]){const l=new T.DirectionalLight(c,power);l.position.set(...p);scene.add(l);}
    exhibit=window.OrreryBuilder.build();scene.add(exhibit.model);
    const floor=new T.Mesh(new T.CircleGeometry(28,96),new T.MeshStandardMaterial({color:'#03060a',metalness:.03,roughness:.85}));floor.rotation.x=-Math.PI/2;floor.position.y=.105;scene.add(floor);
    const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');performanceStats.renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
    function resize(){const r=$('.stage').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
    new ResizeObserver(resize).observe($('.stage'));resize();setCamera('overview');
  }
  $('#lang-ja').addEventListener('click',()=>{state.language='ja';translate();});$('#lang-en').addEventListener('click',()=>{state.language='en';translate();});
  $('#play').addEventListener('click',()=>{state.playing=!state.playing;refreshControls();});$('#direction').addEventListener('click',()=>{state.direction*=-1;refreshControls();});
  $('#audio').addEventListener('click',async()=>{await audio.setEnabled(!audio.enabled);refreshControls();});
  $('#years').addEventListener('input',e=>{state.playing=false;setYears(e.target.value);refreshControls();});
  $('#speed').addEventListener('input',e=>{state.daysPerSecond=Number(e.target.value);refreshControls();});
  $$('[data-speed]').forEach(b=>b.addEventListener('click',()=>{state.daysPerSecond=Number(b.dataset.speed);$('#speed').value=state.daysPerSecond;refreshControls();}));
  $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));$$('[data-camera]').forEach(b=>b.addEventListener('click',()=>setCamera(b.dataset.camera)));
  $('#explode').addEventListener('input',e=>{state.explode=Number(e.target.value);if(exhibit)exhibit.update(state.years,state.explode);setCamera(state.camera);refreshControls();});
  $('#reset').addEventListener('click',()=>{state.explode=0;$('#explode').value=0;if(exhibit)exhibit.update(state.years,0);setCamera(state.camera);refreshControls();});
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();state.playing=!state.playing;refreshControls();}});
  let dragAngle=null;const pad=$('#crank-pad');const padAngle=e=>{const r=pad.getBoundingClientRect();return Math.atan2(r.top+r.height/2-e.clientY,e.clientX-r.left-r.width/2);};
  pad.addEventListener('pointerdown',e=>{e.preventDefault();state.playing=false;dragAngle=padAngle(e);pad.setPointerCapture(e.pointerId);refreshControls();});
  pad.addEventListener('pointermove',e=>{if(dragAngle===null)return;const a=padAngle(e),delta=K.mod(a-dragAngle+Math.PI,K.TAU)-Math.PI;setYears(state.years+delta/K.TAU);dragAngle=a;});
  const end=()=>dragAngle=null;pad.addEventListener('pointerup',end);pad.addEventListener('pointercancel',end);
  pad.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();state.playing=false;setYears(state.years+(e.key==='ArrowRight'?1:-1)/36);refreshControls();}});
  function frame(now){
    const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;if(lastFrame&&performanceStats.frameMs.length<240)performanceStats.frameMs.push(now-lastFrame);lastFrame=now;
    if(state.playing){const delta=dt*state.daysPerSecond/S.earthYearDays*state.direction;state.years=K.mod(state.years+delta,30);audio.advance(delta);}
    if(exhibit){exhibit.update(state.years,state.explode);if(state.camera==='earth'){const p=exhibit.earthPosition();if(lastFollow){const delta=p.clone().sub(lastFollow);camera.position.add(delta);controls.target.add(delta);}lastFollow=p.clone();}controls.update();renderer.render(scene,camera);performanceStats.drawCalls=renderer.info.render.calls;performanceStats.triangles=renderer.info.render.triangles;}
    if(now-lastReadout>80){readout();$('#render-stat').textContent=renderer?`${t('renderInfo')} ${performanceStats.drawCalls}`:'';lastReadout=now;}requestAnimationFrame(frame);
  }
  try{initialize3D();}catch(error){initializationError=String(error);if(renderer)renderer.dispose();renderer=null;exhibit=null;$('#fallback').hidden=false;}
  translate();
  window.orreryStudio={state,I18N,audio,performanceStats,initializationError,get exhibit(){return exhibit;},get renderer(){return renderer;},get camera(){return camera;},get controls(){return controls;},setYears,setMode,setCamera,readout};requestAnimationFrame(frame);
})();
