"use strict";
/* =========================================================
 * ヘルパー
 * =======================================================*/
function addBox(w,h,d,mat,x,y,z,parent,shadow){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);m.castShadow=shadow!==false;m.receiveShadow=true;(parent||scene).add(m);return m;}
function addCylZ(r,len,mats,x,y,z,parent,seg){const g=new THREE.CylinderGeometry(r,r,len,seg||28);g.rotateX(Math.PI/2);
  const m=new THREE.Mesh(g,mats);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(parent||scene).add(m);return m;}
/* 縦軸(Y)円筒 — 立軸ワインダーのドラム/縦ガイドロール用 */
function addCylY(r,len,mats,x,y,z,parent,seg){const g=new THREE.CylinderGeometry(r,r,len,seg||28);
  const m=new THREE.Mesh(g,mats);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(parent||scene).add(m);return m;}
const rollMats=()=>[M.roll,M.rollCap,M.rollCap];
const coilMats=()=>[M.coilSide,M.coilCap,M.coilCap];
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const Z_AXIS=V3(0,0,1), Y_AXIS=V3(0,1,0);   // 帯の幅方向(水平帯=Z / 立軸巻取り帯=Y)

const spinners=[];
function spin(obj,r,dir,axis){spinners.push({obj,r,dir,axis:axis||'z'});return obj;}

/* 回転体(ロール)レジストリ — BOM準拠 */
const R={};                       // id -> {x,y,r}
function regRoll(id,x,y,r){R[id]={x,y,r}; if(id) R[id].lbl=makeIdLabel(id,x,y+r,0);}   // 札の取付点=ロール上面

/* 軸受チョック(ピローブロック) — 本体ブロック+軸受ハウジング+軸端+取付ボルト */
function chock(x,y,r,z,parent){
  const s=THREE.MathUtils.clamp(r*1.6,0.12,0.30);
  const g=new THREE.Group();g.position.set(x,y,z);(parent||scene).add(g);
  addBox(s,s*1.15,0.10,M.frame,0,-s*0.10,0,g);                 // チョック本体
  addCylZ(s*0.46,0.115,M.steel,0,0,0,g,18);                    // 軸受ハウジング
  addCylZ(s*0.17,0.15,M.paintDark,0,0,0,g,12);                 // 軸端
  for(const bx of [-s*0.36,s*0.36])                            // 取付ボルト
    addBox(0.028,0.045,0.104,M.steel,bx,-s*0.62,0,g);
  return s;}
function chockPair(x,y,r,len){const s=chock(x,y,r,(len/2+0.10));chock(x,y,r,-(len/2+0.10));return s;}

/* 一般ロール(鋼) — 幅方向Z軸。chock:両端軸受 / frame:床置きスタンド(ベースプレート付・gy = 据付面の高さ) */
function roll(id,x,y,dMM,dir,opt){opt=opt||{};
  const r=d2r(dMM), len=opt.len||(STRIP_W+0.34), seg=dMM>=200?40:22, gy=opt.gy||0;
  const m=addCylZ(r,len,opt.mats||rollMats(),x,y,0,scene,seg);
  spin(m,r,dir==null?-1:dir);
  const cs=(opt.chock!==false)?chockPair(x,y,r,len):0;
  if(opt.frame!==false && y-r-gy>0.12){
    const s=cs||0.12, hh=Math.max(0.06,y-0.675*s-gy);
    for(const sd of [-1,1]){const zc=sd*(len/2+0.10);
      addBox(Math.max(0.12,s*0.8),hh,0.13,M.frame,x,gy+hh/2,zc);   // 支柱
      addBox(0.32,0.05,0.34,M.frame,x,gy+0.025,zc,scene,false);}}  // ベースプレート
  regRoll(id,x,y,r); return m;}

/* スタンドハウジング(2柱+天梁) */
function housing(x,h,mat){mat=mat||M.paint;
  addBox(0.16,h,0.16,mat,x,h/2,-(STRIP_W/2+0.42));
  addBox(0.16,h,0.16,mat,x,h/2, (STRIP_W/2+0.42));
  addBox(0.24,0.18,STRIP_W+1.1,M.paintDark,x,h+0.02,0);}

