"use strict";
/* =========================================================
 * 材料力学 — 通板材(アルミ帯板)の機械的性質・張力・内部応力・撓み・反り・切断面
 * =========================================================
 * 帯板の見え方をここで決める物理量(strip.js が経路づくりに読む)。単位は SI(m・N・Pa)、
 * 画面の読み出しは mm・N/mm²(= MPa)。帯板の値は「幅 1m あたり」で持つ(曲げ剛性 D = E t³/12・
 * 自重 q = ρ g t・張力 τ = σ t)— 条の幅に依らない量はこの形で、条ごとの力は幅を掛けて出す。
 *
 *  1) 材料   : JIS アルミ合金の代表値(ヤング率・0.2%耐力・引張強さ・伸び・加工硬化指数 n)。
 *  2) 断面   : D・q と、自重と曲げ剛性が釣り合う長さ l_c = (D/q)^(1/3)(0.5mm で約 0.38m・3mm で 1.26m)。
 *             l_c より長いスパンは自重で大きく垂れ、短いスパンは板の剛さが勝つ。
 *  3) 反り   : 板厚方向を 32 本の繊維に分けた弾塑性モデル(移動硬化 = バウシンガー効果あり)で、
 *             コイルの巻き癖 → スナバー A → ベンドロール B(φ100 の S 掛け)→ 入側ピンチ →
 *             ラフレベラー(入側・出側の押込み)の曲げ履歴を追い、除荷したときの残留曲率を出す。
 *             これが通板時の先端の反り(自然曲率)。製品は デフロール・テールキャッチャー・巻取り
 *             まで追って、払い出したコイルの巻き癖を出す。
 *  4) ループ : 重い弾性線(自重 + 曲げ剛性 + 自然曲率)をエネルギー最小で解く(角度で離散化・
 *             三重対角のニュートン法)。両端はロール上面。ロールより上流/下流の帯はループの重みで
 *             シーソーのように台から持ち上がる(持ち上がり長さ ℓ = l_c(24φ)^(1/3)、挟み点までで頭打ち)
 *             — その反モーメントを端のばねとして入れる。薄板はカテナリーに近く、厚板は U 字の
 *             緩い形になり、ループ入口で帯が台から浮く。ループ長 → 形の表を材料・板厚ごとに作る。
 *  5) 垂れ   : ロール間のスパンは「張力のある両端固定梁」の自重たわみ。張力ゼロなら qL⁴/384D、
 *             張力が強ければ弦の qL²/8τ。通板時の先端は片持ち梁(自重 + 反り)で、ガイド
 *             (実機のエプロン・ガイド板相当 — 次のロールの中心より上で当たる範囲)を上下限にして解く。
 *  6) 内部応力: 板形状(平坦度)の伸び差は、張力で平らに引かれている間は幅方向の残留応力
 *             σ(z) = τ/t + E(ε̄ − ε(z))。圧縮になった所は座屈して板波(中伸び・耳波)になる。
 *             条に切ると条ごとの平均は解放されて余長(ループ深さの差)に、条の中の差は横曲がりになる。
 *  7) 切断面 : クリアランス比 c/t・材料の延性(伸び)・刃先の丸み(摩耗)から、だれ・せん断面・
 *             破断面・かえり(バリ)高さを経験式で見積もる。バリの向きは刃組(千鳥のバリ方向)が決める。
 * =======================================================*/
