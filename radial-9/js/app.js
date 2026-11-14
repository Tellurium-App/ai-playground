(function (root) {
  'use strict';
  // Every entry names a visible control, mechanism, numeric scale or error state.
  const TRANSLATIONS = {
    ja: {
      exhibit: '機構展示 / 001', subtitle: '空冷単列9気筒・4ストローク', specimen: '航空機エンジン / 稼働カットモデル',
      title: '星型9気筒の内部機構', intro: '1本のマスターロッドと8本のリンクロッドが、9個のピストンを駆動します。',
      camera: '視点', overview: '全体斜視', macro: '燃焼室・バルブ', master: 'マスターロッド', rear: '背面排気リング',
      running: '稼働中', paused: '停止中', orbitHint: 'ドラッグで360°回転 / スクロールでズーム', controls: '機構操作盤', compact: '折りたたむ', expand: '操作盤を開く',
      speed: '展示回転数', pause: '一時停止', play: '再生', displaySpeed: '観察用速度', meter: '換算計器 ×10（展示用目盛）',
      slow: '超スロー 12', idle: '展示 45', cruise: '巡航 180', crank: 'クランク角', cycle: '4ストローク / 720°',
      explode: '分解図', assembled: '組立位置', reset: '組立位置へ戻す', exterior: '外装表示', cutaway: 'カット断面', full: 'フル外装', xray: 'X線透過',
      sound: '排気パルス', soundHint: '80°ごとの点火に同期', soundOff: '音声 OFF', soundOn: '音声 ON', audioUnavailable: '音声非対応',
      camNote: '4ローブ・2列のカムリングは、クランクと逆方向へ1/8速で回転。', telemetry: '9気筒テレメトリ', lastFire: '直近点火',
      power: '膨張', exhaust: '排気', intake: '吸気', compression: '圧縮', firing: '点火順序', interval: '公称点火間隔 80°', mechanism: '機構とモデルについて', section: '切断面',
      explanation: 'ナックルピンはマスターロッドに剛体固定。各リンクの長さを保った幾何解でピストンを動かしています。',
      timingNote: 'リンク側の幾何学的上死点は公称点火角から最大約2.75°ずれます。この展示は厳密ロッド幾何と80°間隔の点火位相を併記した教育モデルです。',
      scaleNote: '寸法は展示用の相対単位です。特定の実機を再現した整備資料ではありません。',
      fallbackTitle: '3D表示を開始できませんでした', fallbackBody: 'WebGL 2対応のブラウザで開き、ハードウェアアクセラレーションを有効にしてください。下の操作盤では工程とクランク角を確認できます。',
      crankTip: '手動操作で一時停止。0〜720°を1°単位で観察できます。', explodeTip: 'プロペラ・ヘッド・バレル・背面集合管を別々の距離で展開します。',
      camTip: 'カムリングはクランクと逆方向に1/8速。4つのローブが各バルブを720°で1回開きます。',
      cutawayTip: 'No.1・No.2の前半分とプッシュロッド保護筒の中間を切除。ケースからノーズの検査窓と深紅の切断面を表示します。',
      fullTip: '全9気筒のバレル・ヘッド・ロッカーカバーを閉じます。', xrayTip: '外装を半透明にして9個のピストンとロッド群を表示します。',
      masterTip: 'カット断面では手前のハブ・カム・ケースを薄く透過し、8穴フランジ・砲金ブッシュ・ナックルピンを中央に表示します。',
      rpmTip: '展示速度0〜240 RPM。中央の換算目盛は10倍です。', audioTip: '80°間隔の点火イベントから低音パルスとタペット音を合成します。'
    },
    en: {
      exhibit: 'MECHANISM EXHIBIT / 001', subtitle: 'Air-cooled · Single-row nine · Four-stroke', specimen: 'AIRCRAFT ENGINE / WORKING CUTAWAY',
      title: 'Inside the nine-cylinder radial', intro: 'One master rod and eight articulated links drive all nine pistons.',
      camera: 'CAMERA', overview: 'Overview', macro: 'Chamber & valves', master: 'Master rod', rear: 'Exhaust rear',
      running: 'RUNNING', paused: 'PAUSED', orbitHint: 'Drag to orbit 360° / Scroll to zoom', controls: 'ENGINE CONTROLS', compact: 'Collapse', expand: 'Open controls',
      speed: 'Exhibition speed', pause: 'Pause', play: 'Play', displaySpeed: 'Observation speed', meter: 'Indicated scale ×10 (exhibit reference)',
      slow: 'Slow 12', idle: 'Idle 45', cruise: 'Cruise 180', crank: 'Crank angle', cycle: 'FOUR STROKES / 720°',
      explode: 'Exploded view', assembled: 'Assembled', reset: 'Reassemble', exterior: 'Exterior', cutaway: 'Cutaway', full: 'Full', xray: 'X-Ray',
      sound: 'Exhaust pulses', soundHint: 'Synchronized ignition every 80°', soundOff: 'SOUND OFF', soundOn: 'SOUND ON', audioUnavailable: 'No audio support',
      camNote: 'Two four-lobe cam rings turn against the crank at one-eighth speed.', telemetry: 'NINE-CYLINDER TELEMETRY', lastFire: 'LAST FIRED',
      power: 'Power', exhaust: 'Exhaust', intake: 'Intake', compression: 'Compression', firing: 'FIRING ORDER', interval: 'Nominal firing interval 80°', mechanism: 'About this mechanism', section: 'SECTION',
      explanation: 'The knuckle pins are rigidly fixed to the master flange. Exact geometric solutions preserve every articulated rod length.',
      timingNote: 'Geometric TDC in the linked cylinders differs from nominal ignition by up to 2.75°. This educational model retains exact rod geometry and the specified 80° ignition schedule.',
      scaleNote: 'Dimensions use relative exhibit units. This model is not maintenance documentation for a specific aircraft engine.',
      fallbackTitle: 'The 3D exhibit could not start', fallbackBody: 'Open this file in a WebGL 2 capable browser with hardware acceleration enabled. The controls below still show stroke phases and crank angle.',
      crankTip: 'Manual input pauses playback. Inspect 0–720° in one-degree steps.', explodeTip: 'Propeller, heads, barrels and rear collector separate by different distances.',
      camTip: 'Four lobes at reverse one-eighth crank speed open each valve once per 720° cycle.',
      cutawayTip: 'Remove the front halves of No.1 and No.2 and the middle pushrod sleeves. The case-to-nose inspection window and crimson cut faces remain visible.',
      fullTip: 'Close all nine barrels, heads and rocker covers.', xrayTip: 'Translucent shells reveal all nine pistons and articulated rods.',
      masterTip: 'In Cutaway, ghost the front hub, cams and case to center the eight-hole flange, bronze bush and knuckle pins.',
      rpmTip: 'Exhibition speed: 0–240 RPM. The central indicated scale reads ten times this speed.', audioTip: 'Synthesized bass exhaust and tappet clicks follow every 80° ignition event.'
    }
  };
  root.RadialTranslations = TRANSLATIONS;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const K = root.RadialKinematics, state = { angle: K.SPEC.renderAngleDeg, absoluteAngle: K.SPEC.renderAngleDeg, rpm: K.SPEC.initialRpm, playing: true, explode: 0, mode: 'cutaway', language: 'ja', camera: 'overview', compact: false };
  const audio = new root.RadialAudio();
  const badges = Array.from({ length: 9 }, (_, i) => { const el = document.createElement('div'); el.className = 'cylinder-badge'; el.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b><span></span>`; $('#cylinder-status').append(el); return el; });
  let renderer, engine, scene, camera, controls, cameraTween = null, lastTime = performance.now(), lastFrameTime = null, telemetryTime = 0;
  const performanceStats = { frames: 0, frameMs: [], drawCalls: 0, triangles: 0 };
  const presets = {
    overview: { position: [4.2, 2.65, 11.5], target: [0, -.18, 0] },
    macro: { position: [1.70, 3.8, 5.1], target: [.55, 1.65, 0] },
    master: { position: [.35, .30, 4.3], target: [0, .08, 0] },
    rear: { position: [-4.6, 2.1, -10], target: [0, -.05, -.45] }
  };
  function t(key) { return TRANSLATIONS[state.language][key] || key; }
  function localize() {
    document.documentElement.lang = state.language;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $('#play').textContent = t(state.playing ? 'pause' : 'play'); $('#motion-label').textContent = t(state.playing ? 'running' : 'paused');
    $('#sound').textContent = t(audio.enabled ? 'soundOn' : 'soundOff'); $('#collapse').textContent = t(state.compact ? 'expand' : 'compact');
    for (const [selector, key] of [['#angle', 'crankTip'], ['#explode', 'explodeTip'], ['.panel-note', 'camTip'], ['[data-mode=cutaway]', 'cutawayTip'], ['[data-mode=full]', 'fullTip'], ['[data-mode=xray]', 'xrayTip'], ['[data-camera=master]', 'masterTip'], ['#rpm', 'rpmTip'], ['#sound', 'audioTip']]) $(selector).title = t(key);
    for (const name of ['angle', 'explode']) $('#' + name).setAttribute('aria-label', t(name === 'angle' ? 'crank' : name));
    $('#rpm').setAttribute('aria-label', t('speed')); $('.viewport').setAttribute('aria-label', t('title'));
    $('#lang-ja').classList.toggle('active', state.language === 'ja'); $('#lang-en').classList.toggle('active', state.language === 'en');
    updateTelemetry(K.solve(state.angle));
  }
  function updateTelemetry(s) {
    $('#angle-value').textContent = String(Math.round(state.angle)).padStart(3, '0') + '°'; $('#angle').value = state.angle;
    $('#last-fired').textContent = 'No.' + s.lastFired;
    s.cylinders.forEach((c, i) => { badges[i].className = 'cylinder-badge ' + c.stroke; badges[i].querySelector('span').textContent = t(c.stroke); badges[i].title = 'No.' + c.id + ' · ' + t(c.stroke) + ' · ' + Math.round(c.phase) + '°'; });
  }
  function setPlaying(value) {
    state.playing = value; $('#play').textContent = t(value ? 'pause' : 'play'); $('#motion-label').textContent = t(value ? 'running' : 'paused');
    audio.setTransport(state.absoluteAngle, state.rpm, value);
    if (audio.context) audio.master.gain.setTargetAtTime(value && audio.enabled ? .18 : 0, audio.context.currentTime, .015);
    lastTime = performance.now();
  }
  function setRpm(value) {
    state.rpm = value; $('#rpm').value = value; $('#rpm-value').textContent = value; $('#equivalent').textContent = (value * K.SPEC.indicatedRpmFactor) + ' RPM';
    audio.setTransport(state.absoluteAngle, value, state.playing);
    $('#dial-needle').style.transform = `rotate(${135 + value / K.SPEC.maxRpm * 270}deg)`;
    $$('[data-rpm]').forEach(b => b.classList.toggle('active', Number(b.dataset.rpm) === value));
  }
  function setCamera(name) {
    state.camera = name; $$('[data-camera]').forEach(b => b.classList.toggle('active', b.dataset.camera === name));
    $('.viewport').dataset.cameraPreset = name;
    if (engine) engine.setInspection(name === 'master');
    if (renderer) renderer.shadowMap.needsUpdate = true;
    if (!camera) return;
    let p = presets[name];
    if (name === 'master') { const c = K.solve(state.angle).C; p = { position: [c.x + .35, c.y + .22, 4.3], target: [c.x, c.y, .10] }; }
    cameraTween = { start: performance.now(), from: camera.position.clone(), targetFrom: controls.target.clone(), to: new root.RADIAL_THREE.THREE.Vector3(...p.position), targetTo: new root.RADIAL_THREE.THREE.Vector3(...p.target) };
  }
  $('#play').addEventListener('click', () => setPlaying(!state.playing));
  document.addEventListener('visibilitychange', () => { lastTime = performance.now(); audio.setTransport(state.absoluteAngle, state.rpm, state.playing && !document.hidden); });
  document.addEventListener('keydown', e => { if (e.code === 'Space' && !['INPUT', 'BUTTON', 'SUMMARY'].includes(document.activeElement.tagName)) { e.preventDefault(); setPlaying(!state.playing); } });
  $('#rpm').addEventListener('input', e => setRpm(Number(e.target.value)));
  $$('[data-rpm]').forEach(b => b.addEventListener('click', () => { setRpm(Number(b.dataset.rpm)); setPlaying(true); }));
  $('#angle').addEventListener('input', e => { setPlaying(false); state.angle = Number(e.target.value); state.absoluteAngle = state.angle; const s = engine ? engine.update(state.angle, state.explode) : K.solve(state.angle); updateTelemetry(s); });
  $('#explode').addEventListener('input', e => { state.explode = Number(e.target.value) / 100; $('#explode-value').textContent = e.target.value + '%'; });
  $('#reset').addEventListener('click', () => { state.explode = 0; $('#explode').value = 0; $('#explode-value').textContent = '0%'; });
  $$('[data-mode]').forEach(b => b.addEventListener('click', () => { state.mode = b.dataset.mode; if (engine) engine.setMode(state.mode); if (renderer) renderer.shadowMap.needsUpdate = true; $$('[data-mode]').forEach(x => x.classList.toggle('active', x === b)); }));
  $$('[data-camera]').forEach(b => b.addEventListener('click', () => setCamera(b.dataset.camera)));
  for (const lang of ['ja', 'en']) $('#lang-' + lang).addEventListener('click', () => { state.language = lang; localize(); });
  $('#collapse').addEventListener('click', () => { state.compact = !state.compact; document.body.classList.toggle('compact', state.compact); $('.panel-body').hidden = state.compact; $('#collapse').setAttribute('aria-expanded', String(!state.compact)); localize(); resize(); });
  $('#sound').addEventListener('click', async () => {
    try { if (audio.enabled) audio.disable(); else { await audio.enable(); audio.setTransport(state.absoluteAngle, state.rpm, state.playing); if (!state.playing) audio.master.gain.value = 0; } $('#sound').setAttribute('aria-pressed', String(audio.enabled)); $('#sound').textContent = t(audio.enabled ? 'soundOn' : 'soundOff'); }
    catch (_) { $('#sound').textContent = t('audioUnavailable'); $('#sound').disabled = true; }
  });
  function resize() {
    if (!renderer) return; const host = $('#canvas-host'), w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function init3D() {
    const { THREE: T, OrbitControls, RoomEnvironment } = root.RADIAL_THREE;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!context) throw new Error('WebGL 2 unavailable');
    renderer = new T.WebGLRenderer({ canvas, context, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.5)); renderer.setClearColor('#10191e', 0);
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
    $('#canvas-host').append(renderer.domElement); renderer.domElement.setAttribute('aria-label', t('title'));
    scene = new T.Scene(); const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, .04).texture; room.dispose(); pmrem.dispose();
    camera = new T.PerspectiveCamera(35, 1, .05, 100); camera.position.set(...presets.overview.position);
    controls = new OrbitControls(camera, renderer.domElement); controls.target.set(...presets.overview.target); controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = 3; controls.maxDistance = 24; controls.maxPolarAngle = Math.PI * .90;
    controls.addEventListener('start', () => { cameraTween = null; });
    engine = root.RadialEngineBuilder.build(); scene.add(engine.model);
    const key = new T.DirectionalLight('#eef6ff', 3.1); key.position.set(-3, 6, 7); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 }); key.shadow.bias = -.0008; scene.add(key);
    const rim = new T.DirectionalLight('#afc8e7', 3.6); rim.position.set(4, 4, -5); scene.add(rim);
    const fill = new T.DirectionalLight('#efbe7c', 1.5); fill.position.set(-4, 0, 3); scene.add(fill); scene.add(new T.AmbientLight('#c6d4dc', .35));
    const floor = new T.Mesh(new T.PlaneGeometry(200, 200), new T.ShadowMaterial({ color: '#000000', opacity: .28 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -3.64; floor.receiveShadow = true; scene.add(floor);
    renderer.shadowMap.needsUpdate = true;
    resize(); new ResizeObserver(resize).observe($('#canvas-host')); root.addEventListener('resize', resize);
    $('#canvas-host').dataset.ready = 'true';
  }
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, .1); lastTime = now;
    if (state.playing && !document.hidden) {
      const next = audio.enabled ? audio.clockAngle() : state.absoluteAngle + dt * state.rpm * 6;
      // Both audio and the visual mechanism use the same absolute ignition events.
      audio.schedule();
      state.absoluteAngle = next; state.angle = K.mod(next, 720);
    }
    const k = engine ? engine.update(state.angle, state.explode) : K.solve(state.angle);
    if (now - telemetryTime > 70 || !state.playing) { updateTelemetry(k); telemetryTime = now; }
    if (renderer) {
      if (cameraTween) {
        const t = Math.min(1, (now - cameraTween.start) / 900), smooth = t * t * (3 - 2 * t);
        camera.position.lerpVectors(cameraTween.from, cameraTween.to, smooth); controls.target.lerpVectors(cameraTween.targetFrom, cameraTween.targetTo, smooth);
        if (t === 1) cameraTween = null;
      }
      controls.update();
      // Expansion adds room without changing the chosen viewing direction.
      camera.zoom += ((1 - state.explode * .38) - camera.zoom) * .08; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      for (const [selector, cylinder] of [['.tag-one', 0], ['.tag-two', 1]]) {
        const v = engine.assemblies[cylinder].head.localToWorld(new root.RADIAL_THREE.THREE.Vector3(0, 2.65, .03)); v.project(camera);
        const el = $(selector); el.style.left = ((v.x + 1) * .5 * $('#canvas-host').clientWidth) + 'px'; el.style.top = ($('#canvas-host').offsetTop + (1 - v.y) * .5 * $('#canvas-host').clientHeight) + 'px'; el.hidden = state.mode !== 'cutaway' || v.z > 1;
      }
      performanceStats.frames++; performanceStats.drawCalls = renderer.info.render.calls; performanceStats.triangles = renderer.info.render.triangles;
      if (lastFrameTime !== null && performanceStats.frames > 10) { performanceStats.frameMs.push(now - lastFrameTime); if (performanceStats.frameMs.length > 300) performanceStats.frameMs.shift(); }
      lastFrameTime = now;
    }
    root.requestAnimationFrame(frame);
  }
  localize(); setRpm(state.rpm);
  try { init3D(); } catch (error) { if (renderer) { renderer.dispose(); renderer = null; } $('#fallback').hidden = false; root.radialStartupError = error.message; }
  root.radialStudio = { state, audio, performanceStats, get engine() { return engine; }, get renderer() { return renderer; }, get camera() { return camera; }, get controls() { return controls; }, setCamera };
  root.requestAnimationFrame(frame);
})(window);
