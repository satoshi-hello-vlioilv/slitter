"use strict";
/* =========================================================
 * アンコイラ / リコイラ
 * =======================================================*/
/* 本体(駆動側 −Z)— 配置図の外形どおり。基礎は GL から立ち上げる(床の枠の外へ出る所があるため)
 *   b: {x0,x1,zB,zF} 本体の平面範囲 / hf: 主軸受ハウジングの前端 z */
function coilerBody(x,y,b,hf){
  const h=y+0.62,H=h-GL_Y;
  addBox(b.x1-b.x0,H,b.zF-b.zB,M.paint,(b.x0+b.x1)/2,GL_Y+H/2,(b.zB+b.zF)/2);
  addCylZ(0.42,hf-b.zF,M.paintDark,x,y,(b.zF+hf)/2,scene);                 // 主軸受ハウジング(本体前面から突き出す)
  return h;}
// 横に並ぶコイル置き台(スキッド)— 配置図でカー走行路の脇にある桟の列
function coilSkid(x0,x1,z0,z1){const w=x1-x0,cx=(x0+x1)/2,n=Math.round((z1-z0)/0.25);
  for(const s of [x0+0.05,x1-0.05])addBox(0.1,0.24,z1-z0,M.paintDark,s,0.12,(z0+z1)/2);
  for(let i=0;i<=n;i++)addBox(w,0.05,0.07,M.frame,cx,0.265,z0+(z1-z0)*i/n,scene,false);}
// アンコイラ: 本体 x −14.11〜−11.98・z −4.22〜−1.09(モーターは上に載る)
const uncGroup=(function(){
  const h=coilerBody(UNC_X,UNC_Y,{x0:-14.11,x1:-11.98,zB:-4.22,zF:-1.09},-0.79);
  addCylZ(0.26,1.39,M.paintDark,-13.65,h+0.26,-2.87,scene,20);            // 駆動モーター(本体上・軸 z)
  addBox(0.40,0.46,1.0,M.paintDark,-13.07,h+0.23,-3.66);                  // 減速機
  const g=new THREE.Group();g.position.set(UNC_X,UNC_Y,0);scene.add(g);
  addCylZ(R_MANDREL,2.32,rollMats(),0,0,0.09,g);                          // マンドレル(先端 z=1.25)
  const coil=addCylZ(1,1.2,coilMats(),0,0,0,g,48);
  spin(g,()=>st.ru,-1);
  // 外側支持(配置図: 上流側 x −14.95〜−13.59・z 0.64〜1.70 の台から軸をマンドレル先端 z=1.28 へ伸ばす)
  const sx=UNC_X-1.65,sz=1.28,arm=UNC_X-sx;                                 // 柱は床の縁(x −14.59)の内側
  addBox(0.6,0.22,0.6,M.frame,sx,0.11,sz);addBox(0.36,UNC_Y+0.45,0.36,M.paint,sx,(UNC_Y+0.45)/2,sz);
  addBox(arm,0.3,0.32,M.paint,sx+arm/2,UNC_Y,sz);addBox(0.52,0.62,0.30,M.paintDark,UNC_X,UNC_Y,sz);
  coilSkid(-14.26,-13.62,2.03,6.08);
  return{g,coil};})();

/* =========================================================
 * リコイラ — リール RD-1467(reel.js)+ ゴムスリーブ / スプール + 条毎のコイル
 * ---------------------------------------------------------
 * 部品はビューアと同じ mm・軸X の座標(mount)で組み、1/1000 にして X を −Z へ向ける:
 *   ハブ(駆動フランジ)は本体の主軸受ハウジングの中、ねじ端の外側軸受ジャーナルは
 *   リールサポート(スイング開閉式)の軸受の中に入る。ドラム中心 = ライン中心(z=0)。
 * 既定の段取り: φ508リール + 紙スプール(内径φ505 × 肉厚10・幅 = 製品幅)を条数分。
 * コイルは中空で、巻き始め径 = いちばん外の部品の外径(紙スプールなら φ525)。
 * スプール(鉄・紙管・ベーク)はコイルと一緒に払い出す。ゴムスリーブはリールに残る。
 * =======================================================*/
