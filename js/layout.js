"use strict";
/* =========================================================
 * 画面の骨組み(運転かたまり #hud・分類パネル #panel・視点バー #camBar)
 * ---------------------------------------------------------
 * 分類(運転 / 段取り / 解析 / 表示)を開くと、その分類の項目(section.pane)を1つずつ出す。
 * 項目はチップで切り替える(分類 → 項目 → 中身の3段)。同じ分類をもう一度押す / Esc で閉じる。
 * パネルを開いている間は 3D の投影中心をパネルの空いた側へずらす(camera.setViewOffset)—
 * ラインがパネルの裏に隠れず、空いた所の真ん中に来る。
 * 設備名の札のうち関係する項目があるものは押せる(押すとその項目を開く)。
 * =======================================================*/
const LAYOUT=(function(){
  const $=id=>document.getElementById(id);
  const panel=$("panel"), chipsEl=$("pnlChips"), nav=$("nav");
  const CATS={run:{t:"運転",i:"fa-play"},setup:{t:"段取り",i:"fa-screwdriver-wrench"},
              ana:{t:"解析",i:"fa-flask"},view:{t:"表示",i:"fa-eye"}};
  const panes=[...panel.querySelectorAll("section.pane")];
  const byCat=k=>panes.filter(p=>p.dataset.cat===k);
  const store={get:k=>{try{return localStorage.getItem("slitter."+k);}catch(e){return null;}},
               set:(k,v)=>{try{localStorage.setItem("slitter."+k,v);}catch(e){}}};
  const sub={};                                          // 分類ごとに最後に見た項目
  for(const k in CATS)sub[k]=store.get("pane."+k)||byCat(k)[0].dataset.key;
  let cur=null;

  function showPane(k,key){
    const list=byCat(k);if(!list.some(p=>p.dataset.key===key))key=list[0].dataset.key;
    sub[k]=key;store.set("pane."+k,key);
    chipsEl.innerHTML=list.length<2?"":list.map(p=>`<button data-key="${p.dataset.key}" class="${p.dataset.key===key?"on":""}">`+
      `<i class="fa-solid ${p.dataset.icon}"></i>${p.dataset.title}</button>`).join("");
    chipsEl.hidden=list.length<2;
    panes.forEach(p=>{p.hidden=!(p.dataset.cat===k&&p.dataset.key===key);});
    panel.querySelector(".pnl-body").scrollTop=0;}
  /* 分類を開く(同じ分類なら閉じる)。key: 開く項目 / keep: 開いていても閉じない */
  function open(k,key,keep){
    if(cur===k&&!key&&!keep)k=null;
    cur=k;nav.querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.cat===cur));
    panel.hidden=!cur;document.body.classList.toggle("pnl-open",!!cur);
    store.set("cat",cur||"");
    if(cur){$("pnlIcon").className="fa-solid "+CATS[cur].i;$("pnlTitle").textContent=CATS[cur].t;showPane(cur,key||sub[cur]);}
    if(typeof judge==="function")judge();
    if(portrait()&&typeof refit==="function")refit();
    viewOffset();}
  nav.addEventListener("click",e=>{const b=e.target.closest("button");if(b)open(b.dataset.cat);});
  chipsEl.addEventListener("click",e=>{const b=e.target.closest("button");if(b&&cur)showPane(cur,b.dataset.key);});
  $("pnlClose").addEventListener("click",()=>open(null));
  window.addEventListener("keydown",e=>{
    const t=document.activeElement&&document.activeElement.tagName;if(t==="INPUT"||t==="SELECT"||t==="TEXTAREA")return;
    if(e.key==="Escape"&&cur&&$("masterModal").hidden)open(null);
    const n="1234".indexOf(e.key);if(n>=0&&!e.ctrlKey&&!e.metaKey&&!e.altKey)open(Object.keys(CATS)[n]);});

  /* ---- 3D の投影中心をずらす(パネルの空いた側の真ん中へ。なめらかに動かす) ---- */
  const off={x:0,y:0,tx:0,ty:0};
  function viewOffset(){
    const W=window.innerWidth,H=window.innerHeight;off.tx=0;off.ty=0;
    if(cur){const r=panel.getBoundingClientRect();
      if(W<=700)off.ty=Math.max(0,H-r.top)/2*0.9;                 // スマホ: 下のシートの上へ
      else off.tx=-Math.max(0,r.right)/2;}                           // 左のパネルの右へ
    if(!off.raf)off.raf=requestAnimationFrame(stepOffset);}
  function stepOffset(){off.raf=0;
    off.x+=(off.tx-off.x)*0.22;off.y+=(off.ty-off.y)*0.22;
    if(Math.abs(off.tx-off.x)<0.5&&Math.abs(off.ty-off.y)<0.5){off.x=off.tx;off.y=off.ty;}
    const W=window.innerWidth,H=window.innerHeight;
    if(off.x===0&&off.y===0)camera.clearViewOffset();else camera.setViewOffset(W,H,off.x,off.y,W,H);
    if(off.x!==off.tx||off.y!==off.ty)off.raf=requestAnimationFrame(stepOffset);}
  window.addEventListener("resize",viewOffset);
  if(typeof ResizeObserver!=="undefined")new ResizeObserver(()=>{if(cur)viewOffset();}).observe(panel);

  /* ---- 札から項目へ ---- */
  const TAG=[["スリッター(","setup","slit"],["A台車","setup","kc"],["B台車","setup","kc"],["回転テーブル","setup","kc"],
    ["リコイラ","setup","rcl"],["No.1ピット","run","meas"],["No.2ピット","run","meas"],["ラフレベラー","ana","def"],
    ["テンションスタンド","ana","mech"],["アンコイラ","ana","shape"]];
  for(const it of LBL.items){if(it.el.classList.contains("rid"))continue;
    const m=TAG.find(([p])=>it.text.startsWith(p));if(!m)continue;
    it.el.classList.add("link");it.el.title=CATS[m[1]].t+" › "+panes.find(p=>p.dataset.key===m[2]).dataset.title+" を開く";
    it.el.addEventListener("click",()=>open(m[1],m[2],true));}

  /* ---- 視点: 押した視点を目立たせる(3D を動かすと消える) ----
   * 縦長の画面(スマホ)の全景はラインを縦に通して見る。下のシートを開いている間は引いて、
   * シートの上に全長が入るようにする。 */
  let camKey="all";
  const markCam=k=>{camKey=k;$("camBar").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x.dataset.cam===k));};
  $("camBar").addEventListener("click",e=>{const b=e.target.closest("button");if(b)markCam(b.dataset.cam);});
  renderer.domElement.addEventListener("pointerdown",()=>markCam(null));
  const ALL_WIDE=CAM.all.slice(), ALL_TALL=[0.8,0.3,0.6,40,-1.32,0.82];
  const portrait=()=>window.innerWidth/window.innerHeight<0.8;
  Object.defineProperty(CAM,"all",{get(){if(!portrait())return ALL_WIDE.slice();
    const c=ALL_TALL.slice();if(cur){c[3]*=1.45;c[0]+=1.5;}return c;}});
  const refit=()=>{if(camKey==="all")controls.flyTo(...CAM.all);};
  if(portrait()){const c=CAM.all;controls.target.set(c[0],c[1],c[2]);controls.r=c[3];controls.theta=c[4];controls.phi=c[5];}
  let wasPortrait=portrait();
  window.addEventListener("resize",()=>{if(portrait()!==wasPortrait){wasPortrait=portrait();refit();}});
  markCam("all");

  /* ---- 項目の中のタブ(data-tabs の項目: 見出し .sub-h[data-tab] ごとに1つずつ見せる) ---- */
  const tabSets={};
  for(const p of panes.filter(p=>p.hasAttribute("data-tabs"))){
    const secs=[];let s=null;
    for(const el of [...p.children]){if(el.matches(".sub-h[data-tab]")){s={name:el.dataset.tab,els:[el]};secs.push(s);}else if(s)s.els.push(el);}
    const bar=document.createElement("div");bar.className="sec-tabs";p.prepend(bar);
    bar.innerHTML=secs.map((x,i)=>`<button data-i="${i}">${x.name}<em></em></button>`).join("");
    const show=name=>{let i=secs.findIndex(x=>x.name===name);if(i<0)i=0;
      secs.forEach((x,j)=>x.els.forEach(el=>el.classList.toggle("sec-off",j!==i)));
      bar.querySelectorAll("button").forEach((b,j)=>b.classList.toggle("on",j===i));store.set("tab."+p.dataset.key,secs[i].name);};
    bar.addEventListener("click",e=>{const b=e.target.closest("button");if(b)show(secs[+b.dataset.i].name);});
    show(store.get("tab."+p.dataset.key));tabSets[p.dataset.key]={show,bar,secs};}
  /* 「詳細」: 　で始まる行(.det)を畳む */
  for(const kv of document.querySelectorAll("#panel .mech-kv")){
    const b=document.createElement("button");b.className="kv-more";b.textContent="詳細 ▾";kv.after(b);
    b.addEventListener("click",()=>{const o=kv.classList.toggle("open");b.textContent=o?"詳細 ▴":"詳細 ▾";});}

  /* ---- 判定(mechui.js が #mechWarn に書く): 運転かたまりのバッジ・解析の先頭のまとめ・タブの点 ---- */
  // 文 → 開く場所 [項目, タブ]
  const route=t=>/張力|ループ/.test(t)?["mech","張力"]:/反り/.test(t)?["def","反り"]:/通板/.test(t)?["def","垂れ・通板"]:
    /バリ|クリアランス/.test(t)?["def","切断面"]:/板形状/.test(t)?["shape",null]:["def","反り"];
  const go=t=>{const [key,tab]=route(t);open("ana",key,true);if(tab&&tabSets[key])tabSets[key].show(tab);};
  const warnEl=$("mechWarn"), jBtn=$("btnJudge"), jPop=$("judgePop"), jBox=$("anaJudge"), jSum=$("judgeSum");
  let jOpen=store.get("judge.open")==="1", jSig="";
  const items=()=>[...warnEl.children].map(d=>({cls:d.className,t:d.textContent}));
  const listHTML=L=>L.map(x=>`<div class="${x.cls}" data-t="${x.t.replace(/"/g,"&quot;")}">${x.t}<b>›</b></div>`).join("");
  function judge(){
    const L=items(), sig=L.map(x=>x.cls+x.t).join("|")+cur+jOpen+[...document.querySelectorAll("#panel .mech-kv")].map(k=>k.querySelector(".det")?1:0).join("");
    if(sig===jSig)return;jSig=sig;
    const n=L.filter(x=>x.cls==="n").length, w=L.filter(x=>x.cls==="w").length, inf=L.length-n-w, lv=n?"ng":w?"warn":"ok";
    jBtn.className="hud-ic judge-b "+lv;
    jBtn.innerHTML=`<i class="fa-solid ${n+w?"fa-triangle-exclamation":"fa-circle-check"}"></i><span>${n+w||"OK"}</span>`;
    jBtn.title=n+w?`注意 ${n+w} 件(押すと一覧)`:"判定 OK — 注意なし";
    jBox.hidden=cur!=="ana"||!L.length;jBox.classList.toggle("open",jOpen);
    jSum.className="judge-sum "+lv;
    jSum.innerHTML=`<i class="fa-solid ${n+w?"fa-triangle-exclamation":"fa-circle-info"}"></i>注意 ${n+w} 件・情報 ${inf} 件<span>${jOpen?"▴":"▾"}</span>`;
    for(const key in tabSets){const {bar,secs}=tabSets[key];
      bar.querySelectorAll("button").forEach((b,i)=>{const mine=L.filter(x=>{const r=route(x.t);return r[0]===key&&r[1]===secs[i].name;});
        b.querySelector("em").className=mine.some(x=>x.cls==="n")?"ng":mine.some(x=>x.cls==="w")?"warn":mine.length?"info":"";});}
    for(const kv of document.querySelectorAll("#panel .mech-kv"))kv.nextElementSibling.hidden=!kv.querySelector(".det");
    if(!jPop.hidden)jPop.innerHTML=L.length?listHTML(L):'<p class="judge-none">注意はありません</p>';}
  jSum.addEventListener("click",()=>{jOpen=!jOpen;store.set("judge.open",jOpen?"1":"0");judge();});
  warnEl.addEventListener("click",e=>{const d=e.target.closest("[class]");if(d&&d.parentElement===warnEl)go(d.textContent);});
  jBtn.addEventListener("click",e=>{e.stopPropagation();jPop.hidden=!jPop.hidden;jSig="";judge();
    const r=jBtn.getBoundingClientRect();jPop.style.left=Math.max(6,Math.min(r.left-140,window.innerWidth-346))+"px";jPop.style.top=(r.bottom+8)+"px";});
  jPop.addEventListener("click",e=>{const d=e.target.closest("[data-t]");if(!d)return;jPop.hidden=true;go(d.dataset.t);});
  document.addEventListener("click",e=>{if(!jPop.hidden&&!jPop.contains(e.target))jPop.hidden=true;});

  /* ---- ガイド(手順・ルール・説明)の表示切替 ---- */
  const gBtn=$("btnGuide");
  const setGuide=on=>{document.body.classList.toggle("guides-off",!on);gBtn.classList.toggle("on",on);store.set("guide",on?"1":"0");};
  gBtn.addEventListener("click",()=>setGuide(document.body.classList.contains("guides-off")));
  setGuide(store.get("guide")!=="0");

  /* ---- 手順の図: いまの工程を光らせる(前の工程は済み) ---- */
  const FLOWS={
    change:l=>/組み替え|軸端部/.test(l)?0:/停止|抜取り|払出し/.test(l)?1:/継手|引き出す|回す|ラインへ入れる/.test(l)?2:/通板|ループテーブル/.test(l)?3:/運転再開/.test(l)?4:-1,
    swap:l=>/停止/.test(l)?0:/抜取り/.test(l)?1:/払出し/.test(l)?2:/継手を外す/.test(l)?3:/引き出す/.test(l)?4:/回す/.test(l)?5:/ラインへ入れる/.test(l)?6:/継手を入れる/.test(l)?7:/通板|ループテーブル|運転再開/.test(l)?8:-1,
    coil:()=>{if(st.state!=="CHANGE")return -1;const t=st.tChange;
      return t<CSW.lift?0:t<CSW.collapse?1:t<CSW.carOut?2:t<CSW.load?3:t<CSW.close?4:5;}};
  const stepEls=[...document.querySelectorAll("ol.steps[data-flow]")];let stepSig="";
  function steps(){judge();const l=KX.label||"";const sig=l+"|"+st.state+"|"+(st.state==="CHANGE"?Math.floor(st.tChange*4):0);
    if(sig===stepSig)return;stepSig=sig;
    for(const ol of stepEls){const i=FLOWS[ol.dataset.flow](l);
      [...ol.children].forEach((li,j)=>{li.classList.toggle("on",j===i);li.classList.toggle("done",i>=0&&j<i);});}}

  const last=store.get("cat");if(last&&CATS[last]&&window.innerWidth>700)open(last);
  return{open,viewOffset,steps,get cur(){return cur;}};
})();
