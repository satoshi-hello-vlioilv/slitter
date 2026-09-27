"use strict";
/* =========================================================
 * 工場床・ピット・建屋
 * =======================================================*/
const buildingGroup=new THREE.Group(); scene.add(buildingGroup);   // 建屋柱・梁(トグル対象)
/* 床(GL+1000)の上か — 配置図の枠の内側 */
function floorAt(x,z){const P=FLOOR_POLY;let c=false;
  for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}
  return c;}
(function buildFactory(){
  const FD=9, PH0=-GL_Y;                  // 床の半奥行き(建屋)/ 足場の高さ(GL から 1.0)
  /* 足場(GL+1000 のステージ)— 配置図の枠の内側は鋼製の足場: 角形鋼管の脚で立つ机のような骨組みで、
     下は GL まで空いている。上面は滑り止めの縞鋼板、色はカッター台車の緑。
     開口: ルーパーピット・スクラップピットの開いている所(操作側は足場で塞ぐ)・コイルカー走行路(縁から切り欠く)。
     ピットと走行路は GL から下がコンクリートの躯体、GL から足場までは緑の金網の囲い(ステージの下は見通せる)。
     形は平面(x,z)で描き、押し出してから寝かせる(形のy = −z)。 */
  const DT=0.009, CH=0.20, CW=0.075;        // 縞鋼板の厚み / 縁の溝形鋼・大梁のせい / 溝形鋼の幅
  const inPoly=(P,x,z)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,zi]=P[i],[xj,zj]=P[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}return c;};
  const rectP=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
  const path=(P,sh)=>{const p=sh||new THREE.Path();P.forEach(([x,z],i)=>i?p.lineTo(x,-z):p.moveTo(x,-z));p.closePath();return p;};
  // 足場の外形: 床の外形の縁(z=zEdge)にコイルカー走行路の切り欠きを挟み込む
  const OUT=FLOOR_POLY.map(p=>p.slice());
  for(const c of CAR_PITS){
    const i=OUT.findIndex((p,k)=>{const q=OUT[(k+1)%OUT.length];return Math.abs(p[1]-c.zEdge)<1e-6&&Math.abs(q[1]-c.zEdge)<1e-6&&
      Math.min(p[0],q[0])<c.x-CAR_PIT_HW&&Math.max(p[0],q[0])>c.x+CAR_PIT_HW;});
    const p=OUT[i],q=OUT[(i+1)%OUT.length],dir=Math.sign(q[0]-p[0]),xa=c.x-dir*CAR_PIT_HW,xb=c.x+dir*CAR_PIT_HW;
    OUT.splice(i+1,0,[xa,c.zEdge],[xa,c.z0],[xb,c.z0],[xb,c.zEdge]);}
  const SP=SCRAP_PIT, PITS=[PIT1,PIT2].map(p=>rectP(p.x0,-PIT_HZ,p.x1,PIT_HZ));
  const HOLES=[...PITS,rectP(SP.x0,SP.z0,SP.x1,SP.cover.z0)];                                   // 足場の開口
  const LANES=CAR_PITS.map(c=>rectP(c.x-CAR_PIT_HW,c.z0,c.x+CAR_PIT_HW,c.z1));
  const deckAt=(x,z)=>inPoly(OUT,x,z)&&!HOLES.some(h=>inPoly(h,x,z));
  const groundAt=(x,z)=>![...PITS,SP.poly,...LANES].some(h=>inPoly(h,x,z));                  // GL が地面(ピット・溝でない)
  // 上面の縞鋼板(1枚の板・UV はメートル)
  {const sh=path(OUT,new THREE.Shape());for(const h of HOLES)sh.holes.push(path(h));
    const dg=new THREE.ExtrudeGeometry(sh,{depth:DT,bevelEnabled:false});dg.rotateX(-Math.PI/2);dg.translate(0,-DT,0);
    const deck=new THREE.Mesh(dg,M.stageDeck);deck.receiveShadow=true;deck.castShadow=true;scene.add(deck);}
  // 骨組みはまとめ描き(箱 [x,y,z,幅x,高さy,奥行きz])
  const UB=new THREE.BoxGeometry(1,1,1);
  const boxes=(mat,list,cast)=>{if(!list.length)return;const m=new THREE.InstancedMesh(UB,mat,list.length),o=new THREE.Object3D();
    list.forEach((b,i)=>{o.position.set(b[0],b[1],b[2]);o.scale.set(b[3],b[4],b[5]);o.updateMatrix();m.setMatrixAt(i,o.matrix);});
    m.instanceMatrix.needsUpdate=true;m.frustumCulled=false;m.castShadow=cast!==false;m.receiveShadow=true;scene.add(m);};
  // 軸 ax の線(もう一方の座標 c)のうち ok な区間(2cm 刻みで調べる)
  const spans=(ax,c,lo,hi,ok)=>{const st=0.02,out=[];let a=null;
    for(let u=lo;u<=hi+1e-9;u+=st){const in_=ax==="x"?ok(u,c):ok(c,u);
      if(in_&&a===null)a=u;if(!in_&&a!==null){out.push([a,u-st]);a=null;}}
    if(a!==null)out.push([a,hi]);return out.filter(q=>q[1]-q[0]>0.3);};
  // 縁の溝形鋼: 外形と開口の縁を回す(足場の側に置き、外面を縁に揃える)
  const edges=[],frame=[];
  for(const P of [OUT,...HOLES])P.forEach((p,i)=>{const q=P[(i+1)%P.length],dx=q[0]-p[0],dz=q[1]-p[1],L=Math.hypot(dx,dz);if(L<0.01)return;
    const ux=dx/L,uz=dz/L,mx=(p[0]+q[0])/2,mz=(p[1]+q[1])/2;let nx=-uz,nz=ux;
    if(!deckAt(mx+nx*0.05,mz+nz*0.05)){nx=-nx;nz=-nz;}if(!deckAt(mx+nx*0.05,mz+nz*0.05))return;
    edges.push({p,q,L,ux,uz,nx,nz});
    const cx=mx+nx*CW/2,cz=mz+nz*CW/2;frame.push(Math.abs(ux)>0.5?[cx,-DT-CH/2,cz,L,CH,CW]:[cx,-DT-CH/2,cz,CW,CH,L]);});
  // 脚(角形鋼管 □150): 縁に沿って 2.0m 以内ごと(縁から 0.10 内側・角は両方の縁から)+ 中は 2.0 × 1.95m の格子。
  // 足元が地面(GL)で、上が足場の所だけに立てる(ピット・走行路の上には立てない)
  const okLeg=(x,z)=>[[-1,-1],[1,-1],[-1,1],[1,1]].every(([a,b])=>deckAt(x+a*0.12,z+b*0.12)&&groundAt(x+a*0.12,z+b*0.12));
  const legs=[];const addLeg=(x,z)=>{if(okLeg(x,z)&&!legs.some(l=>Math.hypot(l[0]-x,l[1]-z)<0.5))legs.push([x,z]);};
  for(const e of edges){const n=Math.max(1,Math.ceil(e.L/2.0));
    for(let k=0;k<=n;k++){const t=k/n,x=e.p[0]+(e.q[0]-e.p[0])*t,z=e.p[1]+(e.q[1]-e.p[1])*t,end=k===0||k===n;
      addLeg(x+e.nx*0.10+(end?e.ux*(k?-0.10:0.10):0),z+e.nz*0.10+(end?e.uz*(k?-0.10:0.10):0));}}
  const edgeLegs=legs.length, ZL=[], XL=[];
  for(let z=-5.296;z<=8.44;z+=1.962)ZL.push(+z.toFixed(3));                  // 大梁の通り(x 方向)
  for(let x=-14.49;x<=16.62;x+=1.0)XL.push(+x.toFixed(3));                    // 小梁の通り(z 方向・約 1.0m)
  for(const z of ZL)for(let i=0;i<XL.length;i+=2){const x=XL[i];
    if(!legs.slice(0,edgeLegs).some(l=>Math.hypot(l[0]-x,l[1]-z)<0.9))addLeg(x,z);}
  const LT=-DT-CH;                                                            // 脚の上端(梁の下面)
  boxes(M.stage,legs.map(([x,z])=>[x,(GL_Y+0.02+LT)/2,z,0.15,LT-GL_Y-0.02,0.15]));
  boxes(M.stage,legs.map(([x,z])=>[x,GL_Y+0.01,z,0.30,0.02,0.30]));           // ベースプレート
  // 大梁(H200・x 方向・脚の通り)と小梁(H150・z 方向)。足場の下だけ(開口では切る)
  const beams=[];
  for(const z of ZL)for(const [a,b] of spans("x",z,-14.8,16.9,deckAt))beams.push([(a+b)/2,-DT-CH/2,z,b-a,CH,0.10]);
  for(const x of XL)for(const [a,b] of spans("z",x,-5.5,8.7,deckAt))beams.push([x,-DT-0.075,(a+b)/2,0.075,0.15,b-a]);
  boxes(M.stage,frame.concat(beams));
  // GL(建屋の床)。足場の下にも続く — ピット・スクラップピット・コイルカーの溝だけ抜く
  {const gl=new THREE.Shape();
    gl.moveTo(FAC_X0,FD);gl.lineTo(FAC_X1,FD);gl.lineTo(FAC_X1,-FD);gl.lineTo(FAC_X0,-FD);gl.closePath();
    for(const h of [...PITS,SP.poly,...LANES])gl.holes.push(path(h));
    const gg=new THREE.ShapeGeometry(gl);gg.rotateX(-Math.PI/2);gg.translate(0,GL_Y,0);
    const ground=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({map:concreteTex(1/2.2,1/2.2),color:0xc9ced4,metalness:0.05,roughness:0.95}));
    ground.receiveShadow=true;scene.add(ground);}
  // 開口の囲い(GL → 足場の下面): 緑のエキスパンドメタルの金網を柱と下の山形鋼で立てる(ステージの下は見通せる)。
  // p→q の縁に沿い、開口の外(足場の側)0.02 に置く
  const posts=[], rails=[], H=-DT-CH-GL_Y;
  const guard=(ax,az,bx,bz,outX,outZ)=>{const L=Math.hypot(bx-ax,bz-az),x=(ax+bx)/2+outX*0.02,z=(az+bz)/2+outZ*0.02,alongX=Math.abs(bx-ax)>0.01;
    const g=new THREE.PlaneGeometry(L,H),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*L/0.24,uv.getY(i)*H/0.24);
    const m=new THREE.Mesh(g,M.stageMesh);m.position.set(x,GL_Y+H/2,z);if(!alongX)m.rotation.y=Math.PI/2;
    m.castShadow=true;m.receiveShadow=true;scene.add(m);
    rails.push(alongX?[x,GL_Y+0.025,z,L,0.05,0.05]:[x,GL_Y+0.025,z,0.05,0.05,L]);
    const n=Math.max(1,Math.ceil(L/2.0));
    for(let k=0;k<=n;k++){const t=k/n;posts.push([ax+(bx-ax)*t+outX*0.02,GL_Y+H/2,az+(bz-az)*t+outZ*0.02,0.06,H,0.06]);}};
  const around=P=>P.forEach((p,i)=>{const q=P[(i+1)%P.length],mx=(p[0]+q[0])/2,mz=(p[1]+q[1])/2,L=Math.hypot(q[0]-p[0],q[1]-p[1]);
    let nx=-(q[1]-p[1])/L,nz=(q[0]-p[0])/L;if(inPoly(P,mx+nx*0.02,mz+nz*0.02)){nx=-nx;nz=-nz;}guard(p[0],p[1],q[0],q[1],nx,nz);});
  for(const P of [...PITS,SP.poly])around(P);
  for(const c of CAR_PITS){for(const s of [-1,1])guard(c.x+s*CAR_PIT_HW,c.z0,c.x+s*CAR_PIT_HW,c.zEdge,s,0);
    guard(c.x-CAR_PIT_HW,c.z0,c.x+CAR_PIT_HW,c.z0,0,-1);}
  boxes(M.stage,posts.concat(rails));
  // 階段(GL ↔ 足場)。鋼製: 縞鋼板の踏板7段(蹴込みなし)・ささら桁は足場の緑・手すりは両側(黄)。axis の向きに降りる
  const tread=(w,d,x,y,z)=>{const g=new THREE.BoxGeometry(w,0.04,d),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w,uv.getY(i)*d);                        // UV をメートルに(縞の大きさを揃える)
    const m=new THREE.Mesh(g,M.stageDeck);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);};
  for(const S of STAIRS){const n=7,tr=S.run/n,rise=PH0/(n+1),w=S.a1-S.a0,ca=(S.a0+S.a1)/2;
    const at=(u,a)=>S.axis==="z"?[a,u]:[u,a];                                  // (進み u, 幅方向 a) → [x,z]
    for(let k=0;k<n;k++){const u=S.edge+S.dir*tr*(k+0.5),[x,z]=at(u,ca);
      if(S.axis==="z")tread(w-0.08,tr+0.02,x,-rise*(k+1)-0.02,z);else tread(tr+0.02,w-0.08,x,-rise*(k+1)-0.02,z);}
    const ang=Math.atan2(PH0,S.run),Ls=Math.hypot(PH0,S.run),um=S.edge+S.dir*S.run/2;
    for(const e of [S.a0+0.03,S.a1-0.03]){const [x,z]=at(um,e);
      const st=S.axis==="z"?addBox(0.05,0.22,Ls,M.stage,x,-PH0/2-0.08,z):addBox(Ls,0.22,0.05,M.stage,x,-PH0/2-0.08,z);
      const hr=S.axis==="z"?addBox(0.045,0.045,Ls,M.yellow,x,-PH0/2+0.92,z,scene,false):addBox(Ls,0.045,0.045,M.yellow,x,-PH0/2+0.92,z,scene,false);
      if(S.axis==="z"){st.rotation.x=S.dir*ang;hr.rotation.x=S.dir*ang;}else{st.rotation.z=-S.dir*ang;hr.rotation.z=-S.dir*ang;}
      for(const f of [0,1]){const [px,pz]=at(S.edge+S.dir*S.run*f,e);addBox(0.05,0.92,0.05,M.yellow,px,(f?GL_Y:0)+0.46,pz,scene,false);}}}
  // ルーパーピット — GL から下の RC 躯体(側壁の内面/端壁の内面が開口端)。GL から上は金網の囲い
  const PH=GL_Y-PIT_FLOOR+0.05, PY=(GL_Y+PIT_FLOOR-0.05)/2;                  // 壁の高さ(GL → ピット床の下面)/ 中心
  for(const p of [PIT1,PIT2]){
    const w=p.x1-p.x0,cx=(p.x0+p.x1)/2;
    for(const sgn of [-1,1])addBox(w,PH,0.1,M.pit,cx,PY,sgn*(PIT_HZ+0.05));
    addBox(0.1,PH,2*PIT_HZ,M.pit,p.x0-0.05,PY,0);addBox(0.1,PH,2*PIT_HZ,M.pit,p.x1+0.05,PY,0);
    addBox(w,0.1,2*PIT_HZ,M.pit,cx,PIT_FLOOR-0.05,0,scene,false).receiveShadow=true;
    for(const sgn of [-1,1])addBox(w+0.3,0.022,0.14,M.hazard,cx,0.012,sgn*(PIT_HZ+0.11));  // 開口縁の注意帯(足場の上)
  }
  // スクラップピットの縁のうち開いている区間(操作側 z ≥ cover.z0 は蓋で塞いである)。
  // 線分 (x0,z0)+t(ux,uz)・t∈[0,L] の z < cover.z0 の区間を返す
  function openSpan(x0,z0,ux,uz,L){const zc=SCRAP_PIT.cover.z0;
    if(Math.abs(uz)<1e-6)return z0<zc?[[0,L]]:[];
    const t=(zc-z0)/uz;
    if(uz>0)return t<=0?[]:[[0,Math.min(L,t)]];
    return t>=L?[]:[[Math.max(0,t),L]];}
  // スクラップワインダーのピット(図の L 字)。出側テーブルの側枠はピットに渡した梁で受ける
  {const P=SCRAP_PIT,poly=P.poly,D=GL_Y-P.floor+0.05,n=poly.length;                          // RC 躯体は GL から下
    const inside=(x,z)=>{let c=false;for(let i=0,j=n-1;i<n;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];
      if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}return c;};
    for(let i=0;i<n;i++){const [x0,z0]=poly[i],[x1,z1]=poly[(i+1)%n],L=Math.hypot(x1-x0,z1-z0),ux=(x1-x0)/L,uz=(z1-z0)/L;
      let nx=uz,nz=-ux;const mx=(x0+x1)/2,mz=(z0+z1)/2;if(inside(mx+nx*0.02,mz+nz*0.02)){nx=-nx;nz=-nz;}   // 外向き
      const w=addBox(Math.abs(ux)>0.5?L+0.12:0.06,D,Math.abs(ux)>0.5?0.06:L+0.12,M.pit,mx+nx*0.03,GL_Y-D/2,mz+nz*0.03);
      const hx=mx+nx*0.11,hz=mz+nz*0.11;
      if(floorAt(hx-ux*L/2,hz-uz*L/2)&&floorAt(hx+ux*L/2,hz+uz*L/2))
        for(const [a,b] of openSpan(x0,z0,ux,uz,L)){const l=b-a,c=(a+b)/2-L/2;                        // 開口縁の注意帯(開いている区間)
          addBox(Math.abs(ux)>0.5?l:0.14,0.022,Math.abs(ux)>0.5?0.14:l,M.hazard,hx+ux*c,0.012,hz+uz*c);}}
    addBox(P.x1-P.x0,0.1,3.676-P.z0,M.pit,(P.x0+P.x1)/2,P.floor-0.05,(P.z0+3.676)/2,scene,false).receiveShadow=true;
    addBox(5.33-P.x0,0.1,P.z1-3.676,M.pit,(P.x0+5.33)/2,P.floor-0.05,(3.676+P.z1)/2,scene,false).receiveShadow=true;
    for(const s of [-1,1])addBox(P.x1-P.x0+0.1,0.16,0.16,M.frame,(P.x0+P.x1)/2,-0.08,s*(STRIP_W/2+0.27));}  // 梁(テーブル側枠の下)
  /* 操作側の開口は足場の縞鋼板で塞いである(足場の骨組みがピットを跨ぐ)。屑巻取機の真上は取手付きの点検蓋
     (継ぎ目で縁取り)。ライン側の縁には注意帯と手すり(ピット手すりの表示に連動)。SG2/SG3 の柱は足場を貫いて立つ。 */
  {const P=SCRAP_PIT,z0=P.cover.z0,HT=P.cover.hatch,hx=(HT.x0+HT.x1)/2,hz=(z0+HT.z1)/2,hw=HT.x1-HT.x0,hd=HT.z1-z0;
    for(const s of [-1,1]){addBox(hw,0.002,0.012,M.frame,hx,0.001,hz+s*(hd/2-0.006),scene,false);          // 点検蓋の継ぎ目
      addBox(0.012,0.002,hd,M.frame,hx+s*(hw/2-0.006),0.001,hz,scene,false);
      addBox(0.16,0.018,0.03,M.steel,hx+s*0.30,0.009,hz,scene,false);}                                       // 取手(屑コイルの払出し口)
    addBox(P.x1-P.x0,0.022,0.14,M.hazard,(P.x0+P.x1)/2,0.011,z0+0.18,scene,false);}                         // 縁の注意帯(手すりの内側)
  // 回転テーブルの回転範囲の安全帯(図の外側の円)。枠(正方形の甲板・4つの張出し)は cutter.js で一緒に回る
  {const R=KC_TT.sweepR,N=260,pos=[],idx=[],w=0.06;
    for(let i=0;i<N;i++){const a0=2*Math.PI*i/N,a1=2*Math.PI*(i+1)/N,am=(a0+a1)/2;
      const mx=KC_TT.x+R*Math.cos(am),mz=KC_TT.z+R*Math.sin(am);
      if(!floorAt(mx,mz))continue;                                                                           // 床の外は描かない(ピットの角は蓋の上)
      const b=pos.length/3;
      for(const a of [a0,a1])for(const rr of [R-w/2,R+w/2])pos.push(KC_TT.x+rr*Math.cos(a),0.005,KC_TT.z+rr*Math.sin(a));
      idx.push(b,b+2,b+1,b+1,b+2,b+3);}
    const gg=new THREE.BufferGeometry();gg.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));gg.setIndex(idx);gg.computeVertexNormals();
    const ring=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({color:0xe8b324,roughness:0.7,side:THREE.DoubleSide}));ring.receiveShadow=true;scene.add(ring);}
  // コイルカー走行路: 足場の切り欠き(囲い板は足場と一緒)→ GL の浅い溝(RC)が走行路の全長に続く
  for(const c of CAR_PITS){const w=2*CAR_PIT_HW,D=CAR_PIT_D+GL_Y,L=c.z1-c.z0,cz=(c.z0+c.z1)/2,L1=c.zEdge-c.z0,c1=(c.z0+c.zEdge)/2;
    for(const s of [-1,1])addBox(0.1,D+0.05,L,M.pit,c.x+s*(CAR_PIT_HW+0.05),GL_Y-(D+0.05)/2,cz);
    for(const z of [c.z0-0.05,c.z1+0.05])addBox(w+0.2,D+0.05,0.1,M.pit,c.x,GL_Y-(D+0.05)/2,z);
    addBox(w,0.1,L,M.pit,c.x,-CAR_PIT_D-0.05,cz,scene,false).receiveShadow=true;
    for(const s of [-1,1])addBox(0.14,0.022,L1,M.hazard,c.x+s*(CAR_PIT_HW+0.11),0.012,c1);}
  const FW=FAC_X1-FAC_X0, FC=(FAC_X0+FAC_X1)/2;
  // 通路区画線(出側コイルカーのピットで途切れさせない — ピットは区画線の手前で止まる)
  for(const z of [6.4,-6.4])for(const [a,b] of spans("x",z,FAC_X0,FAC_X1,(x,zz)=>!inPoly(OUT,x,zz)))   // GL の通路線(足場の下は通さない)
    addBox(b-a,0.012,0.12,M.yellow,(a+b)/2,GL_Y+0.011,z,scene,false);
  // 建屋柱・梁(半透明・トグルで消去可) — 照明本体は残す
  for(let x=FAC_X0+2;x<=FAC_X1-2;x+=7){addBox(0.5,9-GL_Y,0.5,M.frameGlass,x,(9+GL_Y)/2,-8.6,buildingGroup,false);addBox(0.5,9-GL_Y,0.5,M.frameGlass,x,(9+GL_Y)/2,8.6,buildingGroup,false);}
  addBox(FW,0.5,0.4,M.frameGlass,FC,9.1,-8.6,buildingGroup,false);addBox(FW,0.5,0.4,M.frameGlass,FC,9.1,8.6,buildingGroup,false);
  for(let x=FAC_X0+3;x<=FAC_X1-3;x+=6) for(const z of [-4,4]){addBox(2.4,0.16,0.9,M.frameGlass,x,8.7,z,buildingGroup,false);
    addBox(2.1,0.05,0.66,M.lampLit,x,8.6,z,scene,false).castShadow=false;
    const pl=new THREE.PointLight(0xfff2dc,0.22,20,2.0);pl.position.set(x,8.3,z);scene.add(pl);}
})();

