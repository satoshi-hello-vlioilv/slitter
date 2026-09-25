"use strict";
/* =========================================================
 * 条数依存部の再構築
 * =======================================================*/
function rebuildStrandDependent(N){st.N=N;buildKnives(N);buildFingers(N);buildSeparators(N);buildRecCoils(N);buildStrands(N);
  document.getElementById("roStrandW").textContent=Math.round(EFF_W/N*1000);}
rebuildStrandDependent(4);

/* =========================================================
 * UI
 * =======================================================*/
const ui={led:document.getElementById("statusLed"),status:document.getElementById("statusText"),
  roSpeed:document.getElementById("roSpeed"),roUnc:document.getElementById("roUnc"),roRec:document.getElementById("roRec"),
  roTen:document.getElementById("roTen"),roLen:document.getElementById("roLen"),roProg:document.getElementById("roProg"),
  roLoopDiff:document.getElementById("roLoopDiff"),roKnife:document.getElementById("roKnife"),
  prog:document.getElementById("coilProg"),btnRun:document.getElementById("btnRun")};
ui.btnRun.addEventListener("click",()=>{st.paused=!st.paused;
  ui.btnRun.innerHTML=st.paused?'<i class="fa-solid fa-play"></i><span>ライン起動</span>':'<i class="fa-solid fa-stop"></i><span>ライン停止</span>';
  ui.btnRun.classList.toggle("running",st.paused);});
const rng=document.getElementById("rngSpeed");
rng.addEventListener("input",()=>{document.getElementById("speedVal").textContent=rng.value;st.target=rng.value/60;});
const rngStrand=document.getElementById("rngStrand");
function setStrandN(N){
  document.querySelectorAll("#strandGroup button").forEach(x=>x.classList.toggle("active",parseInt(x.dataset.n,10)===N));
  rngStrand.value=N;document.getElementById("strandVal").textContent=N;
  rebuildStrandDependent(N);}
document.getElementById("strandGroup").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  setStrandN(parseInt(b.dataset.n,10));});
rngStrand.addEventListener("input",()=>setStrandN(parseInt(rngStrand.value,10)));
// 板形状(歪) — 種類と量を変えると条毎の伸び差プロファイルが更新される
document.getElementById("shapeGroup").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  document.querySelectorAll("#shapeGroup button").forEach(x=>x.classList.toggle("active",x===b));
  st.shape=b.dataset.s;updateShapeProfile();});
const rngShape=document.getElementById("rngShape");
rngShape.addEventListener("input",()=>{document.getElementById("shapeVal").textContent=rngShape.value;
  st.shapeI=parseInt(rngShape.value,10);updateShapeProfile();});
const CAM={all:[0.5,1.6,1.0,27,0.62,1.02],unc:[-11.4,2.1,1.2,8,0.78,1.10],slit:[0,2.25,0,4.5,0.62,1.0],
  loop1:[-3.9,1.0,0,7,0.55,0.98],loop2:[5.5,1.0,0,7.5,0.55,0.98],md:[9.4,2.1,0,6,0.70,1.02],rec:[13.0,2.2,1.0,8,0.72,1.08],
  scrap:[1.6,2.5,1.4,8,1.05,1.02],knife:[0,1.2,3.8,9.5,0.35,0.95]};
document.querySelectorAll("[data-cam]").forEach(b=>b.addEventListener("click",()=>controls.flyTo(...CAM[b.dataset.cam])));
document.getElementById("chkLabels").addEventListener("change",e=>{labelGroup.visible=e.target.checked;});
document.getElementById("chkIds").addEventListener("change",e=>{idLabelGroup.visible=e.target.checked;});
document.getElementById("chkBuilding").addEventListener("change",e=>{buildingGroup.visible=e.target.checked;});
document.getElementById("chkLoop1").addEventListener("change",e=>{st.loop1Tgt=e.target.checked?1:0;});
document.getElementById("chkLoop2").addEventListener("change",e=>{st.loop2Tgt=e.target.checked?1:0;});
// カッター台車(段取り): 目標位置を 0(格納)⇔2(段取り位置)で切替。状態機械は main.js
document.getElementById("btnKnife").addEventListener("click",()=>{st.kcTgt=st.kcTgt>1?0:2;
  document.querySelector("#btnKnife span").textContent=st.kcTgt>1?"カッター台車を旋回台へ戻す":"カッター台車をスリッター側へ";});
document.getElementById("chkFence").addEventListener("change",e=>{fenceGroup.visible=e.target.checked;});
document.getElementById("chkLoopTable").addEventListener("change",e=>{looperGroup.visible=e.target.checked;});

/* =========================================================
 * アルミ材の外観(仕上げパターン / 詳細カスタム)
 * =======================================================*/
const aluUI={color:document.getElementById("inpAluColor"),colorVal:document.getElementById("aluColorVal"),
  metal:document.getElementById("rngAluMetal"),metalVal:document.getElementById("aluMetalVal"),
  rough:document.getElementById("rngAluRough"),roughVal:document.getElementById("aluRoughVal")};
function syncAluUI(){
  aluUI.color.value=alu.color;aluUI.colorVal.textContent=alu.color.toUpperCase();
  aluUI.metal.value=Math.round(alu.metal*100);aluUI.metalVal.textContent=Math.round(alu.metal*100);
  aluUI.rough.value=Math.round(alu.rough*100);aluUI.roughVal.textContent=Math.round(alu.rough*100);}
syncAluUI();
document.getElementById("aluGroup").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  document.querySelectorAll("#aluGroup button").forEach(x=>x.classList.toggle("active",x===b));
  setAluPattern(b.dataset.a);syncAluUI();});
aluUI.color.addEventListener("input",()=>{alu.color=aluUI.color.value;
  aluUI.colorVal.textContent=alu.color.toUpperCase();applyAlu();});
aluUI.metal.addEventListener("input",()=>{alu.metal=aluUI.metal.value/100;
  aluUI.metalVal.textContent=aluUI.metal.value;applyAlu();});
aluUI.rough.addEventListener("input",()=>{alu.rough=aluUI.rough.value/100;
  aluUI.roughVal.textContent=aluUI.rough.value;applyAlu();});
document.getElementById("btnAluReset").addEventListener("click",()=>{setAluPattern(alu.pattern);syncAluUI();});
