(function(root){
  'use strict';
  const COPY={
    eyebrow:['BABBAGE / 計算部の稼働模型','BABBAGE / WORKING CALCULATING SECTION'],
    title:['階差機関 No.2','Difference Engine No.2'],
    modelNote:['8列 × 31桁 · 一の位は下端','8 columns × 31 digits · units at the bottom'],
    orbitHint:['ドラッグで視点回転 / ホイールで拡大','Drag to orbit / scroll to zoom'],
    evenKey:['赤銅：列 0・2・4・6','Copper: columns 0 · 2 · 4 · 6'],
    oddKey:['真鍮：列 1・3・5・7','Brass: columns 1 · 3 · 5 · 7'],
    warningKey:['● アンバー：9→0の警告','● Amber: 9→0 warning'],
    carryKey:['● シアン：繰り上げ','● Cyan: carry received'],
    driveTitle:['クランク駆動','Crank drive'],crankHint:['円周をドラッグ · 逆回し可','Drag around the rim · reversible'],
    crankLabel:['クランク回転数。矢印キーで¼回転','Crank turns. Arrow keys step by ¼ turn'],
    speed:['速度','Speed'],speedUnit:['回転/秒','turns/s'],reset:['初期値に戻す','Reset columns'],snap:['最寄りの境目へ','Snap to boundary'],
    play:['▶ 自動回転を開始','▶ Start turning'],pause:['Ⅱ 自動回転を停止','Ⅱ Pause turning'],soundOff:['音 OFF','Sound OFF'],soundOn:['音 ON','Sound ON'],
    guideRunning:['自動回転中 — 円盤ドラッグで手回し・逆回し / 視点ボタンで桁や繰り上げを拡大できます','Auto-turning — Drag the crank wheel to turn or reverse / Use the view buttons to inspect digits and carries'],
    guidePaused:['一時停止中 — 円盤をドラッグするか「自動回転を開始」で進めます / 視点ボタンで機構を拡大できます','Paused — Drag the crank wheel or choose Start turning / Use the view buttons to inspect the mechanism'],
    cycleSteps:['4回転で1行を計算','Four turns produce one table row'],
    stepAAdd:['① A：偶数4列の加算','① A: add columns 0, 2, 4, 6'],stepACarry:['② A：繰り上げ・印字','② A: carry & print'],stepBAdd:['③ B：奇数3列の加算','③ B: add columns 1, 3, 5'],stepBCarry:['④ B：繰り上げ','④ B: carry'],
    editRunning:['自動回転中は入力をロックします。境目で止めると変更できます。','Inputs are locked while auto-turning. Stop at a boundary to edit.'],
    editPaused:['サイクル途中で停止中です。境目へ移動すると変更できます。','Paused inside a cycle. Move to a boundary to edit.'],
    editReady:['境目で停止中 · プリセットやデモを選ぶと0.5回転/秒で再開します。','Stopped at a boundary. A preset or demo restarts at 0.5 turns/s.'],
    stopToEdit:['境目で止めて変更可にする','Stop at boundary to edit'],
    runningLocked:['自動回転中 · 入力ロック','Auto-turning · inputs locked'],
    printEyebrow:['TABLE OF VALUES / MOD 10³¹','TABLE OF VALUES / MOD 10³¹'],printTitle:['印字窓','Printed table'],
    currentLabel:['現在の列0 · 31桁','Current column 0 · 31 digits'],printedLabel:['A完了時の確定印字','Confirmed print after phase A'],theoryLabel:['多項式の直接計算 · mod 10³¹','Direct polynomial evaluation · mod 10³¹'],
    waiting:['最初のA完了を待っています','Waiting for the first completed A phase'],direct:['直接初期値：多項式の照合対象外','Direct initial state: no polynomial comparison'],match:['一致：印字 = f(x₀ + n)','MATCH: print = f(x₀ + n)'],mismatch:['不一致：印字と理論値を確認してください','MISMATCH: check print and theory'],
    wrap:['31桁の法で表示。直接計算の整数：','Displayed modulo 10³¹. Exact integer: '],
    viewTitle:['機構の見方','Inspect the mechanism'],exhibition:['通常展示','Exhibit'],cutaway:['断面','Cutaway'],focus:['内部フォーカス','Internals'],explode:['分解率','Exploded assembly'],
    overview:['全体斜視','Overview'],digits:['下位桁拡大','Lower digits'],rippleView:['31段のリップル','31-digit ripple'],gearView:['上部4:1減速機','Top 4:1 gears'],
    columnsTitle:['8列の数字盤','Eight column registers'],columnsNote:['上：生の31桁 / 下：10の補数の符号付き値','Top: raw 31 digits / below: signed ten’s complement'],columnZero:['列0 · 表の値','Column 0 · table value'],columnDifference:['階差','difference'],signedLabel:['符号付き ','Signed '],
    inputTitle:['多項式と初期値','Polynomial & initial state'],presetLabel:['多項式プリセット','Polynomial preset'],rippleButton:['繰り上げのデモ（30桁連鎖）','Carry demo (30-digit chain)'],
    polynomialMode:['多項式モード','Polynomial mode'],directMode:['直接初期値モード · ripple_30','Direct initial state · ripple_30'],coefficientsTitle:['整数係数 a₀〜a₇','Integer coefficients a₀–a₇'],apply:['係数を適用','Apply coefficients'],
    inputNote:['印字値は31桁以内を推奨。超える値や負の値も10³¹の法で回ります。入力変更とリセットは4回転ごとの境目で行えます。','Keep printed values within 31 digits. Larger and negative integers wrap modulo 10³¹. Edit inputs and reset only at four-turn cycle boundaries.'],
    editable:['サイクル境界 · 入力編集可','Cycle boundary · inputs unlocked'],locked:['サイクル途中 · 入力ロック','Inside a cycle · inputs locked'],inputInvalid:['係数とx₀には整数を入力してください。','Enter integers for every coefficient and x₀.'],lockedError:['変更にはサイクル境界への移動が必要です。','Move to a cycle boundary to change the inputs.'],
    scopeNote:['計算部の展示です。印刷・鋳型装置は含みません。寸法と部品形状は展示用の推定です。','Calculating section only. Printing and stereotyping are excluded. Dimensions and component shapes are interpretive.'],
    timingNote:['A/Bの順序と4:1のタイミングは規範計算モデルです。一次史料による実機照合は未実施です。','A/B sequencing and 4:1 timing follow the normative model; primary historical sources have not been checked.'],
    keyboardNote:['←/→：¼回転 · Space：自動回転/停止','←/→: ¼ turn · Space: play/pause'],
    fallbackTitle:['WebGL 2を利用できません','WebGL 2 is unavailable'],fallbackBody:['3D機構を表示できません。クランク操作、31桁計算、印字窓と数字盤は引き続き使えます。','The 3D mechanism cannot be displayed. The crank, 31-digit calculation, print window and registers remain available.'],
    phaseA:['位相A','Phase A'],phaseB:['位相B','Phase B'],add:['全桁の同時加算','Simultaneous digit addition'],carry:['下位からの繰り上げ','Carry from bottom to top'],cycle:['サイクル','Cycle'],turn:['回転','turns'],digit:['桁','digit'],draw:['描画','draws']
  };
  if(typeof module==='object'&&module.exports){module.exports=COPY;return;}
  root.DE2_COPY=COPY;
  const E=root.DE2Engine,$=id=>document.getElementById(id);
  let lang='ja',turns=0,playing=true,explode=0,model=E.create(E.SPEC.presets.find(p=>p.id==='seventh_order')),state=model.at(0),dirty=true;
  const audio=new root.DE2Audio(),frameTimes=[];let previousTime=0,uiTime=0;
  const text=key=>COPY[key][lang==='ja'?0:1];
  for(let c=0;c<8;c++){
    const article=document.createElement('article');article.className='column-card'+(c%2?' odd':'');article.dataset.column=c;
    const title=document.createElement('h3');title.id='colTitle'+c;
    const raw=document.createElement('output');raw.id='raw'+c;
    const signed=document.createElement('div');signed.className='signed-row';
    const label=document.createElement('span');label.dataset.t='signedLabel';
    const value=document.createElement('output');value.id='signed'+c;signed.append(label,value);article.append(title,raw,signed);$('columns').append(article);
  }
  for(let i=0;i<8;i++){
    const label=document.createElement('label');label.textContent='a'+String(i);const input=document.createElement('input');input.id='a'+i;input.type='text';input.inputMode='numeric';input.autocomplete='off';label.append(input);$('coefficientGrid').append(label);
  }
  function fillInputs(){const cfg=model.config;for(let i=0;i<8;i++)$('a'+i).value=cfg.poly?cfg.poly[i]:'0';$('x0').value=cfg.x0||'0';}
  let studio=null;
  try{studio=root.DE2Builder.mount($('stage'));}catch(_error){studio=null;}
  if(!studio)$('fallback').hidden=false;
  function formula(){if(!model.config.poly)return 'ripple_30: (10³⁰ − 1) + 1';
    const parts=model.config.poly.map((v,i)=>v==='0'?'':v+(i?'·x'+(i>1?'^'+i:''):'')).filter(Boolean);
    return 'f(x) = '+(parts.join(' + ').replaceAll('+ -','− ')||'0')+'; x₀ = '+model.config.x0;
  }
  function updateText(){
    document.documentElement.lang=lang;document.title=text('title')+' — '+(lang==='ja'?'計算部':'Calculating section');
    for(const el of document.querySelectorAll('[data-t]'))el.textContent=text(el.dataset.t);
    $('language').textContent=lang==='ja'?'English':'日本語';$('crank').setAttribute('aria-label',text('crankLabel'));
    $('explode').setAttribute('aria-label',text('explode'));
    for(let c=0;c<8;c++)$('colTitle'+c).textContent=c===0?text('columnZero'):(lang==='ja'?'列'+c+' · 第'+c+text('columnDifference'):'Column '+c+' · '+text('columnDifference')+' '+c);
    for(const b of document.querySelectorAll('[data-step]'))b.setAttribute('aria-label',b.dataset.step+' '+text('turn'));
    renderUI();
  }
  function renderUI(){
    $('play').textContent=text(playing?'pause':'play');$('play').setAttribute('aria-pressed',String(playing));
    $('playGuide').textContent=text(playing?'guideRunning':'guidePaused');
    $('audio').textContent=text(audio.enabled?'soundOn':'soundOff');$('audio').setAttribute('aria-pressed',String(audio.enabled));
    $('turns').textContent=turns.toFixed(3)+' '+text('turn')+' / '+text('cycle')+' '+state.cycle;
    $('crank').setAttribute('aria-valuenow',String(turns));$('crank').setAttribute('aria-valuetext',turns.toFixed(3)+' '+text('turn'));
    $('crankArm').style.transform='rotate('+(turns*360)+'deg)';
    $('phase').textContent=text(state.phase==='A'?'phaseA':'phaseB')+' · '+text('cycle')+' '+state.cycle;
    $('phaseDetail').textContent=text(state.operation)+(state.operation==='carry'?' · '+text('digit')+' '+Math.min(31,Math.floor(state.progress*31)+1):'');
    $('phaseProgress').value=state.progress;
    for(const step of document.querySelectorAll('[data-cycle-step]')){const active=Number(step.dataset.cycleStep)===Math.floor(state.u);step.classList.toggle('is-current',active);step.setAttribute('aria-current',active?'step':'false');}
    $('boundaryStatus').textContent=text(playing?'runningLocked':state.boundary?'editable':'locked');$('snap').hidden=state.boundary;
    $('inputLockStatus').textContent=text(playing?'editRunning':state.boundary?'editReady':'editPaused');
    $('stopToEdit').disabled=!playing&&state.boundary;
    for(const el of document.querySelectorAll('.boundary-control'))el.disabled=playing||!state.boundary;
    $('currentValue').textContent=state.digits[0];$('printedValue').textContent=state.printed||'—';$('theoryValue').textContent=state.theory||'—';
    $('matchStatus').textContent=text(state.inputMode==='direct'?'direct':state.printN===null?'waiting':state.matches?'match':'mismatch')+(state.printN!==null?' · n='+state.printN:'');
    $('formula').textContent=formula();$('wrapStatus').textContent=state.wrapped?text('wrap')+state.theoryExact:'';
    $('inputMode').textContent=text(state.inputMode==='direct'?'directMode':'polynomialMode');
    for(let c=0;c<8;c++){
      $('raw'+c).textContent=state.digits[c];$('signed'+c).textContent=state.signed[c];
      const card=$('raw'+c).closest('.column-card'),active=state.active.includes(c);card.classList.toggle('is-active',active);card.setAttribute('aria-current',String(active));
    }
  }
  function setTurns(next){if(!Number.isFinite(next))return;turns=Math.max(0,next);state=model.at(turns);dirty=true;renderUI();audio.update(state);}
  function configure(config,{autoplay=false}={}){
    try{const next=E.reconfigure(config,turns);playing=autoplay;if(autoplay)$('speed').value='0.5';model=E.create(next);turns=0;state=model.at(0);dirty=true;fillInputs();$('inputError').textContent='';$('preset').value=E.SPEC.presets.some(p=>p.id===next.id)?next.id:'';renderUI();return true;}
    catch(error){$('inputError').textContent=text(error.message==='CYCLE_LOCKED'?'lockedError':'inputInvalid');return false;}
  }
  function pause(){playing=false;renderUI();}
  function stopAtBoundary(){playing=false;setTurns(E.snap(turns));$('inputError').textContent='';}
  function togglePlay(){playing=!playing;renderUI();}
  for(const b of document.querySelectorAll('[data-step]'))b.addEventListener('click',()=>{playing=false;setTurns(turns+Number(b.dataset.step));});
  $('play').addEventListener('click',togglePlay);
  $('reset').addEventListener('click',()=>{try{const next=E.reset(turns);playing=false;setTurns(next);}catch(_error){$('inputError').textContent=text('lockedError');}});
  $('snap').addEventListener('click',stopAtBoundary);
  $('stopToEdit').addEventListener('click',stopAtBoundary);
  $('ripple').addEventListener('click',()=>configure(E.SPEC.ripple,{autoplay:true}));
  $('preset').addEventListener('change',()=>{const cfg=E.SPEC.presets.find(p=>p.id===$('preset').value);if(cfg)configure(cfg,{autoplay:true});});
  $('coefficientForm').addEventListener('submit',event=>{event.preventDefault();const poly=Array.from({length:8},(_,i)=>$('a'+i).value.trim()),x0=$('x0').value.trim();
    if(![...poly,x0].every(s=>/^[+-]?\d+$/.test(s))){$('inputError').textContent=text('inputInvalid');return;}configure({id:'custom',poly,x0},{autoplay:true});});
  $('language').addEventListener('click',()=>{lang=lang==='ja'?'en':'ja';updateText();});
  $('audio').addEventListener('click',async()=>{try{await audio.toggle();}catch(_error){audio.enabled=false;}renderUI();});
  for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{
    for(const el of document.querySelectorAll('[data-mode]'))el.setAttribute('aria-pressed',String(el===b));
    if(studio)studio.model.applyMode(b.dataset.mode);dirty=true;
  });
  for(const b of document.querySelectorAll('[data-camera]'))b.addEventListener('click',()=>{
    for(const el of document.querySelectorAll('[data-camera]'))el.setAttribute('aria-pressed',String(el===b));
    if(studio)studio.view(b.dataset.camera);
  });
  $('explode').addEventListener('input',()=>{explode=Number($('explode').value)/100;$('explodeValue').textContent=$('explode').value+'%';if(studio)studio.view(studio.viewId,explode);dirty=true;});
  let drag=null;
  const angle=event=>{const r=$('crank').getBoundingClientRect();return Math.atan2(event.clientY-r.top-r.height/2,event.clientX-r.left-r.width/2);};
  $('crank').addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();playing=false;drag={id:event.pointerId,angle:angle(event)};$('crank').setPointerCapture(event.pointerId);$('crank').focus();renderUI();});
  $('crank').addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;event.preventDefault();const a=angle(event);let delta=a-drag.angle;if(delta>Math.PI)delta-=Math.PI*2;if(delta< -Math.PI)delta+=Math.PI*2;drag.angle=a;setTurns(turns+delta/(Math.PI*2));});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$('crank').addEventListener(type,()=>{drag=null;});
  $('crank').addEventListener('dragstart',event=>event.preventDefault());
  document.addEventListener('keydown',event=>{
    if(event.target.matches('input,select,textarea'))return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();playing=false;setTurns(turns+(event.key==='ArrowRight'?.25:-.25));}
    if(event.code==='Space'&&!event.target.matches('button')){event.preventDefault();togglePlay();}
  });
  function frame(time){
    if(previousTime&&document.visibilityState==='visible'){frameTimes.push(time-previousTime);if(frameTimes.length>300)frameTimes.shift();}
    const elapsed=previousTime?Math.min((time-previousTime)/1000,.1):0;previousTime=time;
    if(playing)setTurns(turns+elapsed*Number($('speed').value));
    if(studio){if(dirty){studio.model.update(state,explode);dirty=false;}studio.render();}
    if(time-uiTime>700){const mean=frameTimes.reduce((a,b)=>a+b,0)/(frameTimes.length||1);$('renderInfo').textContent=studio?(1000/(mean||16.67)).toFixed(0)+' fps · '+studio.renderer.info.render.calls+' '+text('draw'):'';uiTime=time;}
    requestAnimationFrame(frame);
  }
  root.de2App={get state(){return state;},get turns(){return turns;},get model(){return model;},get studio(){return studio;},get playing(){return playing;},setTurns,configure,pause,stopAtBoundary,get frameTimes(){return frameTimes.slice();},get language(){return lang;}};
  fillInputs();updateText();requestAnimationFrame(frame);
})(globalThis);
