"use strict";
/* =========================================================
 * アンコイラ / リコイラ
 * =======================================================*/
const uncGroup=(function(){
  addBox(1.7,1.9,1.4,M.paint,UNC_X,0.95,-1.5);
  addBox(2.2,0.26,1.9,M.paintDark,UNC_X,0.13,-1.45);
  addCylZ(0.42,0.62,M.paintDark,UNC_X,UNC_Y,-1.1,scene);
  // コイルサドル(V受台)
  const sd=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.5,1.6),M.frame);sd.position.set(UNC_X,0.1,0.4);scene.add(sd);
  const g=new THREE.Group();g.position.set(UNC_X,UNC_Y,0);scene.add(g);
  addCylZ(R_MANDREL,2.0,rollMats(),0,0,-0.07,g);
  const coil=addCylZ(1,1.2,coilMats(),0,0,0,g,48);
  spin(g,()=>st.ru,-1);return{g,coil};})();

const recGroup=new THREE.Group();recGroup.position.set(REC_X,REC_Y,0);scene.add(recGroup);
spin(recGroup,()=>st.rr,-1);
let recCoils=[];
(function(){
  addBox(1.7,1.9,1.4,M.paint,REC_X,0.95,-1.5);
  addBox(2.2,0.26,1.9,M.paintDark,REC_X,0.13,-1.45);
  addCylZ(0.42,0.62,M.paintDark,REC_X,REC_Y,-1.1,scene);
  addCylZ(R_MANDREL,2.0,rollMats(),0,0,-0.07,recGroup);})();
// リールサポート(スイング開閉式) — リコイラはZ軸巻取りのまま。コイルカーが
// ラインに直角(+Z)から侵入できるよう、縦軸まわりに横へ振り出して経路から退避する。
// 支柱はカー走行帯(x=REC_X±0.8)の外側(+X)に置く。
const REC_SUP_X=REC_X+1.5, REC_SUP_Z=1.0;
const recSupport=(function(){
  addBox(0.36,2.7,0.36,M.paint,REC_SUP_X,1.35,REC_SUP_Z);    // 固定支柱(経路外)
  addBox(0.9,0.22,0.9,M.frame,REC_SUP_X,0.11,REC_SUP_Z);
  const piv=new THREE.Group(); piv.position.set(REC_SUP_X,0,REC_SUP_Z); scene.add(piv); // 縦軸ピボット
  addBox(1.5,0.3,0.32,M.paint,-0.75,REC_Y,0,piv);            // 水平アーム(-Xへ伸びマンドレル端へ)
  addBox(0.52,0.62,0.36,M.paintDark,-1.5,REC_Y,0,piv);       // 軸受箱
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.07,12,28),M.paintDark);  // マンドレル端を受ける(軸Z)
  ring.position.set(-1.5,REC_Y,0);ring.castShadow=true;piv.add(ring);
  return piv;})();
function buildRecCoils(N){for(const c of recCoils){c.geometry.dispose();recGroup.remove(c);}recCoils=[];
  const sw=EFF_W/N;for(let i=0;i<N;i++){const zc=-EFF_W/2+(i+0.5)*sw;
    recCoils.push(addCylZ(1,sw-0.014,coilMats(),0,0,zc,recGroup,40));}}
// コイルカー — ラインに直角(Z方向)に侵入。レールはZ方向。操作側(+Z)に待機。
const CAR_PARK=5.4, CAR_IN=0.3;   // 侵入後はコイル直下(z≈0)へ
const coilCar=(function(){
  addBox(0.12,0.06,7.0,M.frame,REC_X-0.62,0.03,3.2,scene,false);   // レール(Z方向)
  addBox(0.12,0.06,7.0,M.frame,REC_X+0.62,0.03,3.2,scene,false);
  const g=new THREE.Group();g.position.set(REC_X,0,CAR_PARK);scene.add(g);
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
  return g;})();
