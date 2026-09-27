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
 *  5. 材料力学(mech.js)を経路へ入れる:
 *     ・ロール間の自由スパンは、その区間の張力で自重たわみさせる(通板中は張力ゼロの梁)。
 *     ・ループは重い弾性線(曲げ剛性・自重・反り)の形。入口/出口では帯がループの重みで
 *       台のロールから持ち上がる(シーソー)。薄板はカテナリーに近く、厚板は緩い U 字になる。
 *     ・通板/抜取り中の先端・後端は最後の支点からの片持ち(自重の垂れ + 反り)。
 *       ガイド(実機のエプロン・ガイド板)の範囲で抑え、次のロールへは漏斗状に導く。
 *     ・入側の帯は板形状の圧縮域に板波、条・耳屑の切り口にはバリ(どちらも誇張して描く)。
 *     ・応力コンター: 張力 + 残留応力(膜応力)/ 曲げを含む表面応力 を頂点色で。
 * =======================================================*/
const ENTRY_COLS=13;                                 // 入側の帯の幅方向の列(板波・応力の色)
const entryRibbon=new Ribbon(STRIP_W-0.01,ENTRY_N,M.strip,{cols:ENTRY_COLS});
const entryTail=new Ribbon(STRIP_W-0.01,ENTRY_N,M.strip,{cols:ENTRY_COLS});    // 抜取り中: 入側シャーで切った後端側の帯
entryTail.mesh.visible=false;
let strandRibbons=[],strandZ=[],strandW=[],strandCuts=[],strandBurr=[];
const loop2Info=[];                                          // 条ごとのNo.2ループ(深さ・端の力)
// 耳屑: 切り口(条の側)にだけバリ。OS(+Z)の耳屑は −w 側、DS の耳屑は +w 側が切り口
const trimRibbonR=new Ribbon(TRIM_W-0.006,TRIM_N,M.strip,{lips:1,lipMat:M.burr}),
      trimRibbonL=new Ribbon(TRIM_W-0.006,TRIM_N,M.strip,{lips:2,lipMat:M.burr});
const trimBurr={os:"up",ds:"up"};
const oppBurr=b=>b==="down"?"up":"down";
/* 条は刃組の計算(カッター台車と同じ割付 res)の材料の並びから置く — 刃と条がぴたりと合う。
 * 計算の座標は OS端(操作側 +Z)が 0 なので z = (有効長/2 − x)/1000。
 * バリの向きも刃組の答え(条ごとの burr: down = 下バリ / up = 上バリ)。耳屑は隣の条の逆。 */
function buildStrands(){for(const r of strandRibbons)r.dispose();strandRibbons=[];strandZ=[];strandW=[];strandCuts=[];strandBurr=[];loop2Info.length=0;
  const c=KC.D3.ctx, A=c.res.A, segs=c.res.segs, zOf=x=>(A.arborLen/2-x)/1000;
  for(const r of WL.bladeSet.materialRun(A,segs)){if(r.sg.type!=="strip")continue;
    if(!strandCuts.length)strandCuts.push(zOf(r.from));
    strandCuts.push(zOf(r.to));strandZ.push(zOf((r.from+r.to)/2));strandW.push((r.to-r.from)/1000);strandBurr.push(r.sg.burr);
    strandRibbons.push(new Ribbon(strandW[strandW.length-1]-STRAND_GAP,STRAND_N,M.strip,{lips:3,lipMat:M.burr}));}   // 隙間=スリット代のみ
  if(segs.length){trimBurr.os=oppBurr(segs[0].burr);trimBurr.ds=oppBurr(segs[segs.length-1].burr);}
  applyStripMaterial();updateShapeProfile();}

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
 * 他の条はその差だけ余長を持つ、という実機の見え方に合わせている。
 * 条の中に残る伸び差は条の横曲がり(キャンバー)になる: 曲率 = (両端の伸びの差)/条幅。 */
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
let strandEps=[],strandCamber=[];  // 条毎の相対伸び(最短条を0とした差分)/ 横曲がりの曲率[1/m]
function updateShapeProfile(){
  const A=st.shapeI*1e-5;
  strandEps=strandZ.map(z=>shapeProfile(2*z/EFF_W)*A);
  const mn=strandEps.length?Math.min.apply(null,strandEps):0;
  strandEps=strandEps.map(e=>e-mn);
  strandCamber=strandZ.map((z,i)=>{const h=strandW[i]/2;
    return (shapeProfile(2*(z+h)/EFF_W)-shapeProfile(2*(z-h)/EFF_W))*A/strandW[i];});}
const strandSlack=(i)=>(strandEps[i]||0)*st.lenCoil*lenScale();   // 条iの余長[m](実長換算)

/* =========================================================
 * 帯の経路(点列 + 点ごとの属性)
 * ---------------------------------------------------------
 *   k: 曲げ曲率(+ = 帯の法線側 = 上面側へ凹)/ tau: その点から次の点までの張力(幅 1m あたり N/m)
 *   sup: 支点(ロール上面・ニップ・巻付き弧)/ span: 前の点からこの点までが自由スパン(自重で撓ませる)
 *   nw: 板波を出さない(ロール上・ループ)/ rr: 支点のロール半径(通板ガイドの深さに使う)
 *   w: 幅方向(耳屑のねじり区間だけ持つ)
 * finish() が自由スパンへ撓みの点を足し、累積長と支点の位置(通板の片持ちの根元)を出す。
 * =======================================================*/
/* 自由スパンの撓みの形(スパン長・自重の法線成分・張力が同じなら同じ形 — 条どうしで共有する) */
const _sagCache=new Map();
function sagProfile(L,qn,tau){const key=L.toFixed(4)+"|"+qn.toFixed(3)+"|"+tau.toFixed(2);let o=_sagCache.get(key);
  if(!o){const S=MECH.S,D=S.D,m=Math.min(40,Math.max(2,Math.ceil(L/0.05)));o={m,v:new Float64Array(m),k:new Float64Array(m)};
    for(let j=1;j<m;j++){const x=L*j/m;o.v[j]=-MECH.sagAt(x,L,qn,tau,D);o.k[j]=-MECH.sagCurv(x,L,qn,tau,D);}
    if(_sagCache.size>600)_sagCache.clear();_sagCache.set(key,o);}
  return o;}