// 本体(配置図: x 12.96〜15.25・z −4.30〜−1.43)。主軸受ハウジングの前面は z=−0.87
// (ドラムのセグメント端 −0.855 の手前で止める)。奥のモーター台は床の枠の外(GL)に立つ
(function recoilerBody(x,y){
  const h=coilerBody(x,y,{x0:12.96,x1:15.25,zB:-4.30,zF:-1.43},-0.87);
  addCylZ(0.19,0.012,M.steel,x,y,-0.866,scene,40);            // 前面の軸受シール(カラー φ250 の外)
  addCylZ(0.27,1.12,M.paintDark,13.73,h+0.27,-3.47,scene,20);  // 主モーター(本体上・軸 z)
  addBox(1.03,1.1-GL_Y,0.71,M.paint,14.68,GL_Y+(1.1-GL_Y)/2,-4.655);   // 奥の駆動ユニット(GL 基礎)
  coilSkid(14.62,15.52,1.95,5.85);})(REC_X,REC_Y);
const recGroup=new THREE.Group();recGroup.position.set(REC_X,REC_Y,0);scene.add(recGroup);
spin(recGroup,()=>st.rr,-1);
// リールサポート(スイング開閉式) — コイルカーがラインに直角(+Z)から侵入できるよう、縦軸まわりに
// 横へ振り出して経路から退避する。支柱はカー走行帯(ピット x=REC_X±1.1)の外側(+X)。
// 先端の軸受箱はリールの外側軸受ジャーナル(φ220・z 0.93〜1.09)とねじ端を受ける。
const REC_SUP_X=REC_X+2.1, REC_SUP_Z=1.05, REC_ARM=REC_SUP_X-REC_X;   // 配置図: 下流側 x 14.6〜16.0 の台・軸心 z≈1.1
const recSupport=(function(){
  const h=REC_Y+0.45;
  addBox(0.36,h,0.36,M.paint,REC_SUP_X,h/2,REC_SUP_Z);       // 固定支柱(経路外)
  addBox(0.9,0.22,0.9,M.frame,REC_SUP_X,0.11,REC_SUP_Z);
  const piv=new THREE.Group(); piv.position.set(REC_SUP_X,0,REC_SUP_Z); scene.add(piv); // 縦軸ピボット
  addBox(REC_ARM,0.3,0.32,M.paint,-REC_ARM/2,REC_Y,0,piv);   // 水平アーム(-Xへ伸びリール端へ)
  addBox(0.52,0.62,0.30,M.paintDark,-REC_ARM,REC_Y,0.03,piv); // 軸受箱(前面 z=0.93 — セグメント端 0.855 の外)
  addCylZ(0.2,0.05,M.steel,-REC_ARM,REC_Y,0.205,piv,36);      // 軸受カバー(ねじ端の側)
  return piv;})();
