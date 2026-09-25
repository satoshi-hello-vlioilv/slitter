"use strict";
/* =========================================================
 * 工場床・ピット・建屋
 * =======================================================*/
const buildingGroup=new THREE.Group(); scene.add(buildingGroup);   // 建屋柱・梁(トグル対象)
(function buildFactory(){
  const T=0.12, FD=9;                     // 床スラブ厚 / 床の半奥行き
  // 床は1枚のスラブに開口を抜く(ルーパーピット・コイルカーピット・回転テーブルのピット)。
  // 形は平面(x,z)で描き、押し出してから寝かせる(形のy = −z)。
  const rect=(x0,z0,x1,z1)=>{const p=new THREE.Path();p.moveTo(x0,-z0);p.lineTo(x1,-z0);p.lineTo(x1,-z1);p.lineTo(x0,-z1);p.closePath();return p;};
  const outline=new THREE.Shape();
  outline.moveTo(FAC_X0,FD);outline.lineTo(FAC_X1,FD);outline.lineTo(FAC_X1,-FD);outline.lineTo(FAC_X0,-FD);outline.closePath();
  for(const p of [PIT1,PIT2])outline.holes.push(rect(p.x0,-PIT_HZ,p.x1,PIT_HZ));
  for(const c of CAR_PITS)outline.holes.push(rect(c.x-CAR_PIT_HW,c.z0,c.x+CAR_PIT_HW,c.z1));
  {const h=new THREE.Path();h.absarc(SLIT_X,-KC_TT_Z,KC_PIT_R,0,Math.PI*2,true);outline.holes.push(h);}
  const sg=new THREE.ExtrudeGeometry(outline,{depth:T,bevelEnabled:false,curveSegments:72});
  sg.rotateX(-Math.PI/2);sg.translate(0,-T,0);
  const ftex=concreteTex(1/2.2,1/2.2);                 // UV=床の座標[m] → 2.2mに1枚
  const floor=new THREE.Mesh(sg,new THREE.MeshStandardMaterial({map:ftex,metalness:0.05,roughness:0.92}));
  floor.receiveShadow=true;scene.add(floor);
  // ルーパーピット — 側壁の内面/端壁の内面が、そのまま床の開口端になる(RC躯体と同じ納まり)
  const PH=-PIT_FLOOR+0.05;                           // 壁の高さ(床上面 → ピット床の下面)
  for(const p of [PIT1,PIT2]){
    const w=p.x1-p.x0,cx=(p.x0+p.x1)/2;
    for(const sgn of [-1,1])addBox(w,PH,0.1,M.pit,cx,-PH/2,sgn*(PIT_HZ+0.05));
    addBox(0.1,PH,2*PIT_HZ,M.pit,p.x0-0.05,-PH/2,0);addBox(0.1,PH,2*PIT_HZ,M.pit,p.x1+0.05,-PH/2,0);
    addBox(w,0.1,2*PIT_HZ,M.pit,cx,PIT_FLOOR-0.05,0,scene,false).receiveShadow=true;
    for(const sgn of [-1,1])addBox(w+0.3,0.022,0.14,M.hazard,cx,0.012,sgn*(PIT_HZ+0.11));  // 開口縁の注意帯(床上)
  }
  // コイルカーピット(カーはピット底のレールを走り、コイルの下へ潜り込む)
  for(const c of CAR_PITS){const w=2*CAR_PIT_HW,L=c.z1-c.z0,cz=(c.z0+c.z1)/2,D=CAR_PIT_D;
    for(const s of [-1,1])addBox(0.1,D,L,M.pit,c.x+s*(CAR_PIT_HW+0.05),-D/2,cz);
    for(const z of [c.z0-0.05,c.z1+0.05])addBox(w+0.2,D,0.1,M.pit,c.x,-D/2,z);
    addBox(w,0.1,L,M.pit,c.x,-D-0.05,cz,scene,false).receiveShadow=true;
    for(const s of [-1,1])addBox(0.14,0.022,L+0.3,M.hazard,c.x+s*(CAR_PIT_HW+0.11),0.012,cz);}
  const FW=FAC_X1-FAC_X0, FC=(FAC_X0+FAC_X1)/2;
  // 通路区画線(出側コイルカーのピットで途切れさせない — ピットは区画線の手前で止まる)
  for(const z of [6.4,-6.4])addBox(FW,0.012,0.12,M.yellow,FC,0.011,z,scene,false);
  // 建屋柱・梁(半透明・トグルで消去可) — 照明本体は残す
  for(let x=FAC_X0+2;x<=FAC_X1-2;x+=7){addBox(0.5,9,0.5,M.frameGlass,x,4.5,-8.6,buildingGroup,false);addBox(0.5,9,0.5,M.frameGlass,x,4.5,8.6,buildingGroup,false);}
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
function buildConsole(cx,cz){
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
  const desk=new THREE.Group();desk.position.set(cx,0,cz);scene.add(desk);
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
buildConsole(-10.1,2.45);
buildConsole(9.85,2.55);

/* =========================================================
 * 油圧ユニット(配置図の4基 — 反操作側 −Z)
 * タンク+電動ポンプ+ヒートエクスチェンジャ+配管立上り
 * =======================================================*/
(function buildHydraulicUnits(){
  const units=[[-3.3,-5.0,1.5,1.0],[2.4,-5.0,1.5,1.0],[10.1,-3.9,0.7,0.6],[11.4,-4.7,0.9,0.9]];
  for(const [x,z,w,d] of units){
    addBox(w+0.1,0.08,d+0.1,M.frame,x,0.04,z,scene,false);            // ベース
    addBox(w,0.75,d,M.paint,x,0.47,z);                                // 油タンク
    addCylY(Math.min(w,d)*0.2,Math.min(w,d)*0.55,M.paintDark,x-w*0.25,0.85+Math.min(w,d)*0.275,z,scene,16);  // モーター(縦形)
    addBox(w*0.28,0.22,d*0.35,M.steel,x+w*0.22,0.96,z);               // ポンプ・弁ブロック
    addCylY(0.03,1.2,M.steel,x+w*0.3,1.45,z+d*0.3,scene,8);          // 配管立上り
    makeLabel("油圧ユニット",x,1.75,z);
  }
})();