MECH.onChange(()=>_sagCache.clear());
class StripPath{
  constructor(frames){this.frames=!!frames;this.T=0;this.zc=0;this.mark={};this.pool=[];this.pi=0;
    this.a=this._arr();this.b=this._arr();this._use(this.a);this.L=[];this.st=[];this.sr=[];}
  _arr(){return{p:[],k:[],tau:[],sup:[],span:[],nw:[],rr:[],w:this.frames?[]:null};}
  _use(o){this.cur=o;this.p=o.p;this.k=o.k;this.tau=o.tau;this.sup=o.sup;this.span=o.span;this.nw=o.nw;this.rr=o.rr;this.w=o.w;}
  _clear(o){o.p.length=0;o.k.length=0;o.tau.length=0;o.sup.length=0;o.span.length=0;o.nw.length=0;o.rr.length=0;if(o.w)o.w.length=0;}
  reset(zc){if(this.cur!==this.a)this._use(this.a);this._clear(this.a);this.zc=zc||0;this.T=0;this.mark={};this.pi=0;return this;}
  vec(x,y,z){let v=this.pool[this.pi];if(!v){v=new THREE.Vector3();this.pool.push(v);}this.pi++;return v.set(x,y,z);}
  tension(T){this.T=T;return this;}
  add(x,y,k,sup,span,r,w,nw){this.p.push(this.vec(x,y,this.zc));this.k.push(k||0);this.tau.push(this.T);this.sup.push(sup?1:0);
    this.span.push(span?1:0);this.nw.push(nw?1:0);this.rr.push(r||0);if(this.w)this.w.push(w||Z_AXIS);return this;}
  line(x,y,r,sup){return this.add(x,y,0,sup!==false,true,r,null,0);}          // 直線の自由スパンの終点(支点)
  curve(x,y,k,w){return this.add(x,y,k,false,false,0,w,1);}                     // 曲線の途中の点
  /* 巻付き弧(a0→a1 の短い方の回り): sgn = +1 下面巻き(帯の上面側へ凹)/ −1 上面巻き。
     最初の点は前の点からの直線スパンの終点(first = true なら経路の始まり) */
  arc(cx,cy,r,a0,a1,n,sgn,first,w,z){let d=a1-a0;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
    for(let k=0;k<n;k++){const a=a0+d*k/(n-1);this.add(cx+r*Math.cos(a),cy+r*Math.sin(a),sgn/r,true,k===0&&!first,r,w,1);
      if(z!=null)this.p[this.p.length-1].z=z;}
    return this;}
  /* 傾き0どうしの3次曲線(レベラーのロール間の弾性線 y = Δ(3u² − 2u³))。終点は支点 */
  hermite(x0,y0,x1,y1,n,kEnd,rEnd){const L=x1-x0,d=y1-y0;
    for(let j=1;j<n;j++){const u=j/n;this.curve(x0+L*u,y0+d*(3*u*u-2*u*u*u),d*(6-12*u)/(L*L));}
    return this.add(x1,y1,kEnd||0,true,false,rEnd,null,1);}
  finish(){const S=MECH.S,q=S.q,src=this.cur,dst=src===this.a?this.b:this.a,n0=src.p.length;this._clear(dst);
    const P=dst.p,K=dst.k,T=dst.tau,SU=dst.sup,NW=dst.nw,RR=dst.rr,W=dst.w,sp=dst.span,map=this._map||(this._map=[]);map.length=n0;
    for(let i=0;i<n0;i++){
      if(i>0&&src.span[i]){const A=src.p[i-1],B=src.p[i],L=A.distanceTo(B);
        if(L>0.12){const tx=(B.x-A.x)/L,ty=(B.y-A.y)/L,tz=(B.z-A.z)/L,w=src.w?src.w[i]:Z_AXIS;
          let nx=w.y*tz-w.z*ty,ny=w.z*tx-w.x*tz,nz=w.x*ty-w.y*tx;const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
          const tau=src.tau[i-1],sg=sagProfile(L,q*ny,tau),m=sg.m,nwv=src.nw[i-1]&&src.nw[i]?1:0;
          const gmax=MECH.set.guide;                             // 垂れがガイドの深さを超えたら、帯はガイド(エプロン)に載る
          for(let j=1;j<m;j++){const x=L*j/m,v=Math.max(-gmax,sg.v[j]);
            P.push(this.vec(A.x+tx*x+nx*v,A.y+ty*x+ny*v,A.z+tz*x+nz*v));K.push(sg.k[j]);
            T.push(tau);SU.push(0);NW.push(nwv);RR.push(0);sp.push(0);if(W)W.push(w);}}}
      map[i]=P.length;P.push(src.p[i]);K.push(src.k[i]);T.push(src.tau[i]);SU.push(src.sup[i]);NW.push(src.nw[i]);RR.push(src.rr[i]);sp.push(0);if(W)W.push(src.w[i]);}
    this._use(dst);
    for(const key in this.mark)this.mark[key]=map[this.mark[key]];
    const L=this.L;L.length=P.length;L[0]=0;for(let i=1;i<P.length;i++)L[i]=L[i-1]+P[i].distanceTo(P[i-1]);
    this.st.length=0;this.sr.length=0;for(let i=0;i<P.length;i++)if(SU[i]){this.st.push(L[i]);this.sr.push(RR[i]);}
    return this;}
  get len(){return this.L[this.L.length-1]||0;}
  /* 弧長 s の位置と接線(2次元の向き) */
  at(s,out){const L=this.L,m=L.length;let lo=0,hi=m-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(L[mid]<s)lo=mid;else hi=mid;}const i=lo;
    const a=this.p[i],b=this.p[Math.min(i+1,m-1)],l=(L[i+1]-L[i])||1e-9,t=Math.min(1,Math.max(0,(s-L[i])/l));
    out.p.lerpVectors(a,b,t);out.t.subVectors(b,a).normalize();out.w=this.w?this.w[i]:Z_AXIS;return out;}
}
const PE=new StripPath(),PS=new StripPath(),PTR=new StripPath(true);
const BUF_E=makeSampleBuf(ENTRY_N),BUF_ET=makeSampleBuf(ENTRY_N),BUF_S=makeSampleBuf(STRAND_N),BUF_TR=makeSampleBuf(TRIM_N,true);

