(function(root){
  'use strict';
  const SPEC=/* SPEC_START */{"schemaVersion":1,"earthYearDays":365.25636,"module":0.03,"mainCenter":[-1.8,0],"crankTeeth":[20,20],"renderYear":8.9352,"initialDaysPerSecond":30,"drumRadius":3.65,"baseFloor":0.12,"armillaryCenterY":7.05,"armillaryInnerRadius":6.8,"planets":[{"id":"mercury","teeth":[83,30,20],"periodNumerator":20,"periodDenominator":83,"astronomicalYears":0.240847,"radius":1.4,"size":0.13,"armY":7.35,"gearY":1.27,"sleeveInner":0.1,"sleeveOuter":0.135},{"id":"venus","teeth":[65,30,40],"periodNumerator":40,"periodDenominator":65,"astronomicalYears":0.615197,"radius":2.08,"size":0.19,"armY":6.95,"gearY":1.56,"sleeveInner":0.155,"sleeveOuter":0.19},{"id":"earth","teeth":[48,30,48],"periodNumerator":1,"periodDenominator":1,"astronomicalYears":1,"radius":2.85,"size":0.22,"armY":6.55,"gearY":1.85,"sleeveInner":0.21,"sleeveOuter":0.245},{"id":"mars","teeth":[25,30,47],"periodNumerator":47,"periodDenominator":25,"astronomicalYears":1.880848,"radius":3.62,"size":0.16,"armY":6.15,"gearY":2.14,"sleeveInner":0.265,"sleeveOuter":0.3},{"id":"jupiter","teeth":[14,20,42,21,30,83],"compoundCenter":[-1.4,1],"periodNumerator":83,"periodDenominator":7,"astronomicalYears":11.862615,"radius":4.52,"size":0.34,"armY":5.75,"gearY":2.43,"sleeveInner":0.32,"sleeveOuter":0.355},{"id":"saturn","teeth":[12,30,72,11,20,54],"compoundCenter":[-0.5,-1.2],"periodNumerator":324,"periodDenominator":11,"astronomicalYears":29.4571,"radius":5.48,"size":0.28,"armY":4.95,"gearY":2.88,"sleeveInner":0.375,"sleeveOuter":0.41}],"tellurion":{"deckY":7.95,"earthLift":2.2,"obliquityDeg":23.44,"parallelTeeth":36,"parallelCount":11,"lunarInclinationDeg":5.14,"lunarTeeth":[53,12,28,10],"lunarModule":0.006,"lunarSynodicNumerator":371,"lunarSynodicDenominator":30,"lunarSiderealNumerator":401,"lunarSiderealDenominator":30,"moonRadius":0.57,"earthSiderealRotations":366.25636},"saturnTiltDeg":26.7,"galileanTurnsPerYear":[206.35,102.88,51.07,21.89],"explosion":{"armillary":3.8,"sun":7.5,"glass":0.55,"gearStep":0.3,"armBase":5,"armStep":0.5},"engineeringNotes":["Jupiter and Saturn use two idlers, one per stage, so four external contacts preserve prograde rotation.","Tooth flanks are sampled involute profiles with visual root relief; this is a rigid kinematic exhibit, not a torque/contact simulation."],"titanTurnsPerYear":22.9,"decorativePlanetSpinRatio":0.13,"sunSpinRatio":0.035,"renderCameras":{"hero":{"location":[16,-23,13.5],"target":[0,0,6.85],"orthoScale":24.5,"resolution":[1280,800]},"macro":{"earthTargetWeight":0.4,"targetZ":4.4,"offset":[6,-13,7],"orthoScale":11.3,"resolution":[1200,900]}}}/* SPEC_END */;
  const TAU=Math.PI*2, rad=d=>d*Math.PI/180, mod=(a,n)=>((a%n)+n)%n;
  function intersection(a,b,ra,rb,side=1){
    const dx=b[0]-a[0], dz=b[1]-a[1], d=Math.hypot(dx,dz);
    if(d>ra+rb||d<Math.abs(ra-rb)||d===0) throw Error('Infeasible pitch-circle construction');
    const t=(ra*ra-rb*rb+d*d)/(2*d), h=Math.sqrt(Math.max(0,ra*ra-t*t));
    return [a[0]+t*dx/d-side*h*dz/d,a[1]+t*dz/d+side*h*dx/d];
  }
  function train(){
    const gears=[], contacts=[], outputs={};
    function gear(id,z,c,y,rate,phase=0,module=SPEC.module,kind='base'){
      const g={id,teeth:z,center:c.slice(),y,module,radius:module*z/2,rate,phase,kind};gears.push(g);return g;
    }
    function driven(a,id,z,c,y=a.y,module=a.module){
      const bearing=Math.atan2(-(c[1]-a.center[1]),c[0]-a.center[0]);
      const phase=((a.teeth+z)*bearing+z*Math.PI-Math.PI-a.teeth*a.phase)/z;
      const b=gear(id,z,c,y,-a.rate*a.teeth/z,phase,module,a.kind);contacts.push({a:a.id,b:b.id});return b;
    }
    for(const [i,p] of SPEC.planets.entries()){
      const z=p.teeth, a=gear(p.id+'_driver',z[0],SPEC.mainCenter,p.gearY,1);
      if(z.length===3){
        const c=intersection(a.center,[0,0],SPEC.module*(z[0]+z[1])/2,SPEC.module*(z[1]+z[2])/2,i%2?1:-1);
        const b=driven(a,p.id+'_idler',z[1],c);outputs[p.id]=driven(b,p.id+'_output',z[2],[0,0]);
      }else{
        const c=p.compoundCenter, d=intersection(a.center,c,SPEC.module*(z[0]+z[1])/2,SPEC.module*(z[1]+z[2])/2,i===4?1:-1);
        const b=driven(a,p.id+'_idler_1',z[1],d), ca=driven(b,p.id+'_compound_A',z[2],c);
        const cb=gear(p.id+'_compound_B',z[3],c,p.gearY+.18,ca.rate,ca.phase);
        const e=intersection(c,[0,0],SPEC.module*(z[3]+z[4])/2,SPEC.module*(z[4]+z[5])/2,1);
        const ib=driven(cb,p.id+'_idler_2',z[4],e);outputs[p.id]=driven(ib,p.id+'_output',z[5],[0,0]);
      }
    }
    return {gears,contacts,outputs};
  }
  const TRAIN=SPEC.planets?train():null;
  function tellurion(){
    const p=SPEC.planets[2],n=SPEC.tellurion.parallelCount, step=p.radius/(n-1),m=step/SPEC.tellurion.parallelTeeth;
    const gears=[],contacts=[];
    for(let i=0;i<n;i++){
      // Equal external gears carried by Earth: relative rates alternate -1,+1.
      const phase=i===0?0:Math.PI- Math.PI/36-gears[i-1].phase;
      gears.push({id:'parallel_'+i,teeth:36,module:m,radius:step/2,center:[i*step,0],y:0,rate:i%2?1:-1,phase,kind:'tellurion'});
      if(i)contacts.push({a:'parallel_'+(i-1),b:'parallel_'+i});
    }
    const z=SPEC.tellurion.lunarTeeth,lm=SPEC.tellurion.lunarModule,driver=gears[n-2];
    const a={id:'lunar_driver',teeth:z[0],module:lm,radius:lm*z[0]/2,center:driver.center.slice(),y:.20,rate:1,phase:driver.phase,kind:'tellurion'};gears.push(a);
    const c=intersection(a.center,[p.radius,0],lm*(z[0]+z[1])/2,lm*(z[2]+z[3])/2,1);
    function mesh(a,id,t,center,y){
      const b={id,teeth:t,module:lm,radius:lm*t/2,center,y,rate:-a.rate*a.teeth/t,phase:((a.teeth+t)*Math.atan2(-(center[1]-a.center[1]),center[0]-a.center[0])+t*Math.PI-Math.PI-a.teeth*a.phase)/t,kind:'tellurion'};
      gears.push(b);contacts.push({a:a.id,b:b.id});return b;
    }
    const b=mesh(a,'lunar_compound_A',z[1],c,a.y),b2={...b,id:'lunar_compound_B',teeth:z[2],radius:lm*z[2]/2,y:.31};gears.push(b2);
    const out=mesh(b2,'lunar_output',z[3],[p.radius,0],b2.y);
    return {gears,contacts,output:out};
  }
  const TELLURION=SPEC.planets?tellurion():null;
  function solve(years){
    const theta=years*TAU,gears=Object.fromEntries(TRAIN.gears.map(g=>[g.id,theta*g.rate+g.phase]));
    const planets=SPEC.planets.map(p=>{const g=TRAIN.outputs[p.id],angle=gears[g.id];return {...p,angle,longitude:mod(angle*180/Math.PI,360),period:p.periodNumerator/p.periodDenominator,position:[p.radius*Math.cos(angle),p.armY+(p.id==='earth'?SPEC.tellurion.earthLift:.4),-p.radius*Math.sin(angle)]};});
    const earth=planets[2],relativeMoon=earth.angle*TELLURION.output.rate+TELLURION.output.phase;
    const moonAngle=relativeMoon+earth.angle,moonLongitude=mod(Math.atan2(Math.sin(moonAngle),Math.cos(rad(SPEC.tellurion.lunarInclinationDeg))*Math.cos(moonAngle))*180/Math.PI,360);
    return {years,theta,crank:theta*SPEC.crankTeeth[1]/SPEC.crankTeeth[0],gears,planets,earthCarrier:-earth.angle,earthSpin:theta*SPEC.tellurion.earthSiderealRotations,moonAngle,moonLongitude,relativeMoon,tellurion:Object.fromEntries(TELLURION.gears.map(g=>[g.id,earth.angle*g.rate+g.phase]))};
  }
  const api={SPEC,TRAIN,TELLURION,TAU,rad,mod,intersection,solve};root.OrreryKinematics=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
