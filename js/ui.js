"use strict";
/* =========================================================
 * UI
 * =======================================================*/
const ui={led:document.getElementById("statusLed"),status:document.getElementById("statusText"),
  roSpeed:document.getElementById("roSpeed"),roUnc:document.getElementById("roUnc"),roRec:document.getElementById("roRec"),
  roTen:document.getElementById("roTen"),roLen:document.getElementById("roLen"),roProg:document.getElementById("roProg"),
  roLoopDiff:document.getElementById("roLoopDiff"),roThread:document.getElementById("roThread"),
  kcMsg:document.getElementById("kcMsg"),btnKnife:document.getElementById("btnKnife"),
  chkLoop1:document.getElementById("chkLoop1"),chkLoop2:document.getElementById("chkLoop2"),
  prog:document.getElementById("coilProg"),btnRun:document.getElementById("btnRun")};

/* =========================================================
 * 条数・板厚に依存する部分の再構築(刃組の計算 → カッター台車 → 条・セパレーター・コイル)
 * ラインの条数 = ラインの台車(KC.active)の刃組。待機台車は段取り位置で別に組む(sbUI)。
 * =======================================================*/
const fmt=(v,d)=>{const t=(+v).toFixed(d);return t.indexOf(".")<0?t:t.replace(/\.?0+$/,"");};   // 末尾の0だけ落とす
function rebuildStrandDependent(N){
  KC.rebuild(KC.solveFor(N,st.thick,KC.active.i));applyLine();}
/* ラインの台車の刃組をラインへ(条・セパレーター・リコイラのスプール・読み出し)。入れ替えたときも呼ぶ */
function applyLine(){const c=KC.active, ctx=c.D.ctx;
  st.N=c.N;buildStrands();buildSeparators();buildRecCoils();
  document.getElementById("roStrandW").textContent=fmt(ctx.w,2);
  document.getElementById("bsCar").textContent=c.name;
  showStrandN(c.N);paintBladeSet(ctx,c.D.pack);}
function showStrandN(N){
  document.querySelectorAll("#strandGroup button").forEach(x=>x.classList.toggle("active",parseInt(x.dataset.n,10)===N));
  document.getElementById("rngStrand").value=N;document.getElementById("strandVal").textContent=N;}
/* 判定(組んでみて分かる断り): 端数・板押さえが載らない面・押さえ代超え・空きの帯外れ → [class, 文] */
function bladeJudge(ctx){
  const res=ctx.res, A=res.A, fs=res.fit.floatSeat, bad=[];
  if(res.stop.length)bad.push(...res.stop.map(x=>x.text));
  if(A.errs.length)bad.push(`刃のあいだが負の区間 ${A.errs.length}`);
  if(res.fit.spacerGap.length)bad.push(`スペーサーの端数 ${res.fit.spacerGap.length}区間`);
  if(res.fit.bareHold.length)bad.push(`${res.fit.holdName}が載らない面 ${res.fit.bareHold.length}`);
  if(fs.over.length)bad.push(`押さえ代(${fs.stroke}mm)超え ${fs.over.join("・")}`);
  const warn=res.fit.holdGap.length?`${res.fit.holdName}の空きが帯外れ ${res.fit.holdGap.length}面`:"";
  return bad.length?["ng","組めない所あり: "+bad.join(" / ")]:warn?["warn","組める(要確認: "+warn+")"]:["ok","組める(端数なし・押さえ代内)"];}
/* 刃組の読み出し(刃組ガイダンスの刃組表の要点) */
function paintBladeSet(ctx,pack){
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
  const pk=pack||{};
  $("bsSpacer").textContent=`${cnt(g.spacerU)} / ${cnt(g.spacerL)}枚(${fmt(pk.sumU||0,2)} / ${fmt(pk.sumL||0,2)})`;
  const fs=res.fit.floatSeat;
  $("bsFloat").textContent=`上 ${fmt(fs.up,3)} / 下 ${fmt(fs.lo,3)} mm(${fs.side}端)`;
  const [cls,txt]=bladeJudge(ctx), el=$("bsJudge");
  el.className="bs-judge "+cls;el.textContent=txt;}