/* =========================================================
 * ルーパー区間(上流の挟み点 → ループ → 下流の挟み点)
 * =========================================================
 *  テーブル閉(k≈0): 端ロール・テーブルロールの上面 = PL の平坦通板(ロール間は自重で撓む)。
 *  テーブル退避後: ループ深さの設定 d0 からループ長 S を引き、条ごとの余長 extra を足した長さの
 *  重い弾性線(mech.js の表)で描く。ロールの接点は帯の傾き φ に合わせてロールの肩へずらし、
 *  上流/下流の帯はループの重みで持ち上がる(シーソー・挟み点で頭打ち)。
 *  表が作れないとき(材料を極端にしたときなど)は放物線の垂みで描く。 */
function loopDepth(lp,k,extra){
  const d0=lp.depth*THREE.MathUtils.clamp((k-0.3)/0.7,0,1);  // テーブル退避(k<0.35)後に垂み成長
  if(d0<0.02||!extra)return d0;
  const sh=loopShape(lp,d0,extra);return sh?sh.d:d0;}
const _loopCache=new Map();let _loopFrame=-1;
function loopShape(lp,d0,extra){if(_loopFrame!==geoFrame){_loopCache.clear();_loopFrame=geoFrame;}
  const key=(lp===LOOP1?"1|":"2|")+d0.toFixed(5)+"|"+(extra||0).toExponential(6);let sh=_loopCache.get(key);
  if(sh===undefined){const Smax=MECH.loopS(lp,LOOP_DMAX);
    sh=MECH.loopAt(lp,Math.min(Smax,MECH.loopS(lp,d0)+(extra||0)));_loopCache.set(key,sh);}
  return sh;}
let geoFrame=0;                                              // 形の作り直しの回数(フレームごとのキャッシュの鍵)
/* 控え: 放物線の垂み(旧来の形)。長さ s(d) = (L/2)√(1+a²) + (L/2a)asinh(a)、a = 4d/L を余長ぶん伸ばした深さ */
function parabolaLoop(lp,d0,extra){const L=R[lp.outR].x-R[lp.inR].x,arc=d=>{const a=4*d/L;return 0.5*L*Math.sqrt(1+a*a)+L/(2*a)*Math.asinh(a);};
  let d=d0;if(extra>0){const tgt=arc(d0)+extra;let lo=d0,hi=LOOP_DMAX;for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(arc(mid)<tgt)lo=mid;else hi=mid;}d=(lo+hi)/2;}
  const N=64,X=[],Y=[],K=[],phi=Math.atan(4*d/L),S=MECH.S;
  for(let j=0;j<=N;j++){const u=j/N;X.push(u*L);Y.push(-4*d*u*(1-u));K.push(8*d/(L*L));}
  const c=L*L/(8*Math.max(d,1e-3));
  return{X,Y,K,d,phiIn:phi,phiOut:phi,Min:0,Mout:0,H:S.q*c,Vin:S.q*arc(d)/2,Vout:S.q*arc(d)/2,kmax:8*d/(L*L),kmin:0,S:arc(d)};}
function loopSection(P,lp,k,extra){
  const A=R[lp.inR],B=R[lp.outR],L=B.x-A.x, up=lp.upRolls.map(id=>R[id]), dn=lp.dnRolls.map(id=>R[id]);
  const d0=lp.depth*THREE.MathUtils.clamp((k-0.3)/0.7,0,1), closed=k<0.01;
  const sh=(!closed&&d0>=0.02)?(loopShape(lp,d0,extra)||parabolaLoop(lp,d0,extra)):null, run=MECH.running();
  P.tension(sh&&run?Math.max(0,sh.H):0);
  if(!sh){                                                  // 平坦(テーブル閉)/ 張ったまま(ループがまだ育っていない)
    for(const o of up)P.line(o.x,PL,o.r);P.line(A.x,PL,A.r);
    if(closed)for(const x of lp.tableX)P.line(x,PL,lp.tableR);
    P.line(B.x,PL,B.r);for(const o of dn)P.line(o.x,PL,o.r);
    return {d:0,H:0,S:L,flat:true};}
  const rA=A.r+0.003,rB=B.r+0.003, fi=MECH.lift(sh.phiIn,lp.clampIn), fo=MECH.lift(sh.phiOut,lp.clampOut);
  const Pin={x:A.x+rA*Math.sin(sh.phiIn),y:A.y+rA*Math.cos(sh.phiIn)}, Pout={x:B.x-rB*Math.sin(sh.phiOut),y:B.y+rB*Math.cos(sh.phiOut)};
  const kLift=(f,xi)=>{const h=0.01;xi=Math.max(h,xi);return (f.y(xi-h)-2*f.y(xi)+f.y(xi+h))/(h*h);};
  // 上流: 持ち上がらない所のロール → 持ち上がり(台を離れる点から入側ロールの肩まで)
  for(const o of up)if(o.x<A.x-fi.len-0.02)P.line(o.x,PL,o.r);
  if(fi.len>0){const n=Math.max(4,Math.ceil(fi.len/0.06));
    for(let j=0;j<=n;j++){const f=j/n,xi=fi.len*(1-f),x=A.x-xi+(Pin.x-A.x)*f,y=PL+fi.y(xi)+(Pin.y-PL)*f;
      if(j===0)P.line(x,y,0);else if(j===n)P.add(x,y,kLift(fi,0.012),true,false,A.r,null,1);else P.curve(x,y,kLift(fi,xi));}}
  else P.line(Pin.x,Pin.y,A.r);
  // ループ(表の形を入側の接点 → 出側の接点へ写す)
  const X=sh.X,Y=sh.Y,KK=sh.K,N=X.length-1,sx=(Pout.x-Pin.x)/L,stp=lp===LOOP2?2:1;   // 条のループは1点おき(形はなめらか)
  for(let j=stp;j<N;j+=stp){let k=KK[j];if(stp>1)k=Math.abs(KK[j-1])>Math.abs(k)?KK[j-1]:k;
    P.curve(Pin.x+X[j]*sx,Pin.y+Y[j]+(X[j]/L)*(Pout.y-Pin.y),k);}
  P.add(Pout.x,Pout.y,0,true,false,B.r,null,1);
  // 下流: 出側ロールの肩 → 持ち上がり → 台に戻る点 → 持ち上がらない所のロール
  if(fo.len>0){const n=Math.max(4,Math.ceil(fo.len/0.06));
    for(let j=1;j<=n;j++){const f=j/n,xi=fo.len*f,x=B.x+xi+(Pout.x-B.x)*(1-f),y=PL+fo.y(xi)+(Pout.y-PL)*(1-f);
      if(j===n)P.add(x,y,0,true,false,0,null,1);else P.curve(x,y,kLift(fo,xi));}}
  for(const o of dn)if(o.x>B.x+fo.len+0.02)P.line(o.x,PL,o.r);
  return sh;}

