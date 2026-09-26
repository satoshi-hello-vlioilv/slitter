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
const entryTail=new Ribbon(STRIP_W-0.01,ENTRY_N,M.strip);    // 抜取り中: 入側シャーで切った後端側の帯
entryTail.mesh.visible=false;
let strandRibbons=[],strandZ=[],strandW=[],strandCuts=[];
const trimRibbonR=new Ribbon(TRIM_W-0.006,TRIM_N,M.strip),trimRibbonL=new Ribbon(TRIM_W-0.006,TRIM_N,M.strip);
/* 条は刃組の計算(カッター台車と同じ割付 res)の材料の並びから置く — 刃と条がぴたりと合う。
 * 計算の座標は OS端(操作側 +Z)が 0 なので z = (有効長/2 − x)/1000。 */
function buildStrands(){for(const r of strandRibbons)r.dispose();strandRibbons=[];strandZ=[];strandW=[];strandCuts=[];
  const c=KC.D3.ctx, A=c.res.A, zOf=x=>(A.arborLen/2-x)/1000;
  for(const r of WL.bladeSet.materialRun(A,c.res.segs)){if(r.sg.type!=="strip")continue;
    if(!strandCuts.length)strandCuts.push(zOf(r.from));
    strandCuts.push(zOf(r.to));strandZ.push(zOf((r.from+r.to)/2));strandW.push((r.to-r.from)/1000);
    strandRibbons.push(new Ribbon(strandW[strandW.length-1]-STRAND_GAP,STRAND_N,M.strip));}   // 隙間=スリット代のみ
  updateShapeProfile();}

/* =========================================================
 * 通板状態(刃替え段取り)
 * =========================================================
 * カッター台車を出し入れするには帯板を抜かなければならない(ギヤボックスが
 * パスラインを横切る)。抜取り = 入側シャーで切り、後端をリコイラ/屑巻取機へ
 * 巻き切る。通板 = 入側シャーから先端をリコイラまで通す(ループテーブルは閉)。
 * 帯の見え方は「入側シャーから測った後端/先端の距離 s」で切り出す。 */
const SHEAR_X=-8.26;                          // 入側シャーの刃(切断位置)
const THREAD_V=4.0;                           // 先端/後端の走行速度(可視) [m/s]
const thread={mode:null,s:0,tail:0,need:0};   // mode: null / "out"(抜取り中) / "in"(通板中)
/* コイル交換: 出側ピンチ(X1)で切った条。on の間は X1 から head[m] 先までだけ見せる(0 = X1 で切れている)。
 * need = X1 から巻取り点までの最長(通し直しの終わり)。threading の間はロールも寸動速度で回す。 */
const exitCut={on:false,head:0,need:0,threading:false};
function clipRange(len,off){                  // 入側シャーより下流の帯の見える区間 [a,b](区間の頭からの距離)
  if(thread.mode==="out"){const a=thread.s-off;return a<len?[Math.max(0,a),len]:null;}
  if(thread.mode==="in"){const b=thread.s-off;return b>0?[0,Math.min(len,b)]:null;}
  return st.thread?[0,len]:null;}

/* =========================================================
 * 板形状(歪)による条毎の伸び差
 * =========================================================
 * 圧延材の平坦度不良は幅方向の「長さの差」そのもの。スリット前は1枚なので
 * 内部応力として釣り合っているが、条に切り離した瞬間に各条は自分の固有長さで
 * 走り出す。全条は同じMDロールで送られ同じマンドレルに巻かれる(=線速度は共通)
 * ため、長い条ほど余った長さがNo.2ルーパーに溜まり続け、巻くほどループ深さの
 * 幅方向差が開いていく。中伸び(中出)材ならセンター条ほど深く垂れる。
 *   平坦度 1 I-unit = 相対伸び 1e-5
 * 基準は「最も短い条」= その条だけがピンと張った状態でループ深さは設定値のまま、
 * 他の条はその差だけ余長を持つ、という実機の見え方に合わせている。 */
