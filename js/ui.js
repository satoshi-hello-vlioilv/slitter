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
const CAM={all:[-3,2,0,42,0.55,1.14],unc:[-30,2.3,0,9,0.72,1.10],slit:[0,2.25,0,4.5,0.62,1.0],
  loop1:[-12,1.2,0,9,0.5,0.98],loop2:[8.6,1.1,0,9,0.5,0.98],md:[16.2,2.2,0,6,0.66,1.02],rec:[24,2.3,0,9,0.62,1.08]};
document.querySelectorAll("[data-cam]").forEach(b=>b.addEventListener("click",()=>controls.flyTo(...CAM[b.dataset.cam])));
document.getElementById("chkLabels").addEventListener("change",e=>{labelGroup.visible=e.target.checked;});
document.getElementById("chkIds").addEventListener("change",e=>{idLabelGroup.visible=e.target.checked;});
document.getElementById("chkBuilding").addEventListener("change",e=>{buildingGroup.visible=e.target.checked;});
document.getElementById("chkLoop1").addEventListener("change",e=>{st.loop1Tgt=e.target.checked?1:0;});
document.getElementById("chkLoop2").addEventListener("change",e=>{st.loop2Tgt=e.target.checked?1:0;});
