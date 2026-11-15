(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    require('../vendor/three-studio.bundle.js');
    module.exports = factory(globalThis.ChahakobiStudio.THREE, require('./chahakobi_engine.js'));
  } else root.ChahakobiBuilder = factory(root.ChahakobiStudio.THREE, root.ChahakobiEngine);
})(globalThis, function (T, E) {
  'use strict';
  const TAU = 2 * Math.PI, RAD = Math.PI / 180;
  function makeTextures() {
    const out = {};
    for (const key of ['wood', 'tatami', 'cloth']) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const ctx = c.getContext('2d'); out[key] = c;
      ctx.fillStyle = {wood: '#b38a5c', tatami: '#c3be8c', cloth: '#314b4c'}[key]; ctx.fillRect(0, 0, 256, 256);
      if (key === 'wood') for (let i = 0; i < 100; i++) {
        ctx.strokeStyle = i % 3 ? '#bf9c70' : '#98714a'; ctx.lineWidth = .8; ctx.beginPath();
        for (let y = 0; y <= 256; y += 8) { const x = i * 2.7 + 3 * Math.sin(y * .04 + i); if (y) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
      }
      if (key === 'tatami') for (let y = 0; y < 256; y += 4) {
        ctx.fillStyle = y % 8 ? '#a9ac7b' : '#d6d0a1'; ctx.fillRect(0, y, 256, 1);
        for (let x = 0; x < 256; x += 16) {ctx.fillStyle = '#b0ac80'; ctx.fillRect(x + (y % 8 ? 8 : 0), y, 1, 4);}
      }
      if (key === 'cloth') for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
        ctx.strokeStyle = '#a3b3a1'; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 8; i++) {const a = i * TAU / 8, r = i % 2 ? 9 : 23; const xx = x + 32 + Math.cos(a) * r, yy = y + 32 + Math.sin(a) * r; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);} ctx.stroke();
        ctx.fillStyle = '#bd9855'; ctx.fillRect(x + 30, y + 30, 4, 4);
      }
    }
    return out;
  }
  function gearGeometry(teeth, r, depth) {
    const shape = new T.Shape();
    for (let i = 0; i < teeth; i++) for (const [j, f, radius] of [[0, 0, .88], [1, .22, 1], [2, .55, 1], [3, .78, .88]]) {
      const a = (i + f) * TAU / teeth, x = Math.cos(a) * r * radius, y = Math.sin(a) * r * radius;
      if (i || j) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    shape.closePath(); const hole = new T.Path(); hole.absarc(0, 0, r * .66, 0, TAU, true); shape.holes.push(hole);
    const geo = new T.ExtrudeGeometry(shape, {depth, bevelEnabled: false, curveSegments: 20}); geo.translate(0, 0, -depth / 2); return geo;
  }
  function createModel(options = {}) {
    const root = new T.Group(), doll = new T.Group(), stage = new T.Group();
    root.name = 'tea_serving_exhibit'; doll.name = 'doll_rear_axle_origin'; stage.name = 'tatami_stage'; root.add(stage, doll);
    const parts = [], moving = [], wheels = {}, canvases = options.textures === false ? {} : makeTextures(), textures = {};
    for (const [k, canvas] of Object.entries(canvases)) {const tx = new T.CanvasTexture(canvas); tx.colorSpace = T.SRGBColorSpace; textures[k] = tx;}
    const material = (name, color, metalness, roughness, atlas) => {
      const m = new T.MeshStandardMaterial({name, color, metalness, roughness, map: textures[atlas] || null}); m.userData.atlas = atlas || null; return m;
    };
    const mats = {
      wood: material('boxwood', '#e1bc82', .02, .65, 'wood'), edge: material('dark_wood', '#675039', .02, .64, 'wood'),
      brass: material('warm_brass', '#b59146', .76, .35), gold: material('cam_brass', '#dfbb66', .7, .28),
      steel: material('blue_steel', '#667c7a', .78, .32), black: material('whalebone', '#33342f', .12, .55),
      skin: material('gofun_face', '#efe0bf', .01, .7), hair: material('black_lacquer', '#1f2422', .08, .38),
      cloth: material('indigo_silk', '#ffffff', .02, .86, 'cloth'), lining: material('ivory_lining', '#d9d2b7', .01, .85),
      obi: material('ochre_sash', '#a88c50', .03, .8), tray: material('lacquer_tray', '#763d2f', .12, .38),
      ceramic: material('tea_bowl', '#e0dfca', .02, .25), tea: material('matcha', '#536941', .02, .45),
      thread: material('silk_thread', '#b34932', .05, .77), tatami: material('woven_tatami', '#ffffff', .01, .93, 'tatami'),
      border: material('tatami_border', '#3c514d', .02, .88), guest: material('guest_cushion', '#865343', .01, .93),
      path: material('route_brass', '#8d6937', .18, .72)
    };
    const box = new T.BoxGeometry(1, 1, 1), cyl = new T.CylinderGeometry(1, 1, 1, 24), sphere = new T.SphereGeometry(1, 24, 16);
    function add(name, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], role = 'mechanism', parent = doll) {
      const o = new T.Mesh(geo, mat.clone()); o.name = name; o.position.set(...pos); o.scale.set(...scale);
      o.castShadow = true; o.receiveShadow = true; o.userData.role = role; parent.add(o); parts.push(o); return o;
    }
    const b = (name, mat, pos, scale, role, parent) => add(name, box, mat, pos, scale, role, parent);
    const rod = (name, mat, pos, radius, length, role, parent) => add(name, cyl, mat, pos, [radius, length, radius], role, parent);
    function group(name, pos, parent = doll) {const o = new T.Group(); o.name = name; o.position.set(...pos); parent.add(o); moving.push(o); return o;}
    function link(name, a, z, mat = mats.steel, radius = .035, parent = doll, role = 'mechanism') {
      const av = new T.Vector3(...a), bv = new T.Vector3(...z), o = rod(name, mat, av.clone().add(bv).multiplyScalar(.5).toArray(), radius, av.distanceTo(bv), role, parent);
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), bv.sub(av).normalize()); return o;
    }
    b('stage_wood_rim', mats.edge, [15, -.3, 3], [44, .65, 23], 'stage', stage);
    for (let i = 0; i < 4; i++) {
      b('tatami_mat_' + i, mats.tatami, [-1.5 + i * 11, .065, 3], [10.85, .15, 22], 'stage', stage);
      for (const x of [-6.95 + i * 11, 3.95 + i * 11]) b('tatami_hem_' + i + '_' + x, mats.border, [x, .15, 3], [.12, .025, 22], 'stage', stage);
    }
    const host = b('host_cushion', mats.border, [-3.5, .33, 0], [3, .35, 4], 'stage', stage);
    const guest = b('guest_cushion', mats.guest, [33, .33, 0], [3, .35, 4], 'stage', stage);
    for (const seat of [host, guest]) {const button = add(seat.name + '_tuft', sphere, mats.obi, [0, 0, 0], [.1, .035, .1], 'stage', stage); button.userData.seat = seat;}
    const route = new T.Group(); route.name = 'planned_route'; stage.add(route);
    const endMarker = rod('return_destination', mats.gold, [0, .18, 7.46], .25, .03, 'stage', stage);
    b('base_plate_5_5_sun', mats.wood, [1, 1.55, 0], [5.5, .18, 2.6], 'frame');
    for (const [x, z] of [[-1.25, -1.08], [2.9, -1.08], [-1.25, 1.08]]) {
      b('wood_pillar_' + x + '_' + z, mats.wood, [x, 3.2, z], [.18, 3.2, .18], 'frame');
      b('pillar_cap_' + x + '_' + z, mats.brass, [x, 4.8, z], [.3, .08, .3], 'frame');
    }
    b('middle_pillar', mats.wood, [-.85, 3.05, -.55], [.13, 2.9, .2], 'frame');
    b('upper_yoke', mats.wood, [.6, 4.9, -.3], [4.7, .17, 2.3], 'frame');
    function wheel(key, teeth, radius, pos, depth = .1) {
      const axis = group(key + '_axis', pos); wheels[key] = axis;
      const gear = add(key + '_teeth', gearGeometry(teeth, radius, depth), mats.brass, [0, 0, 0], [1, 1, 1], 'mechanism', axis); gear.userData.teeth = teeth;
      for (let i = 0; i < 4; i++) {const a = i * Math.PI / 2, o = b(key + '_spoke_' + i, mats.brass, [Math.cos(a) * radius * .35, Math.sin(a) * radius * .35, 0], [radius * .74, .07, depth], 'mechanism', axis); o.rotation.z = a;}
      const hub = rod(key + '_hub', mats.gold, [0, 0, 0], .15, depth + .12, 'mechanism', axis); hub.rotation.x = Math.PI / 2;
      const shaft = rod(key + '_shaft', mats.steel, pos, .055, 2.75); shaft.rotation.x = Math.PI / 2; return axis;
    }
    wheel('wheel1', 56, 1.65, [.9, 3.25, 0]);
    const camShape = new T.Shape();
    for (let i = 0; i <= 32; i++) {const a = (-32 + i * 2) * RAD, x = 1.48 * Math.cos(a), y = 1.48 * Math.sin(a); if (i) camShape.lineTo(x, y); else camShape.moveTo(x, y);}
    for (let i = 32; i >= 0; i--) {const a = (-32 + i * 2) * RAD; camShape.lineTo(.82 * Math.cos(a), .82 * Math.sin(a));} camShape.closePath();
    const cam = add('yukimodori_single_64_degree_plate', new T.ExtrudeGeometry(camShape, {depth: .085, bevelEnabled: false}), mats.gold, [0, 0, .11], [1, 1, 1], 'mechanism', wheels.wheel1);
    cam.userData.arc_degrees = 64; cam.rotation.z = Math.PI;
    const spring = group('whalebone_spring_axis', [.9, 3.25, -.35]);
    const springPoints = [];
    for (let i = 0; i <= 420; i++) {const a = i / 420 * TAU * 5.5, r = .20 + i / 420 * 1.25; springPoints.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));}
    add('whalebone_spiral', new T.TubeGeometry(new T.CatmullRomCurve3(springPoints), 420, .035, 4, false), mats.black, [0, 0, 0], [1, 1, 1], 'mechanism', spring);
    add('ratchet_retaining_ring', gearGeometry(18, .31, .12), mats.steel, [0, 0, -.07], [1, 1, 1], 'mechanism', spring);
    link('ratchet_pawl', [.28, 3.28, -.49], [.65, 3.58, -.49], mats.black, .055);
    wheel('wheel2', 56, 1, [0, 1.65, .63]);
    const pin2 = add('wheel2_8_tooth_pinion', gearGeometry(8, .23, .23), mats.steel, [0, 0, -.60], [1, 1, 1], 'mechanism', wheels.wheel2); pin2.userData.teeth = 8;
    // The rear axle is the common two-wheel drive axis and the origin of the specified path.
    const rearAssembly = group('rear_axle_drive', [0, 1.65, 0]); wheels.drive = rearAssembly;
    // A short illustrated axle coupling keeps the large drive wheels below the robe.
    link('rear_axle_coupling', [0, 1.65, -1.55], [0, 1.65, 1.55], mats.steel, .075);
    for (const z of [-1.55, 1.55]) {
      const d = rod('drive_wheel_3_sun_' + z, mats.wood, [0, 0, z], 1.5, .22, 'mechanism', rearAssembly); d.rotation.x = Math.PI / 2;
      add('drive_rim_' + z, new T.TorusGeometry(1.435, .065, 6, 48), mats.edge, [0, 0, z + Math.sign(z) * .12], [1, 1, 1], 'mechanism', rearAssembly);
      for (let i = 0; i < 6; i++) {const a = i * Math.PI / 3, o = b('drive_spoke_' + z + '_' + i, mats.edge, [Math.cos(a) * .6, Math.sin(a) * .6, z + Math.sign(z) * .13], [1.23, .055, .025], 'mechanism', rearAssembly); o.rotation.z = a;}
    }
    wheel('escape', 13, .5, [.95, 2.35, .63], .07);
    const escapeGear = parts.find(p => p.name === 'escape_teeth');
    escapeGear.geometry.dispose(); escapeGear.geometry = new T.TorusGeometry(.46, .038, 6, 39);
    for (let i = 0; i < 13; i++) {const a = i * TAU / 13, tooth = b('crown_13_tooth_' + i, mats.gold, [.46 * Math.cos(a), .46 * Math.sin(a), .11], [.075, .075, .19], 'mechanism', wheels.escape); tooth.rotation.z = a;}
    const pinE = add('escape_8_tooth_pinion', gearGeometry(8, .19, .23), mats.steel, [0, 0, -.02], [1, 1, 1], 'mechanism', wheels.escape); pinE.userData.teeth = 8;
    const foliot = group('bar_foliot', [.95, 4.22, .78]);
    b('foliot_bar', mats.black, [0, 0, 0], [.10, .09, 2.3], 'mechanism', foliot);
    rod('verge_shaft', mats.steel, [0, -1.15, 0], .04, 2.4, 'mechanism', foliot);
    for (const z of [-.92, .92]) b('foliot_weight_' + z, mats.brass, [0, 0, z], [.25, .24, .24], 'mechanism', foliot);
    for (const [side, y] of [[1, -1.57], [-1, -2.17]]) {
      link('pallet_reaching_arm_' + side, [0, y, 0], [side * .35, y, .16], mats.black, .032, foliot);
      b('verge_pallet_' + side, mats.black, [side * .35, y, .16], [.10, .10, .12], 'mechanism', foliot);
    }
    const steer = group('sakigake_steering_pivot', [3, 1.0, 0]);
    link('front_steering_crank', [0, .20, 0], [.25, .20, .45], mats.brass, .055, steer);
    b('front_fork_cross', mats.brass, [0, .1, 0], [.26, .16, 1.3], 'mechanism', steer);
    for (const z of [-.58, .58]) b('front_wheel_fork_' + z, mats.wood, [0, -.13, z], [.12, .65, .12], 'mechanism', steer);
    const frontWheel = group('front_wheel_rolling', [0, -.10, 0], steer); wheels.front = frontWheel;
    const fw = rod('sakigake_wheel', mats.wood, [0, 0, 0], .78, .95, 'mechanism', frontWheel); fw.rotation.x = Math.PI / 2;
    b('front_wheel_spoke', mats.brass, [0, 0, .49], [1.3, .07, .04], 'mechanism', frontWheel);
    const follower = group('cam_follower_lever', [2.45, 3.25, .25]);
    rod('cam_contact_roller', mats.steel, [0, 0, 0], .16, .19, 'mechanism', follower).rotation.x = Math.PI / 2;
    const followerArm = b('cam_follower_arm', mats.steel, [.18, -.45, 0], [.10, .95, .10], 'mechanism', follower); followerArm.rotation.z = .38;
    const steeringLink = link('steering_connecting_rod', [2.63, 2.8, .25], [3, 1.2, .25], mats.thread, .045);
    const hands = group('tea_hands_lever', [1.65, 4.7, 0]);
    for (const z of [-.94, .94]) {
      const arm = b('silk_sleeve_' + z, mats.cloth, [.02, -.26, z], [1.12, 1.3, 1.0], 'shell', hands); arm.rotation.z = -.16;
      add('hand_' + z, sphere, mats.skin, [.92, -.35, z * .70], [.30, .15, .20], 'interaction', hands);
      link('hand_lever_rod_' + z, [-.7, -.35, z * .7], [.8, -.35, z * .7], mats.wood, .055, hands);
    }
    const tray = rod('tea_tray_click_target', mats.tray, [1.15, -.25, 0], 1.05, .12, 'interaction', hands);
    const trayRim = add('tray_raised_rim', new T.TorusGeometry(1.01, .05, 6, 40), mats.gold, [1.15, -.19, 0], [1, 1, 1], 'interaction', hands); trayRim.rotation.x = Math.PI / 2;
    const cup = group('removable_tea_bowl', [1.15, -.18, 0], hands);
    const profile = [[.22, 0], [.24, .05], [.35, .09], [.46, .35], [.48, .51], [.43, .53], [.40, .35], [.25, .13], [.20, .08]].map(p => new T.Vector2(...p));
    add('ceramic_bowl', new T.LatheGeometry(profile, 32), mats.ceramic, [0, 0, 0], [1, 1, 1], 'interaction', cup);
    rod('tea_surface', mats.tea, [0, .36, 0], .405, .012, 'interaction', cup);
    rod('bowl_foot', mats.ceramic, [0, .025, 0], .24, .05, 'interaction', cup);
    const stopper = group('stopper_i_pivot', [.95, 4.22, 1.5]);
    b('stopper_i_arm', mats.thread, [0, 0, -.22], [.18, .13, .55], 'mechanism', stopper);
    b('stopper_i_contact', mats.black, [0, 0, -.48], [.24, .20, .13], 'mechanism', stopper);
    const cupLink = link('cup_weight_linkage', [1.1, 4.5, 1.0], [.95, 4.22, 1.5], mats.thread, .036);
    const head = group('head_bow_pivot', [.40, 5.35, 0]);
    rod('neck', mats.skin, [0, .08, 0], .22, .45, 'shell', head);
    add('gofun_child_head', sphere, mats.skin, [.05, .83, 0], [.65, .84, .62], 'shell', head);
    add('hair_back', sphere, mats.hair, [-.29, 1.04, 0], [.43, .60, .63], 'shell', head);
    add('hair_topknot', sphere, mats.hair, [-.10, 1.66, 0], [.25, .20, .23], 'shell', head);
    for (const z of [-.25, .25]) {
      add('eye_' + z, sphere, mats.hair, [.63, .93, z], [.026, .033, .065], 'shell', head);
      const brow = b('eyebrow_' + z, mats.hair, [.59, 1.08, z], [.035, .022, .20], 'shell', head); brow.rotation.y = z * .3;
      add('ear_' + z, sphere, mats.skin, [-.03, .76, Math.sign(z) * .61], [.16, .23, .10], 'shell', head);
    }
    add('small_nose', sphere, mats.skin, [.71, .76, 0], [.13, .14, .12], 'shell', head);
    b('mouth', mats.tray, [.67, .55, 0], [.025, .022, .17], 'shell', head);
    const robeGeo = new T.LatheGeometry([[1.85,1.30],[1.87,1.48],[1.60,2.4],[1.33,3.8],[1.50,4.55],[1.43,4.9],[.42,5.30]].map(p=>new T.Vector2(...p)),32);
    add('kimono_robe', robeGeo, mats.cloth, [.65, 0, 0], [1.45, 1, .83], 'shell');
    for (const z of [-.48, .48]) {const collar = b('crossed_collar_' + z, mats.lining, [1.32, 4.52, z], [.11, 1.18, .22], 'shell'); collar.rotation.x = Math.sign(z) * .45; collar.rotation.z = -.18;}
    const sash = rod('kimono_obi', mats.obi, [.55, 3.85, 0], 1.25, .40, 'shell'); sash.scale.z *= .91;
    for (const z of [-.64, .64]) {
      const leg = group('leg_pivot_' + z, [.45, 1.5, z]);
      b('ivory_sock_' + z, mats.lining, [0, -.58, 0], [.40, 1.10, .40], 'shell', leg);
      b('sandal_' + z, mats.edge, [.22, -1.12, 0], [.94, .16, .52], 'shell', leg);
      leg.userData.side = Math.sign(z);
    }
    const neckThread = link('neck_pulling_thread', [-.06, 5.47, -.10], [-.30, 2.02, -.10], mats.thread, .021);
    for (const o of [...parts, ...moving]) {
      o.userData.basePosition = o.position.toArray();
      if (o.isMesh) o.userData.originalMaterial = {opacity: o.material.opacity, transparent: o.material.transparent, depthWrite: o.material.depthWrite, visible: o.visible};
    }
    let inspection = 'overview', display = 'normal', explode = 0, current = null, geom = null, teeth = 56;
    function configure(g, wheelTeeth) {
      geom = g;
      if (teeth !== wheelTeeth) {const o = parts.find(p => p.name === 'wheel1_teeth'); o.geometry.dispose(); o.geometry = gearGeometry(wheelTeeth, 1.65, .1); o.userData.teeth = wheelTeeth; teeth = wheelTeeth;}
      for (const child of [...route.children]) {route.remove(child); child.geometry.dispose(); child.material.dispose();}
      const points = [];
      for (let i = 0; i <= 96; i++) {const p = E.pose(g.total * i / 96, g); points.push(new T.Vector3(p.x, .19, -p.y));}
      const line = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 128, .037, 4, false), mats.path.clone()); line.name = 'one_round_trip_route'; route.add(line);
      guest.position.x = g.fwd + 5.5; endMarker.position.z = 2 * g.radius;
      for (const p of parts.filter(p => p.userData.seat)) {const seat = p.userData.seat; p.position.set(seat.position.x, .53, seat.position.z);}
    }
    function update(s) {
      current = s;
      for (const o of [...parts, ...moving]) if (o.userData.role !== 'stage') o.position.fromArray(o.userData.basePosition);
      doll.position.set(s.x, 0, -s.y); doll.rotation.y = s.heading * RAD;
      wheels.wheel1.rotation.z = TAU * s.rev.wheel1;
      wheels.wheel2.rotation.z = TAU * s.rev.wheel2;
      wheels.escape.rotation.z = TAU * s.rev.escape;
      wheels.drive.rotation.z = TAU * s.rev.drive;
      wheels.front.rotation.z = TAU * s.rev.drive * 1.5 / .78;
      spring.rotation.z = TAU * s.rev.wheel1;
      steer.rotation.y = -s.steer_deg * RAD;
      head.rotation.z = -s.head_deg * RAD;
      moving.filter(o => o.userData.side).forEach(o => {o.rotation.z = o.userData.side * s.leg_deg * RAD;});
      hands.position.y = hands.userData.basePosition[1] + (s.cup ? -.20 : .17);
      cup.visible = s.cup;
      // Stopped motion keeps the exact oscillator phase at the instant the cup was lifted.
      foliot.rotation.y = .40 * Math.sin(TAU * s.osc);
      stopper.position.x = .95 + Math.sin(foliot.rotation.y) * 1.10;
      stopper.position.z = .78 + Math.cos(foliot.rotation.y) * 1.10 + .48 + (s.cup ? .55 : 0);
      stopper.rotation.x = s.cup ? -.42 : 0;
      const handAnchor = new T.Vector3(-.55, -.35, .70).add(hands.position), stopAnchor = stopper.position.clone();
      cupLink.position.copy(handAnchor).add(stopAnchor).multiplyScalar(.5);
      cupLink.scale.set(.036, handAnchor.distanceTo(stopAnchor), .036);
      cupLink.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), stopAnchor.sub(handAnchor).normalize());
      follower.rotation.z = s.steer_deg ? -.22 : 0;
      const camAnchor = new T.Vector3(0, -.5, 0).multiply(followerArm.scale).applyQuaternion(followerArm.quaternion).add(followerArm.position).applyEuler(follower.rotation).add(follower.position);
      const wheelAnchor = new T.Vector3(.25, .20, .45).applyEuler(steer.rotation).add(steer.position);
      steeringLink.position.copy(camAnchor).add(wheelAnchor).multiplyScalar(.5);
      steeringLink.scale.set(.045, camAnchor.distanceTo(wheelAnchor), .045);
      steeringLink.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), wheelAnchor.sub(camAnchor).normalize());
      const pull = new T.Vector3(-.06, .12, -.10).applyEuler(head.rotation).add(head.position), anchor = new T.Vector3(-.30, 2.02, -.10);
      neckThread.position.copy(pull).add(anchor).multiplyScalar(.5);
      neckThread.scale.set(.021, pull.distanceTo(anchor), .021);
      neckThread.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), anchor.sub(pull).normalize());
      neckThread.material.color.set(s.head_deg ? '#e3a34f' : '#b34932');
      for (const o of parts) {
        const base = o.userData.originalMaterial, wasTransparent = o.material.transparent;
        o.visible = base.visible; o.material.opacity = base.opacity; o.material.transparent = base.transparent; o.material.depthWrite = base.depthWrite;
        if (o.userData.role === 'shell') {
          if (display === 'cut') {o.material.opacity = .09; o.material.transparent = true; o.material.depthWrite = false;}
          if (display === 'mechanism') o.visible = false;
          if (explode) o.position.z += Math.sign(o.userData.basePosition[2] || 1) * explode * 2.6;
        }
        if (o.userData.role === 'mechanism' && display === 'normal') {
          let housing = o;
          while (housing && !['rear_axle_drive', 'sakigake_steering_pivot'].includes(housing.name)) housing = housing.parent;
          o.visible = !!housing;
        }
        if (o.userData.role === 'frame' && display === 'normal') o.visible = false;
        if (o.userData.role === 'frame' && display !== 'normal') {o.material.opacity = .12; o.material.transparent = true; o.material.depthWrite = false;}
        if (display !== 'normal' && inspection !== 'overview') {
          let axis = o; while (axis && !['wheel1_axis', 'rear_axle_drive'].includes(axis.name)) axis = axis.parent;
          if (axis && ((inspection === 'escapement' || inspection === 'stopper') || (inspection === 'cam' && axis.name === 'rear_axle_drive'))) {
            o.material.opacity = .10; o.material.transparent = true; o.material.depthWrite = false;
          }
        }
        if (wasTransparent !== o.material.transparent) o.material.needsUpdate = true;
      }
      for (const [key, axis] of Object.entries(wheels)) if (key !== 'front') axis.position.z += ({wheel1: .75, wheel2: 1.6, escape: 2.3, drive: -1.1}[key] || 0) * explode;
      spring.position.z -= explode * 1.25;
      head.position.y += explode * 1.4;
      foliot.position.y += explode * .6;
      root.updateMatrixWorld(true);
    }
    function setDisplay(mode, amount) {display = mode; explode = T.MathUtils.clamp(amount, 0, 1); if (current) update(current);}
    function setInspection(key) {inspection = key; if (current) update(current);}
    function fingerprint() {
      root.updateMatrixWorld(true);
      const rows = []; root.traverse(o => {if (o.isMesh) rows.push([o.name, o.visible, o.matrixWorld.toArray(), o.material.opacity, o.material.transparent, o.material.depthWrite, o.material.color.toArray()]);}); return JSON.stringify(rows);
    }
    function triangleCount() {let n = 0; root.traverse(o => {if (o.isMesh) n += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;}); return n;}
    function cameraPreset(key) {
      const views = {
        overview: {position: [36, 29, 37], target: [15, 1.2, 3], span: 54},
        stopper: {position: [7.0, 7.6, 9.5], target: [.85, 4.3, .5], span: 7.3},
        escapement: {position: [3.2, 8.8, 9.5], target: [.80, 3.15, .65], span: 5.7},
        cam: {position: [5.6, 4.4, 11.5], target: [.9, 2.8, .2], span: 7.8}
      };
      const v = views[key] || views.overview;
      if (key === 'overview') return {...v};
      doll.updateMatrixWorld(true);
      return {position: doll.localToWorld(new T.Vector3(...v.position)).toArray(), target: doll.localToWorld(new T.Vector3(...v.target)).toArray(), span: v.span};
    }
    function inspect() {
      root.updateMatrixWorld(true);
      const tube = route.children[0], position = tube.geometry.attributes.position, radial = tube.geometry.parameters.radialSegments;
      const offset = tube.geometry.parameters.tubularSegments * (radial + 1), routeEnd = new T.Vector3();
      for (let i = 0; i < radial; i++) routeEnd.add(new T.Vector3().fromBufferAttribute(position, offset + i));
      routeEnd.divideScalar(radial).applyMatrix4(tube.matrixWorld);
      return {world: doll.getWorldPosition(new T.Vector3()).toArray(), heading: doll.rotation.y / RAD,
        steer_deg: -steer.rotation.y / RAD, head_deg: -head.rotation.z / RAD,
        leg_deg: moving.find(o => o.userData.side === 1).rotation.z / RAD,
        angles: Object.fromEntries(['wheel1', 'wheel2', 'escape', 'drive'].map(k => [k, wheels[k].rotation.z])),
        foliot: foliot.rotation.y, hands_y: hands.position.y, stopper_z: stopper.position.z,
        cup: cup.visible, teeth, guest_x: guest.getWorldPosition(new T.Vector3()).x, routeEnd: routeEnd.toArray()};
    }
    configure(E.geometry({wheel1_teeth: 56, foliot_period_s: .06}), 56);
    return {THREE: T, root, doll, parts, wheels, canvases, textures, configure, update, setDisplay, setInspection, fingerprint, triangleCount, cameraPreset, inspect,
      pickables: [tray, ...cup.children], targets: {stopper: stopper, escapement: foliot, cam}, get state() {return current;}};
  }
  return {THREE: T, makeTextures, gearGeometry, createModel};
});
