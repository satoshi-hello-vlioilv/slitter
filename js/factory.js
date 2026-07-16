"use strict";
/* =========================================================
 * 工場床・ピット・建屋
 * =======================================================*/
const buildingGroup=new THREE.Group(); scene.add(buildingGroup);   // 建屋柱・梁(トグル対象)
(function buildFactory(){
  const floorY=-0.06,T=0.12;
  // 床(ピット開口を避けて分割)
  const segs=[
    {w:PIT1.x0-(-36)+0.0, x:(-36+PIT1.x0)/2-0.0, d:18},
    {w:PIT2.x0-PIT1.x1, x:(PIT1.x1+PIT2.x0)/2, d:18},
    {w:30-PIT2.x1, x:(PIT2.x1+30)/2, d:18},
  ];
  for(const s of segs){const mat=new THREE.MeshStandardMaterial({map:concreteTex(Math.max(2,s.w/2.2),8),metalness:0.05,roughness:0.92});
    const m=addBox(s.w,T,s.d,mat,s.x,floorY,0,scene,false);m.receiveShadow=true;}
  // ピット北/南床
  for(const p of [PIT1,PIT2]){
    const w=p.x1-p.x0,cx=(p.x0+p.x1)/2;
    for(const z of [-5.6,5.6]){const mat=new THREE.MeshStandardMaterial({map:concreteTex(w/2.2,3),metalness:0.05,roughness:0.92});
      addBox(w,T,7,mat,cx,floorY,z,scene,false).receiveShadow=true;}
    // ピット壁・底
    addBox(w,2.4,0.1,M.pit,cx,-1.2,-1.05);addBox(w,2.4,0.1,M.pit,cx,-1.2,1.05);
    addBox(0.1,2.4,2.1,M.pit,p.x0-0.05,-1.2,0);addBox(0.1,2.4,2.1,M.pit,p.x1+0.05,-1.2,0);
    addBox(w,0.1,2.1,M.pit,cx,-2.4,0,scene,false).receiveShadow=true;
    addBox(w+0.3,0.022,0.14,M.hazard,cx,0.012,-1.06);addBox(w+0.3,0.022,0.14,M.hazard,cx,0.012,1.06);
  }
  // 通路区画線
  addBox(70,0.012,0.12,M.yellow,-3,0.011,6.4,scene,false);
  addBox(70,0.012,0.12,M.yellow,-3,0.011,-6.4,scene,false);
  // 建屋柱・梁(半透明・トグルで消去可) — 照明本体は残す
  for(let x=-34;x<=28;x+=8){addBox(0.5,9,0.5,M.frameGlass,x,4.5,-8.6,buildingGroup,false);addBox(0.5,9,0.5,M.frameGlass,x,4.5,8.6,buildingGroup,false);}
  addBox(70,0.5,0.4,M.frameGlass,-3,9.1,-8.6,buildingGroup,false);addBox(70,0.5,0.4,M.frameGlass,-3,9.1,8.6,buildingGroup,false);
  for(let x=-32;x<=28;x+=6) for(const z of [-4,4]){addBox(2.4,0.16,0.9,M.frameGlass,x,8.7,z,buildingGroup,false);
    addBox(2.1,0.05,0.66,M.lampLit,x,8.6,z,scene,false).castShadow=false;
    const pl=new THREE.PointLight(0xfff2dc,0.22,20,2.0);pl.position.set(x,8.3,z);scene.add(pl);}
})();

/* =========================================================
 * 操作盤(オペレータコンソール)
 * =======================================================*/
(function buildConsole(){
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
  const desk=new THREE.Group();desk.position.set(-5.5,0,5.3);scene.add(desk);
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
})();