/* =========================================================
 * 通板・抜取り中の先端/後端 — 最後の支点からの片持ち(自重の垂れ + 反り)
 * =========================================================
 *  u: 支点からの距離 / v: 経路の法線方向のずれ。下限・上限は ±G(通板ガイド = 実機のエプロン・
 *  ガイド板。次のロールの半径の 0.9 倍まで — 先端がロールの中心より上で当たる)で、次の支点へは
 *  漏斗状に狭める。ガイドがないときの垂れ(自由垂れ)は画面の判定に出す。 */
const _at={p:new THREE.Vector3(),t:new THREE.Vector3(),w:Z_AXIS},_n=new THREE.Vector3(),_tn=new THREE.Vector3();
const HEAD_N=24,_lo=new Float64Array(HEAD_N+1),_hi=new Float64Array(HEAD_N+1);
const headInfo={on:false,free:0,guided:0,jam:false,x:0,len:0};         // 画面の読み出し(いま垂れている先端)
function applyEnds(P,buf,a,b){const len=P.len;
  if(b<len-0.005)endDroop(P,buf,a,b,1);
  if(a>0.005)endDroop(P,buf,a,b,-1);}
function endDroop(P,buf,a,b,dir){const stn=P.st,S=MECH.S;if(!stn.length||!S)return;
  let iR=-1;
  if(dir>0){for(let k=0;k<stn.length;k++){if(stn[k]<=b-0.005)iR=k;else break;}}
  else{for(let k=0;k<stn.length;k++)if(stn[k]>=a+0.005){iR=k;break;}}
  if(iR<0)return;
  const sR=stn[iR],Lf=dir>0?b-sR:sR-a;if(Lf<0.03)return;
  const iN=dir>0?(iR+1<stn.length?iR+1:-1):-1;
  P.at(sR,_at);const w=_at.w;_n.set(w.y*_at.t.z-w.z*_at.t.y,w.z*_at.t.x-w.x*_at.t.z,w.x*_at.t.y-w.y*_at.t.x).normalize();
  const qn=S.q*_n.y,kn=MECH.curl?MECH.curl.kRes:0,G0=MECH.set.guide,rN=iN>=0?P.sr[iN]:0,G=rN>0?Math.min(G0,0.9*rN):G0;
  for(let j=0;j<=HEAD_N;j++){const u=Lf*j/HEAD_N;let g=G;
    if(iN>=0)g=Math.min(g,Math.max(0.003,(stn[iN]-(sR+u))*0.6));
    _lo[j]=-g;_hi[j]=g;}
  const v=MECH.cantilever(Lf,qn,kn,_lo,_hi,HEAD_N);
  // 法線はずらす前の点列から
  const n=buf.n,ns=[];
  for(let j=0;j<n;j++){const s=buf.s[j],u=dir>0?s-sR:sR-s;if(u<=0||u>Lf+1e-6)continue;
    const pp=buf.p[Math.max(j-1,0)],pn=buf.p[Math.min(j+1,n-1)],wj=buf.w?buf.w[j]:Z_AXIS;
    _tn.subVectors(pn,pp).normalize();
    ns.push([j,u,wj.y*_tn.z-wj.z*_tn.y,wj.z*_tn.x-wj.x*_tn.z,wj.x*_tn.y-wj.y*_tn.x]);}
  for(const [j,u,nx,ny,nz] of ns){const f=u/Lf*HEAD_N,k0=Math.min(HEAD_N-1,Math.floor(f)),vv=v[k0]+(v[k0+1]-v[k0])*(f-k0),l=Math.hypot(nx,ny,nz)||1;
    buf.p[j].x+=nx/l*vv;buf.p[j].y+=ny/l*vv;buf.p[j].z+=nz/l*vv;}
  if(dir>0&&!headInfo.on){const free=MECH.freeTip(iN>=0?Math.min(Lf,stn[iN]-sR):Lf,qn,kn);
    headInfo.on=true;headInfo.free=free;headInfo.guided=v[HEAD_N];headInfo.len=Lf;headInfo.x=_at.p.x;
    headInfo.jam=iN>=0&&rN>0&&Math.abs(MECH.freeTip(Math.max(0,stn[iN]-sR-rN),qn,kn))>rN;}}

