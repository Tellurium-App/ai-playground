(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChahakobiEngine = factory();
})(globalThis, function () {
  'use strict';
  const SPEC = /* SPEC_START */{"spec_version":"1.0","sun_mm":30.303030303030305,"wheel2_teeth":56,"wheel2_pinion":8,"escape_teeth":13,"escape_pinion":8,"drive_diameter_sun":3,"cam_degrees":64,"wheelbase_sun":3,"bow_from":0.9,"head_bow_deg":25,"leg_amplitude_deg":15,"cases":[{"id":"basic","wheel1_teeth":56,"foliot_period_s":0.06,"duration_s":50,"schedule":[{"t":0,"cup":true},{"t":15.5,"cup":false},{"t":23.5,"cup":true},{"t":48,"cup":false}]},{"id":"early_take","wheel1_teeth":56,"foliot_period_s":0.06,"duration_s":46,"schedule":[{"t":0,"cup":true},{"t":8,"cup":false},{"t":12,"cup":true}]},{"id":"no_guest","wheel1_teeth":56,"foliot_period_s":0.06,"duration_s":42,"schedule":[{"t":0,"cup":true}]},{"id":"return_stop","wheel1_teeth":56,"foliot_period_s":0.06,"duration_s":55,"schedule":[{"t":0,"cup":true},{"t":15.5,"cup":false},{"t":23.5,"cup":true},{"t":36,"cup":false},{"t":40,"cup":true}]},{"id":"teeth60","wheel1_teeth":60,"foliot_period_s":0.06,"duration_s":52,"schedule":[{"t":0,"cup":true},{"t":16.5,"cup":false},{"t":24,"cup":true}]},{"id":"fast_foliot","wheel1_teeth":56,"foliot_period_s":0.04,"duration_s":33,"schedule":[{"t":0,"cup":true},{"t":10,"cup":false},{"t":16,"cup":true}]},{"id":"late_start","wheel1_teeth":56,"foliot_period_s":0.06,"duration_s":46,"schedule":[{"t":3,"cup":true},{"t":10.25,"cup":false},{"t":10.5,"cup":true}]}]}/* SPEC_END */;
  const TAU = Math.PI * 2, SUN_CM = 100 / 33;
  const round = (x, n) => { const v = Number(x.toFixed(n)); return v === 0 ? 0 : v; };
  function validate(input) {
    if (![56, 60].includes(input.wheel1_teeth)) throw new RangeError('wheel1_teeth: 56 / 60');
    if (!(input.foliot_period_s > 0) || !Number.isFinite(input.foliot_period_s)) throw new RangeError('foliot_period_s > 0');
    if (!(input.duration_s >= 0) || !Number.isFinite(input.duration_s)) throw new RangeError('duration_s >= 0');
    let prev = 0;
    for (const e of input.schedule) {
      if (!Number.isFinite(e.t) || e.t < prev || typeof e.cup !== 'boolean') throw new RangeError('schedule: ordered times and boolean cups');
      prev = e.t;
    }
  }
  function geometry(input) {
    const r12 = input.wheel1_teeth / 8, r2e = 7, circ = Math.PI * 3;
    const total = r12 * circ, arc = total * 64 / 360, fwd = (total - arc) / 2, radius = arc / Math.PI;
    const osc_per_sun = r2e * 13 / circ;
    return {r12, r2e, circ, total, arc, fwd, radius, steer_deg: Math.atan(3 / radius) * 180 / Math.PI,
      osc_per_sun, v: 1 / (osc_per_sun * input.foliot_period_s), bow_s: .9 * fwd};
  }
  function pose(s, g) {
    if (s < g.fwd) return {phase: 'forward', x: s, y: 0, heading: 0};
    if (s < g.fwd + g.arc) {
      const a = (s - g.fwd) / g.radius;
      return {phase: 'turn', x: g.fwd + g.radius * Math.sin(a), y: -g.radius * (1 - Math.cos(a)), heading: -a * 180 / Math.PI};
    }
    const u = Math.min(s, g.total) - g.fwd - g.arc;
    return {phase: s >= g.total ? 'done' : 'return', x: g.fwd - u, y: -2 * g.radius, heading: -180};
  }
  function stateAtDistance(t, s, cup, g) {
    const p = pose(s, g), rev2 = s / g.circ;
    return {t: round(t, 3), s: round(s, 9), x: round(p.x, 9), y: round(p.y, 9), heading: round(p.heading, 9),
      phase: p.phase, cup, running: cup && s < g.total,
      steer_deg: round(p.phase === 'turn' ? g.steer_deg : 0, 9),
      head_deg: round(g.bow_s <= s && s < g.fwd ? 25 : 0, 9),
      leg_deg: round(15 * Math.sin(TAU * rev2), 9), osc: round(s * g.osc_per_sun, 6),
      rev: {wheel1: round(s / g.total, 9), wheel2: round(rev2, 9), escape: round(rev2 * g.r2e, 9), drive: round(rev2, 9)}};
  }
  function createSimulation(source) {
    const input = JSON.parse(JSON.stringify(source)); validate(input);
    const g = geometry(input), events = [], segments = [], sched = input.schedule;
    const bounds = [[g.bow_s, 'head', {bowed: true}], [g.fwd, 'phase', {phase: 'turn'}],
      [g.fwd, 'head', {bowed: false}], [g.fwd + g.arc, 'phase', {phase: 'return'}], [g.total, 'rundown', {}]];
    let t = 0, s = 0, cup = false, index = 0;
    while (true) {
      while (index < sched.length && sched[index].t <= t) {
        const e = sched[index++]; cup = e.cup;
        events.push({t: round(e.t, 6), s: round(s, 9), type: 'cup', cup});
      }
      const running = cup && s < g.total;
      segments.push({t, s, running});
      const next = Math.min(index < sched.length ? sched[index].t : input.duration_s, input.duration_s);
      if (running) {
        for (const [b, type, extra] of bounds) if (s < b && b <= s + g.v * (next - t))
          events.push({t: round(t + (b - s) / g.v, 6), s: round(b, 9), type, ...extra});
        s = Math.min(g.total, s + g.v * (next - t));
      }
      t = next;
      if (t >= input.duration_s && !(index < sched.length && sched[index].t <= input.duration_s)) break;
    }
    function snapshot(time) {
      const tt = Math.max(0, Math.min(input.duration_s, time));
      let seg = segments[0], cu = false;
      for (const candidate of segments) if (candidate.t <= tt) seg = candidate;
      for (const e of sched) if (e.t <= tt) cu = e.cup;
      const ss = seg.running ? Math.min(g.total, seg.s + g.v * (tt - seg.t)) : seg.s;
      return stateAtDistance(tt, ss, cu, g);
    }
    function trace() {
      const gg = {}; for (const key of ['total', 'fwd', 'arc', 'radius', 'steer_deg', 'v', 'bow_s']) gg[key] = round(g[key], 9);
      const samples = [];
      for (let k = 0; k <= Math.floor(input.duration_s / .25 + 1e-9); k++) samples.push(snapshot(k * .25));
      return {spec_version: '1.0', case: input.id,
        input: {wheel1_teeth: input.wheel1_teeth, foliot_period_s: input.foliot_period_s, duration_s: input.duration_s, schedule: input.schedule},
        geometry: gg, events, samples};
    }
    function timeAtDistance(distance) {
      const target = Math.max(0, Math.min(g.total, distance));
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i], end = segments[i + 1]?.t ?? input.duration_s;
        if (target === seg.s) return seg.t;
        if (seg.running && target <= Math.min(g.total, seg.s + g.v * (end - seg.t))) return seg.t + (target - seg.s) / g.v;
      }
      return input.duration_s;
    }
    return {input, geometry: g, events, snapshot, trace, timeAtDistance};
  }
  function withCup(input, time, cup) {
    const c = JSON.parse(JSON.stringify(input));
    c.schedule = c.schedule.filter(e => e.t < time).concat([{t: time, cup}]);
    c.duration_s = Math.max(c.duration_s, time + geometry(c).total / geometry(c).v + 10);
    return c;
  }
  function guestCase(input) {
    const c = {...input, id: 'guest'}, g = geometry(c), stop = g.fwd * .98 / g.v, wait = 5;
    c.schedule = [{t: 0, cup: true}, {t: stop, cup: false}, {t: stop + wait, cup: true}];
    c.duration_s = g.total / g.v + wait + 3; return c;
  }
  function metrics(s, g) {
    return {status: s.phase === 'done' ? 'done' : !s.running ? 'stopped' : s.phase,
      distance_sun: s.s, distance_cm: s.s * SUN_CM, progress: s.s / g.total * 100,
      speed_sun: s.running ? g.v : 0, speed_cm: s.running ? g.v * SUN_CM : 0,
      wheel1: s.rev.wheel1, wheel2: s.rev.wheel2, escape: s.rev.escape, osc: s.osc};
  }
  return {SPEC, SUN_CM, geometry, pose, stateAtDistance, createSimulation, simulate: c => createSimulation(c).trace(), withCup, guestCase, metrics};
});