/* =========================================================
 * ピット安全柵(開口部の転落防止)
 * =========================================================
 * ループピットは床に開いた深さ4.5mの開口なので、通路側の長辺2面に手すりを立てる。
 * 短辺はカテナリーテーブルの機械側で通行しないため設けない(実機と同じ考え方)。
 * 柵は開口縁(注意帯)の外側 |z|=1.26 に立て、ピット内の軸受柱や側枠には触れない。
 * =======================================================*/
const fenceGroup=new THREE.Group(); scene.add(fenceGroup);
(function buildPitFence(){
  // スクラップピットの操作側の蓋(足場)のライン側の縁 — 側枠の支柱の台板(z≤0.98)と SG2/SG3 の柱(z≥1.12)のあいだ
  {const P=SCRAP_PIT,FZ=P.cover.z0+0.08,H=1.08,top=0,w=P.x1-P.x0,cx=(P.x0+P.x1)/2;
    for(const x of [P.x0+0.03,cx,P.x1-0.03])addBox(0.06,H,0.06,M.frame,x,top+H/2,FZ,fenceGroup);
    for(const ry of [H-0.04,H*0.52])addBox(w,0.045,0.045,M.yellow,cx,top+ry,FZ,fenceGroup);
    addBox(w,0.15,0.028,M.yellow,cx,top+0.075,FZ,fenceGroup);}
  const FZ=1.26, H=1.08;                                   // 柵のz / 手すり高さ
  for(const p of [PIT1,PIT2]){
    const w=p.x1-p.x0, cx=(p.x0+p.x1)/2, n=Math.max(2,Math.round(w/1.5));
    for(const sgn of [-1,1]){const z=sgn*FZ;
      for(let i=0;i<=n;i++)                                // 支柱
        addBox(0.06,H,0.06,M.frame,p.x0+w*i/n,H/2,z,fenceGroup);
      for(const ry of [H-0.04,H*0.52])                     // 手すり(上段・中段)
        addBox(w+0.06,0.045,0.045,M.yellow,cx,ry,z,fenceGroup);
      addBox(w+0.06,0.15,0.028,M.yellow,cx,0.075,z,fenceGroup);   // 幅木(巾木)
    }}
})();

