(function (root) {
  'use strict';
  const SPEC = /* SPEC_START */{"schemaVersion":1,"cylinders":9,"cycleDeg":720,"cylinderStepDeg":40,"firstAxisDeg":90,"crankRadius":0.46,"masterLength":1.65,"flangeRadius":0.25,"linkLength":1.4,"boreDiameter":0.68,"pistonRadius":0.324,"pistonCrownOffset":0.23,"pistonSkirtOffset":-0.3,"barrelBaseRadius":1.28,"barrelTopRadius":2.48,"headCeilingRadius":2.56,"valveClosedRadius":2.51,"valveLift":0.1,"counterweightRadius":0.7,"rodThickness":0.018,"rodLaneStep":0.027,"finCount":16,"camLobes":4,"camSpeedRatio":-0.125,"camBaseRadius":0.79,"camLift":0.09,"firingOrder":[1,3,5,7,9,2,4,6,8],"firingAnglesDeg":[0,80,160,240,320,400,480,560,640],"strokeBoundariesDeg":[0,180,360,540,720],"sparkStartDeg":-6,"sparkEndDeg":32,"initialRpm":45,"maxRpm":240,"indicatedRpmFactor":10,"renderAngleDeg":35,"explosion":{"hubZ":2.1,"noseZ":1.1,"headRadial":1.3,"barrelRadial":0.68,"pistonRadial":0.22,"rodZ":0.1,"rearZ":-1.2,"exhaustZ":-1.8,"engineLiftY":1.1},"notes":"Dimensionless educational mechanism, not a certified R-975/R-985 replica. Exact articulated geometry has unequal geometric TDC spacing; 80-degree firing is the specified nominal ignition schedule."}/* SPEC_END */;
  const TAU = Math.PI * 2;
  const rad = d => d * Math.PI / 180;
  const mod = (x, n) => ((x % n) + n) % n;
  const phases = ['power', 'exhaust', 'intake', 'compression'];
  function valveLift(phase, start) {
    const t = (phase - start) / 180;
    return t > 0 && t < 1 ? Math.sin(Math.PI * t) ** 2 : 0;
  }
  function solve(deg) {
    const theta = mod(deg, SPEC.cycleDeg), alpha = rad(SPEC.firstAxisDeg - theta);
    const C = { x: SPEC.crankRadius * Math.cos(alpha), y: SPEC.crankRadius * Math.sin(alpha) };
    const P1 = { x: 0, y: C.y + Math.sqrt(SPEC.masterLength ** 2 - C.x ** 2) };
    const masterAngle = Math.atan2(P1.y - C.y, -C.x), tilt = masterAngle - Math.PI / 2;
    const cylinders = Array.from({ length: SPEC.cylinders }, (_, j) => {
      const id = j + 1, phi = rad(SPEC.firstAxisDeg - SPEC.cylinderStepDeg * j);
      const u = { x: Math.cos(phi), y: Math.sin(phi) };
      const K = id === 1 ? C : { x: C.x + SPEC.flangeRadius * Math.cos(phi + tilt), y: C.y + SPEC.flangeRadius * Math.sin(phi + tilt) };
      const parallel = K.x * u.x + K.y * u.y;
      const perpendicular2 = Math.max(0, K.x * K.x + K.y * K.y - parallel * parallel);
      const s = id === 1 ? P1.y : parallel + Math.sqrt(SPEC.linkLength ** 2 - perpendicular2);
      const P = { x: s * u.x, y: s * u.y };
      const firingAngle = SPEC.firingAnglesDeg[SPEC.firingOrder.indexOf(id)];
      const phase = mod(theta - firingAngle, SPEC.cycleDeg);
      const signedIgnition = phase > 360 ? phase - 720 : phase;
      const flash = signedIgnition >= SPEC.sparkStartDeg && signedIgnition <= SPEC.sparkEndDeg
        ? Math.sin(Math.PI * (signedIgnition - SPEC.sparkStartDeg) / (SPEC.sparkEndDeg - SPEC.sparkStartDeg)) ** 2 : 0;
      return { id, phi, u, K, P, s, firingAngle, phase, stroke: phases[Math.floor(phase / 180)],
        intake: valveLift(phase, 360), exhaust: valveLift(phase, 180), flash };
    });
    return { theta, C, masterAngle, tilt, camAngle: -rad(theta) * SPEC.camSpeedRatio,
      lastFired: SPEC.firingOrder[Math.floor(theta / 80)], cylinders };
  }
  function explode(e) {
    const t = Math.max(0, Math.min(1, e));
    return Object.fromEntries(Object.entries(SPEC.explosion).map(([k, v]) => [k, t === 0 ? 0 : v * t]));
  }
  // Local ring angle -> nominal crank phase at the top follower. Four identical lobes.
  function camProfile(localAngle, kind) {
    const equivalent = mod(720 - localAngle * 180 / Math.PI * 8, 720);
    return SPEC.camBaseRadius + SPEC.camLift * valveLift(equivalent, kind === 'exhaust' ? 180 : 360);
  }
  function firingEvents(from, to) {
    if (to <= from) return [];
    const events = [];
    for (let k = Math.floor(from / 80) + 1; k <= Math.floor(to / 80); k++) events.push({ angle: k * 80, cylinder: SPEC.firingOrder[mod(k, 9)] });
    return events;
  }
  const api = { SPEC, TAU, rad, mod, solve, explode, valveLift, camProfile, firingEvents };
  root.RadialKinematics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