function shapeProfile(u){          // u: 幅方向の正規化位置 (-1=耳 … 0=センター … +1=耳)
  switch(st.shape){
    case "center":  return 1-u*u;                       // 中伸び(中出) — センターが長い
    // 骨ひずみ(1/4伸び) — 中間が長い。|u|=0.55付近を頂点とする山(左右対称だが
    // センターと耳の中間に寄る)。sin²のような0.5対称の山だと4条時に全条が同値に
    // なって差が消えるため、頂点を0.55へずらした釣鐘形にしてある。
    case "quarter": return Math.exp(-Math.pow((Math.abs(u)-0.55)/0.22,2));
    case "edge":    return u*u;                         // 耳伸び — 両耳が長い
    default:        return 0;                           // 平坦
  }}
let strandEps=[];                  // 条毎の相対伸び(最短条を0とした差分)
function updateShapeProfile(){
  const A=st.shapeI*1e-5;
  strandEps=strandZ.map(z=>shapeProfile(2*z/EFF_W)*A);
  const mn=strandEps.length?Math.min.apply(null,strandEps):0;
  strandEps=strandEps.map(e=>e-mn);}
const strandSlack=(i)=>(strandEps[i]||0)*st.lenCoil*lenScale();   // 条iの余長[m](実長換算)
const TOP=(id)=>{const o=R[id];return V3(o.x,o.y+o.r,0);};
const BOTTOM=(id)=>{const o=R[id];return V3(o.x,o.y-o.r,0);};
const NIP=(id,zc)=>V3(R[id].x,PL,zc||0);

/* ルーパー区間の経路(開閉式テーブル対応):
 *  開度k→ループ深さd。d≈0(テーブル閉)は端ロール間をロール上面=PLの平坦通板。
 *  d>0はテーブル退避後の完全フリー自重ループ: 固定端ロールへの巻付き弧+放物線垂み
 *  のみで構成し、途中のロールには一切触れない。
 *  extra は条毎の余長[m]。垂み d の放物線ループの弧長は
 *      s(d) = (L/2)·√(1+a²) + (L/2a)·asinh(a)      a = 4d/L
 *  なので、s(d) = s(d0)+extra を満たす d を二分法で解けば「溜まった余長がそのまま
 *  深さになる」。浅いうちは d∝√extra、深くなると d→(L+extra)/2 の直線的な伸びに移る。 */
function loopArc(L,d){const a=4*d/L;return 0.5*L*Math.sqrt(1+a*a)+L/(2*a)*Math.asinh(a);}
function loopDepth(lp,k,extra){
  const d0=lp.depth*THREE.MathUtils.clamp((k-0.3)/0.7,0,1);  // テーブル退避(k<0.35)後に垂み成長
  if(d0<0.02||!extra)return d0;
  const L=R[lp.outR].x-R[lp.inR].x, tgt=loopArc(L,d0)+extra;
  if(loopArc(L,LOOP_DMAX)<=tgt)return LOOP_DMAX;             // ピット深さで頭打ち
  let lo=d0,hi=LOOP_DMAX;
  for(let i=0;i<26;i++){const mid=(lo+hi)/2;if(loopArc(L,mid)<tgt)lo=mid;else hi=mid;}
  return (lo+hi)/2;}
