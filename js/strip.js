"use strict";
/* =========================================================
 * ストリップ(リボン)
 * =======================================================*/
const entryRibbon=new Ribbon(STRIP_W-0.01,ENTRY_N,M.strip);
let strandRibbons=[],strandZ=[];
const trimRibbonR=new Ribbon(TRIM_W-0.006,TRIM_N,M.strip),trimRibbonL=new Ribbon(TRIM_W-0.006,TRIM_N,M.strip);
function buildStrands(N){for(const r of strandRibbons)r.dispose();strandRibbons=[];strandZ=[];
  const sw=EFF_W/N;for(let i=0;i<N;i++){strandZ.push(-EFF_W/2+(i+0.5)*sw);strandRibbons.push(new Ribbon(sw-0.014,STRAND_N,M.strip));}}
const TOP=(id)=>{const o=R[id];return V3(o.x,o.y+o.r,0);};
const NIP=(id,zc)=>V3(R[id].x,PL,zc||0);

const _e=[];
function updateEntryRibbon(){const raw=_e;raw.length=0;
  // アンコイラ外周からの接線で払い出し
  const A=R.A,Tt=tangentPoint(UNC_X,UNC_Y,st.ru,A.x,A.y+A.r,+1);
  for(let i=0;i<6;i++){const a=THREE.MathUtils.lerp(Tt.a+0.8,Tt.a,i/5);raw.push(V3(UNC_X+(st.ru+0.004)*Math.cos(a),UNC_Y+(st.ru+0.004)*Math.sin(a),0));}
  raw.push(TOP('A'));raw.push(TOP('B'));raw.push(NIP('C1'));
  raw.push(V3(R['H1-1'].x,PL,0));raw.push(V3(R['H1-3'].x,PL,0));
  raw.push(NIP('J2'));raw.push(V3(R['K1-2'].x,PL,0));
  for(const p of H2pts)raw.push(p.clone());                 // No.1ルーパー垂み
  raw.push(V3(R['K2-2'].x,PL,0));raw.push(NIP('L1'));raw.push(V3(R.M.x,PL,0));raw.push(NIP('N1'));raw.push(TOP('Q'));
  raw.push(V3(SLIT_X,PL,0));
  const out=[];samplePolyline(raw,ENTRY_N,out);entryRibbon.update(out);}

const _sraw=[],_sout=[];
function updateStrandRibbon(rib,zc){const raw=_sraw;raw.length=0;
  raw.push(V3(SLIT_X,PL,zc));
  raw.push(V3(R['R1-1'].x,PL,zc));raw.push(V3(R['R1-5'].x,PL,zc));raw.push(V3(R['S1-2'].x,PL,zc));
  for(const p of R2pts)raw.push(V3(p.x,p.y,zc));            // No.2ルーパー垂み
  raw.push(V3(R['S2-2'].x,PL,zc));raw.push(V3(R.T1.x,PL,zc));
  raw.push(V3(R.V1.x,PL,zc));raw.push(V3(R.W1.x,PL,zc));raw.push(V3(R.X1.x,PL,zc)); // MD/出側ピンチ ニップ
  raw.push(V3(R.Y2.x,R.Y2.y+R.Y2.r,zc));raw.push(V3(R.Y1.x,R.Y1.y-R.Y1.r,zc));     // デフS字
  raw.push(V3(R.Z.x,R.Z.y+R.Z.r,zc));
  const Tt=tangentPoint(REC_X,REC_Y,st.rr,R.Z.x,R.Z.y,-1);  // リコイラ外周へ接線巻取り
  raw.push(V3(Tt.x,Tt.y,zc));
  for(let j=1;j<=4;j++){const a=THREE.MathUtils.lerp(Tt.a,Tt.a-0.7,j/4);raw.push(V3(REC_X+(st.rr+0.004)*Math.cos(a),REC_Y+(st.rr+0.004)*Math.sin(a),zc));}
  _sout.length=0;samplePolyline(raw,STRAND_N,_sout);rib.update(_sout);}

const _tcR=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0,0,0),V3(0,0,0),V3(0,0,0),V3(0,0,0)]);
const _tcL=new THREE.CatmullRomCurve3([V3(0,0,0),V3(0,0,0),V3(0,0,0),V3(0,0,0),V3(0,0,0)]);
function updateTrim(rib,curve,sw,rs){const side=sw.side, z0=(EFF_W/2+TRIM_W/2)*side;
  // スリッター耳 → 側方へドリフト → 屑コイル外周へ接線で自然に横向き巻取り
  const ax=sw.Wx-rs-0.2, ay=PL;
  const Tt=tangentPoint(sw.Wx,sw.Wy,rs, ax,ay, +1);
  curve.points[0].set(SLIT_X,PL,z0);
  curve.points[1].set(0.7,PL,(z0+sw.Wz)/2);
  curve.points[2].set(ax,ay,sw.Wz);
  curve.points[3].set(Tt.x,Tt.y,sw.Wz);
  const a=Tt.a-0.7; curve.points[4].set(sw.Wx+(rs+0.004)*Math.cos(a),sw.Wy+(rs+0.004)*Math.sin(a),sw.Wz);
  rib.update(curve.getPoints(TRIM_N-1));}