/* =========================================================
 * 見え方: 板波(入側の帯)・バリ(条・耳屑の切り口)・応力コンター
 * =======================================================*/
const colU=[];for(let j=0;j<ENTRY_COLS;j++)colU.push((-(STRIP_W-0.01)/2+(STRIP_W-0.01)*j/(ENTRY_COLS-1))*2/EFF_W);   // 列の u(EFF_W 基準)
const _flatCache=new Map();
function flatAt(tau){const key=Math.round(tau)+"|"+st.shape+"|"+st.shapeI;let f=_flatCache.get(key);
  if(!f){if(_flatCache.size>16)_flatCache.clear();f=MECH.flat(tau,colU);_flatCache.set(key,f);}return f;}
const _wScale=new Float32Array(ENTRY_N),_wAmp=new Array(ENTRY_N),_wLam=new Float32Array(ENTRY_N),_wA=new Float32Array(ENTRY_N),_wL=new Float32Array(ENTRY_N);
/* 板波: 張力で引かれても圧縮が残る幅の所(中伸びなら中央)が座屈する。余長 e を波が吸うので
   振幅 a = (λ/π)√e。ロールで受けている所では、ロールの間が λ/2 より短ければロールの間ごとに
   上へ膨らむ半波(λ = 2×ロール間隔・材料が流れても膨らみはロールの間に留まる)、長い自由スパンでは
   材料に付いて流れる波(λ = 座屈幅から)。ロールの上とループでは出さない(押し付けられて平ら)。 */
function entryWave(P,buf){const X=MECH.view.waveX;if(!(X>0)||!(st.shapeI>0)||st.shape==="flat")return null;
  const n=buf.n,stn=P.st;let q=0,any=false;
  for(let i=0;i<n;i++){const s=buf.s[i];while(q<stn.length-1&&stn[q+1]<=s)q++;
    const sa=stn[q],sb=q+1<stn.length?stn[q+1]:sa+10;let sc=buf.nw[i]?0:1;
    if(sc>0){const f=flatAt(buf.tau[i]);if(f.amp.some(a=>a>0)){_wAmp[i]=f.amp;_wLam[i]=f.lam;_wA[i]=sa;_wL[i]=sb-sa;
        if(sb-sa>=f.lam/2)sc=THREE.MathUtils.smoothstep(Math.min(s-sa,sb-s),0.03,0.18);}   // 長いスパンは流れる波(支点の近くで消す)
      else sc=0;}
    _wScale[i]=sc;if(sc>0)any=true;}
  if(!any)return null;
  const edge=st.shape==="edge",s0=buf.s[0]-st.len,TAU=2*Math.PI;
  return(i,j,u,s)=>{const sc=_wScale[i];if(!sc)return 0;const e=_wAmp[i][j];if(!e)return 0;
    const Ls=_wL[i],lam=_wLam[i];
    if(Ls<lam/2){const x=(s+buf.s[0]-_wA[i])/Ls;if(x<=0||x>=1)return 0;                 // ロール間の膨らみ(上へ)
      return Math.min(0.12,e*(2*Ls/lam)*X)*Math.sin(Math.PI*x);}
    return Math.min(0.12,e*X)*sc*Math.sin(TAU*(s+s0)/lam+(edge&&u>0?Math.PI*0.5:0));};}
/* 応力コンター(頂点色は線形空間) */
const _c=new THREE.Color();
function lin3(r,g,b,out,o){out[o]=r*r;out[o+1]=g*g;out[o+2]=b*b;}
function divColor(v,out,o){v=THREE.MathUtils.clamp(v,-1,1);                      // −1 青 … 0 灰 … +1 赤
  if(v<0){const f=-v;lin3(0.86-0.64*f,0.88-0.46*f,0.90+0.05*f,out,o);}else lin3(0.86+0.08*v,0.88-0.60*v,0.90-0.72*v,out,o);}
const UT_STOPS=[[0,0.20,0.36,0.90],[0.5,0.18,0.78,0.52],[0.8,0.95,0.85,0.20],[1.0,0.96,0.36,0.16],[1.2,0.86,0.22,0.78]];
function utilColor(r,out,o){r=Math.max(0,Math.min(1.2,r));let i=1;while(i<UT_STOPS.length-1&&UT_STOPS[i][0]<r)i++;
  const A=UT_STOPS[i-1],B=UT_STOPS[i],f=(r-A[0])/(B[0]-A[0]);lin3(A[1]+(B[1]-A[1])*f,A[2]+(B[2]-A[2])*f,A[3]+(B[3]-A[3])*f,out,o);}
const stressView={range:10,max:0,maxU:0};                // 凡例の範囲(膜応力 ±range N/mm²)/ 最大値(読み出し)
/* 1本の帯の色(res(u): 幅方向の残留応力 [Pa]、なければ 0) */
function stressFn(buf,res){const mode=MECH.view.stress;if(mode==="off")return null;const S=MECH.S,E=S.E,t=S.t,hb=E*t/2;
  if(mode==="membrane")return(i,j,u,col,o)=>{const sm=buf.tau[i]/t+(res?res[j]:0);
    stressView.max=Math.max(stressView.max,Math.abs(sm)/1e6);divColor(sm/1e6/stressView.range,col,o);};
  return(i,j,u,col,o)=>{const sm=buf.tau[i]/t+(res?res[j]:0),sb=hb*Math.abs(buf.k[i]),r=(Math.abs(sm)+sb)/S.sy;
    stressView.maxU=Math.max(stressView.maxU,r);utilColor(r,col,o);};}
function applyStripMaterial(){const on=MECH.view.stress!=="off",m=on?M.stripStress:M.strip;
  for(const r of [entryRibbon,entryTail,trimRibbonR,trimRibbonL,...strandRibbons]){r.setMaterial(m);if(!on)r.clearColor();}}
