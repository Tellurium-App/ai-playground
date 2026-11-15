(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SuiunEngine = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SPEC = /* SPEC_START */{"spec_version":"1.0","constants":{"JILUN_TEETH":600,"TEETH_PER_KE":6,"TEETH_PER_SHI":50,"KE_PER_DAY":100,"DAY_S":86400,"SHI_NAMES":"子丑寅卯辰巳午未申酉戌亥","BUCKETS_ALLOWED":[36,48],"TIANZHU_PER_SHULUN":1,"STEP_S":1,"GECHA_DROP_DEG":20,"TIANHENG_LIFT_DEG":12,"LOCK_OPEN_U":0.5},"dimensions_chi":{"shulun_diameter":11,"bucket_length":1,"bucket_width":0.5,"bucket_depth":0.4,"iron_axle_length":5.9,"tianzhu_length":19.5,"jilun_diameter":6.7,"tianlun_diameter":3.8,"hunxiang_diameter":4.565,"drain_length":11.4,"drain_width":1.9,"chi_m":0.31},"cases":[{"id":"basic","buckets":36,"start_step":0,"duration_s":120,"sample_s":0.25,"flow":[{"t":0,"rate":1}]},{"id":"ke_cross","buckets":36,"start_step":177,"duration_s":120,"sample_s":0.25,"flow":[{"t":0,"rate":1}]},{"id":"shi_zheng","buckets":36,"start_step":148,"duration_s":100,"sample_s":0.25,"flow":[{"t":0,"rate":1}]},{"id":"chu_overlap","buckets":36,"start_step":898,"duration_s":100,"sample_s":0.25,"flow":[{"t":0,"rate":1}]},{"id":"midnight","buckets":36,"start_step":3598,"duration_s":100,"sample_s":0.25,"flow":[{"t":0,"rate":1}]},{"id":"flow_change","buckets":36,"start_step":0,"duration_s":600,"sample_s":0.25,"flow":[{"t":0,"rate":1},{"t":100.3,"rate":0.5},{"t":250.7,"rate":0},{"t":320.2,"rate":1.2}]},{"id":"buckets48","buckets":48,"start_step":395,"duration_s":300,"sample_s":0.5,"flow":[{"t":0,"rate":1}]},{"id":"one_day","buckets":36,"start_step":0,"duration_s":86400,"sample_s":600,"flow":[{"t":0,"rate":1}]},{"id":"fast_flow","buckets":36,"start_step":0,"duration_s":10800,"sample_s":300,"flow":[{"t":0,"rate":1.1}]}]}/* SPEC_END */;
  const JILUN_TEETH=600, TEETH_PER_KE=6, TEETH_PER_SHI=50, KE_PER_DAY=100;
  const SHI_NAMES='子丑寅卯辰巳午未申酉戌亥', BUCKETS_ALLOWED=[36,48];
  const TIANZHU_PER_SHULUN=1, STEP_S=1, GECHA_DROP_DEG=20, TIANHENG_LIFT_DEG=12, LOCK_OPEN_U=.5, DAY_S=86400;
  const roundBits=new DataView(new ArrayBuffer(8));
  function r(x,n) {
    // Round the exact binary64 rational to decimal using the oracle's ties-to-even rule.
    // Testing x * 10**n for a half would introduce a second floating-point rounding.
    if(!Number.isFinite(x)||!Number.isInteger(n)||n<0)throw Error('invalid rounding input');
    if(x===0)return 0;roundBits.setFloat64(0,Math.abs(x));const bits=roundBits.getBigUint64(0),exponent=Number((bits>>52n)&2047n),mantissa=(bits&((1n<<52n)-1n))+(exponent?1n<<52n:0n),shift=(exponent||1)-1023-52;
    let numerator=mantissa*10n**BigInt(n),denominator=1n;
    if(shift>=0)numerator<<=BigInt(shift);else denominator<<=BigInt(-shift);
    let q=numerator/denominator;const remainder=numerator%denominator;
    if(remainder*2n>denominator||remainder*2n===denominator&&q%2n===1n)q++;
    const value=Number((x<0?'-':'')+q.toString()+'e-'+n);return value===0?0:value;
  }
  const smooth=u=>u*u*(3-2*u), mod=(a,b)=>((a%b)+b)%b;
  function geometry(c) {
    const n=c.buckets; if(!BUCKETS_ALLOWED.includes(n)) throw Error('buckets must be 36 or 48');
    const cycle=DAY_S/KE_PER_DAY*TIANZHU_PER_SHULUN/n;
    return {buckets:n,cycle_s:r(cycle,9),fill_s:r(cycle-STEP_S,9),step_s:STEP_S,teeth_per_step:r(TEETH_PER_KE*TIANZHU_PER_SHULUN/n,9),steps_per_ke:n/TIANZHU_PER_SHULUN,steps_per_shi:Math.floor(TEETH_PER_SHI*n/(TEETH_PER_KE*TIANZHU_PER_SHULUN)),steps_per_day:KE_PER_DAY*n/TIANZHU_PER_SHULUN};
  }
  function clockOf(k,g) {const d=mod(k,g.steps_per_day), s=g.steps_per_shi; return {shi:SHI_NAMES[Math.floor(d/s)],half:d%s<s/2?'初':'正',ke:Math.floor(d/g.steps_per_ke)};}
  function clockEvents(k,t,g) {
    const d=mod(k,g.steps_per_day),s=g.steps_per_shi,out=[];
    const add=type=>out.push({t:r(t,6),type,step:k,shi:SHI_NAMES[Math.floor(d/s)],ke:Math.floor(d/g.steps_per_ke)});
    if(d%s===0)add('shi_chu');else if(d%s===s/2)add('shi_zheng');
    if(d%g.steps_per_ke===0&&d%s!==0)add('ke');return out;
  }
  function upperBound(a,t,key) {let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>>1;if(key(a[m])<=t)lo=m+1;else hi=m;}return lo;}
  function makeFlow(schedule) {
    if(!schedule.length||schedule[0].t!==0)throw Error('flow must start at zero');
    for(let i=0;i<schedule.length;i++)if(!Number.isFinite(schedule[i].t)||!Number.isFinite(schedule[i].rate)||schedule[i].rate<0||(i&&schedule[i].t<=schedule[i-1].t))throw Error('invalid flow');
    const at=t=>schedule[Math.max(0,upperBound(schedule,t,e=>e.t)-1)].rate;
    function integral(a,b){let v=0,cur=a;for(const e of schedule){if(e.t>a&&e.t<b){v+=(e.t-cur)*at(cur);cur=e.t;}}return v+(b-cur)*at(cur);}
    return {at,integral};
  }
  function createSimulation(input) {
    const c=JSON.parse(JSON.stringify(input)),g=geometry(c),flow=makeFlow(c.flow),T=c.duration_s;
    if(!Number.isFinite(T)||T<0||!Number.isInteger(c.start_step)||c.start_step<0||!(c.sample_s>0))throw Error('invalid case');
    const segments=[],events=[];let t=0,k=c.start_step,fill=0;
    while(t<=T) {
      const t0=t,f0=fill;let trip=null,cur=t;
      const changes=c.flow.filter(e=>e.t>t).map(e=>e.t).concat(Infinity);
      for(const next of changes){const q=flow.at(cur);if(q>0){const need=(1-fill)*g.fill_s/q;if(cur+need<=next){trip=cur+need;break;}}if(next===Infinity)break;fill+=(next-cur)*q/g.fill_s;cur=next;}
      if(trip===null||trip>T){segments.push({kind:'filling',a:t0,b:Infinity,x:f0,k});break;}
      segments.push({kind:'filling',a:t0,b:trip,x:f0,k});
      events.push({t:r(trip,6),type:'trip',step:k+1});
      segments.push({kind:'stepping',a:trip,b:trip+STEP_S,x:k,k});
      t=trip+STEP_S;if(t>T)break;k++;fill=0;
      events.push({t:r(t,6),type:'step',step:k});events.push(...clockEvents(k,t,g));
    }
    const timed=events.filter(e=>e.t<=T), reports={};
    for(const type of ['shi_chu','shi_zheng','ke'])reports[type]=timed.filter(e=>e.type===type);
    let extended=null;
    function extend(ts){if(!extended||extended.input.duration_s<ts)extended=createSimulation({...c,duration_s:Math.max(ts,T*2)});return extended;}
    function snapshot(ts) {
      if(!Number.isFinite(ts))throw Error('time must be finite');if(ts>T)return extend(ts).snapshot(ts);
      ts=Math.max(0,ts);const seg=segments[Math.max(0,upperBound(segments,ts,s=>s.a)-1)];
      const phase=seg.kind;let f,kf,u=null;const k=seg.k;
      if(phase==='filling'){f=seg.x+flow.integral(seg.a,ts)/g.fill_s;kf=k;}else{f=1;u=(ts-seg.a)/STEP_S;kf=k+smooth(u);}
      const teeth=kf*TEETH_PER_KE*TIANZHU_PER_SHULUN/g.buckets,day=teeth/JILUN_TEETH,s=u===null?0:Math.sin(Math.PI*u);
      const result={t:r(ts,3),phase,fill:r(Math.min(f,1),9),step:k,flow:r(flow.at(ts),9),rev:{shulun:r(kf/g.buckets,9),tianzhu:r(kf/g.buckets*TIANZHU_PER_SHULUN,9),jilun:r(day,9),hunxiang:r(day,9),hunyi:r(day,9)},teeth:r(teeth,9),clock:clockOf(k,g),escapement:{gecha_deg:r(-GECHA_DROP_DEG*s,9),tianheng_deg:r(TIANHENG_LIFT_DEG*s,9),lock_open:phase==='stepping'&&u<LOCK_OPEN_U}};
      Object.defineProperty(result,'continuousStep',{value:kf});return result;
    }
    function counts(ts){if(ts>T)return extend(ts).counts(ts);return Object.fromEntries(Object.entries(reports).map(([type,ev])=>[type,upperBound(ev,ts,e=>e.t)]));}
    function jacks(ts){
      if(ts>T)return extend(ts).jacks(ts);const out={};for(const [type,ev]of Object.entries(reports)){const i=upperBound(ev,ts,e=>e.t)-1,event=i>=0?ev[i]:null,age=event?ts-event.t:Infinity;
        // Hold, then withdraw. The interval is physical simulation time, independent of frame rate.
        const extension=age<1.2?smooth(age/1.2):age<5?1:age<8?1-smooth((age-5)/3):0;
        out[type]={event,age,extension,arm:extension*Math.sin(Math.min(age,5)*Math.PI*3)*.6};
      }return out;
    }
    const clockEventList=timed.filter(e=>['shi_chu','shi_zheng','ke'].includes(e.type));
    const nextEvent=(ts,type)=>timed.find(e=>e.t>ts&&(type==='report'?clockEventList.includes(e):e.type===type));
    return {input:c,geometry:g,segments,events:timed,snapshot,counts,jacks,nextEvent};
  }
  function simulate(c){const sim=createSimulation(c),samples=[];for(let i=0;;i++){const ts=.1+i*c.sample_s;if(ts>c.duration_s+1e-9)break;samples.push(sim.snapshot(r(ts,6)));}return {spec_version:'1.0',case:c.id,input:{buckets:c.buckets,start_step:c.start_step,duration_s:c.duration_s,sample_s:c.sample_s,flow:c.flow},geometry:sim.geometry,events:sim.events,samples};}
  function solarTime(state,g){const elapsed=state.continuousStep===undefined?state.rev.jilun*DAY_S+.00005:state.continuousStep/g.steps_per_day*DAY_S;const sec=mod(Math.floor(elapsed+1e-9)+23*3600,DAY_S),hh=String(Math.floor(sec/3600)).padStart(2,'0'),mm=String(Math.floor(sec%3600/60)).padStart(2,'0'),ss=String(sec%60).padStart(2,'0');return {seconds:sec,hms:hh+':'+mm+':'+ss,hm:hh+':'+mm};}
  function localTimeToStep(hours,minutes,seconds,buckets){const sec=mod(hours*3600+minutes*60+seconds-23*3600,DAY_S);return Math.floor(sec/DAY_S*geometry({buckets}).steps_per_day);}
  function clockToStep(shi,half,ke,buckets){const g=geometry({buckets}),base=shi*g.steps_per_shi+(half?g.steps_per_shi/2:0);return Math.min(g.steps_per_day-1,base+Math.floor(ke*g.steps_per_ke));}
  function withFlow(c,t,rate){if(!Number.isFinite(rate)||rate<0||rate>1.5)throw Error('flow outside 0–1.5');const copy=JSON.parse(JSON.stringify(c));copy.flow=copy.flow.filter(e=>e.t<t);copy.flow.push({t:Math.max(0,t),rate});return copy;}
  return {SPEC,JILUN_TEETH,TEETH_PER_KE,TEETH_PER_SHI,KE_PER_DAY,SHI_NAMES,BUCKETS_ALLOWED,TIANZHU_PER_SHULUN,STEP_S,GECHA_DROP_DEG,TIANHENG_LIFT_DEG,LOCK_OPEN_U,DAY_S,r,smooth,geometry,clockOf,clockEvents,createSimulation,simulate,solarTime,localTimeToStep,clockToStep,withFlow};
}));