/* 床/ピット底の高さ */
function groundY(x){return ((x>PIT1.x0&&x<PIT1.x1)||(x>PIT2.x0&&x<PIT2.x1))?PIT_FLOOR:0;}

/* ロール列のサイドフレーム — チョック下を縦通し材で繋ぎ、支柱で床/ピット底へ下ろす */
function chainFrame(ids,zoff,postStep){postStep=postStep||3;
  const pts=ids.map(id=>R[id]);
  for(const s of [-1,1]){
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];
      const dx=b.x-a.x,dy=b.y-a.y;
      const m=addBox(Math.hypot(dx,dy)+0.18,0.09,0.12,M.frame,(a.x+b.x)/2,(a.y+b.y)/2-0.13,s*zoff);
      m.rotation.z=Math.atan2(dy,dx);}
    const post=(p)=>{const gy=groundY(p.x),h=p.y-0.175-gy;
      if(h>0.06){addBox(0.09,h,0.09,M.frame,p.x,gy+h/2,s*zoff);
        addBox(0.22,0.04,0.22,M.frame,p.x,gy+0.02,s*zoff,scene,false);}};
    for(let i=0;i<pts.length;i+=postStep)post(pts[i]);
    if((pts.length-1)%postStep)post(pts[pts.length-1]);
  }}

/* 接線(コイル外周→外部点) */
function tangentPoint(cx,cy,Rr,px,py,sign){const dx=px-cx,dy=py-cy,d=Math.hypot(dx,dy)||1e-4;
  const base=Math.atan2(dy,dx),off=Math.acos(THREE.MathUtils.clamp(Rr/d,-1,1)),a=base+sign*off;
  return {x:cx+Rr*Math.cos(a),y:cy+Rr*Math.sin(a),a};}

/* 外部点→円への接線のうち、指定側(top:円の上側/bottom:下側)で帯板が触れる方の接点を選ぶ。
 * 張力下の帯板は「触れない側」のロール面には決して回り込まないため、経路構築は必ずこれを使う。 */
function tangentToSide(cx,cy,r,side,px,py){
  for(const sign of [1,-1]){const t=tangentPoint(cx,cy,r,px,py,sign);
    if(side==='top'?t.y>=cy-1e-6:t.y<=cy+1e-6)return t;}
  return tangentPoint(cx,cy,r,px,py,1);}

/* 2円間の共通接線(帯板が両ロールに同時に接する側を指定)。
 * side1===side2 なら外接線(同じ側を通過する平行掛け)、side1!==side2 なら内接線(上→下のS字反転)。
 * 符号付き半径(top:+r/bottom:-r)で統一的に解く: n方向を共有し T=C+Rsigned*n, (T2-T1)⊥n から
 * d*cos(θ-φ)=R1-R2 を満たすθを求める。 */
function tangentBetween(c1,side1,c2,side2){
  const R1=side1==='top'?c1.r:-c1.r, R2=side2==='top'?c2.r:-c2.r;
  const dx=c2.x-c1.x,dy=c2.y-c1.y,d=Math.hypot(dx,dy)||1e-4;
  const phi=Math.atan2(dy,dx),val=THREE.MathUtils.clamp((R1-R2)/d,-1,1),off=Math.acos(val);
  for(const sign of [1,-1]){const th=phi+sign*off,nx=Math.cos(th),ny=Math.sin(th);
    const t1={x:c1.x+R1*nx,y:c1.y+R1*ny},t2={x:c2.x+R2*nx,y:c2.y+R2*ny};
    const ok1=side1==='top'?t1.y>=c1.y-1e-6:t1.y<=c1.y+1e-6;
    const ok2=side2==='top'?t2.y>=c2.y-1e-6:t2.y<=c2.y+1e-6;
    if(ok1&&ok2)return{t1:{x:t1.x,y:t1.y,a:Math.atan2(t1.y-c1.y,t1.x-c1.x)},t2:{x:t2.x,y:t2.y,a:Math.atan2(t2.y-c2.y,t2.x-c2.x)}};}
  return null;}