function looperPath(lp,k,raw,zc,extra){
  const A=R[lp.inR],Bv=R[lp.outR];
  const d=loopDepth(lp,k,extra);
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
  raw.push(V3(R['H1-1'].x,PL,0));raw.push(V3(R['H1-2'].x,PL,0));
  raw.push(V3(R['K1-2'].x,PL,0));
  looperPath(LOOP1,st.loop1,raw,0);                          // No.1ルーパー(開閉式・フリーループ/平坦)
  raw.push(V3(R['K2-2'].x,PL,0));raw.push(NIP('L1'));raw.push(NIP('N1'));
  raw.push(V3(SLIT_X,PL,0));                                 // ガイドP上面/板押えQ下面は面一で接触(曲げ無し)
  // 入側シャー位置までの長さ(シャーより下流は単調にx増加)
  let sShear=0;
  for(let i=0;i<raw.length-1;i++){const a=raw[i],b=raw[i+1],l=a.distanceTo(b);
    if(a.x<=SHEAR_X&&b.x>SHEAR_X){sShear+=l*(SHEAR_X-a.x)/(b.x-a.x);break;}sShear+=l;}
  const sEnd=polyLength(raw);thread.tail=sEnd-sShear;
  const cut=[],out=[];
  if(!thread.mode&&st.thread){samplePolyline(raw,ENTRY_N,out);entryRibbon.update(out);entryTail.mesh.visible=false;return;}
  const head=thread.mode==="in"?Math.min(sEnd,sShear+thread.s):sShear;   // 上流側の帯(コイル → シャー/先端)
  clipPolyline(raw,0,head,cut);samplePolyline(cut,ENTRY_N,out);entryRibbon.update(out);
  const r=thread.mode==="out"?clipRange(thread.tail,0):null;            // 抜取り中の後端側
  entryTail.mesh.visible=!!r&&r[1]-r[0]>0.01;
  if(entryTail.mesh.visible){clipPolyline(raw,sShear+r[0],sShear+r[1],cut);out.length=0;
    samplePolyline(cut,ENTRY_N,out);entryTail.update(out);}}

/* 出側テール: X1ニップ→デフY2上面→Y1下面→テールキャッチャーZ上面→リコイラ外周。
 * 全区間を接線+巻付き弧で構成する。Zは約25°の方向転換があり、極点1点で結ぶと
 * 弦がロール肩を~10mm切り取るため、Y1→Z→リコイラも共通接線で結ぶ。
 * X1も同様: ニップを出た帯はデフへ約20°立ち上がるので、上ロールX1の下面へ
 * 巻き付いてから接線に移る(ニップ点から直に接線を引くとX1の肩を削ってしまう)。 */
function tailPoints(zc){
  const cX1={x:R.X1.x,y:R.X1.y,r:R.X1.r+0.002};
  const cY2={x:R.Y2.x,y:R.Y2.y,r:R.Y2.r+0.006}, cY1={x:R.Y1.x,y:R.Y1.y,r:R.Y1.r+0.006};
  const cZ={x:R.Z.x,y:R.Z.y,r:R.Z.r+0.006}, cRec={x:REC_X,y:REC_Y,r:st.rr+0.004};
  const t0=tangentBetween(cX1,'bottom',cY2,'top');           // X1下面 → Y2上面
  const m1=tangentBetween(cY2,'top',cY1,'bottom');
  let m2=tangentBetween(cY1,'bottom',cZ,'top');
  const m3=tangentBetween(cZ,'top',cRec,'top');
  // Zに触れるのは、Y1からの入りの接点から出の接点まで上面を時計回りに巻くときだけ。
  // マンドレルがパスラインより高いので、巻径が大きいうちは帯はZの上を素通りする。
  let dz=m2.t2.a-m3.t1.a;while(dz>Math.PI)dz-=2*Math.PI;while(dz<-Math.PI)dz+=2*Math.PI;
  const touchZ=dz>0;
  if(!touchZ)m2=tangentBetween(cY1,'bottom',cRec,'top');     // Y1下面 → リコイラ上面(Z非接触)
  const pts=[];
  for(const p of arcPoints(cX1.x,cX1.y,cX1.r,-Math.PI/2,t0.t1.a,5))pts.push(p);   // X1巻付き(ニップ→接線)
  for(const p of arcPoints(cY2.x,cY2.y,cY2.r,t0.t2.a,m1.t1.a,8))pts.push(p);
  for(const p of arcPoints(cY1.x,cY1.y,cY1.r,m1.t2.a,m2.t1.a,8))pts.push(p);
  if(touchZ)for(const p of arcPoints(cZ.x,cZ.y,cZ.r,m2.t2.a,m3.t1.a,6))pts.push(p);
  const aRec=touchZ?m3.t2.a:m2.t2.a;
  for(const p of arcPoints(cRec.x,cRec.y,cRec.r,aRec,aRec-0.7,7))pts.push(p); // リコイラ巻付き
  for(const p of pts)p.z=zc;
  return pts;}

