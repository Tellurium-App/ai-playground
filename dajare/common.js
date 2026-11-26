// ダジャレ・ローポリの共通の土台: 舞台、拍の時計、音、題字、動画の書き出し用の入口。
// 各ページは Dajare.boot() で舞台を受け取り、S.start({ draw, playStep, captureCamera }) で回す。
(() => {
  const { THREE: T, OrbitControls } = globalThis.ChahakobiStudio;
  const PI = Math.PI;
  const clamp = u => Math.min(1, Math.max(0, u));
  const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };
  const outCubic = u => 1 - Math.pow(1 - clamp(u), 3);
  const outBack = u => { u = clamp(u) - 1; return 1 + 2.7 * u * u * u + 1.7 * u * u; };
  const lerp = (a, b, u) => a + (b - a) * u;

  function boot({ bpm, background, fog, cam }) {
    const params = new URLSearchParams(location.search);
    let frozenBeat = params.has('beat') ? parseFloat(params.get('beat')) : null; // 静止画の確認用
    const capture = params.has('capture'); // tools/render_video.py が1コマずつ描かせる
    if (capture) document.documentElement.classList.add('capture');
    window.__BPM = bpm;

    const canvas = document.getElementById('c');
    const renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new T.Scene();
    scene.background = new T.Color(background);
    if (fog) scene.fog = new T.Fog(background, fog[0], fog[1]);
    const baseFov = cam.fov || 40;
    const camera = new T.PerspectiveCamera(baseFov, 1, 0.1, 300);
    camera.position.set(...cam.pos);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...cam.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = PI * 0.52;
    let seed = 20261126;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

    // ---- 拍の時計と音 ----
    let ctx = null, master = null, noiseBuf = null, soundOn = false, nextStep = 0, timer = 0, playStep = null;
    let beatBase = 0, tBase = performance.now() / 1000;
    const nowSec = () => (soundOn ? ctx.currentTime : performance.now() / 1000);
    const beatNow = () => (frozenBeat !== null ? frozenBeat : beatBase + (nowSec() - tBase) * bpm / 60);
    const A = { // 音の部品。t は鳴らす時刻（秒）
      beatSec: 60 / bpm,
      env(node, t, peak, dur, hold = 0) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(peak, t);
        if (hold) g.gain.setValueAtTime(peak, t + hold);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        node.connect(g); g.connect(master);
      },
      noise(t, type, freq, peak, dur) {
        const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
        src.connect(f); A.env(f, t, peak, dur); src.start(t); src.stop(t + dur + 0.02);
      },
      tone(t, type, f0, f1, peak, dur, hold = 0) {
        const o = ctx.createOscillator(); o.type = type;
        o.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        A.env(o, t, peak, dur, hold); o.start(t); o.stop(t + dur + 0.02);
      },
    };
    function initAudio(c) {
      ctx = c;
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.5), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    function schedule() {
      const ahead = ctx.currentTime + 0.2;
      for (;;) {
        const t = tBase + (nextStep / 2 - beatBase) * 60 / bpm;
        if (t > ahead) break;
        if (t >= ctx.currentTime) playStep(nextStep, t, A);
        nextStep++;
      }
    }
    // 動画用: 画面で鳴るのと同じ音を beats 拍ぶん書き出す（モノラル 44.1kHz の生サンプル）
    window.__renderAudio = async beats => {
      const sr = 44100;
      initAudio(new OfflineAudioContext(1, Math.round(beats * 60 / bpm * sr), sr));
      for (let s = 0; s < beats * 2; s++) playStep(s, s / 2 * 60 / bpm, A);
      return Array.from((await ctx.startRendering()).getChannelData(0));
    };
    const soundBtn = document.getElementById('sound');
    soundBtn.addEventListener('click', async () => {
      if (!ctx) initAudio(new AudioContext());
      const b = beatNow();
      if (!soundOn) {
        await ctx.resume();
        soundOn = true; beatBase = b; tBase = nowSec();
        nextStep = Math.ceil(beatBase * 2);
        timer = setInterval(schedule, 50);
      } else {
        clearInterval(timer);
        soundOn = false; beatBase = b; tBase = nowSec();
        await ctx.suspend();
      }
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.textContent = soundOn ? '■ 音を止める' : '♪ 音を出す';
    });

    // ---- 毎フレーム ----
    const logo = document.getElementById('logo');
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight, pr = renderer.getPixelRatio();
      if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w < h ? baseFov * 1.45 : baseFov; // 縦長の画面では引く
        camera.updateProjectionMatrix();
      }
    }
    function start({ draw, playStep: ps, captureCamera }) {
      playStep = ps;
      function frame() {
        resize();
        const b = beatNow();
        draw(b);
        const hue = (b * 45) % 360, hit = Math.pow(Math.max(0, Math.cos(b * 2 * PI)), 4); // hit は拍の頭で1
        logo.style.backgroundPositionX = (-b * 25) + '%'; // 4拍で虹がひと回り
        logo.style.filter = `drop-shadow(0 0 ${4 + 6 * hit}px hsl(${hue} 100% 65%)) drop-shadow(0 0 ${14 + 16 * hit}px hsl(${(hue + 60) % 360} 100% 55%))`;
        logo.style.transform = `scale(${1 + 0.07 * hit}) rotate(${-2 + 1.5 * Math.sin(b * PI)}deg)`;
        if (capture && captureCamera) captureCamera(b, camera);
        controls.update();
        renderer.render(scene, camera);
        if (!capture) requestAnimationFrame(frame);
      }
      window.__renderAt = b => { frozenBeat = b; frame(); };
      frame();
    }
    return { T, scene, camera, rand, capture, start, PI, clamp, smooth, outCubic, outBack, lerp };
  }
  globalThis.Dajare = { boot };
})();