/* バリの高さ(誇張・法線方向の符号付き m)。下バリ = 下面(−n)へ */
const burrH=b=>{if(!MECH.view.burr)return 0;const h=MECH.edge().hb*MECH.view.burrX/1000;return b==="down"?-h:h;};
let lipsNear=true;                                          // カメラが近いときだけバリを描く(条数が多いと重い)

/* =========================================================
 * 入側の帯: コイル → スナバーA → ベンドB → 入側ピンチ → ラフレベラー → 入側シャー → テーブル
 *           → ループ前ピンチ → No.1 ルーパー → VC・スリッター前ピンチ → ガイドテーブル → スリッター
 * =======================================================*/
let loop1Shape=null;
function buildEntryPath(P){P.reset(0);
  const A=R.A,B=R.B;
  // コイル→スナバーA上面→ベンドB下面(S掛け)→入側ピンチニップ。
  // すべて接線+巻付き弧: Aでは約20°方向転換するため、単一点接触では弦が
  // ロール右肩を10mm以上切り取ってしまう(旧実装の貫通の正体)。
  const cCoil={x:UNC_X,y:UNC_Y,r:st.ru+0.004};
  const cA={x:A.x,y:A.y,r:A.r+0.006}, cB={x:B.x,y:B.y,r:B.r+0.006};
  const tCA=tangentBetween(cCoil,'top',cA,'top');            // コイル上面→A上面(外接線)
  const tAB=tangentBetween(cA,'top',cB,'bottom');            // A上面→B下面(内接線)
  const tBC=tangentToSide(cB.x,cB.y,cB.r,'bottom',R.C1.x,PL);// B下面→C1ニップ
  P.tension(MECH.tau("unc"));
  P.arc(cCoil.x,cCoil.y,cCoil.r,tCA.t1.a+0.8,tCA.t1.a,8,-1,true);  // コイル巻出し弧
  P.arc(cA.x,cA.y,cA.r,tCA.t2.a,tAB.t1.a,7,-1);                     // A巻付き弧
  P.arc(cB.x,cB.y,cB.r,tAB.t2.a,tBC.a,7,1);                         // B巻付き弧
  P.line(R.C1.x,PL,R.C1.r);
  // ラフレベラー: 上下ロールの食い込み(押込み)でジグザグ通板。ロール間は傾き0どうしの弾性線、
  // 接点の曲率は mech.js の弾塑性の答え(降伏するとロールの近くに集まる)
  P.tension(MECH.tau("lev"));
  const g=MECH.levGeom(MECH.set.d1,MECH.set.d2),kv={};
  if(MECH.curl)for(const r of MECH.curl.levRolls)kv[r.id]=r.k;
  for(let i=1;i<g.length;i++){const a=g[i-1],b=g[i],off=o=>o.id[0]==="E"&&o.id[1]==="1"?-0.004:(o.id==="C1"||o.id==="H1-1"?0:0.004);
    P.hermite(a.x,PL+a.y+off(a),b.x,PL+b.y+off(b),i===g.length-1?12:6,kv[b.id]||0,R[b.id].r);}
  // ループ前ピンチ J群はニップ面=パスラインなので直線通板(面一接触・曲げ無し)
  P.line(R['H1-2'].x,PL,R['H1-2'].r);
  P.line(R.J1.x,PL,R.J1.r);P.line(R.J4.x,PL,R.J4.r);P.line(R.J2.x,PL,R.J2.r);
  loop1Shape=loopSection(P,LOOP1,st.loop1,0);                // No.1ルーパー(開閉式・フリーループ/平坦)
  P.tension(MECH.running()?Math.max(0,loop1Shape.H||0):0);   // ループの重みで引かれる(スリッターが引き出す)
  P.line(R.L1.x,PL,R.L1.r);P.line(R.N1.x,PL,R.N2.r);
  for(let i=1;i<=5;i++)P.line(R['P'+i].x,PL,R['P'+i].r);    // ガイドP上面(面一で接触)
  P.line(R.Q.x,PL,0,false);                                   // 板押えQ下面(上から押えるだけ・支点ではない)
  P.line(SLIT_X,PL,KC_KNIFE_D/2000);                          // 丸刃(ニップ)
  return P.finish();}
function updateEntryRibbon(){const P=buildEntryPath(PE);MECH.loop1=loop1Shape;
  // 入側シャー位置までの長さ(シャーより下流は単調にx増加)
  const L=P.L,p=P.p;let sShear=0;
  for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1];if(a.x<=SHEAR_X&&b.x>SHEAR_X){sShear=L[i]+(L[i+1]-L[i])*(SHEAR_X-a.x)/(b.x-a.x);break;}}
  const sEnd=P.len;thread.tail=sEnd-sShear;
  const res=MECH.view.stress!=="off"?flatAt(0).sig:null;    // 幅方向の残留応力(張力ゼロのときの膜応力 = 平均ゼロ)
  const draw=(rib,buf,a,b)=>{resamplePath(P,a,b,buf.n,buf);applyEnds(P,buf,a,b);
    rib.update(buf.p,null,{wave:entryWave(P,buf),color:stressFn(buf,res)});};
  if(!thread.mode&&st.thread){draw(entryRibbon,BUF_E,0,sEnd);entryTail.mesh.visible=false;return;}
  const head=thread.mode==="in"?Math.min(sEnd,sShear+thread.s):sShear;   // 上流側の帯(コイル → シャー/先端)
  draw(entryRibbon,BUF_E,0,head);
  const r=thread.mode==="out"?clipRange(thread.tail,0):null;            // 抜取り中の後端側
  entryTail.mesh.visible=!!r&&r[1]-r[0]>0.01;
  if(entryTail.mesh.visible)draw(entryTail,BUF_ET,sShear+r[0],sShear+r[1]);}

