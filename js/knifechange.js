"use strict";
/* =========================================================
 * 刃替え段取り(2台のカッター台車の入れ替え)
 * =========================================================
 * 回転テーブルの枠には受け口が2つある(テーブル中心から横へ ±640・点対称)。
 * ラインの台車の受け口がレールの線に並んでいる間、もう1台(待機台車)はもう一方の受け口 =
 * 段取り位置にいて、次の刃組に組み替えられる(ラインは止めなくてよい)。
 *   入れ替え: ライン停止 → 通板材の抜取り(入側シャーで切り後端を巻き切る)→ 巻上りコイルの払出し
 *            → 駆動継手を外す → ①ラインの台車を引き出す(空いた受け口へ)
 *            → ③テーブルを 180° 回す(待機台車がレールの線に並ぶ)→ ①待機台車をラインへ入れる
 *            → 駆動継手を入れる → ループテーブル閉 → 通板 → ループテーブル復帰 → 運転再開
 *   待機台車の組み替え: ②軸端部を外す(受け口の着地土台へ送り出す)→ 条数を選んで組む → ②軸端部を戻す
 * できない操作は止めて、何を先にするかを言う(判定は blockReason の1箇所)。
 * =======================================================*/
const KX=(function(){
  const CARS=KC.CARS, SH=KC.SH, DUR={cpl:1.6,travel:10.0,open:2.5,rot:6.0};   // 走行はテーブルまで約 6.2m
  const q=[]; let cur=null, msg="", msgT=0;
  const near=(v,t)=>Math.abs(v-t)<1e-3;
  const busy=()=>!!cur||q.length>0;
  const lineBusy=()=>(!!cur&&!cur.side)||q.some(s=>!s.side);         // ラインに関わる手順が動いている(待機台車だけの②は除く)
  const onTable=c=>near(c.D.travel,1);
  const other=c=>CARS.find(x=>x!==c);
  const lineCar=()=>CARS.find(c=>!onTable(c))||null;                 // ラインの台車(レールの上の台車)
  const inLine=()=>{const c=lineCar();return !!c&&near(c.D.travel,0);};
  const aligned=()=>near(SH.rot,0)?0:near(SH.rot,1)?1:-1;            // レールの線に並んでいる受け口
  const railCar=()=>{const a=aligned();return a<0?null:CARS.find(c=>c.D.slot===a&&onTable(c))||null;};
  const opCar=()=>{const a=aligned();return a<0?null:CARS.find(c=>c.D.slot!==a&&onTable(c))||null;};   // 段取り位置の台車
  function say(t){msg=t;msgT=t?4.5:0;}

  /* 1工程 = {label, car(居場所の表示に出す台車), start(), run(dt)→終わったら true, done()} */
  function tween(obj,key,to,label,doneMsg,car,hook){return{label,car,
    start(){this.from=obj[key];if(hook&&hook.start)hook.start();},
    run(dt){const d=to-this.from;if(Math.abs(d)<1e-6)return true;
      obj[key]=THREE.MathUtils.clamp(obj[key]+Math.sign(d)*dt/DUR[key],Math.min(this.from,to),Math.max(this.from,to));
      KC.pose();return near(obj[key],to);},
    done(){obj[key]=to;KC.pose();if(hook&&hook.done)hook.done();
      const m=typeof doneMsg==="function"?doneMsg():doneMsg;if(m)say(m);}};}
  const stopLine={label:"ライン停止(減速中)",
    start(){st.state="KNIFE";},
    run(){return st.v<=0.004;}};
  const unthread={label:"通板材の抜取り(入側シャーで切断・後端を巻取り)",
    start(){if(!st.thread){this.skip=true;return;}this.skip=false;thread.mode="out";thread.s=0;},
    run(dt){if(this.skip)return true;thread.s+=THREAD_V*dt;return thread.need>0&&thread.s>=thread.need;},
    done(){if(this.skip)return;thread.mode=null;st.thread=0;
      st.loop1Tgt=0;st.loop2Tgt=0;                                            // 空になったピットのテーブルを閉じる
      say("帯板を抜き取りました。ギヤボックスがパスラインを横切れます。");}};
  const unload={label:"巻上りコイルの払出し(出側コイルカー)",                 // 後端まで巻いたコイルを降ろす
    start(){this.t=0;this.skip=st.rr<=RCL.coreR()+1e-3;st.swapped=false;},
    run(dt){if(this.skip)return true;this.t+=dt;return coilSwap(this.t,false);}};
  const closeTables={label:"ループテーブル閉(通板準備)",
    start(){st.loop1Tgt=0;st.loop2Tgt=0;},
    run(){return st.loop1<0.01&&st.loop2<0.01;}};
  const doThread={label:"通板(入側シャー → リコイラ・屑巻取機)",
    start(){thread.mode="in";thread.s=0;thread.need=0;},
    run(dt){thread.s+=THREAD_V*dt;return thread.need>0&&thread.s>=thread.need;},
    done(){thread.mode=null;st.thread=1;say("通板しました。");}};
  const reopen={label:"ループテーブル復帰",                                   // ルーパー操作の選択どおりへ戻す
    start(){st.loop1Tgt=ui.chkLoop1.checked?1:0;st.loop2Tgt=ui.chkLoop2.checked?1:0;},
    run(){return Math.abs(st.loop1-st.loop1Tgt)<0.01&&Math.abs(st.loop2-st.loop2Tgt)<0.01;}};
  const resume={label:"運転再開",start(){st.state="RUN";},run(){return true;},
    done(){const c=KC.active;
      say(st.paused?`${c.name}(${c.N}条)をラインへセットしました(ライン停止中)。`:`${c.name}(${c.N}条)をラインへセットしました。運転を再開します。`);}};

  const DECOUPLE=()=>tween(SH,"cpl",0,"駆動継手を外す");
  const COUPLE=()=>tween(SH,"cpl",1,"駆動継手を入れる");
  const PULL=c=>tween(c.D,"travel",1,`①${c.name}を引き出す(レール走行)`,`${c.name}を回転テーブルの受け口へ引き出しました。`,c);
  // ラインへ入れ始めた台車がラインの台車になる(条数・帯板・リコイラのスプールを合わせ直すのは api.onSwap)
  const PUSH=c=>tween(c.D,"travel",0,`①${c.name}をラインへ入れる(レール走行)`,`${c.name}をライン位置へ入れました。`,c,
    {start(){if(KC.active!==c){KC.setActive(c);if(api.onSwap)api.onSwap(c);}}});
  const OPEN=c=>tween(c.D,"open",1,`②${c.name}の軸端部を外す(着地土台へ送り出し)`,
    `${c.name}の軸端部を 330mm 送り出しました。軸の先が剥き出しで、刃組を組み替えられます。`,c);
  const CLOSE=c=>tween(c.D,"open",0,`②${c.name}の軸端部を戻す`,`${c.name}の軸端部を戻しました。`,c);
  const ROT=()=>tween(SH,"rot",near(SH.rot,0)?1:0,"③テーブルを回す(180°)",
    ()=>{const r=railCar();return r?`テーブルを回しました。${r.name}がレールの線に並びました。`:"テーブルを回しました。";});
  const OUT_PRE=()=>[stopLine,unthread,unload,DECOUPLE()];
  const IN_POST=()=>[COUPLE(),closeTables,doThread,reopen,resume];

  /* 手順の可否(WaveLog blockReason と同じ言葉)。step: all(入れ替え/セット)・pull・open・spin */
  function blockReason(step){
    if(busy())return "動いている間は押せません。";
    const L=lineCar();
    if(step==="open"){                                                  // 待機台車の組み替えはライン運転中でもよい
      if(aligned()<0)return "テーブルが回りきっていません。";
      return opCar()?"":"段取り位置(レールの線から外れた受け口)に台車がありません。";}
    if(st.state==="DECEL"||st.state==="CHANGE")return "コイル交換中は段取りに入れません。";
    if(step==="all"){
      if(L)return aligned()===L.D.slot?"":"先に「③」でテーブルを回し、空いた受け口をレールの線に戻します。";
      return railCar()?"":"レールの線に並んだ受け口に台車がありません。「③」でテーブルを回して並べます。";}
    if(step==="pull"){
      if(L)return aligned()===L.D.slot?"":"先に「③」でテーブルを回し、空いた受け口をレールの線に戻します。";
      const r=railCar();
      if(!r)return "レールの線に並んだ受け口に台車がありません。「③」でテーブルを回して並べます。";
      if(!near(r.D.open,0))return `先に「②」で${r.name}の軸端部を戻します。`;
      return "";}
    if(step==="spin"){
      if(L)return `ラインに${L.name}がある間は回せません。先に「①」で回転テーブルへ引き出します。`;
      const o=CARS.find(c=>!near(c.D.open,0));
      if(o)return `先に「②」で${o.name}の軸端部を戻します(外したままは回せません)。`;
      return "";}
    return "";}
  function run(list,side){for(const s of list){s.side=!!side;q.push(s);}}
  function act(step){const why=blockReason(step);if(why){say(why);return false;}
    const L=lineCar();
    if(step==="pull")run(L?[...OUT_PRE(),PULL(L)]:[PUSH(railCar()),...IN_POST()]);
    else if(step==="open"){const o=opCar();run([near(o.D.open,1)?CLOSE(o):OPEN(o)],true);}
    else if(step==="spin")run([ROT()]);
    return true;}
  /* まとめて: 入れ替え(ラインの台車 → 待機台車・運転再開まで)/ ラインが空ならレールの線の台車をセット */
  function toggleAll(){
    const why=blockReason("all");if(why){say(why);return false;}
    const L=lineCar(), list=[];
    if(L){const S=other(L);
      if(!near(S.D.open,0))list.push(CLOSE(S));                        // 組み替え中の軸端部は先に戻す
      list.push(...OUT_PRE(),PULL(L),ROT(),PUSH(S),...IN_POST());}
    else{const r=railCar();list.push(PUSH(r),...IN_POST());}
    run(list);return true;}
  /* ボタンの言葉(いま押すと何をするか)。手順ボタンは [動作, 相手の台車] */
  function plan(){const L=lineCar(), r=railCar(), o=opCar();
    return{all:L?`台車を入れ替える(${L.name} → ${other(L).name})`:r?`${r.name}をラインへセット`:"台車をラインへセット",
      pull:L?["①引き出す",L.name]:r?["①ラインへ",r.name]:["①引き出す",""],
      open:o?[near(o.D.open,1)?"②軸端部戻し":"②軸端部外し",o.name]:["②軸端部外し",""],
      spin:["③回す","テーブル180°"]};}

  function step(dt){
    if(msgT>0){msgT-=dt;if(msgT<=0)msg="";}
    for(let guard=0;guard<4;guard++){
      if(!cur){cur=q.shift()||null;if(!cur)return;if(cur.start)cur.start();}
      if(!cur.run(dt))return;
      if(cur.done)cur.done();cur=null;dt=0;}}

  /* 台車の居場所(画面の読み出し)。c を省くとラインの様子 */
  function where(c){
    if(!c){const L=lineCar();return L?`${L.name} ${where(L)}`:"ラインに台車なし(2台とも回転テーブル)";}
    if(cur&&cur.car===c)return cur.label;
    const D=c.D;
    if(near(D.travel,0))return st.state==="KNIFE"?"ライン内(段取り中)":"ライン内(運転位置)";
    if(!onTable(c))return "レール上";
    const a=aligned();
    return (a<0?"回転テーブル(旋回中)":a===D.slot?"回転テーブル(レールの線)":"回転テーブル(段取り位置)")+
      (near(D.open,1)?"・軸端部外し":"");}
  const api={act,toggleAll,step,blockReason,where,plan,busy,lineBusy,inLine,lineCar,railCar,opCar,onSwap:null,
    get note(){return msg;}, get label(){return cur?cur.label:"";}, get car(){return cur?cur.car:null;}};
  return api;
})();
