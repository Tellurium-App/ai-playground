(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WadokeiEngine=api;})(globalThis,function(){
  'use strict';
  const SPEC=/* SPEC_START */{"version":"1.0","day":86400,"depression_deg":7.3613888888888885,"grooves":26,"pct_table":{"day":{"1":64.2,"13":105.8,"26":140},"night":{"1":52.5,"13":81.7,"26":118.5}},"train":{"dial":72,"wheel2":72,"pinion2":9,"wheel1":64,"wheel3":66,"pinion3":8,"escape":15,"pinion_escape":6,"dial_drive_pinion":3},"rev_per_koku":{"dial":0.08333333333333333,"wheel2":2,"wheel1":0.28125,"wheel3":18,"escape":198,"yukiwa":0.16666666666666666},"osc_per_koku":2970,"cases":[{"id":"edo_geshi","start":"2026-06-21","lat":35.68,"days":3},{"id":"edo_toji","start":"2026-12-21","lat":35.68,"days":3},{"id":"kyoto_shunbun","start":"2026-03-19","lat":35.01,"days":3},{"id":"edo_sekki_cross","start":"2026-11-05","lat":35.68,"days":4},{"id":"edo_two_weeks","start":"2026-04-01","lat":35.68,"days":14},{"id":"nagasaki_aki","start":"2026-09-21","lat":32.75,"days":3}]}/* SPEC_END */;
  const DAY=SPEC.day, RAD=Math.PI/180, OSC_PER_KOKU=SPEC.osc_per_koku;
  const REV_PER_KOKU=SPEC.rev_per_koku;
  const HOUR_NAMES=['明六つ','朝五つ','昼四つ','昼九つ','昼八つ','夕七つ','暮六つ','夜五つ','夜四つ','夜九つ','暁八つ','暁七つ'];
  const HOUR_EN=['Dawn six','Morning five','Morning four','Noon nine','Afternoon eight','Evening seven','Dusk six','Night five','Night four','Midnight nine','Late night eight','Before dawn seven'];
  const HOUR_STRIKES=[6,5,4,9,8,7,6,5,4,9,8,7];
  const SEKKI=['春分','清明','穀雨','立夏','小満','芒種','夏至','小暑','大暑','立秋','処暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒','立春','雨水','啓蟄'];
  const SEKKI_EN=['Spring equinox','Clear and bright','Grain rain','Summer begins','Grain buds','Grain in ear','Summer solstice','Minor heat','Major heat','Autumn begins','End of heat','White dew','Autumn equinox','Cold dew','Frost falls','Winter begins','Minor snow','Major snow','Winter solstice','Minor cold','Major cold','Spring begins','Rain water','Insects awaken'];
  const mod=(x,n)=>((x%n)+n)%n;
  const roundBuffer=new DataView(new ArrayBuffer(8));
  function round(x,n=6){if(x===0)return 0;const negative=x<0;roundBuffer.setFloat64(0,Math.abs(x));const bits=roundBuffer.getBigUint64(0),encoded=Number((bits>>52n)&2047n),exponent=(encoded?encoded-1023:-1022)-52;
    const mantissa=(bits&((1n<<52n)-1n))+(encoded?1n<<52n:0n);let a=mantissa*10n**BigInt(n),q;
    if(exponent>=0)q=a<<BigInt(exponent);else{const b=1n<<BigInt(-exponent);q=a/b;const remainder=a%b;if(remainder*2n>b||(remainder*2n===b&&q%2n))q++;}
    const result=Number(q)/10**n;return result===0?0:negative?-result:result;}
  function dateMs(d){const v=Date.parse(d+'T00:00:00Z');if(!Number.isFinite(v)||new Date(v).toISOString().slice(0,10)!==d)throw RangeError('date');return v;}
  const dateAdd=(d,i)=>new Date(dateMs(d)+i*DAY*1000).toISOString().slice(0,10);
  function sun(d){const n=(dateMs(d)-Date.UTC(2000,0,1))/(DAY*1000)+2451544.5+3/24-2451545;
    const L=mod(280.460+0.9856474*n,360),g=mod(357.528+0.9856003*n,360)*RAD;
    const lambda=mod(L+1.915*Math.sin(g)+.020*Math.sin(2*g),360),eps=23.439-.0000004*n;
    return {lambda,eps,dec:Math.asin(Math.sin(eps*RAD)*Math.sin(lambda*RAD))/RAD};}
  function halfDay(lat,dec){const phi=lat*RAD,de=dec*RAD,h0=-SPEC.depression_deg*RAD;
    const c=(Math.sin(h0)-Math.sin(phi)*Math.sin(de))/(Math.cos(phi)*Math.cos(de));
    if(!(c>-1&&c<1))throw RangeError('polar');return Math.acos(c)/RAD/15*3600;}
  function pct(f,n){const t=SPEC.pct_table[f];return n<=13?t[1]+(t[13]-t[1])*(n-1)/12:t[13]+(t[26]-t[13])*(n-13)/13;}
  const distance=n=>17+(n-1)*32/25;
  const rate=(f,n)=>1/(pct(f,n)/100*DAY/12);
  const period=(f,n)=>(pct(f,n)/100*DAY)/(12*OSC_PER_KOKU);
  function closestGroove(f,target){let best=1;for(let n=2;n<=26;n++)if(Math.abs(pct(f,n)-target)<Math.abs(pct(f,best)-target))best=n;return best;}
  function groovesFor(d,lat){const s=sun(d),k=Math.floor(s.lambda/15),dec=Math.asin(Math.sin(s.eps*RAD)*Math.sin(15*k*RAD))/RAD;
    const dayLen=2*halfDay(lat,dec),target_day=dayLen/(DAY/2)*100,target_night=(DAY-dayLen)/(DAY/2)*100;
    return {sekki:k,target_day,target_night,groove_day:closestGroove('day',target_day),groove_night:closestGroove('night',target_night)};}
  function validate(c){dateMs(c.start);if(c.start<'1800-01-01'||c.start>'2100-12-31')throw RangeError('date');
    if(!Number.isFinite(c.lat)||Math.abs(c.lat)>=90)throw RangeError('polar');if(!Number.isInteger(c.days)||c.days<1||c.days>31)throw RangeError('days');
    if(c.sample_s!==undefined&&(!Number.isFinite(c.sample_s)||c.sample_s<1))throw RangeError('sample');}
  function createSimulation(input){const c={...input};validate(c);const days=[],knots=[],segments=[],events=[];const step=c.sample_s??1800;
    for(let i=0;i<c.days+2;i++){const date=dateAdd(c.start,i),s=sun(date),H=halfDay(c.lat,s.dec),dd={date,dec:s.dec,lambda:s.lambda,ake:i*DAY+DAY/2-H,kure:i*DAY+DAY/2+H};
      days.push(dd);knots.push([dd.ake,12*i],[dd.kure,12*i+6]);}
    function interpolate(value,inIndex){for(let i=0;i<knots.length-1;i++){const a=knots[i],b=knots[i+1];if(a[inIndex]<=value&&value<=b[inIndex])return a[1-inIndex]+(b[1-inIndex]-a[1-inIndex])*(value-a[inIndex])/(b[inIndex]-a[inIndex]);}throw RangeError('range');}
    const thetaTrue=t=>interpolate(t,0),tTrue=theta=>interpolate(theta,1);
    let t=days[0].ake,theta=0;
    while(theta<12*c.days){const date=dateAdd(c.start,Math.floor(t/DAY)),g=groovesFor(date,c.lat);
      for(const active of ['day','night']){const groove=g['groove_'+active],dt=6/rate(active,groove);
        segments.push({t0:t,t1:t+dt,theta0:theta,active,groove,date,sekki:g.sekki,groove_day:g.groove_day,groove_night:g.groove_night});t+=dt;theta+=6;}}
    const startTime=days[0].ake,endTime=t,maxTheta=12*c.days;
    if(endTime>knots.at(-1)[0])throw RangeError('drift');
    function segmentAt(tq){const sg=segments.find(s=>s.t0<=tq&&tq<=s.t1);if(!sg)throw RangeError('range');return sg;}
    function tOfTheta(th){const sg=segments.find(s=>s.theta0<=th&&th<=s.theta0+6);if(!sg)throw RangeError('range');return sg.t0+(th-sg.theta0)/rate(sg.active,sg.groove);}
    function thetaAt(tq){const sg=segmentAt(tq);return sg.theta0+(tq-sg.t0)*rate(sg.active,sg.groove);}
    for(let j=1;j<=24*c.days;j++){const th=j/2,tt=tOfTheta(th),h=Math.floor(th)%12;
      if(j%2){const prev=Math.floor(th-.5)%12;events.push({t:round(tt,3),theta:th,type:'half',strikes:HOUR_STRIKES[prev]%2?1:2});}
      else{events.push({t:round(tt,3),theta:th,type:'hour',name:HOUR_NAMES[h],strikes:HOUR_STRIKES[h]});
        if(h===0||h===6){const active=h===0?'day':'night',after=segments.find(s=>Math.abs(s.theta0-th)<1e-9),g=after||groovesFor(dateAdd(c.start,Math.floor(tt/DAY)),c.lat);
          events.push({t:round(tt,3),theta:th,type:'switch',active,groove:after?after.groove:g.groove_day,sekki:g.sekki});}}}
    function snapshot(tq){const sg=segmentAt(tq),th=thetaAt(tq),truth=thetaTrue(tq),error=tq-tTrue(th);
      const trace={t:round(tq,3),theta_ind:round(th,9),theta_true:round(truth,9),error_s:round(error,3),active:sg.active,groove:sg.groove,osc:round(th*OSC_PER_KOKU,6),rev:Object.fromEntries(Object.entries(REV_PER_KOKU).map(([k,v])=>[k,round(th*v,9)]))};
      const di=Math.max(0,Math.min(days.length-2,Math.floor(tq/DAY))),dd=days[di],strike=events.findLast(ev=>ev.type!=='switch'&&ev.theta<=th+1e-9);
      return {...trace,trace,rawTheta:th,rawTime:tq,date:dd.date,groove_day:sg.groove_day,groove_night:sg.groove_night,distance_day:distance(sg.groove_day),distance_night:distance(sg.groove_night),period_day:period('day',sg.groove_day),period_night:period('night',sg.groove_night),sekki:sg.sekki,calendarSekki:Math.floor(dd.lambda/15),ake:dd.ake-di*DAY,kure:dd.kure-di*DAY,dayKoku:(dd.kure-dd.ake)/6,nightKoku:(days[di+1].ake-dd.kure)/6,eventTime:strike?tOfTheta(strike.theta):-Infinity,strikes:strike?.strikes??0};}
    function sampleAt(index){const tq=startTime+index*step;if(!Number.isInteger(index)||index<0||tq>endTime+1e-6)throw RangeError('range');return snapshot(tq);}
    function toTrace(){const samples=[];let tq=startTime;while(tq<=endTime+1e-6){samples.push(snapshot(tq).trace);tq+=step;}
      return {spec_version:'1.0',case:c.id,input:{start:c.start,lat:c.lat,days:c.days},days:days.slice(0,c.days+1).map(d=>({date:d.date,dec:round(d.dec,9),lambda:round(d.lambda,9),sekki:Math.floor(d.lambda/15),ake:round(d.ake,3),kure:round(d.kure,3)})),segments:segments.map(s=>({t0:round(s.t0,3),t1:round(s.t1,3),theta0:s.theta0,active:s.active,groove:s.groove,date:s.date,sekki:s.sekki})),events,samples};}
    return {input:c,days,segments,events,startTime,endTime,maxTheta,snapshot,sampleAt,snapshotTheta:th=>snapshot(tOfTheta(th)),thetaAt,tOfTheta,thetaTrue,tTrue,toTrace};}
  function realign(sim,t){return createSimulation({...sim.input,start:dateAdd(sim.input.start,Math.floor(t/DAY))});}
  return {SPEC,DAY,OSC_PER_KOKU,REV_PER_KOKU,HOUR_NAMES,HOUR_EN,HOUR_STRIKES,SEKKI,SEKKI_EN,round,mod,dateAdd,sun,halfDay,pct,distance,rate,period,closestGroove,groovesFor,createSimulation,simulate:c=>createSimulation(c).toTrace(),realign};
});
