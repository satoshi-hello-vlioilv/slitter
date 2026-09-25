"use strict";
/* =========================================================
 * UI
 * =======================================================*/
const ui={led:document.getElementById("statusLed"),status:document.getElementById("statusText"),
  roSpeed:document.getElementById("roSpeed"),roUnc:document.getElementById("roUnc"),roRec:document.getElementById("roRec"),
  roTen:document.getElementById("roTen"),roLen:document.getElementById("roLen"),roProg:document.getElementById("roProg"),
  roLoopDiff:document.getElementById("roLoopDiff"),roKnife:document.getElementById("roKnife"),roThread:document.getElementById("roThread"),
  kcMsg:document.getElementById("kcMsg"),btnKnife:document.getElementById("btnKnife"),
  chkLoop1:document.getElementById("chkLoop1"),chkLoop2:document.getElementById("chkLoop2"),
  prog:document.getElementById("coilProg"),btnRun:document.getElementById("btnRun")};

/* =========================================================
 * 条数・板厚に依存する部分の再構築(刃組の計算 → カッター台車 → 条・セパレーター・コイル)
 * =======================================================*/
const fmt=(v,d)=>{const t=(+v).toFixed(d);return t.indexOf(".")<0?t:t.replace(/\.?0+$/,"");};   // 末尾の0だけ落とす
function rebuildStrandDependent(N){st.N=N;
  const ctx=KC.solveFor(N,st.thick);
  KC.rebuild(ctx);buildStrands();buildSeparators();buildRecCoils();
  document.getElementById("roStrandW").textContent=fmt(ctx.w,2);
  paintBladeSet(ctx);}
/* 刃組の読み出し(刃組ガイダンスの刃組表の要点) */
function paintBladeSet(ctx){
  const B=WL.bladeSet, res=ctx.res, s=ctx.st, g=res.g, A=res.A, M=ctx.M;
  const $=id=>document.getElementById(id);
  const nk=A.U.length*2, bl=ctx.blade;
  $("bsKnife").textContent=`Φ${fmt(s.knife,1)} t${fmt(s.tk,2)} ×${nk}枚`+(bl?`(${bl.group}組)`:"");
  $("bsClr").textContent=`${fmt(A.clr,3)} / ${fmt(s.ov,2)} mm`;
  const cnt=o=>Object.keys(o).reduce((a,k)=>a+o[k],0);
  let rings="";
  if(res.finger){
    const n=Object.keys(g.finger).reduce((a,k)=>a+g.finger[k].u+g.finger[k].l,0);
    $("bsHold").textContent=`フィンガー ${n}本(板厚 ${fmt(s.thick,2)} < ${M.P.fingerMax})`;
  }else{
    const n=Object.keys(g.ring).reduce((a,od)=>a+Object.keys(g.ring[od]).reduce((b,w)=>b+g.ring[od][w].u+g.ring[od][w].l,0),0);
    $("bsHold").textContent=`ゴムリング ${n}本`;
    const meta=od=>B.ringMeta(M,KC.IX,od);
    const chip=(word,od)=>{const m=meta(od);return `<span class="bs-ring"><i style="background:${m.hex||"#888"}"></i>${word} Φ${od} ${m.color||""}</span>`;};
    rings=chip("大",res.bigOd)+chip("小",res.smOd);
    if(g.lube.u+g.lube.l)rings+=`<span class="bs-ring"><i style="background:#7150c4"></i>潤滑 Φ${fmt(g.lube.od,1)} ×${g.lube.u+g.lube.l}</span>`;}
  $("bsRings").innerHTML=rings;$("bsRings").hidden=!rings;
  const pk=KC.D3.pack||{};
  $("bsSpacer").textContent=`${cnt(g.spacerU)} / ${cnt(g.spacerL)}枚(${fmt(pk.sumU||0,2)} / ${fmt(pk.sumL||0,2)})`;
  const fs=res.fit.floatSeat;
  $("bsFloat").textContent=`上 ${fmt(fs.up,3)} / 下 ${fmt(fs.lo,3)} mm(${fs.side}端)`;
  // 判定(組んでみて分かる断り): 端数・板押さえが載らない面・押さえ代超え・空きの帯外れ
  const bad=[];
  if(res.stop.length)bad.push(...res.stop.map(x=>x.text));
  if(A.errs.length)bad.push(`刃のあいだが負の区間 ${A.errs.length}`);
  if(res.fit.spacerGap.length)bad.push(`スペーサーの端数 ${res.fit.spacerGap.length}区間`);
  if(res.fit.bareHold.length)bad.push(`${res.fit.holdName}が載らない面 ${res.fit.bareHold.length}`);
  if(fs.over.length)bad.push(`押さえ代(${fs.stroke}mm)超え ${fs.over.join("・")}`);
  const warn=res.fit.holdGap.length?`${res.fit.holdName}の空きが帯外れ ${res.fit.holdGap.length}面`:"";
  const el=$("bsJudge");
  el.className="bs-judge "+(bad.length?"ng":warn?"warn":"ok");
  el.textContent=bad.length?"組めない所あり: "+bad.join(" / "):warn?"組める(要確認: "+warn+")":"組める(端数なし・押さえ代内)";}
