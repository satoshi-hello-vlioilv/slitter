"use strict";
/* =========================================================
 * 状態機械・アニメーション
 * =======================================================*/
function easeIO(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}
function stepLine(dt){const tgt=(st.paused||st.state!=="RUN")?0:st.target;
  st.v+=THREE.MathUtils.clamp(tgt-st.v,-DECEL*dt,ACCEL*dt);if(Math.abs(st.v)<0.004&&tgt===0)st.v=0;
  if(st.v>0){st.len+=st.v*dt;
    st.ru=Math.max(RU_MIN-0.01,st.ru-st.v*H_VIS/(2*Math.PI*st.ru)*dt);
    st.rr=Math.min(RR_MAX+0.01,st.rr+st.v*H_VIS/(2*Math.PI*st.rr)*dt);
    const ds=st.v*0.004/(2*Math.PI);st.rsR=Math.min(0.42,st.rsR+ds/st.rsR*dt);st.rsL=Math.min(0.42,st.rsL+ds/st.rsL*dt);
    st.texOfs-=st.v*dt/UV_SCALE;stripTex.offset.x=st.texOfs;}
  if(st.state==="RUN"&&(st.ru<=RU_MIN||st.rr>=RR_MAX))st.state="DECEL";
  if(st.state==="DECEL"&&st.v<=0.004){st.state="CHANGE";st.tChange=0;st.swapped=false;}
  if(st.state==="CHANGE"){st.tChange+=dt;const t=st.tChange;
    const OPEN=Math.PI/2;  // リールサポート振出し角(縦軸まわり・経路外へ退避)
    if(t<0.8){recSupport.rotation.y=OPEN*easeIO(t/0.8);}                                   // サポート振出し
    else if(t<2.0){recSupport.rotation.y=OPEN;coilCar.position.z=THREE.MathUtils.lerp(CAR_PARK,CAR_IN,easeIO((t-0.8)/1.2));} // カー直角侵入(コイル下へ)
    else if(t<2.8){coilCar.position.z=CAR_IN;if(!st.swapped&&t>2.3){st.ru=RU_MAX;st.rr=RR_MIN;st.rsL=0.13;st.rsR=0.13;st.swapped=true;}} // コイル受渡し・新コイル
    else if(t<4.0){recSupport.rotation.y=OPEN;coilCar.position.z=THREE.MathUtils.lerp(CAR_IN,CAR_PARK,easeIO((t-2.8)/1.2));} // カー退出
    else if(t<4.8){recSupport.rotation.y=OPEN*(1-easeIO((t-4.0)/0.8));coilCar.position.z=CAR_PARK;}                          // サポート復帰
    else{recSupport.rotation.y=0;coilCar.position.z=CAR_PARK;st.state="RUN";}}}
function updateGeometry(){
  uncGroup.coil.scale.set(st.ru,st.ru,1);for(const c of recCoils)c.scale.set(st.rr,st.rr,1);
  scrapR.coil.scale.set(st.rsR,st.rsR,1);scrapL.coil.scale.set(st.rsL,st.rsL,1); // 軸=Z
  updateEntryRibbon();
  for(let i=0;i<strandRibbons.length;i++)updateStrandRibbon(strandRibbons[i],strandZ[i]);
  updateTrim(trimRibbonR,scrapR,st.rsR);updateTrim(trimRibbonL,scrapL,st.rsL);}
function updateSpinners(dt){if(st.v<=0)return;for(const s of spinners){const r=(typeof s.r==="function")?s.r():s.r;s.obj.rotation[s.axis]+=s.dir*(st.v/r)*dt;}}
let uiT=0;
function updateHUD(dt){uiT+=dt;if(uiT<0.12)return;uiT=0;
  ui.roSpeed.textContent=Math.round(st.v*60);ui.roUnc.textContent=Math.round(st.ru*2000);ui.roRec.textContent=Math.round(st.rr*2000);
  ui.roTen.textContent=(st.v>0.004?(8+st.v*9).toFixed(1):"0.0");ui.roLen.textContent=Math.round(st.len).toLocaleString();
  const prog=THREE.MathUtils.clamp((RU_MAX*RU_MAX-st.ru*st.ru)/(RU_MAX*RU_MAX-RU_MIN*RU_MIN),0,1);
  ui.roProg.textContent=Math.round(prog*100);ui.prog.style.width=(prog*100).toFixed(1)+"%";
  let text,cls;const tgt=(st.paused||st.state!=="RUN")?0:st.target;
  if(st.state==="CHANGE"){text="コイル交換中";cls="info";}else if(st.state==="DECEL"){text="コイル交換準備 ─ 減速中";cls="warn";}
  else if(st.paused&&st.v<=0.004){text="ライン停止";cls="stop";}else if(st.v<tgt-0.01){text="加速中";cls="warn";}
  else if(st.v>tgt+0.01){text="減速中";cls="warn";}else if(st.v>0.004){text="定常運転中";cls="ok";}else{text="ライン停止";cls="stop";}
  ui.status.textContent=text;ui.led.className="led "+cls;}
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),0.05);
  stepLine(dt);updateSpinners(dt);updateGeometry();updateHUD(dt);controls.update(dt);renderer.render(scene,camera);}
window.addEventListener("resize",()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
window.addEventListener("keydown",e=>{if(e.code==="Space"&&document.activeElement.tagName!=="INPUT"){e.preventDefault();ui.btnRun.click();}});
animate();