const _sraw=[],_sout=[],_sclip=[];
function updateStrandRibbon(rib,zc,idx){const raw=_sraw;raw.length=0;
  raw.push(V3(SLIT_X,PL,zc));
  raw.push(V3(R['R1-1'].x,PL,zc));raw.push(V3(R['R1-5'].x,PL,zc));raw.push(V3(R['S1-2'].x,PL,zc));
  // No.2ルーパーは条毎に深さが違う(形状不良による伸び差が余長として溜まるため)
  looperPath(LOOP2,st.loop2,raw,zc,strandSlack(idx));
  raw.push(V3(R['S2-2'].x,PL,zc));raw.push(V3(R.T1.x,PL,zc));
  raw.push(V3(R.V1.x,PL,zc));raw.push(V3(R.W1.x,PL,zc));raw.push(V3(R.X1.x,PL,zc)); // MD/出側ピンチ ニップ
  const sX1=exitCut.on?polyLength(raw):0;                    // コイル交換で切る位置(X1 ニップ)
  for(const p of tailPoints(zc))raw.push(p);                 // デフS字→Z→リコイラ(接線・巻付き弧)
  const len=polyLength(raw), r=clipRange(len,thread.tail);
  thread.need=Math.max(thread.need,thread.tail+len);
  if(exitCut.on&&r){exitCut.need=Math.max(exitCut.need,len-sX1);r[1]=Math.min(r[1],sX1+exitCut.head);}
  rib.mesh.visible=!!r&&r[1]-r[0]>0.01;if(!rib.mesh.visible)return;
  const src=(r[0]>0||r[1]<len)?(clipPolyline(raw,r[0],r[1],_sclip),_sclip):raw;
  _sout.length=0;samplePolyline(src,STRAND_N,_sout);rib.update(_sout);}

const _traw=[],_twv=[],_toutP=[],_toutW=[],_tcP=[],_tcW=[];
/* 耳屑の経路(立軸ワインダー方式) — 3区間で構成する。
 *  ① 立面(XY面)   : 分離点 → SG1(下面接触)で振り上げ → SG2(上面接触)の頂点で水平化。
 *                    耳屑側の最外刃が下刃なら、屑は下刃の頂点に乗って PL+6mm から上がる。
 *                    上刃なら屑は上刃に押し下げられているので、刃の縁に沿って巻き
 *                    (上刃とSG1の共通接線まで)から上がる = どちらでも丸刃を突き抜けない。
 *                    どちらになるかは刃組(千鳥の最外条のバリ向き)が決める。
 *  ② ねじり区間   : 高さHTWの水平直線を進みながら、幅方向を Z(水平)→ Y(垂直)へ90°ひねる。
 *                    長さ0.81m ≒ 屑幅の16倍で、実機の目安(幅の8~10倍以上)を満たす。
 *  ③ 水平面(XZ面) : VG1 → VG2 → 屑コイル。全ての円の中心が進行方向の左側に来る
 *                    「同一回転方向のチェーン」。共通接線は
 *                       θ = φ - asin((r_next - r_cur)/ρ)          (φ:中心間方位, ρ:中心間距離)
 *                    接点は中心から θ-90° の方向 → 接線と巻付き弧だけで経路が閉じ、
 *                    巻径が0.13→0.42mに育っても接線側・巻付き方向は変わらない。
 * 幅方向ベクトルも点ごとに持たせてリボンへ渡すので、ひねりが実際の面として描かれる。 */