rebuildStrandDependent(4);
document.getElementById("roCarName").textContent=(KC.MS.carriages[0]||{}).name||KC.MS.carriageNone;   // ラインに載っている台車(台車マスタの先頭)

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
// 板厚 — 刃組(クリアランス・フィンガー/ゴムリングの切替・リング径)とコイル長さの両方が読む
const rngThick=document.getElementById("rngThick");
rngThick.addEventListener("input",()=>{st.thick=parseFloat(rngThick.value);
  document.getElementById("thickVal").textContent=st.thick.toFixed(1);rebuildStrandDependent(st.N);});
// 板形状(歪) — 種類と量を変えると条毎の伸び差プロファイルが更新される
document.getElementById("shapeGroup").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  document.querySelectorAll("#shapeGroup button").forEach(x=>x.classList.toggle("active",x===b));
  st.shape=b.dataset.s;updateShapeProfile();});
const rngShape=document.getElementById("rngShape");
rngShape.addEventListener("input",()=>{document.getElementById("shapeVal").textContent=rngShape.value;
  st.shapeI=parseInt(rngShape.value,10);updateShapeProfile();});
const CAM={all:[0.5,0.7,1.0,27,0.62,1.02],unc:[-11.4,1.3,1.2,8,0.78,1.10],slit:[0,PL+0.15,0.1,4.2,0.62,1.02],
  loop1:[-3.9,-0.6,0,7.5,0.55,1.0],loop2:[5.5,-0.6,0,8,0.55,1.0],md:[9.4,PL,0,6,0.70,1.02],rec:[13.0,1.3,1.0,8,0.72,1.08],
  scrap:[1.6,HTW-0.1,1.4,7.5,1.05,1.02],knife:[0,0.6,2.2,8.5,0.62,0.98],arbor:[0.1,PL,0.2,2.6,1.2,1.3]};
document.querySelectorAll("[data-cam]").forEach(b=>b.addEventListener("click",()=>controls.flyTo(...CAM[b.dataset.cam])));
document.getElementById("chkLabels").addEventListener("change",e=>{labelGroup.visible=e.target.checked;});
document.getElementById("chkIds").addEventListener("change",e=>{idLabelGroup.visible=e.target.checked;});
document.getElementById("chkBuilding").addEventListener("change",e=>{buildingGroup.visible=e.target.checked;});
// ルーパー: 段取り中(帯板が無い間)は選択だけ覚え、通板のあとで反映する
ui.chkLoop1.addEventListener("change",e=>{if(st.state!=="KNIFE")st.loop1Tgt=e.target.checked?1:0;});
ui.chkLoop2.addEventListener("change",e=>{if(st.state!=="KNIFE")st.loop2Tgt=e.target.checked?1:0;});
document.getElementById("chkFence").addEventListener("change",e=>{fenceGroup.visible=e.target.checked;});
document.getElementById("chkLoopTable").addEventListener("change",e=>{looperGroup.visible=e.target.checked;});

/* =========================================================
 * 刃替え段取り(カッター台車)。手順と可否の判定は knifechange.js
 * =======================================================*/
ui.btnKnife.addEventListener("click",()=>{if(KX.toggleAll())controls.flyTo(...CAM.knife);});
document.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>{
  if(KX.act(b.dataset.step)&&b.dataset.step==="pull")controls.flyTo(...CAM.knife);}));
let kcSig="";
function syncKnifeUI(){
  const D=KC.D3, busy=KX.busy(), inLine=KX.inLine();
  const sig=[busy,inLine,D.open>0.5,D.rot>0.5,KX.where(),KX.note,st.thread,thread.mode].join("|");
  if(sig===kcSig)return;kcSig=sig;
  ui.btnKnife.querySelector("span").textContent=inLine&&!busy?"カッター台車をラインから出す":"カッター台車をラインへセット";
  ui.btnKnife.disabled=busy;
  const lab={pull:inLine?"①引き出す":"①ラインへ戻す",open:D.open>0.5?"②軸端部を戻す":"②軸端部を外す",spin:D.rot>0.5?"③台車を戻す":"③台車を回す"};
  document.querySelectorAll("[data-step]").forEach(b=>{b.textContent=lab[b.dataset.step];b.disabled=busy;
    b.classList.toggle("is-on",b.dataset.step==="pull"?!inLine:b.dataset.step==="open"?D.open>0.5:D.rot>0.5);});
  ui.roKnife.textContent=KX.where();
  ui.roThread.textContent=thread.mode==="out"?"抜取り中":thread.mode==="in"?"通板中":st.thread?"通板済":"抜取り済(帯板なし)";
  ui.kcMsg.textContent=KX.note;ui.kcMsg.hidden=!KX.note;}
