"use strict";
/* =========================================================
 * ストリップ(リボン)
 *
 * 構築原理(張力下の帯板の物理):
 *  1. 帯板は「直線(接線)区間」と「ロール外周への巻付き弧」だけで構成される。
 *  2. 各接触点で経路の曲がる向きは巻付き側と一致する:
 *     上面接触 = 下向きに曲がる / 下面接触 = 上向きに曲がる。
 *     唯一の例外はルーパーピット内で、自重により帯板がテーブルロール上面に
 *     載って垂れる(凹上)区間。
 *  3. 方向転換の大きい接触(コイル・スナバーA・ベンドB・デフY)は必ず
 *     接線点+巻付き弧で結ぶ。単一点で結ぶと弦がロール内部を切り「貫通」する。
 *  4. 弧・接線はロール半径+数mmのオフセット面で統一的に計算し、
 *     リサンプリングの弦近似がロール面に沈まないようにする。
 * =======================================================*/
const entryRibbon=new Ribbon(STRIP_W-0.01,ENTRY_N,M.strip);
let strandRibbons=[],strandZ=[];
const trimRibbonR=new Ribbon(TRIM_W-0.006,TRIM_N,M.strip),trimRibbonL=new Ribbon(TRIM_W-0.006,TRIM_N,M.strip);
function buildStrands(N){for(const r of strandRibbons)r.dispose();strandRibbons=[];strandZ=[];
  const sw=EFF_W/N;for(let i=0;i<N;i++){strandZ.push(-EFF_W/2+(i+0.5)*sw);strandRibbons.push(new Ribbon(sw-0.014,STRAND_N,M.strip));}}
const TOP=(id)=>{const o=R[id];return V3(o.x,o.y+o.r,0);};
const BOTTOM=(id)=>{const o=R[id];return V3(o.x,o.y-o.r,0);};
const NIP=(id,zc)=>V3(R[id].x,PL,zc||0);

/* ルーパー区間の経路(開閉式テーブル対応):
 *  開度k→ループ深さd。d≈0(テーブル閉)は端ロール間をロール上面=PLの平坦通板。
 *  d>0はテーブル退避後の完全フリー自重ループ: 固定端ロールへの巻付き弧+放物線垂み
 *  のみで構成し、途中のロールには一切触れない。 */
function looperPath(lp,k,raw,zc){
  const A=R[lp.inR],Bv=R[lp.outR];
  const d=lp.depth*THREE.MathUtils.clamp((k-0.3)/0.7,0,1);   // テーブル退避(k<0.35)後に垂み成長
  if(d<0.02){raw.push(V3(A.x,PL,zc));raw.push(V3(Bv.x,PL,zc));return;}
  const rr=A.r+0.006, L=Bv.x-A.x;
  const m=4*d/L, phi=Math.atan(m);
  const dxo=rr*Math.sin(phi), L2=L-2*dxo, y0=A.y+rr*Math.cos(phi), depth2=m*L2/4;
  for(let j=0;j<=6;j++){const a=Math.PI/2-phi*j/6;raw.push(V3(A.x+rr*Math.cos(a),A.y+rr*Math.sin(a),zc));}   // 入側端ロール巻付き弧
  for(let i=1;i<26;i++){const u=i/26;raw.push(V3(A.x+dxo+u*L2,y0-depth2*4*u*(1-u),zc));}                     // フリーループ(自重垂み)
  for(let j=6;j>=0;j--){const a=Math.PI/2-phi*j/6;raw.push(V3(Bv.x-rr*Math.cos(a),Bv.y+rr*Math.sin(a),zc));} // 出側端ロール巻付き弧
}

const _e=[];
function updateEntryRibbon(){const raw=_e;raw.length=0;
  const A=R.A,B=R.B;
  // コイル→スナバーA上面→ベンドB下面(S掛け)→入側ピンチニップ。
  // すべて接線+巻付き弧: Aでは約20°方向転換するため、単一点接触では弦が
  // ロール右肩を10mm以上切り取ってしまう(旧実装の貫通の正体)。
  const cCoil={x:UNC_X,y:UNC_Y,r:st.ru+0.004};
  const cA={x:A.x,y:A.y,r:A.r+0.006}, cB={x:B.x,y:B.y,r:B.r+0.006};
  const tCA=tangentBetween(cCoil,'top',cA,'top');            // コイル上面→A上面(外接線)
  const tAB=tangentBetween(cA,'top',cB,'bottom');            // A上面→B下面(内接線)
  const tBC=tangentToSide(cB.x,cB.y,cB.r,'bottom',R.C1.x,PL);// B下面→C1ニップ
  for(const p of arcPoints(cCoil.x,cCoil.y,cCoil.r,tCA.t1.a+0.8,tCA.t1.a,8))raw.push(p); // コイル巻出し弧
  for(const p of arcPoints(cA.x,cA.y,cA.r,tCA.t2.a,tAB.t1.a,7))raw.push(p);              // A巻付き弧
  for(const p of arcPoints(cB.x,cB.y,cB.r,tAB.t2.a,tBC.a,7))raw.push(p);                 // B巻付き弧
  raw.push(NIP('C1'));
  // ラフレベラー: 上下ロールが30mm食い違って(インターリーブ)いるためジグザグ通板
  raw.push(TOP('D1'));raw.push(TOP('E2-1'));raw.push(BOTTOM('E1-1'));raw.push(TOP('E2-2'));
  raw.push(BOTTOM('E1-2'));raw.push(TOP('E2-3'));raw.push(TOP('D2'));
  // ループ前ピンチJ群はニップ面=パスラインなので直線通板(面一接触・曲げ無し)
  raw.push(V3(R['H1-1'].x,PL,0));raw.push(V3(R['H1-3'].x,PL,0));
  raw.push(V3(R['K1-2'].x,PL,0));
  looperPath(LOOP1,st.loop1,raw,0);                          // No.1ルーパー(開閉式・フリーループ/平坦)
  raw.push(V3(R['K2-2'].x,PL,0));raw.push(NIP('L1'));raw.push(V3(R.M.x,PL,0));raw.push(NIP('N1'));
  raw.push(V3(SLIT_X,PL,0));                                 // ガイドP上面/板押えQ下面は面一で接触(曲げ無し)
  const out=[];samplePolyline(raw,ENTRY_N,out);entryRibbon.update(out);}