/* =========================================================
 * 操作盤(オペレータコンソール)
 * =======================================================*/
function buildConsole(cx,cz,w,d){                 // w×d: 配置図の操作盤の外形(机の本体 1.9×0.8 をこの大きさに合わせる)
  // GP(グラフィックパネル)画面テクスチャ — ラインミミック+数値表示
  const gpTex=canvasTex(512,300,(g,w,h)=>{
    g.fillStyle="#071019";g.fillRect(0,0,w,h);
    g.fillStyle="#0e2f40";g.fillRect(0,0,w,32);
    g.fillStyle="#bfe6ff";g.font="bold 18px 'Segoe UI',sans-serif";g.fillText("SLITTING LINE  GP",10,22);
    g.fillStyle="#3ad98c";g.beginPath();g.arc(w-24,16,7,0,Math.PI*2);g.fill();
    const y=138;
    g.strokeStyle="#34506a";g.lineWidth=2;g.beginPath();g.moveTo(24,y);g.lineTo(w-24,y);g.stroke();
    g.strokeStyle="#4fc6ff";g.lineWidth=3;g.beginPath();g.arc(42,y,20,0,Math.PI*2);g.stroke();   // アンコイラ
    g.fillStyle="#9ad8ff";for(let i=0;i<8;i++){g.beginPath();g.arc(95+i*38,y,6,0,Math.PI*2);g.fill();}
    g.strokeStyle="#4fc6ff";g.beginPath();g.moveTo(180,y);g.quadraticCurveTo(220,y+42,260,y);g.stroke(); // ルーパー
    g.beginPath();g.arc(w-46,y,22,0,Math.PI*2);g.stroke();                                          // リコイラ
    g.fillStyle="#0c2433";g.fillRect(20,206,212,74);g.fillRect(250,206,242,74);
    g.fillStyle="#62f0c4";g.font="bold 30px 'Consolas',monospace";g.fillText("80",40,256);
    g.fillStyle="#8aa0b4";g.font="15px 'Segoe UI'";g.fillText("m/min",98,256);g.fillText("SPEED",40,228);
    g.fillStyle="#f0b429";g.font="bold 26px 'Consolas',monospace";g.fillText("12.0kN",268,256);
    g.fillStyle="#8aa0b4";g.font="15px 'Segoe UI'";g.fillText("LINE TENSION",268,228);
    g.fillStyle="#9ad8ff";g.font="14px monospace";g.fillText("UNC φ2100   REC φ560   4 STRANDS",36,296);
  });
  const gpMat=new THREE.MeshStandardMaterial({map:gpTex,emissive:0xffffff,emissiveMap:gpTex,emissiveIntensity:0.9,roughness:0.3});

  // カムスイッチ銘板(停止 / O / 運転)
  const camTex=canvasTex(160,160,(g,w,h)=>{
    g.fillStyle="#c7cace";g.fillRect(0,0,w,h);
    g.fillStyle="#aeb2b6";g.fillRect(0,0,w,6);g.fillRect(0,h-6,w,6);
    g.strokeStyle="#7a8088";g.lineWidth=2;g.beginPath();g.arc(w/2,h/2,46,0,Math.PI*2);g.stroke();
    g.fillStyle="#1c1f24";g.textAlign="center";g.textBaseline="middle";
    g.font="bold 22px 'Hiragino Sans','Meiryo',sans-serif";g.fillText("O",w/2,18);
    g.font="bold 18px 'Hiragino Sans','Meiryo',sans-serif";
    g.fillText("停止",24,h/2);g.fillText("運転",w-24,h/2);
  });
  const camPlateMat=new THREE.MeshStandardMaterial({map:camTex,metalness:0.3,roughness:0.5});

  // --- 操作器ヘルパー(傾斜パネルの子。座は天面 y=0 の上に乗せる) ---
  const litMat=(c,e)=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:e==null?0.8:e,roughness:0.3});
  const put=(parent,geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  function pbl(parent,x,z,color){ // 照光式押釦(PBL)
    put(parent,new THREE.CylinderGeometry(0.05,0.055,0.05,20),M.frame,x,0.025,z);
    put(parent,new THREE.CylinderGeometry(0.044,0.044,0.045,20),litMat(color),x,0.072,z);}
  function lamp(parent,x,z,color){ // 表示灯
    put(parent,new THREE.CylinderGeometry(0.034,0.04,0.04,18),M.frame,x,0.02,z);
    put(parent,new THREE.SphereGeometry(0.03,14,10,0,Math.PI*2,0,Math.PI/2),litMat(color,0.7),x,0.04,z);}
  function selector(parent,x,z){ // セレクタスイッチ
    put(parent,new THREE.CylinderGeometry(0.04,0.045,0.04,18),M.frame,x,0.02,z);
    put(parent,new THREE.BoxGeometry(0.018,0.055,0.06),M.steel,x,0.06,z).rotation.y=0.5;}
  function estop(parent,x,z){ // 非常停止(赤キノコ+黄ベース)
    put(parent,new THREE.CylinderGeometry(0.08,0.085,0.04,22),new THREE.MeshStandardMaterial({color:0xf2c014,roughness:0.5}),x,0.02,z);
    put(parent,new THREE.CylinderGeometry(0.032,0.045,0.05,18),new THREE.MeshStandardMaterial({color:0xc62828,roughness:0.4}),x,0.06,z);
    put(parent,new THREE.CylinderGeometry(0.07,0.058,0.035,22),new THREE.MeshStandardMaterial({color:0xd32f2f,emissive:0x3a0a08,emissiveIntensity:0.5,roughness:0.4}),x,0.095,z);}
  function lever(parent,x,z){ // 操作レバー(カムスイッチ式・停止/O/運転)
    const black=new THREE.MeshStandardMaterial({color:0x14171b,roughness:0.45,metalness:0.05});
    put(parent,new THREE.BoxGeometry(0.22,0.016,0.22),M.steel,x,0.008,z);        // 角プレート(土台)
    const lbl=new THREE.Mesh(new THREE.PlaneGeometry(0.21,0.21),camPlateMat);    // 銘板(停止/O/運転)
    lbl.rotation.x=-Math.PI/2;lbl.rotation.z=Math.PI;lbl.position.set(x,0.0165,z);parent.add(lbl);
    for(const sx of [-0.092,0.092])for(const sz of [-0.092,0.092])               // コーナーねじ
      put(parent,new THREE.CylinderGeometry(0.008,0.008,0.02,8),M.frame,x+sx,0.02,z+sz);
    const h=new THREE.Group();h.position.set(x,0.02,z);parent.add(h);            // ピボット(Y軸回転)
    put(h,new THREE.CylinderGeometry(0.03,0.034,0.028,18),black,0,0.014,0);      // ハブ
    const g=new THREE.Group();h.add(g);g.rotation.x=0.32;                         // グリップを少し起こす
    const bar=put(g,new THREE.CylinderGeometry(0.02,0.026,0.16,16),black,0,0,0.085); bar.rotation.x=Math.PI/2; // 平たい黒ハンドル(+Z方向)
    put(g,new THREE.SphereGeometry(0.028,16,12),black,0,0.012,0.165);            // 先端グリップ
    h.rotation.y=-0.6;                                                            // 既定位置=運転側へ
    return h;}

  // 操作員はライン(-Z)を向いて操作 → 操作器・GP画面は操作員側(+Z)を向く
  const ANG=0.42;
  const desk=new THREE.Group();desk.position.set(cx,0,cz);desk.scale.set(w/1.9,1,d/0.8);scene.add(desk);
  // キャビネット(背側寄り・浅め) — 前列操作器の真下に潜り込まない深さに
  addBox(1.86,0.9,0.46,M.paint,0,0.45,-0.16,desk);
  addBox(1.9,0.05,0.5,M.frame,0,0.9,-0.16,desk);
  for(const sx of [-0.86,0.86])addBox(0.09,0.9,0.09,M.frame,sx,0.45,0.26,desk); // 前脚(操作面前側の支持)
  addBox(1.7,0.02,0.95,M.hazard,0,0.011,1.05,desk,false);    // 操作員側 安全マット

  // 傾斜操作面: 前縁=低/背側=高。前縁はキャビネット前面より前へ張り出す(突き抜け防止)
  const top=new THREE.Group();top.position.set(0,1.0,0.02);top.rotation.x=ANG;desk.add(top);
  addBox(1.86,0.06,0.78,M.paintDark,0,-0.03,0,top);          // 操作面(天面 y=0)
  // GP画面(上段=背側に薄く埋め込み。重なりz-fight無し)
  const gpz=-0.16;
  addBox(0.98,0.018,0.5,M.frame,0,0.009,gpz,top);            // 浅い額縁(天面上)
  const gp=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.44),gpMat);gp.rotation.x=-Math.PI/2;gp.position.set(0,0.02,gpz);top.add(gp);
  // 前列の操作器(操作員側 +z) — 斜め盤面に整列配置
  lever(top,-0.64,0.15);                                     // 操作レバー(カムスイッチ・左)
  pbl(top,-0.28,0.21,0x2ecc71);                              // 運転PBL(緑)
  pbl(top,-0.11,0.21,0xe74c3c);                              // 停止PBL(赤)
  lamp(top, 0.05,0.21,0xf0b429);                             // 表示灯(橙)
  lamp(top, 0.18,0.21,0xffffff);                             // 表示灯(白)
  selector(top,0.40,0.21);                                   // セレクタ
  estop(top,0.66,0.13);                                      // 非常停止(右)
}
// 操作盤は配置図どおり操作側(+Z)に2基: 入側(アンコイラ〜レベラー付近)と出側(テンション〜デフ付近)
buildConsole(-9.893,2.553,1.053,0.515);          // 入側: 図の □ 1053×515
buildConsole(9.828,2.729,1.684,0.742);           // 出側: 図の □ 1684×742