rebuildStrandDependent(4);
KC.rebuildCar(KC.standby,KC.solveFor(4,st.thick,KC.standby.i));             // 待機台車(はじめは同じ刃組)
KX.onSwap=()=>applyLine();                                                    // 入れ替えた台車の刃組をラインへ

ui.btnRun.addEventListener("click",()=>{st.paused=!st.paused;
  ui.btnRun.innerHTML=st.paused?'<i class="fa-solid fa-play"></i><span>ライン起動</span>':'<i class="fa-solid fa-stop"></i><span>ライン停止</span>';
  ui.btnRun.classList.toggle("running",st.paused);});
const rng=document.getElementById("rngSpeed");
rng.addEventListener("input",()=>{document.getElementById("speedVal").textContent=rng.value;st.target=rng.value/60;});
const rngStrand=document.getElementById("rngStrand");
function setStrandN(N){if(KX.lineBusy())return;showStrandN(N);rebuildStrandDependent(N);}
document.getElementById("strandGroup").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  setStrandN(parseInt(b.dataset.n,10));});
rngStrand.addEventListener("input",()=>setStrandN(parseInt(rngStrand.value,10)));
// 板厚 — 刃組(クリアランス・フィンガー/ゴムリングの切替・リング径)とコイル長さの両方が読む
const rngThick=document.getElementById("rngThick");
rngThick.addEventListener("input",()=>{if(KX.lineBusy())return;st.thick=parseFloat(rngThick.value);
  document.getElementById("thickVal").textContent=st.thick.toFixed(1);rebuildStrandDependent(st.N);
  const sb=KC.standby;KC.rebuildCar(sb,KC.solveFor(sb.N,st.thick,sb.i));sbUI.sync(true);});   // 待機台車も同じ板厚で組み直す
// 板形状(歪) — 種類と量を変えると条毎の伸び差プロファイルが更新される
document.getElementById("shapeGroup").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  document.querySelectorAll("#shapeGroup button").forEach(x=>x.classList.toggle("active",x===b));
  st.shape=b.dataset.s;updateShapeProfile();});
const rngShape=document.getElementById("rngShape");
rngShape.addEventListener("input",()=>{document.getElementById("shapeVal").textContent=rngShape.value;
  st.shapeI=parseInt(rngShape.value,10);updateShapeProfile();});
const CAM={all:[0.5,0.7,1.0,27,0.62,1.02],unc:[-11.4,1.3,1.2,8,0.78,1.10],slit:[0,PL+0.15,0.1,4.2,0.62,1.02],
  loop1:[-3.9,-0.6,0,7.5,0.55,1.0],loop2:[5.5,-0.6,0,8,0.55,1.0],md:[9.4,PL,0,6,0.70,1.02],rec:[13.0,1.3,1.0,8,0.72,1.08],
  scrap:[2.1,-0.25,0.9,5.2,0.95,0.92],knife:[-2.3,0.4,4.4,10.5,0.50,0.98],arbor:[0.1,PL,0.2,2.6,1.2,1.3],
  reel:[REC_X,REC_Y-0.05,0.35,3.3,0.62,1.16]};
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
 * 刃替え段取り(2台のカッター台車の入れ替え)。手順と可否の判定は knifechange.js
 * =======================================================*/
ui.btnKnife.addEventListener("click",()=>{if(KX.toggleAll())controls.flyTo(...CAM.knife);});
document.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>{
  if(KX.act(b.dataset.step)&&b.dataset.step!=="open")controls.flyTo(...CAM.knife);}));
