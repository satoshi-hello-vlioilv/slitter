"use strict";
/* =========================================================
 * 状態機械・アニメーション
 * =======================================================*/
function easeIO(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
/* =========================================================
 * コイル交換(t=経過秒・終わったら true)。all=false は出側の払出しだけ
 * (刃替えの前に巻上りコイルを降ろす/巻取りコイルの手動払出し — アンコイラはそのまま)。
 * 実機の順:
 *   帯板があれば出側ピンチ(X1)で切る(後端はコイルへ巻き込む)→ リールサポート振出し
 *   → コイルカー侵入 → リフトをコイル下面まで上げる → ドラムを閉じて把持を解く
 *   → コイルをスプールごと +Z へ抜き取る → 新しいスプールを自由端から差し込む
 *   → ドラムを開いてスプールを把持 → サポート復帰 → 先端を X1 からスプールまで通す
 * 払い出したコイルは次の交換までカーの上に残る(クレーンで搬出した扱いで次の交換の頭に消す)。
 * =======================================================*/
const CSW={open:0.8,carIn:2.0,lift:2.6,collapse:3.2,carOut:4.8,load:6.0,grip:6.5,close:7.3};
const csw={t:Infinity,lift:0,prevLift:0,cut:false,out:false,load:false};
function coilSwap(t,all){
  if(t<csw.t){                                              // 新しい交換
    csw.prevLift=coilCar.cradle.position.y;csw.lift=carLift(st.rr);
    csw.cut=!!st.thread;csw.out=false;csw.load=false;RCL.clearOut();
    exitCut.on=csw.cut;exitCut.head=0;exitCut.threading=false;}
  csw.t=t;
  const OPEN=Math.PI/2,K=(a,b)=>easeIO(THREE.MathUtils.clamp((t-a)/(b-a),0,1));
  recSupport.rotation.y=OPEN*(K(0,CSW.open)-K(CSW.grip,CSW.close));                          // サポート 開 → 閉
  coilCar.position.z=THREE.MathUtils.lerp(CAR_PARK,CAR_IN,K(CSW.open,CSW.carIn)-K(CSW.collapse,CSW.carOut)); // カー 侵入 → 退出
  coilCar.cradle.position.y=csw.prevLift*(1-K(0,CSW.open))+csw.lift*K(CSW.carIn,CSW.lift);   // リフト(載せたまま退出)
  const g=RCL.fit.expT;
  RCL.setExpand(g*(1-K(CSW.lift,CSW.collapse))+g*K(CSW.load,CSW.grip));                     // ドラム 閉 → (差し込み)→ 開
  if(!csw.out&&t>=CSW.collapse){csw.out=true;RCL.detach(coilCar.cradle);                    // コイル+スプールをカーへ
    if(all){st.ru=RU_MAX;st.rsL=0.13;st.rsR=0.13;}st.rr=RCL.coreR();st.lenCoil=0;st.swapped=true;}
  if(!csw.load&&t>=CSW.carOut){csw.load=true;RCL.loadSpools();}                             // 新しいスプール
  if(csw.load)RCL.setLoad(1.9*(1-K(CSW.carOut,CSW.load)));                                   // 自由端(+Z)から差し込む
  if(t<CSW.close)return false;
  if(csw.cut){exitCut.threading=true;exitCut.head=(t-CSW.close)*THREAD_V;                   // 先端を X1 からスプールへ
    if(exitCut.head<exitCut.need)return false;}
  exitCut.on=false;exitCut.threading=false;csw.t=Infinity;return true;}
function stepLine(dt){const tgt=(st.paused||st.state!=="RUN"||!st.thread)?0:st.target;
  st.v+=THREE.MathUtils.clamp(tgt-st.v,-DECEL*dt,ACCEL*dt);if(Math.abs(st.v)<0.004&&tgt===0)st.v=0;
  if(st.v>0){st.len+=st.v*dt;st.lenCoil+=st.v*dt;
    st.ru=Math.max(RU_MIN-0.01,st.ru-st.v*H_VIS/(2*Math.PI*st.ru)*dt);
    st.rr=Math.min(RR_MAX+0.01,st.rr+st.v*H_VIS/(2*Math.PI*st.rr)*dt);
    const ds=st.v*0.004/(2*Math.PI);st.rsR=Math.min(0.42,st.rsR+ds/st.rsR*dt);st.rsL=Math.min(0.42,st.rsL+ds/st.rsL*dt);
    st.texOfs-=st.v*dt/UV_SCALE;stripTex.offset.x=st.texOfs;}
  // 母材が尽きたら両方、巻取りだけ満巻きならリコイラだけ替える
  if(st.state==="RUN"&&(st.ru<=RU_MIN||st.rr>=RR_MAX)){st.state="DECEL";st.changeAll=st.ru<=RU_MIN;}
  if(st.state==="DECEL"&&st.v<=0.004){st.state="CHANGE";st.tChange=0;st.swapped=false;}
  if(st.state==="CHANGE"){st.tChange+=dt;if(coilSwap(st.tChange,st.changeAll))st.state="RUN";}
  // ルーパーテーブル開閉: 開度0-0.35でテーブルが先に退避し、その後ループが成長する
  // (閉じる際は逆順: ループが縮んでからテーブルが戻る) — 帯板とテーブルの干渉を防ぐ
  const dl=dt*0.45;
  st.loop1+=THREE.MathUtils.clamp(st.loop1Tgt-st.loop1,-dl,dl);
  st.loop2+=THREE.MathUtils.clamp(st.loop2Tgt-st.loop2,-dl,dl);
  looperTable1.setOpen(st.loop1/0.35);
  looperTable2.setOpen(st.loop2/0.35);
  // カッター台車の段取り(ライン停止 → 抜取り → 継手 → ①②③ / 逆順)。状態機械は knifechange.js
  KX.step(dt);}
/* バリは細いので、カメラが条の近く(スリッター〜リコイラの帯から 6m 以内)にいるときだけ描く */
const _cb=new THREE.Box3(new THREE.Vector3(SLIT_X-0.4,PL-3.6,-0.8),new THREE.Vector3(REC_X+1.2,PL+1.4,0.8));
function updateGeometry(){
  MECH.update(1/60);geoFrame++;headInfo.on=false;stressView.max=0;stressView.maxU=0;
  lipsNear=_cb.distanceToPoint(camera.position)<6;
  uncGroup.coil.scale.set(st.ru,st.ru,1);RCL.update();       // リコイラのコイル: 内径=巻き始め径・外径=巻径
  scrapR.coil.scale.set(st.rsR,1,st.rsR);scrapL.coil.scale.set(st.rsL,1,st.rsL); // 屑コイルは軸=Y(立軸)
  thread.need=0;exitCut.need=0;                   // 通板・抜取りの終わり(最も長い帯の末端)を測り直す
  updateEntryRibbon();
  for(let i=0;i<strandRibbons.length;i++)updateStrandRibbon(strandRibbons[i],strandZ[i],i);
  updateTrim(trimRibbonR,scrapR,st.rsR);updateTrim(trimRibbonL,scrapL,st.rsL);}
// 通板・抜取り中は帯板が寸動速度で走るので、ロール類もその速度で回す(抜取り中は入側が止まっている)
// コイル交換の後の通し直し(X1 → スプール)も、帯が寸動速度で走るのでロールを回す
function updateSpinners(dt){const vt=(thread.mode||exitCut.threading)?THREAD_V:0,v=Math.max(st.v,vt);if(v<=0)return;
  for(const s of spinners){if(thread.mode==="out"&&s.obj===uncGroup.g)continue;
    const r=(typeof s.r==="function")?s.r():s.r;s.obj.rotation[s.axis]+=s.dir*(v/r)*dt;}}
let uiT=0;
function updateHUD(dt){uiT+=dt;if(uiT<0.12)return;uiT=0;
  ui.roSpeed.textContent=Math.round(st.v*60);ui.roUnc.textContent=Math.round(st.ru*2000);ui.roRec.textContent=Math.round(st.rr*2000);
  // 巻取張力(全条)= 単位張力 × 条幅の合計 × 板厚。巻き付いている間は止まっていても掛かっている
  ui.roTen.textContent=(MECH.tau("wind")*strandW.reduce((a,w)=>a+w,0)/1000).toFixed(2);ui.roLen.textContent=Math.round(st.len).toLocaleString();
  // 条間のループ深さ差(最長条 − 最短条) — 巻き進むほど開いていく
  const eMax=strandEps.length?Math.max.apply(null,strandEps):0;
  const dDif=loopDepth(LOOP2,st.loop2,eMax*st.lenCoil*lenScale())-loopDepth(LOOP2,st.loop2,0);
  ui.roLoopDiff.textContent=Math.round(dDif*1000);
  const prog=THREE.MathUtils.clamp((RU_MAX*RU_MAX-st.ru*st.ru)/(RU_MAX*RU_MAX-RU_MIN*RU_MIN),0,1);
  ui.roProg.textContent=Math.round(prog*100);ui.prog.style.width=(prog*100).toFixed(1)+"%";
  let text,cls;const tgt=(st.paused||st.state!=="RUN")?0:st.target;
  if(st.state==="KNIFE"){text="刃替え段取り中 ─ "+(KX.label||KX.where());cls="info";}
  else if(st.state==="CHANGE"){text="コイル交換中";cls="info";}else if(st.state==="DECEL"){text="コイル交換準備 ─ 減速中";cls="warn";}
  else if(st.paused&&st.v<=0.004){text="ライン停止";cls="stop";}else if(st.v<tgt-0.01){text="加速中";cls="warn";}
  else if(st.v>tgt+0.01){text="減速中";cls="warn";}else if(st.v>0.004){text="定常運転中";cls="ok";}else{text="ライン停止";cls="stop";}
  if(st.state==="RUN"&&KX.label)text+=" ─ 段取り: "+KX.label;              // 運転を続けたまま待機台車を組み替えている間
  ui.status.textContent=text;ui.led.className="led "+cls;
  syncKnifeUI();rclUI.sync();mechUI.sync(false,0.12);}
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),0.05);
  stepLine(dt);updateSpinners(dt);updateGeometry();updateHUD(dt);controls.update(dt);renderer.render(scene,camera);
  LBL.update(dt);}                                  // 札は描画後のカメラで置く
window.addEventListener("resize",()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
window.addEventListener("keydown",e=>{if(e.code==="Space"&&document.activeElement.tagName!=="INPUT"){e.preventDefault();ui.btnRun.click();}});
animate();
