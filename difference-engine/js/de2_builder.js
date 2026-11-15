(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports){require('../vendor/three-studio.bundle.js');module.exports=factory(require('./de2_engine.js'),globalThis.DE2Studio);}
  else root.DE2Builder=factory(root.DE2Engine,root.DE2Studio);
})(typeof globalThis!=='undefined'?globalThis:this,function(E,Studio){
  'use strict';
  const {THREE:T,OrbitControls,RoomEnvironment,mergeGeometries}=Studio;
  const S=E.SPEC,D=S.dimensions,C=S.colors,V=S.visual,TAU=Math.PI*2;
  const clamp=x=>Math.max(0,Math.min(1,x));
  // Exhibit signals are derived from the same crank sample; no animation history is accumulated.
  function visualState(next){
    const carry=next.operation==='carry',lane=carry?next.progress*31:0,phaseProgress=next.phase==='A'?next.u/2:(next.u-2)/2;
    const columns=Array.from({length:8},(_,c)=>{
      const active=next.active.includes(c);
      return {active,lift:active?V.lift*Math.sin(Math.PI*phaseProgress):0,spiralAngle:active&&carry?-next.progress*TAU:0};
    });
    const cells=[];
    for(let c=0;c<8;c++)for(let i=0;i<31;i++){
      const q=carry?clamp(lane-i):0,received=carry&&!!next.carried[c][i],warning=!!next.warned[c][i];
      const head=received&&q>0&&q<1,secondary=received&&next.positions[c][i]>=10;
      const handoff=secondary&&i<30&&lane>=i+1&&lane<i+2;
      const passed=received||(carry&&warning&&lane>=i+1);
      cells.push({column:c,digit:i,q,head,secondary,handoff,handoffProgress:clamp(lane-i-1),warning,passed,
        scanning:carry&&warning&&q>0&&q<1,pulse:head?Math.sin(Math.PI*q):0});
    }
    return {columns,cells};
  }
  function ringGeometry(radius,tube){
    const ring=new T.TorusGeometry(radius,tube,5,40);ring.rotateX(Math.PI/2);
    return mergeGeometries([ring.clone().translate(0,.137,0),ring.clone().translate(0,-.137,0)],false);
  }
  function digitTexture(color){
    const canvas=document.createElement('canvas');canvas.width=2560;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,2560,128);
    ctx.fillStyle=C.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 112px ui-monospace, monospace';
    for(let i=0;i<10;i++)ctx.fillText(String(i),256*i+128,69);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;return tex;
  }
  function gearGeometry(teeth,module,width){
    const shape=new T.Shape(),r=teeth*module/2;
    for(let i=0;i<teeth*4;i++){
      const a=i/(teeth*4)*TAU,rr=r+(i%4===1||i%4===2?module: -module*1.05);
      const x=Math.sin(a)*rr,y=Math.cos(a)*rr;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
    }
    shape.closePath();const hole=new T.Path();hole.absarc(0,0,r*.14,0,TAU,true);shape.holes.push(hole);
    const geo=new T.ExtrudeGeometry(shape,{depth:width,steps:1,bevelEnabled:false});geo.translate(0,0,-width/2);geo.rotateX(Math.PI/2);geo.computeVertexNormals();return geo;
  }
  function createModel(options={}){
    const root=new T.Group();root.name='difference_engine_calculating_section';
    const textures=options.textures!==false&&typeof document!=='undefined';
    const mat=(name,color,metalness=.75,roughness=.32)=>{const m=new T.MeshStandardMaterial({name,color,metalness,roughness});return m;};
    const materials={brass:mat('brass',C.brass),bronze:mat('bronze',C.bronze),steel:mat('steel',C.steel),frame:mat('frame',C.frame,.7,.4),wood:mat('base',C.wood,.05,.55),ivory:mat('readout',C.ivory,.1,.5)};
    const bands=[mat('bronze_digit_band',C.bronzeBand,.18,.55),mat('brass_digit_band',C.brassBand,.18,.55)];
    if(textures)for(let i=0;i<bands.length;i++){bands[i].map=digitTexture(i?C.brassBand:C.bronzeBand);bands[i].color.set('#ffffff');}
    const geometry={band:new T.CylinderGeometry(D.wheelRadius,D.wheelRadius,D.wheelHeight,80,1,true),wheelGear:gearGeometry(40,.022,.045),shaft:new T.CylinderGeometry(.055,.055,10.45,16),lever:new T.BoxGeometry(.26,.052,.07),claw:new T.BoxGeometry(.15,.055,.14),lamp:new T.BoxGeometry(.08,.17,.025)};
    const meshes=[],wheelGroups=[],frameObjects=[],gears=[],spirals=[],staticBuckets=new Map();
    const columnParts=Array.from({length:8},()=>[]),carryParts=Array.from({length:8},()=>[]),gearParts=[];
    function mesh(name,geo,material,x,y,z,parent=root,role='static'){
      const obj=new T.Mesh(geo,material);obj.name=name;obj.position.set(x,y,z);obj.userData.role=role;parent.add(obj);meshes.push(obj);if(role==='frame')frameObjects.push(obj);return obj;
    }
    const box=(name,w,h,d,m,x,y,z,role='static')=>mesh(name,new T.BoxGeometry(w,h,d),m,x,y,z,root,role);
    box('walnut_plinth',11.8,.46,3.5,materials.wood,0,.05,0);
    box('cast_iron_bed',11.4,.16,3.1,materials.frame,0,.36,0);
    for(const y of [.58,10.95])for(const z of [-.94,.94]){
      box('frame_crossbeam_'+y+'_'+z,11,.16,.16,materials.frame,0,y,z,'frame');
    }
    for(const x of [-5.3,5.3])for(const z of [-.94,.94]){
      box('frame_pillar_'+x+'_'+z,.18,10.5,.18,materials.frame,x,5.75,z,'frame');
      for(const y of [.62,10.86])mesh('pillar_collar',new T.CylinderGeometry(.19,.19,.16,16),materials.brass,x,y,z,root,'frame');
    }
    const warningMat=new T.MeshBasicMaterial({name:'warning_lever',color:'#ffffff'}),carryMat=new T.MeshBasicMaterial({name:'carry_claw',color:'#ffffff'});
    const warnings=new T.InstancedMesh(geometry.lever,warningMat,248),claws=new T.InstancedMesh(geometry.claw,carryMat,248),lamps=new T.InstancedMesh(geometry.lamp,new T.MeshBasicMaterial({name:'signal_lights',color:'#ffffff'}),248);
    warnings.name='248_warning_levers';claws.name='248_carry_sector_claws';lamps.name='248_carry_lights';
    const lightMaterial=name=>new T.MeshBasicMaterial({name,color:'#ffffff',toneMapped:false});
    const statusRings=new T.InstancedMesh(ringGeometry(V.ringRadius,V.ringTube),lightMaterial('digit_status_ring'),248);
    const haloMaterial=new T.MeshBasicMaterial({name:'signal_halo',color:'#ffffff',transparent:true,opacity:.2,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
    const halos=new T.InstancedMesh(ringGeometry(V.ringRadius,V.haloTube),haloMaterial,248);
    const crownGeometry=new T.TorusGeometry(.42,.045,6,40);crownGeometry.rotateX(Math.PI/2);
    const indicatorRings=new T.InstancedMesh(crownGeometry,lightMaterial('active_column_ring'),16);
    const indicatorHalos=new T.InstancedMesh(crownGeometry,haloMaterial,16);
    statusRings.name='248_digit_status_rings';halos.name='248_signal_halos';indicatorRings.name='16_active_column_rings';indicatorHalos.name='16_active_column_halos';
    halos.userData.export=false;indicatorHalos.userData.export=false;
    for(const obj of [statusRings,warnings,claws,lamps,indicatorRings])obj.userData.emissionStrengths=Array(obj.count).fill(0);
    root.add(warnings,claws,lamps,statusRings,halos,indicatorRings,indicatorHalos);const dummy=new T.Object3D();
    function movable(obj,c,parts){obj.userData.assemblyBase=obj.position.toArray();obj.userData.column=c;parts[c].push(obj);return obj;}
    for(let c=0;c<8;c++){
      const x=(c-3.5)*D.columnPitch,alloy=c%2?materials.brass:materials.bronze;
      movable(mesh('column_'+c+'_shaft',geometry.shaft,materials.steel,x,5.78,0,root,'column'),c,columnParts);
      for(const y of [.65,10.89])movable(mesh('column_'+c+'_bearing',new T.CylinderGeometry(.36,.36,.13,24),alloy,x,y,0,root,'bearing'),c,columnParts);
      for(let i=0;i<31;i++){
        const group=new T.Group();group.name='digit_'+c+'_'+i;group.position.set(x,D.baseY+i*D.digitPitch,0);root.add(group);
        group.userData={column:c,digit:i,base:group.position.toArray()};
        mesh('digit_band_'+c+'_'+i,geometry.band,bands[c%2],0,0,0,group,'digit');
        mesh('digit_40_tooth_rim_'+c+'_'+i,geometry.wheelGear,alloy,0,.14,0,group,'wheel');
        wheelGroups.push(group);
      }
      const points=[];
      for(let k=0;k<=620;k++){
        const y=D.baseY+k/620*30*D.digitPitch,a=k/620*TAU*4;
        points.push(new T.Vector3(.135*Math.sin(a),y,.135*Math.cos(a)));
      }
      const spiral=movable(mesh('helical_carry_sector_'+c,new T.TubeGeometry(new T.CatmullRomCurve3(points),620,.035,5,false),alloy,x,0,-.67,root,'spiral'),c,carryParts);spirals.push(spiral);
      movable(mesh('carry_sector_shaft_'+c,new T.CylinderGeometry(.035,.035,10.1,12),materials.steel,x,5.65,-.67,root,'carrier'),c,carryParts);
    }
    // Actual pitch circles of the 16:64 pair are tangent at their shared pitch point.
    const rIn=S.gears.driverTeeth*D.gearModule/2,rOut=S.gears.outputTeeth*D.gearModule/2;
    const outX=2.6,driverX=outX+rIn+rOut;
    const output=mesh('reduction_64_teeth',gearGeometry(64,D.gearModule,.13),materials.brass,outX,11.52,0,root,'gear');
    const driver=mesh('crank_16_teeth',gearGeometry(16,D.gearModule,.13),materials.bronze,driverX,11.52,0,root,'gear');
    gears.push(driver,output);
    const crank=new T.Group();crank.name='crank_handle';crank.position.set(driverX,11.72,0);root.add(crank);
    mesh('crank_arm',new T.BoxGeometry(.13,.12,1.25),materials.steel,0,0,.52,crank,'crank');
    mesh('crank_grip',new T.CylinderGeometry(.12,.12,.55,20),materials.wood,0,.22,1.1,crank,'crank');
    const outputShaft=mesh('reduction_output_shaft',new T.CylinderGeometry(.1,.1,.8,20),materials.steel,outX,11.3,0,root,'gear');
    const bridge=box('gearbox_bridge',3.5,.13,.35,materials.frame,3.2,11.11,-.46,'frame');
    for(const obj of [driver,output,crank,outputShaft,bridge]){obj.userData.assemblyBase=obj.position.toArray();gearParts.push(obj);}
    const outerFrame=frameObjects.filter(o=>o!==bridge);
    for(const obj of outerFrame)obj.userData.frameBase=obj.position.toArray();
    // Merge only immobile parts, preserving frame meshes for mode restoration.
    if(options.batch!==false){
      root.updateMatrixWorld(true);
      for(const obj of meshes)if(obj.userData.role==='static'){
        if(!staticBuckets.has(obj.material))staticBuckets.set(obj.material,[]);
        staticBuckets.get(obj.material).push(obj.geometry.clone().applyMatrix4(obj.matrixWorld));obj.visible=false;
      }
      for(const [m,geos]of staticBuckets){const merged=new T.Mesh(mergeGeometries(geos,false),m);merged.name='fixed_'+m.name;root.add(merged);}
    }
    let mode='exhibition',explode=0,state=null,signals=null;
    const modeObjects=[...frameObjects,...meshes.filter(o=>o.userData.role==='digit'||o.userData.role==='wheel')];
    const originalMaterials=new Map(modeObjects.map(o=>[o,o.material])),variants=new Map();
    function applyMode(next){
      mode=next;
      for(const obj of modeObjects){obj.material=originalMaterials.get(obj);obj.visible=true;
        if(next!=='exhibition') {
          const source=obj.material,isFrame=obj.userData.role==='frame',key=source.uuid+':'+next+':'+isFrame;
          if(!variants.has(key)){
            const ghost=source.clone();
            if(isFrame||next==='focus'){ghost.transparent=true;ghost.opacity=isFrame?(next==='focus'?.025:.09):.14;ghost.depthWrite=false;}
            else{ghost.clippingPlanes=[new T.Plane(new T.Vector3(0,0,-1),0)];ghost.side=T.DoubleSide;}
            variants.set(key,ghost);
          }
          obj.material=variants.get(key);
        }
      }
    }
    function update(next,amount=explode){
      state=next;explode=amount;signals=visualState(next);
      const frameSpread=1+amount*V.columnSpread;
      for(const obj of outerFrame){obj.position.x=obj.userData.frameBase[0]*frameSpread;obj.scale.x=obj.name.startsWith('frame_crossbeam_')?frameSpread:1;}
      for(let c=0;c<8;c++){
        const xOffset=(c-3.5)*D.columnPitch*amount*V.columnSpread,motion=signals.columns[c];
        for(const obj of columnParts[c]){const b=obj.userData.assemblyBase;obj.position.set(b[0]+xOffset,b[1]+motion.lift,b[2]);}
        for(const obj of carryParts[c]){const b=obj.userData.assemblyBase;obj.position.set(b[0]+xOffset,b[1]+motion.lift,b[2]-amount*V.carryRetreat);}
        spirals[c].rotation.y=motion.spiralAngle;
        for(let end=0;end<2;end++){
          const k=c*2+end;dummy.position.set((c-3.5)*D.columnPitch+xOffset,(end?10.78:.73)+motion.lift,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();indicatorRings.setMatrixAt(k,dummy.matrix);
          const color=new T.Color(motion.active?(c%2?C.activeBrass:C.activeBronze):C.frame);indicatorRings.setColorAt(k,color);indicatorRings.userData.emissionStrengths[k]=motion.active?1.5:0;
          dummy.scale.set(1.16,1.16,1.16);dummy.updateMatrix();indicatorHalos.setMatrixAt(k,dummy.matrix);indicatorHalos.setColorAt(k,motion.active?color:new T.Color('#000000'));
        }
      }
      for(let k=0;k<wheelGroups.length;k++){
        const group=wheelGroups[k],{column:c,digit:i,base}=group.userData;
        const x=base[0]*(1+amount*V.columnSpread),y=base[1]+signals.columns[c].lift,z=0,cell=signals.cells[k];
        group.position.set(x,y,z);group.rotation.y=next.angles[c][i];
        let color=new T.Color(c%2?C.brass:C.bronze).multiplyScalar(.6),strength=0;
        if(cell.warning&&!cell.passed){color.set(C.warning);strength=2.1;if(cell.scanning)color.lerp(new T.Color(C.carry),cell.q);}
        if(cell.passed){color.set(C.carry);strength=1.4;}
        if(cell.handoff){color.set(C.warning).lerp(new T.Color(C.carry),cell.handoffProgress);strength=2.2;}
        if(cell.head){color.set(C.carry).lerp(new T.Color(C.wavehead),.7+.3*cell.pulse);strength=4.5+2*cell.pulse;}
        dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();statusRings.setMatrixAt(k,dummy.matrix);statusRings.setColorAt(k,color);statusRings.userData.emissionStrengths[k]=strength;
        dummy.scale.setScalar(cell.head?1+.025*cell.pulse:1);dummy.updateMatrix();halos.setMatrixAt(k,dummy.matrix);halos.setColorAt(k,strength?color.clone().multiplyScalar(cell.head?1.8:.55):new T.Color('#000000'));
        const warning=cell.warning&&!cell.passed||cell.handoff;
        dummy.position.set(x+.31,y+.025,z+.515+(warning?.055:0));dummy.rotation.set(0,0,warning?-.55:0);dummy.scale.set(1,1,1);dummy.updateMatrix();warnings.setMatrixAt(k,dummy.matrix);
        warnings.setColorAt(k,new T.Color(warning?C.warning:C.frame));warnings.userData.emissionStrengths[k]=warning?2.2:0;
        dummy.position.set(x-.27,y,-.42-amount*V.carryRetreat);dummy.rotation.set(0,signals.columns[c].spiralAngle+i*TAU/31,0);dummy.scale.set(cell.head?1:cell.passed?.65:.22,1,cell.head?1:cell.passed?.65:.22);dummy.updateMatrix();claws.setMatrixAt(k,dummy.matrix);claws.setColorAt(k,cell.passed?color:new T.Color(C.frame));claws.userData.emissionStrengths[k]=cell.passed?strength*.5:0;
        dummy.position.set(x-.23,y,z+.525);dummy.rotation.set(0,0,0);dummy.scale.set(strength?1:.18,strength?1:.18,1);dummy.updateMatrix();lamps.setMatrixAt(k,dummy.matrix);lamps.setColorAt(k,color);lamps.userData.emissionStrengths[k]=strength;
      }
      for(const obj of [warnings,claws,lamps,statusRings,halos,indicatorRings,indicatorHalos]){obj.instanceMatrix.needsUpdate=true;obj.instanceColor.needsUpdate=true;obj.computeBoundingSphere();}
      for(const obj of gearParts){const b=obj.userData.assemblyBase;obj.position.set(b[0],b[1]+amount*V.gearRise,b[2]);}
      driver.rotation.y=-next.turns*TAU;output.rotation.y=next.turns*TAU/4+Math.PI/64;crank.rotation.y=driver.rotation.y;
      root.updateMatrixWorld(true);
    }
    return {root,materials,bands,wheelGroups,warnings,claws,lamps,statusRings,halos,indicatorRings,frameObjects,gears,gearParts,columnParts,carryParts,spirals,update,applyMode,get signals(){return signals;},get mode(){return mode;},get state(){return state;},get explode(){return explode;}};
  }
  function mount(container){
    const probe=document.createElement('canvas');if(!probe.getContext('webgl2'))return null;
    const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    renderer.localClippingEnabled=true;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#101c22');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    renderer.domElement.setAttribute('aria-label','Difference Engine No.2');container.prepend(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,120);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=38;controls.maxPolarAngle=Math.PI*.94;
    const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment();scene.environment=pmrem.fromScene(environment,.04).texture;environment.dispose();pmrem.dispose();
    scene.add(new T.HemisphereLight('#e5f8ff','#2d2116',2.1));
    const key=new T.DirectionalLight('#fff0d6',3.5);key.position.set(-3,12,8);scene.add(key);
    const rim=new T.DirectionalLight('#9cd9ff',2.3);rim.position.set(7,9,-6);scene.add(rim);
    const model=createModel();scene.add(model.root);
    const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:'#111f25',roughness:.8,metalness:.25}));floor.rotation.x=-Math.PI/2;floor.position.y=-.22;scene.add(floor);
    const grid=new T.GridHelper(40,40,'#344850','#20323a');grid.position.y=-.21;scene.add(grid);
    function resize(){const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
    let viewId='overview';
    function view(id,amount=model.explode){const c=S.cameras[id];viewId=id;container.dataset.view=id;camera.position.fromArray(c.position);controls.target.fromArray(c.target);camera.fov=c.fov;
      if(container.clientWidth<600&&id==='overview'){camera.position.set(8,8.5,27);camera.fov=40;}
      if(container.clientWidth<600&&id==='digits'){camera.position.x-=.9;controls.target.x-=.9;}
      if(id==='overview'){
        const offset=camera.position.clone().sub(controls.target).multiplyScalar(1+amount*.2);controls.target.y+=amount*.7;camera.position.copy(controls.target).add(offset);
      }else if(id==='gears'){camera.position.y+=amount*V.gearRise;controls.target.y+=amount*V.gearRise;}
      else{const shift=controls.target.x*amount*V.columnSpread;camera.position.x+=shift;controls.target.x+=shift;}
      camera.updateProjectionMatrix();controls.update();}
    new ResizeObserver(resize).observe(container);resize();view('overview');
    return {scene,camera,renderer,controls,model,view,get viewId(){return viewId;},render(){controls.update();renderer.render(scene,camera);},resize};
  }
  return {THREE:T,createModel,mount,digitTexture,visualState};
});
