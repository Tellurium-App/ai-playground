(function(root){
  'use strict';
  const T=root.ORRERY_THREE.THREE,K=root.OrreryKinematics,S=K.SPEC,cache=new Map();
  const palette={brass:['#c49a50',.88,.24],gold:['#e4bd70',.85,.19],bronze:['#775135',.82,.36],wood:['#382219',.08,.50],ebony:['#14171b',.22,.38],blue:['#163c77',.82,.22],ruby:['#a50939',.25,.17],ivory:['#e9dcc0',.08,.28],copper:['#8e3728',.72,.32],amber:['#f4ab35',.48,.23],mercury:['#9c9990',.3,.45],venus:['#c4a77b',.15,.40],earth:['#266b86',.24,.32],mars:['#b85b3b',.28,.45],jupiter:['#bf9775',.1,.4],saturn:['#c1ad7d',.1,.4],moon:['#b5b6b2',.15,.55],glass:['#b8dfef',.15,.08]};
  function cached(key,fn){if(!cache.has(key))cache.set(key,fn());return cache.get(key);}
  function annulus(ri,ro,h,start=0,sweep=K.TAU){
    return cached(['ann',ri,ro,h,start,sweep].join(':'),()=>{
      const profile=[[ri,-h/2],[ro,-h/2],[ro,h/2],[ri,h/2],[ri,-h/2]].map(a=>new T.Vector2(...a));
      const g=new T.LatheGeometry(profile,Math.max(12,Math.round(96*sweep/K.TAU)),start,sweep);
      if(sweep<K.TAU-.001){
        const pos=Array.from(g.attributes.position.array),ind=Array.from(g.index.array);
        for(const [j,a] of [start,start+sweep].entries()){
          const n=pos.length/3;for(const [r,y]of[[ri,-h/2],[ro,-h/2],[ro,h/2],[ri,h/2]])pos.push(r*Math.sin(a),y,r*Math.cos(a));
          j?ind.push(n,n+1,n+2,n,n+2,n+3):ind.push(n,n+2,n+1,n,n+3,n+2);
        }g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals();
      }return g;
    });
  }
  function gearGeometry(z,module,bore=null){
    return cached(`gear:${z}:${module}:${bore}`,()=>{
      const r=z*module/2,rb=r*Math.cos(K.rad(20)),ro=r+module*.85,rf=Math.max(module,r-module*1.15),base=Math.tan(K.rad(20))-K.rad(20),sh=new T.Shape();
      let first=true;
      function point(radius,a){const x=radius*Math.cos(a),y=-radius*Math.sin(a);first?(sh.moveTo(x,y),first=false):sh.lineTo(x,y);}
      // Five samples on each 20-degree involute flank; relieved radial roots.
      for(let i=0;i<z;i++){
        const a=K.TAU*i/z,half=Math.PI/(2*z),inv=rr=>{const t=Math.acos(Math.min(1,rb/Math.max(rb,rr)));return Math.tan(t)-t;};
        point(rf,a-half-base-.12/z);
        for(let j=0;j<=4;j++){const rr=Math.max(rb,rf)+(ro-Math.max(rb,rf))*j/4;point(rr,a-half-base+inv(rr));}
        for(let j=4;j>=0;j--){const rr=Math.max(rb,rf)+(ro-Math.max(rb,rf))*j/4;point(rr,a+half+base-inv(rr));}
        point(rf,a+half+base+.12/z);
      }sh.closePath();
      const hole=new T.Path();hole.absarc(0,0,bore===null?Math.min(r*.30,.075):bore,0,K.TAU,true);sh.holes.push(hole);
      const g=new T.ExtrudeGeometry(sh,{depth:module<.01?.027:.068,bevelEnabled:false,curveSegments:8,steps:1});
      g.rotateX(-Math.PI/2);g.translate(0,module<.01?-.0135:-.034,0);return g;
    });
  }
  function build(options={}){
    const model=new T.Group();model.name='GRAND_ORRERY_ARMILLARY';
    const materials=Object.fromEntries(Object.entries(palette).map(([name,[color,metalness,roughness]])=>[name,new T.MeshStandardMaterial({name,color,metalness,roughness})]));
    materials.amber.emissive.set('#ff8c21');materials.amber.emissiveIntensity=.42;
    materials.glass.transparent=true;materials.glass.opacity=.20;materials.glass.depthWrite=false;
    const dynamic=[],parts=[],batches=[],gearNodes={},planetNodes={},satelliteNodes=[],explodeNodes=[],front=[],edges=[],ghostGroups=[];
    let count=0,mode='exhibition',inspection='overview';
    function group(parent,name,explode=0){const g=new T.Group();g.name=name;parent.add(g);if(explode)explodeNodes.push({node:g,base:0,delta:explode});return g;}
    function mesh(parent,name,g,mat,pos=[0,0,0]){const m=new T.Mesh(g,typeof mat==='string'?materials[mat]:mat);m.name=name+'_'+count++;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);parts.push(m);return m;}
    function ring(parent,name,ri,ro,h,mat,pos=[0,0,0],axis='y',start=0,sweep=K.TAU){const o=mesh(parent,name,annulus(ri,ro,h,start,sweep),mat,pos);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o;}
    function cyl(parent,name,r,h,mat,pos=[0,0,0],axis='y',n=24){const o=mesh(parent,name,cached(`cyl:${r}:${h}:${n}`,()=>new T.CylinderGeometry(r,r,h,n)),mat,pos);if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;return o;}
    function box(parent,name,size,mat,pos=[0,0,0]){return mesh(parent,name,cached('box:'+size,()=>new T.BoxGeometry(...size)),mat,pos);}
    function sphere(parent,name,r,mat,pos=[0,0,0],major=false){return mesh(parent,name,cached(`sphere:${r}:${major}`,()=>new T.SphereGeometry(r,major?36:24,major?24:16)),mat,pos);}
    function tube(parent,name,points,r,mat){return mesh(parent,name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),28,r,6,false),mat);}
    function bar(parent,name,a,b,r,mat){const d=new T.Vector3(...b).sub(new T.Vector3(...a));const o=cyl(parent,name,r,d.length(),mat,new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray(), 'y',12);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
    function screw(parent,x,y,z,size=1){cyl(parent,'blued_screw',.044*size,.035*size,'blue',[x,y,z], 'y',12);box(parent,'screw_slot',[.055*size,.004,.008*size],'ebony',[x,y+.018*size,z]);}
    function jewel(parent,x,y,z,size=1,bore=null){const hole=bore===null?.025*size:bore,outer=Math.max(.047*size,hole+.018*size);ring(parent,'jewel_setting',hole,outer+.032*size,.025,'gold',[x,y,z]);ring(parent,'ruby_bearing',hole,outer,.027,'ruby',[x,y+.018,z]);}
    function movable(node,name){node.userData.motion=name;dynamic.push(node);return node;}
    const fixed=group(model,'walnut_plinth'),drum=group(model,'drum_rear'),drumFront=group(model,'drum_front'),cut=group(model,'copper_cut_faces');front.push(drumFront);edges.push(cut);
    cyl(fixed,'octagonal_step_base',4.05,.32,'ebony',[0,.28,0],'y',8);
    ring(fixed,'base_moulding',3.88,4.03,.07,'brass',[0,.48,0]);cyl(fixed,'walnut_step',3.83,.18,'wood',[0,.57,0],'y',96);
    for(let i=0;i<3;i++){const a=i*K.TAU/3;const x=3.5*Math.cos(a),z=3.5*Math.sin(a);sphere(fixed,'lion_foot',.24,'bronze',[x,.36,z]);ring(fixed,'foot_collar',.13,.25,.08,'gold',[x,.20,z]);}
    const start=-Math.PI/3,sweep=2*Math.PI/3;
    function splitRing(parentA,parentB,name,ri,ro,h,y,mat){ring(parentA,name+'_retained',ri,ro,h,mat,[0,y,0],'y',start+sweep,K.TAU-sweep);ring(parentB,name+'_window',ri,ro,h,mat,[0,y,0],'y',start,sweep);}
    function portRing(name,ri,ro,h,y,mat){
      const lo=3*Math.PI/2-.055,hi=3*Math.PI/2+.055,back=start+sweep;
      ring(drum,name+'_port_left',ri,ro,h,mat,[0,y,0],'y',back,lo-back);ring(drum,name+'_port_right',ri,ro,h,mat,[0,y,0],'y',hi,start+K.TAU-hi);
      ring(drumFront,name+'_window',ri,ro,h,mat,[0,y,0],'y',start,sweep);
    }
    splitRing(drum,drumFront,'walnut_drum_lower',3.49,3.65,.24,.82,'wood');
    portRing('walnut_drum_axle_port',3.49,3.65,.22,1.05,'wood');
    splitRing(drum,drumFront,'walnut_drum_upper',3.49,3.65,1.84,2.08,'wood');
    for(const y of [.72,.82,2.94,3.04])splitRing(drum,drumFront,'turned_brass_moulding',3.48,3.72,.065,y,'brass');
    for(let j=0;j<32;j++){const a=j*K.TAU/32,par=a<Math.PI/3||a>5*Math.PI/3?drumFront:drum;bar(par,'walnut_reed',[3.657*Math.sin(a),j===24?1.18:.89,3.657*Math.cos(a)],[3.657*Math.sin(a),2.85,3.657*Math.cos(a)],.012,j%4?'bronze':'brass');}
    ring(drum,'crank_port_bearing',.061,.13,.14,'brass',[-3.65,1.05,0],'x');
    for(const a of[start,start+sweep]){const o=box(cut,'copper_section_edge',[.17,2.34,.025],'copper',[3.57*Math.sin(a),1.85,3.57*Math.cos(a)]);o.rotation.y=a;}
    const glass=group(model,'sapphire_rear',S.explosion.glass),glassFront=group(model,'sapphire_front',S.explosion.glass);front.push(glassFront);
    splitRing(glass,glassFront,'sapphire_glass',.48,3.49,.055,3.18,'glass');splitRing(glass,glassFront,'dial_rim',3.47,3.72,.08,3.19,'gold');
    for(let j=0;j<120;j++){const a=j*K.TAU/120,par=(a<Math.PI/3||a>5*Math.PI/3)?glassFront:glass;const o=box(par,'calendar_division',[.012,.012,j%10===0?.15:.06],'ebony',[3.60*Math.sin(a),3.235,3.60*Math.cos(a)]);o.rotation.y=a;}
    for(let j=0;j<12;j++){const a=j*K.TAU/12;screw(fixed,3.7*Math.sin(a),.66,3.7*Math.cos(a),.7);}
    const bridgeGroups=[];
    for(let i=0;i<6;i++){
      const p=S.planets[i],g=group(model,p.id+'_gear_deck',i*S.explosion.gearStep);bridgeGroups.push(g);
      const axisSet=new Map();for(const d of K.TRAIN.gears.filter(d=>d.id.startsWith(p.id+'_')))axisSet.set(d.center.join(','),d.center);
      for(const [j,c]of[...axisSet.values()].entries()){
        // Short bearing pillars terminate at their own deck; no long idler shaft crosses another train.
        const centerAxis=Math.hypot(...c)<1e-9,mainAxis=Math.hypot(c[0]-S.mainCenter[0],c[1]-S.mainCenter[1])<1e-9;
        cyl(g,'stepped_pillar',.070,.20,'bronze',[c[0],p.gearY-.17,c[1]]);ring(g,'pillar_collar',.06,.10,.025,'gold',[c[0],p.gearY-.09,c[1]]);jewel(g,c[0],p.gearY+.11,c[1],.8,centerAxis?p.sleeveOuter+.003:mainAxis?.056:.046);
        for(const sign of[-1,1])screw(g,c[0]+sign*.13,p.gearY-.065,c[1],.65);
      }
      const centers=[...axisSet.values()];for(let j=1;j<centers.length;j++)bar(g,'skeleton_bridge',[centers[j-1][0],p.gearY-.23,centers[j-1][1]],[centers[j][0],p.gearY-.23,centers[j][1]],.032,'bronze');
      for(const d of K.TRAIN.gears.filter(d=>d.id.startsWith(p.id+'_'))){
        const rotor=movable(group(g,d.id),d.id);rotor.position.set(d.center[0],d.y,d.center[1]);gearNodes[d.id]=rotor;
        const output=d.id.endsWith('_output');
        mesh(rotor,d.id+'_involute',gearGeometry(d.teeth,d.module,output?p.sleeveInner:null),'brass');ring(rotor,'gear_hub',output?p.sleeveInner:d.id.endsWith('_driver')?.055:.045,output?p.sleeveOuter+.02:.11,.12,'gold');
        if(!output&&!d.id.endsWith('_driver'))cyl(rotor,'gear_bearing_spindle',.045,.30,'blue');
        for(let k=0;k<5;k++){const a=k*K.TAU/5;bar(rotor,'radial_gear_etch',[.12*Math.cos(a),.037,.12*Math.sin(a)],[(d.radius-.08)*Math.cos(a),.037,(d.radius-.08)*Math.sin(a)],.008,'bronze');}
      }
    }
    const main=movable(group(model,'main_drive_shaft'),'main');main.position.set(...[S.mainCenter[0],0,S.mainCenter[1]]);cyl(main,'main_shaft',.055,2.8,'blue',[0,1.73,0]);
    for(let j=0;j<12;j++)cyl(main,'shaft_flute',.008,2.5,'gold',[.057*Math.cos(j*K.TAU/12),1.8,.057*Math.sin(j*K.TAU/12)],'y',8);
    // Orthogonal 20:20 miter pitch cones share one apex, half-angles 45 degrees.
    const bevel=group(model,'miter_gearbox');bevel.position.set(S.mainCenter[0],1.05,S.mainCenter[1]);
    const bv=movable(group(bevel,'vertical_miter'),'bevel_vertical');
    mesh(bv,'miter_pitch_cone',new T.CylinderGeometry(.35,.12,.23,20),'brass',[0,.235,0]);
    for(let i=0;i<20;i++){const a=i*K.TAU/20;bar(bv,'miter_tooth',[.12*Math.cos(a),.12,.12*Math.sin(a)],[.35*Math.cos(a),.35,.35*Math.sin(a)],.023,'gold');}
    const crankRoot=group(bevel,'horizontal_crank_axis');crankRoot.rotation.z=Math.PI/2;
    const crank=movable(group(crankRoot,'crank_rotor'),'crank');
    mesh(crank,'horizontal_miter_cone',new T.CylinderGeometry(.35,.12,.23,20),'brass',[0,.235,0]);
    for(let i=0;i<20;i++){const a=i*K.TAU/20;bar(crank,'horizontal_miter_tooth',[.12*Math.cos(a),.12,.12*Math.sin(a)],[.35*Math.cos(a),.35,.35*Math.sin(a)],.023,'gold');}
    cyl(crank,'crank_horizontal_axle',.055,2.70,'blue',[0,1.35,0]);box(crank,'crank_web',[.30,.065,.09],'brass',[.13,2.70,0]);cyl(crank,'ivory_crank_grip',.095,.38,'ivory',[.26,2.90,0]);ring(crank,'grip_ferrule',.06,.103,.045,'gold',[.26,2.74,0]);
    const housing=group(bevel,'open_miter_housing');ring(housing,'miter_frame',.26,.30,.07,'bronze',[0,0,0],'z');
    const rod=group(model,'fixed_solar_axis');cyl(rod,'fixed_central_rod',.065,8.4,'blue',[0,4.7,0]);
    const arms=[];
    for(const [i,p]of S.planets.entries()){
      const stack=group(model,p.id+'_sleeve_deck',S.explosion.armBase+Math.min(4,6-i)*S.explosion.armStep),arm=movable(group(stack,p.id+'_arm'),p.id+'_orbit');planetNodes[p.id]=arm;arms.push({stack,arm,p});
      const len=p.armY-p.gearY;ring(arm,'hollow_nested_sleeve',p.sleeveInner,p.sleeveOuter,len,'brass',[0,(p.armY+p.gearY)/2,0]);
      for(const y of[p.gearY+.08,p.armY-.04,p.armY+.07])ring(arm,'stepped_sleeve_collar',p.sleeveInner,p.sleeveOuter+.035,.065,'gold',[0,y,0]);
      tube(arm,'swept_upper_arm',[[p.sleeveOuter,p.armY,0],[p.radius*.32,p.armY+.20,0],[p.radius*.70,p.armY+.19,0],[p.radius,p.armY+.13,0]],.033,'gold');
      tube(arm,'curved_truss_rail',[[p.sleeveOuter,p.armY-.04,0],[p.radius*.34,p.armY-.13,0],[p.radius*.75,p.armY-.05,0],[p.radius,p.armY+.13,0]],.022,'brass');
      for(let j=1;j<8;j++){const x=p.radius*j/8;bar(arm,'triangular_arm_web',[x,p.armY-.06,0],[Math.min(p.radius,x+p.radius/8),p.armY+.18,0],.012,'bronze');}
      cyl(arm,'planet_pedestal',.06,.32,'brass',[p.radius,p.armY+.22,0]);jewel(arm,p.radius,p.armY+.13,0,.7,.061);
      if(p.id!=='earth'){
        const globe=movable(group(arm,p.id+'_globe'),p.id+'_spin');globe.position.set(p.radius,p.armY+.40,0);sphere(globe,p.id+'_stone_sphere',p.size,p.id, [0,0,0],true);
        // Stone band inlays are shared meshes, not external image textures.
        for(let b=-2;b<=2;b++){const yy=p.size*b*.27,rr=Math.sqrt(p.size*p.size-yy*yy)*1.003;ring(globe,'stone_mineral_band',rr-.008,rr,.014,b%2?'bronze':'ivory',[0,yy,0]);}
        if(p.id==='saturn'){
          const rings=group(globe,'saturn_26_7_degree_rings');rings.rotation.z=K.rad(S.saturnTiltDeg);
          for(const [ri,ro,mat]of[[.34,.40,'bronze'],[.41,.55,'brass'],[.575,.69,'gold']])ring(rings,'saturn_C_B_A_ring',ri,ro,.012,mat);
          for(let r=.35;r<.69;r+=.017)if(r<.55||r>.575)ring(rings,'saturn_etched_groove',r,r+.003,.014,'bronze');
          const titan=movable(group(arm,'titan_orbit'),'titan');titan.position.set(p.radius,p.armY+.40,0);bar(titan,'titan_arm',[0,-.60,0],[.86,-.60,0],.009,'brass');bar(titan,'titan_ball_stem',[.86,-.60,0],[.86,0,0],.009,'brass');sphere(titan,'titan',.06,'venus',[.86,0,0]);satelliteNodes.push({node:titan,rate:S.titanTurnsPerYear});
        }
        if(p.id==='jupiter')for(let j=0;j<4;j++){
          const sat=movable(group(arm,'galilean_'+j),'galilean_'+j);sat.position.set(p.radius,p.armY+.40,0);const r=.42+j*.07,h=.39+j*.02;
          bar(sat,'galilean_mini_arm',[0,h,0],[r,h,0],.008,'brass');bar(sat,'galilean_ball_stem',[r,h,0],[r,0,0],.008,'brass');sphere(sat,['io','europa','ganymede','callisto'][j],.036+j*.005,'moon',[r,0,0]);satelliteNodes.push({node:sat,rate:S.galileanTurnsPerYear[j]});
        }
      }
    }
    const earthArm=planetNodes.earth,earthP=S.planets[2],tell=group(earthArm,'tellurion_gear_train');tell.position.y=S.tellurion.deckY;
    const tellNodes={};
    for(const d of K.TELLURION.gears){const g=movable(group(tell,d.id),d.id);g.position.set(d.center[0],d.y,d.center[1]);mesh(g,'tellurion_involute',gearGeometry(d.teeth,d.module,d.id==='parallel_0'?.075:null),'brass');cyl(g,'tellurion_blue_axle',.018,.24,'blue',d.id==='parallel_0'?[0,-.15,0]:[0,0,0]);tellNodes[d.id]=g;if(d.id!=='parallel_0'&&d.id!=='lunar_compound_A')jewel(tell,d.center[0],d.y+.07,d.center[1],.65,.019);}
    ring(tellNodes.parallel_0,'fixed_36_tooth_mount',.065,.090,.06,'gold');
    cyl(tellNodes.parallel_9,'lunar_driver_joined_shaft',.014,.26,'blue',[0,.10,0]);cyl(tellNodes.lunar_compound_A,'lunar_compound_joined_shaft',.012,.17,'blue',[0,.055,0]);
    for(const z of[-.22,.22])bar(earthArm,'tellurion_deck_stanchion',[earthP.radius,earthP.armY+.1,z],[earthP.radius,S.tellurion.deckY-.04,z],.018,'brass');
    const earthCarrier=movable(group(earthArm,'earth_parallel_carrier'),'earth_parallel_carrier');earthCarrier.position.set(earthP.radius,earthP.armY+S.tellurion.earthLift,0);
    bar(earthCarrier,'earth_axis_fork',[.30,-.80,.20],[.13,-.30,0],.018,'gold');
    const tilt=group(earthCarrier,'earth_23_44_axis');tilt.rotation.z=K.rad(S.tellurion.obliquityDeg);
    const globe=movable(group(tilt,'earth_sidereal_spin'),'earth_sidereal_spin');sphere(globe,'lapis_earth',earthP.size,'earth', [0,0,0],true);
    for(let j=0;j<7;j++){const a=j*2.399963;const o=sphere(globe,'jade_continent',.075,'brass',[.184*Math.cos(a),.11*Math.sin(j*1.4),.184*Math.sin(a)]);o.scale.set(1,.5,.65);}
    bar(tilt,'inclined_earth_axle',[0,-.33,0],[0,.34,0],.014,'gold');ring(tilt,'obliquity_protractor',.29,.31,.018,'brass',[0,0,0],'z');
    const moonPlane=group(earthCarrier,'lunar_plane_5_14');moonPlane.rotation.z=K.rad(S.tellurion.lunarInclinationDeg);ring(moonPlane,'lunar_inclined_track',.56,.575,.012,'bronze');
    const moon=movable(group(moonPlane,'moon_sidereal_orbit'),'moon');bar(moon,'moon_carrier_arm',[0,-.35,0],[S.tellurion.moonRadius,-.35,0],.009,'gold');bar(moon,'moon_ball_stem',[S.tellurion.moonRadius,-.35,0],[S.tellurion.moonRadius,0,0],.009,'gold');sphere(moon,'selenite_moon',.066,'moon',[S.tellurion.moonRadius,0,0]);
    cyl(tellNodes.lunar_output,'moon_output_spindle',.015,.18,'blue',[0,.07,0]);sphere(moonPlane,'lunar_universal_joint',.039,'brass',[0,-.35,0]);
    const sunDeck=group(model,'sun_deck',S.explosion.sun),sun=movable(group(sunDeck,'sun_corona'),'sun');sun.position.y=8.90;
    sphere(sun,'amber_solar_core',.48,'amber',[0,0,0],true);ring(sun,'solar_corona_frame',.57,.64,.035,'gold');
    for(let i=0;i<48;i++){const a=i*K.TAU/48;bar(sun,'corona_ray',[.62*Math.cos(a),0,.62*Math.sin(a)],[(i%2?.78:.90)*Math.cos(a),0,(i%2?.78:.90)*Math.sin(a)],.014,'gold');}
    const armillary=group(model,'armillary_exploded_assembly',S.explosion.armillary);ghostGroups.push(armillary);
    for(let j=0;j<3;j++){
      const a=j*K.TAU/3+.3,dir=[Math.cos(a),Math.sin(a)];
      tube(armillary,'classical_scroll_column',[[dir[0]*3.7,.8,dir[1]*3.7],[dir[0]*4.7,1.6,dir[1]*4.7],[dir[0]*6.65,3.1,dir[1]*6.65],[dir[0]*7.16,5.4,dir[1]*7.16],[dir[0]*7.05,7.05,dir[1]*7.05]],.065,'brass');
      for(const y of[2.6,4.4,6.6])sphere(armillary,'scroll_knuckle',.12,'gold',[dir[0]*(y<3?5.9:7.05),y,dir[1]*(y<3?5.9:7.05)]);
    }
    function instrumentRing(name,r,tiltX,tiltZ,width,divisions){
      const g=group(armillary,name);g.position.y=S.armillaryCenterY;g.rotation.set(tiltX,0,tiltZ);
      const gap=tiltX===Math.PI/2?.72:0;
      ring(g,name+'_engraved_band',r,r+width,.045,'brass',[0,0,0],'y',gap,K.TAU-2*gap);ring(g,name+'_rolled_edge',r-.018,r+.015,.065,'gold',[0,0,0],'y',gap,K.TAU-2*gap);ring(g,name+'_outer_edge',r+width-.015,r+width+.018,.065,'gold',[0,0,0],'y',gap,K.TAU-2*gap);
      for(let i=0;i<divisions;i++){const a=i*K.TAU/divisions;if(gap&&(a<gap||a>K.TAU-gap))continue;const major=i%(divisions/12)===0;const t=box(g,name+'_graduation',[major?.019:.009,.052,major?width*.85:width*.42],'ebony',[(r+width*.52)*Math.sin(a),.002,(r+width*.52)*Math.cos(a)]);t.rotation.y=a;}
      if(gap)for(const a of[gap,K.TAU-gap]){sphere(g,name+'_terminal_fitting',.085,'gold',[(r+width/2)*Math.sin(a),0,(r+width/2)*Math.cos(a)]);}
      return g;
    }
    const horizon=instrumentRing('horizon_360',7.05,0,0,.25,180);
    for(let i=0;i<360;i++){const a=i*K.TAU/360;cyl(horizon,'degree_pin',i%30===0?.022:.011,i%30===0?.13:.055,'gold',[7.35*Math.sin(a),.035,7.35*Math.cos(a)],'y',8);}
    instrumentRing('meridian_latitude',6.80,Math.PI/2,0,.17,90);
    instrumentRing('equatorial_23_44',6.98,0,K.rad(23.44),.13,36);
    instrumentRing('solstice_colure',6.87,Math.PI/2,Math.PI/2,.075,36);
    const ecliptic=instrumentRing('ecliptic_zodiac_band',7.38,0,K.rad(-23.44),.34,180);
    for(let i=0;i<12;i++){
      const a=i*K.TAU/12;screw(ecliptic,7.55*Math.sin(a),.055,7.55*Math.cos(a),.95);
      const q=group(ecliptic,'zodiac_open_frame_'+i);q.rotation.y=a;
      // Twelve pierced arch frames, with each bay kept open to the interior exhibit.
      tube(q,'zodiac_arch',[[0,.04,7.45],[.21,.18,7.49],[.45,.04,7.52]],.014,'gold');
      for(let k=0;k<3;k++)sphere(q,'constellation_stud',.022,'ivory',[.10+k*.10,.08+Math.sin(k*2+i)*.05,7.56]);
    }
    for(let i=0;i<4;i++){const a=i*Math.PI/2;const plate=box(horizon,'cardinal_plate',[.35,.035,.22],'gold',[7.20*Math.sin(a),.09,7.20*Math.cos(a)]);plate.rotation.y=a;}
    // Small engraved strokes are geometry in both renderers; no font/network dependency.
    const strokes={A:[[[0,0],[.5,1],[1,0]],[[.2,.4],[.8,.4]]],G:[[[1,.8],[.8,1],[.2,1],[0,.8],[0,.2],[.2,0],[1,0],[1,.45],[.55,.45]]],R:[[[0,0],[0,1],[.8,1],[1,.8],[1,.6],[.8,.5],[0,.5]],[[.5,.5],[1,0]]],N:[[[0,0],[0,1],[1,0],[1,1]]],D:[[[0,0],[0,1],[.7,1],[1,.75],[1,.25],[.7,0],[0,0]]],O:[[[.2,0],[0,.2],[0,.8],[.2,1],[.8,1],[1,.8],[1,.2],[.8,0],[.2,0]]],E:[[[1,1],[0,1],[0,0],[1,0]],[[0,.5],[.8,.5]]],Y:[[[0,1],[.5,.5],[1,1]],[[.5,.5],[.5,0]]],M:[[[0,0],[0,1],[.5,.4],[1,1],[1,0]]],I:[[[.5,0],[.5,1]]],L:[[[0,1],[0,0],[1,0]]],' ' :[]};
    box(drumFront,'engraved_nameplate',[2.38,.64,.055],'gold',[0,1.70,3.65]);
    for(const [line,text]of['GRAND ORRERY','ARMILLARY'].entries())for(const [i,ch]of[...text].entries())for(const poly of strokes[ch]||[])for(let j=1;j<poly.length;j++){
      const aa=poly[j-1],bb=poly[j],x=-1.02+i*.178;bar(drumFront,'plaque_engraving',[x+aa[0]*.11,1.82-line*.26+aa[1]*.15,3.684],[x+bb[0]*.11,1.82-line*.26+bb[1]*.15,3.684],.0035,'ebony');
    }
    function batch(parent){
      for(const child of [...parent.children])if(child.isGroup)batch(child);
      const leaves=parent.children.filter(c=>c.isMesh),byMat=new Map();
      for(const p of leaves){if(!byMat.has(p.material))byMat.set(p.material,[]);byMat.get(p.material).push(p);}
      for(const [mat,items]of byMat){
        if(items.length<2)continue;
        const positions=[],normals=[],refs=[];
        for(const p of items){p.updateMatrix();const g=p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone();g.applyMatrix4(p.matrix);
          const start=positions.length/3;positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);refs.push({source:p,vertexStart:start,localMatrix:p.matrix.clone()});g.dispose();parent.remove(p);
        }
        const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
        const b=new T.Mesh(g,mat);b.name=parent.name+'_batch_'+mat.name;b.castShadow=true;b.receiveShadow=true;b.userData.sources=refs.map(r=>r.source.name);parent.add(b);batches.push({mesh:b,refs});
      }
    }
    if(!options.export)batch(model);
    const materialState=new Map();model.traverse(o=>{if(o.isMesh&&!materialState.has(o.material))materialState.set(o.material,{opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite});});
    const originalMaterials=new Map();model.traverse(o=>{if(o.isMesh)originalMaterials.set(o,o.material);});
    const ghosts=new Map();
    function ghost(node,opacity){node.traverse(o=>{if(!o.isMesh)return;const original=originalMaterials.get(o);let variants=ghosts.get(original);if(!variants){variants=new Map();ghosts.set(original,variants);}let m=variants.get(opacity);if(!m){m=original.clone();m.transparent=true;m.depthWrite=false;m.opacity=opacity;variants.set(opacity,m);}o.material=m;o.castShadow=false;});}
    function applyMode(){
      for(const [o,m]of originalMaterials){o.material=m;o.castShadow=true;}
      for(const g of front)g.visible=mode!=='cutaway';for(const g of edges)g.visible=mode==='cutaway';
      if(mode==='focus')ghost(armillary,.05);else if(inspection==='earth')ghost(armillary,.035);
      if(inspection==='gears'){ghost(armillary,.025);ghost(drum,.08);ghost(glass,.08);ghost(glassFront,.08);ghost(cut,.08);}
    }
    function update(years,explode=0){
      const state=K.solve(years),e=Math.max(0,Math.min(1,explode));
      for(const d of explodeNodes)d.node.position.y=d.base+d.delta*e;
      for(const [id,g]of Object.entries(gearNodes))g.rotation.y=state.gears[id];
      main.rotation.y=state.theta;bv.rotation.y=state.theta;crank.rotation.y=-state.crank;
      for(const a of arms)a.arm.rotation.y=state.planets.find(p=>p.id===a.p.id).angle;
      for(const [id,g]of Object.entries(tellNodes))g.rotation.y=state.tellurion[id];
      earthCarrier.rotation.y=state.earthCarrier;globe.rotation.y=state.earthSpin;moon.rotation.y=state.moonAngle;
      for(const d of satelliteNodes)d.node.rotation.y=state.theta*d.rate;
      // Saturn's etched rings retain their tilt direction; decorative planetary spin is slow.
      for(const p of S.planets){const g=planetNodes[p.id].children.find(g=>g.name===p.id+'_globe');if(g)g.rotation.y=p.id==='saturn'?0:state.theta*S.decorativePlanetSpinRatio;}
      sun.rotation.y=state.theta*S.sunSpinRatio;model.updateMatrixWorld(true);return state;
    }
    function setMode(m){if(!['exhibition','cutaway','focus'].includes(m))throw Error('Unknown mode');mode=m;applyMode();}
    function setInspection(value){inspection=value;applyMode();}
    function earthPosition(){return earthCarrier.getWorldPosition(new T.Vector3());}
    function stats(){return{components:count,movingAssemblies:dynamic.length,batches:batches.length,gears:K.TRAIN.gears.length+K.TELLURION.gears.length};}
    applyMode();update(S.renderYear);
    return {model,materials,dynamic,parts,batches,gearNodes,planetNodes,tellNodes,earthCarrier,tilt,globe,moon,crank,bv,main,armillary,arms,front,edges,explodeNodes,update,setMode,setInspection,earthPosition,stats};
  }
  const api={build,annulus,gearGeometry,palette};root.OrreryBuilder=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