/* 待機台車の組み替え: 段取り位置の台車。軸端部を外している間だけ条数を選べる(ラインは止めなくてよい) */
const sbUI=(function(){
  const $=id=>document.getElementById(id), rng=$("rngStandby");
  const can=c=>!!c&&c.D.open>0.999&&!KX.busy();
  rng.addEventListener("input",()=>{const c=KX.opCar();if(!can(c))return;
    KC.rebuildCar(c,KC.solveFor(parseInt(rng.value,10),st.thick,c.i));
    if(c===KC.active)applyLine();                                   // ラインが空で、最後にラインにいた台車を組み替えたとき
    sync(true);});
  let sig="";
  function sync(force){const c=KX.opCar(), ok=can(c), busy=KX.busy(), open=!!c&&c.D.open>0.999;
    const k=[c?c.i:-1,c?c.N:0,c?c.w:0,ok,busy,open].join("|");if(!force&&k===sig)return;sig=k;
    rng.disabled=!ok;$("sbName").textContent=c?c.name:"—";
    if(c){$("sbVal").textContent=c.N;$("sbW").textContent=fmt(c.w,2);if(+rng.value!==c.N)rng.value=c.N;
      const [cls,txt]=bladeJudge(c.D.ctx);$("sbJudge").className="bs-judge "+cls;$("sbJudge").textContent=txt;}
    $("sbJudge").hidden=!c;
    $("sbNote").textContent=!c?"段取り位置に台車がありません(テーブルを回しきると並びます)":
      busy?"動いている間は組み替えられません":
      ok?"条数を選ぶとその場で組み替えます。終わったら「②軸端部戻し」":`「②軸端部外し」で${c.name}の軸の先を出すと組み替えられます`;}
  sync(true);
  return{sync};})();
