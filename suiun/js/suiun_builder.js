(function(root,factory){if(typeof module==='object'&&module.exports){require('../vendor/three-studio.bundle.js');module.exports=factory(globalThis.SuiunStudio.THREE);}else root.SuiunBuilder=factory(root.SuiunStudio.THREE);}(globalThis,function(THREE){
  'use strict';
  const TAU=2*Math.PI, RAD=Math.PI/180, RECEIVING_ANGLE=Math.PI/9, WHEEL_RADIUS=5.5, BUCKET_Z=-.95;
  const receivingX=WHEEL_RADIUS*Math.cos(RECEIVING_ANGLE),receivingY=WHEEL_RADIUS*Math.sin(RECEIVING_ANGLE);
  const PRESETS={overview:{position:[28,23,33],target:[1,12,0]},escapement:{position:[13.2,23,-19],target:[7.2,6.6,-2.5]},geartrain:{position:[22,19,-30],target:[1.7,13,0]},pagoda:{position:[11,11,20],target:[0,6.8,4.4]},astronomy:{position:[14,22,17],target:[0,19.5,0]}};
  function makeTextures(){
    if(typeof document==='undefined')return {};
    const out={};for(const name of ['wood','bronze']){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,w=Math.sin(x*.26+Math.sin(y*.031)*2)*.08+Math.sin(x*.81+y*.017)*.025,v=name==='wood'?.73+w:.78+.05*Math.sin(x*.11)*Math.sin(y*.13);im.data[i]=255*v;im.data[i+1]=255*(v-(name==='wood'?.07:.01));im.data[i+2]=255*(v-(name==='wood'?.16:.04));im.data[i+3]=255;}ctx.putImageData(im,0,0);out[name]=c;}return out;
  }
  function createModel(options={}) {
    const root=new THREE.Group();root.name='water_driven_tower';const parts={},exterior=[],assemblies=[],cups=[],jacks=[],doors=[],materialCache={},geos=new Map();
    const textures=options.textures===false?{}:makeTextures();
    const maps=Object.fromEntries(Object.entries(textures).map(([n,c])=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return [n,t];}));
    function mat(name,color,metalness=.1,roughness=.55,atlas=null){const m=new THREE.MeshStandardMaterial({name,color,metalness,roughness,map:maps[atlas]||null});m.userData.atlas=atlas;materialCache[name]=m;return m;}
    const m={wood:mat('aged_cypress',0x8a5734,.05,.72,'wood'),red:mat('vermilion_lacquer',0x8b3124,.15,.4,'wood'),dark:mat('dark_joinery',0x382b23,.05,.7,'wood'),bronze:mat('patinated_bronze',0x657466,.72,.35,'bronze'),gold:mat('brass_scales',0xc6a061,.72,.32,'bronze'),iron:mat('wrought_iron',0x353e3c,.65,.48),paper:mat('ivory_tablets',0xe8d6ae,.05,.8),water:mat('blue_water',0x258eaa,.25,.22),stone:mat('sandstone',0x9e967c,.05,.9),scarlet:mat('scarlet_robes',0xb83e30,.03,.73),green:mat('green_robes',0x416b4b,.03,.73),purple:mat('violet_robes',0x745575,.03,.73),skin:mat('carved_faces',0xd4ae78,.03,.7)};
    const G=(key,fn)=>{if(!geos.has(key))geos.set(key,fn());return geos.get(key);};
    const box=G('box',()=>new THREE.BoxGeometry(1,1,1));
    const cyl=G('cylinder',()=>new THREE.CylinderGeometry(1,1,1,12));
    const sphere=G('sphere',()=>new THREE.SphereGeometry(1,12,8));
    function group(name,parent=root,pos=[0,0,0],explode=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.fromArray(pos);parent.add(g);parts[name]=g;if(explode.some(Boolean))assemblies.push({g,base:g.position.clone(),delta:new THREE.Vector3(...explode)});return g;}
    function mesh(name,geo,material,parent=root,pos=[0,0,0],scale=[1,1,1],role='mechanism'){const o=new THREE.Mesh(geo,material);o.name=name;o.position.fromArray(pos);o.scale.fromArray(scale);o.userData.role=role;o.castShadow=o.receiveShadow=true;parent.add(o);parts[name]=o;if(['shell','roof','frame'].includes(role))exterior.push(o);return o;}
    const block=(name,pos,size,material=m.wood,parent=root,role='mechanism')=>mesh(name,box,material,parent,pos,size,role);
    const rod=(name,pos,r,h,material=m.iron,parent=root)=>mesh(name,cyl,material,parent,pos,[r,h,r]);
    function beam(name,a,b,r,material=m.iron,parent=root){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av),o=rod(name,av.add(bv).multiplyScalar(.5).toArray(),r,d.length(),material,parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
    function ring(name,r,t,parent=root,material=m.bronze,pos=[0,0,0]){return mesh(name,G('torus'+r+':'+t,()=>new THREE.TorusGeometry(r,t,5,64)),material,parent,pos);}
    function gear(name,r,teeth,pos,parent=root){const g=group(name,parent,pos);rod(name+'_disk',[0,0,0],r,.12,m.bronze,g);const ringMesh=ring(name+'_rim',r,.065,g,m.gold);ringMesh.rotation.x=Math.PI/2;
      const key='teeth'+r+':'+teeth,geo=G(key,()=>{const positions=[],normals=[],uv=[],indices=[];for(let i=0;i<teeth;i++){const a=i/teeth*TAU,temp=box.clone();temp.scale(Math.max(.018,r*TAU/teeth*.6),.18,.12);temp.rotateY(-a);temp.translate(Math.cos(a)*(r+.045),0,Math.sin(a)*(r+.045));const offset=positions.length/3;positions.push(...temp.attributes.position.array);normals.push(...temp.attributes.normal.array);uv.push(...temp.attributes.uv.array);indices.push(...Array.from(temp.index.array,v=>v+offset));temp.dispose();}const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));merged.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));merged.setIndex(indices);return merged;});
      const toothMesh=mesh(name+'_teeth',geo,m.gold,g);toothMesh.userData.teeth=teeth;g.userData.teeth=teeth;return g;}
    function trough(name,pos,length,width,height,parent=root,material=m.bronze){const g=group(name,parent,pos);block(name+'_base',[0,.06,0],[length,.12,width],material,g);block(name+'_left',[-length/2,.5*height,0],[.1,height,width],material,g);block(name+'_right',[length/2,.5*height,0],[.1,height,width],material,g);block(name+'_front',[0,.5*height,width/2],[length,height,.08],material,g);block(name+'_back',[0,.5*height,-width/2],[length,height,.08],material,g);return g;}
    block('stone_plinth',[1,-.15,0],[24,.6,15],m.stone);
    const building=group('timber_tower',root,[0,0,0],[0,0,0]);
    for(const y of [.6,13.3,20.1])block('platform_'+y,[0,y,0],[8.6,.28,8.4],m.wood,building,y===.6?'mechanism':'frame');
    for(const x of [-4,4])for(const z of [-3.7,3.7]){
      block('column_'+x+'_'+z,[x,10.3,z],[.36,19.4,.36],m.red,building,'frame');
      for(const y of [12.7,19.6]){block('capital_'+x+z+y,[x,y,z],[.9,.28,.9],m.dark,building,'frame');block('bracket_'+x+z+y,[x,y-.3,z],[1.3,.24,.5],m.red,building,'frame');}
    }
    for(const y of [3,7,11,14.4,19]){block('rear_crossbeam_'+y,[0,y,-3.7],[8.4,.22,.28],m.dark,building,'frame');}
    block('west_boardwall',[-4,6.8,0],[.14,12.3,7],m.wood,building,'shell');
    for(const y of [14,19]){block('gallery_rail_'+y,[0,y,3.9],[8.5,.14,.15],m.red,building,'frame');for(let x=-3.5;x<=3.5;x+=1)block('baluster_'+y+'_'+x,[x,y-.3,3.9],[.1,.8,.1],m.red,building,'frame');}
    const roof=group('removable_plank_canopy',root,[0,26.2,0],[0,7,0]);
    for(let i=0;i<14;i++)block('canopy_plank_'+i,[-4.7+i*.72,0,0],[.69,.14,9.8],m.dark,roof,'roof');
    for(const x of [-3.6,3.6])for(const z of [-3.3,3.3])block('canopy_post_'+x+z,[x,23.2,z],[.18,6,.18],m.red,building,'roof');
    // North-east waterwheel: double spokes, three rims, one open vessel per interval.
    const wheelBase=group('escapement_assembly',root,[5.2,6.4,-2],[4,0,-2]);
    const shulun=group('shulun',wheelBase);block('iron_square_axle',[0,0,0],[.18,.18,5.9],m.iron,wheelBase);
    for(const z of [-.42,0,.42])ring('triple_rim_'+z,5.5,.105,shulun,m.wood,[0,0,z]);
    for(const x of [-.8,.8])block('axle_bearing_'+x,[0,-.4,x],[.7,.8,.5],m.dark,wheelBase);
    const activeVessel=group('active_vessel',wheelBase,[receivingX,receivingY,BUCKET_Z]);
    const water=block('active_blue_surface',[0,.15,0],[.86,.025,.36],m.water,activeVessel);
    const activeWaterBody=block('active_water_body',[0,.12,0],[.86,0,.36],m.water,activeVessel);
    const bucketGeo=[];let bucketCount=0;
    function configure(g){if(bucketCount===g.buckets)return;bucketCount=g.buckets;
      for(const o of bucketGeo)shulun.remove(o);bucketGeo.length=0;cups.length=0;
      for(let i=0;i<bucketCount;i++){const a=RECEIVING_ANGLE+i/bucketCount*TAU;
        for(const z of [-.32,.32]){const o=beam('double_spoke_'+i+'_'+z,[0,0,z],[Math.cos(a)*5.5,Math.sin(a)*5.5,z],.055,m.wood,shulun);bucketGeo.push(o);}
        const bracket=block('bucket_mount_'+i,[Math.cos(a)*5.5,Math.sin(a)*5.5,-.65],[.12,.12,.7],m.iron,shulun);bucketGeo.push(bracket);
        const p=trough('receiving_bucket_'+i,[Math.cos(a)*5.5,Math.sin(a)*5.5,BUCKET_Z],1,.5,.4,shulun,m.bronze);cups.push(p);bucketGeo.push(p);
        p.userData.cutWalls=[parts[p.name+'_front'],parts[p.name+'_back']];
        p.userData.water=block('bucket_water_'+i,[0,.12,0],[.86,0,.36],m.water,p);
        p.userData.level=0;p.userData.distance=0;
        block('iron_trip_tooth_'+i,[.55,.2,0],[.15,.1,.15],m.iron,p);
      }
    }
    const gecha=group('gecha',wheelBase,[6.45,1.8,BUCKET_Z]);
    block('pivot_balance',[.2,0,0],[1.2,.14,.2],m.iron,gecha);rod('pivot_counterweight',[.85,0,0],.23,.38,m.gold,gecha);
    for(const z of [-.65,.65])block('fork_prong_'+z,[-.85,0,z],[1.5,.12,.1],m.iron,gecha);
    block('fork_heel',[-.1,0,0],[.15,.12,1.4],m.iron,gecha);
    const forkTip=block('fork_tip',[-1.55,0,0],[.18,.12,1.42],m.gold,gecha);
    const tianheng=group('tianheng',wheelBase,[3.5,6.1,-.65]);
    block('upper_balance',[.45,0,0],[3.7,.15,.2],m.iron,tianheng);rod('tail_weight',[-1.15,0,0],.28,.45,m.gold,tianheng);
    const headTip=block('tianheng_tip',[2.25,0,0],[.22,.22,.3],m.gold,tianheng);
    const tongue=group('contact_tongue',wheelBase,[4.4,1.98,-.65]);
    block('tongue_head',[.6,0,0],[1.65,.12,.22],m.gold,tongue);
    beam('tongue_contact_nose',[1.35,0,0],[1.35,0,-.3],.055,m.gold,tongue);
    const lowerPin=rod('tongue_link_pin',[1.35,0,0],.09,.3,m.iron,tongue);lowerPin.rotation.x=Math.PI/2;
    const pull=rod('vertical_iron_knee',[0,0,0],.055,1,m.iron,wheelBase);
    const leftLock=group('left_lock',wheelBase,[2.5,6.05,-.8]);
    beam('left_latch',[0,0,0],[-.65,-.9,.35],.095,m.gold,leftLock);
    const leftTip=block('left_lock_tip',[-.65,-.9,.35],[.32,.16,.55],m.gold,leftLock);
    const lockPin=rod('left_lock_pull_pin',[.2,.15,0],.075,.28,m.iron,leftLock);lockPin.rotation.x=Math.PI/2;
    const lockLink=rod('balance_lock_link',[0,0,0],.028,1,m.iron,wheelBase);
    const rightLock=group('right_lock',wheelBase,[-.55,6.05,-.8]);
    beam('anti_reverse_latch',[0,0,0],[-.4,-.63,.35],.095,m.iron,rightLock);
    const rightTip=block('right_lock_tip',[-.4,-.63,.35],[.32,.16,.55],m.gold,rightLock);
    for(const x of [-.7,6.6])block('balance_stand_'+x,[x,.2,.65],[.15,12,.15],m.red,wheelBase,'frame');
    block('upper_escapement_beam',[2.95,6.3,.65],[7.7,.2,.26],m.dark,wheelBase);
    for(const [name,x,y,z]of [['fork_bearing',6.45,1.8,BUCKET_Z],['balance_bearing',3.5,6.1,-.65],['left_lock_bearing',2.5,6.05,-.8],['right_lock_bearing',-.55,6.05,-.8]]){
      beam(name,[x,y,.65],[x,y,z],.075,m.bronze,wheelBase);
    }
    const drain=trough('drain_trough',[5.2,.35,-2.65],11.4,1.9,.5);
    block('drain_water',[0,.23,0],[11.1,.025,1.6],m.water,drain);
    const tanks=group('water_supply',root,[12.2,0,-1.4],[5,0,-2]);
    for(const x of [-1.05,1.05])for(const z of [-.8,.8])block('tank_wooden_rack_'+x+z,[x,4.5,z],[.16,8.4,.16],m.wood,tanks);
    block('tank_rack_beam',[0,8.72,0],[2.6,.16,2.1],m.wood,tanks);
    const balanceTank=trough('constant_head_tank',[0,8.8,0],2.4,2,.9,tanks);block('constant_head_water',[0,.68,0],[2.2,.04,1.8],m.water,balanceTank);
    const pond=trough('upper_reservoir',[0,10.7,0],2.7,2.4,1,tanks);block('reservoir_surface',[0,.8,0],[2.5,.03,2.2],m.water,pond);
    beam('overflow_pipe',[0,10.8,0],[0,9.6,0],.12,m.bronze,tanks);
    const spoutX=5.2+receivingX-12.2;
    beam('raven_spout',[-1.2,8.93,-.5],[spoutX,8.93,-1.67],.085,m.bronze,tanks);
    const spoutTip=group('spout_outlet',tanks,[spoutX,8.93,-1.67]);
    const inflow=rod('inflow_water',[0,0,0],.045,1,m.water,wheelBase);
    const spill=rod('spill_water',[0,-5.6,0],.065,.5,m.water,wheelBase);
    // Ground hub, vertical pillar and eight stacked wheels share a single drive.
    const train=group('transmission_train',root,[0,0,0],[-2,0,-3]);
    const ground=gear('ground_hub',.8,24,[5.2,6.4,.8],train);ground.rotation.x=Math.PI/2;
    beam('ground_cross_shaft',[5.2,6.4,.8],[4.2,6.4,0],.12,m.iron,train);
    const tianzhu=group('tianzhu',train,[4.2,15.5,0]);rod('vertical_pillar',[0,0,0],.14,19.5,m.iron,tianzhu);
    for(const y of [-9.1,-4.65,9.1])gear('pillar_wheel_'+y,.85,24,[0,y,0],tianzhu);
    const jilun=group('jilun',train,[0,0,0]);rod('eight_wheel_axle',[0,7.5,0],.17,12.4,m.iron,jilun);
    const wheelRadii=[1.9,3.35,3.35,3.65,3.6,3.35,4,3.35];
    wheelRadii.forEach((r,i)=>{const y=12.3-i*1.45;gear('stacked_wheel_'+i,r,i<=1?600:36,[0,y,0],jilun);for(let j=0;j<8;j++){const a=j/8*TAU;beam('wheel_spoke_'+i+'_'+j,[0,y,0],[r*Math.cos(a),y,r*Math.sin(a)],.05,m.wood,jilun);}});
    const skyhub=gear('upper_sky_hub',1.3,48,[0,24.6,0],train);
    beam('sky_cross_shaft',[0,24.6,0],[4.2,24.6,0],.1,m.iron,train);
    rod('celestial_globe_axis',[0,14.4,0],.11,4.2,m.iron,train);
    const celestial=group('celestial_assembly',root,[0,0,0],[0,4,0]);
    const chest=trough('wooden_globe_chest',[0,13.5,0],5.2,5.2,2.2,celestial,m.wood);
    const hunxiang=group('hunxiang',celestial,[0,15.7,0]);
    mesh('celestial_globe',G('globe',()=>new THREE.SphereGeometry(2.2825,32,20)),m.bronze,hunxiang);
    const eq=ring('globe_equator',2.3,.035,hunxiang,m.gold);eq.rotation.x=Math.PI/2;
    const ecl=ring('globe_ecliptic',2.31,.045,hunxiang,m.gold);ecl.rotation.x=Math.PI/2-.41;
    for(let j=0;j<92;j++){const a=j*2.39996323,v=1-2*(j+.5)/92,r=Math.sqrt(1-v*v);mesh('star_'+j,G('star',()=>new THREE.OctahedronGeometry(1)),m.gold,hunxiang,[2.29*r*Math.cos(a),2.29*v,2.29*r*Math.sin(a)],[.035,.035,.035]);}
    const instrument=group('roof_instrument',celestial,[0,22.8,0]);
    for(const x of [-1.9,1.9])for(const z of [-1.2,1.2]){rod('dragon_column_'+x+z,[x,-1.1,z],.13,2.2,m.bronze,instrument);mesh('dragon_head_'+x+z,sphere,m.gold,instrument,[x,-.15,z],[.24,.17,.3]);block('water_foot_'+x+z,[x,-2.15,z],[.7,.22,.7],m.bronze,instrument);}
    block('gnomon_base',[0,-2.25,0],[4.7,.18,3.5],m.stone,instrument);
    for(const a of [0,Math.PI/2]){const r=ring('fixed_liuhe_'+a,2.5,.09,instrument,m.bronze);r.rotation.y=a;}
    const horizon=ring('fixed_horizon',2.55,.1,instrument,m.gold);horizon.rotation.x=Math.PI/2;
    const hunyi=group('hunyi',instrument);hunyi.rotation.z=.6;
    ring('moving_sanchen',2.2,.075,hunyi,m.gold);const orbit=ring('heaven_motion_ring',2.3,.07,hunyi,m.bronze);orbit.rotation.y=Math.PI/2;
    const sight=group('siyou_sight',hunyi);ring('siyou_ring',1.9,.065,sight,m.gold).rotation.x=.65;const tube=rod('sighting_tube',[0,0,0],.11,4,m.bronze,sight);tube.rotation.z=Math.PI/2;
    for(let i=0;i<60;i++){const a=i/60*TAU;const tick=block('graduation_'+i,[2.5*Math.cos(a),2.5*Math.sin(a),.02],[.07,.025,.035],m.gold,instrument);tick.rotation.z=a;}
    // Five-tier facade: three musical gates, two moving tablet gates, two static night tiers.
    const pagoda=group('five_tier_pagoda',root,[0,0,4.5],[0,0,5]);
    function figure(name,pos,color,type,level){const g=group(name,pagoda,pos);mesh(name+'_robe',G('robe',()=>new THREE.CylinderGeometry(.15,.3,.65,10)),color,g,[0,.6,0]);mesh(name+'_face',sphere,m.skin,g,[0,1.06,0],[.17,.21,.17]);block(name+'_hat',[0,1.27,0],[.43,.12,.3],m.dark,g);const arm=group(name+'_arm',g,[.2,.85,0]);block(name+'_forearm',[.14,-.14,.08],[.12,.42,.12],color,arm);if(level>=2)block(name+'_tablet',[0,.7,.35],[.37,.55,.06],m.paper,g);else{if(type==='ke'){const drum=rod(name+'_instrument',[.4,.55,.4],.3,.26,m.wood,g);drum.rotation.x=Math.PI/2;for(const z of [.25,.55]){const skin=rod(name+'_drum_skin_'+z,[.4,.55,z],.31,.025,m.paper,g);skin.rotation.x=Math.PI/2;}}else if(type==='shi_chu'){mesh(name+'_instrument',G('bell',()=>new THREE.CylinderGeometry(.11,.25,.36,12)),m.gold,g,[.4,.55,.4]);rod(name+'_bell_support',[.4,.92,.4],.035,.4,m.iron,g);}else{const gong=rod(name+'_instrument',[.4,.65,.4],.34,.07,m.gold,g);gong.rotation.x=Math.PI/2;}block(name+'_striker',[.12,0,.1],[.06,.55,.06],m.wood,arm);}jacks.push({g,arm,type,level,base:g.position.clone()});return g;}
    for(let level=1;level<=5;level++){const y=.8+(level-1)*2.35;
      block('tier_floor_'+level,[0,y,0],[6.9,.2,2],m.wood,pagoda);
      block('tier_lintel_'+level,[0,y+1.8,0],[6.8,.17,.5],m.red,pagoda);
      for(const x of [-3.2,3.2])block('tier_post_'+level+x,[x,y+.9,0],[.2,1.8,.3],m.red,pagoda);
      const eave=block('tier_eave_'+level,[0,y+2,0],[7.3,.16,2.4],m.dark,pagoda);eave.rotation.x=.04;
      const gates=level===1?[-2,0,2]:[0];
      for(const x of gates){block('gate_shadow_'+level+x,[x,y+.9,.05],[1.45,1.65,.1],m.dark,pagoda);for(const side of [-1,1]){const hinge=group('door_'+level+'_'+x+'_'+side,pagoda,[x+side*.66,y+.9,.18]);block('door_panel_'+level+x+side,[-side*.32,0,0],[.64,1.62,.07],m.red,hinge);block('door_lattice_'+level+x+side,[-side*.32,.3,.055],[.5,.06,.04],m.gold,hinge);doors.push({hinge,side,level,type:level===1?(x===-2?'shi_chu':x===0?'ke':'shi_zheng'):level===2?'shi':'ke'});}}
      if(level===1){figure('bell_jack',[-2,y,-.2],m.scarlet,'shi_chu',1);figure('drum_jack',[0,y,-.2],m.green,'ke',1);figure('gong_jack',[2,y,-.2],m.purple,'shi_zheng',1);}
      else if(level===2){figure('first_tablet',[-.25,y,-.2],m.scarlet,'shi_chu',2);figure('mid_tablet',[.25,y,-.2],m.purple,'shi_zheng',2);}
      else figure('tablet_tier_'+level,[0,y,-.2],level===3?m.green:m.purple,level===3?'ke':'night',level);
    }
    const pumping=group('decorative_water_lift',root,[-7.4,0,-1],[-3,0,0]);
    for(const y of [3.4,9.1]){const w=group('lift_wheel_'+y,pumping,[0,y,0]);ring('lift_rim_'+y,2.8,.11,w,m.wood);for(let i=0;i<8;i++){const a=i/8*TAU;beam('lift_handle_'+y+i,[0,0,0],[2.8*Math.cos(a),2.8*Math.sin(a),0],.075,m.wood,w);}}
    for(let i=0;i<24;i++){const y=.8+i*.43;block('lift_dipper_'+i,[i<16?2.4:-2.4,y,0],[.5,.25,.5],m.bronze,pumping);}
    const riverWheel=group('river_wheel',pumping,[0,3.4,1.3]);ring('river_wheel_rim',2.4,.13,riverWheel,m.wood);
    for(let i=0;i<8;i++){const a=i/8*TAU;beam('river_handbar_'+i,[0,0,0],[2.4*Math.cos(a),2.4*Math.sin(a),0],.07,m.wood,riverWheel);rod('river_grip_'+i,[2.4*Math.cos(a),2.4*Math.sin(a),.3],.09,.6,m.wood,riverWheel).rotation.x=Math.PI/2;}
    const river=trough('heavenly_river',[-4.5,11.9,-2],6,1,.4);block('river_surface',[0,.23,0],[5.8,.04,.8],m.water,river);
    let lastState=null,lastJacks=null,mode='normal',explode=0;
    function cutBucketWalls(){const active=lastState?((lastState.step%bucketCount)+bucketCount)%bucketCount:0;for(let i=0;i<cups.length;i++){
      const [front,back]=cups[i].userData.cutWalls;front.visible=mode==='normal'||i!==active;back.visible=mode==='normal';
    }}
    function setDisplay(value,amount=explode){mode=value;explode=Math.max(0,Math.min(1,amount));for(const o of exterior)o.visible=value==='normal';pagoda.visible=value!=='mechanism';for(const a of assemblies)a.g.position.copy(a.base).addScaledVector(a.delta,explode);cutBucketWalls();if(lastState)update(lastState,lastJacks);else root.updateMatrixWorld(true);}
    function connect(link,a,b){const direction=b.clone().sub(a);link.position.copy(a).add(b).multiplyScalar(.5);link.scale.y=direction.length();link.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}
    function localPosition(part){return wheelBase.worldToLocal(part.getWorldPosition(new THREE.Vector3()));}
    function update(state,acting={}){lastState=state;lastJacks=acting;const n=bucketCount;
      shulun.rotation.z=-state.rev.shulun*TAU;tianzhu.rotation.y=-state.rev.tianzhu*TAU;jilun.rotation.y=-state.rev.jilun*TAU;hunxiang.rotation.y=-state.rev.hunxiang*TAU;hunyi.rotation.y=-state.rev.hunyi*TAU;ground.rotation.y=-state.rev.shulun*TAU;skyhub.rotation.y=-state.rev.hunyi*TAU;
      cups.forEach((p,i)=>p.rotation.z=-shulun.rotation.z);
      const fstep=(state.continuousStep??state.rev.shulun*n)-state.step,a=RECEIVING_ANGLE-fstep/n*TAU;activeVessel.position.set(5.5*Math.cos(a),5.5*Math.sin(a),BUCKET_Z);
      water.position.y=.12+.26*state.fill;water.visible=state.fill>0;
      activeWaterBody.position.y=.12+.13*state.fill;activeWaterBody.scale.y=.26*state.fill;activeWaterBody.visible=state.fill>1e-4;
      const active=((state.step%n)+n)%n,dumpIndex=Math.floor((RECEIVING_ANGLE+Math.PI/2)/TAU*n+1e-9);
      for(let i=0;i<n;i++){
        const distance=((active-i)%n+n)%n,level=distance===0?state.fill:distance<dumpIndex?1:distance===dumpIndex?(state.phase==='stepping'?1-fstep:1):0;
        const contents=cups[i].userData.water;cups[i].userData.level=level;cups[i].userData.distance=distance;
        contents.position.y=.12+.13*level;contents.scale.y=.26*level;contents.visible=i!==active&&level>1e-4;
      }
      // The western fork tip must fall: its physical Z angle is opposite the oracle's drop angle.
      gecha.rotation.z=-state.escapement.gecha_deg*RAD;tianheng.rotation.z=state.escapement.tianheng_deg*RAD;tongue.rotation.z=gecha.rotation.z;
      leftLock.position.y=6.05+(state.escapement.lock_open?.22:0);leftLock.rotation.z=state.escapement.lock_open?-.65:0;
      inflow.visible=state.flow>0&&state.phase==='filling';spill.visible=state.phase==='stepping';
      cutBucketWalls();root.updateMatrixWorld(true);
      connect(pull,localPosition(lowerPin),localPosition(headTip));connect(lockLink,localPosition(headTip),localPosition(lockPin));
      const waterPoint=localPosition(water),outlet=localPosition(spoutTip);connect(inflow,new THREE.Vector3(outlet.x,waterPoint.y,outlet.z),outlet);
      const dumpAngle=RECEIVING_ANGLE-(dumpIndex+fstep)/n*TAU;
      const spillStart=new THREE.Vector3(5.5*Math.cos(dumpAngle),5.5*Math.sin(dumpAngle)-.05,BUCKET_Z);connect(spill,spillStart,new THREE.Vector3(spillStart.x,-5.82,BUCKET_Z));
      for(const j of jacks){const act=acting[j.type],e=j.level>=4?0:(act?.extension||0);j.g.position.copy(j.base);j.g.position.z+=e*1.3;j.arm.rotation.x=act?.arm||0;if(j.level===2)j.g.visible=e>0;}
      for(const d of doors){const e=d.level>=4?0:d.type==='shi'?Math.max(acting.shi_chu?.extension||0,acting.shi_zheng?.extension||0):(acting[d.type]?.extension||0);d.hinge.rotation.y=d.side*e*1.5;}
      root.updateMatrixWorld(true);
    }
    function inspect(){
      const position=o=>o.getWorldPosition(new THREE.Vector3()).toArray(),n=bucketCount,active=lastState?((lastState.step%n)+n)%n:0;
      const dumpIndex=Math.floor((RECEIVING_ANGLE+Math.PI/2)/TAU*n+1e-9);
      const bucketWater=cups.map((cup,i)=>{const contents=cup.userData.water;return {id:i,m:cup.userData.distance,level:cup.userData.level,visible:i===active?water.visible:contents.visible,mesh_visible:contents.visible,height:contents.scale.y,center_y:contents.position.y,surface_y:i===active?water.position.y:contents.position.y+contents.scale.y/2,bucket_world:position(cup),surface_world:i===active?position(water):contents.localToWorld(new THREE.Vector3(0,.5,0)).toArray()};});
      return {buckets:n,receiving_angle:RECEIVING_ANGLE,active_bucket:active,dump_index:dumpIndex,dump_bucket:(active-dumpIndex+n)%n,bucket_water:bucketWater,
        angles:{shulun:shulun.rotation.z,tianzhu:tianzhu.rotation.y,jilun:jilun.rotation.y,hunxiang:hunxiang.rotation.y,hunyi:hunyi.rotation.y,gecha:gecha.rotation.z,tianheng:tianheng.rotation.z,left_lock:leftLock.rotation.z},
        water_y:water.position.y,water_world:position(water),water_visible:water.visible,inflow:inflow.visible,spill:spill.visible,lock_y:leftLock.position.y,
        landmarks:{fork:position(forkTip),balance:position(headTip),left_lock:position(leftTip),right_lock:position(rightTip),rod_lower:position(lowerPin),rod_upper:position(headTip),spout:position(spoutTip),drain:position(drain)},
        spill_ends:[spill.localToWorld(new THREE.Vector3(0,-.5,0)).toArray(),spill.localToWorld(new THREE.Vector3(0,.5,0)).toArray()],
        rod_ends:[pull.localToWorld(new THREE.Vector3(0,-.5,0)).toArray(),pull.localToWorld(new THREE.Vector3(0,.5,0)).toArray()],jacks:jacks.map(j=>({name:j.g.name,level:j.level,type:j.type,z:j.g.position.z,base_z:j.base.z,arm:j.arm.rotation.x,visible:j.g.visible})),mode,explode};
    }
    function triangleCount(){let n=0;root.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});return n;}
    configure({buckets:36});return {root,parts,materials:m,configure,update,setDisplay,inspect,triangleCount,presets:PRESETS,exterior,makeTextures};
  }
  return {THREE,createModel,makeTextures,PRESETS};
}));
