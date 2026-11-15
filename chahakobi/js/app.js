(function () {
  'use strict';
  const E = globalThis.ChahakobiEngine, B = globalThis.ChahakobiBuilder;
  const {THREE: T, OrbitControls, RoomEnvironment} = globalThis.ChahakobiStudio;
  const $ = id => document.getElementById(id), model = B.createModel(), audio = ChahakobiAudio.createAudio();
  let sim, time = 0, playing = true, speed = 1, language = 'ja', mode = 'normal', explosion = 0, view = 'overview', sound = false;
  let state, metric, lastFrame = performance.now(), lastWidth = 0, lastHeight = 0, dragStart = null;
  const container = $('viewport'), scene = new T.Scene(); scene.background = new T.Color('#d5d7c6');
  scene.add(model.root);
  const camera = new T.OrthographicCamera(-22, 22, 16, -16, .1, 500);
  let renderer;
  try {renderer = new T.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'high-performance'});}
  catch (error) {$('loading').textContent = '3D rendering is unavailable. Please enable WebGL.'; throw error;}
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
  container.appendChild(renderer.domElement); $('loading').hidden = true;
  const pmrem = new T.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.add(new T.HemisphereLight('#fff1d3', '#737e70', .9));
  const key = new T.DirectionalLight('#ffe5b7', 2.4); key.position.set(14, 32, 14); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -27; key.shadow.camera.right = 27; key.shadow.camera.top = 24; key.shadow.camera.bottom = -24;
  key.shadow.normalBias = .035; key.shadow.bias = -.00015; key.target.position.set(14, 0, 3); scene.add(key, key.target);
  const fill = new T.DirectionalLight('#d1e4e7', 1.3); fill.position.set(-8, 12, -10); scene.add(fill);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
  controls.enableZoom = false; controls.enablePan = false;
  controls.touches.ONE = null; controls.touches.TWO = T.TOUCH.ROTATE;
  renderer.domElement.style.touchAction = 'pan-y';
  const messages = {
    ja: {stopped: '止まっている', forward: '行き', turn: '向きを変えている', return: '帰り', done: 'ほどけきった',
      cupOn: '茶碗が載っている', cupOff: '茶碗が取られている', take: '茶碗を取る', put: '茶碗を置く', pause: '一時停止', play: '再生',
      overview: '予定軌道は金色。帰り着く位置は出発点の横です。',
      stopper: '茶台の上下 → 赤い梃子 → 止め (い) の着脱を見てください。',
      escapement: '棒天符の往復と、13歯の冠形行司輪。1/30で実際の位相を観察できます。',
      cam: '金色の64°行戻板が梃子を押す間、前の魁車が右へ傾きます。'},
    en: {stopped: 'Stopped', forward: 'Outbound', turn: 'Turning', return: 'Returning', done: 'Spring unwound',
      cupOn: 'Cup on tray', cupOff: 'Cup removed', take: 'Lift the cup', put: 'Place the cup', pause: 'Pause', play: 'Play',
      overview: 'The gold line is the planned route. The return ends beside the start.',
      stopper: 'Follow the moving tray, red lever and stopper (i).',
      escapement: 'The bar foliot and 13-tooth crown wheel. At 1/30 speed you see their actual phase.',
      cam: 'The gold 64° cam pushes the linkage and steers the front wheel right.'}
  };
  const caseNames = {
    basic: ['基本の往復', 'Basic round trip'], early_take: ['早めに茶碗を取る', 'Early cup removal'], no_guest: ['客が茶碗を取らない', 'No guest intervention'],
    return_stop: ['帰りにも止める', 'Stop during return'], teeth60: ['一の輪60歯', '60-tooth first wheel'], fast_foliot: ['速い天符', 'Faster foliot'], late_start: ['3秒待って発進', 'Delayed start']
  };
  function selectCaseOptions(id) {
    $('casePreset').replaceChildren(...E.SPEC.cases.map(c => {const option = document.createElement('option'); option.value = c.id; option.textContent = c.id + ' · ' + caseNames[c.id][language === 'ja' ? 0 : 1]; return option;}));
    $('casePreset').value = id;
  }
  function loadCase(input, options = {}) {
    sim = E.createSimulation(input); time = 0;
    model.configure(sim.geometry, sim.input.wheel1_teeth);
    if (options.playing !== undefined) playing = options.playing;
    $('wheelTeeth').value = String(input.wheel1_teeth); $('foliotPeriod').value = String(input.foliot_period_s);
    $('timeSeek').max = String(input.duration_s); $('timeInput').max = String(input.duration_s); $('distanceInput').max = String(sim.geometry.total);
    selectCaseOptions(E.SPEC.cases.some(c => c.id === input.id) ? input.id : '');
    updateCalculation(); renderAt(0);
  }
  function formatDisplay(value, digits) {
    const text = value.toFixed(digits);
    return Number(text) === 0 ? (0).toFixed(digits) : text;
  }
  function setMetric(id, value, digits) {const node = $(id); node.textContent = formatDisplay(value, digits); node.dataset.value = String(value);}
  function updateCalculation() {
    const g = sim.geometry, n = sim.input.wheel1_teeth, cm = g.total * E.SUN_CM;
    $('bookWheel1').textContent = String(n);
    $('calculation').textContent = language === 'ja'
      ? `一の輪 1回転 = 二の輪 ${g.r12}回転 = 天符 ${g.r12 * 91}回 = 約 ${(cm / 100).toFixed(n === 56 ? 1 : 2)} m（${g.total.toFixed(2)}寸 / ${cm.toFixed(1)} cm）`
      : `1 first-wheel turn = ${g.r12} second-wheel turns = ${g.r12 * 91} foliot cycles = ${(cm / 100).toFixed(2)} m (${g.total.toFixed(2)} sun / ${cm.toFixed(1)} cm)`;
    $('geometryNote').textContent = language === 'ja'
      ? `底廻りの車 径3寸。行き ${(g.fwd * E.SUN_CM).toFixed(1)} cm、旋回半径 ${(g.radius * E.SUN_CM).toFixed(1)} cm、魁車 ${g.steer_deg.toFixed(2)}°。公称速度 ${formatDisplay(g.v * E.SUN_CM, 1)} cm/秒。`
      : `Drive-wheel diameter: 3 sun. Outbound ${(g.fwd * E.SUN_CM).toFixed(1)} cm; turn radius ${(g.radius * E.SUN_CM).toFixed(1)} cm; steering ${g.steer_deg.toFixed(2)}°. Nominal speed ${formatDisplay(g.v * E.SUN_CM, 1)} cm/s.`;
  }
  function updateDOM() {
    const m = messages[language];
    $('status').textContent = m[metric.status]; $('status').dataset.value = metric.status;
    $('cupStatus').textContent = state.cup ? m.cupOn : m.cupOff; $('cupStatus').dataset.value = String(state.cup);
    $('stageState').textContent = m[metric.status];
    for (const [id, key, digits] of [
      ['distanceCm', 'distance_cm', 1], ['distanceSun', 'distance_sun', 1], ['progress', 'progress', 0], ['speed', 'speed_cm', 1],
      ['revWheel1', 'wheel1', 2], ['revWheel2', 'wheel2', 2], ['revEscape', 'escape', 2], ['oscillations', 'osc', 0]
    ]) setMetric(id, metric[key], digits);
    $('progressBar').value = metric.progress;
    $('cupButton').textContent = state.cup ? m.take : m.put; $('cupButton').setAttribute('aria-pressed', String(state.cup));
    $('playButton').textContent = playing ? m.pause : m.play; $('playButton').setAttribute('aria-pressed', String(playing));
    $('timeValue').textContent = formatDisplay(time, 2); $('timeSeek').value = String(time);
    if (document.activeElement !== $('timeInput')) $('timeInput').value = formatDisplay(time, 2);
    if (document.activeElement !== $('distanceInput')) $('distanceInput').value = formatDisplay(state.s, 2);
    $('soundButton').textContent = (language === 'ja' ? '音 ' : 'Sound ') + (sound ? 'ON' : 'OFF'); $('soundButton').setAttribute('aria-pressed', String(sound));
    $('viewCaption').textContent = m[view]; $('seatLabels').hidden = view !== 'overview';
  }
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (w !== lastWidth || h !== lastHeight) {renderer.setSize(w, h, false); lastWidth = w; lastHeight = h; updateCamera(true);}
  }
  function updateCamera(force = false) {
    const preset = model.cameraPreset(view), aspect = (lastWidth || 600) / (lastHeight || 500);
    const span = preset.span, vertical = Math.max(span / aspect, view === 'overview' ? 33 : span * .75);
    camera.left = -vertical * aspect / 2; camera.right = vertical * aspect / 2; camera.top = vertical / 2; camera.bottom = -vertical / 2; camera.updateProjectionMatrix();
    if (force || view !== 'overview') {camera.position.fromArray(preset.position); controls.target.fromArray(preset.target); controls.update();}
  }
  function renderAt(t) {
    time = Math.max(0, Math.min(sim.input.duration_s, t)); state = sim.snapshot(time); metric = E.metrics(state, sim.geometry);
    model.update(state); resize(); updateCamera(); updateDOM(); renderer.render(scene, camera); updateAnnotations();
    return state;
  }
  const annotationLayer = document.createElement('div'); annotationLayer.className = 'annotations'; container.appendChild(annotationLayer);
  const annotationNodes = [0, 1].map(() => {const n = document.createElement('span'); annotationLayer.appendChild(n); return n;});
  function updateAnnotations() {
    const labels = {stopper: [['stopper_i_contact', '止め (い)', 'Stopper (i)', -98, -38], ['tea_tray_click_target', '茶台と手の梃子', 'Tray & hand lever', 5, 25]],
      escapement: [['foliot_bar', '棒天符', 'Bar foliot', -85, -32], ['escape_teeth', '13歯の行司輪', '13-tooth crown wheel', 20, 22]],
      cam: [['yukimodori_single_64_degree_plate', '行戻 64°', '64° sector cam', -110, -24], ['sakigake_wheel', '首振りする魁車', 'Steering front wheel', 20, 28]]};
    annotationLayer.hidden = view === 'overview' || mode === 'normal';
    if (annotationLayer.hidden) return;
    labels[view].forEach(([name, ja, en, dx, dy], i) => {
      const o = model.doll.getObjectByName(name), p = o.getWorldPosition(new T.Vector3()).project(camera), n = annotationNodes[i];
      n.textContent = language === 'ja' ? ja : en;
      n.style.left = Math.max(10, Math.min(lastWidth - 145, (p.x + 1) * lastWidth / 2 + dx)) + 'px';
      n.style.top = Math.max(55, Math.min(lastHeight - 35, (1 - p.y) * lastHeight / 2 + dy)) + 'px';
    });
  }
  function setDisplay(value, amount = explosion) {
    mode = value; explosion = amount; model.setDisplay(mode, explosion);
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    $('explode').value = String(explosion * 100); $('explodeValue').textContent = String(Math.round(explosion * 100)); renderAt(time);
  }
  function setView(value) {
    view = value; model.setInspection(view);
    if (view !== 'overview' && mode === 'normal') setDisplay('cut');
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    updateCamera(true); renderAt(time);
  }
  function setLanguage(value) {
    language = value; document.documentElement.lang = language;
    document.querySelectorAll('[data-ja][data-en]').forEach(n => {n.textContent = n.dataset[language];});
    $('languageButton').textContent = language === 'ja' ? 'English' : '日本語';
    document.querySelector('.about-en').hidden = language !== 'en';
    document.querySelector('.about-ja').hidden = language !== 'ja';
    document.title = language === 'ja' ? '茶運人形 — 機巧図彙 1796' : 'Tea-serving automaton — Karakuri Zui 1796';
    selectCaseOptions(sim.input.id); updateCalculation(); renderAt(time);
  }
  function toggleCup() {if (!state.cup) {playing = true; lastFrame = performance.now();} const input = E.withCup(sim.input, time, !state.cup), t = time; sim = E.createSimulation(input); $('timeSeek').max = String(input.duration_s); $('timeInput').max = String(input.duration_s); renderAt(t);}
  function rewind() {const c = {...sim.input, schedule: [{t: 0, cup: state.cup}]}; loadCase(c);}
  function guest() {loadCase(E.guestCase(sim.input), {playing: true});}
  function seek(t) {playing = false; renderAt(t);}
  $('cupButton').addEventListener('click', toggleCup); $('rewindButton').addEventListener('click', rewind); $('guestButton').addEventListener('click', guest);
  $('playButton').addEventListener('click', () => {playing = !playing; lastFrame = performance.now(); updateDOM();});
  $('playbackSpeed').addEventListener('change', e => {speed = Number(e.target.value);});
  $('timeSeek').addEventListener('input', e => seek(Number(e.target.value)));
  $('timeInput').addEventListener('change', e => seek(Number(e.target.value)));
  $('distanceInput').addEventListener('change', e => {
    const distance = Math.max(0, Math.min(sim.geometry.total, Number(e.target.value))), target = sim.timeAtDistance(distance);
    if (Math.abs(sim.snapshot(target).s - distance) > 1e-6) {
      const c = {...sim.input, schedule: [{t: 0, cup: true}], duration_s: sim.geometry.total / sim.geometry.v + 3};
      loadCase(c, {playing: false});
    }
    seek(sim.timeAtDistance(distance));
  });
  $('casePreset').addEventListener('change', e => loadCase(E.SPEC.cases.find(c => c.id === e.target.value), {playing: true}));
  function updateParameters() {
    const p = Number($('foliotPeriod').value);
    if (!Number.isFinite(p) || p < .03 || p > .12) {$('foliotPeriod').value = String(sim.input.foliot_period_s); return;}
    const c = E.guestCase({...sim.input, wheel1_teeth: Number($('wheelTeeth').value), foliot_period_s: p}); loadCase(c, {playing: true});
  }
  $('wheelTeeth').addEventListener('change', updateParameters); $('foliotPeriod').addEventListener('change', updateParameters);
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setDisplay(b.dataset.mode)));
  $('explode').addEventListener('input', e => setDisplay(mode, Number(e.target.value) / 100));
  $('languageButton').addEventListener('click', () => setLanguage(language === 'ja' ? 'en' : 'ja'));
  $('soundButton').addEventListener('click', () => {sound = !sound; audio.setEnabled(sound); updateDOM();});
  $('aboutButton').addEventListener('click', () => $('aboutDialog').showModal()); $('closeAbout').addEventListener('click', () => $('aboutDialog').close());
  $('stopperShortcut').addEventListener('click', () => {loadCase(E.SPEC.cases.find(c => c.id === 'late_start'), {playing: true}); speed = 1 / 30; $('playbackSpeed').value = String(speed); setView('stopper'); renderAt(2.98);});
  $('camShortcut').addEventListener('click', () => {loadCase(E.guestCase(sim.input), {playing: false}); speed = .1; $('playbackSpeed').value = '.1'; $('playbackSpeed').value = String(speed); setView('cam'); renderAt(sim.timeAtDistance(sim.geometry.fwd) - .12);});
  const raycaster = new T.Raycaster();
  renderer.domElement.addEventListener('pointerdown', e => {dragStart = [e.clientX, e.clientY];});
  renderer.domElement.addEventListener('pointerup', e => {
    const origin = dragStart; dragStart = null;
    if (!origin || Math.hypot(e.clientX - origin[0], e.clientY - origin[1]) > 7) return;
    const r = renderer.domElement.getBoundingClientRect(); raycaster.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
    if (raycaster.intersectObjects(model.pickables, false).some(hit => hit.object.visible)) toggleCup(); dragStart = null;
  });
  renderer.domElement.addEventListener('pointercancel', () => {dragStart = null;});
  function projectedTray() {
    const p = model.pickables[0].getWorldPosition(new T.Vector3()).project(camera), r = renderer.domElement.getBoundingClientRect();
    return {x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2};
  }
  loadCase(E.SPEC.cases[0], {playing: true}); resize(); updateCamera(true); renderAt(0);
  // Inspection exposes the actual scene objects and rendered DOM, never an alternate simulation path.
  globalThis.ChahakobiApp = {loadCase, seek, renderAt, setView, setDisplay, setLanguage, toggleCup, rewind, guest, model, camera, renderer, controls, projectedTray,
    get state() {return state;}, get simulation() {return sim;}, get time() {return time;}, get playing() {return playing;},
    get view() {return view;}, get display() {return mode;}, get speed() {return speed;}, get sound() {return sound;}, get language() {return language;}};
  function frame(now) {
    const dt = Math.min(.15, (now - lastFrame) / 1000); lastFrame = now;
    if (playing) {renderAt(time + dt * speed); if (time >= sim.input.duration_s) {playing = false; updateDOM();} audio.tick(state);}
    else {resize(); renderer.render(scene, camera); updateAnnotations();}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
