"use strict";
/* =========================================================
 * テンションスタンド MD-1800(マルチディスクロール)— 山王鐵工 図番 1463-02SA
 * =========================================================
 * 添付の 3D モデル(MD1800_multidisc_roll_3D_v20・three r160)から r128 へ移植:
 *   ロール(ゴム状薄厚円盤の密着積層・主φ400/ミニφ250 × 有効長1800)・フレーム/ハウジング・
 *   油圧(ロール開閉シリンダ・落下防止ロックピン・テンションパッド)・出側スイングテーブルと揺動シリンダ・
 *   駆動系(ベッド・減速機 i=1/10.44・歯車ユニット・AC モータ 75kW・ユニバーサルスピンドル×4)・ジャッキ・架台。
 * 座標は移植元のまま(mm): X = ロール軸方向(+ = 駆動側)/ Y = 高さ(0 = 据付面 FL)/ Z = 通板方向(+ = 出側)。
 * root 1つでラインへ写す: X → −z(駆動側 = DS)・Z → +x(下流)・Y → y(Y 軸まわり +90°、鏡映なし)。
 * 図面のパスラインは FL+1000。ラインのパスライン PL に合わせ、据付面は PL−1000(config.js MD_FL)=
 * 足場より 288 低い区画(MD_PIT)。架台はその区画の天端を支える(脚は GL まで)。
 * ロールは閉(運転)位置で、帯板の速度で回る(上下逆回転・周速一致)。スピンドルは接続先ロールと、
 * モータは減速比ぶん速く回る。
 * =======================================================*/
