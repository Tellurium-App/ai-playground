(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DE2Engine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SPEC = /* SPEC_START */{"version":"1.0","columns":8,"digits":31,"turnsPerCycle":4,"dimensions":{"columnPitch":1.24,"digitPitch":0.32,"wheelRadius":0.46,"wheelHeight":0.25,"baseY":0.85,"gearModule":0.035},"colors":{"brass":"#e6c05a","bronze":"#c66e45","brassBand":"#eed994","bronzeBand":"#dc9875","steel":"#9daeb4","frame":"#26383d","wood":"#36261e","ivory":"#f7e8c7","ink":"#171b1d","warning":"#ffb532","carry":"#42ddf5","wavehead":"#edfdff","activeBronze":"#ffad75","activeBrass":"#ffe287"},"visual":{"ringRadius":0.482,"ringTube":0.022,"haloTube":0.049,"lift":0.065,"columnSpread":0.34,"carryRetreat":1.15,"gearRise":1.7},"gears":{"driverTeeth":16,"outputTeeth":64},"presets":[{"id":"prime_x2_x_41","poly":["41","1","1"],"x0":"0"},{"id":"cubes","poly":["0","0","0","1"],"x0":"1"},{"id":"seventh_order","poly":["7","-1","0","2","0","-5","0","3"],"x0":"9000"},{"id":"negative_slope","poly":["1000000","0","-37"],"x0":"0"}],"ripple":{"id":"ripple_30","initial":["999999999999999999999999999999","1","0","0","0","0","0","0"]},"cameras":{"overview":{"position":[11,8.8,20],"target":[0,5.5,0],"fov":38},"digits":{"position":[-3.5,2.4,5.7],"target":[-2.9,1.9,0.15],"fov":38},"ripple":{"position":[-5.4,3.6,12.8],"target":[-3.5,5.7,0],"fov":45},"gears":{"position":[8.3,13.8,8],"target":[2.5,11.35,0],"fov":37}},"render":{"turns":1.51,"case":"ripple_30","hero":{"position":[13,9.5,23],"target":[0,5.5,0],"scale":21.6},"macro":{"position":[-3.3,6.2,6.5],"target":[-3.1,5.75,0],"scale":5.5}}}/* SPEC_END */;
  const COLS = 8, DIGITS = 31, MOD = 10n ** 31n;
  const PAIRS = { A: [[0,1],[2,3],[4,5],[6,7]], B: [[1,2],[3,4],[5,6]] };
  const integer = x => {if(typeof x==='number'&&!Number.isSafeInteger(x))throw Error('Use an exact integer string');return BigInt(x);};
  const mod = x => ((integer(x) % MOD) + MOD) % MOD;
  const raw = x => mod(x).toString().padStart(DIGITS, '0');
  const signed = x => { const n = mod(x); return (n >= MOD / 2n ? n - MOD : n).toString(); };
  const digits = x => Array.from(raw(x)).reverse().map(Number);
  const encode = a => a.slice().reverse().join('');
  const zeros = () => Array.from({length:COLS}, () => Array(DIGITS).fill(0));
  const gcd = (a,b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a,b] = [b,a%b]; return a; };
  function fraction(n,d=1n) { if (!d) throw Error('Zero denominator'); if (d < 0n) {n=-n;d=-d;} const g=gcd(n,d); return [n/g,d/g]; }
  const sub = (a,b) => fraction(a[0]*b[1]-b[0]*a[1],a[1]*b[1]);
  const mul = (a,b) => fraction(a[0]*b[0],a[1]*b[1]);
  const div = (a,b) => fraction(a[0]*b[1],a[1]*b[0]);
  function polynomial(coef,x) { x=integer(x); return coef.reduceRight((v,c)=>v*x+integer(c),0n); }
  function integerCycle(cols) {
    const a=cols.slice(); for (const [t,s] of PAIRS.A) a[t]=cols[t]+cols[s];
    const b=a.slice(); for (const [t,s] of PAIRS.B) b[t]=a[t]+a[s];
    return b;
  }
  // Build observability rows from independent basis trajectories, before taking any modulus.
  function initialFromPolynomial(coef,x0) {
    if (coef.length > COLS) throw Error('At most eight coefficients');
    const rows=Array.from({length:COLS},()=>[]);
    for (let c=0;c<COLS;c++) {
      let basis=Array.from({length:COLS},(_,i)=>i===c?1n:0n);
      for(let n=0;n<COLS;n++) { rows[n].push(basis[0]+basis[1]); basis=integerCycle(basis); }
    }
    const a=rows.map((r,i)=>[...r.map(v=>fraction(v)),fraction(polynomial(coef,integer(x0)+BigInt(i)))]);
    for(let c=0;c<COLS;c++) {
      const p=a.findIndex((r,i)=>i>=c&&r[c][0]!==0n);
      if(p<0) throw Error('Singular initial-state system');
      [a[c],a[p]]=[a[p],a[c]];
      const pivot=a[c][c]; a[c]=a[c].map(v=>div(v,pivot));
      for(let r=0;r<COLS;r++) if(r!==c&&a[r][c][0]) {
        const f=a[r][c]; a[r]=a[r].map((v,j)=>sub(v,mul(f,a[c][j])));
      }
    }
    return a.map(r=>{if(r[COLS][1]!==1n)throw Error('Non-integer initial state');return mod(r[COLS][0]);});
  }
  function addition(a,b) {
    const da=digits(a),db=digits(b),stage=da.map((d,i)=>(d+db[i])%10);
    const warned=da.map((d,i)=>Number(d+db[i]>=10)),carried=Array(DIGITS).fill(0),out=stage.slice();
    let carry=0;
    for(let i=0;i<DIGITS;i++) {
      if(carry) {carried[i]=1;out[i]=(out[i]+1)%10;}
      carry=Number(warned[i]===1||(carried[i]===1&&out[i]===0));
    }
    return {stage,warned,carried,out,overflow:carry,value:BigInt(encode(out))};
  }
  function phase(cols,name) {
    const values=cols.map(mod),stage=cols.map(digits),warned=zeros(),carried=zeros(),overflow=Array(COLS).fill(0);
    for(const [t,s] of PAIRS[name]) {
      const r=addition(cols[t],cols[s]);stage[t]=r.stage;warned[t]=r.warned;carried[t]=r.carried;values[t]=r.value;overflow[t]=r.overflow;
    }
    return {values,stage,warned,carried,overflow,record:{after_add:stage.map(encode),warned:warned.map(encode),carried:carried.map(encode),after_carry:values.map(raw)}};
  }
  function normalize(config) {
    if(config.poly) {
      const poly=Array.from({length:COLS},(_,i)=>integer(config.poly[i]||0).toString());
      if(config.poly.length>COLS)throw Error('At most eight coefficients');
      const x0=integer(config.x0||0).toString();
      return {id:config.id||'custom',poly,x0,initial:initialFromPolynomial(poly,x0).map(raw)};
    }
    if(!config.initial||config.initial.length!==COLS)throw Error('Eight initial columns required');
    return {id:config.id||'direct',initial:config.initial.map(raw)};
  }
  const matrix = Array.from({length:COLS},()=>Array(COLS).fill(0n));
  for(let c=0;c<COLS;c++) {const v=integerCycle(Array.from({length:COLS},(_,i)=>i===c?1n:0n));for(let r=0;r<COLS;r++)matrix[r][c]=v[r];}
  const matMul=(a,b)=>a.map(row=>b[0].map((_,j)=>mod(row.reduce((s,v,k)=>s+v*b[k][j],0n))));
  function boundaryColumns(initial,n) {
    let v=initial.map(x=>[mod(x)]),m=matrix,k=BigInt(n);
    while(k>0n) {if(k&1n)v=matMul(m,v);k>>=1n;if(k)m=matMul(m,m);}
    return v.map(r=>r[0]);
  }
  function validateTurns(turns) {
    if(!Number.isFinite(turns)||turns<0||turns>Number.MAX_SAFE_INTEGER/4)throw RangeError('Invalid crank turns');
  }
  function isBoundary(turns) {validateTurns(turns);return turns%4===0;}
  function snap(turns) {validateTurns(turns);return Math.max(0,Math.round(turns/4)*4);}
  function reconfigure(next,turns) {if(!isBoundary(turns))throw Error('CYCLE_LOCKED');return normalize(next);}
  function reset(turns) {if(!isBoundary(turns))throw Error('CYCLE_LOCKED');return 0;}
  function sample(config,turns,cols) {
    validateTurns(turns);
    const n=Math.floor(turns/4),u=turns-4*n,part=Math.floor(u),p=u-part,name=part<2?'A':'B';
    const a=phase(cols,'A'),b=phase(a.values,'B'),r=name==='A'?a:b,base=name==='A'?cols:a.values;
    const positions=base.map(digits),warned=zeros(),carried=zeros(),pulse=zeros();
    const active=PAIRS[name].map(pair=>pair[0]);
    if(part%2===0) {
      for(const [t,s] of PAIRS[name]) {
        const src=digits(base[s]);
        for(let i=0;i<DIGITS;i++) {positions[t][i]+=src[i]*p;warned[t][i]=Number(positions[t][i]>=10);}
      }
    } else {
      for(const [t] of PAIRS[name]) {
        positions[t]=r.stage[t].slice();warned[t]=r.warned[t].slice();
        for(let i=0;i<DIGITS;i++) {
          const q=Math.max(0,Math.min(1,p*DIGITS-i));
          positions[t][i]+=r.carried[t][i]*q;
          carried[t][i]=Number(r.carried[t][i]&&q>0);
          pulse[t][i]=r.carried[t][i]?(q>0&&q<1?1:carried[t][i]*0.38):0;
        }
      }
    }
    const current=positions.map(col=>encode(col.map(v=>Math.floor(v)%10)));
    const printN=u>=2?n:(n>0?n-1:null),printed=u>=2?raw(a.values[0]):(n>0?raw(cols[0]):null);
    const exact=config.poly&&printN!==null?polynomial(config.poly,BigInt(config.x0)+BigInt(printN)):null;
    return {turns,cycle:n,u,phase:name,operation:part%2?'carry':'add',progress:p,boundary:isBoundary(turns),active,
      positions,angles:positions.map(col=>col.map(v=>-(v+0.5)*Math.PI*2/10)),digits:current,warned,carried,pulse,
      signed:current.map(signed),printed,printN,theory:exact===null?null:raw(exact),theoryExact:exact===null?null:exact.toString(),
      matches:exact===null?null:raw(exact)===printed,wrapped:exact===null?false:(exact<0n||exact>=MOD),overflow:r.overflow,
      inputMode:config.poly?'polynomial':'direct',caseId:config.id};
  }
  function create(input) {
    const config=normalize(input),cache=new Map();Object.freeze(config.initial);if(config.poly)Object.freeze(config.poly);Object.freeze(config);
    return {config,at(turns){validateTurns(turns);const n=Math.floor(turns/4);if(!cache.has(n)){if(cache.size>16)cache.clear();cache.set(n,boundaryColumns(config.initial,n));}return sample(config,turns,cache.get(n));}};
  }
  function stateAt(config,turns) {return create(config).at(turns);}
  function trace(input) {
    const config=normalize(input);let cols=config.initial.map(BigInt);
    const out={spec_version:'1.0',case:input.id,initial:cols.map(raw),cycles:[]};
    for(let n=0;n<input.cycles;n++) {const a=phase(cols,'A'),b=phase(a.values,'B');out.cycles.push({n,A:a.record,printed:raw(a.values[0]),B:b.record});cols=b.values;}
    return out;
  }
  return {SPEC,COLS,DIGITS,MOD,PAIRS,mod,raw,signed,digits,polynomial,initialFromPolynomial,addition,phase,normalize,boundaryColumns,isBoundary,snap,reconfigure,reset,create,stateAt,trace};
});