const RCL=(function(){
  const cfg={reel:"D508",sleeve:false,spool:"paper",tubeID:505,tubeT:10,steelW:1200};
  const mount=new THREE.Group();mount.scale.setScalar(0.001);mount.rotation.y=Math.PI/2;recGroup.add(mount);  // mm・X → m・−Z
  const spoolG=new THREE.Group();mount.add(spoolG);          // 払い出すスプール(差し込み時は +Z からずらして入れる)
  const ring=REEL.coilRing(64);                              // 条のコイル(共通の形・巻径で書き換える)
  let fit=REEL.stack(cfg),drum=null,drumKey="",sleeve=null,spools=[],spoolGeo=new Map(),coils=[],out=null,exp=1;
  const xOf=z=>-z*1000;                                      // ライン z[m] → mount x[mm]
  const coreR=()=>fit.coreD/2000;
  function buildDrum(){if(drum&&drumKey===cfg.reel)return;
    if(drum){mount.remove(drum.group);drum.dispose();}
    drum=REEL.makeDrum(cfg.reel);drumKey=cfg.reel;mount.add(drum.group);}
  function buildSleeve(){if(sleeve){mount.remove(sleeve.group);sleeve.dispose();sleeve=null;}
    if(cfg.sleeve&&fit.sleeveRi!=null){sleeve=REEL.makeSleeve(fit.sleeveRi);mount.add(sleeve.group);}}
  function buildSpools(){
    for(const s of spools){spoolG.remove(s.group);s.dispose();}spools=[];
    for(const g of spoolGeo.values())g.dispose();spoolGeo=new Map();   // 同寸の管で共有した形(払出し分は out が持つ)
    spoolG.position.x=0;
    if(!fit.ok)return;
    if(cfg.spool==="steel"){const s=REEL.makeSteel(cfg.steelW);spoolG.add(s.group);spools.push(s);}
    else if(cfg.spool==="paper"||cfg.spool==="bake")
      for(let i=0;i<strandZ.length;i++){                     // 製品幅(=条幅)の管を条数分。隙間は条と同じ
        const s=REEL.makeTube(cfg.spool,Math.round((strandW[i]-STRAND_GAP)*1000),cfg.tubeID/2,cfg.tubeT,spoolGeo);
        s.group.position.x=xOf(strandZ[i]);spoolG.add(s.group);spools.push(s);}}
  function buildCoils(){for(const c of coils)recGroup.remove(c);coils=[];
    for(let i=0;i<strandZ.length;i++){const m=new THREE.Mesh(ring.geo,coilMats());
      m.scale.z=strandW[i]-STRAND_GAP;m.position.z=strandZ[i];m.castShadow=m.receiveShadow=true;recGroup.add(m);coils.push(m);}}
  /* 開度 t(0=閉 … 1=全開)。ゴムスリーブはドラムに合わせて縮む(半径方向の縮尺で近似) */
  function setExpand(t){exp=t;drum.setExpand(t);
    if(sleeve){const RS=fit.RS,wall=(REEL.SL.OD-REEL.SL.ID)/2,dr=(RS.D_CON+2*RS.ST_R*t)/2;
      const f=(Math.max(REEL.SL.ID/2,dr)+wall)/(fit.sleeveRi+wall);sleeve.group.scale.set(1,f,f);}}
  /* 段取りの変更(運転中でも即時)。まだ巻いていなければ新しい巻き始め径から、巻いていればその巻径のまま */
  function apply(){const empty=st.rr<=coreR()+0.0005;
    fit=REEL.stack(cfg);buildDrum();buildSleeve();buildSpools();setExpand(fit.expT);
    st.rr=empty?coreR():Math.max(st.rr,coreR());}
  function set(patch){Object.assign(cfg,patch);apply();}
  /* 毎フレーム: コイルの内径 = 巻き始め径、外径 = 巻径 */
  function update(){const r0=coreR(),r1=Math.max(st.rr,r0);ring.set(r0,r1);
    const on=r1-r0>0.0005;for(const c of coils)c.visible=on;}
  /* 払出し: コイル(その時の巻径で形を固定)とスプールをコイルカーのリフトへ移す。前の払出し分は搬出済みとして消す */
  function detach(cradle){clearOut();
    recGroup.updateMatrixWorld(true);cradle.updateMatrixWorld(true);
    const set=new THREE.Group();cradle.add(set);
    const geo=ring.geo.clone();
    for(const c of coils){c.geometry=geo;set.attach(c);}
    for(const s of spools)set.attach(s.group);
    out={set,geo,spools,spoolGeo};coils=[];spools=[];spoolGeo=new Map();
    buildCoils();}
  function clearOut(){if(!out)return;out.set.parent.remove(out.set);out.geo.dispose();
    for(const s of out.spools)s.dispose();for(const g of out.spoolGeo.values())g.dispose();out=null;}
  function rebuild(){buildSpools();buildCoils();}           // 条数・条幅が変わったとき
  buildDrum();buildSleeve();setExpand(fit.expT);
  return {cfg,set,update,rebuild,detach,clearOut,setExpand,coreR,
    loadSpools(){buildSpools();},                           // 新しいスプール(閉じたドラムに差し込む)
    setLoad(dz){spoolG.position.x=xOf(dz);},                // 差し込み途中(+Z へ dz ずれた位置)
    get fit(){return fit;},get exp(){return exp;},get spools(){return spools;},get drum(){return drum;},
    get sleeve(){return sleeve;},get coils(){return coils;},get out(){return out;}};
})();
st.rr=RCL.coreR();
function buildRecCoils(){RCL.rebuild();}