/* =========================================================
 * 条: スリッター → 出側テーブル → No.2 ルーパー → セパ押え → MD → 出側ピンチ X1 → デフ → リコイラ
 * =========================================================
 * 出側テール: X1ニップ→デフY2上面→Y1下面→テールキャッチャーZ上面→リコイラ外周。
 * 全区間を接線+巻付き弧で構成する。Zは約25°の方向転換があり、極点1点で結ぶと
 * 弦がロール肩を~10mm切り取るため、Y1→Z→リコイラも共通接線で結ぶ。
 * X1も同様: ニップを出た帯はデフへ約20°立ち上がるので、上ロールX1の下面へ
 * 巻き付いてから接線に移る(ニップ点から直に接線を引くとX1の肩を削ってしまう)。
 * MD(多枚ディスク)は条ごとに滑れるので、MD より後ろは全条が同じ単位張力(巻取張力)。 */
function tailPath(P){
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
  P.arc(cX1.x,cX1.y,cX1.r,-Math.PI/2,t0.t1.a,5,1,true);     // X1巻付き(ニップ→接線)
  P.arc(cY2.x,cY2.y,cY2.r,t0.t2.a,m1.t1.a,8,-1);
  P.arc(cY1.x,cY1.y,cY1.r,m1.t2.a,m2.t1.a,8,1);
  if(touchZ)P.arc(cZ.x,cZ.y,cZ.r,m2.t2.a,m3.t1.a,6,-1);
  const aRec=touchZ?m3.t2.a:m2.t2.a;
  P.arc(cRec.x,cRec.y,cRec.r,aRec,aRec-0.7,7,-1);}          // リコイラ巻付き
function buildStrandPath(P,zc,idx){P.reset(zc);
  P.line(SLIT_X,PL,KC_KNIFE_D/2000);
  // No.2ルーパーは条毎に深さが違う(形状不良による伸び差が余長として溜まるため)
  const sh=loopSection(P,LOOP2,st.loop2,strandSlack(idx));loop2Info[idx]=sh;
  P.tension(MECH.running()?Math.max(0,sh.H||0):0);
  P.line(R.T1.x,PL,0,false);P.line(R.T2.x,PL,R.T2.r);       // セパ押え(T1 上から・T2 下から)
  P.line(R.V1.x,PL,R.V2.r);                                  // MD ミニロールのニップ
  P.line(MD_X-0.15,PL,0);P.line(MD_X+0.15,PL,0);             // MD テンションパッド(下パッドの上面で受ける)
  P.line(R.W1.x,PL,R.W2.r);                                  // MD 主ロールのニップ
  P.tension(MECH.tau("wind"));                               // MD の後ろ = 巻取張力
  P.line(R.X1.x,PL,R.X2.r);P.mark.X1=P.p.length-1;           // 出側ピンチ(コイル交換で切る位置)
  tailPath(P);                                               // デフS字→Z→リコイラ(接線・巻付き弧)
  return P.finish();}
/* 条の形は余長(ループの深さ)だけで決まる — 同じ余長の条(中伸びなら左右対称の条・平坦なら全条)は
   同じフレームの中で点列を使い回し、z だけ置き換える */
const _strandShare=new Map();let _shareFrame=-1;
function updateStrandRibbon(rib,zc,idx){
  if(_shareFrame!==geoFrame){_strandShare.clear();_shareFrame=geoFrame;}
  const key=strandSlack(idx).toExponential(6);let sh=_strandShare.get(key);
  if(!sh){const P=buildStrandPath(PS,zc,idx),len=P.len,sX1=exitCut.on?P.L[P.mark.X1]:0,r=clipRange(len,thread.tail);
    thread.need=Math.max(thread.need,thread.tail+len);
    if(exitCut.on&&r){exitCut.need=Math.max(exitCut.need,len-sX1);r[1]=Math.min(r[1],sX1+exitCut.head);}
    sh={vis:!!r&&r[1]-r[0]>0.01,buf:null,loop:loop2Info[idx]};
    if(sh.vis){const buf=makeShareBuf();resamplePath(P,r[0],r[1],buf.n,buf);applyEnds(P,buf,r[0],r[1]);sh.buf=buf;}
    _strandShare.set(key,sh);}
  else loop2Info[idx]=sh.loop;
  rib.mesh.visible=sh.vis;if(!sh.vis)return;
  const buf=sh.buf;for(let j=0;j<buf.n;j++)buf.p[j].z=zc;
  rib.setLips(lipsNear&&MECH.view.burr);
  const h=rib.showLips?burrH(strandBurr[idx]):0;
  rib.update(buf.p,null,{lipL:h,lipR:h,color:stressFn(buf,null)});}
const _sharePool=[];let _sharePi=0,_sharePF=-1;
function makeShareBuf(){if(_sharePF!==geoFrame){_sharePi=0;_sharePF=geoFrame;}
  let b=_sharePool[_sharePi];if(!b){b=makeSampleBuf(STRAND_N);_sharePool.push(b);}_sharePi++;return b;}

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
 * 幅方向ベクトルも点ごとに持たせてリボンへ渡すので、ひねりが実際の面として描かれる。
 * 自重の撓みは「帯の法線の上下成分」ぶんだけ効く(立てた区間・水平面では撓まない)。 */
