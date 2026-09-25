"use strict";
/* =========================================================
 * アンコイラ / リコイラ
 * =======================================================*/
// 本体(駆動側 −Z)。ベースはコイルカーピットの縁(z=−0.75)より奥に収める
function coilerBody(x,y){
  const h=y+0.62;
  addBox(1.7,h,1.4,M.paint,x,h/2,-1.55);
  addBox(2.2,0.26,1.6,M.paintDark,x,0.13,-1.6);
  addCylZ(0.42,0.62,M.paintDark,x,y,-1.1,scene);}
const uncGroup=(function(){
  coilerBody(UNC_X,UNC_Y);
  const g=new THREE.Group();g.position.set(UNC_X,UNC_Y,0);scene.add(g);
  addCylZ(R_MANDREL,2.0,rollMats(),0,0,-0.07,g);
  const coil=addCylZ(1,1.2,coilMats(),0,0,0,g,48);
  spin(g,()=>st.ru,-1);return{g,coil};})();

const recGroup=new THREE.Group();recGroup.position.set(REC_X,REC_Y,0);scene.add(recGroup);
spin(recGroup,()=>st.rr,-1);
let recCoils=[];
(function(){
  coilerBody(REC_X,REC_Y);
  addCylZ(R_MANDREL,2.0,rollMats(),0,0,-0.07,recGroup);})();
// リールサポート(スイング開閉式) — リコイラはZ軸巻取りのまま。コイルカーが
// ラインに直角(+Z)から侵入できるよう、縦軸まわりに横へ振り出して経路から退避する。
// 支柱はカー走行帯(ピット x=REC_X±1.1)の外側(+X)に置く。
const REC_SUP_X=REC_X+1.6, REC_SUP_Z=1.0, REC_ARM=REC_SUP_X-REC_X;
const recSupport=(function(){
  const h=REC_Y+0.45;
  addBox(0.36,h,0.36,M.paint,REC_SUP_X,h/2,REC_SUP_Z);       // 固定支柱(経路外)
  addBox(0.9,0.22,0.9,M.frame,REC_SUP_X,0.11,REC_SUP_Z);
  const piv=new THREE.Group(); piv.position.set(REC_SUP_X,0,REC_SUP_Z); scene.add(piv); // 縦軸ピボット
  addBox(REC_ARM,0.3,0.32,M.paint,-REC_ARM/2,REC_Y,0,piv);   // 水平アーム(-Xへ伸びマンドレル端へ)
  addBox(0.52,0.62,0.36,M.paintDark,-REC_ARM,REC_Y,0,piv);    // 軸受箱
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.07,12,28),M.paintDark);  // マンドレル端を受ける(軸Z)
  ring.position.set(-REC_ARM,REC_Y,0);ring.castShadow=true;piv.add(ring);
  return piv;})();
function buildRecCoils(){for(const c of recCoils){c.geometry.dispose();recGroup.remove(c);}recCoils=[];
  for(let i=0;i<strandZ.length;i++)
    recCoils.push(addCylZ(1,strandW[i]-STRAND_GAP,coilMats(),0,0,strandZ[i],recGroup,40));}
// コイルカー — ラインに直角(Z方向)に侵入。床下のピット(レール上面 CAR_Y)を走り、
// マンドレル上のコイルの下へ潜り込む。操作側(+Z)に待機。
// 配置図どおり入側(アンコイラ)・出側(リコイラ)の両方に設け、同じ構造を使う。
const CAR_PARK=5.4, CAR_IN=0.3;   // 侵入後はコイル直下(z≈0)へ
function buildCoilCar(x,zPark,coilR,z0,z1){
  for(const s of [-1,1])addBox(0.12,0.06,z1-z0,M.frame,x+s*0.62,CAR_Y-0.03,(z0+z1)/2,scene,false); // レール(Z方向・ピット底)
  const g=new THREE.Group();g.position.set(x,CAR_Y,zPark);scene.add(g);
  addBox(1.6,0.34,1.7,M.yellow,0,0.3,0,g);                                       // 台車デッキ
  for(const [wx,wz] of [[-0.58,0.72],[0.58,0.72],[-0.58,-0.72],[0.58,-0.72]]){   // 車輪(軸X)
    const w=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.1,18),M.frame);
    w.position.set(wx,0.13,wz);w.rotation.z=Math.PI/2;g.add(w);}
  // Vスキッド: 溝はコイル軸(Z)に平行。X-Y断面がV字となる傾斜パッド2枚で
  //           Z軸コイルを長手方向に受ける。
  const ang=0.72, vlen=1.45;
  const mkPad=(sx,rz,mat,ty,th)=>{const p=addBox(1.0,th,vlen,mat,sx,0.55+ty,0,g);p.rotation.z=rz;return p;};
  mkPad(-0.42, -ang, M.paintDark,0.36,0.12);   // 左ランプ(\)
  mkPad( 0.42,  ang, M.paintDark,0.36,0.12);    // 右ランプ(/)
  mkPad(-0.40, -ang, M.rubber,   0.40,0.04);    // ライナー(摩耗材)
  mkPad( 0.40,  ang, M.rubber,   0.40,0.04);
  // V底のストッパ/受け
  addBox(0.18,0.16,vlen,M.frame,0,0.62,0,g);
  // 端板(コイル脱落防止)
  addBox(0.9,0.5,0.06,M.paintDark,0,0.95,-(vlen/2+0.03),g);
  addBox(0.9,0.5,0.06,M.paintDark,0,0.95, (vlen/2+0.03),g);
  // 次コイル(入側の待機台車): Vの両面に接する高さ = V底 + r/cos(ランプ角)
  if(coilR){const c=addCylZ(coilR,STRIP_W,coilMats(),0,0.62+coilR/Math.cos(ang),0,g,40);c.receiveShadow=true;}
  return g;}
const coilCar=buildCoilCar(REC_X,CAR_PARK,0,CAR_PITS[1].z0,CAR_PITS[1].z1);   // 出側: 巻上りコイルの払出し(交換時に走行)
const uncCar=buildCoilCar(UNC_X,4.2,0.95,CAR_PITS[0].z0,CAR_PITS[0].z1);     // 入側: 次コイルを載せて待機
