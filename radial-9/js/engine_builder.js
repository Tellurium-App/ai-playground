(function (root) {
  'use strict';
  const T = root.RADIAL_THREE.THREE, K = root.RadialKinematics, S = K.SPEC;
  const Y = new T.Vector3(0, 1, 0), cache = new Map();
  const palette = {
    steel: ['#a8b8c3', .92, .23], aluminium: ['#a3adb5', .80, .32], gunmetal: ['#29343b', .82, .39],
    brass: ['#b69557', .84, .27], bronze: ['#795144', .88, .32], crimson: ['#7d0929', 0, .65],
    ceramic: ['#e2e1ce', .10, .25], black: ['#10191e', .45, .42], gasket: ['#302426', .3, .6],
    floor: ['#172127', .50, .38], fire: ['#ff9b39', .1, .35]
  };
  function createMaterials() {
    return Object.fromEntries(Object.entries(palette).map(([key, [color, metalness, roughness]]) => {
      const m = new T.MeshStandardMaterial({ color, metalness, roughness, name: key });
      if (key === 'fire') { m.emissive.set('#ff590b'); m.emissiveIntensity = 1; m.transparent = true; m.opacity = .1; m.depthWrite = false; }
      return [key, m];
    }));
  }
  function geo(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }
  // A closed annular sector with actual planar end faces. Axis is local +Y.
  function annulus(inner, outer, length, start = 0, sweep = Math.PI * 2) {
    return geo(['ann', inner, outer, length, start, sweep].join(':'), () => {
      const p = [[inner, -length / 2], [outer, -length / 2], [outer, length / 2], [inner, length / 2], [inner, -length / 2]].map(v => new T.Vector2(...v));
      const g = new T.LatheGeometry(p, Math.max(12, Math.round(48 * sweep / (Math.PI * 2))), start, sweep);
      if (sweep < Math.PI * 2 - .001) {
        const pos = Array.from(g.attributes.position.array), ind = Array.from(g.index.array);
        for (const a of [start, start + sweep]) {
          const n = pos.length / 3;
          for (const [r, y] of [[inner, -length / 2], [outer, -length / 2], [outer, length / 2], [inner, length / 2]]) pos.push(r * Math.sin(a), y, r * Math.cos(a));
          ind.push(n, n + 1, n + 2, n, n + 2, n + 3);
        }
        g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(ind); g.computeVertexNormals();
      }
      return g;
    });
  }
  function build(options = {}) {
    const materials = createMaterials(), model = new T.Group(); model.name = 'RADIAL_9_ENGINE';
    const frontPieces = [], cutFaces = [], shells = [], cylinderAssemblies = [], rods = [], chambers = [], lights = [];
    let displayMode = 'cutaway', inspectionRequested = false;
    let componentCount = 0;
    function group(parent, name) { const g = new T.Group(); g.name = name; parent.add(g); return g; }
    function mesh(parent, name, geometry, material, xyz = [0, 0, 0]) {
      const m = new T.Mesh(geometry, typeof material === 'string' ? materials[material] : material);
      m.name = name; m.position.set(...xyz); m.castShadow = true; m.receiveShadow = true; parent.add(m); componentCount++; return m;
    }
    function ring(parent, name, ri, ro, h, mat, xyz = [0, 0, 0], axis = 'y', start = 0, sweep = Math.PI * 2) {
      const m = mesh(parent, name, annulus(ri, ro, h, start, sweep), mat, xyz);
      if (axis === 'z') m.rotation.x = Math.PI / 2; return m;
    }
    function cyl(parent, name, r, h, mat, xyz = [0, 0, 0], axis = 'y', vertices = 32) {
      const m = mesh(parent, name, geo(`cyl:${r}:${h}:${vertices}`, () => new T.CylinderGeometry(r, r, h, vertices)), mat, xyz);
      if (axis === 'z') m.rotation.x = Math.PI / 2; if (axis === 'x') m.rotation.z = Math.PI / 2; return m;
    }
    function box(parent, name, size, mat, xyz = [0, 0, 0]) { return mesh(parent, name, geo(`box:${size}`, () => new T.BoxGeometry(...size)), mat, xyz); }
    function tube(parent, name, points, radius, mat) {
      const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
      return mesh(parent, name, new T.TubeGeometry(curve, 32, radius, 8, false), mat);
    }
    function bolt(parent, x, y, z, scale = 1, axis = 'z') {
      cyl(parent, 'hex_fastener', .047 * scale, .035 * scale, 'steel', [x, y, z], axis, 6);
      ring(parent, 'fastener_washer', .022 * scale, .058 * scale, .012 * scale, 'brass', [x, y, z - .022 * scale], axis);
    }
    function radialBolts(parent, radius, z, count, scale = 1) {
      for (let j = 0; j < count; j++) { const a = j * Math.PI * 2 / count; bolt(parent, radius * Math.cos(a), radius * Math.sin(a), z, scale); }
    }
    function shell(parent, name, inner, outer, h, xyz, isCut, mat = 'gunmetal') {
      const back = ring(parent, name + '_rear_half', inner, outer, h, mat, xyz, 'y', Math.PI / 2, Math.PI);
      const front = ring(parent, name + '_front_half', inner, outer, h, mat, xyz, 'y', -Math.PI / 2, Math.PI);
      frontPieces.push({ mesh: front, cut: isCut }); shells.push(back, front);
      if (isCut) for (const sign of [-1, 1]) {
        const cap = box(parent, name + '_crimson_section', [outer - inner, h, .009], 'crimson', [xyz[0] + sign * (inner + outer) / 2, xyz[1], xyz[2]]);
        cutFaces.push(cap);
      }
    }
    const fixed = group(model, 'fixed_reference'), rear = group(model, 'rear_case_manifold'), exhaust = group(model, 'exhaust_collector');
    const nose = group(model, 'nose_and_cam'), hub = group(model, 'propeller_assembly'), crank = group(model, 'crankshaft'), rodGroup = group(model, 'articulated_rods');
    // Stationary display pedestal with machined plinth, brass plaque and rear cradle.
    box(fixed, 'pedestal_lower', [2.55, .13, 1.85], 'black', [0, -3.55, -.15]);
    box(fixed, 'pedestal_top', [2.36, .08, 1.7], 'gunmetal', [0, -3.44, -.15]);
    box(fixed, 'brass_identification_plate', [.98, .18, .015], 'brass', [0, -3.44, .72]);
    const glyphs = { R: [[[0,0],[0,1],[.6,1],[.6,.55],[0,.55]], [[.25,.55],[.7,0]]], A: [[[0,0],[.3,1],[.65,0]], [[.13,.45],[.5,.45]]], D: [[[0,0],[0,1],[.45,1],[.7,.75],[.7,.25],[.45,0],[0,0]]], I: [[[.3,0],[.3,1]]], L: [[[0,1],[0,0],[.65,0]]], '-': [[[0,.5],[.6,.5]]], 9: [[[.65,0],[.65,1],[0,1],[0,.5],[.65,.5]]] };
    for (const [j, character] of [...'RADIAL-9'].entries()) for (const path of glyphs[character]) for (let k = 1; k < path.length; k++) {
      const a = path[k - 1], b = path[k], dx = (b[0] - a[0]) * .065, dy = (b[1] - a[1]) * .10;
      const stroke = box(fixed, 'engraved_RADIAL9_stroke', [.004, Math.hypot(dx, dy), .002], 'black', [-.36 + j * .095 + (a[0] + b[0]) * .0325, -3.49 + (a[1] + b[1]) * .05, .729]); stroke.rotation.z = -Math.atan2(dx, dy);
    }
    for (const x of [-.7, .7]) tube(fixed, 'mount_strut', [[x, -3.4, -.7], [x * 1.2, -2.5, -.9], [x * 1.3, -.85, -.7]], .055, 'steel');
    ring(fixed, 'engine_mount_ring', .98, 1.05, .11, 'steel', [0, 0, -.78], 'z');
    for (let j = 0; j < 9; j++) { const a = j * Math.PI * 2 / 9; bolt(fixed, 1.01 * Math.cos(a), 1.01 * Math.sin(a), -.70); }
    // Split cast case. The front inspection window is a genuine missing sector.
    shells.push(ring(rear, 'rear_case_wall', .22, .94, .14, 'gunmetal', [0, 0, -.36], 'z'));
    shells.push(ring(rear, 'rear_flange', .87, 1.04, .08, 'aluminium', [0, 0, -.27], 'z'));
    radialBolts(rear, .98, -.20, 24);
    const windowStart = Math.PI * .46, windowEnd = Math.PI * 1.04;
    const casePermanent = ring(model, 'case_front_retained', .29, .94, .14, 'gunmetal', [0, 0, .25], 'z', windowEnd, Math.PI * 2 - (windowEnd - windowStart));
    const caseWindow = ring(model, 'case_window_sector', .29, .94, .14, 'gunmetal', [0, 0, .25], 'z', windowStart, windowEnd - windowStart);
    frontPieces.push({ mesh: caseWindow, cut: true }); shells.push(casePermanent, caseWindow);
    casePermanent.userData.inspectionOccluder = true; caseWindow.userData.inspectionOccluder = true;
    for (const a of [windowStart, windowEnd]) {
      // Lathe z-rotation gives x=sin(a), y=-cos(a).
      const cap = box(model, 'case_crimson_window_edge', [.65, .018, .15], 'crimson', [.615 * Math.sin(a), -.615 * Math.cos(a), .25]);
      cap.rotation.z = a - Math.PI / 2; cutFaces.push(cap);
      cap.userData.inspectionOccluder = true;
    }
    ring(model, 'case_front_perimeter', .94, 1.04, .09, 'aluminium', [0, 0, .21], 'z');
    radialBolts(model, .99, .28, 24);
    const sump = box(model, 'oil_sump', [.45, .3, .43], 'gunmetal', [0, -1.02, -.15]); sump.rotation.z = .04;
    cyl(model, 'oil_drain_plug', .07, .08, 'brass', [0, -1.21, -.12]);
    tube(model, 'breather', [[-.57, -.62, -.25], [-.82, -.83, -.32], [-.82, -1.08, -.32]], .055, 'bronze');
    // Crank, two offset counterweights and races. Maximum origin envelope < .70.
    cyl(crank, 'main_shaft', .13, .95, 'steel', [0, 0, -.10], 'z');
    for (const z of [-.24, .16]) {
      const arm = box(crank, 'crank_web', [.25, S.crankRadius, .07], 'steel', [0, S.crankRadius / 2, z]);
      arm.rotation.z = -.04;
      const weight = ring(crank, 'counterweight', .15, .69, .07, 'steel', [0, 0, z], 'z', -.72, 1.44);
      if (z > 0) { arm.userData.inspectionOccluder = true; weight.userData.inspectionOccluder = true; }
    }
    cyl(crank, 'crankpin_journal', .112, .42, 'steel', [0, S.crankRadius, 0], 'z');
    for (const z of [-.45, .36]) {
      ring(model, 'main_bearing_race', .13, .23, .075, 'brass', [0, 0, z], 'z');
      for (let j = 0; j < 12; j++) { const a = j * Math.PI / 6; cyl(model, 'bearing_roller', .022, .06, 'steel', [.18 * Math.cos(a), .18 * Math.sin(a), z], 'z', 12); }
    }
    // H-web forged rods. Pin centers remain at exact solver endpoints.
    function rodGeometry(length, width) {
      return geo(`forging:${length}:${width}`, () => {
        const sh = new T.Shape(); sh.moveTo(-width, .06);
        sh.lineTo(-width * .55, .23); sh.lineTo(-width * .43, length - .18); sh.lineTo(-width * .8, length - .05);
        sh.lineTo(width * .8, length - .05); sh.lineTo(width * .43, length - .18); sh.lineTo(width * .55, .23); sh.lineTo(width, .06); sh.closePath();
        const g = new T.ExtrudeGeometry(sh, { depth: S.rodThickness, bevelEnabled: true, bevelSize: .006, bevelThickness: .004, bevelSegments: 2, steps: 1 }); g.translate(0, 0, -S.rodThickness / 2); return g;
      });
    }
    const master = group(rodGroup, 'master_rod_8_knuckle_flange');
    const flangeShape = new T.Shape(); flangeShape.absarc(0, 0, .35, 0, Math.PI * 2, false);
    const bore = new T.Path(); bore.absarc(0, 0, .115, 0, Math.PI * 2, true); flangeShape.holes.push(bore);
    for (let j = 1; j < 9; j++) { const a = -K.rad(j * 40); const hole = new T.Path(); hole.absarc(.25 * Math.sin(-a), .25 * Math.cos(a), .043, 0, Math.PI * 2, true); flangeShape.holes.push(hole); }
    mesh(master, 'perforated_master_flange', new T.ExtrudeGeometry(flangeShape, { depth: .045, bevelEnabled: true, bevelSize: .005, bevelThickness: .004, bevelSegments: 2, steps: 1 }), 'steel');
    ring(master, 'master_bronze_bush', .113, .149, .065, 'brass', [0, 0, .024], 'z');
    mesh(master, 'master_forged_H_web', rodGeometry(S.masterLength, .085), 'steel');
    box(master, 'master_web_ridge', [.035, 1.12, .035], 'aluminium', [0, .88, .01]);
    ring(master, 'master_small_end', .041, .079, .06, 'steel', [0, S.masterLength, .01], 'z');
    for (let j = 1; j < 9; j++) {
      const r = group(rodGroup, `link_rod_${j + 1}`), length = S.linkLength;
      mesh(r, 'forged_link_H_web', rodGeometry(length, .045), 'steel');
      box(r, 'link_web_rib', [.017, length - .36, .025], 'aluminium', [0, length / 2, 0]);
      ring(r, 'link_big_end', .032, .061, .026, 'steel', [0, 0, 0], 'z');
      ring(r, 'link_small_end', .033, .064, .026, 'steel', [0, length, 0], 'z');
      const pin = cyl(rodGroup, 'knuckle_pin_' + (j + 1), .03, .33, 'brass', [0, 0, .02], 'z', 20);
      rods.push({ group: r, pin, lane: -.135 + j * S.rodLaneStep });
    }
    // Two independently profiled four-lobe cam rings and a visible spur train.
    const cams = [], timingGears = [];
    for (const [n, kind] of ['exhaust', 'intake'].entries()) {
      const sh = new T.Shape();
      for (let j = 0; j <= 360; j++) { const a = j * Math.PI / 180, r = K.camProfile(a, kind); const x = r * Math.cos(a), y = r * Math.sin(a); j ? sh.lineTo(x, y) : sh.moveTo(x, y); }
      const hole = new T.Path(); hole.absarc(0, 0, .70, 0, Math.PI * 2, true); sh.holes.push(hole);
      const c = group(nose, kind + '_cam_assembly'); c.position.z = .46 + n * .13;
      mesh(c, kind + '_four_lobe_cam', new T.ExtrudeGeometry(sh, { depth: .038, bevelEnabled: true, bevelSize: .005, bevelThickness: .005, bevelSegments: 1, steps: 1 }), n ? 'brass' : 'steel');
      // Fixed-axis sun/idler/internal-ring: 12:42:96 teeth gives reverse 1/8.
      for (let j = 0; j < 96; j++) { const a = j * Math.PI * 2 / 96; const tooth = box(c, 'internal_ring_gear_tooth', [.022, .013, .03], n ? 'brass' : 'steel', [.697 * Math.cos(a), .697 * Math.sin(a), .019]); tooth.rotation.z = a; }
      cams.push(c);
      for (const [name, x, radius, teeth, ratio] of [['crank_sun', 0, .0875, 12, -1], ['fixed_axis_idler', .39375, .30625, 42, 12 / 42]]) {
        const gear = group(nose, kind + '_' + name); gear.position.set(x, 0, .479 + n * .13);
        ring(gear, 'timing_gear_web', .026, radius - .012, .028, 'steel', [0, 0, 0], 'z');
        for (let j = 0; j < teeth; j++) { const a = j * Math.PI * 2 / teeth; const tooth = box(gear, 'timing_gear_tooth', [.022, .013, .028], 'steel', [radius * Math.cos(a), radius * Math.sin(a), 0]); tooth.rotation.z = a; }
        timingGears.push({ group: gear, ratio, phase: name === 'fixed_axis_idler' ? Math.PI / 42 : 0 });
      }
    }
    // Reduced nose casting has a fluted, stepped profile and brass hub collar.
    const noseProfile = [[.22, -.10], [.47, -.10], [.48, -.02], [.43, .12], [.31, .38], [.23, .48], [.19, .48], [.19, -.10], [.22, -.10]];
    for (const [name, start, sweep, cut] of [['tapered_reduction_nose', windowEnd, Math.PI * 2 - windowEnd + windowStart, false], ['nose_inspection_sector', windowStart, windowEnd - windowStart, true]]) {
      const geometry = geo(name, () => new T.LatheGeometry(noseProfile.map(v => new T.Vector2(...v)), 48, start, sweep));
      const part = mesh(nose, name, geometry, 'gunmetal', [0, 0, .80]); part.rotation.x = Math.PI / 2; shells.push(part);
      if (cut) frontPieces.push({ mesh: part, cut: true });
    }
    const noseSection = new T.Shape(noseProfile.map(v => new T.Vector2(...v)));
    for (const angle of [windowStart, windowEnd]) {
      const geometry = new T.ShapeGeometry(noseSection), positions = geometry.attributes.position;
      for (let v = 0; v < positions.count; v++) { const r = positions.getX(v), z = positions.getY(v); positions.setXYZ(v, r * Math.sin(angle), -r * Math.cos(angle), z + .80); }
      geometry.computeVertexNormals(); const sectionMaterial = materials.crimson.clone(); sectionMaterial.side = T.DoubleSide;
      cutFaces.push(mesh(nose, 'nose_crimson_section', geometry, sectionMaterial));
    }
    shells.push(ring(nose, 'nose_mount_flange', .37, .52, .065, 'aluminium', [0, 0, .74], 'z')); radialBolts(nose, .47, .79, 18, .72);
    ring(hub, 'propeller_brass_collar', .12, .245, .16, 'brass', [0, 0, 1.18], 'z');
    cyl(hub, 'pitch_dome', .18, .35, 'steel', [0, 0, 1.40], 'z');
    const dome = mesh(hub, 'pitch_dome_cap', geo('dome', () => new T.SphereGeometry(.18, 32, 16)), 'steel', [0, 0, 1.57]); dome.scale.z = .58;
    for (let j = 0; j < 3; j++) {
      const blade = group(hub, 'short_twisted_blade_' + j); blade.rotation.z = j * Math.PI * 2 / 3;
      cyl(blade, 'blade_pitch_root', .105, .30, 'steel', [0, .28, 1.27]);
      ring(blade, 'blade_root_clamp', .105, .132, .10, 'brass', [0, .28, 1.27]);
      const verts = [], ids = [], steps = 12;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, width = .105 + .075 * Math.sin(Math.PI * t), twist = .18 + .60 * t;
        for (const side of [-1, 1]) verts.push(side * width * Math.cos(twist), .41 + t * .65, 1.27 + side * width * Math.sin(twist));
        if (s < steps) { const n = s * 2; ids.push(n, n + 1, n + 3, n, n + 3, n + 2); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(verts, 3)); g.setIndex(ids); g.computeVertexNormals();
      const bm = materials.aluminium.clone(); bm.side = T.DoubleSide; mesh(blade, 'twisted_exhibition_blade', g, bm);
      bolt(blade, .08, .30, 1.39, .55);
    }
    // Rear induction spider, heat-stained exhaust collector and dual tails.
    ring(exhaust, 'exhaust_collector_ring', 1.46, 1.62, .17, 'bronze', [0, 0, -.82], 'z');
    cyl(rear, 'intake_plenum', .34, .32, 'gunmetal', [0, 0, -.86], 'z');
    for (const side of [-1, 1]) tube(exhaust, 'exhaust_tailpipe', [[side * .62, -1.4, -.84], [side * .8, -1.8, -.91], [side * .75, -2.05, -1.12]], .095, 'bronze');
    ring(rear, 'ignition_harness_ring', .99, 1.025, .06, 'brass', [0, 0, -.51], 'z');
    for (let j = 0; j < 9; j++) {
      const id = j + 1, isCut = id <= 2, phi = K.rad(90 - 40 * j), rotation = phi - Math.PI / 2;
      const base = group(model, 'cylinder_axis_' + id); base.rotation.z = rotation;
      const barrel = group(base, 'barrel_and_pushrod_tubes_' + id), head = group(base, 'head_valvetrain_' + id), piston = group(base, 'piston_' + id);
      shell(barrel, 'bored_cylinder_' + id, .34, .384, 1.14, [0, 1.91, 0], isCut);
      shell(barrel, 'barrel_base_flange_' + id, .34, .44, .07, [0, 1.33, 0], isCut, 'aluminium');
      for (let k = 0; k < S.finCount; k++) shell(barrel, 'cooling_fin_' + k, .38, .44 + .025 * k / 15, .024, [0, 1.40 + k * .067, 0], isCut, k > 10 ? 'aluminium' : 'gunmetal');
      for (const x of [-.32, .32]) for (const z of [-.22, .22]) { cyl(barrel, 'barrel_base_stud', .026, .12, 'steel', [x, 1.31, z]); cyl(barrel, 'base_hex_nut', .041, .035, 'brass', [x, 1.38, z], 'y', 6); }
      shell(head, 'combustion_head_' + id, .34, .445, .35, [0, 2.63, 0], isCut, 'aluminium');
      shell(head, 'head_chamber_roof_' + id, 0, .34, .045, [0, 2.5825, 0], isCut, 'aluminium');
      for (let k = 0; k < 6; k++) shell(head, 'head_fin_' + k, .34, .49 - k * .008, .024, [0, 2.49 + k * .055, 0], isCut, 'aluminium');
      shell(head, 'rocker_cover_' + id, .32, .38, .24, [0, 3.025, 0], isCut, 'gunmetal');
      shell(head, 'rocker_cover_roof_' + id, 0, .38, .03, [0, 3.16, 0], isCut, 'gunmetal');
      for (const x of [-.25, .25]) bolt(head, x, 3.055, .14, .58);
      // A real annular crown depression, three separate rings, and an open skirt.
      ring(piston, 'piston_rear_skirt', .276, S.pistonRadius, .33, 'aluminium', [0, -.13, 0], 'y', Math.PI / 2, Math.PI);
      ring(piston, 'piston_notched_front_skirt', .276, S.pistonRadius, .21, 'aluminium', [0, -.07, 0], 'y', -Math.PI / 2, Math.PI);
      ring(piston, 'piston_crown_rim', .235, S.pistonRadius, .09, 'aluminium', [0, .185, 0]);
      cyl(piston, 'piston_dished_crown', .235, .025, 'aluminium', [0, .165, 0]);
      for (let k = 0; k < 3; k++) ring(piston, 'piston_compression_ring_' + k, .316, .333, .018, 'black', [0, .11 - k * .055, 0]);
      cyl(piston, 'floating_wrist_pin', .039, .59, 'steel', [0, 0, 0], 'z');
      const chamberMaterial = materials.fire.clone();
      const chamber = cyl(head, 'combustion_gas_' + id, .302, .12, chamberMaterial, [0, 2.42, -.015]); chambers.push(chamber);
      const light = new T.PointLight('#ff751c', 0, 1.4, 2); light.position.set(0, 2.42, .1); if (!options.export) { head.add(light); lights.push(light); }
      const valves = [], pushrods = [], rockers = [], springs = [], followers = [], sparks = [], covers = [];
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? -1 : 1, x = side * .157, zCam = .48 + k * .13;
        const valve = group(head, k ? 'intake_poppet' : 'exhaust_poppet');
        cyl(valve, 'valve_mushroom_head', .105, .028, 'steel', [x, S.valveClosedRadius, -.055]);
        cyl(valve, 'valve_stem', .021, .43, 'steel', [x, 2.735, -.055]);
        cyl(valve, 'spring_retainer', .078, .024, 'steel', [x, 2.945, -.055]); valves.push(valve);
        const pts = []; for (let h = 0; h <= 126; h++) { const t = h / 126, a = t * Math.PI * 2 * 7; pts.push([x + .060 * Math.cos(a), 2.75 + .18 * t, -.055 + .060 * Math.sin(a)]); }
        const springG = new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0] - x, p[1] - 2.75, p[2] + .055))), 126, .010, 5, false);
        const spring = mesh(head, 'helical_valve_spring', springG, 'steel', [x, 2.75, -.055]); springs.push(spring);
        cyl(head, 'valve_guide', .046, .13, 'brass', [x, 2.72, -.055]);
        const rocker = group(head, 'pivoting_rocker'); rocker.position.set(x, 2.99, .245);
        box(rocker, 'forged_rocker_lever', [.062, .055, .60], 'steel', [0, 0, -.015]);
        cyl(rocker, 'rocker_pivot', .052, .11, 'brass', [0, 0, 0], 'x');
        cyl(rocker, 'rocker_adjusting_screw', .026, .10, 'brass', [0, -.01, .27]); rockers.push(rocker);
        const push = group(base, 'moving_pushrod');
        const start = new T.Vector3(0, S.camBaseRadius + .074, zCam), end = new T.Vector3(x, 2.99, .515), delta = end.clone().sub(start);
        const pr = cyl(push, 'polished_pushrod', .016, delta.length(), 'steel'); pr.position.copy(start.clone().add(end).multiplyScalar(.5)); pr.quaternion.setFromUnitVectors(Y, delta.normalize()); pushrods.push(push);
        const cover = group(barrel, 'pushrod_cover_' + id + '_' + k);
        const sleeve = tube(cover, 'pushrod_protective_tube', [[x * .08, 1.03, zCam + (.515 - zCam) * .08], [x * .40, 1.7, zCam + (.515 - zCam) * .40], [x * .80, 2.55, zCam + (.515 - zCam) * .80]], .035, 'gunmetal');
        shells.push(sleeve);
        const collars = [], edges = [];
        if (isCut) {
          frontPieces.push({ mesh: sleeve, cut: true });
          const curve = sleeve.geometry.parameters.path;
          for (const [start, end, edgeT] of [[0, .08, .08], [.92, 1, .92]]) {
            const a = curve.getPoint(start), b = curve.getPoint(end), delta = b.clone().sub(a);
            const collar = ring(cover, 'pushrod_short_collar', .024, .043, delta.length(), 'gunmetal');
            collar.position.copy(a.clone().add(b).multiplyScalar(.5)); collar.quaternion.setFromUnitVectors(Y, delta.normalize());
            shells.push(collar); collars.push(collar);
            const edge = ring(cover, 'pushrod_crimson_cut_ring', .024, .044, .007, 'crimson');
            edge.position.copy(curve.getPoint(edgeT)); edge.quaternion.setFromUnitVectors(Y, curve.getTangent(edgeT).normalize());
            cutFaces.push(edge); edges.push(edge);
          }
        }
        covers.push({ sleeve, collars, edges, cut: isCut });
        const follower = cyl(nose, 'cam_roller_tappet_' + id + '_' + k, .037, .067, 'steel', [0, 0, zCam], 'z', 16); followers.push(follower);
        // Two plugs per cylinder; ivory insulator ribs and electrode tip.
        const plug = group(head, 'spark_plug_' + k); plug.position.set(side * .31, 2.78, -.13); plug.rotation.z = -side * .55;
        cyl(plug, 'plug_thread', .043, .12, 'steel'); cyl(plug, 'plug_hex', .058, .035, 'steel', [0, .06, 0], 'y', 6);
        cyl(plug, 'ceramic_insulator', .033, .17, 'ceramic', [0, .15, 0]);
        for (let h = 0; h < 5; h++) ring(plug, 'ceramic_rib', .028, .041, .012, 'ceramic', [0, .10 + h * .025, 0]);
        cyl(plug, 'electrode', .009, .05, 'brass', [0, -.08, 0]);
        const sparkMaterial = materials.fire.clone(); sparkMaterial.color.set('#d8efff'); sparkMaterial.emissive.set('#a0cfff');
        sparks.push(mesh(plug, 'ignition_spark', geo('spark_tip', () => new T.IcosahedronGeometry(.019, 1)), sparkMaterial, [0, -.108, 0]));
        tube(head, 'ignition_lead', [[side * .39, 2.97, -.13], [side * .5, 2.75, -.4], [side * .48, 2.35, -.5]], .014, 'black');
      }
      const pipes = group(rear, 'rear_pipes_' + id); pipes.rotation.z = rotation;
      tube(pipes, 'intake_branch', [[0, .27, -.91], [-.16, .85, -1.0], [-.24, 2.2, -.65], [-.24, 2.60, -.35]], .063, 'aluminium');
      tube(pipes, 'exhaust_elbow', [[.26, 2.62, -.30], [.35, 2.35, -.62], [.20, 1.70, -.82], [0, 1.54, -.82]], .075, 'bronze');
      ring(pipes, 'exhaust_port_flange', .074, .107, .055, 'steel', [.26, 2.57, -.30]);
      cylinderAssemblies.push({ base, barrel, head, piston, valves, pushrods, rockers, springs, followers, sparks, covers, phi });
    }
    const engineLift = group(model, 'engine_clearance_lift');
    for (const part of [...model.children]) if (part !== fixed && part !== engineLift) engineLift.add(part);
    function update(deg, expansion = 0) {
      const state = K.solve(deg), e = K.explode(expansion);
      engineLift.position.y = e.engineLiftY;
      crank.rotation.z = -K.rad(deg); hub.rotation.z = -K.rad(deg);
      hub.position.z = e.hubZ; nose.position.z = e.noseZ; rear.position.z = e.rearZ; exhaust.position.z = e.exhaustZ; rodGroup.position.z = e.rodZ;
      cams.forEach(c => { c.rotation.z = state.camAngle; });
      timingGears.forEach(g => { g.group.rotation.z = K.rad(deg) * g.ratio + g.phase; });
      master.position.set(state.C.x, state.C.y, .10); master.rotation.z = state.tilt;
      state.cylinders.forEach((c, j) => {
        if (j) {
          const r = rods[j - 1]; r.group.position.set(c.K.x, c.K.y, r.lane); r.group.rotation.z = Math.atan2(c.P.y - c.K.y, c.P.x - c.K.x) - Math.PI / 2;
          r.pin.position.set(c.K.x, c.K.y, .025);
        }
        const a = cylinderAssemblies[j]; a.piston.position.y = c.s + e.pistonRadial; a.barrel.position.y = e.barrelRadial; a.head.position.y = e.headRadial;
        const lift = [c.exhaust * S.valveLift, c.intake * S.valveLift];
        lift.forEach((l, n) => {
          a.valves[n].position.y = -l; a.rockers[n].rotation.x = -Math.asin(l / .30); a.springs[n].scale.y = 1 - l / .18;
          a.pushrods[n].position.y = l * S.camLift / S.valveLift + e.barrelRadial;
          const radius = S.camBaseRadius + S.camLift * l / S.valveLift + .037;
          a.followers[n].position.x = Math.cos(c.phi) * radius; a.followers[n].position.y = Math.sin(c.phi) * radius;
        });
        const crown = c.s + S.pistonCrownOffset, height = S.headCeilingRadius - crown;
        chambers[j].position.y = (crown + S.headCeilingRadius) / 2; chambers[j].scale.y = height / .12;
        chambers[j].material.color.set(c.stroke === 'intake' ? '#3b9baf' : c.stroke === 'compression' ? '#daab67' : '#ff9b39');
        chambers[j].material.opacity = .035 + c.flash * .55; chambers[j].material.emissiveIntensity = .3 + c.flash * 2;
        a.sparks.forEach(spark => { spark.material.opacity = c.flash; spark.material.emissiveIntensity = c.flash * 8; });
        if (lights[j]) lights[j].intensity = c.flash * .65;
      });
      model.updateMatrixWorld(true); return state;
    }
    // Identify inspection parts before batching so they never merge with the rods.
    for (const assembly of [nose, hub]) assembly.traverse(m => { if (m.isMesh) m.userData.inspectionOccluder = true; });
    function refreshDisplay() {
      const xray = displayMode === 'xray', inspection = inspectionRequested && displayMode === 'cutaway';
      frontPieces.forEach(p => { p.mesh.visible = displayMode !== 'cutaway' || !p.cut; }); cutFaces.forEach(m => { m.visible = displayMode === 'cutaway'; });
      model.traverse(m => {
        if (!m.isMesh) return;
        if (!m.userData.originalMaterial) m.userData.originalMaterial = m.material;
        if (m.userData.originalCastShadow === undefined) m.userData.originalCastShadow = m.castShadow;
        if (xray && shells.includes(m)) {
          if (!m.userData.xrayMaterial) { const xm = m.userData.originalMaterial.clone(); xm.transparent = true; xm.opacity = .16; xm.depthWrite = false; xm.color.set('#a8bec8'); xm.metalness = .2; m.userData.xrayMaterial = xm; }
          m.material = m.userData.xrayMaterial;
        } else m.material = m.userData.originalMaterial;
        const ghost = inspection && !!m.userData.inspectionOccluder;
        if (ghost) {
          if (!m.userData.inspectionMaterial) { const gm = m.userData.originalMaterial.clone(); gm.transparent = true; gm.opacity = .035; gm.depthWrite = false; gm.color.set('#849da5'); gm.metalness = .15; gm.roughness = .6; m.userData.inspectionMaterial = gm; }
          m.material = m.userData.inspectionMaterial;
        }
        m.castShadow = ghost ? false : m.userData.originalCastShadow;
        m.userData.inspectionGhost = ghost;
      });
      model.userData.mode = displayMode; model.userData.inspectionActive = inspection;
    }
    function setMode(mode) { displayMode = mode; refreshDisplay(); }
    function setInspection(active) { inspectionRequested = !!active; refreshDisplay(); }
    // Share static geometry and collapse repeated fasteners/fins inside each moving subassembly.
    function batch(g) {
      const buckets = new Map();
      for (const c of [...g.children]) {
        if (c.isGroup) {
          batch(c);
          // These groups contain no articulated parts; bake their local transforms.
          if (/^(spark_plug_|short_twisted_blade_|rear_pipes_)/.test(c.name)) {
            c.updateMatrix();
            for (const part of [...c.children]) {
              part.updateMatrix(); const matrix = c.matrix.clone().multiply(part.matrix);
              matrix.decompose(part.position, part.quaternion, part.scale); g.add(part);
            }
            g.remove(c);
          }
        }
      }
      for (const c of [...g.children]) {
        if (c.isMesh && !chambers.includes(c) && !c.name.includes('cam') && !c.name.includes('tappet') && !c.name.includes('spring') && !c.name.startsWith('knuckle_pin_')) {
          const front = frontPieces.find(p => p.mesh === c);
          const category = front ? (front.cut ? 'front_cut' : 'shell') : cutFaces.includes(c) ? 'cap' : shells.includes(c) ? 'shell' : 'regular';
          const key = c.material.uuid + ':' + category + ':' + !!c.userData.inspectionOccluder;
          if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(c);
        }
      }
      for (const list of buckets.values()) if (list.length > 2) {
        const sameGeometry = list.every(m => m.geometry === list[0].geometry && !m.isInstancedMesh);
        let im;
        if (sameGeometry) im = new T.InstancedMesh(list[0].geometry, list[0].material, list.length);
        else {
          const positions = [], normals = [], indices = []; let vertexOffset = 0;
          const addGeometry = (geometry, matrix) => {
            const transformed = geometry.clone().applyMatrix4(matrix), p = transformed.attributes.position, n = transformed.attributes.normal;
            for (const v of p.array) positions.push(v); for (const v of n.array) normals.push(v);
            if (transformed.index) for (const v of transformed.index.array) indices.push(v + vertexOffset);
            else for (let v = 0; v < p.count; v++) indices.push(v + vertexOffset);
            vertexOffset += p.count; transformed.dispose();
          };
          for (const m of list) {
            m.updateMatrix();
            if (m.isInstancedMesh) for (let i = 0; i < m.count; i++) { const v = new T.Matrix4(); m.getMatrixAt(i, v); addGeometry(m.geometry, m.matrix.clone().multiply(v)); }
            else addGeometry(m.geometry, m.matrix);
          }
          const merged = new T.BufferGeometry(); merged.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); merged.setAttribute('normal', new T.Float32BufferAttribute(normals, 3)); merged.setIndex(indices);
          im = new T.Mesh(merged, list[0].material);
        }
        im.name = list[0].name + '_batch';
        im.userData.inspectionOccluder = !!list[0].userData.inspectionOccluder;
        const isShell = shells.includes(list[0]), isCap = cutFaces.includes(list[0]), front = frontPieces.find(p => p.mesh === list[0]);
        list.forEach((m, i) => { if (sameGeometry) { m.updateMatrix(); im.setMatrixAt(i, m.matrix); } g.remove(m);
          let n = shells.indexOf(m); if (n >= 0) shells.splice(n, 1);
          n = cutFaces.indexOf(m); if (n >= 0) cutFaces.splice(n, 1);
          n = frontPieces.findIndex(p => p.mesh === m); if (n >= 0) frontPieces.splice(n, 1);
        });
        im.visible = list[0].visible; if (isShell) shells.push(im); if (isCap) cutFaces.push(im); if (front) frontPieces.push({ mesh: im, cut: front.cut });
        im.castShadow = true; im.receiveShadow = true; g.add(im);
      }
    }
    update(S.renderAngleDeg); setMode('cutaway');
    if (!options.export) batch(model);
    return { model, update, setMode, setInspection, materials, componentCount, assemblies: cylinderAssemblies, cams };
  }
  root.RadialEngineBuilder = { build, palette };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RadialEngineBuilder;
})(typeof window !== 'undefined' ? window : globalThis);