function buildTrimPath(P,sw,rs){
  const s=sw.side, zt=s*ZTRIM;P.reset(zt);
  const addW=(x,y,z,k,sup,span,r,w)=>{P.add(x,y,k,sup,span,r,w,1);P.p[P.p.length-1].z=z;};
  // ---- ① 立面(XY面): 刃の外周 → SG1下面 → (テーブルロールの下)→ SG2上面 → 垂直に落ちて SG3下面 ----
  // 刃の包絡: 最外刃が下刃なら下刃の外周(頂点 PL+ラップ/2)に乗って下がる。上刃なら上刃に押し下げ
  // られているので、下軸の同心円で頂点を上刃の下端(PL−ラップ/2)の下に置いた包絡に沿って下がる。
  const kg=KC.geom(), upper=kg&&(s>0?kg.osUpper:kg.dsUpper);
  const yU=kg?kg.yU:0.158, kR=kg?kg.knifeR:0.159, ov2=kR-yU, yc=PL-yU;
  const ck={x:SLIT_X,y:yc,r:(upper?PL-ov2-0.004:PL+ov2+0.004)-yc};
  const c1={x:SG1.x,y:SG1.y,r:SGR+0.006}, c2={x:SG2.x,y:SG2.y,r:SGR+0.006}, c3={x:SG3.x,y:SG3.y,r:SGR+0.006};
  const tk=tangentBetween(ck,'top',c1,'bottom');                      // 刃 → SG1下面(内接線)
  const t12=tangentBetween(c1,'bottom',c2,'top');                     // SG1下面 → SG2上面(内接線)
  const t23=tangentBetween(c2,'top',c3,'bottom');                     // SG2上面 → SG3下面(垂直に落ちる)
  P.tension(MECH.tau("trim"));
  const arcW=(c,a0,a1,n,sgn,first)=>P.arc(c.x,c.y,c.r,a0,a1,n,sgn,first,Z_AXIS);
  arcW(ck,Math.PI/2,tk.t1.a,6,-1,true);
  arcW(c1,tk.t2.a,t12.t1.a,6,1);
  arcW(c2,t12.t2.a,t23.t1.a,8,-1);
  arcW(c3,t23.t2.a,-Math.PI/2,7,1);                                   // 底 = HTW で水平
  // ---- ② ねじり区間(水平直線・幅方向 Z→Y) ----
  for(let j=1;j<TWIST_N;j++){const t=j/TWIST_N,a=t*Math.PI/2;
    addW(THREE.MathUtils.lerp(c3.x,VG1.x,t),HTW,zt,0,false,false,0,V3(0,Math.sin(a),Math.cos(a)));}
  // ---- ③ 水平面(XZ面): VG1 → VG2 → 屑コイル(左巻きチェーン)。曲げの向きは帯の法線(Y×t)に対して側 s ----
  const ch=[{x:VG1.x,u:VG1.u,r:VGR+0.006},{x:VG2.x,u:VG2.u,r:VGR+0.006},{x:WND.x,u:WND.u,r:rs+0.004}];
  let th=0;                                                           // ねじり区間の進行方向(+X)
  for(let i=0;i<ch.length;i++){const c=ch[i],a0=th-Math.PI/2;let a1;
    if(i<ch.length-1){const d=ch[i+1],dx=d.x-c.x,du=d.u-c.u,rho=Math.hypot(dx,du);
      th=Math.atan2(du,dx)-Math.asin(THREE.MathUtils.clamp((d.r-c.r)/rho,-1,1));a1=th-Math.PI/2;}
    else a1=a0+1.15;                                                  // ドラム巻付き弧(約66°)
    const n=(i<ch.length-1)?8:14;
    for(let k=0;k<n;k++){const a=a0+(a1-a0)*k/(n-1);
      addW(c.x+c.r*Math.cos(a),HTW,s*(c.u+c.r*Math.sin(a)),s/c.r,true,k===0,c.r,Y_AXIS);}}
  return P.finish();}
function updateTrim(rib,sw,rs){
  const P=buildTrimPath(PTR,sw,rs), len=P.len, r=clipRange(len,thread.tail);
  thread.need=Math.max(thread.need,thread.tail+len);
  rib.mesh.visible=!!r&&r[1]-r[0]>0.01;if(!rib.mesh.visible)return;
  const buf=BUF_TR;resamplePath(P,r[0],r[1],buf.n,buf);applyEnds(P,buf,r[0],r[1]);
  rib.setLips(lipsNear&&MECH.view.burr);
  const h=rib.showLips?burrH(sw.side>0?trimBurr.os:trimBurr.ds):0;
  rib.update(buf.p,buf.w,{lipL:h,lipR:h,color:stressFn(buf,null)});}

/* =========================================================
 * 通板の見通し(ガイドなしで先端がどれだけ垂れるか) — 支点の間隔ごとの自由垂れ
 * =========================================================
 *  入側(シャーより下流)と条の経路を支点の間隔で見て、次のロールに着く前の先端の垂れ
 *  (自重 + 反り)がロール半径を超える所 = 先端がロールの中心より下で当たる(突っ込み)を数える。 */
function threadCheck(){const out=[];const S=MECH.S,kn=MECH.curl?MECH.curl.kRes:0;
  const scan=(P,from,label)=>{const stn=P.st;
    for(let i=0;i<stn.length-1;i++){if(stn[i]<from)continue;const gap=stn[i+1]-stn[i];if(gap<0.08)continue;
      P.at(stn[i],_at);const qn=S.q*Math.abs(_at.t.x),rN=P.sr[i+1]||0.05,d=MECH.freeTip(Math.max(0,gap-rN),qn,kn);
      out.push({x:_at.p.x,gap,d,r:rN,jam:Math.abs(d)>rN,label});}};
  const sw=thread.mode,l1=st.loop1,l2=st.loop2,keep=loop1Shape;thread.mode=null;st.loop1=0;st.loop2=0;   // 通板はテーブル閉で
  const P1=buildEntryPath(new StripPath());
  let sShear=0;for(let i=0;i<P1.p.length-1;i++)if(P1.p[i].x<=SHEAR_X&&P1.p[i+1].x>SHEAR_X){sShear=P1.L[i];break;}
  scan(P1,sShear-0.6,"入側");
  if(strandZ.length){const P2=buildStrandPath(new StripPath(),strandZ[0],0);scan(P2,0,"条");}
  thread.mode=sw;st.loop1=l1;st.loop2=l2;loop1Shape=keep;
  return out;}

// 材料・板厚が変わったらレベラーの上ロールを押込みどおりに動かす
MECH.onChange(()=>setLeveler(MECH.set.d1,MECH.set.d2));
setLeveler(MECH.set.d1,MECH.set.d2);
