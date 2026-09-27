"use strict";
/* =========================================================
 * カッター台車(刃組ガイダンスの立体図をラインへ移植)
 * =========================================================
 * 移植元: WaveLog static/js/bladeset/blade-3d.js の frame / machine / floatSeat / site / zone。
 * 模型は WaveLog と同じ座標・単位(mm)のまま組み、root の変換1つでラインへ写す:
 *   WaveLog X(軸方向・+X=外せる軸端部スタンド=OS) → ライン +Z(操作側)
 *   WaveLog Y(上・0=パスライン)                     → ライン Y − PL
 *   WaveLog Z(送り・+Z=出側)                        → ライン +X
 * X と Z の入れ替えは鏡映なので、root は X を −1 倍してから Y 軸まわりに +90° 回す
 * (正面=OS から見て左が入側・右が出側 = 実機の向き)。
 * 軸の上の物(刃・スペーサー・ゴムリング・潤滑リング・フィンガー・フローティングシート)は
 * blade-core.js の solve() の答え(res)から実寸で並べる — 刃組ガイダンスの図と同じ割付。
 * 板押さえのフィンガーは図面 N2-10689-1 の形(全長560・厚み20・両端研削20×6)の板として、
 * 上下軸と板のあいだ(板の両側)へ置き、入側の押さえアングルで受ける。
 * 台車は2台(台車マスタの A台車・B台車)。回転テーブルの2つの受け口に載り、ラインの台車と
 * 待機台車を入れ替えて使う(手順は knifechange.js)。刃組は台車ごとに組む。
 * =======================================================*/