const MECH=(function(){
  const G=9.80665;
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;

  /* ======================================================
   * 1) 材料 — JIS アルミ合金の代表値(板・条の標準的な値。保証値ではない)
   *    E[GPa] ν ρ[kg/m³] σ0.2[MPa] σB[MPa] 伸び[%] n(加工硬化指数)
   * ====================================================*/
  const MATS=[
    {id:"A1050-O",  E:69.0,nu:0.33,rho:2705,sy:30, su:78, el:38,n:0.28,note:"純アルミ・軟質"},
    {id:"A1050-H24",E:69.0,nu:0.33,rho:2705,sy:105,su:125,el:8, n:0.06,note:"純アルミ・1/2硬質"},
    {id:"A1100-O",  E:69.0,nu:0.33,rho:2710,sy:35, su:90, el:35,n:0.26,note:"純アルミ・軟質"},
    {id:"A1100-H14",E:69.0,nu:0.33,rho:2710,sy:115,su:125,el:9, n:0.05,note:"純アルミ・1/2硬質"},
    {id:"A3003-O",  E:69.0,nu:0.33,rho:2730,sy:42, su:110,el:30,n:0.24,note:"Al-Mn・軟質"},
    {id:"A3003-H14",E:69.0,nu:0.33,rho:2730,sy:145,su:150,el:8, n:0.05,note:"Al-Mn・1/2硬質"},
    {id:"A3004-H32",E:69.0,nu:0.33,rho:2720,sy:170,su:215,el:10,n:0.08,note:"Al-Mn-Mg"},
    {id:"A5052-O",  E:70.3,nu:0.33,rho:2680,sy:90, su:195,el:25,n:0.20,note:"Al-Mg・軟質"},
    {id:"A5052-H32",E:70.3,nu:0.33,rho:2680,sy:195,su:230,el:12,n:0.08,note:"Al-Mg・1/4硬質"},
    {id:"A5052-H34",E:70.3,nu:0.33,rho:2680,sy:215,su:260,el:10,n:0.07,note:"Al-Mg・1/2硬質"},
    {id:"A5083-O",  E:71.0,nu:0.33,rho:2660,sy:145,su:290,el:22,n:0.22,note:"Al-Mg・軟質"},
    {id:"A6061-T4", E:68.9,nu:0.33,rho:2700,sy:145,su:240,el:22,n:0.18,note:"Al-Mg-Si・溶体化"},
    {id:"A6061-T6", E:68.9,nu:0.33,rho:2700,sy:275,su:310,el:12,n:0.07,note:"Al-Mg-Si・時効"},
  ];
  const DEF_MAT="A1100-H14";
  const mat=Object.assign({},MATS.find(m=>m.id===DEF_MAT));

  /* 操作量(画面で変える) */
  const set={
    sUnc:2.0,      // 巻戻し張力 [N/mm²](アンコイラのブレーキ)
    sWind:6.0,     // 巻取張力 [N/mm²](MD の後ろ〜リコイラ。MD の多枚ディスクで条ごとに同じ単位張力)
    sTrim:3.0,     // 耳屑の巻取張力 [N/mm²]
    levAuto:true,  // レベラー押込みを自動(先端の残留反りが最小)にする
    d1:0.030,d2:0.030,   // レベラー押込み 入側(E1-1)/出側(E1-2)[m]
    edgeR:0.02,    // 刃先の丸み(摩耗)[mm]
    guide:0.040,   // 通板ガイドの上下の余裕 [m](次のロール半径の 0.9 倍まで)
  };
  const view={burr:true,burrX:100,waveX:5,stress:"off"};   // バリ・板波の誇張倍率 / 応力コンター(off/membrane/surface)

  /* ======================================================
   * 2) 断面(幅 1m あたり)
   * ====================================================*/
  let S=null;                                             // 現在の断面(sec() で作り直す)
  function sec(){const t=Math.max(0.05,+st.thick||0.5)/1000, E=mat.E*1e9, sy=mat.sy*1e6, su=mat.su*1e6;
    const D=E*t*t*t/12, q=mat.rho*G*t, lc=Math.cbrt(D/q);
    // 移動硬化の塑性係数: 耐力 → 引張強さを一様伸び(≈ n)で上がる直線で近似
    const Hk=Math.max(E/400,(su-sy)/Math.max(0.02,mat.n));
    return {t,E,sy,su,D,q,lc,Hk,ky:2*sy/(E*t),ey:sy/E,My:sy*t*t/6,Mp:sy*t*t/4,rho:mat.rho};}

  /* ======================================================
   * 3) 板厚方向の弾塑性繊維モデル(1次元・線形移動硬化)
   *    曲率 κ(+ = 上に凹: 上面が縮む)→ 繊維ひずみ ε = −κ y、M = −∫σ y dy(幅 1m あたり)
   * ====================================================*/
  function Fiber(s,n){n=n||32;
    const dy=s.t/n, y=new Float64Array(n), ep=new Float64Array(n), al=new Float64Array(n);
    for(let i=0;i<n;i++)y[i]=-s.t/2+(i+0.5)*dy;
    function M(k,commit){let m=0,yl=0;
      for(let i=0;i<n;i++){const tr=s.E*(-k*y[i]-ep[i]),xi=tr-al[i],f=Math.abs(xi)-s.sy;let sg=tr;
        if(f>0){const dg=f/(s.E+s.Hk),sn=xi>0?1:-1;sg=tr-s.E*dg*sn;yl++;
          if(commit){ep[i]+=dg*sn;al[i]+=s.Hk*dg*sn;}}
        m-=sg*y[i]*dy;}
      return commit?{M:m,yf:yl/n}:m;}
    return{
      bend:k=>M(k,true),                                   // 曲率 k まで曲げる(単調ひずみ増分 = 1回の戻り写像で正確)
      release(){let lo=-2000,hi=2000;                      // 除荷: M = 0 の曲率(逆降伏も含む)
        for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(M(mid,false)>0)hi=mid;else lo=mid;}
        const k=(lo+hi)/2;M(k,true);return k;},
      stress(k){const out=[];for(let i=0;i<n;i++)out.push(s.E*(-k*y[i]-ep[i]));return out;},   // 弾性の試行応力(除荷後の残留応力の分布)
      y};}
  /* 素材の単調 M-κ(レベラーのロールで板が何曲率まで曲がるかを出すのに使う) */
  function monoMK(s){const f=Fiber(s,24),ks=[0],Ms=[0];
    for(let j=0;j<=150;j++){const k=s.ky*Math.pow(10,-2+j*0.03);ks.push(k);Ms.push(f.bend(k).M);}
    return{kOfM(M){if(M<=0)return 0;let lo=0,hi=Ms.length-1;if(M>=Ms[hi])return ks[hi];
      while(hi-lo>1){const mid=(lo+hi)>>1;if(Ms[mid]<M)lo=mid;else hi=mid;}
      return ks[lo]+(M-Ms[lo])/(Ms[hi]-Ms[lo])*(ks[hi]-ks[lo]);}};}
  /* ロールでの板の曲率: ロールが隣の2点の弦から off だけ板を押し出したとき。
     片持ち(長さ a・先端たわみ h)に置き換え、M = V x の曲げで弾塑性の曲率を積分して
     たわみが合う V を二分法で探す(降伏すると曲率はロールの近くに集まる)。ロール半径で頭打ち。
       レベラー内のロール(E: 上下が交互に続く連続梁)  a = √(ab)/2・h = off/2 → 弾性で κ = 6·off/(ab)
       入口/出口のロール(D1・D2: 両隣を支点とする3点曲げ) a = √(ab)・h = off   → 弾性で κ = 3·off/(ab)
     (a, b = 隣の接点までの距離) */
  function rollCurv(mk,a,h,rCap){if(!(h>0))return 0;
    let lo=0,hi=1e6;const n=32;
    for(let it=0;it<50;it++){const V=(lo+hi)/2;let d=0;for(let j=0;j<n;j++){const x=(j+0.5)*a/n;d+=mk.kOfM(V*x)*x*a/n;}
      if(d<h)lo=V;else hi=V;}
    return Math.min(mk.kOfM(lo*a),rCap);}

  /* ---- 曲げの履歴(通板材 → 先端の反り / 製品の巻き癖) ---- */
  let curl=null;                                          // 最後に解いた履歴
  let levTab=null, levKey="";                             // レベラーの各ロールの h → κ 表(材料・板厚ごと)
  const LEV_IDS=["D1","E2-1","E1-1","E2-2","E1-2","E2-3","D2"];
  const levTop=d=>0.015-d;                               // 上ロール下面の高さ(PL 基準): 押込み d
  function levGeom(d1,d2){                                // 板の通る点(C1 ニップ → D1 … D2 → H1-1)
    const pt=(id,y)=>({id,x:R[id].x,y});
    return[{id:"C1",x:R.C1.x,y:0},pt("D1",R.D1.r),pt("E2-1",0.015),{id:"E1-1",x:R["E1-1"].x,y:levTop(d1)},
      pt("E2-2",0.015),{id:"E1-2",x:R["E1-2"].x,y:levTop(d2)},pt("E2-3",0.015),pt("D2",R.D2.r),{id:"H1-1",x:R["H1-1"].x,y:0}];}
  const levPin=id=>id==="D1"||id==="D2";
  function buildLevTab(s){const mk=monoMK(s), g=levGeom(0,0), tab={};
    for(let i=1;i<g.length-1;i++){const id=g[i].id,ab=Math.sqrt((g[i].x-g[i-1].x)*(g[i+1].x-g[i].x)),
      a=levPin(id)?ab:ab/2,cap=1/(R[id].r+s.t/2),ks=[];
      for(let j=0;j<=80;j++)ks.push(rollCurv(mk,a,j*0.001,cap));
      tab[id]={ks};}
    return tab;}
  function levCurvs(s,d1,d2){                             // 各ロールでの板の曲率(符号付き)
    const key=[mat.id,mat.E,mat.sy,mat.su,mat.n,s.t].join("|");
    if(key!==levKey){levTab=buildLevTab(s);levKey=key;}
    const g=levGeom(d1,d2), out=[];
    for(let i=1;i<g.length-1;i++){const p=g[i-1],c=g[i],nx=g[i+1];
      const yc=p.y+(nx.y-p.y)*(c.x-p.x)/(nx.x-p.x), off=c.y-yc, h=Math.min(0.08,Math.abs(off)/(levPin(c.id)?1:2));
      const T=levTab[c.id], j=Math.min(79,Math.floor(h/0.001)), f=Math.min(1,h/0.001-j);
      const k=T.ks[j]+(T.ks[j+1]-T.ks[j])*f;
      out.push({id:c.id,k:off>0?-k:k,off});}            // 押し上げる(下から支える)ロールでは上に凸 = κ<0
    return out;}
  /* 巻付き(スナバー A・ベンド B): 張力 τ で帯がロールになじむ長さ λ = √(D/τ)。巻付き弧が λ の2倍より
     短いと曲率はロール半径まで届かない — κ = min(1/R, θ/2λ) */
  function wrapCurv(s,r,theta,tau){const lam=Math.sqrt(s.D/Math.max(1,tau));
    return Math.min(1/(r+s.t/2),Math.abs(theta)/(2*lam));}
  function entryWraps(s){                                 // A・B の巻付き角(strip.js と同じ接線の作り方)
    const cC={x:UNC_X,y:UNC_Y,r:st.ru+0.004},cA={x:R.A.x,y:R.A.y,r:R.A.r+0.006},cB={x:R.B.x,y:R.B.y,r:R.B.r+0.006};
    const tCA=tangentBetween(cC,'top',cA,'top'),tAB=tangentBetween(cA,'top',cB,'bottom'),tBC=tangentToSide(cB.x,cB.y,cB.r,'bottom',R.C1.x,PL);
    const d=(a,b)=>{let x=a-b;while(x>Math.PI)x-=2*Math.PI;while(x<-Math.PI)x+=2*Math.PI;return Math.abs(x);};
    return{A:tCA&&tAB?d(tCA.t2.a,tAB.t1.a):0,B:tAB&&tBC?d(tAB.t2.a,tBC.a):0};}
  function history(s,d1,d2){
    const f=Fiber(s,32), tau=set.sUnc*1e6*s.t, w=entryWraps(s), rolls=[];
    const step=(id,k)=>{const r=f.bend(k);rolls.push({id,k,yf:r.yf,ratio:Math.abs(k)/s.ky});};
    step("コイル",-1/(st.ru+s.t/2));const kCoil=f.release();          // 前工程で巻かれた巻き癖(払い出した帯の自由曲率)
    step("払出し",0);
    step("A",-wrapCurv(s,R.A.r,w.A,tau));step("B",wrapCurv(s,R.B.r,w.B,tau));step("C1",0);
    const lev=levCurvs(s,d1,d2);for(const L of lev)step(L.id,L.k);
    step("出側",0);const kRes=f.release();
    const resid=f.stress(kRes);                           // レベラー後の板厚方向の残留応力
    // 製品: 出側ピンチ X1(下面へ巻付き)→ デフロール Y2(上面巻き)→ Y1(下面巻き)→ テールキャッチャー Z
    //       (当たるときだけ)→ 巻取り(巻き重ねで押さえられるのでコイル径どおり)。張力は巻取張力
    const tw=tailWraps(), tauW=Math.max(1,set.sWind*1e6*s.t);
    step("X1",wrapCurv(s,R.X1.r,tw.X1,tauW));step("Y2",-wrapCurv(s,R.Y2.r,tw.Y2,tauW));step("Y1",wrapCurv(s,R.Y1.r,tw.Y1,tauW));
    if(tw.Z>0)step("Z",-wrapCurv(s,R.Z.r,tw.Z,tauW));
    step("巻取り",-1/(st.rr+s.t/2));const kProd=f.release();
    // A/B だけ通した(レベラーなし)ときの残留 — レベラーの効きを見るための参考
    const g=Fiber(s,32);g.bend(-1/(st.ru+s.t/2));g.release();g.bend(0);
    g.bend(-wrapCurv(s,R.A.r,w.A,tau));g.bend(wrapCurv(s,R.B.r,w.B,tau));g.bend(0);const kBeforeLev=g.release();
    const levRolls=rolls.filter(r=>LEV_IDS.indexOf(r.id)>=0);
    return{kCoil,kBeforeLev,kRes,kProd,rolls,levRolls,resid,y:Array.from(f.y),wrapA:w.A,wrapB:w.B,
      plast:levRolls.reduce((a,r)=>Math.max(a,r.yf),0),
      plastLast:(levRolls.slice().reverse().find(r=>Math.abs(r.k)>1e-6)||{yf:0}).yf};}
  /* 出側の巻付き角(strip.js tailPath と同じ接線の作り方)。Z は触れていなければ 0 */
  const angD=(a,b)=>{let x=a-b;while(x>Math.PI)x-=2*Math.PI;while(x<-Math.PI)x+=2*Math.PI;return x;};
  function tailWraps(){
    const cX1={x:R.X1.x,y:R.X1.y,r:R.X1.r+0.002},cY2={x:R.Y2.x,y:R.Y2.y,r:R.Y2.r+0.006},cY1={x:R.Y1.x,y:R.Y1.y,r:R.Y1.r+0.006};
    const cZ={x:R.Z.x,y:R.Z.y,r:R.Z.r+0.006},cRec={x:REC_X,y:REC_Y,r:st.rr+0.004};
    const t0=tangentBetween(cX1,'bottom',cY2,'top'),m1=tangentBetween(cY2,'top',cY1,'bottom');
    let m2=tangentBetween(cY1,'bottom',cZ,'top');const m3=tangentBetween(cZ,'top',cRec,'top');
    const z=m2&&m3?angD(m2.t2.a,m3.t1.a):-1;if(!(z>0))m2=tangentBetween(cY1,'bottom',cRec,'top');
    return{X1:Math.abs(angD(t0.t1.a,-Math.PI/2)),Y2:Math.abs(angD(m1.t1.a,t0.t2.a)),Y1:Math.abs(angD(m2.t1.a,m1.t2.a)),Z:z>0?z:0};}
  const zTouch=()=>tailWraps().Z>0;
  /* レベラー押込みの自動設定: 先端の残留反り |κ| が最小になる入側/出側(出側 ≦ 入側)。
     粗く 5mm 刻みで当たりを付け、1mm 刻みで詰める。押込みが小さいほうを少しだけ好む。 */
  function headCurl(s,d1,d2,w,tau){const f=Fiber(s,24);
    f.bend(-1/(st.ru+s.t/2));f.release();f.bend(0);
    f.bend(-wrapCurv(s,R.A.r,w.A,tau));f.bend(wrapCurv(s,R.B.r,w.B,tau));f.bend(0);
    for(const L of levCurvs(s,d1,d2))f.bend(L.k);f.bend(0);return f.release();}
  function levOptimize(s){
    const w=entryWraps(s), tau=set.sUnc*1e6*s.t;
    const cost=(d1,d2)=>Math.abs(headCurl(s,d1,d2,w,tau))*s.lc+0.004*(d1+d2)/0.1;
    let best={d1:0,d2:0,c:cost(0,0)};
    for(let d1=0;d1<=0.1001;d1+=0.005)for(let d2=0;d2<=d1+1e-9;d2+=0.005){const c=cost(d1,d2);if(c<best.c)best={d1,d2,c};}
    const b0=Object.assign({},best);
    for(let d1=Math.max(0,b0.d1-0.005);d1<=Math.min(0.1,b0.d1+0.005)+1e-9;d1+=0.001)
      for(let d2=Math.max(0,b0.d2-0.005);d2<=Math.min(d1,b0.d2+0.005)+1e-9;d2+=0.001){const c=cost(d1,d2);if(c<best.c)best={d1,d2,c};}
    return{d1:+best.d1.toFixed(3),d2:+best.d2.toFixed(3)};}

  /* ======================================================
   * 4) ループ — 重い弾性線(無次元: 長さ l_c・力 q l_c・モーメント q l_c²)
   *    角度 θ_1..θ_N(入側 → 出側)で離散化し、曲げ + 自重 + 端ばねのエネルギーを
   *    スパン L・両端同じ高さの拘束のもとで最小にする(ラグランジュ乗数 2つ・三重対角のニュートン法)。
   * ====================================================*/
  const SPR_C=Math.pow(24,2/3)/4;                         // シーソーのばね M = SPR_C·φ^(2/3)
  /* 端ばね(上流/下流の帯の持ち上がり): φ = ループへ向かって下がる角。ℓ = (24φ)^(1/3) が挟み点
     までの距離 lc を超えたら「片持ち(挟み点)+ ロールで支持」の線形ばね M = (4/lc)(φ + lc³/48) に移る
     (切り替わりで M は連続)。φ<0(帯がロールから上向きに出る)は台に押し付けられるので固いばね。
     戻り値 [E, dE/dφ(= 端モーメント), d²E/dφ²] */
  function spring(phi,lc){const pt=lc*lc*lc/24;
    if(phi<=0){const k=16/lc;return[0.5*k*phi*phi,k*phi,k];}
    if(phi<pt){const q=phi+1e-9, m=Math.pow(24*q,2/3)/4;          // M = (24φ)^(2/3)/4・E = ∫M dφ = (3/5)Mφ
      return[m*q*3/5,m,SPR_C*(2/3)*Math.pow(q,-1/3)];}
    const Et=Math.pow(24*pt,2/3)/4*pt*3/5, k=4/lc, c=lc*lc*lc/48;
    return[Et+k*((phi*phi-pt*pt)/2+c*(phi-pt)),k*(phi+c),k];}
  function solveLoop(L,Sl,N,lin,lout,kn,init){
    const D=Sl/N, th=new Float64Array(N);let lx,ly;
    if(init&&init.th.length===N){th.set(init.th);lx=init.lx;ly=init.ly;}
    else{let lo=1e-3,hi=1e7;                             // カテナリー 2c sinh(L/2c) = S
      for(let i=0;i<200;i++){const c=Math.sqrt(lo*hi);if(2*c*Math.sinh(Math.min(700,L/2/c))>Sl)lo=c;else hi=c;}
      const c=Math.sqrt(lo*hi);for(let k=0;k<N;k++)th[k]=Math.atan(((k+0.5)*D-Sl/2)/c);lx=-c;ly=-Sl/2;}
    const a=new Float64Array(N),b=new Float64Array(N),cc=new Float64Array(N),g=new Float64Array(N),
      b1=new Float64Array(N),b2=new Float64Array(N),cp=new Float64Array(N),dp=new Float64Array(N),
      u=new Float64Array(N),v1=new Float64Array(N),v2=new Float64Array(N),rhs=new Float64Array(N);
    const tri=(r,x)=>{cp[0]=cc[0]/b[0];dp[0]=r[0]/b[0];
      for(let k=1;k<N;k++){const m=b[k]-a[k]*cp[k-1];cp[k]=cc[k]/m;dp[k]=(r[k]-a[k]*dp[k-1])/m;}
      x[N-1]=dp[N-1];for(let k=N-2;k>=0;k--)x[k]=dp[k]-cp[k]*x[k+1];};
    let it,res=1;
    for(it=0;it<60;it++){
      a.fill(0);b.fill(0);cc.fill(0);g.fill(0);
      for(let j=0;j<N-1;j++){const d=(th[j+1]-th[j])/D-kn;g[j]-=d;g[j+1]+=d;b[j]+=1/D;b[j+1]+=1/D;cc[j]-=1/D;a[j+1]-=1/D;}
      {const e=spring(-th[0],lin);g[0]-=e[1];b[0]+=e[2];}
      {const e=spring(th[N-1],lout);g[N-1]+=e[1];b[N-1]+=e[2];}
      let gx=-L,gy=0;
      for(let k=0;k<N;k++){const m=N-k-0.5,s=Math.sin(th[k]),c=Math.cos(th[k]);
        g[k]+=D*D*m*c-lx*D*s+ly*D*c; b[k]+=-D*D*m*s-lx*D*c-ly*D*s;
        b1[k]=-D*s;b2[k]=D*c;gx+=D*c;gy+=D*s;}
      res=Math.max(Math.abs(gx),Math.abs(gy));for(let k=0;k<N;k++)res=Math.max(res,Math.abs(g[k]));
      if(res<1e-10||!isFinite(res))break;
      for(let k=0;k<N;k++)rhs[k]=-g[k];
      tri(rhs,u);tri(b1,v1);tri(b2,v2);
      let A11=0,A12=0,A22=0,r1=gx,r2=gy;
      for(let k=0;k<N;k++){A11+=b1[k]*v1[k];A12+=b1[k]*v2[k];A22+=b2[k]*v2[k];r1+=b1[k]*u[k];r2+=b2[k]*u[k];}
      const det=A11*A22-A12*A12;if(!(Math.abs(det)>0))break;
      const d1=(r1*A22-r2*A12)/det,d2=(A11*r2-A12*r1)/det;let mx=0;
      for(let k=0;k<N;k++){u[k]-=v1[k]*d1+v2[k]*d2;mx=Math.max(mx,Math.abs(u[k]));}
      const f=Math.min(1,0.35/Math.max(mx,1e-12));for(let k=0;k<N;k++)th[k]+=f*u[k];lx+=f*d1;ly+=f*d2;}
    const X=new Float64Array(N+1),Y=new Float64Array(N+1),K=new Float64Array(N+1);let x=0,y=0,ymin=0,kmax=0,kmin=0;
    for(let k=0;k<N;k++){x+=D*Math.cos(th[k]);y+=D*Math.sin(th[k]);X[k+1]=x;Y[k+1]=y;ymin=Math.min(ymin,y);}
    for(let k=1;k<N;k++){K[k]=(th[k]-th[k-1])/D;kmax=Math.max(kmax,K[k]);kmin=Math.min(kmin,K[k]);}
    const Min=spring(-th[0],lin)[1],Mout=spring(th[N-1],lout)[1];
    return{th,lx,ly,it,res,ok:res<1e-6&&isFinite(res),X,Y,K,depth:-ymin,phiIn:-th[0],phiOut:th[N-1],kmax,kmin,Min,Mout,
      H:-lx,Vin:Sl+ly,Vout:-ly};}                        // 端の力: 水平 H(+ = 引張)、鉛直(入側/出側の支点が受ける自重)
  const LOOP_N=128;
  /* ループ長 → 形の表(m)。中程(深さ約 1m)から深い側・浅い側へ継続して解く */
  function loopTable(lp,s,kn){
    const L=R[lp.outR].x-R[lp.inR].x, lc=s.lc, lin=lp.clampIn/lc, lout=lp.clampOut/lc, knh=kn*lc;
    const one=(Sm,init)=>solveLoop(L/lc,Sm/lc,LOOP_N,lin,lout,knh,init);
    const up=[],dn=[];let prev=null;
    for(let Sm=L+1.0;Sm<L+12;Sm=L+(Sm-L)*1.12){const r=one(Sm,prev);if(!r.ok)break;prev=r;up.push([Sm,r]);if(r.depth*lc>LOOP_DMAX+0.3)break;}
    if(!up.length)return null;
    prev=up[0][1];
    for(let Sm=L+(up[0][0]-L)/1.35;Sm-L>L*4e-4;Sm=L+(Sm-L)/1.35){const r=one(Sm,prev);if(!r.ok)break;prev=r;dn.push([Sm,r]);}
    const rows=dn.reverse().concat(up).map(([Sm,r])=>({S:Sm,d:r.depth*lc,X:Array.from(r.X,v=>v*lc),Y:Array.from(r.Y,v=>v*lc),
      K:Array.from(r.K,v=>v/lc),phiIn:r.phiIn,phiOut:r.phiOut,Min:r.Min*s.q*lc*lc,Mout:r.Mout*s.q*lc*lc,
      H:r.H*s.q*lc,Vin:r.Vin*s.q*lc,Vout:r.Vout*s.q*lc,kmax:r.kmax/lc,kmin:r.kmin/lc}));
    return{L,rows,lc,kn,key:""};}
  const loops=new Map();                                  // lp → 表
  function loopTab(lp){const s=S,kn=curl?Math.round(curl.kRes*s.lc*100)/100/s.lc:0,
    key=[mat.id,mat.E,mat.rho,s.t,kn,lp.clampIn,lp.clampOut].join("|");
    let T=loops.get(lp);
    if(!T||T.key!==key){T=loopTable(lp,s,kn)||{rows:[],L:R[lp.outR].x-R[lp.inR].x};T.key=key;loops.set(lp,T);}
    return T;}
  /* 表の補間: ループ長 Sm の形(m)。表の外は端の行で頭打ち */
  function loopAt(lp,Sm){const T=loopTab(lp),rows=T.rows;if(!rows.length)return null;
    if(Sm<=rows[0].S)return Object.assign({f:0},rows[0],{S:Sm});
    const last=rows[rows.length-1];if(Sm>=last.S)return Object.assign({f:1},last);
    let i=1;while(rows[i].S<Sm)i++;const A=rows[i-1],B=rows[i],f=(Sm-A.S)/(B.S-A.S),lerp=(p,q)=>p+(q-p)*f;
    const n=A.X.length,X=new Array(n),Y=new Array(n),K=new Array(n);
    for(let k=0;k<n;k++){X[k]=lerp(A.X[k],B.X[k]);Y[k]=lerp(A.Y[k],B.Y[k]);K[k]=lerp(A.K[k],B.K[k]);}
    const o={S:Sm,X,Y,K};for(const k of ["d","phiIn","phiOut","Min","Mout","H","Vin","Vout","kmax","kmin"])o[k]=lerp(A[k],B[k]);
    return o;}
  /* 深さ d のループ長(表の逆引き — 深さはループ長に対して単調) */
  function loopS(lp,d){const T=loopTab(lp),rows=T.rows,L=T.L;if(!rows.length||d<=0)return L;
    if(d<=rows[0].d)return L+(rows[0].S-L)*Math.pow(Math.max(0,d)/rows[0].d,2);
    for(let i=1;i<rows.length;i++)if(rows[i].d>=d){const A=rows[i-1],B=rows[i];return A.S+(B.S-A.S)*(d-A.d)/(B.d-A.d);}
    return rows[rows.length-1].S;}
  /* ループ端の持ち上がり(上流/下流の帯): ロールからの距離 ξ(>0 = ロールから離れる向き)の高さ[m]。
     シーソー(ℓ ≦ 挟み点までの距離)は y = (ℓ(ℓ−ξ)³ − (ℓ−ξ)⁴)/(24 l_c³)、頭打ちなら片持ち+支点の撓み。 */
  function lift(phi,clampDist){const lc=S.lc,lh=Math.cbrt(24*Math.max(0,phi)),lcl=clampDist/lc;
    if(!(phi>1e-5))return{len:0,y:()=>0};
    if(lh<=lcl){const l=lh*lc;return{len:l,y:xi=>{if(xi>=l)return 0;const u=(l-xi)/lc,L=lh;return Math.max(0,(L*u*u*u-u*u*u*u)/24)*lc;}};}
    const Mh=(4/lcl)*(phi+lcl*lcl*lcl/48),A=(-Mh+5*lcl*lcl/12)/(4*lcl),B=lcl*lcl/24-A*lcl;
    return{len:clampDist,y:xi=>{const x=(clampDist-xi)/lc;if(x<=0)return 0;return Math.max(0,-x*x*x*x/24+A*x*x*x+B*x*x)*lc;}};}

  /* ======================================================
   * 5) 撓み — 張力のある両端固定梁の自重たわみ y(x)(下向き +)。幅 1m あたり:
   *    D y'''' − τ y'' = q。τ→0 で qx²(L−x)²/24D、τ→∞ で弦 qx(L−x)/2τ
   * ====================================================*/
  function sagAt(x,L,qn,tau,D){if(!(L>0))return 0;
    tau=Math.max(0,tau);const k=Math.sqrt(tau/D), kL=k*L;
    if(kL<1e-3||tau<=0)return qn*x*x*(L-x)*(L-x)/(24*D);
    if(kL>30)return qn/(2*tau)*x*(L-x)-qn*L/(2*tau*k)*(1-Math.exp(-k*x)-Math.exp(-k*(L-x)));
    const C3=qn*L/(2*tau*k*Math.sinh(kL/2)), C1=qn*L*L/(8*tau)-C3*Math.cosh(kL/2), u=x-L/2;
    return C1+C3*Math.cosh(k*u)-qn/(2*tau)*u*u;}
  /* スパン中央の曲率(y'' の符号: 下に凸 = 上に凹 → +)。応力表示に使う */
  function sagCurv(x,L,qn,tau,D){const h=Math.min(L/50,0.01);
    return (sagAt(x-h,L,qn,tau,D)-2*sagAt(x,L,qn,tau,D)+sagAt(x+h,L,qn,tau,D))/(h*h);}

  /* ======================================================
   * 5b) 通板先端の片持ち(経路に沿った座標 u・経路の法線方向のずれ v)
   *    線形梁(ガイドで |v| が小さく抑えられるので十分)。根元は最後の支点で固定、先端自由。
   *    外力: 自重の法線成分 qn(v を下げる)・自然曲率 kn(反り)。v の上下限(ガイド・次のロール)は
   *    ペナルティで効かせ、効いている節点を入れ替えながら数回解く(有効集合法)。
   * ====================================================*/
  function cantilever(Lf,qn,kn,lo,hi,n){n=n||lo.length-1;
    const D=S.D, dx=Lf/n;
    // 未知数 v_1..v_n(v_0 = 0、根元の傾き 0 = 鏡像 v_{-1} = v_1)
    const N=n, H=new Float64Array(N*N), r=new Float64Array(N), v=new Float64Array(N+1);
    const act=new Int8Array(N+1);                        // 0: 自由 / -1: 下限に当たる / +1: 上限に当たる
    const Kp=D/Math.pow(dx,4)*1e4;
    for(let pass=0;pass<12;pass++){
      H.fill(0);r.fill(0);
      // 曲げ: Σ (D/2)(c_i − kn)² dx、c_i = (v_{i−1} − 2v_i + v_{i+1})/dx²(i = 0..n−1)
      for(let i=0;i<n;i++){const idx=[],cf=[];
        const add=(j,c)=>{if(j===0)return;if(j===-1){j=1;}idx.push(j-1);cf.push(c);};
        add(i-1,1/(dx*dx));add(i,-2/(dx*dx));add(i+1,1/(dx*dx));
        const w=D*dx*(i===0?0.5:1);
        for(let p=0;p<idx.length;p++){r[idx[p]]+=w*cf[p]*kn;for(let q=0;q<idx.length;q++)H[idx[p]*N+idx[q]]+=w*cf[p]*cf[q];}}
      for(let j=1;j<=n;j++){const w=j===n?dx/2:dx;r[j-1]-=qn*w;         // 自重(v を下げる向き)
        if(act[j]<0){H[(j-1)*N+j-1]+=Kp;r[j-1]+=Kp*lo[j];}
        else if(act[j]>0){H[(j-1)*N+j-1]+=Kp;r[j-1]+=Kp*hi[j];}}
      // 解く(コレスキー)
      const Lm=new Float64Array(N*N);
      for(let i=0;i<N;i++)for(let j=0;j<=i;j++){let s2=H[i*N+j];for(let k=0;k<j;k++)s2-=Lm[i*N+k]*Lm[j*N+k];
        Lm[i*N+j]=i===j?Math.sqrt(Math.max(s2,1e-30)):s2/Lm[j*N+j];}
      const z=new Float64Array(N);for(let i=0;i<N;i++){let s2=r[i];for(let k=0;k<i;k++)s2-=Lm[i*N+k]*z[k];z[i]=s2/Lm[i*N+i];}
      for(let i=N-1;i>=0;i--){let s2=z[i];for(let k=i+1;k<N;k++)s2-=Lm[k*N+i]*v[k+1];v[i+1]=s2/Lm[i*N+i];}
      let ch=false;
      for(let j=1;j<=n;j++){const a0=act[j];
        if(a0===0){if(v[j]<lo[j]-1e-6){act[j]=-1;ch=true;}else if(v[j]>hi[j]+1e-6){act[j]=1;ch=true;}}
        else if(a0<0&&Kp*(lo[j]-v[j])<0){act[j]=0;ch=true;}           // 押し返す力が負 → 離れる
        else if(a0>0&&Kp*(v[j]-hi[j])<0){act[j]=0;ch=true;}}
      if(!ch)break;}
    for(let j=1;j<=n;j++)v[j]=clamp(v[j],lo[j],hi[j]);
    return v;}
  /* ガイドなしの先端の垂れ(反りを含む・大たわみ): 片持ち長 L の先端の法線方向のずれ[m]。
     角度で離散化した重い弾性線(根元固定・先端自由)をエネルギー最小で解く。線形の qL⁴/8D は
     l_c より長いと垂れが長さを超えてしまうので使わない(長い片持ちはほぼ真下へ垂れ下がる)。 */
  function freeTip(L,qn,kn){if(!(L>0))return 0;const lc=S.lc,N=32,D=L/lc/N,qh=qn/S.q,kh=kn*lc;
    const th=new Float64Array(N),g=new Float64Array(N),a=new Float64Array(N),b=new Float64Array(N),c=new Float64Array(N),cp=new Float64Array(N),dp=new Float64Array(N);
    for(let stage=1;stage<=4;stage++){const f=stage/4;                         // 荷重を 4 段で増やす(大たわみの枝を外さない)
      for(let it=0;it<40;it++){g.fill(0);a.fill(0);b.fill(0);c.fill(0);
        for(let j=0;j<N;j++){const prev=j?th[j-1]:0,d=(th[j]-prev)/D-kh;g[j]+=d;b[j]+=1/D;if(j){g[j-1]-=d;b[j-1]+=1/D;c[j-1]-=1/D;a[j]-=1/D;}}
        let mx=0;for(let k=0;k<N;k++){const m=N-k-0.5;g[k]+=f*qh*D*D*m*Math.cos(th[k]);b[k]+=Math.max(0,-f*qh*D*D*m*Math.sin(th[k]));mx=Math.max(mx,Math.abs(g[k]));}
        if(mx<1e-10)break;
        cp[0]=c[0]/b[0];dp[0]=-g[0]/b[0];for(let k=1;k<N;k++){const m=b[k]-a[k]*cp[k-1];cp[k]=c[k]/m;dp[k]=(-g[k]-a[k]*dp[k-1])/m;}
        let st2=0;const dx=new Float64Array(N);dx[N-1]=dp[N-1];for(let k=N-2;k>=0;k--)dx[k]=dp[k]-cp[k]*dx[k+1];
        for(let k=0;k<N;k++)st2=Math.max(st2,Math.abs(dx[k]));const fs=Math.min(1,0.3/Math.max(st2,1e-12));
        for(let k=0;k<N;k++)th[k]=Math.max(-Math.PI*0.999,Math.min(Math.PI*0.999,th[k]+fs*dx[k]));}}
    let y=0;for(let k=0;k<N;k++)y+=D*Math.sin(th[k]);return y*lc;}

  /* ======================================================
   * 6) 板形状(平坦度)と内部応力
   *    ε(u)= 形状の伸び(strip.js shapeProfile × I-unit)。張力 τ で平らに引かれた板の膜応力は
   *    σ(u) = τ/t + E(ε̄ − ε(u))(ε̄ = 幅方向の平均)。σ < 0 の所は座屈して板波になり、
   *    波の振幅 a = (λ/π)√e(e = −σ/E が波が吸う余長)。
   * ====================================================*/
  function flat(tau,cols){                                // cols: 幅方向の u(−1 … +1 = EFF_W 基準)
    const A=st.shapeI*1e-5, eps=cols.map(u=>shapeProfile(u)*A), eb=eps.reduce((a,b)=>a+b,0)/Math.max(1,eps.length);
    const s0=tau/S.t, sig=eps.map(e=>s0+S.E*(eb-e));
    // 座屈した幅(連続した圧縮域)から波長を決める: 中伸びは 1.4×座屈幅、耳波は 2×片側の幅
    let wb=0;for(let i=0;i<cols.length;i++)if(sig[i]<0)wb+=(i>0?Math.abs(cols[i]-cols[i-1]):0)*EFF_W/2;
    const edge=st.shape==="edge", lam=clamp((edge?1.0:1.4)*Math.max(wb,0.1),0.15,1.2);
    return{sig,eps,eb,lam,amp:sig.map(s=>s<0?lam/Math.PI*Math.sqrt(-s/S.E):0)};}

  /* ======================================================
   * 7) 切断面(ロータリーシャーの切り口) — 経験的な見積り
   *    c/t: クリアランス比 / 適正 c_opt/t = 0.055 + 0.00012 σB(軟質 6.4%〜硬質 9.2%)
   *    だれ   h_r/t = (0.04 + 0.25δ)(1 + 1.5 c/t)
   *    せん断面 h_s/t = (0.22 + 0.9δ)(1 − 2.5(c/t − 0.05))(刃先の丸みで少し増える)
   *    バリ   h_b = t·F(0.03 + 4(Δc)² + 0.8 max(0,−Δc)) + 0.4·r_e·F   F = 0.6 + 1.6δ(延性)
   *           (Δc = c/t − c_opt/t。大きすぎる隙間は引きちぎりのバリ、小さすぎると二次せん断)
   *    判定はバリ高さ/板厚: 7% 以下 良・10% 以下 注意・超え 不可(一般的な目安)。
   * ====================================================*/
  function edge(){const res=KC.D3.ctx&&KC.D3.ctx.res, clr=res?res.A.clr:0.05, t=+st.thick||0.5;
    const dlt=mat.el/100, ct=clr/t, copt=0.055+0.00012*mat.su, dc=ct-copt, re=set.edgeR, F=0.6+1.6*dlt;
    const hr=t*clamp((0.04+0.25*dlt)*(1+1.5*ct),0.02,0.35);
    const hs=t*clamp((0.22+0.9*dlt)*(1-2.5*(ct-0.05))+0.4*re/t,0.12,0.85);
    const hb=t*F*(0.03+4*dc*dc+0.8*Math.max(0,-dc))+0.4*re*F;
    const hf=Math.max(0,t-hr-hs);
    const pct=hb/t*100, judge=pct<=7?"ok":pct<=10?"warn":"ng";
    const cj=ct<copt*0.5?"small":ct>copt*2?"large":"ok";
    return{t,clr,ct,copt,hr,hs,hf,hb,pct,judge,cj,ang:Math.atan2(clr,hf||1e-6)};}

  /* ======================================================
   * 8) 張力区間(幅 1m あたり τ [N/m] と単位張力 σ [N/mm²])
   * ====================================================*/
  let loopInfo={L1:null,L2:null};                         // strip.js が毎フレーム入れる(ループの端の力)
  const running=()=>!!st.thread&&!thread.mode;            // 通板済(抜取り・通板の途中は張力なし)
  const wound=()=>running()&&!exitCut.on&&st.state!=="KNIFE";
  function tau(zone){const t=S.t;
    switch(zone){
      case "unc": return set.sUnc*1e6*t;                   // アンコイラのブレーキは止まっていても効く
      case "lev": return 0;                                // 入側ピンチ〜ループ前ピンチ: ピンチ送り(張力フリー)
      case "loop1": return loopInfo.L1&&running()?Math.max(0,loopInfo.L1.H):0;
      case "wind": return wound()?set.sWind*1e6*t:0;
      case "trim": return wound()?set.sTrim*1e6*t:0;
      default: return 0;}}

  /* ======================================================
   * 9) 更新(重い計算は入力が変わったときだけ)
   * ====================================================*/
  let hKey="", hT=0, dirtyAll=true, ruKey="";
  const listeners=[];
  function invalidate(){dirtyAll=true;}
  const inKey=()=>[mat.id,mat.E,mat.sy,mat.su,mat.n,mat.rho,st.thick,set.sUnc,set.sWind,set.levAuto,set.d1,set.d2].join("|");
  function update(dt){hT+=dt||0;
    if(dirtyAll||inKey()!==hKey){                           // 材料・板厚・張力・レベラーが変わった
      S=sec();
      if(set.levAuto){const o=levOptimize(S);set.d1=o.d1;set.d2=o.d2;}
      curl=history(S,set.d1,set.d2);hKey=inKey();dirtyAll=false;hT=0;
      ruKey=Math.round(st.ru*40)+"|"+Math.round(st.rr*40)+"|"+zTouch();
      for(const f of listeners)f();return;}
    if(hT>0.5){hT=0;const k=Math.round(st.ru*40)+"|"+Math.round(st.rr*40)+"|"+zTouch();   // コイル径が変わった(巻き癖・製品)
      if(k!==ruKey){ruKey=k;curl=history(S,set.d1,set.d2);}}}
  update(0);

  return{MATS,mat,set,view,G,
    get S(){return S;}, get curl(){return curl;},
    setMaterial(id){const m=MATS.find(x=>x.id===id);if(!m)return;Object.assign(mat,m);invalidate();},
    setProp(k,v){if(!(v>0))return;mat[k]=v;invalidate();},
    invalidate, update, onChange(f){listeners.push(f);},
    Fiber, sec, history, levCurvs, levGeom, levTop, levOptimize, wrapCurv,
    solveLoop, loopTab, loopAt, loopS, lift, spring,
    sagAt, sagCurv, cantilever, freeTip, flat, edge, tau, running, wound,
    set loop1(v){loopInfo.L1=v;}, set loop2(v){loopInfo.L2=v;}, get loops(){return loopInfo;}};
})();