const MD=(function(){
  const T=THREE;
  const P={barrel:1800, mainD:400, miniD:250, mainShaft:180, miniShaft:120, discT:10, zMain:430, zMini:-415,
    frameZ:1260, postIn:960, postOut:1290, bodyW:2200, maxW:3150, frameH:2034, PL:1000,
    bedX0:2080, bedX1:3930, bedZ:1560, bedH:520,
    gbX0:2397, gbX1:2819, gbY0:660, gbY1:1410,            // 減速機
    guX0:2881, guX1:3381, guY0:604, guY1:1041,            // 歯車ユニット
    mtX0:3300, mtX1:4290, mtY:785, mtZ:100, mtR:225,      // AC モータ
    spRoll:1290, spGear:2240};                            // スピンドル継手中心(ロール側/減速機側)
  const root=new T.Group();root.scale.setScalar(0.001);root.rotation.y=Math.PI/2;root.position.set(MD_X,MD_FL,0);scene.add(root);
  const G={frame:new T.Group(),rolls:new T.Group(),hyd:new T.Group(),drive:new T.Group(),jack:new T.Group(),
    swing:new T.Group(),base:new T.Group()};
  for(const k in G)root.add(G[k]);

  /* ---- 材質(移植元は r160 の色管理 = sRGB の色を線形へ直して持つ。金属はラインの材質に合わせる) ---- */
  const lin=c=>new T.Color(c).convertSRGBToLinear();
  const std=(c,r,m)=>new T.MeshStandardMaterial({color:lin(c),roughness:r,metalness:m});
  const MM={rubberEnd:std(0x2a2d33,.8,0), steel:M.steel, steelD:std(0x8d949c,.45,.85), chrome:M.knife,
    paint:std(0xcad9a3,.55,.18), paint2:std(0xb4c68b,.62,.15), motor:std(0x2f6b57,.5,.35), gear:std(0x4a5764,.5,.4),
    cyl:std(0x2b3542,.42,.6), pad:std(0x6d5030,.85,.05)};

  /* ---- 形(mm・親は root の下の群) ---- */
  const mesh=(g,mat,x,y,z,p)=>{const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);return m;};
  const box=(w,h,d,mat,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,p);
  const cylX=(r,len,mat,x,y,z,p,seg)=>{const g=new T.CylinderGeometry(r,r,len,seg||40);g.rotateZ(Math.PI/2);return mesh(g,mat,x,y,z,p);};
  const taperX=(rN,rP,len,mat,x,y,z,p,seg)=>{const g=new T.CylinderGeometry(rN,rP,len,seg||24);g.rotateZ(Math.PI/2);return mesh(g,mat,x,y,z,p);};   // rN = −X 端
  const cylY=(r,len,mat,x,y,z,p,seg)=>mesh(new T.CylinderGeometry(r,r,len,seg||32),mat,x,y,z,p);
  const cylZ=(r,len,mat,x,y,z,p,seg)=>{const g=new T.CylinderGeometry(r,r,len,seg||32);g.rotateX(Math.PI/2);return mesh(g,mat,x,y,z,p);};

  /* ============ 1) マルチディスク・ロール ============
     円盤の積層(厚み 10mm × 180 枚)は、胴を1本の円筒にして帯の模様で描く(移植元は円盤ごとのまとめ描き
     4 本 × 360 個・約 37 万面 — 見た目は同じで、描く面を 1/300 にする)。9 枚で色が一巡・合わせ目は黒い線 */
  const discTex=canvasTex(8,9*64,(g,w,h)=>{for(let i=0;i<9;i++){const v=0.93+((i*37)%9)/100;
      g.fillStyle=`rgb(${Math.round(46*v)},${Math.round(49*v)},${Math.round(55*v)})`;g.fillRect(0,i*64,w,64);
      g.fillStyle="#07080b";g.fillRect(0,i*64,w,4);}});
  discTex.repeat.set(1,P.barrel/P.discT/9);
  const discMat=[new T.MeshStandardMaterial({map:discTex,roughness:.78,metalness:0}),MM.rubberEnd,MM.rubberEnd];   // 胴 / 両端面
  function mdRoll(dia,shaftD){
    const group=new T.Group(),spinG=new T.Group();group.add(spinG);
    const hb=P.barrel/2,jour=shaftD*0.60;
    cylX(shaftD/2,P.barrel+160,MM.steelD,0,0,0,spinG,32);                       // 主軸
    for(const k of [-1,1])box(P.barrel+160,26,34,MM.steel,0,k*(shaftD/2-6),0,spinG);   // キー凸条
    for(const s of [-1,1]){
      cylX(dia*0.46,30,MM.steel,s*(hb+18),0,0,spinG,48);                         // 押板
      const ng=new T.CylinderGeometry(shaftD*0.78,shaftD*0.78,70,6);ng.rotateZ(Math.PI/2);
      mesh(ng,MM.steelD,s*(hb+72),0,0,spinG);                                    // 締付ナット
      cylX(jour,250,MM.chrome,s*(hb+215),0,0,spinG,32);                          // ジャーナル
      cylX(jour*0.78,230,MM.steel,s*(hb+450),0,0,spinG,26);}
    for(const s of [-1,1]){const c=new T.Group();                                 // 軸受箱(固定)
      box(280,dia*0.95+180,420,MM.paint2,0,0,0,c);cylX(jour+30,300,MM.steelD,0,0,0,c);
      box(310,36,450,MM.paint,0,(dia*0.95+180)/2-18,0,c);c.position.set(s*(hb+215),0,0);group.add(c);}
    const bg=new T.CylinderGeometry(dia/2,dia/2,P.barrel,64);bg.rotateZ(Math.PI/2);mesh(bg,discMat,0,0,0,spinG);   // 胴(円盤の積層)
    G.rolls.add(group);
    return{group,spin:spinG};}
  // 閉(運転)位置: 上下ロールの接点 = パスライン。V = ミニ(前段)/ W = 主(後段)
  const RY={mainUp:P.PL+P.mainD/2, mainLo:P.PL-P.mainD/2, miniUp:P.PL+P.miniD/2, miniLo:P.PL-P.miniD/2};
  const RZ={mainUp:P.zMain, mainLo:P.zMain, miniUp:P.zMini, miniLo:P.zMini};
  const RD={mainUp:P.mainD, mainLo:P.mainD, miniUp:P.miniD, miniLo:P.miniD};
  const DIR={mainUp:-1, mainLo:1, miniUp:-1, miniLo:1};   // 局所 X(= ライン −z)まわり: 上ロールの下面・下ロールの上面が +x へ進む
  const ID={miniUp:"V1", miniLo:"V2", mainUp:"W1", mainLo:"W2"};
  for(const t of ["miniUp","miniLo","mainUp","mainLo"]){
    const rl=mdRoll(RD[t],t.startsWith("main")?P.mainShaft:P.miniShaft);
    rl.group.position.set(0,RY[t],RZ[t]);
    spin(rl.spin,RD[t]/2000,DIR[t],"x");
    regRoll(ID[t],MD_X+RZ[t]/1000,MD_FL+RY[t]/1000,RD[t]/2000);}

  /* ============ 2) フレーム/ハウジング ============ */
  (function buildFrame(){const p=G.frame,postW=P.postOut-P.postIn,xc=(P.postOut+P.postIn)/2;
    box(P.bodyW,300,P.frameZ,MM.paint2,0,150,0,p);
    box(2580,60,P.frameZ+40,MM.paint,0,30,0,p);
    for(const s of [-1,1]){
      box(300,110,520,MM.steelD,s*1180,55,0,p);
      for(const z of [P.zMain,P.zMini]){
        box(postW,P.frameH-300,210,MM.paint,s*xc,300+(P.frameH-300)/2,z+300,p);
        box(postW,P.frameH-300,210,MM.paint,s*xc,300+(P.frameH-300)/2,z-300,p);}
      box(postW-80,P.frameH-300,170,MM.paint2,s*xc,300+(P.frameH-300)/2,0,p);
      for(const z of [P.zMain,P.zMini])for(const k of [-1,1])box(postW-60,1000,30,MM.steel,s*xc,P.PL+120,z+k*205,p);   // 窓のガイド板
      box(postW+80,170,P.frameZ,MM.paint,s*xc,P.frameH-85,0,p);}
    box(2*P.postOut,170,320,MM.paint,0,P.frameH-85,P.zMain,p);
    box(2*P.postOut,170,320,MM.paint,0,P.frameH-85,P.zMini,p);
    box(2*P.postIn,120,260,MM.paint2,0,P.frameH-260,0,p);})();

  /* ============ 3) 油圧・ロックピン・テンションパッド ============ */
  function cylinder(bore,stroke,x,y,z,p,extend,dir){extend=extend==null?0.4:extend;dir=dir||-1;
    const g=new T.Group();g.position.set(x,y,z);
    const tubeL=stroke+bore*1.5;
    cylY(bore/2+16,tubeL,MM.cyl,0,0,0,g,28);
    cylY(bore/2+24,30,MM.steelD,0,tubeL/2-12,0,g,28);
    cylY(bore/2+24,30,MM.steelD,0,-tubeL/2+12,0,g,28);
    const rodL=stroke*(1-extend)+bore*0.8;
    cylY(bore*0.28,rodL,MM.chrome,0,dir*(tubeL/2+rodL/2-bore*0.4),0,g,20);
    box(bore*1.05,50,bore*1.05,MM.steel,0,dir*(tubeL/2+rodL-bore*0.55),0,g);
    cylZ(12,110,MM.steel,bore/2+16,tubeL/2-60,0,g,12);
    cylZ(12,110,MM.steel,bore/2+16,-tubeL/2+60,0,g,12);
    p.add(g);return g;}
  function lockPin(x,y,z,p,sign){const g=new T.Group();g.position.set(x,y,z);
    box(110,140,110,MM.gear,0,0,0,g);cylX(22,180,MM.chrome,sign*110,0,0,g,16);p.add(g);return g;}
  (function buildHyd(){const p=G.hyd,xc=(P.postOut+P.postIn)/2;
    for(const s of [-1,1]){
      cylinder(100,190,s*xc,P.frameH+110,P.zMain,p,0.35);                        // 主ロール開閉 φ100×St190
      cylinder(100,22,s*xc,P.frameH+70,P.zMini,p,0.35);                          // ミニロール開閉 φ100×St22
      lockPin(s*(P.postIn-60),P.PL+P.mainD/2+180,P.zMain,p,s);                   // 落下防止ロックピン RQB50-50M
      lockPin(s*(P.postIn-60),P.PL+P.miniD/2+180,P.zMini,p,s);
      lockPin(s*(P.postIn-60),P.PL+430,0,p,s);
      cylX(45,160,MM.chrome,s*(P.maxW/2-80),P.PL+430,0,p,16);
      box(150,150,150,MM.gear,s*(P.maxW/2-230),P.PL+430,0,p);}
    const padU=new T.Group();                                                      // 上テンションパッド
    box(P.barrel,70,300,MM.pad,0,0,0,padU);box(P.barrel+140,110,360,MM.steelD,0,95,0,padU);box(240,260,300,MM.paint2,0,300,0,padU);
    padU.position.set(0,P.PL+35+2.5,0);p.add(padU);
    const padL=new T.Group();                                                      // 下テンションパッド
    box(P.barrel,70,300,MM.pad,0,0,0,padL);box(P.barrel+140,110,360,MM.steelD,0,-95,0,padL);
    padL.position.set(0,P.PL-35-2.5,0);p.add(padL);
    for(const s of [-1,1])cylinder(125,170,s*600,P.PL-560,0,p,0.4,+1);})();       // 主パッド昇降 φ125×St170

  /* ============ 3b) 出側スイングテーブル + 揺動シリンダ φ50×St460(OS 側)============
     テーブルは主ロール出側直後のヒンジ(FL+900・Z+760)で下へ畳む。運転中は水平(上面 FL+970 = パスライン−30)。
     ロッド先端はテーブル裏の先端寄り(ヒンジ基準 Z+380/Y−45)にピン結合・下端は床のブラケット(FL+150・Z+700)。 */
  const SW={x:-1380, hy:900, hz:760, by:150, bz:700, pinY:-45, pinZ:380, L0:370, tubeL:330, len:400, wid:1900};
  const swTable=new T.Group(), swCyl=new T.Group();let swRod=null,swEye=null;
  (function buildSwing(){const p=G.swing,t=swTable;
    for(const s of [-1,1])box(120,200,SW.len,MM.paint,s*(SW.wid/2-60),-120,SW.len/2,t);   // 側梁
    box(SW.wid,90,120,MM.paint2,0,-120,60,t);box(SW.wid,90,120,MM.paint2,0,-120,SW.len-60,t);   // 連結梁(ヒンジ側/先端)
    box(SW.wid-120,30,SW.len-40,MM.steelD,0,55,SW.len/2,t);                                   // 平板(上面 FL+970)
    for(const s of [-1,1])cylX(70,140,MM.steelD,s*(SW.wid/2-30),0,0,t,20);                    // ヒンジボス
    box(160,190,220,MM.gear,SW.x+90,SW.pinY-10,SW.pinZ,t);box(120,150,180,MM.gear,SW.x,SW.pinY-10,SW.pinZ,t);   // クレビス受け
    for(const k of [-1,1])box(40,150,180,MM.steelD,SW.x+k*70,SW.pinY-10,SW.pinZ,t);
    cylX(30,300,MM.chrome,SW.x,SW.pinY,SW.pinZ,t,16);                                         // 連結ピン
    t.position.set(0,SW.hy,SW.hz);p.add(t);
    for(const s of [-1,1]){box(220,380,220,MM.paint2,s*(SW.wid/2-30),SW.hy-190,SW.hz,p);cylX(45,260,MM.steelD,s*(SW.wid/2-30),SW.hy,SW.hz,p,20);}   // ヒンジ受け
    const g=swCyl;                                                                            // シリンダ(局所 +Y = ロッドの伸びる向き)
    cylY(50/2+18,SW.tubeL,MM.cyl,0,SW.tubeL/2,0,g,26);cylY(50/2+26,30,MM.steelD,0,26,0,g,26);cylY(50/2+26,30,MM.steelD,0,SW.tubeL-18,0,g,26);
    box(120,140,90,MM.gear,0,-55,0,g);
    const rg=new T.CylinderGeometry(20,20,1,18);rg.translate(0,0.5,0);swRod=mesh(rg,MM.chrome,0,SW.tubeL-40,0,g);
    swEye=mesh(new T.CylinderGeometry(52,52,90,18),MM.steel,0,0,0,g);
    g.position.set(SW.x,SW.by,SW.bz);p.add(g);
    box(300,300,260,MM.paint2,SW.x,SW.by-150,SW.bz,p);cylX(32,360,MM.chrome,SW.x,SW.by,SW.bz,p,16);})();   // 据付ブラケット・下端ピン
  function setSwing(th){                                            // th: 下方向への畳み角[rad](0 = 水平)
    swTable.rotation.x=th;
    const c=Math.cos(th),s=Math.sin(th),Ry=SW.hy+(SW.pinY*c-SW.pinZ*s),Rz=SW.hz+(SW.pinY*s+SW.pinZ*c);
    const dy=Ry-SW.by,dz=Rz-SW.bz,L=Math.hypot(dy,dz);
    swCyl.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(0,dy/L,dz/L));
    const rodLen=Math.max(20,L-(SW.tubeL-40));swRod.scale.y=rodLen;swEye.position.y=SW.tubeL-40+rodLen;
    return Math.max(0,L-SW.L0);}                                    // ストローク(0 = 格納 … 461 = 水平)
  setSwing(0);

  /* ============ 4) 駆動系 ============ */
  (function buildDrive(){const p=G.drive;
    box(P.bedX1-P.bedX0,P.bedH,P.bedZ,MM.paint2,(P.bedX0+P.bedX1)/2,P.bedH/2,0,p);          // ベッド 1850×1560(天面 FL+560)
    box(P.bedX1-P.bedX0+80,40,P.bedZ+80,MM.paint,(P.bedX0+P.bedX1)/2,P.bedH+20,0,p);
    const bedTop=P.bedH+40;
    const gw=P.gbX1-P.gbX0,gh=P.gbY1-P.gbY0,gcx=(P.gbX0+P.gbX1)/2;                          // 減速機 i=1/10.44
    box(gw,P.gbY0-bedTop,900,MM.paint2,gcx,(bedTop+P.gbY0)/2,0,p);
    box(gw,gh,1000,MM.gear,gcx,(P.gbY0+P.gbY1)/2,0,p);
    box(gw+70,50,1080,MM.steelD,gcx,P.gbY1+20,0,p);
    const uw=P.guX1-P.guX0,uh=P.guY1-P.guY0,ucx=(P.guX0+P.guX1)/2,ucy=(P.guY0+P.guY1)/2;   // 歯車ユニット
    box(uw,uh,520,MM.gear,ucx,ucy,0,p);box(uw+60,40,580,MM.steelD,ucx,P.guY1+20,0,p);box(uw*0.5,ucy-bedTop,420,MM.paint2,ucx,(bedTop+ucy)/2,0,p);
    for(const k of [-1,1])cylX(150,90,MM.steelD,P.guX0+150+(k>0?200:0),P.mtY,160*k,p,28);
    cylX(80,P.mtX0-P.guX1+60,MM.chrome,(P.guX1+P.mtX0)/2,P.mtY,0,p,20);
    // AC モータ 75kW×1750rpm φ450(軸心 FL+785・Z+100)。固定部 + 回転部(駆動端軸・反負荷側ファン)
    const mL=P.mtX1-P.mtX0,mY=P.mtY,mZ=P.mtZ,mR=P.mtR,mcx=(P.mtX0+P.mtX1)/2;
    const fix=new T.Group();
    cylX(mR,mL*0.70,MM.motor,0,0,0,fix,40);
    for(let i=0;i<18;i++)box(18,46,400,MM.motor,-mL*0.32+i*(mL*0.64/17),mR+23,0,fix);   // 放熱フィン
    cylX(mR*0.88,mL*0.16,MM.motor,mL*0.44,0,0,fix,30);                                   // ファンカバー(反負荷側)
    for(let i=0;i<10;i++)box(10,mR*1.4,10,MM.steelD,mL*0.52,0,0,fix).rotation.x=i*Math.PI/10;
    box(300,200,300,MM.motor,-mL*0.10,mR+115,-100,fix);                                   // 端子箱
    for(const k of [-1,1])box(mL*0.80,60,120,MM.steelD,0,-(mY-bedTop)+30,k*260,fix);     // 据付レール
    fix.position.set(mcx,mY,mZ);p.add(fix);
    const rot=new T.Group();
    cylX(65,mL*0.34,MM.chrome,-mL*0.52,0,0,rot,20);
    for(let i=0;i<8;i++){const f=box(26,170,55,MM.steelD,mL*0.45,Math.cos(i*Math.PI/4)*80,Math.sin(i*Math.PI/4)*80,rot);f.rotation.x=i*Math.PI/4;}
    rot.position.set(mcx,mY,mZ);p.add(rot);
    spin(rot,P.mainD/2000/10.44,-DIR.mainUp,"x");                                        // 減速比 10.44 倍の速さ
    // 出力軸(各ロール芯と同高・同 Z)→ 段付き円筒ボス → ユニバーサルスピンドル(継手中心 X+2240 → X+1290)
    for(const t of ["mainUp","mainLo","miniUp","miniLo"]){const y=RY[t],z=RZ[t],r=RD[t]/2000;
      const hub=new T.Group();cylX(75,260,MM.steelD,0,0,0,hub,20);hub.position.set(P.gbX0-130,y,z);p.add(hub);
      spin(hub,r,DIR[t],"x");
      cylX(150,120,MM.paint2,P.gbX0-30,y,z,p,28);cylX(115,110,MM.paint2,P.gbX0-135,y,z,p,28);cylX(95,70,MM.steelD,P.gbX0-205,y,z,p,24);
      // スピンドル: 局所 +X = ロール側(= 機械の −X)。中間軸 φ100(ロール側)→ φ70(減速機側)のテーパ、
      // ベル状円錐 + フランジは減速機側のみ、ロール側は小径ヨーク + 十字軸
      const g=new T.Group();g.position.set((P.spGear+P.spRoll)/2,y,z);g.rotation.y=Math.PI;p.add(g);
      const sp=new T.Group();g.add(sp);
      const midLen=Math.max(60,(P.spGear-P.spRoll)-330-130);
      taperX(35,50,midLen,MM.steelD,0,0,0,sp,24);
      const ykG=new T.Group();cylX(60,150,MM.steel,40,0,0,ykG,24);
      const bg=new T.CylinderGeometry(95,45,170,24);bg.rotateZ(Math.PI/2);mesh(bg,MM.steelD,-60,0,0,ykG);
      cylX(95,40,MM.steel,-155,0,0,ykG,24);ykG.position.set(-midLen/2-40,0,0);sp.add(ykG);
      const ykR=new T.Group();cylX(62,130,MM.steel,0,0,0,ykR,20);
      for(const k of [-1,1])box(120,34,34,MM.steelD,0,k*46,0,ykR);
      cylZ(20,150,MM.chrome,0,0,0,ykR,14);ykR.position.set(midLen/2+65,0,0);sp.add(ykR);
      spin(sp,r,-DIR[t],"x");}})();                                                         // 局所 X が機械の −X なので逆向き

  /* ============ 5) ジャッキ・ギヤードモータ(JA075 i=1/7.67 + 0.4kW) ============
     移植元はねじ棒が伸びた形で、受け板(FL+725〜795)が下ロールの胴に食い込む(下端: 主 FL+600・ミニ FL+750)。
     ここではジャッキを下げた(ねじ棒を縮めた)位置で描き、受け板の上面を主ロール下側の下端より 120 下にする。
     本体(歯車箱)・連結軸・ギヤードモータは移植元の位置のまま。 */
  (function buildJack(){const p=G.jack,top=RY.mainLo-P.mainD/2-120,y0=330,y1=top-45;   // 受け板の上面 / ねじ棒の下端(本体の中)・上端(受け板の中)
    for(const [x,z] of [[-560,330],[560,330],[-560,-330],[560,-330]]){
      box(360,200,360,MM.gear,x,250,z,p);cylY(55,y1-y0,MM.chrome,x,(y0+y1)/2,z,p,20);box(260,70,260,MM.steelD,x,top-35,z,p);}
    cylX(40,1120,MM.steel,0,250,330,p,16);cylX(40,1120,MM.steel,0,250,-330,p,16);cylZ(40,660,MM.steel,-560,250,0,p,16);
    const gm=new T.Group();cylZ(180,380,MM.motor,0,0,0,gm,28);box(300,300,240,MM.gear,0,0,-300,gm);
    gm.position.set(-560,250,-640);p.add(gm);})();

  /* ============ 6) 架台(MD 区画の天端 = 据付面 FL・脚は GL まで)============
     移植元の架台(天板・縁梁・脚・根がらみ・端の斜材・フレーム脚の据付板)を、GL から FL までの高さ
     (MD_FL − GL = 712)に合わせて組む。平面は足場の開口 MD_PIT と同じ。色は足場と同じ緑、天板は縞鋼板。 */
  (function buildBase(){const p=G.base,H=Math.round((MD_FL-GL_Y)*1000),T0=140;
    const X0=-MD_PIT.z1*1000,X1=-MD_PIT.z0*1000,Z0=(MD_PIT.x0-MD_X)*1000,Z1=(MD_PIT.x1-MD_X)*1000;
    const W=X1-X0,D=Z1-Z0,cx=(X0+X1)/2,cz=(Z0+Z1)/2,y0=-H;                                 // y0 = GL
    {const g=new T.BoxGeometry(W,T0,D),uv=g.attributes.uv;                                 // 天板(縞鋼板・UV はメートル)
      for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*W/1000,uv.getY(i)*D/1000);
      mesh(g,M.stageDeck,cx,-T0/2,cz,p);}
    for(const k of [-1,1])box(W,180,90,M.stage,cx,-T0-90,cz+k*(D/2-45),p);                 // 縁梁
    for(const k of [-1,1])box(90,180,D-180,M.stage,cx+k*(W/2-45),-T0-90,cz,p);
    const legH=H-T0-180, legs=[X0+260,-400,1200,2300,3300,X1-260];
    for(const x of legs)for(const k of [-1,1]){const z=cz+k*(D/2-140);
      box(160,legH,160,M.stage,x,y0+legH/2,z,p);box(300,30,300,MM.steelD,x,y0+15,z,p);}
    for(const k of [-1,1])box(W-520,70,70,M.stage,cx,y0+300,cz+k*(D/2-140),p);            // 根がらみ
    for(const x of legs)box(70,70,D-280,M.stage,x,y0+300,cz,p);
    for(const k of [-1,1]){const x=k>0?X1-260:X0+260,br=box(60,Math.hypot(legH,D-280),60,M.stage,x,y0+legH/2,cz,p);br.rotation.x=Math.atan2(D-280,legH);}
    for(const s of [-1,1])for(const k of [-1,1])box(460,40,240,MM.steelD,s*1180,20,k*(P.frameZ/2-140),p);})();   // フレーム脚の据付板

  makeLabel("テンションスタンド(MD-1800)",MD_X,MD_FL+(P.frameH+330)/1000,0,{rank:6});      // 取付点 = 主ロール開閉シリンダの上
  return{root,G,setSwing,P};
})();