const KC=(function(){
  const T=THREE, MACH=KC_MACH, BS=()=>WL.bladeSet, M_CHECKER=M.checker;
  // 機体の塗装(実機の緑・カバーは黄)。WaveLog は r149 の色管理(sRGB→線形)で描くので、
  // ここでも色は線形へ直して持つ(同じ色に見えるように)。
  const PAINT={body:"#3b6a4f",dark:"#2d543e",light:"#4a7d60",cover:"#d8a520"};
  const FSEAT={od:269,bore:200,plate:5,relief:2,body:63,pistonN:18,pistonD:15,pcd:230,pistonA0:10,
    devX:113.5,devR:131.8,devW:24,devT:20,devH:14,devAxial:46,screwD:22};
  const FSEAT_W=FSEAT.plate+FSEAT.relief+FSEAT.body;
  const COL={finger:"#7a5232",lube:"#7150c4"};           // --bs-fig-finger / --bs-fig-lube
  // マスタ(WaveLog の context と同じ形)→ 計算が読む形
  const MS=BS().normalize(BLADESET_MASTER), IX=BS().buildIndex(MS);

  /* ---- 状態 ----
     VIS: 部材の見せ方(2台で共通)/ SH: 回転テーブルの角(rot 0 ↔ 1 = 180°)と駆動継手(cpl 1=噛み合い)。
     台車ごとの状態は makeCar() の D(走行・軸端部・受け口・刃組の計算結果)。 */
  const VIS={show:{knife:true,ring:true,liner:true},   // 見せる部材(刃 / 板押さえ / スペーサー)
    hide:"ghost"};                                        // 消した部材: gone=出さない / ghost=薄く / wire=線だけ
  const SH={rot:0,cpl:1};
  let D3=null;                                            // 組み立て中の台車の D(use() で切り替える)

  /* ---- 材質 ---- */
  const lin=(c)=>new T.Color(c).convertSRGBToLinear();
  const MATS=new Map();
  function matOf(key,o){if(!MATS.has(key)){const spec=Object.assign({},o);
      if(typeof spec.color==="string")spec.color=lin(spec.color);
      const m=new T.MeshStandardMaterial(spec);m.name=key;MATS.set(key,m);}
    return MATS.get(key);}
  const HIDE_SPEC={ghost:{transparent:true,opacity:.13,depthWrite:false},
    wire:{wireframe:true,transparent:true,opacity:.38,depthWrite:false}};
  function skin(on,key,o){if(on)return matOf(key,o);
    const spec=HIDE_SPEC[D3.hide];
    return spec?matOf(key+"~"+D3.hide,Object.assign({},o,spec)):null;}
  const drawn=k=>!!(D3.show[k]||HIDE_SPEC[D3.hide]);

  /* ---- 形(単位の形を寸法で伸ばして使う) ---- */
  const G={};
  G.cyl=new T.CylinderGeometry(1,1,1,64,1,false);G.cyl.rotateZ(Math.PI/2);      // 軸=X
  G.cylZ=new T.CylinderGeometry(1,1,1,48,1,false);G.cylZ.rotateX(Math.PI/2);    // 軸=Z
  G.box=new T.BoxGeometry(1,1,1);
  G.disc=new T.CylinderGeometry(1,1,1,72,1,false);
  G.ringGeo=new T.TorusGeometry(1,0.022,10,72);G.ringGeo.rotateX(Math.PI/2);
  G.annulus=new T.RingGeometry(0.87,1,96);G.annulus.rotateX(-Math.PI/2);
  const TUBES=new Map();
  function tubeGeo(ro,ri){const key=ro.toFixed(2)+"/"+ri.toFixed(2);let g=TUBES.get(key);
    if(!g){const sh=new T.Shape();sh.absarc(0,0,ro,0,Math.PI*2,false);
      const h=new T.Path();h.absarc(0,0,ri,0,Math.PI*2,true);sh.holes.push(h);
      g=new T.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false,curveSegments:48});
      g.translate(0,0,-0.5);g.rotateY(Math.PI/2);TUBES.set(key,g);}
    return g;}
  /* フィンガー1本の側面形(全長×厚み・両端を上下両面から研削)。幅(軸方向)は1で作り伸ばす */
  let fingerGeo=null;
  function fingerShapeGeo(f){if(fingerGeo)return fingerGeo;
    const L=f.length,t=f.thickness,gr=f.grindRun,gd=f.grindDrop,h=t/2,e=h-gd;
    const sh=new T.Shape();          // 形の座標 (u=送り方向, v=厚み)
    sh.moveTo(-L/2,-e);sh.lineTo(-L/2+gr,-h);sh.lineTo(L/2-gr,-h);sh.lineTo(L/2,-e);
    sh.lineTo(L/2,e);sh.lineTo(L/2-gr,h);sh.lineTo(-L/2+gr,h);sh.lineTo(-L/2,e);sh.closePath();
    const g=new T.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false});
    g.translate(0,0,-0.5);g.rotateY(-Math.PI/2);     // 押し出し向き → X(軸方向)、u → Z(送り)
    return fingerGeo=g;}
  /* 同じ部材はまとめて1回で描く(40条ぶんの部材は数千個になる)。
     r128 の InstancedMesh は実体の広がりを知らないので視錐台で間引かせない。 */
  function batch(geo,mat,list){if(!list.length||!mat)return null;
    const m=new T.InstancedMesh(geo,mat,list.length),o=new T.Object3D();
    list.forEach((p,i)=>{o.position.set(p.x,p.y,p.z||0);o.scale.set(p.l,p.r,p.d||p.r);o.rotation.set(0,0,0);
      o.updateMatrix();m.setMatrixAt(i,o.matrix);});
    m.instanceMatrix.needsUpdate=true;m.frustumCulled=false;
    const see=!mat.transparent;m.castShadow=see;m.receiveShadow=see;
    return m;}
  function clear(o){while(o.children.length){const c=o.children.pop();
    if(c.isInstancedMesh&&c.dispose)c.dispose();}}
  /* 軸に通す部材の目印(組み替えの見せ方 setStack が読む): まとめ描きは各部材の軸方向位置(DS 端から順)、
     1個の物はその位置 */
  const stack=(m,items)=>{if(m)m.userData.xs=items.map(q=>q.x);return m;};
  const stackAt=(m,x)=>{m.userData.stackX=x;return m;};

  /* ---- 入れ物 ----
     root: WaveLog の世界 → ライン / world: 床のレール・車止め(動かない)/ drive: 駆動側の固定設備
     pivot: 回転テーブルの中心。回る枠(甲板・レールの腕・着地土台 = deck)と、テーブルに載った台車が回る。
     台車ごと(makeCar): box = 置き場所(テーブルの受け口 or レール上)/ g = 台車(軸の上の物は写し返す)
       rig = 機械まわり(写し返しを打ち消す)/ fix → stand = 軸端部(送り出すと受け口の着地土台に降りる)
       armU/armL = 上下アーバーの回転部(ラインで駆動が噛んでいる間だけ刃の周速で回る) */
  const root=new T.Group();root.scale.set(-0.001,0.001,0.001);root.rotation.y=Math.PI/2;
  root.position.set(SLIT_X,PL,0);scene.add(root);
  const world=new T.Group(),pivot=new T.Group(),deck=new T.Group(),drive=new T.Group();
  root.add(world,pivot,drive);pivot.add(deck);
  // テーブル中心はレールの線から横(root z)に ttLat ずれる = 2台の受け口の真ん中。受け口は中心から ±640
  pivot.position.set(MACH.ttX,0,MACH.ttLat);
  function makeCar(i){
    const c={i,name:(MS.carriages[i]||{}).name||("台車"+"AB"[i]),N:4,frame:null,
      D:{pack:null,fseat:null,rigGeo:null,fingerAngles:0,res:null,ctx:null,bcx:null,
        travel:i?1:0,open:0,slot:i}};                   // 走行(0=ライン 1=テーブル)/ 軸端部(1=外し)/ テーブルの受け口
    Object.defineProperty(c.D,"show",{get:()=>VIS.show});
    Object.defineProperty(c.D,"hide",{get:()=>VIS.hide});
    for(const k of ["box","g","rig","armU","armL","fix","stand"])c[k]=new T.Group();
    c.box.add(c.g,c.fix);c.g.add(c.rig,c.armU,c.armL);c.fix.add(c.stand);
    c.g.scale.x=-1;c.rig.scale.x=-1;   // 軸の上の物だけ写し返す(計算のOS端 → 軸端部スタンドの側)
    // 上下アーバーは刃の周速=ライン速度で回る(上軸の下面・下軸の上面が帯板と同じ向きに進む)。
    // 写し返しと root の鏡映を通すと、上軸は局所X軸まわりに負・下軸は正が送り方向になる。
    const turn=()=>(c.D.travel===0&&SH.cpl>0.99)?KC_KNIFE_D/2000:Infinity;
    spin(c.armU,turn,-1,"x");spin(c.armL,turn,1,"x");
    return c;}
  const CARS=[makeCar(0),makeCar(1)];
  let ACTIVE=CARS[0];                                     // ラインの台車(入っている / 最後に入っていた)
  let g,rig,armU,armL,fix,stand;                          // 組み立て中の台車の入れ物
  function use(c){D3=c.D;g=c.g;rig=c.rig;armU=c.armU;armL=c.armL;fix=c.fix;stand=c.stand;}
  use(CARS[0]);
  const arm=(y)=>(y>0?armU:armL);

  /* ======================================================
   * 区間の中身(OS側から実寸で並べる)— WaveLog zone()
   * ====================================================*/
  const PACK_EPS=0.03;
  function zone(out,from,to,y,parts,floatAt){
    const expand=BS().expand,pk=D3.pack;
    const all=expand(parts.spacer),want=all.reduce((a,sz)=>a+sz,0);
    const lead=floatAt==="start"?Math.max(0,+(to-from-want).toFixed(6)):0;
    let at=from+lead;
    if(pk&&want-(to-from)>1e-6){pk.over++;pk.worst=Math.max(pk.worst,+(want-(to-from)).toFixed(4));}
    for(const sz of all){if(at+sz>to+PACK_EPS){if(pk)pk.drop++;break;}
      out.liner.push({x:at+sz/2,y,sz});at+=sz;}
    if(floatAt){const r=floatAt==="start"?lead:to-at;
      if(r>0.01&&pk)pk.float=Math.max(pk.float||0,+r.toFixed(3));}
    else if(to-at>0.01){out.liner.push({x:(at+to)/2,y,sz:to-at,filler:true});
      if(pk){pk.filler++;pk.fillerMm=+(pk.fillerMm+(to-at)).toFixed(3);}}
    if(!parts.hold)return;
    // 保持層(ゴムリング/フィンガー)は刻みしかないので、余りは左右へ均等に振って中央に置く
    const pieces=expand(parts.gom),run=pieces.reduce((a,sz)=>a+sz,0);
    let a0=from,b0=to;
    if(parts.lube){const w=parts.lube.w;               // 潤滑リングは刃の内側の両端
      out.lube.push({x:from+w/2,y,sz:w,lube:parts.lube},{x:to-w/2,y,sz:w,lube:parts.lube});
      a0=from+w;b0=to-w;}
    at=a0+Math.max(0,(b0-a0-run))/2;
    for(const sz of pieces){if(at+sz>b0+PACK_EPS)break;
      out.ring.push({x:at+sz/2,y,sz,hold:parts.hold});at+=sz;}}

  /* フローティングシートの置かれる端(基準面の反対 — 既定はDS基準なのでOS端) */
  const floatSign=()=>{const f=D3.res&&D3.res.fit&&D3.res.fit.floatSeat;return f&&f.side==="DS"?1:-1;};

  /* ======================================================
   * フローティングシート(図面の寸法の3D)— WaveLog floatSeat()
   * ====================================================*/
  function floatSeat(L,yU,yL){
    const F=FSEAT,ro=F.od/2,ri=F.bore/2;
    const fit=(D3.res&&D3.res.fit&&D3.res.fit.floatSeat)||{};
    const sg=floatSign(),E=sg*L/2,out=v=>E+sg*v;
    const body=matOf("fseat",{color:"#8d97a1",metalness:.66,roughness:.30});
    const pin=matOf("fseatPin",{color:"#c9d0d6",metalness:.78,roughness:.20});
    const hole=matOf("fseatHole",{color:"#2b323a",metalness:.30,roughness:.70});
    const shaftM=matOf("steel",{color:"#b9c1c9",metalness:.74,roughness:.22});
    const seen=[];let npist=0;
    [[yU,+fit.up||0],[yL,+fit.lo||0]].forEach(([y,take])=>{
      const grp=arm(y);
      const sm=batch(G.cyl,shaftM,[{x:out(FSEAT_W/2),y:0,l:FSEAT_W,r:ri}]);if(sm)grp.add(sm);   // シートの中を通る軸
      const face=out(-take);                            // 押さえ板の、スペーサーに当たる面
      const plate={x:face+sg*F.plate/2,l:F.plate};
      const gap={x:(face+sg*F.plate+out(F.plate+F.relief))/2,l:F.relief+take};
      const bodyQ={x:out(F.plate+F.relief+F.body/2),l:F.body};
      const os=sg<0, tag=(m,x)=>os?stackAt(m,x):m;       // OS 端のシートは組み替えのとき最初に外す
      for(const q of [plate,bodyQ]){const m=new T.Mesh(tubeGeo(ro,ri),body);
        m.position.set(q.x,0,0);m.scale.set(q.l,1,1);m.castShadow=true;m.receiveShadow=true;grp.add(tag(m,q.x));}
      const pistons=[];                                 // ピストン18本(逃げの中で押さえ板と本体をつなぐ)
      for(let i=0;i<F.pistonN;i++){const a=(F.pistonA0+i*360/F.pistonN)*Math.PI/180;
        pistons.push({x:gap.x,y:Math.cos(a)*F.pcd/2,z:Math.sin(a)*F.pcd/2,l:gap.l,r:F.pistonD/2});}
      const pm=batch(G.cyl,pin,pistons);if(pm)grp.add(tag(pm,gap.x));npist+=pistons.length;
      for(const sgn of [-1,1]){                          // 加圧装置2か所(外周の窓と加圧スクリュウ M22)
        const ang=Math.atan2(-67,sgn*F.devX),ax=out(F.devAxial);
        const win=new T.Mesh(G.box,hole);
        win.position.set(ax,Math.sin(ang)*(F.devR-F.devH/2+3),Math.cos(ang)*(F.devR-F.devH/2+3));
        win.rotation.set(-ang+Math.PI/2,0,0);win.scale.set(F.devW,F.devH,F.devT);grp.add(tag(win,ax));
        const sc=new T.Mesh(G.cyl,pin);
        sc.position.set(ax,Math.sin(ang)*(F.devR-F.devH),Math.cos(ang)*(F.devR-F.devH));
        sc.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),new T.Vector3(0,Math.sin(ang),Math.cos(ang)));
        sc.scale.set(8,F.screwD/2,F.screwD/2);grp.add(tag(sc,ax));}
      seen.push({y,face,take});});
    D3.fseat={n:seen.length,pistons:npist,w:FSEAT_W,od:F.od,side:sg>0?"DS":"OS",
      faces:seen.map(q=>+q.face.toFixed(3)),take:seen.map(q=>q.take)};}

  /* ======================================================
   * 機械の骨組み(図面 SL-1458-01S・03SA)— WaveLog frame()
   * ====================================================*/
  function frame(L,yU,yL){
    const half=L/2, sd=+MS.P.shaftDia||200, M=MACH, st=D3.ctx.st;
    const steel=matOf("steel",{color:"#b9c1c9",metalness:.74,roughness:.22});
    const steelD=matOf("steelD",{color:"#8f99a4",metalness:.70,roughness:.30});
    const blue=matOf("blue",{color:PAINT.body,metalness:.18,roughness:.58});      // 名前は旧塗装の名残(役: 本体)
    const blueD=matOf("blueD",{color:PAINT.dark,metalness:.18,roughness:.62});
    const blueL=matOf("blueL",{color:PAINT.light,metalness:.18,roughness:.54});
    const cover=matOf("cover",{color:PAINT.cover,metalness:.12,roughness:.56});
    const dark=matOf("dark",{color:"#39424e",metalness:.56,roughness:.38});
    const rod=matOf("rod",{color:"#aeb6bd",metalness:.72,roughness:.26});
    const put=(o,geo,mat,list)=>{const m=batch(geo,mat,list);if(m)o.add(m);};
    const bx=(list,mat,o)=>put(o||rig,G.box,mat,list);
    const cy=(list,mat,o)=>put(o||rig,G.cyl,mat,list);
    const cyZ=(list,mat,o)=>put(o||rig,G.cylZ,mat,list);
    const tube=(x,y,len,ro,ri,mat,o)=>{const m=new T.Mesh(tubeGeo(ro,ri),mat);
      m.position.set(x,y,0);m.scale.set(len,1,1);m.castShadow=true;m.receiveShadow=true;(o||rig).add(m);return m;};
    const bolts=(x,r,n,hr,hl,o,y0)=>{const list=[];              // 円周にボルト(フランジが板に見えないように)
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.PI/n;list.push({x,y:(y0||0)+Math.sin(a)*r,z:Math.cos(a)*r,l:hl,r:hr});}
      put(o||rig,G.cyl,dark,list);};
    // rig の −X はギヤボックスの端(駆動側=DS)、+X は外せる軸端部の端(OS)。名前は図面の書き方のまま
    const osEnd=-half, dsEnd=half;
    const seatM=floatSign()*-1;                          // シートが機械のどちらの端に載るか(写し返しぶん反転)
    /* ---- 台座。ライン中心はベース左端から 1240、ベース全長 2325 ---- */
    const lineX=osEnd+M.lineC, baseL=M.baseL+(L-M.arbor0);
    const bx0=lineX-M.baseToLine, bx1=bx0+baseL, bcx=(bx0+bx1)/2;
    const bedTop=yL-M.baseDrop, bedY=bedTop-M.baseH/2, railTop=bedTop-M.railDrop;
    bx([{x:bcx,y:bedY,z:0,l:baseL,r:M.baseH,d:M.baseD}],blue);
    bx([{x:bcx,y:bedY-M.baseH/2-58,z:0,l:baseL-70,r:116,d:M.skirtD}],blueD);
    bx([{x:bcx,y:bedY+M.baseH/2+6,z:0,l:baseL-40,r:12,d:M.baseD-40}],blueL);
    const ribs=[];for(let i=0;i<4;i++)ribs.push({x:bx0+320+i*(baseL-640)/3,y:bedY-M.baseH/2-58,z:0,l:26,r:108,d:M.ribD});
    bx(ribs,blueD);
    /* ---- 走行車輪。レールは軸方向に走るので、車輪の軸は送りの向き(Z) ---- */
    const wy=railTop+M.wheelRun, brk=[], whl=[], hub=[], flg=[];
    for(let i=0;i<4;i++){const fx=bx0+260+i*(baseL-520)/3;
      for(const s of [-1,1]){const fz=s*M.railZ;
        brk.push({x:fx,y:(bedTop+wy)/2,z:fz,l:150,r:bedTop-wy,d:120});
        whl.push({x:fx,y:wy,z:fz,l:92,r:M.wheelRun});
        hub.push({x:fx,y:wy,z:fz,l:104,r:M.wheelRun*0.42});
        flg.push({x:fx,y:wy,z:s*(M.railZ-52),l:16,r:M.wheelRun*1.16});}}
    bx(brk,dark);cyZ(whl,steelD);cyZ(hub,dark);cyZ(flg,steelD);
    D3.rigGeo={railTop,railZ:M.railZ,railHead:75,wheelY:wy,wheelR:M.wheelRun,wheelHalf:46,
      under:[{k:"base",y0:bedY-M.baseH/2,y1:bedY+M.baseH/2,z:M.baseD/2},
        {k:"skirt",y0:bedY-M.baseH/2-116,y1:bedY-M.baseH/2,z:M.skirtD/2},
        {k:"rib",y0:bedY-M.baseH/2-112,y1:bedY-M.baseH/2-4,z:M.ribD/2}]};
    /* ---- タイロッド(送り軸)の高さ ---- */
    const ty=yU+M.tieY, topY=ty-M.tieHubR;
    /* ---- ギヤボックス(駆動側)。上のカバーは黄色 ---- */
    const gFace=osEnd-M.gapOS-(seatM<0?FSEAT_W+22+M.brgW:0), gx=gFace-M.gearW/2;
    const pd0=bx0+20, pd1=gFace+40;
    bx([{x:(pd0+pd1)/2,y:bedTop+36,z:0,l:pd1-pd0,r:72,d:M.gearD+120}],blueD);
    bx([{x:gx,y:(bedTop+72+yU+118)/2,z:0,l:M.gearW,r:(yU+118)-(bedTop+72),d:M.gearD}],blue);
    bx([{x:gx,y:(yU+118+topY)/2,z:0,l:M.gearW*0.62,r:topY-(yU+118),d:M.gearD*0.64}],cover);
    bx([-1,1].flatMap(s=>[{x:gx,y:(bedTop+yU)/2,z:s*(M.gearD/2+9),l:M.gearW*0.8,r:30,d:18},
      {x:gx,y:yL,z:s*(M.gearD/2+9),l:M.gearW*0.8,r:30,d:18}]),blueD);
    cy([{x:gx,y:0,z:M.gearD/2-6,l:26,r:96}],steelD);
    bolts(gx,118,8,11,30);
    for(const y of [yU,yL]){tube(gFace-18,y,36,168,sd/2+4,blueD);bolts(gFace-18,140,8,12,40,rig,y);}
    /* ---- 軸受ハウジング。OS側(図面の呼び)はギヤボックスが持ち台車と一緒に回る。
           DS側は軸端部の柱が持つので、外すと軸から離れる ---- */
    const bearing=(x,o)=>{for(const y of [yU,yL]){
      put(o||rig,G.cyl,dark,[{x,y,l:M.brgW,r:M.brgD/2}]);
      tube(x-M.brgW/2-11,y,22,M.brgD/2*1.34,sd/2+6,blueD,o);
      tube(x+M.brgW/2+11,y,22,M.brgD/2*1.34,sd/2+6,blueD,o);
      bolts(x-M.brgW/2-11,M.brgD/2*1.12,6,13,34,o,y);
      bolts(x+M.brgW/2+11,M.brgD/2*1.12,6,13,34,o,y);
      put(o||rig,G.cyl,steelD,[{x,y:y+M.brgD/2*0.9,z:0,l:30,r:20}]);}};
    /* ---- 軸端部(DS端スタンド)。330 送り出すと着地土台に降りる(stand の位置で動かす) ---- */
    const seatDS=seatM>0, seatOS=!seatDS;
    const bxDS=seatDS?dsEnd+FSEAT_W+22+M.brgW/2+4:dsEnd+M.gapDS/2;
    const sx=dsEnd+M.gapDS+M.standDS;
    bx([{x:sx,y:bedTop+36,z:0,l:M.standW+110,r:72,d:M.standD+130}],blueD,stand);
    bx([{x:sx,y:(bedTop+72+yU+96)/2,z:0,l:M.standW,r:(yU+96)-(bedTop+72),d:M.standD}],blue,stand);
    bx([{x:sx,y:(yU+96+topY)/2,z:0,l:M.standW*0.9,r:topY-(yU+96),d:M.standD*0.7}],blueL,stand);
    bx([-1,1].map(s=>({x:sx,y:(bedTop+yU)/2,z:s*(M.standD/2+8),l:M.standW*0.78,r:28,d:16})),blueD,stand);
    bx([{x:sx,y:ty,z:0,l:M.standW*1.5,r:M.tieHubR*2.4,d:M.standD*0.8}],blueL,stand);
    bearing(bxDS,stand);
    bearing(osEnd-M.gapOS/2-(seatOS?FSEAT_W+22+M.brgW/2:0));
    /* ---- フィンガーの押さえのアングル(フィンガー方式のときだけ・入側 −Z) ----
       WaveLog は上下の刃先の近く(±48)に置く。ここではフィンガーを板として置くので、
       アングルの水平辺をフィンガーの上面(下軸は下面)へ載せ、ボルトで締め付ける。
       両端は軸受ハウジングへ腕で受ける(有効長いっぱい)。 */
    D3.fingerAngles=0;
    const res=D3.res;
    if(res&&res.finger){
      const kr=(+st.knife||300)/2, az=-(kr+40), fl=90, t=12;
      const fs=MS.fingers[0]||MS.fingerShape, th=Math.max(0.2,+st.thick||0.5);
      let top=0;
      for(const s2 of [1,-1]){
        const y0=s2*(th/2+(+fs.thickness||20)+t/2);if(s2>0)top=y0+fl;
        bx([{x:0,y:y0,z:az-fl/2,l:L,r:t,d:fl},{x:0,y:y0+s2*fl/2,z:az-fl+t/2,l:L,r:fl,d:t}],blue);
        D3.fingerAngles++;}
      // 両端の支柱(台座 → 上下のアングル)。有効長の外・板の外なので帯板とも軸受とも交わらない
      bx([-1,1].map(e=>({x:e*(half+14),y:(bedTop+top)/2,z:az-fl/2,l:24,r:top-bedTop,d:60})),blueD);}
    /* ---- 軸:有効長は Φ200 の研磨面。その外に首・駆動端の継手・キー溝 ---- */
    const r0=sd/2;
    for(const y of [yU,yL]){const a=arm(y);
      put(a,G.cyl,steel,[{x:0,y:0,l:L,r:r0}]);                    // 有効長(回る)
      put(a,G.box,dark,[{x:0,y:r0-3,z:0,l:L*0.94,r:8,d:20}]);}    // キー
    floatSeat(L,yU,yL);
    cy([yU,yL].flatMap(y=>[{x:dsEnd+M.gapDS/2+34,y,l:M.gapDS+68,r:r0*0.82},
      {x:osEnd-M.gapOS/2-10,y,l:M.gapOS+40,r:r0*0.90},{x:dsEnd+M.gapDS+40,y,l:60,r:r0*0.55}]),steel);
    cy([yU,yL].map(y=>({x:bx0+260,y,l:260,r:r0*0.62})),steelD);
    cy([yU,yL].map(y=>({x:bx0+132,y,l:120,r:r0*0.80})),dark);      // 駆動端の継手(駆動スピンドルが噛む)
    /* ---- 送り軸。台車の持ち物で外さない ---- */
    const rx0=bx0+60, rx1=bx1-40;
    cy([{x:(rx0+rx1)/2,y:ty,l:rx1-rx0,r:M.tieR}],rod);
    cy([{x:gx-M.gearW*0.32,y:ty,l:120,r:M.tieHubR*0.8},{x:gx+M.gearW*0.32,y:ty,l:120,r:M.tieHubR*0.8},
      {x:gx+M.gearW*0.78,y:ty,l:150,r:M.tieR*2.2},{x:rx0+30,y:ty,l:74,r:M.tieR*1.8}],dark);
    cy([{x:rx0+30,y:ty+50,l:28,r:28},{x:rx0+30,y:ty+98,l:48,r:17}],rod);
    /* ---- 調整ハンドル(Φ475 のリング+ボス+3本スポーク)。軸端部の頭に付く ---- */
    const wx=sx+M.standW/2+120;
    if(!G.wheel){G.wheel=new T.TorusGeometry(M.wheelR,17,16,64);G.wheel.rotateY(Math.PI/2);}
    const wm=new T.Mesh(G.wheel,rod);wm.position.set(wx,ty,0);wm.castShadow=true;stand.add(wm);
    put(stand,G.cyl,rod,[{x:(sx+wx)/2,y:ty,l:wx-sx,r:M.tieR*1.35}]);
    put(stand,G.cyl,dark,[{x:wx,y:ty,l:58,r:46}]);
    const spokeL=M.wheelR-17;
    for(let i=0;i<3;i++){const a=i*2*Math.PI/3,m=new T.Mesh(G.cyl,rod);
      m.position.set(wx,ty+Math.sin(a)*spokeL/2,Math.cos(a)*spokeL/2);m.scale.set(spokeL,15,15);
      m.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),new T.Vector3(0,Math.sin(a),Math.cos(a)));stand.add(m);}
    return{x0:bx0,x1:bx1,bcx,baseL,bedTop,railTop,xw:Math.max(bx1,wx+M.wheelR),yBot:bedTop-M.floorDrop,
      coupler:bx0+72};}

  /* ======================================================
   * 軸まわり(軸・軸受・スペーサー・保持層・刃)を実寸で置く — WaveLog machine()
   * ====================================================*/
  function machine(A,segs,zp,L,cd,tk){
    const half=L/2, off=x=>x-half, yU=cd/2, yL=-cd/2;
    D3.pack={over:0,worst:0,drop:0,filler:0,fillerMm:0,x0:0,x1:0,arbor:L};
    const out={liner:[],ring:[],lube:[],knife:[]};
    for(const [upper,y,pos] of [[true,yU,A.U],[false,yL,A.Lo]]){
      const side=upper?"up":"lo",n=pos.length;
      const spans=[[0,pos[0]-tk/2]];
      for(let j=0;j<segs.length;j++)spans.push([pos[j]+tk/2,pos[j+1]-tk/2]);
      spans.push([pos[n-1]+tk/2,L]);
      spans.forEach(([a,b],k)=>zone(out,a,b,y,zp.zones[k][side],k===A.floatZ?(k===0?"start":"end"):""));
      pos.forEach(x=>out.knife.push({x,y}));}
    const fr=frame(L,yU,yL);
    const sd=+MS.P.shaftDia||200, bore=sd/2, sh=D3.show, st=D3.ctx.st;
    const blade=skin(sh.knife,"blade",{color:"#3f4854",metalness:.78,roughness:.16});
    const liner=skin(sh.liner,"liner",{color:"#a8b2bd",metalness:.38,roughness:.46});
    const edge=skin(sh.liner,"linerEdge",{color:"#5d6975",metalness:.42,roughness:.55});
    // 部材は図面どおり内径の開いた輪。上下のアーバーへ分けて入れる(運転中は一緒に回る)
    // 部材は DS 端から順に並べて持つ(組み替えのとき、外した軸端部の側 = OS 端から外し、DS 端から入れていく)
    const put=(list,ro,ri,mat)=>{if(!mat)return;
      for(const up of [true,false]){const items=list.filter(q=>(q.y>0)===up).map(q=>({x:off(q.x),y:0,l:q.len,r:1,d:1}));
        const m=stack(batch(tubeGeo(ro,ri),mat,items.sort((a,b)=>b.x-a.x)),items);if(m)(up?armU:armL).add(m);}};
    const linerR=(+MS.P.spacerOD||240)/2, ringBore=(+MS.P.ringBore||241)/2;
    if(liner){const real=out.liner.filter(q=>!q.filler),ls=real.map(q=>({x:q.x,y:q.y,len:q.sz-0.8}));
      put(ls,linerR,bore,liner);
      put(ls,linerR,linerR-1.2,edge);                    // 外周の細い帯で1枚ずつの区切りを見せる
      const pad=out.liner.filter(q=>q.filler).map(q=>({x:q.x,y:q.y,len:q.sz}));
      if(pad.length)put(pad,linerR,bore,skin(sh.liner,"filler",{color:"#dfe4ea",metalness:.3,roughness:.6}));}
    if(drawn("ring")){
      const rings=out.ring.filter(q=>q.hold.kind==="ring"), fings=out.ring.filter(q=>q.hold.kind!=="ring");
      const byOd=new Map();for(const q of rings){const k=q.hold.od;(byOd.get(k)||byOd.set(k,[]).get(k)).push(q);}
      byOd.forEach((list,od)=>{const color=D3.ctx.ringHex(od)||"#8d97a6";
        put(list.map(q=>({x:q.x,y:q.y,len:q.sz-1.0})),od/2,ringBore,
          skin(sh.ring,"hold"+od,{color,metalness:.02,roughness:.9}));});
      if(fings.length){                                   // フィンガー: 板の両側に置く板押さえ(布入ベークライト)
        const f=MS.fingers[0]||MS.fingerShape, th=Math.max(0.2,+st.thick||0.5), ft=+f.thickness||20;
        const mat=skin(sh.ring,"finger",{color:COL.finger,metalness:.02,roughness:.85});
        const zc=-((+st.knife||300)/2+40)-90+(+f.length||560)/2;   // 上流端を押さえアングルの背に揃える
        if(mat)for(const up of [true,false]){
          const items=fings.filter(q=>(q.y>0)===up).map(q=>({x:off(q.x),y:(up?1:-1)*(th/2+ft/2),z:zc,l:q.sz-1.0,r:1,d:1}));
          const m=stack(batch(fingerShapeGeo(f),mat,items.sort((a,b)=>b.x-a.x)),items);if(m)g.add(m);}}
      if(out.lube.length){const L0=out.lube[0].lube;
        put(out.lube.map(q=>({x:q.x,y:q.y,len:q.sz-1.0})),L0.od/2,L0.bore/2,
          skin(sh.ring,"lube",{color:COL.lube,metalness:.02,roughness:.9}));}}
    if(blade)put(out.knife.map(q=>({x:q.x,y:q.y,len:tk})),st.knife/2,bore,blade);
    // 端から端が有効長を超えていないか・上下それぞれの組んだ長さ(スペーサー+刃)
    const e=[];
    out.liner.forEach(q=>e.push(q.x-q.sz/2,q.x+q.sz/2));out.ring.forEach(q=>e.push(q.x-q.sz/2,q.x+q.sz/2));
    out.lube.forEach(q=>e.push(q.x-q.sz/2,q.x+q.sz/2));out.knife.forEach(q=>e.push(q.x-tk/2,q.x+tk/2));
    if(e.length){D3.pack.x0=+Math.min(...e).toFixed(3);D3.pack.x1=+Math.max(...e).toFixed(3);}
    const sum=up=>+(out.liner.filter(q=>(q.y>0)===up&&!q.filler).reduce((a,q)=>a+q.sz,0)
      +out.knife.filter(q=>(q.y>0)===up).length*tk).toFixed(3);
    D3.pack.sumU=sum(true);D3.pack.sumL=sum(false);D3.pack.tk=tk;
    D3.pack.knifeGap=A.U.length?+Math.min(...A.U.map((u,i)=>Math.abs(u-A.Lo[i]))).toFixed(3):null;
    return Object.assign({out},fr);}

  /* ======================================================
   * 現場まわり(走行レール・回転テーブル・着地土台)— WaveLog site()
   * 回転テーブルは床の上に載る回る枠(ピットなし)。床の回転範囲の安全帯は factory.js。
   * ====================================================*/
  function site(m){
    const M=MACH, W=world, floorY=m.bedTop-M.floorDrop, lat=M.ttLat;
    const steelD=matOf("steelD",{color:"#8f99a4",metalness:.7,roughness:.3});
    const rail=matOf("rail",{color:"#7b858f",metalness:.68,roughness:.35});
    const dark=matOf("dark",{color:"#39424e",metalness:.56,roughness:.38});
    const blue=matOf("blue",{color:PAINT.body,metalness:.18,roughness:.58});
    const blueD=matOf("blueD",{color:PAINT.dark,metalness:.18,roughness:.62});
    const blueL=matOf("blueL",{color:PAINT.light,metalness:.18,roughness:.54});
    const bx=(list,mat,o)=>{const b=batch(G.box,mat,list);if(b)(o||W).add(b);};
    const railRun=(o,x0,x1,z,base)=>{const len=x1-x0,cx=(x0+x1)/2;if(len<=1)return;
      if(base!==false)bx([{x:cx,y:floorY+9,z,l:len,r:18,d:250}],steelD,o);
      bx([{x:cx,y:m.railTop-21,z,l:len,r:14,d:96}],rail,o);
      bx([{x:cx,y:m.railTop-7,z,l:len,r:14,d:150}],rail,o);
      const n=Math.max(2,Math.round(len/620)),tie=[];                                  // 締結板は両端とも区間の内側
      if(base!==false){for(let i=0;i<=n;i++)tie.push({x:x0+37+(len-74)*i/n,y:m.railTop-31,z,l:74,r:6,d:230});bx(tie,dark,o);}};
    /* ---- 回る枠(pivot の子 = 回転テーブルの上の物は全部いっしょに回る)----
       図の正方形 = 甲板(2台の台車が ±640 の受け口に並んで載る)
       図の TR・BL = 各受け口の駆動側(ライン側)のレールの腕 / 図の BR・TL = 各受け口の着地土台(軸端部を降ろす)
       回る範囲の外周 SW(腕とレールの先)。床のレールはその外で切る。 */
    const SW=2510, DY0=floorY+6, DY1=floorY+24, dy=(DY0+DY1)/2, th=DY1-DY0;   // 板の上面 = レールの足の下面
    const hx=KC_TT.hz*1000, hz=KC_TT.hx*1000;                                      // 甲板: pivot x ↔ 図の z / pivot z ↔ 図の x
    const P0=KC_TT.plates[0], ax0=P0.z0*1000-M.ttX, ax1=P0.z1*1000-M.ttX, az0=P0.x0*1000-lat, az1=P0.x1*1000-lat;
    const LD=KC_TT.land, lx0=LD.z0*1000-M.ttX, lx1=LD.z1*1000-M.ttX, lz=(LD.x0+LD.x1)*500-lat, ld=(LD.x1-LD.x0)*1000;
    const radial=(R,d)=>Math.sqrt(Math.max(0,R*R-d*d));
    // 縞鋼板は box の面ごとに模様が1枚なので、板ごとに大きさに合わせて繰り返す(約 90mm に1つ)
    const plate=(x,z,l,d)=>{const t=M_CHECKER.map.clone();t.needsUpdate=true;t.repeat.set(Math.max(1,l/1080),Math.max(1,d/1080));
      const mt=M_CHECKER.clone();mt.map=t;const m=new T.Mesh(G.box,mt);m.position.set(x,dy,z);m.scale.set(l,th,d);
      m.receiveShadow=true;m.castShadow=true;deck.add(m);};
    plate(0,0,2*hx,2*hz);                                                               // 甲板
    {const m=new T.Mesh(G.disc,steelD);m.position.set(0,DY1+3,0);m.scale.set(240,6,240);m.receiveShadow=true;deck.add(m);   // 旋回軸受のふた
      const ring=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ring.push({x:Math.cos(a)*205,y:DY1+8,z:Math.sin(a)*205,l:18,r:6,d:18});}
      bx(ring,dark,deck);}
    for(const sg of [1,-1]){                                                            // 受け口0(sg=+1)と、点対称の受け口1
      plate(sg*(ax0+ax1)/2,sg*(az0+az1)/2,ax1-ax0,az1-az0);                              // レールの腕(図の TR / BL)
      plate(sg*(hx+lx1)/2,sg*lz,lx1-hx,ld);                                             // 着地土台の腕(図の BR / TL)
      for(const s of [-1,1]){const z=sg*(-lat+s*M.railZ),d=Math.abs(z);
        const xe=radial(SW-5,d+75);                                                     // 腕のレールは外周の手前まで
        const nose=xe+ax0;                                                              // 腕の端から先へ出るレールの受け
        if(nose>1)bx([{x:sg*(ax0-nose/2),y:dy,z,l:nose,r:th,d:170}],steelD,deck);
        railRun(deck,sg>0?-xe:-(hx-10),sg>0?hx-10:xe,z,false);}
      // 着地土台(送り出した軸端部が降りる。枠に付いていて一緒に回る)
      const x0=sg>0?lx0:-lx1, x1=sg>0?lx1:-lx0, cx=(x0+x1)/2, len=x1-x0, zc=sg*lz, bedY=m.bedTop-M.baseH/2;
      bx([{x:cx,y:bedY,z:zc,l:len,r:M.baseH,d:ld}],blue,deck);
      bx([{x:cx,y:bedY-M.baseH/2-58,z:zc,l:len-60,r:116,d:ld-150}],blueD,deck);
      bx([{x:cx,y:m.bedTop+6,z:zc,l:len-40,r:12,d:ld-40}],blueL,deck);
      const leg=[],pad=[];
      for(const sx of [x0+110,x1-110])for(const s of [-1,1]){const fz=zc+s*(ld/2-130);
        leg.push({x:sx,y:(m.bedTop-116+DY1+30)/2,z:fz,l:160,r:(m.bedTop-116)-(DY1+30),d:150});
        pad.push({x:sx,y:DY1+16,z:fz,l:210,r:32,d:200});}
      bx(leg,dark,deck);bx(pad,steelD,deck);
      bx([{x:sg>0?x1-26:x0+26,y:m.bedTop+28,z:zc,l:40,r:56,d:ld-120}],steelD,deck);}  // 土台の奥の止め
    // 床のレール: ライン位置の台車の駆動側の端から、回る枠の外周の外まで(角が外周 SW+10 に触れない所で切る)
    const rx0=m.x0-150;
    for(const s of [-1,1]){const z=s*M.railZ,d=Math.abs(z-lat);railRun(W,rx0,M.ttX-radial(SW+10,Math.max(0,d-125)),z);}
    bx([{x:rx0-40,y:floorY+60,z:0,l:80,r:120,d:2*M.railZ+260}],matOf("stop",{color:"#e8b324",metalness:.2,roughness:.6}));   // 車止め
    siteInfo={floorY,deckTop:DY1,sweepR:SW};
    return siteInfo;}

  /* ======================================================
   * 駆動側(DS・−Z)の固定設備 — 台車のギヤボックス端の継手へスピンドルで噛む。
   * 台車を出すときは継手スリーブを引いて外す(cpl: 1=噛み合い 0=退避)。
   * ====================================================*/
  const sleeves=[];
  function driveUnit(m,yU,yL){
    const M=MACH, floorY=m.bedTop-M.floorDrop, x0=m.coupler;          // 台車側継手の端(ライン位置)
    const blue=matOf("blue",{color:PAINT.body,metalness:.18,roughness:.58});
    const blueD=matOf("blueD",{color:PAINT.dark,metalness:.18,roughness:.62});
    const dark=matOf("dark",{color:"#39424e",metalness:.56,roughness:.38});
    const steel=matOf("steel",{color:"#b9c1c9",metalness:.74,roughness:.22});
    const cover=matOf("cover",{color:PAINT.cover,metalness:.12,roughness:.56});
    const bx=(list,mat,o)=>{const b=batch(G.box,mat,list);if(b)(o||drive).add(b);};
    const cy=(list,mat,o)=>{const b=batch(G.cyl,mat,list);if(b)(o||drive).add(b);};
    const ps0=x0-1180, ps1=ps0-420;                                  // ピニオンスタンドの面(台車側)/ 背面
    // ピニオンスタンド(上下へ分配する歯車箱)+ 共通台
    bx([{x:(ps0+ps1)/2-200,y:floorY+60,z:0,l:ps0-ps1+900,r:120,d:900}],blueD);
    bx([{x:(ps0+ps1)/2,y:(floorY+120+yU+260)/2,z:0,l:ps0-ps1,r:(yU+260)-(floorY+120),d:640}],blue);
    bx([{x:(ps0+ps1)/2,y:yU+300,z:0,l:(ps0-ps1)*0.7,r:80,d:420}],cover);
    // 主電動機(ピニオンスタンドの背面へ直結)
    cy([{x:ps1-420,y:(yU+yL)/2,z:0,l:640,r:260}],blue);
    cy([{x:ps1-60,y:(yU+yL)/2,z:0,l:80,r:150}],dark);
    bx([{x:ps1-420,y:floorY+120+60,z:0,l:560,r:120,d:420}],blueD);
    // スピンドル(ピニオンスタンドの出力 → 継手スリーブ)。スリーブだけが軸方向に動く
    sleeves.length=0;
    for(const y of [yU,yL]){
      cy([{x:ps0+60,y,l:120,r:95}],dark);                            // 出力軸の継手
      const sl=new T.Group();drive.add(sl);sleeves.push(sl);
      cy([{x:(ps0+120+x0-150)/2,y,l:(x0-150)-(ps0+120),r:62}],steel,sl);   // スピンドル(伸縮)
      cy([{x:x0-75,y,l:150,r:92}],dark,sl);                          // 継手スリーブ(台車側の継手に被る)
      cy([{x:x0-150-20,y,l:40,r:100}],steel,sl);}
    // スピンドルの受け(中間軸受台)
    const sx=(ps0+x0)/2-120;
    bx([{x:sx,y:(floorY+yL)/2-40,z:0,l:160,r:yL-floorY-80,d:360}],blueD);
    for(const y of [yU,yL])bx([{x:sx,y,z:0,l:120,r:170,d:260}],dark);}

  /* ======================================================
   * 組み立て(条数・板厚・表示を変えたら組み直す)— 台車ごと
   * ====================================================*/
  let siteBuilt=false, siteInfo=null;
  function rebuildCar(c,ctx){use(c);
    c.D.ctx=ctx;c.D.res=ctx.res;c.N=ctx.st.lots.reduce((a,l)=>a+l.n,0);c.w=ctx.w;
    for(const o of [rig,stand,armU,armL])clear(o);
    for(const k of g.children.slice())if(k!==rig&&k!==armU&&k!==armL){g.remove(k);if(k.dispose)k.dispose();}
    const res=ctx.res, A=res.A, L=A.arborLen, cd=Math.max(1,ctx.st.knife-ctx.st.ov);
    armU.position.set(0,cd/2,0);armL.position.set(0,-cd/2,0);
    const m=machine(A,res.segs,res.zp,L,cd,ctx.st.tk);
    c.frame=m;c.D.bcx=m.bcx;
    if(!siteBuilt){site(m);driveUnit(m,cd/2,-cd/2);siteBuilt=true;}
    use(ACTIVE);
    pose();}

  /* 札: 台車の名前(台車の中央)と、ラインの台車の OS・DS(有効長の両端)。取付点はタイロッドの上面で、
     テーブルを回せば一緒に回る。呼び方は刃組基準値の「OSの呼び方」「DSの呼び方」。 */
  for(const c of CARS)c.tag=makeLabel(c.name,0,0,0,{rank:1});              // OS/DS は小さく端に付くので先に置く
  const tags={os:makeSubLabel(BS().sideWord(MS,"OS"),0,0,0,{rank:0.5}),ds:makeSubLabel(BS().sideWord(MS,"DS"),0,0,0,{rank:0.5})};
  const tagText=c=>c.D.travel<1-1e-6?"スリッター("+c.name+")":
    Math.abs(SH.rot-c.D.slot)<1e-3?c.name+"(テーブル上)":c.name+"(待機)";          // レールの線の受け口 / 段取り位置・旋回中
  const _v=new T.Vector3();
  function placeTags(){root.updateMatrixWorld(true);
    const top=c=>{const x=c.D.ctx;return x.st.knife/2-x.st.ov/2+MACH.tieY+MACH.tieR+5;};
    for(const c of CARS){if(!c.D.ctx)continue;
      c.tag.position.copy(_v.set(0,top(c),0).applyMatrix4(c.g.matrixWorld));LBL.setText(c.tag,tagText(c));}
    const a=ACTIVE;if(!a.D.ctx)return;
    const L=a.D.ctx.res.A.arborLen, y=top(a);
    tags.os.position.copy(_v.set(-(L/2+120),y,0).applyMatrix4(a.g.matrixWorld));   // g-局所の −X = 計算のOS端
    tags.ds.position.copy(_v.set(L/2+120,y,0).applyMatrix4(a.g.matrixWorld));}

  /* 姿勢を当てる(走行・軸端部・テーブルの回転・駆動継手)
     テーブルの上(走行=1): 台車は受け口に載って枠と一緒に回る(pivot の子)。受け口0 は向きそのまま・
       受け口1 は点対称(180°)に置く = テーブルを 180° 回すと受け口1 がレールの線に並ぶ。
     レールの上(走行<1): root の子。走れるのはレールの線に並んだ受け口の台車だけ(手順の判定が守る)。 */
  const ease=k=>(k<0.5?2*k*k:1-2*(1-k)*(1-k));
  function poseCar(c){
    const D=c.D, bcx=D.bcx==null?0:D.bcx, s=D.slot?-1:1;
    if(D.travel>=1-1e-6){
      if(c.box.parent!==pivot)pivot.add(c.box);
      c.box.position.set(s*(MACH.ttC-bcx),0,-s*MACH.ttLat);   // テーブル中心より ttC 先で止まる
      c.box.rotation.y=D.slot?Math.PI:0;
    }else{
      if(c.box.parent!==root)root.add(c.box);
      c.box.position.set(MACH.ttX+T.MathUtils.lerp(-MACH.ttX,-bcx+MACH.ttC,ease(D.travel)),0,0);
      c.box.rotation.y=0;}
    c.stand.position.x=ease(D.open)*MACH.travel;}              // 軸端部を送り出す(受け口の着地土台へ)
  function pose(){
    pivot.rotation.y=-Math.PI*ease(SH.rot);                     // テーブルを半回転(枠・着地土台・載った台車が一緒に回る)
    for(const c of CARS)poseCar(c);
    for(const s of sleeves)s.position.x=-(1-ease(SH.cpl))*220;  // 継手スリーブを引いて外す
    placeTags();}

  /* 刃組の計算(ラインの条件 → WaveLog の st) */
  const ringHex=od=>BS().ringMeta(MS,IX,od).hex||"#8d97a6";
  const stripW=N=>Math.floor(EFF_W*1000/N/0.05+1e-9)*0.05;      // 条幅は寸法刻みへ切り下げ(余りは耳へ)
  function solveFor(N,thick,car){
    const B=BS(), w=stripW(N);
    const mk=()=>{const s=B.defaultState();s.equipment=MS.equipment;s.W=STRIP_W*1000;s.thick=thick;
      s.lots=[{name:"LOT1",w:+w.toFixed(3),n:N}];s.order=[];B.syncOrder(s);B.applyStandards(s,MS);
      const c=B.clearanceFor(MS,s.thick);if(c)s.clr=c;
      s.carriage=(MS.carriages[car|0]||{}).name||"";return s;};
    // 刃厚は「一般」の刃を厚い順に試し、組める最初の刃を使う(狭い条は厚刃では組めない)
    const thicks=[...new Set(MS.blades.filter(b=>B.selectable(b,MS)&&b.status===MS.bladeGeneral&&b.currentDia)
      .map(b=>+b.thickness))].sort((a,b)=>b-a);
    let best=null;
    for(const tk of (thicks.length?thicks:[10])){const s=mk();s.tk=tk;
      const res=B.solve(s,MS,IX);
      const bad=res.A.errs.length*100+res.fit.spacerGap.length*10+res.fit.bareHold.length+res.stop.length*1000;
      if(!best||bad<best.bad)best={st:s,res,bad,w};
      if(!bad)break;}
    const blade=MS.blades.find(b=>+b.thickness===best.st.tk&&b.status===MS.bladeGeneral)||null;
    return{st:best.st,res:best.res,M:MS,ringHex,w:best.w,blade};}

  /* 刃・保持層の見え方(ラインの帯板・耳屑の経路が読む。単位 m・パスライン基準)— ラインの台車 */
  function geom(){const c=ACTIVE.D.ctx;if(!c)return null;
    const A=c.res.A, n=A.sign.length-1, cd=c.st.knife-c.st.ov;
    return{yU:cd/2000, knifeR:c.st.knife/2000,
      // 耳屑側の最外刃が上刃か(OS端 = +Z / DS端 = −Z)
      osUpper:A.sign[0]<0, dsUpper:A.sign[n]>0};}

  const rebuildAll=()=>{for(const c of CARS)if(c.D.ctx)rebuildCar(c,c.D.ctx);};
  /* 組み替えの見せ方: 軸方向位置(g/アーバーの局所 x・OS 端 = −)が X より DS 側の部材だけ出す。
     X を OS 端 → DS 端へ動かすと外していき、DS 端 → OS 端へ戻すと入れていく。X=-Infinity で全部 */
  function setStack(c,X){
    const cut=o=>{for(const m of o.children){const xs=m.userData.xs;
      if(xs){let k=0;while(k<xs.length&&xs[k]>X)k++;m.count=k;m.visible=k>0;}
      else if(m.userData.stackX!=null)m.visible=m.userData.stackX>X;}};
    cut(c.armU);cut(c.armL);cut(c.g);}
  return{MS,IX,root,pivot,drive,deck,world,SH,CARS,
    get D3(){return ACTIVE.D;}, get active(){return ACTIVE;},                    // ラインの台車(入っている/最後に入った)
    get standby(){return CARS.find(c=>c!==ACTIVE);},
    setActive(c){ACTIVE=c;use(c);pose();},
    get g(){return ACTIVE.g;}, get rig(){return ACTIVE.rig;}, get armU(){return ACTIVE.armU;},
    get armL(){return ACTIVE.armL;}, get fix(){return ACTIVE.fix;}, get stand(){return ACTIVE.stand;},
    solveFor, stripW, rebuild(ctx){rebuildCar(ACTIVE,ctx);}, rebuildCar, setStack, pose, geom, ease,
    get frame(){return ACTIVE.frame;}, get site(){return siteInfo;},
    setShow(k,on){VIS.show[k]=on;rebuildAll();},
    setHide(mode){VIS.hide=mode;rebuildAll();}};
})();