function updateTrim(rib,sw,rs){
  const s=sw.side, zt=s*ZTRIM, raw=_traw, wv=_twv;
  raw.length=0;wv.length=0;
  const put=(p,w)=>{raw.push(p);wv.push(w);};
  // ---- ① 立面(XY面): 分離点 → SG1下面 → SG2上面 ----
  const c1={x:SG1.x,y:SG1.y,r:SGR+0.006}, c2={x:SG2.x,y:SG2.y,r:SGR+0.006};
  const t12=tangentBetween(c1,'bottom',c2,'top');                     // SG1下面→SG2上面(内接線)
  const kg=KC.geom(), upper=kg&&(s>0?kg.osUpper:kg.dsUpper);
  let a1;
  if(upper){                                                          // 最外刃=上刃: 刃の縁に沿ってから上がる
    const ck={x:SLIT_X,y:PL+kg.yU,r:kg.knifeR+0.004};
    const tk=tangentBetween(ck,'bottom',c1,'bottom');                 // 上刃の下 → SG1下面(外接線)
    for(const p of arcPoints(ck.x,ck.y,ck.r,-Math.PI/2,tk.t1.a,5)){p.z=zt;put(p,Z_AXIS);}
    a1=tk.t2.a;
  }else{                                                              // 最外刃=下刃: 刃の頂点に乗って上がる
    const tIn=tangentToSide(c1.x,c1.y,c1.r,'bottom',SLIT_X,PL+0.006); // 分離点→SG1下面の接点
    put(V3(SLIT_X,PL+0.006,zt),Z_AXIS);a1=tIn.a;}
  for(const p of arcPoints(c1.x,c1.y,c1.r,a1,t12.t1.a,6)){p.z=zt;put(p,Z_AXIS);}
  for(const p of arcPoints(c2.x,c2.y,c2.r,t12.t2.a,Math.PI/2,7)){p.z=zt;put(p,Z_AXIS);} // 頂点=水平で離れる
  // ---- ② ねじり区間(水平直線・幅方向 Z→Y) ----
  for(let j=1;j<TWIST_N;j++){const t=j/TWIST_N,a=t*Math.PI/2;
    put(V3(THREE.MathUtils.lerp(c2.x,VG1.x,t),HTW,zt),V3(0,Math.sin(a),Math.cos(a)));}
  // ---- ③ 水平面(XZ面): VG1 → VG2 → 屑コイル(左巻きチェーン) ----
  const ch=[{x:VG1.x,u:VG1.u,r:VGR+0.006},{x:VG2.x,u:VG2.u,r:VGR+0.006},{x:WND.x,u:WND.u,r:rs+0.004}];
  let th=0;                                                           // ねじり区間の進行方向(+X)
  for(let i=0;i<ch.length;i++){const c=ch[i],a0=th-Math.PI/2;let a1;
    if(i<ch.length-1){const d=ch[i+1],dx=d.x-c.x,du=d.u-c.u,rho=Math.hypot(dx,du);
      th=Math.atan2(du,dx)-Math.asin(THREE.MathUtils.clamp((d.r-c.r)/rho,-1,1));a1=th-Math.PI/2;}
    else a1=a0+1.15;                                                  // ドラム巻付き弧(約66°)
    const n=(i<ch.length-1)?8:14;
    for(let k=0;k<n;k++){const a=a0+(a1-a0)*k/(n-1);
      put(V3(c.x+c.r*Math.cos(a),HTW,s*(c.u+c.r*Math.sin(a))),Y_AXIS);}}
  const len=polyLength(raw), r=clipRange(len,thread.tail);
  thread.need=Math.max(thread.need,thread.tail+len);
  rib.mesh.visible=!!r&&r[1]-r[0]>0.01;if(!rib.mesh.visible)return;
  let P=raw,W=wv;
  if(r[0]>0||r[1]<len){clipPolyline(raw,r[0],r[1],_tcP,wv,_tcW);P=_tcP;W=_tcW;}
  _toutP.length=0;_toutW.length=0;
  samplePathFrames(P,W,TRIM_N,_toutP,_toutW);
  rib.update(_toutP,_toutW);}