/* =========================================================
 * リボンストリップ(動的)
 * ---------------------------------------------------------
 * 帯は中心線(点列)と各点の幅方向ベクトル w(省略時 +Z = 水平に寝た帯)で決まる面。
 * 断面は「平らな面の列」(幅方向の位置。板波・応力の色を幅方向に変えるときは列を増やす)と、
 * 切断した端の「バリ」(端から法線方向に立つ細い面 — 別の材質 = グループ 1 で描く)でできる。
 * 法線: 平らな面は n = w × t(w=+Z・平面経路なら従来と同じ。板波があるときは面の傾きから出し直す)、
 * バリの面は外向き ±w。色(応力コンター)は頂点色で、使わない間は白のまま触らない。
 * =======================================================*/
class Ribbon{
  constructor(width,count,material,opt){opt=opt||{};
    this.w=width;this.n=count;
    const K=Math.max(2,opt.cols|0||2);this.K=K;
    this.cu=new Float32Array(K);for(let j=0;j<K;j++)this.cu[j]=-width/2+width*j/(K-1);   // 列の幅方向位置 [m]
    this.lips=opt.lips|0;                                 // 1: 左端(−w 側)/ 2: 右端(+w 側)/ 3: 両端
    this.nl=(this.lips&1?1:0)+(this.lips&2?1:0);
    const V=count*(K+2*this.nl);this.nf=count*K;
    const g=new THREE.BufferGeometry();
    this.pos=new Float32Array(V*3);this.nor=new Float32Array(V*3);this.uv=new Float32Array(V*2);this.col=new Float32Array(V*3).fill(1);
    const idx=[];
    for(let i=0;i<count-1;i++)for(let j=0;j<K-1;j++){const a=i*K+j,b=a+K;idx.push(a,a+1,b,a+1,b+1,b);}
    const f=idx.length;
    for(let l=0;l<this.nl;l++)for(let i=0;i<count-1;i++){const a=this.nf+(i*this.nl+l)*2,b=a+this.nl*2;idx.push(a,a+1,b,a+1,b+1,b);}
    g.setIndex(idx);
    g.setAttribute("position",new THREE.BufferAttribute(this.pos,3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("normal",new THREE.BufferAttribute(this.nor,3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv",new THREE.BufferAttribute(this.uv,2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color",new THREE.BufferAttribute(this.col,3).setUsage(THREE.DynamicDrawUsage));
    g.addGroup(0,f,0);if(this.nl)g.addGroup(f,idx.length-f,1);
    this.lipCount=idx.length-f;this.showLips=!!this.nl;
    this.geo=g;this.mat0=material;this.lipMat=opt.lipMat||material;
    this.mesh=new THREE.Mesh(g,this.nl?[material,this.lipMat]:material);this.mesh.castShadow=true;this.mesh.frustumCulled=false;scene.add(this.mesh);}
  /* 材質の差し替え(応力コンターの頂点色の材質など)。バリはバリの材質のまま */
  setMaterial(m){this.mesh.material=this.nl?[m,this.lipMat]:m;}
  setLips(on){on=!!on&&!!this.nl;if(on===this.showLips)return;this.showLips=on;
    if(this.nl)this.geo.groups[1].count=on?this.lipCount:0;}
  /* pts: 中心線 / wv: 各点の幅方向単位ベクトル(省略時 +Z)/ o: {lipL, lipR: バリの高さ(法線方向・符号付き m)、
     wave(i,j,u,s) → 法線方向のずれ(板波)、color(i,j,u,col,o3) → 頂点色を書く} */
  update(pts,wv,o){o=o||Ribbon.NO;const h=this.w/2,K=this.K,cu=this.cu,iw=1/this.w;let s=0;const n=Math.min(pts.length,this.n);let pnx=0,pny=1,pnz=0;
    const P=this.pos,N=this.nor,U=this.uv,C=this.col,wave=o.wave,colf=o.color,lips=this.showLips,nl=this.nl;
    let wx=0,wy=0,wz=1,qx=pts[0].x,qy=pts[0].y,qz=pts[0].z;
    for(let i=0;i<n;i++){const p=pts[i],pp=pts[i>0?i-1:0],pn=pts[i<n-1?i+1:n-1];
      if(wv){const w=wv[i];wx=w.x;wy=w.y;wz=w.z;}
      let tx=pn.x-pp.x,ty=pn.y-pp.y,tz=pn.z-pp.z;const tl=Math.sqrt(tx*tx+ty*ty+tz*tz);
      let nx=pnx,ny=pny,nz=pnz;
      if(tl>1e-6){tx/=tl;ty/=tl;tz/=tl;
        const cx=wy*tz-wz*ty,cy=wz*tx-wx*tz,cz=wx*ty-wy*tx,cl=Math.sqrt(cx*cx+cy*cy+cz*cz);
        if(cl>1e-6){nx=cx/cl;ny=cy/cl;nz=cz/cl;pnx=nx;pny=ny;pnz=nz;}}
      const dx=p.x-qx,dy=p.y-qy,dz=p.z-qz;s+=Math.sqrt(dx*dx+dy*dy+dz*dz);qx=p.x;qy=p.y;qz=p.z;const us=s/UV_SCALE;
      for(let j=0;j<K;j++){const u=cu[j],v=wave?wave(i,j,u,s):0,o3=(i*K+j)*3,o2=(i*K+j)*2;
        P[o3]=p.x+wx*u+nx*v;P[o3+1]=p.y+wy*u+ny*v;P[o3+2]=p.z+wz*u+nz*v;
        N[o3]=nx;N[o3+1]=ny;N[o3+2]=nz;U[o2]=us;U[o2+1]=(u+h)*iw;
        if(colf)colf(i,j,u,C,o3);}
      if(lips){let l=0;
        for(let side=1;side<=2;side++){if(!(this.lips&side))continue;
          const sg=side===1?-1:1,e=side===1?0:K-1,hl=side===1?(o.lipL||0):(o.lipR||0),vb=this.nf+(i*nl+l)*2,eo=(i*K+e)*3;
          for(let q=0;q<2;q++){const o3=(vb+q)*3,d=q?hl:0;
            P[o3]=P[eo]+nx*d;P[o3+1]=P[eo+1]+ny*d;P[o3+2]=P[eo+2]+nz*d;
            N[o3]=wx*sg;N[o3+1]=wy*sg;N[o3+2]=wz*sg;
            U[(vb+q)*2]=us;U[(vb+q)*2+1]=side===1?0:1;}
          l++;}}}
    if(wave)this._waveNormals(n);
    const at=this.geo.attributes;at.position.needsUpdate=true;at.normal.needsUpdate=true;at.uv.needsUpdate=true;
    if(colf)at.color.needsUpdate=true;}
  /* 板波があるときの平らな面の法線: 面の2方向の差分の外積 (∂P/∂u × ∂P/∂s) */
  _waveNormals(n){const K=this.K,P=this.pos,N=this.nor;
    for(let i=0;i<n;i++)for(let j=0;j<K;j++){
      const ia=(Math.max(i-1,0)*K+j)*3,ib=(Math.min(i+1,n-1)*K+j)*3,ja=(i*K+Math.max(j-1,0))*3,jb=(i*K+Math.min(j+1,K-1))*3,o3=(i*K+j)*3;
      const sx=P[ib]-P[ia],sy=P[ib+1]-P[ia+1],sz=P[ib+2]-P[ia+2],ux=P[jb]-P[ja],uy=P[jb+1]-P[ja+1],uz=P[jb+2]-P[ja+2];
      let cx=uy*sz-uz*sy,cy=uz*sx-ux*sz,cz=ux*sy-uy*sx;const cl=Math.hypot(cx,cy,cz);
      if(cl>1e-12){cx/=cl;cy/=cl;cz/=cl;if(cx*N[o3]+cy*N[o3+1]+cz*N[o3+2]<0){cx=-cx;cy=-cy;cz=-cz;}N[o3]=cx;N[o3+1]=cy;N[o3+2]=cz;}}}
  /* 頂点色を白へ戻す(応力コンターを消したとき) */
  clearColor(){this.col.fill(1);this.geo.attributes.color.needsUpdate=true;}
  dispose(){scene.remove(this.mesh);this.geo.dispose();}
}
Ribbon.NO={};

/* =========================================================
 * 経路の等間隔リサンプル(属性つき)
 * ---------------------------------------------------------
 * path: {p:[Vector3], L:[累積長], k:[曲率], tau:[張力], nw:[板波なし], w:[幅方向] or null}
 * [a, b](弧長)を n 点に切り出し、out へ書く(Vector3 は使い回す)。曲率は間隔の中の最大(絶対値)を
 * 拾う — 小径ロールの巻付き弧(φ100 で弧長数 cm)が等間隔の点のあいだに落ちても曲げ応力を失わない。
 * =======================================================*/
function makeSampleBuf(n,frames){const o={n,p:[],w:frames?[]:null,k:new Float32Array(n),tau:new Float32Array(n),
  nw:new Float32Array(n),s:new Float32Array(n)};
  for(let i=0;i<n;i++){o.p.push(new THREE.Vector3());if(frames)o.w.push(new THREE.Vector3());}return o;}
function resamplePath(P,a,b,n,out){const L=P.L,m=P.p.length,k=P.k;
  if(m<2){for(let j=0;j<n;j++)out.p[j].copy(P.p[0]||Z_AXIS);return;}
  a=Math.max(0,a);b=Math.min(L[m-1],b);if(b<a)b=a;
  const ds=n>1?(b-a)/(n-1):0;let seg=0,q=0;
  for(let j=0;j<n;j++){const s=a+ds*j;
    while(seg<m-2&&L[seg+1]<s)seg++;
    const l=L[seg+1]-L[seg],t=l>1e-9?Math.min(1,Math.max(0,(s-L[seg])/l)):0;
    out.p[j].lerpVectors(P.p[seg],P.p[seg+1],t);
    if(out.w)out.w[j].lerpVectors(P.w[seg],P.w[seg+1],t).normalize();
    out.tau[j]=P.tau[seg];out.nw[j]=P.nw[seg]||P.nw[seg+1];out.s[j]=s;
    // 曲率: [s−ds/2, s+ds/2] の中の経路点の最大(なければ補間)
    let km=k[seg]+(k[seg+1]-k[seg])*t;const lo=s-ds/2,hi=s+ds/2;
    while(q<m-1&&L[q]<lo)q++;
    for(let r=q;r<m&&L[r]<=hi;r++)if(Math.abs(k[r])>Math.abs(km))km=k[r];
    out.k[j]=km;}}

/* =========================================================
 * ラベル(画面の札)
 * ---------------------------------------------------------
 * 札は画面の上に px の大きさで置く(寄っても設備を覆わない)。
 * 毎フレーム、取付点(設備の上面)を画面へ投影して札の置き場所を決める:
 *   ① 取付点の真上 → ② ふさがっていれば 先に置いた札の上/左右へ寄せる
 *   → ③ どこにも置けなければ隠す。寄せた札は引出し線で取付点と結ぶ。
 * 置く順は 種類(設備名・OS/DS → ロールID)→ rank の小さい順 → カメラに近い順。
 * 同じ名前の札(両側の屑巻取機・油圧ユニットなど)は近い1枚だけが優先で、残りと OS/DS・ロールIDは
 * 「取付点のすぐそばに素直に置けるときだけ」出す(全景で札が塔のように積み上がらない)。
 * 新しく出す札は少し(0.15〜0.3 秒)続けて置けてから出す。前の置き場所の近くは少し安く見る(カメラを回したときの点滅・跳ね止め)。
 * 減点: 引出し線が他の札の裏を通る / 札が他の取付点・引出し線を隠す / 引出し線どうしが交わる。
 * パネル・操作ヘルプの下には置かない(取付点が隠れている札は出さない)。
 * =======================================================*/
const labelGroup={visible:true}, idLabelGroup={visible:false};   // 表示切替(設備名 / ロールID)
const LBL=(function(){
  const NS="http://www.w3.org/2000/svg";
  const layer=document.createElement("div");layer.id="labels";document.body.appendChild(layer);
  const svg=document.createElementNS(NS,"svg");layer.appendChild(svg);
  // stem: 札の下端〜取付点 / gap: 札どうしの隙間 / up・side: 寄せてよい距離[px]
  // far: これより遠いと出さない[m] / opt: そばに素直に置けるときだけ出す / appear: 出るまでの確認時間[s]
  const KIND={main:{tier:0,stem:10,gap:4,up:150,side:120,far:Infinity,opt:false,appear:0.15},
              sub: {tier:0,stem:7, gap:3,up:40, side:40, far:12,      opt:true, appear:0.15},
              rid: {tier:2,stem:6, gap:2,up:48, side:36, far:Infinity,opt:true, appear:0.3}};
  const HYST=16, HYST_R=14, OPT_MAX=30;                      // 前の置き場所の優先(半径px内)/ 任意札の上限
  const PEN={crossBox:90,hideDot:100,hideLead:40,crossLead:15};
  const GEN_MAX=14;                                          // 候補づくりに使う近くの札の数
  const items=[], placed=[], leads=[], _p=new THREE.Vector3();
  let W=0,H=0,obst=[],obstDirty=true;
  const OBST_IDS=["panel","help"];
  if(typeof ResizeObserver!=="undefined"){const ro=new ResizeObserver(()=>{obstDirty=true;});
    for(const id of OBST_IDS){const e=document.getElementById(id);if(e)ro.observe(e);}}
  window.addEventListener("resize",()=>{obstDirty=true;});

  function add(text,pos,kind,group,opt){opt=opt||{};
    const el=document.createElement("div");el.className="tag3d "+kind;el.textContent=text;layer.appendChild(el);
    const ln=document.createElementNS(NS,"line");ln.setAttribute("class","ln "+kind);svg.appendChild(ln);
    const dot=document.createElementNS(NS,"circle");dot.setAttribute("class","dt "+kind);
    dot.setAttribute("r",kind==="rid"?1.6:2.2);svg.appendChild(dot);
    const it={el,ln,dot,k:KIND[kind],group,rank:opt.rank==null?50:opt.rank,follow:opt.follow||null,
      text,position:pos.clone(),w:0,h:0,ax:0,ay:0,d:0,dup:false,okT:0,
      want:false,shown:false,a:0,tx:0,ty:0,ox:0,oy:0,out:""};
    items.push(it);return it;}

  /* ---- 画面上の当たり判定 ---- */
  const hitRect=(l,t,r,b,q,m)=>l<q.r+m&&r>q.l-m&&t<q.b+m&&b>q.t-m;
  function segHitsRect(x1,y1,x2,y2,q){                    // 線分と矩形(Liang–Barsky)
    let t0=0,t1=1;const dx=x2-x1,dy=y2-y1;
    for(const [p,v] of [[-dx,x1-q.l],[dx,q.r-x1],[-dy,y1-q.t],[dy,q.b-y1]]){
      if(p===0){if(v<0)return false;continue;}
      const s=v/p;if(p<0){if(s>t1)return false;if(s>t0)t0=s;}else{if(s<t0)return false;if(s<t1)t1=s;}}
    return t0<t1;}
  function segCross(a,b){                                  // 線分どうしの交差(端点の接触は除く)
    const d=(p,q,r)=>(q.x2-q.x1)*(r-q.y1)-(q.y2-q.y1)*(p-q.x1);
    const d1=d(a.x1,b,a.y1),d2=d(a.x2,b,a.y2),d3=d(b.x1,a,b.y1),d4=d(b.x2,a,b.y2);
    return d1*d2<0&&d3*d4<0;}

  /* ---- 1枚の置き場所を探す(候補を安い順に試す)。lim: 任意の札が受け入れる上限(減点も不可) ---- */
  function place(it,lim){
    const k=it.k,w=it.w,h=it.h,ax=it.ax,ay=it.ay,y0=ay-k.stem,g=k.gap;
    const L0=ax-w/2-k.side-g, R0=ax+w/2+k.side+g, T0=y0-k.up-h-g;
    const near=[];                                          // 候補の札と重なり得るもの(判定は全部で行う)
    for(const q of placed)if(q.r>L0&&q.l<R0&&q.b>T0&&q.t<ay+g)near.push(q);
    for(const q of obst)if(q.r>L0&&q.l<R0&&q.b>T0&&q.t<ay+g)near.push(q);
    const gen=near.length>GEN_MAX?near.slice().sort((p,q)=>
      Math.abs((p.l+p.r)/2-ax)+Math.abs(p.b-y0)-Math.abs((q.l+q.r)/2-ax)-Math.abs(q.b-y0)).slice(0,GEN_MAX):near;
    // 候補: 真上・画面の端・近くの札の左/右/上にぴったり。丸めは必ず相手から離れる向き
    // (近づく向きに丸めると 1px 未満の重なりで候補が1フレームおきに消え、札が跳ねる)
    const dxs=new Set([0,Math.ceil(4+w/2-ax),Math.floor(W-4-w/2-ax)]), dys=new Set([0]);
    for(const q of gen){dxs.add(Math.floor(q.l-g-w/2-ax));dxs.add(Math.ceil(q.r+g+w/2-ax));dys.add(Math.ceil(y0-(q.t-g)));}
    const prev=it.shown?{dx:it.tx,dy:it.ty}:null;
    if(prev){dxs.add(prev.dx);dys.add(prev.dy);}
    const cand=[];
    for(const dx of dxs){if(Math.abs(dx)>k.side)continue;
      for(const dy of dys){if(dy<0||dy>k.up)continue;
        let c=dy+1.25*Math.abs(dx);
        if(prev){const dd=Math.hypot(dx-prev.dx,dy-prev.dy);   // 前の置き場所の近く(隣の札に付いて動く分も含む)を優先
          if(dd<HYST_R)c-=HYST*(1-dd/HYST_R);}
        if(c<=lim)cand.push({dx,dy,c});}}
    cand.sort((a,b)=>a.c-b.c);
    let best=null,bestC=Infinity;
    for(const c of cand){if(c.c>=bestC)break;
      const l=ax+c.dx-w/2,r=l+w,b=y0-c.dy,t=b-h;
      if(l<2||r>W-2||t<2||b>H-2)continue;
      let bad=false;for(const q of near)if(hitRect(l,t,r,b,q,g)){bad=true;break;}
      if(bad)continue;
      // 減点: 引出し線が他の札の裏を通る / 札が他の取付点・引出し線を隠す / 引出し線どうしが交わる
      const lx=Math.min(Math.max(ax,l+5),r-5), me={x1:ax,y1:ay,x2:lx,y2:b};
      let pen=0;
      if(c.dx!==0||c.dy!==0)for(const q of placed)if(segHitsRect(ax,ay,lx,b,q))pen+=PEN.crossBox;
      for(const s of leads){
        if(s.x1>l-4&&s.x1<r+4&&s.y1>t-4&&s.y1<b+4)pen+=PEN.hideDot;
        else if(segHitsRect(s.x1,s.y1,s.x2,s.y2,{l:l-2,t:t-2,r:r+2,b:b+2}))pen+=PEN.hideLead;
        else if(segCross(me,s))pen+=PEN.crossLead;}
      if(pen>0&&lim<Infinity)continue;                       // 任意の札は減点なしで置けるときだけ
      if(c.c+pen<bestC){bestC=c.c+pen;best={dx:c.dx,dy:c.dy,l,t,r,b,lx};}}
    return best;}

  /* ---- 取付点を画面へ(出せないときは false) ---- */
  function project(it){
    if(!it.group.visible||!it.w)return false;
    if(it.follow)it.follow(it.position);
    if(it.k.far<Infinity&&camera.position.distanceTo(it.position)>it.k.far)return false;
    _p.copy(it.position).project(camera);
    if(_p.z<-1||_p.z>1)return false;                          // カメラの後ろ・遠すぎ
    const ax=(_p.x+1)/2*W, ay=(1-_p.y)/2*H;
    if(ax<0||ax>W||ay<0||ay>H)return false;
    for(const q of obst)if(ax>q.l&&ax<q.r&&ay>q.t&&ay<q.b)return false;   // パネルの下
    it.ax=ax;it.ay=ay;it.d=_p.z;return true;}

  /* ---- 毎フレーム: 投影 → 置く → 書き出す(DOMの読み取りは先に済ませる) ---- */
  function update(dt){
    W=window.innerWidth;H=window.innerHeight;
    for(const it of items)if(!it.w){it.w=it.el.offsetWidth;it.h=it.el.offsetHeight;}
    if(obstDirty){obstDirty=false;obst=[];
      for(const id of OBST_IDS){const e=document.getElementById(id);if(!e)continue;
        const r=e.getBoundingClientRect();if(r.width>0&&r.height>0)obst.push({l:r.left,t:r.top,r:r.right,b:r.bottom});}}
    const act=[];
    for(const it of items){it.want=false;if(project(it))act.push(it);else it.okT=0;}
    act.sort((a,b)=>a.k.tier-b.k.tier||a.rank-b.rank||a.d-b.d);
    const seen=new Set();                                         // 同じ名前は近い1枚が優先、残りは後回し
    for(const it of act){const key=it.k.tier+"|"+it.text;it.dup=seen.has(key);seen.add(key);}
    act.sort((a,b)=>a.k.tier-b.k.tier||a.dup-b.dup);             // 安定ソート(順番は上のまま)
    placed.length=0;leads.length=0;
    for(const it of act){
      const lim=(it.k.opt||it.dup)?OPT_MAX+(it.shown?HYST:0):Infinity;
      const best=place(it,lim);
      it.okT=best?it.okT+dt:0;
      it.want=!!best&&(it.shown||it.okT>=it.k.appear);          // 新しく出す札は少し続けて置けてから
      if(!it.want)continue;
      it.tx=best.dx;it.ty=best.dy;
      placed.push({l:best.l,t:best.t,r:best.r,b:best.b});
      leads.push({x1:it.ax,y1:it.ay,x2:best.lx,y2:best.b});}
    const km=1-Math.exp(-dt*14), ka=1-Math.exp(-dt*12);
    for(const it of items){
      if(it.want){if(!it.shown||it.a<0.05){it.ox=it.tx;it.oy=it.ty;}else{it.ox+=(it.tx-it.ox)*km;it.oy+=(it.ty-it.oy)*km;}}
      it.shown=it.want;
      it.a+=((it.want?1:0)-it.a)*ka;if(!it.want&&it.a<0.03)it.a=0;
      if(it.a===0){if(it.out!=="off"){it.out="off";it.el.style.visibility="hidden";
        it.ln.style.visibility="hidden";it.dot.style.visibility="hidden";}continue;}
      const l=Math.round(it.ax+it.ox-it.w/2), t=Math.round(it.ay-it.k.stem-it.oy-it.h);
      const lx=Math.min(Math.max(it.ax,l+5),l+it.w-5), a=it.a.toFixed(2);
      const key=l+","+t+","+a+","+Math.round(it.ax)+","+Math.round(it.ay);
      if(key===it.out)continue;
      if(it.out==="off"||!it.out){it.el.style.visibility="visible";it.ln.style.visibility="visible";it.dot.style.visibility="visible";}
      it.out=key;
      it.el.style.transform=`translate(${l}px,${t}px)`;it.el.style.opacity=a;
      it.ln.setAttribute("x1",it.ax.toFixed(1));it.ln.setAttribute("y1",it.ay.toFixed(1));
      it.ln.setAttribute("x2",lx.toFixed(1));it.ln.setAttribute("y2",t+it.h);it.ln.style.opacity=a;
      it.dot.setAttribute("cx",it.ax.toFixed(1));it.dot.setAttribute("cy",it.ay.toFixed(1));it.dot.style.opacity=a;}}
  /* 札の文字を変える(幅は次の update で測り直す) */
  function setText(it,text){if(!it||it.text===text)return;it.text=text;it.el.textContent=text;it.w=0;it.out="";}
  return{add,update,items,setText};
})();
/* 設備名(opt.rank: 小さいほど先に良い場所へ / opt.follow(pos): 取付点を毎フレーム動かす) */
function makeLabel(text,x,y,z,opt){return LBL.add(text,V3(x,y,z),"main",labelGroup,opt);}
function makeSubLabel(text,x,y,z,opt){return LBL.add(text,V3(x,y,z),"sub",labelGroup,opt);}
function makeIdLabel(text,x,y,z){return LBL.add(text,V3(x,y,z),"rid",idLabelGroup);}