/* 出側テール: X1ニップ→デフY2上面→Y1下面→テールキャッチャーZ上面→リコイラ外周。
 * 全区間を接線+巻付き弧で構成する。Zは約25°の方向転換があり、極点1点で結ぶと
 * 弦がロール肩を~10mm切り取るため、Y1→Z→リコイラも共通接線で結ぶ。 */
function tailPoints(zc){
  const cY2={x:R.Y2.x,y:R.Y2.y,r:R.Y2.r+0.006}, cY1={x:R.Y1.x,y:R.Y1.y,r:R.Y1.r+0.006};
  const cZ={x:R.Z.x,y:R.Z.y,r:R.Z.r+0.006}, cRec={x:REC_X,y:REC_Y,r:st.rr+0.004};
  const tin=tangentToSide(cY2.x,cY2.y,cY2.r,'top',R.X1.x,PL);
  const m1=tangentBetween(cY2,'top',cY1,'bottom');
  const m2=tangentBetween(cY1,'bottom',cZ,'top');
  const m3=tangentBetween(cZ,'top',cRec,'top');
  const pts=[];
  for(const p of arcPoints(cY2.x,cY2.y,cY2.r,tin.a,m1.t1.a,8))pts.push(p);
  for(const p of arcPoints(cY1.x,cY1.y,cY1.r,m1.t2.a,m2.t1.a,8))pts.push(p);
  for(const p of arcPoints(cZ.x,cZ.y,cZ.r,m2.t2.a,m3.t1.a,6))pts.push(p);
  for(const p of arcPoints(cRec.x,cRec.y,cRec.r,m3.t2.a,m3.t2.a-0.7,7))pts.push(p); // リコイラ巻付き
  for(const p of pts)p.z=zc;
  return pts;}

const _sraw=[],_sout=[];
function updateStrandRibbon(rib,zc){const raw=_sraw;raw.length=0;
  raw.push(V3(SLIT_X,PL,zc));
  raw.push(V3(R['R1-1'].x,PL,zc));raw.push(V3(R['R1-5'].x,PL,zc));raw.push(V3(R['S1-2'].x,PL,zc));
  looperPath(LOOP2,st.loop2,raw,zc);                         // No.2ルーパー(開閉式・フリーループ/平坦)
  raw.push(V3(R['S2-2'].x,PL,zc));raw.push(V3(R.T1.x,PL,zc));
  raw.push(V3(R.V1.x,PL,zc));raw.push(V3(R.W1.x,PL,zc));raw.push(V3(R.X1.x,PL,zc)); // MD/出側ピンチ ニップ
  for(const p of tailPoints(zc))raw.push(p);                 // デフS字→Z→リコイラ(接線・巻付き弧)
  _sout.length=0;samplePolyline(raw,STRAND_N,_sout);rib.update(_sout);}

const _traw=[];
function updateTrim(rib,sw,rs){const side=sw.side, z0=(EFF_W/2+TRIM_W/2)*side;
  // スリッター出側で分離した耳は、自由区間の「直線」で横ドリフトしながら
  // 屑コイル外周への接線点まで進み、そこから巻付き弧で巻き取られる。
  // (旧実装のCatmullRomスプラインは制御点でx方向が反転しループ状に自己交差
  //  していた — スプラインを廃し、接線直線+弧のみで構成する)
  const rw=rs+0.004;
  const Tt=tangentPoint(sw.Wx,sw.Wy,rw,SLIT_X,PL,-1);        // 分離点→屑コイル上面接点
  const raw=_traw;raw.length=0;
  for(let j=0;j<=8;j++){const t=j/8;                          // 自由区間: 3D直線(z0→Wzへ単調ドリフト)
    raw.push(V3(THREE.MathUtils.lerp(SLIT_X,Tt.x,t),THREE.MathUtils.lerp(PL,Tt.y,t),THREE.MathUtils.lerp(z0,sw.Wz,t)));}
  for(let j=1;j<=10;j++){const a=Tt.a-0.9*j/10;               // 巻付き弧(コイル幅面 z=Wz)
    raw.push(V3(sw.Wx+rw*Math.cos(a),sw.Wy+rw*Math.sin(a),sw.Wz));}
  const out=[];samplePolyline(raw,TRIM_N,out);rib.update(out);}
