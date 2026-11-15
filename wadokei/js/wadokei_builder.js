(function(root,factory){'use strict';if(typeof module==='object'&&module.exports){require('../vendor/three-studio.bundle.js');module.exports=factory(globalThis.WadokeiStudio.THREE,require('./wadokei_engine.js'));}else root.WadokeiBuilder=factory(root.WadokeiStudio.THREE,root.WadokeiEngine);})(globalThis,function(T,E){
  'use strict';
  const TAU=Math.PI*2,smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
  function makeTextures(){
    const dial=document.createElement('canvas');dial.width=dial.height=1024;const c=dial.getContext('2d');
    c.fillStyle='#e9dbb9';c.fillRect(0,0,1024,1024);c.translate(512,512);
    for(const [r,width,color] of [[490,18,'#755329'],[464,3,'#755329'],[332,3,'#755329'],[212,2,'#8b6c3e']]){c.beginPath();c.arc(0,0,r,0,TAU);c.lineWidth=width;c.strokeStyle=color;c.stroke();}
    const zodiac=['午','巳','辰','卯','寅','丑','子','亥','戌','酉','申','未'],hours=['九','八','七','六','五','四','九','八','七','六','五','四'];
    c.textAlign='center';c.textBaseline='middle';c.fillStyle='#251e14';
    for(let i=0;i<12;i++){const a=i*TAU/12-Math.PI/2;c.save();c.rotate(a+Math.PI/2);c.beginPath();c.moveTo(-124,-462);c.lineTo(-88,-333);c.lineWidth=2;c.strokeStyle='#9a7a48';c.stroke();c.restore();
      c.font='64px "Yu Mincho", "Noto Serif CJK JP", serif';c.fillText(zodiac[i],Math.cos(a)*400,Math.sin(a)*400);
      c.font='bold 76px "Yu Mincho", "Noto Serif CJK JP", serif';c.fillText(hours[i],Math.cos(a)*272,Math.sin(a)*272);
      for(let j=0;j<5;j++){const b=a+j*TAU/60;c.beginPath();c.moveTo(Math.cos(b)*470,Math.sin(b)*470);c.lineTo(Math.cos(b)*(j?480:490),Math.sin(b)*(j?480:490));c.lineWidth=j?2:5;c.strokeStyle='#392b17';c.stroke();}}
    c.font='40px "Yu Mincho", serif';c.fillText('不定時法',0,-36);c.font='28px Georgia,serif';c.fillText('十二刻',0,30);
    const wood=document.createElement('canvas');wood.width=256;wood.height=512;const w=wood.getContext('2d');w.fillStyle='#63381e';w.fillRect(0,0,256,512);
    for(let i=0;i<140;i++){w.beginPath();w.strokeStyle=i%3?'rgba(223,159,78,.16)':'rgba(27,13,7,.35)';w.lineWidth=i%7===0?3:1;
      for(let y=0;y<=512;y+=8){const x=i*1.9+7*Math.sin(y*.018+i*.73)+3*Math.sin(y*.045+i);if(y)w.lineTo(x,y);else w.moveTo(x,y);}w.stroke();}
    return {dial,wood};
  }
  function gearGeometry(teeth,r,depth){const shape=new T.Shape(),pts=[];for(let i=0;i<teeth;i++)for(const [f,rr] of [[0,r*.89],[.19,r*.89],[.25,r],[.64,r],[.72,r*.89]]){const a=(i+f)*TAU/teeth;pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
    pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const hole=new T.Path();hole.absarc(0,0,r*.58,0,TAU,true);shape.holes.push(hole);
    const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24});g.translate(0,0,-depth/2);return g;}
  function createModel(options={}){
    const root=new T.Group();root.name='double_foliot_tower';const parts=[],wheels={},foliots={},weights={},levers={},frames=[];
    const canvases=options.textures===false?{}:makeTextures(),textures={};for(const [k,v]of Object.entries(canvases)){const tx=new T.CanvasTexture(v);tx.colorSpace=T.SRGBColorSpace;if(k==='wood'){tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(1,2);}textures[k]=tx;}
    const mat=(name,color,metalness,roughness,atlas)=>{const m=new T.MeshStandardMaterial({name,color,metalness,roughness,map:textures[atlas]||null});m.userData.atlas=atlas||null;return m;};
    const mats={wood:mat('keyaki','#bd8957',.03,.61,'wood'),dark:mat('blackened_iron','#282a28',.75,.38),brass:mat('aged_brass','#b88e42',.82,.32),edge:mat('polished_brass','#e1ba66',.87,.25),steel:mat('steel','#91a8a5',.8,.28),paper:mat('dial_paper','#ffffff',.08,.67,'dial'),day:mat('day_marker','#d6a644',.6,.35),night:mat('night_marker','#a8c6c2',.6,.32),rope:mat('braided_rope','#aa9571',.03,.86)};
    const box=new T.BoxGeometry(1,1,1),cyl=new T.CylinderGeometry(1,1,1,24),sphere=new T.SphereGeometry(1,16,10);
    function add(name,g,m,pos,scale=[1,1,1],role='mechanism',parent=root){const o=new T.Mesh(g,m.clone());o.name=name;o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;o.userData.role=role;parent.add(o);parts.push(o);if(role==='frame')frames.push(o);return o;}
    const b=(name,m,pos,size,role='mechanism',parent=root)=>add(name,box,m,pos,size,role,parent);
    const rod=(name,m,pos,r,h,role='mechanism',parent=root)=>add(name,cyl,m,pos,[r,h,r],role,parent);
    b('exhibit_plinth',mats.dark,[0,.04,0],[2.45,.08,1.75],'plinth');b('tower_foot',mats.wood,[0,.17,0],[1.9,.20,1.26],'frame');
    for(const x of [-1,1])for(const z of [-1,1]){const o=b('tower_leg_'+x+'_'+z,mats.wood,[x*.66,1.30,z*.42],[.15,2.18,.15],'frame');o.rotation.z=x*.045;}
    for(const y of [.37,1.02,2.15,2.42]){b('tower_cross_front_'+y,mats.wood,[0,y,.43],[1.43,.12,.12],'frame');b('tower_cross_back_'+y,mats.wood,[0,y,-.43],[1.43,.12,.12],'frame');}
    for(const x of [-.68,.68])b('tower_side_board_'+x,mats.wood,[x,1.29,0],[.07,1.55,.79],'frame');
    b('tower_rear_board',mats.wood,[0,1.31,-.44],[1.23,1.56,.06],'frame');
    b('clock_seat',mats.wood,[0,2.47,0],[1.73,.16,1.11],'frame');b('clock_bottom_plate',mats.brass,[0,2.60,0],[1.48,.08,.87],'frame');
    for(const x of [-.64,.64])for(const z of [-.33,.33]){rod('clock_pillar_'+x+'_'+z,mats.brass,[x,3.12,z],.045,1.03,'frame');rod('pillar_foot_'+x+'_'+z,mats.edge,[x,2.69,z],.075,.11,'frame');rod('pillar_cap_'+x+'_'+z,mats.edge,[x,3.63,z],.07,.10,'frame');}
    for(const x of [-.64,.64])rod('middle_pillar_'+x,mats.dark,[x,3.12,0],.035,1.03,'frame');
    b('clock_top_plate',mats.brass,[0,3.66,0],[1.48,.055,.85],'frame');
    for(const x of [-.64,.64]){rod('extended_front_column_'+x,mats.brass,[x,3.94,.33],.032,.57,'frame');rod('bell_column_'+x,mats.brass,[x,3.94,-.33],.032,.57,'frame');}
    for(const z of [-.33,.33])b('foliot_upper_crossbar_'+z,mats.dark,[0,4.19,z],[1.42,.035,.055],'frame');
    const dialGroup=new T.Group();dialGroup.name='rotating_dial';dialGroup.position.set(0,3.03,.53);root.add(dialGroup);wheels.dial=dialGroup;
    const dg=add('dial_72_teeth',gearGeometry(72,.55,.055),mats.brass,[0,0,0],[1,1,1],'mechanism',dialGroup);dg.userData.teeth=72;
    add('dial_face',new T.CircleGeometry(.492,96),mats.paper,[0,0,.034],[1,1,1],'mechanism',dialGroup);
    const hub=rod('dial_hub',mats.edge,[0,3.03,.59],.10,.06);hub.rotation.x=Math.PI/2;
    const pointer=new T.Shape();pointer.moveTo(-.043,0);pointer.lineTo(.043,0);pointer.lineTo(0,-.19);pointer.closePath();
    add('fixed_upper_pointer',new T.ExtrudeGeometry(pointer,{depth:.016,bevelEnabled:false}),mats.dark,[0,3.67,.60]);
    function wheel(key,teeth,r,x,y,z){const group=new T.Group();group.name=key+'_axis';group.position.set(x,y,z);root.add(group);const o=add(key+'_teeth',gearGeometry(teeth,r,.035),mats.brass,[0,0,0],[1,1,1],'mechanism',group);o.userData.teeth=teeth;
      for(let i=0;i<4;i++){const a=i*Math.PI/2,p=b(key+'_spoke_'+i,mats.brass,[Math.cos(a)*r*.3,Math.sin(a)*r*.3,0],[r*.65,.032,.032],'mechanism',group);p.rotation.z=a;}
      const ax=rod(key+'_shaft',mats.steel,[x,y,z],.025,.58);ax.rotation.x=Math.PI/2;wheels[key]=group;return group;}
    wheel('wheel1',64,.32,-.26,2.94,-.08);wheel('wheel2',72,.27,.25,3.12,.04);wheel('wheel3',66,.23,-.16,3.43,-.07);
    for(const [key,n,r]of [['wheel2',9,.075],['wheel3',8,.065]]){const p=add(key+'_pinion_'+n,gearGeometry(n,r,.07),mats.steel,[0,0,.10],[1,1,1],'mechanism',wheels[key]);p.userData.teeth=n;}
    const drive=add('dial_drive_pinion_3',gearGeometry(3,.05,.05),mats.steel,[0,0,.20],[1,1,1],'mechanism',wheels.wheel2);drive.userData.teeth=3;
    const drum=rod('rope_drum',mats.wood,[0,0,-.17],.15,.25,'mechanism',wheels.wheel1);drum.rotation.x=Math.PI/2;
    const rope=rod('weight_rope',mats.rope,[-.26,1.90,-.27],.012,1.75);
    const weight=rod('weight_1_6_kg',mats.dark,[-.26,1.10,-.27],.15,.43);rod('weight_cap',mats.brass,[-.26,1.32,-.27],.16,.035).userData.weightCap=true;
    const escapeGroup=new T.Group();escapeGroup.name='escape_axis';escapeGroup.position.set(.02,3.42,.19);root.add(escapeGroup);wheels.escape=escapeGroup;
    for(const [i,y]of [[0,-.13],[1,.045]]){const ring=new T.TorusGeometry(.235,.026,8,48);const o=add('crown_rim_'+i,ring,mats.brass,[0,y,0],[1,1,1],'mechanism',escapeGroup);o.rotation.x=Math.PI/2;
      for(let n=0;n<15;n++){const a=n*TAU/15,p=b('crown_'+i+'_tooth_'+n,mats.edge,[Math.cos(a)*.23,y+.055,Math.sin(a)*.23],[.035,.095,.04],'mechanism',escapeGroup);p.rotation.y=-a;}
      for(let n=0;n<3;n++){const p=b('crown_spoke_'+i+'_'+n,mats.brass,[0,y,0],[.45,.025,.023],'mechanism',escapeGroup);p.rotation.y=n*TAU/3;}}
    rod('escape_vertical_shaft',mats.steel,[.02,3.44,.19],.018,.56);
    const ep=add('escape_pinion_6',gearGeometry(6,.06,.065),mats.steel,[0,-.23,0],[1,1,1],'mechanism',escapeGroup);ep.rotation.x=-Math.PI/2;ep.userData.teeth=6;
    for(const [f,y,len,mass]of [['day',4.04,1.72,7],['night',3.80,1.52,4]]){const group=new T.Group();group.name=f+'_foliot';group.position.set(0,y,.06);root.add(group);foliots[f]=group;
      b(f+'_foliot_bar',mats.dark,[0,0,0],[len,.032,.048],'mechanism',group);rod(f+'_vertical_verge',mats.steel,[0,-.23,0],.017,.48,'mechanism',group);
      const g=new T.InstancedMesh(box,mats.brass.clone(),52);g.name=f+'_52_groove_marks';g.userData.role='mechanism';group.add(g);parts.push(g);
      for(let n=1;n<=26;n++)for(let s=0;s<2;s++){const m=new T.Matrix4().compose(new T.Vector3((s?1:-1)*E.distance(n)*.014,.018,0),new T.Quaternion(),new T.Vector3(.004,.005,.057));g.setMatrixAt((n-1)*2+s,m);}
      weights[f]=[];for(const side of [-1,1]){const wt=b(f+'_weight_'+side,mats[f],[side*.5,-.052,0],mass===7?[.095,.14,.10]:[.075,.115,.08],'mechanism',group);wt.userData.mass_g=mass;weights[f].push(wt);}
      const lever=new T.Group();lever.name=f+'_lifting_lever';lever.position.set(.32,y-.09,.15);root.add(lever);levers[f]=lever;
      b(f+'_lever_plate',mats.brass,[0,0,0],[.75,.035,.12],'mechanism',lever);b(f+'_lever_fork',mats[f],[-.32,.025,-.06],[.09,.05,.19],'mechanism',lever);}
    const camAxis=new T.Group();camAxis.name='switch_cam_axis';camAxis.position.set(.66,3.73,.15);root.add(camAxis);wheels.switch=camAxis;
    const switchTeeth=add('switch_wheel_6_teeth',gearGeometry(6,.19,.05),mats.steel,[0,-.36,0],[1,1,1],'mechanism',camAxis);switchTeeth.rotation.x=-Math.PI/2;switchTeeth.userData.teeth=6;
    const triangle=new T.Shape();for(let n=0;n<3;n++){const a=n*TAU/3,x=Math.cos(a)*.20,y=Math.sin(a)*.20;if(n)triangle.lineTo(x,y);else triangle.moveTo(x,y);}triangle.closePath();
    const triGeo=new T.ExtrudeGeometry(triangle,{depth:.035,bevelEnabled:false});
    for(const [f,y,angle]of [['day',.20,0],['night',-.04,Math.PI/3]]){const cam=add(f+'_triangular_cam',triGeo,mats[f],[0,y,0],[1,1,1],'mechanism',camAxis);cam.rotation.x=-Math.PI/2;cam.rotation.z=angle;cam.userData.offset_deg=angle?60:0;}
    rod('switch_vertical_shaft',mats.steel,[.66,3.77,.15],.022,.75);
    const yg=wheel('yukiwa',40,.17,.34,3.37,.15);yg.rotation.x=-Math.PI/2;
    const yr=parts.find(o=>o.name==='yukiwa_teeth');yr.geometry.dispose();yr.geometry=new T.TorusGeometry(.145,.022,8,40);delete yr.userData.teeth;yr.name='yukiwa_ring';
    const ys=parts.find(o=>o.name==='yukiwa_shaft');ys.rotation.x=0;ys.scale.y=.18;
    b('yukiwa_lug_0',mats.edge,[.19,0,0],[.10,.06,.06],'mechanism',yg);
    rod('bell_stand',mats.dark,[0,4.37,-.23],.03,.38,'frame');
    const bellProfile=[[0,0],[.06,0],[.11,.02],[.13,.09],[.18,.14],[.24,.17],[.26,.20],[.25,.23],[.04,.24]].map(([x,y])=>new T.Vector2(x,y));
    const bell=add('japanese_bell',new T.LatheGeometry(bellProfile,48),mats.brass,[0,4.57,-.23]);bell.rotation.z=Math.PI;
    const striker=new T.Group();striker.name='bell_striker_pivot';striker.position.set(.43,4.38,-.16);root.add(striker);
    const hammer=b('wooden_bell_striker',mats.wood,[-.15,0,0],[.32,.075,.075],'mechanism',striker);hammer.rotation.z=.10;
    rod('striker_support',mats.dark,[.44,4.27,-.16],.022,.28,'frame');
    root.updateMatrixWorld(true);
    for(const o of parts){o.userData.basePosition=o.position.toArray();o.userData.baseScale=o.scale.toArray();o.userData.baseOpacity=o.material.opacity;o.userData.baseTransparent=o.material.transparent;o.userData.baseDepthWrite=o.material.depthWrite;}
    function pose(s,visualCycles=2970){let th=s.rawTheta??s.theta_ind;const nearest=Math.round(th/6)*6;if(Math.abs(th-nearest)<1e-10)th=nearest;
      const count=Math.floor(th/6),u=smooth((th-count*6)/.00035),after=count%2===0?'day':'night',before=after==='day'?'night':'day';
      const camTurns=count===0?0:count-1+u,angle=Math.abs(th%6)<1e-10?0:.36*Math.sin(TAU*visualCycles*th);
      const active=s.active;return {theta:th,active,dayAngle:active==='day'?angle*(count?u:1):0,nightAngle:active==='night'?angle*u:0,camAngle:camTurns*Math.PI/3,dayLift:count?((before==='day'?0:1)*(1-u)+(after==='day'?0:1)*u):0,nightLift:count?((before==='night'?0:1)*(1-u)+(after==='night'?0:1)*u):1,switching:count>0&&u<1};}
    const movingGroups=[...Object.values(wheels),...Object.values(foliots),...Object.values(levers),striker];
    for(const o of movingGroups)o.userData.basePosition=o.position.toArray();
    let currentPose=null,currentState=null;
    function update(s,visualCycles=2970){currentState=s;currentPose=pose(s,visualCycles);
      for(const key of ['dial','wheel1','wheel2','wheel3','escape','yukiwa']){const o=wheels[key],rev=s.rev[key];if(key==='escape')o.rotation.y=TAU*rev;else o.rotation.z=(key==='dial'?Math.PI/2:0)+(key==='dial'?-1:1)*TAU*rev;}
      wheels.switch.rotation.y=currentPose.camAngle;
      for(const f of ['day','night']){foliots[f].rotation.y=currentPose[f+'Angle'];foliots[f].position.y=(f==='day'?4.04:3.80)+currentPose[f+'Lift']*.035;
        weights[f].forEach((w,i)=>w.position.x=(i?1:-1)*s['distance_'+f]*.014);levers[f].rotation.z=-currentPose[f+'Lift']*.095;}
      const drop=E.REV_PER_KOKU.wheel1*((s.rawTheta??s.theta_ind)%12)*Math.PI*.05;weight.position.y=1.95-drop;
      const cap=parts.find(o=>o.userData.weightCap);cap.position.y=weight.position.y+.22;const top=2.93,bottom=cap.position.y;rope.position.y=(top+bottom)/2;rope.scale.y=top-bottom;
      const last=Math.floor((s.rawTheta??s.theta_ind)*2)/2,ev=s.events?.find(e=>e.theta===last&&e.type!=='switch');
      const delta=s.rawTime-(s.eventTime??-Infinity),strikes=ev?.strikes??s.strikes??0;
      striker.rotation.z=delta>=0&&delta<strikes*.50?-.22*Math.sin(Math.PI*(delta%.50)/.50):0;
      root.updateMatrixWorld(true);return currentPose;}
    function setDisplay(mode='normal',explode=0){const amount=T.MathUtils.clamp(explode,0,1);
      for(const o of parts){const frame=o.userData.role==='frame',transparent=frame&&mode==='cut'?true:o.userData.baseTransparent;if(o.material.transparent!==transparent)o.material.needsUpdate=true;o.visible=!(frame&&mode==='focus');o.material.opacity=frame&&mode==='cut'?.16:o.userData.baseOpacity;o.material.transparent=transparent;o.material.depthWrite=frame&&mode==='cut'?false:o.userData.baseDepthWrite;
        const p=o.userData.basePosition;o.userData.explode=amount;
        if(o.parent===root&&frame)o.position.set(p[0]*(1+amount*.65),p[1]+amount*(p[1]>2.5?.45:-.10),p[2]*(1+amount*1.3));
      }
      for(const o of movingGroups){const p=o.userData.basePosition,foliot=o===foliots.day||o===foliots.night,baselineY=foliot?p[1]+(currentPose?.[o===foliots.day?'dayLift':'nightLift']??0)*.035:p[1];
        o.position.set(p[0]*(1+amount*.65),baselineY+amount*(p[1]-2.6)*.55,p[2]+amount*(o===wheels.dial?.9:p[2]>=0?.25:-.45));}
      root.position.x=0;root.updateMatrixWorld(true);}
    function fingerprint(){root.updateMatrixWorld(true);return parts.map(o=>[o.name,o.visible,o.material.opacity,o.material.transparent,o.material.depthWrite,...o.matrixWorld.elements]);}
    function triangleCount(){let total=0;root.traverse(o=>{if(o.isMesh)total+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return total;}
    return {root,parts,frames,wheels,foliots,weights,levers,mats,canvases,textures,update,setDisplay,fingerprint,triangleCount,get pose(){return currentPose;},get state(){return currentState;}};
  }
  const VIEWS={overview:{position:[6.2,4.9,8.5],target:[0,2.26,0],size:5.70},switch:{position:[4,5.2,.3],target:[.26,3.8,.10],size:1.9},escapement:{position:[-2.8,4.6,3.5],target:[0,3.79,.08],size:2.25},dial:{position:[0,3.12,5],target:[0,3.12,.30],size:1.53}};
  return {THREE:T,makeTextures,gearGeometry,createModel,VIEWS};
});