let kcSig="";
function syncKnifeUI(){
  const busy=KX.busy(), lb=KX.lineBusy(), P=KX.plan(), cars=KC.CARS, oc=KX.opCar();
  const sig=[busy,lb,KC.SH.rot,KC.active.i,KX.note,st.thread,thread.mode,
    ...cars.map(c=>[KX.where(c),c.N].join(","))].join("|");
  sbUI.sync();
  if(sig===kcSig)return;kcSig=sig;
  ui.btnKnife.querySelector("span").textContent=P.all;
  ui.btnKnife.disabled=busy;
  const on={pull:!KX.lineCar(),open:!!oc&&oc.D.open>0.5,spin:false};
  document.querySelectorAll("[data-step]").forEach(b=>{const [t,sub]=P[b.dataset.step];
    b.innerHTML=t+(sub?`<small>${sub}</small>`:"");b.disabled=busy;b.classList.toggle("is-on",on[b.dataset.step]);});
  for(const c of cars){document.getElementById("carName"+c.i).textContent=c.name;
    document.getElementById("carWhere"+c.i).textContent=`${KX.where(c)} · ${c.N}条`;}
  // ラインの条数・板厚は、入れ替えの段取り中は変えない(どちらの台車の刃組か曖昧になるため)
  document.querySelectorAll("#strandGroup button").forEach(b=>{b.disabled=lb;});
  document.getElementById("rngStrand").disabled=lb;document.getElementById("rngThick").disabled=lb;
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

/* =========================================================
 * リコイラ(リール・ゴムスリーブ・スプール)の段取り
 * ---------------------------------------------------------
 * 選んだ項目は残し、合わない相手を直す(スリーブを付けたらスプールは外す・リールを替えたら
 * 挿さる内径の管へ替える…)。どう直しても合わない選択肢はボタンを無効にする。
 * コイル交換・刃替えの段取り中は変えられない(リールの開閉とスプールの差し替えを動かしているため)。
 * =======================================================*/
const rclUI=(function(){
  const $=id=>document.getElementById(id), fmt1=v=>fmt(v,1);
  $("rclSteelW").innerHTML=REEL.SP.WIDTHS.map(w=>`<button data-v="${w}">${w}</button>`).join("");
  const KEY={rclReel:"reel",rclSleeve:"sleeve",rclSpool:"spool",rclTubeID:"tubeID",rclTubeT:"tubeT",rclSteelW:"steelW"};
  const PARSE={reel:v=>v,sleeve:v=>v==="1",spool:v=>v,tubeID:v=>+v,tubeT:v=>+v,steelW:v=>+v};
  const ok=c=>REEL.stack(c).ok, tube=c=>c.spool==="paper"||c.spool==="bake";
  const fitID=c=>REEL.TB.IDS.find(v=>ok(Object.assign({},c,{tubeID:v})));
  /* key=val を選んだときの段取り(合わなければ null) */
  function resolve(key,val){
    const c=Object.assign({},RCL.cfg,{[key]:val});
    if(key==="sleeve"&&val)c.spool="none";                       // スリーブの上に管は挿さらない
    if(key==="spool"&&val!=="none")c.sleeve=false;
    if(key==="reel"&&c.sleeve&&!ok(Object.assign({},c,{spool:"none"})))c.sleeve=false;
    if(key==="reel"&&c.spool==="steel"&&!ok(c))c.spool="paper";   // 鉄が挿さらないリールは紙管へ
    if(tube(c)&&!ok(c)){const id=fitID(c);if(id)c.tubeID=id;}
    return ok(c)?c:null;}
  function choose(key,val){if(locked())return;const c=resolve(key,val);if(!c)return;RCL.set(c);sync(true);}
  Object.keys(KEY).forEach(id=>$(id).addEventListener("click",e=>{const b=e.target.closest("button");
    if(!b||b.disabled)return;choose(KEY[id],PARSE[KEY[id]](b.dataset.v));}));
  const locked=()=>st.state==="CHANGE"||st.state==="DECEL"||KX.lineBusy();
  $("btnRclOut").addEventListener("click",()=>{
    if(st.state!=="RUN"||KX.lineBusy()||!st.thread)return;
    st.state="DECEL";st.changeAll=false;controls.flyTo(...CAM.rec);});
  let sig="";
  function sync(force){
    const c=RCL.cfg,f=RCL.fit,lock=locked(),wound=st.rr>RCL.coreR()+0.001;
    const canOut=st.state==="RUN"&&!KX.lineBusy()&&!!st.thread&&wound;
    const k=[JSON.stringify(c),lock,canOut,st.state,strandW.length,strandW[0]].join("|");
    if(!force&&k===sig)return;sig=k;
    Object.keys(KEY).forEach(id=>{const key=KEY[id];
      document.querySelectorAll(`#${id} button`).forEach(b=>{const v=PARSE[key](b.dataset.v);
        b.classList.toggle("active",c[key]===v);
        b.disabled=lock||(c[key]!==v&&!resolve(key,v))||(key==="tubeID"&&!ok(Object.assign({},c,{tubeID:v})));});});
    $("rclTubeBox").hidden=!tube(c);$("rclSteelBox").hidden=c.spool!=="steel";
    // 装着と重量
    const sp=RCL.spools,sl=RCL.sleeve,mass=sp.reduce((a,p)=>a+p.mass,0)+(sl?sl.mass:0);
    const ws=[...new Set(strandW.map(w=>Math.round(w*1000)))];
    let parts=c.spool==="steel"?`鉄スプール SNA32B W${c.steelW}`:tube(c)?`${c.spool==="paper"?"紙管":"ベーク"} φ${c.tubeID}×t${c.tubeT} × 幅${ws.join("/")} × ${sp.length}本`:"";
    if(sl)parts=(parts?parts+" + ":"")+"ゴムスリーブ";
    $("rclParts").textContent=(parts||"なし(ドラムに直接巻く)")+(mass?`(${fmt1(mass)} kg)`:"");
    $("rclCore").textContent=`φ${fmt1(f.coreD)}`;
    $("rclDrum").textContent=`φ${f.RS.D_CON} / φ${f.RS.D_EXP} → φ${fmt1(f.gripD)}(開度 ${Math.round(f.expT*100)}%)`;
    // 嵌合チェック(+ 鉄スプールの幅の注意)
    const rows=f.rows.slice(),span=strandCuts.length?Math.round(Math.abs(strandCuts[strandCuts.length-1]-strandCuts[0])*1000):0;
    if(c.spool==="steel"&&c.steelW<span)rows.push({label:"鉄スプール幅",cls:"warn",txt:`${c.steelW} < 製品の全幅 ${span}(端の条がはみ出す)`});
    if(c.spool==="steel"&&c.steelW>REEL.RC.SEG_L)rows.push({label:"鉄スプール幅",cls:"warn",txt:`ドラム長 ${REEL.RC.SEG_L} より長い`});
    $("rclFit").innerHTML='<div class="r"><span>嵌合チェック</span><b></b></div>'+
      rows.map(r=>`<div class="r"><span>${r.label}</span><b class="${r.cls}">${r.txt}</b></div>`).join("");
    $("btnRclOut").disabled=!canOut;
    const msg=st.state==="CHANGE"?"コイル交換中(リールの開閉・スプールの差し替え中)は段取りを変えられません":
      KX.lineBusy()?"刃替えの段取り中は変えられません":"";
    $("rclMsg").textContent=msg;$("rclMsg").hidden=!msg;}
  sync(true);
  return {sync};
})();