// 部材の表示(刃組ガイダンスの「表示」と「消した部材の見せ方」)
document.getElementById("bsShow").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  const on=!b.classList.contains("active");b.classList.toggle("active",on);KC.setShow(b.dataset.show,on);});
document.getElementById("bsHide").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  document.querySelectorAll("#bsHide button").forEach(x=>x.classList.toggle("active",x===b));KC.setHide(b.dataset.hide);});

/* =========================================================
 * 刃組マスタ(WaveLog から移植したマスタの一覧)
 * =======================================================*/
(function masterViewer(){
  const MM=BLADESET_MASTER, modal=document.getElementById("masterModal"), body=document.getElementById("mmBody");
  const esc=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const num=v=>v==null||v===""?"":fmt(v,3);
  const table=(cols,rows)=>`<table class="mm-t"><thead><tr>${cols.map(c=>`<th class="${c[2]||""}">${esc(c[0])}</th>`).join("")}</tr></thead><tbody>`
    +rows.map(r=>`<tr>${cols.map(c=>`<td class="${c[2]||""}">${c[1](r)}</td>`).join("")}</tr>`).join("")+"</tbody></table>";
  const sw=h=>h?`<i class="mm-sw" style="background:${esc(h)}"></i>`:"";
  const TABS={
    standard:["刃組基準値",()=>table([["項目",r=>esc(r[0])],["鍵",r=>`<code>${esc(r[1])}</code>`],["値",r=>{const v=MM.standard[r[1]];
      return esc(v==null?"(空=有効長の中央)":typeof v==="boolean"?(v?"可":"不可"):typeof v==="number"?fmt(v,3):v);},"n"]],MM.STANDARD_MAP)],
    blade:["刃",()=>table([["名称",r=>esc(r.name)],["組",r=>esc(r.group)],["刃厚",r=>num(r.thickness),"n"],["現状径",r=>num(r.currentDia),"n"],
      ["保有枚数",r=>num(r.qty),"n"],["状態",r=>esc(r.status)]],MM.blades)],
    spacer:["スペーサー",()=>table([["寸法",r=>num(r.size),"n"],["保有枚数",r=>num(r.qty),"n"],["用途",r=>esc(r.use)]],MM.spacers)],
    ring:["ゴムリング",()=>table([["色",r=>sw(r.lube?"#7150c4":r.hex)+esc(r.color)],["種類",r=>esc(r.lubeText)],["外径",r=>num(r.od),"n"],
      ["内径",r=>num(r.bore),"n"],["幅",r=>num(r.width),"n"],["保有本数",r=>num(r.qty),"n"]],MM.rings)],
    finger:["フィンガー",()=>table([["名称",r=>esc(r.name)],["幅",r=>num(r.width),"n"],["保有本数",r=>num(r.qty),"n"],
      ["適用板厚上限",r=>num(r.maxThickness),"n"],["全長",r=>num(r.length),"n"],["厚み",r=>num(r.thickness),"n"],
      ["研削長",r=>num(r.grindRun),"n"],["研削量",r=>num(r.grindDrop),"n"]],MM.fingers)],
    carriage:["台車",()=>table([["台車名",r=>esc(r.name)],["表示順",r=>num(r.order),"n"],["有効",r=>esc(r.enabledText)]],MM.carriages)
      +`<p class="mm-note">台車を使わないラインの呼び名: ${esc(MM.carriageNone)}(台車マスタへ1行足すと選べる)</p>`],
  };
  const tabs=document.getElementById("mmTabs");
  tabs.innerHTML=Object.keys(TABS).map(k=>`<button data-mm="${k}">${TABS[k][0]}</button>`).join("");
  document.getElementById("mmEq").textContent="設備: "+MM.equipment;
  const show=k=>{tabs.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.mm===k));body.innerHTML=TABS[k][1]();};
  tabs.addEventListener("click",e=>{const b=e.target.closest("button");if(b)show(b.dataset.mm);});
  document.getElementById("btnMaster").addEventListener("click",()=>{show("spacer");modal.hidden=false;});
  document.getElementById("mmClose").addEventListener("click",()=>{modal.hidden=true;});
  modal.addEventListener("click",e=>{if(e.target===modal)modal.hidden=true;});
  window.addEventListener("keydown",e=>{if(e.key==="Escape")modal.hidden=true;});
})();

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