/* =========================================================
 * 油圧ユニット(配置図の4基 — 反操作側 −Z)
 * タンク+電動ポンプ+ヒートエクスチェンジャ+配管立上り
 * =======================================================*/
(function buildHydraulicUnits(){
  const units=[[-2.664,-4.954,1.342,0.865],[2.403,-4.963,0.884,0.845],[10.280,-3.646,0.452,0.351],[11.553,-4.665,0.534,0.742]];   // 配置図の位置・大きさ(1.png で線に合わせた・床の縁の内側)
  for(const [x,z,w,d] of units){
    addBox(w,0.08,d,M.frame,x,0.04,z,scene,false);                    // ベース(図の外形)
    addBox(w-0.08,0.75,d-0.08,M.paint,x,0.47,z);                      // 油タンク
    addCylY(Math.min(w,d)*0.2,Math.min(w,d)*0.55,M.paintDark,x-w*0.25,0.85+Math.min(w,d)*0.275,z,scene,16);  // モーター(縦形)
    addBox(w*0.28,0.22,d*0.35,M.steel,x+w*0.22,0.96,z);               // ポンプ・弁ブロック
    addCylY(0.03,1.2,M.steel,x+w*0.3,1.45,z+d*0.3,scene,8);          // 配管立上り
    makeLabel("油圧ユニット",x,0.86,z,{rank:30});                    // 取付点=タンク上面
  }
})();

