"use strict";
/* =========================================================
 * 材料・力学の画面(材質・張力・レベラー・切断面・表示・判定)
 * ---------------------------------------------------------
 * 操作は MECH.set / MECH.view を書き換えるだけ(形は次のフレームで mech.js・strip.js が作り直す)。
 * 読み出しは 0.3 秒ごと。通板の見通し(支点の間隔ごとの自由垂れ)は経路を組み直すので 2 秒ごと。
 * =======================================================*/
const mechUI=(function(){
  const $=id=>document.getElementById(id);
  const esc=t=>String(t).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const mm=v=>fmt(v*1000,v*1000<10?1:0);
  const MS=MECH.set,MV=MECH.view;

  /* ---- 材質 ---- */
  const sel=$("mechMat");
  sel.innerHTML=MECH.MATS.map(m=>`<option value="${m.id}">${m.id}(${esc(m.note)})</option>`).join("");
  sel.value=MECH.mat.id;
  sel.addEventListener("change",()=>{MECH.setMaterial(sel.value);sync(true);});

  /* ---- 張力 ---- */
  const slider=(id,vid,get,set,dg)=>{const r=$(id),v=$(vid);r.value=get();v.textContent=(+get()).toFixed(dg);
    r.addEventListener("input",()=>{set(+r.value);v.textContent=(+r.value).toFixed(dg);sync(true);});return r;};
  slider("rngMechUnc","mechUncV",()=>MS.sUnc,v=>{MS.sUnc=v;},1);
  slider("rngMechWind","mechWindV",()=>MS.sWind,v=>{MS.sWind=v;},1);

  /* ---- レベラー(自動 / 手で入側・出側) ---- */
  const chkAuto=$("chkLevAuto"),rD1=$("rngLevD1"),rD2=$("rngLevD2");
  chkAuto.checked=MS.levAuto;
  chkAuto.addEventListener("change",()=>{MS.levAuto=chkAuto.checked;sync(true);});
  const manual=(k,r)=>r.addEventListener("input",()=>{MS.levAuto=false;chkAuto.checked=false;MS[k]=+r.value/1000;
    if(k==="d1"&&MS.d2>MS.d1){MS.d2=MS.d1;}if(k==="d2"&&MS.d2>MS.d1){MS.d1=MS.d2;}sync(true);});
  manual("d1",rD1);manual("d2",rD2);

  /* ---- 切断面 ---- */
  slider("rngEdgeR","mechEdgeRV",()=>MS.edgeR,v=>{MS.edgeR=v;},3);

  /* ---- 表示 ---- */
  $("mechStress").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    MV.stress=b.dataset.v;document.querySelectorAll("#mechStress button").forEach(x=>x.classList.toggle("active",x===b));
    applyStripMaterial();sync(true);});
  $("chkBurr").addEventListener("change",e=>{MV.burr=e.target.checked;});
  slider("rngBurrX","burrXV",()=>MV.burrX,v=>{MV.burrX=v;},0);
  slider("rngWaveX","waveXV",()=>MV.waveX,v=>{MV.waveX=v;},0);

  /* ======================================================
   * 図(SVG)
   * ====================================================*/
  /* 張力の区間(ライン全長 — 単位張力は平方根の目盛りで、ループ区間の小さな値も見えるように) */
  function tensionSVG(){const S=MECH.S,t=S.t,Wt=270,Ht=100,x0=UNC_X-0.4,x1=REC_X+0.6,X=x=>8+(x-x0)/(x1-x0)*(Wt-16);
    const l1=loop1Shape&&!loop1Shape.flat?loop1Shape:null, run=MECH.running(), l2=loop2Info.filter(x=>x&&!x.flat);
    const H2=l2.length?l2.reduce((a,x)=>a+x.H,0)/l2.length:0;
    const sU=MECH.tau("unc")/t/1e6, sW=MECH.tau("wind")/t/1e6, s1=run&&l1?l1.H/t/1e6:0, s2=run&&l2.length?H2/t/1e6:0;
    const Z=[{a:UNC_X,b:R.C1.x,s:sU},{a:R.C1.x,b:R.J2.x,s:0},{a:R.J2.x,b:0,s:Math.max(0,s1)},{a:0,b:R.W1.x,s:Math.max(0,s2)},{a:R.W1.x,b:REC_X,s:sW}];
    const smax=Math.max(1,sU,sW)*1.15, base=Ht-24, Y=v=>base-(base-12)*Math.sqrt(Math.max(0,v)/smax);
    let d=`M${X(Z[0].a).toFixed(1)},${base}`;for(const z of Z)d+=`L${X(z.a).toFixed(1)},${Y(z.s).toFixed(1)}L${X(z.b).toFixed(1)},${Y(z.s).toFixed(1)}`;
    d+=`L${X(REC_X).toFixed(1)},${base}Z`;
    const lab=(z,txt,dy)=>`<text x="${((X(z.a)+X(z.b))/2).toFixed(1)}" y="${(Y(z.s)-4+(dy||0)).toFixed(1)}" class="v" text-anchor="middle">${txt}</text>`;
    const f=v=>v>=1?fmt(v,1):v>=0.01?fmt(v,3):v>0?"≈0":"0";
    const ticks=[[UNC_X,"UC"],[-9.45,"LV"],[SHEAR_X,"SH"],[(PIT1.x0+PIT1.x1)/2,"L1"],[0,"SL"],[(PIT2.x0+PIT2.x1)/2,"L2"],[MD_X,"MD"],[REC_X,"RC"]];
    return `<svg viewBox="0 0 ${Wt} ${Ht}" class="mchart">
      <line x1="8" y1="${base}" x2="${Wt-8}" y2="${base}" class="ax"/>
      <path d="${d}" class="fillT"/>
      ${lab(Z[0],f(sU))}${lab(Z[2],f(s1),-2)}${lab(Z[3],f(s2),-2)}${lab(Z[4],f(sW))}
      ${ticks.map(([x,t])=>`<line x1="${X(x).toFixed(1)}" y1="${base}" x2="${X(x).toFixed(1)}" y2="${base+3}" class="ax"/><text x="${X(x).toFixed(1)}" y="${base+12}" class="k" text-anchor="middle">${t}</text>`).join("")}
      <text x="8" y="10" class="k">単位張力 N/mm²(√目盛)${run?"":" — 未通板・ループ/巻取りは張力なし"}</text></svg>`;}
  /* 板厚方向の残留応力(レベラーを出た帯・除荷後) */
  function fiberSVG(){const c=MECH.curl,S=MECH.S;if(!c)return"";const Wt=270,Ht=74,xm=Wt/2,sx=(Wt/2-28)/S.sy,y0=12,y1=Ht-12;
    const Y=y=>y0+(S.t/2-y)/S.t*(y1-y0);
    let d="";c.resid.forEach((s,i)=>{const x=xm+Math.max(-1.3,Math.min(1.3,s/S.sy))*S.sy*sx;d+=(i?"L":"M")+x.toFixed(1)+","+Y(c.y[i]).toFixed(1);});
    const mx=Math.max(...c.resid.map(Math.abs))/1e6;
    return `<svg viewBox="0 0 ${Wt} ${Ht}" class="mchart">
      <rect x="${xm-S.sy*sx}" y="${y0}" width="${2*S.sy*sx}" height="${y1-y0}" class="band"/>
      <line x1="${xm}" y1="${y0-3}" x2="${xm}" y2="${y1+3}" class="ax"/>
      <path d="M${xm},${y0}${d.replace(/^M/,"L")}L${xm},${y1}" class="fillR"/><path d="${d}" class="lineR"/>
      <text x="4" y="${y0+4}" class="k">上面</text><text x="4" y="${y1}" class="k">下面</text>
      <text x="${xm-S.sy*sx}" y="${Ht-1}" class="k" text-anchor="middle">−σ0.2</text><text x="${xm+S.sy*sx}" y="${Ht-1}" class="k" text-anchor="middle">+σ0.2</text>
      <text x="${Wt-4}" y="${y0+4}" class="v" text-anchor="end">残留 最大 ${fmt(mx,1)} N/mm²</text></svg>`;}
  /* 切り口の断面(拡大)。下バリ: 上面の角がだれ → せん断面 → 破断面 → 下面の角にバリ。上バリは上下逆 */
  function edgeSVG(e,down){const Wt=270,Ht=96,T=58,top=16,bot=top+T,xe=150,k=T/e.t;
    const hr=e.hr*k,hs=e.hs*k,hb=Math.max(2.5,e.hb*k),fx=Math.max(3,e.clr*k),wr=Math.max(6,2.2*e.hr*k);
    const fy=v=>down?v:top+bot-v;                                          // 上バリは上下を反転
    const P=[[0,top],[xe-wr,top]];
    for(let j=1;j<=8;j++){const a=j/8*Math.PI/2;P.push([xe-wr+wr*Math.sin(a),top+hr*(1-Math.cos(a))]);}
    P.push([xe,top+hr+hs],[xe+fx,bot],[xe+fx+1.5,bot+hb],[xe+fx-2.5,bot+hb*0.4],[xe+fx-4.5,bot],[0,bot]);
    const pts=P.map(([x,y])=>x.toFixed(1)+","+fy(y).toFixed(1)).join(" ");
    const ln=(xa,ya,xb,yb,cls)=>`<line x1="${xa.toFixed(1)}" y1="${fy(ya).toFixed(1)}" x2="${xb.toFixed(1)}" y2="${fy(yb).toFixed(1)}" class="${cls}"/>`;
    const lab=(y,txt,cls)=>`<text x="${xe+fx+12}" y="${(fy(y)+3).toFixed(1)}" class="${cls||"v"}">${txt}</text>`;
    return `<svg viewBox="0 0 ${Wt} ${Ht}" class="mchart">
      <polygon points="${pts}" class="plate"/>
      ${ln(xe,top+hr,xe,top+hr+hs,"burnish")}${ln(xe,top+hr+hs,xe+fx,bot,"fract")}
      <path d="M${xe-wr},${fy(top)} ${P.slice(2,10).map(([x,y])=>"L"+x.toFixed(1)+","+fy(y).toFixed(1)).join(" ")}" class="roll"/>
      <polyline points="${[[xe+fx,bot],[xe+fx+1.5,bot+hb],[xe+fx-2.5,bot+hb*0.4]].map(([x,y])=>x+","+fy(y)).join(" ")}" class="burrL"/>
      ${(()=>{let ys=[top+hr/2,top+hr+hs/2,top+hr+hs+(T-hr-hs)/2,bot+hb/2+4];for(let i=1;i<4;i++)ys[i]=Math.max(ys[i],ys[i-1]+11);
        const L=[["だれ "+fmt(e.hr*1000,0)+"μm","roll-t"],["せん断面 "+fmt(e.hs*1000,0)+"μm","bur-t"],["破断面 "+fmt(e.hf*1000,0)+"μm","k"],["バリ "+fmt(e.hb*1000,1)+"μm","burr-t"]];
        return L.map(([t,c],i)=>lab(down?ys[i]:top+bot-ys[i],t,c)).join("");})()}
      <text x="4" y="10" class="k">切り口の断面(${down?"下バリ":"上バリ"}・板厚 ${fmt(e.t,2)}mm を拡大)</text>
      <text x="4" y="${Ht-3}" class="k">← 製品(条)側</text></svg>`;}

  /* ======================================================
   * 読み出し
   * ====================================================*/
  const row=(k,v,cls)=>`<div class="r"><span>${k}</span><b class="${cls||""}">${v}</b></div>`;
  const dirWord=k=>k>1e-4?"上反り":k<-1e-4?"下反り":"平ら";
  const Rtxt=k=>Math.abs(k)<1e-3?"—(弾性・残らない)":`R ${Math.abs(k)>0.5?fmt(1000/Math.abs(k),0)+" mm":fmt(1/Math.abs(k),1)+" m"}・${dirWord(k)}`;
  let tc=null,tcKey="";
  function threadInfo(){const key=[MECH.mat.id,MECH.mat.E,MECH.mat.rho,st.thick,MECH.curl&&MECH.curl.kRes.toFixed(3),st.N,MS.guide].join("|");
    if(key!==tcKey){tcKey=key;try{tc=threadCheck();}catch(e){tc=[];}}                 // 形が変わったときだけ(経路を組み直すので重い)
    return tc||[];}
  /* 反りの見え方: 自然曲率 κ の帯が 1m 先で元の向きからどれだけ離れるか(円弧・半周で頭打ち) */
  const curlDev=(k,L)=>{const a=Math.abs(k);if(a<1e-9)return 0;const R0=1/a;return Math.sign(k)*R0*(1-Math.cos(Math.min(L/R0,Math.PI)));};
  const setHTML=(id,h)=>{const e=$(id);if(e._h!==h){e._h=h;e.innerHTML=h;}};
  function warnings(c,e,S,tcs){const W=[];const sy=MECH.mat.sy;
    if(MS.sWind>0.3*sy)W.push(["n",`巻取張力 ${fmt(MS.sWind,1)} N/mm² は耐力の ${fmt(MS.sWind/sy*100,0)}% — 条の伸び・ネッキング・破断の恐れ`]);
    else if(MS.sWind>0.15*sy)W.push(["w",`巻取張力が耐力の ${fmt(MS.sWind/sy*100,0)}% — 軟質材は伸び(幅縮み)に注意`]);
    if(MS.sUnc>0.2*sy)W.push(["w",`巻戻し張力が耐力の ${fmt(MS.sUnc/sy*100,0)}%`]);
    const lk=[["No.1",loop1Shape],["No.2",loop2Info.find(x=>x&&!x.flat)]];
    for(const [n,l] of lk)if(l&&!l.flat){const k=Math.max(Math.abs(l.kmax),Math.abs(l.kmin),Math.abs(l.Min||0)/S.D),eb=k*S.t/2;
      if(eb>S.ey)W.push(["w",`${n}ループで曲げが降伏(曲げひずみ ${fmt(eb*100,2)}% > 耐力 ${fmt(S.ey*100,2)}%)— ループ癖(折れ)の恐れ`]);}
    const d1m=Math.abs(curlDev(c.kRes,1))*1000;
    if(d1m>20)W.push(["w",`通板先端の${dirWord(c.kRes)}: 1m 先で ${fmt(d1m,0)}mm — ${MS.levAuto?"レベラーで取り切れない(ロール径が大きく降伏しない)":"レベラーの押込みを見直す(自動にすると最小)"}`]);
    if(e.judge!=="ok")W.push([e.judge==="ng"?"n":"w",`バリ高さ ${fmt(e.hb*1000,1)}μm = 板厚の ${fmt(e.pct,1)}% — ${e.cj!=="ok"?"クリアランス":"刃先の摩耗(研磨)"}を見直す`]);
    if(e.cj!=="ok")W.push(["w",`クリアランス ${fmt(e.ct*100,1)}% は${e.cj==="large"?"大きすぎ(引きちぎり・バリ大)":"小さすぎ(二次せん断・刃の摩耗)"} — 目安 ${fmt(e.copt*100,1)}%`]);
    const jams=tcs.filter(x=>x.jam);
    if(jams.length)W.push(["i",`通板: ガイドなしでは先端が ${jams.length} か所でロールの中心より下に当たる(最大の自由垂れ ${fmt(Math.abs(Math.min(...jams.map(x=>x.d)))*1000,0)}mm)— ガイド板・エプロンで支える前提`]);
    const f=flatAt(MECH.tau("unc"));if(st.shape!=="flat"&&st.shapeI>0&&f.sig.some(s=>s<0))W.push(["i",`板形状: 巻戻し張力 ${fmt(MS.sUnc,1)} N/mm² でも${st.shape==="edge"?"耳":"中央"}が圧縮(最小 ${fmt(Math.min(...f.sig)/1e6,1)} N/mm²)— 板波が出る`]);
    return W;}
  let uiT=0;
  function sync(force,dt){uiT+=dt||0;if(!force&&uiT<0.3)return;uiT=0;
    const S=MECH.S,c=MECH.curl,m=MECH.mat;if(!S||!c)return;
    if(sel.value!==m.id)sel.value=m.id;
    // 材料
    setHTML("mechProps",[["E",fmt(m.E,1),"GPa"],["σ0.2",fmt(m.sy,0),"MPa"],["σB",fmt(m.su,0),"MPa"],
      ["伸び",fmt(m.el,0),"%"],["l_c",fmt(S.lc*1000,0),"mm"],["自重",fmt(S.q,1),"N/m²"]].map(([k,v,u])=>`<div><span>${k}</span><b>${v}<small>${u}</small></b></div>`).join(""));
    // 張力
    setHTML("mechTension",tensionSVG());
    const wsum=strandW.reduce((a,w)=>a+w,0);
    const lrow=(n,l,W)=>{if(!l||l.flat)return row(n+"ループ","テーブル閉(ループ無し)");
      const f=MECH.lift(l.phiIn,(n==="No.1"?LOOP1:LOOP2).clampIn),lh=f.len?Math.max(...[0.1,0.2,0.25,0.3,0.4,0.5].map(q=>f.y(f.len*q))):0;
      return row(n+"ループ",`深さ ${fmt(l.d,2)}m・入口 ${fmt(l.phiIn*57.296,0)}°/出口 ${fmt(l.phiOut*57.296,0)}°`)+
        row("　水平力(自重)",`${fmt(l.H*W,1)} N${l.H<0?"(圧縮)":""}・支点反力 ${fmt((l.Vin+l.Vout)/2*W,0)} N`)+
        row("　台からの持ち上がり",`${fmt(lh*1000,0)} mm(ロールから ${fmt(f.len,2)} m)`);};
    setHTML("mechLoops",'<div class="mech-kv">'+lrow("No.1",loop1Shape,STRIP_W)+lrow("No.2",loop2Info.find(x=>x&&!x.flat),wsum/Math.max(1,strandW.length))+
      row("巻取張力(全条)",`${fmt(MS.sWind*S.t*1000*wsum,2)} kN(${fmt(MS.sWind,1)} N/mm² × ${fmt(wsum*1000,0)}mm × ${fmt(S.t*1000,2)}mm)`)+'</div>');
    // 反り
    if(document.activeElement!==rD1)rD1.value=Math.round(MS.d1*1000);if(document.activeElement!==rD2)rD2.value=Math.round(MS.d2*1000);
    $("levD1V").textContent=Math.round(MS.d1*1000);$("levD2V").textContent=Math.round(MS.d2*1000);chkAuto.checked=MS.levAuto;
    const lr=c.levRolls, lastYield=c.plastLast, d1m=curlDev(c.kRes,1)*1000;
    setHTML("mechCurl",row("コイルの巻き癖(φ"+fmt(st.ru*2000,0)+")",Rtxt(c.kCoil))+
      row("ベンドロール B(φ100)の後",Rtxt(c.kBeforeLev))+
      row("レベラーの後 = 通板先端",Rtxt(c.kRes),Math.abs(d1m)>20?"warn":"ok")+
      row("　先端 1m の反り",`${d1m>0?"+":""}${fmt(d1m,1)} mm`)+
      row("　レベラー 塑性率 最大/最終",`${fmt(c.plast*100,0)}% / ${fmt(lastYield*100,0)}%`)+
      row("　ロールでの曲率",lr.map(r=>`${r.id.replace("E","")}:${fmt(Math.abs(r.k),1)}`).join(" "))+
      row("製品の巻き癖(巻径φ"+fmt(st.rr*2000,0)+")",Rtxt(c.kProd)));
    setHTML("mechFiber",fiberSVG());
    // 垂れ
    const tcs=threadInfo(), worst=tcs.reduce((a,x)=>!a||Math.abs(x.d)>Math.abs(a.d)?x:a,null);
    const sag0=MECH.sagAt(0.2,0.4,S.q,0,S.D), sagW=MECH.sagAt(0.42,0.84,S.q,MECH.set.sWind*1e6*S.t,S.D);
    setHTML("mechSag",row("0.4m スパン・張力ゼロ",`${fmt(sag0*1000,2)} mm`)+
      row("0.84m スパン・巻取張力",`${fmt(sagW*1000,3)} mm`)+
      (worst?row("通板先端の自由垂れ(大たわみ)最大",`${fmt(Math.abs(worst.d)*1000,0)} mm(${worst.label} x=${fmt(worst.x,2)}・間隔 ${fmt(worst.gap,2)}m)`,worst.jam?"warn":"ok"):"")+
      row("　ロール中心より下に当たる所",`${tcs.filter(x=>x.jam).length} / ${tcs.length} スパン`)+
      (headInfo.on?row("いまの先端",`自由 ${fmt(Math.abs(headInfo.free)*1000,0)} mm → ガイドで ${fmt(Math.abs(headInfo.guided)*1000,0)} mm(片持ち ${fmt(headInfo.len,2)}m)`,headInfo.jam?"warn":"ok"):""));
    // 切断面
    const e=MECH.edge(), nd=strandBurr.filter(b=>b==="down").length, nu=strandBurr.length-nd;
    setHTML("mechEdge",row("クリアランス / 板厚",`${fmt(e.clr,3)} mm = ${fmt(e.ct*100,1)}%(目安 ${fmt(e.copt*100,1)}%)`,e.cj==="ok"?"ok":"warn")+
      row("バリ高さ",`${fmt(e.hb*1000,1)} μm = 板厚の ${fmt(e.pct,1)}%`,e.judge)+
      row("だれ / せん断面 / 破断面",`${fmt(e.hr*1000,0)} / ${fmt(e.hs*1000,0)} / ${fmt(e.hf*1000,0)} μm`)+
      row("バリの向き(刃組)",`下バリ ${nd} 条・上バリ ${nu} 条${KC.D3.ctx?"(":""}${KC.D3.ctx?({none:"千鳥",down:"下バリ揃え",up:"上バリ揃え"})[KC.D3.ctx.st.align]+")":""}`));
    setHTML("mechEdgeFig",edgeSVG(e,(strandBurr[0]||"down")==="down"));
    M.burr.color.setHex(e.judge==="ok"?0xffa640:e.judge==="warn"?0xff7a1a:0xff3b2f);
    // 条ごと
    const tW=MECH.tau("wind");
    setHTML("mechStrands",`<table><thead><tr><th>条</th><th>幅mm</th><th>張力N</th><th>ループm</th><th>バリ</th><th>曲がり<small>mm/2m</small></th></tr></thead><tbody>`+
      strandW.map((w,i)=>{const l=loop2Info[i];return `<tr><td>${i+1}</td><td>${fmt(w*1000,1)}</td><td>${fmt(tW*w,0)}</td><td>${l&&!l.flat?fmt(l.d,3):"—"}</td>`+
        `<td>${strandBurr[i]==="down"?"下↓":"上↑"}</td><td>${fmt((strandCamber[i]||0)*2*1000,2)}</td></tr>`;}).join("")+`</tbody></table>`);
    // 判定
    setHTML("mechWarn",warnings(c,e,S,tcs).map(([k,t])=>`<div class="${k}">${esc(t)}</div>`).join(""));
    // 板形状の残留応力(張力ゼロのとき・幅の中央と耳)
    {const f=flatAt(0),mid=f.sig[(f.sig.length-1)>>1],edge=(f.sig[0]+f.sig[f.sig.length-1])/2;
      $("roResid").textContent=st.shape==="flat"||!st.shapeI?"0 / 0 N/mm²":`${fmt(mid/1e6,1)} / ${edge>0?"+":""}${fmt(edge/1e6,1)} N/mm²`;}
    // 応力の凡例
    const lg=$("stressLegend");lg.hidden=MV.stress==="off";
    if(MV.stress==="membrane"){const r=Math.max(2,Math.ceil(Math.max(stressView.max,MS.sWind,MS.sUnc)*1.1));stressView.range=r;
      $("slTitle").textContent="膜応力(張力 + 板形状の残留応力)N/mm² — 青: 圧縮(板波)/ 赤: 引張";
      $("slBar").style.background="linear-gradient(90deg,#3b62f2,#dde0e6,#f0503a)";
      $("slAx").innerHTML=`<span>−${r}</span><span>0</span><span>+${r}</span>`;}
    else if(MV.stress==="surface"){$("slTitle").textContent=`表面の応力 / 耐力(張力 + 残留 + 曲げ E·t·κ/2)— 最大 ${fmt(stressView.maxU,2)}`;
      $("slBar").style.background="linear-gradient(90deg,#335cE6 0%,#2ec785 41%,#f2d933 66%,#f55c29 83%,#db38c7 100%)";
      $("slAx").innerHTML="<span>0</span><span>0.5</span><span>0.8</span><span>1.0(降伏)</span><span>1.2+</span>";}}
  sync(true);
  return{sync};
})();