// コイルカー — ラインに直角(Z方向)に侵入。床下のピット(レール上面 CAR_Y)を走り、
// マンドレル上のコイルの下へ潜り込む。操作側(+Z)に待機。
// 配置図どおり入側(アンコイラ)・出側(リコイラ)の両方に設け、同じ構造を使う。
// Vスキッドはリフト(cradle)に載り、コイル下面まで上がってコイルを受ける。
// 出側は V を駆動側(−Z)へ寄せて、ピット端(z=−0.75)の手前でも全条のコイルの下に届くようにする。
const CAR_PARK=4.9, CAR_IN=0.35;                              // 待機位置は配置図のカー(z 3.9〜5.9)
// V の見かけの頂点(ライナー上面の2平面が中心線で交わる高さ・カー基準)/ ランプ角。
// ライナー: 中心 (±0.40, 0.95)・厚さ 0.04・傾き CAR_VANG → 頂点 = 0.95 + 0.02/cos − 0.40·tan
const CAR_VANG=0.72, CAR_V0=0.95+0.02/Math.cos(CAR_VANG)-0.40*Math.tan(CAR_VANG);
const carLift=r=>Math.max(0,REC_Y-CAR_Y-CAR_V0-r/Math.cos(CAR_VANG));   // 半径 r のコイル下面まで上げる量
function buildCoilCar(x,zPark,coilR,z0,z1,vOfs){
  for(const s of [-1,1])addBox(0.12,0.06,z1-z0,M.frame,x+s*0.62,CAR_Y-0.03,(z0+z1)/2,scene,false); // レール(Z方向・ピット底)
  const g=new THREE.Group();g.position.set(x,CAR_Y,zPark);scene.add(g);
  addBox(1.6,0.34,1.7,M.yellow,0,0.3,0,g);                                       // 台車デッキ
  for(const [wx,wz] of [[-0.58,0.72],[0.58,0.72],[-0.58,-0.72],[0.58,-0.72]]){   // 車輪(軸X)
    const w=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.1,18),M.frame);
    w.position.set(wx,0.13,wz);w.rotation.z=Math.PI/2;g.add(w);}
  const cradle=new THREE.Group();cradle.position.z=vOfs||0;g.add(cradle);g.cradle=cradle;
  addBox(0.44,1.3,0.44,M.steel,0,-0.2,0,cradle);                                 // リフトの昇降柱(最大リフトでも下端はデッキ内)
  // Vスキッド: 溝はコイル軸(Z)に平行。X-Y断面がV字となる傾斜パッド2枚で Z軸コイルを長手方向に受ける。
  const vlen=1.5;
  const mkPad=(sx,rz,mat,ty,th)=>{const p=addBox(1.0,th,vlen,mat,sx,0.55+ty,0,cradle);p.rotation.z=rz;return p;};
  mkPad(-0.42,-CAR_VANG,M.paintDark,0.36,0.12);   // 左ランプ(\)
  mkPad( 0.42, CAR_VANG,M.paintDark,0.36,0.12);   // 右ランプ(/)
  mkPad(-0.40,-CAR_VANG,M.rubber,   0.40,0.04);   // ライナー(摩耗材)
  mkPad( 0.40, CAR_VANG,M.rubber,   0.40,0.04);
  addBox(0.18,0.16,vlen,M.frame,0,CAR_V0-0.008,0,cradle);                        // V底のストッパ/受け(コイルには触れない)
  // 端の当て(低い): 高くすると細いコイルを受けたとき(リフト大)にリールのドラムへ当たる
  for(const s of [-1,1])addBox(0.9,0.07,0.05,M.paintDark,0,0.665,s*(vlen/2+0.025),cradle);
  // 次コイル(入側の待機台車): Vの両面に接する高さ = V底 + r/cos(ランプ角)
  if(coilR){const c=addCylZ(coilR,STRIP_W,coilMats(),0,CAR_V0+coilR/Math.cos(CAR_VANG),0,cradle,40);c.receiveShadow=true;}
  return g;}
const coilCar=buildCoilCar(REC_X,CAR_PARK,0,CAR_PITS[1].z0,CAR_PITS[1].z1,-0.2); // 出側: 巻上りコイルの払出し(交換時に走行)
const uncCar=buildCoilCar(UNC_X,5.6,0.95,CAR_PITS[0].z0,CAR_PITS[0].z1,0);      // 入側: 次コイルを載せて待機
