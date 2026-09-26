"use strict";
/* =========================================================
 * 刃替え段取り(カッター台車の出し入れ)
 * =========================================================
 * 刃組ガイダンスの段取りの3手順(①引き出す ②軸端部を外す ③台車を回す)を、
 * ラインの前後の手順と一緒に**実機と同じ順でしか進めない**:
 *   ラインから出す: ライン停止 → 通板材の抜取り(入側シャーで切り後端を巻き切る)
 *                  → 駆動継手を外す → ①引き出す → ②軸端部を外す → ③台車を回す
 *   ラインへセット: ③台車を戻す → ②軸端部を戻す → ①ラインへ戻す → 駆動継手を入れる
 *                  → ループテーブル閉 → 通板 → ループテーブル復帰 → 運転再開
 * できない操作は止めて、何を先にするかを言う(判定は blockReason の1箇所)。
 * =======================================================*/
const KX=(function(){
  const D=KC.D3, DUR={cpl:1.6,travel:6.0,open:2.5,rot:4.0};
  const q=[]; let cur=null, msg="", msgT=0;
  const near=(v,t)=>Math.abs(v-t)<1e-3;
  const busy=()=>!!cur||q.length>0;
  const inLine=()=>near(D.travel,0);
  const onTable=()=>near(D.travel,1);
  function say(t){msg=t;msgT=t?4.5:0;}

  /* 1工程 = {label, start(), run(dt)→終わったら true, done()} */
  const anim=(key,to,label,doneMsg)=>({label,
    start(){this.from=D[key];},
    run(dt){const d=to-this.from;if(Math.abs(d)<1e-6)return true;
      D[key]=THREE.MathUtils.clamp(D[key]+Math.sign(d)*dt/DUR[key],Math.min(this.from,to),Math.max(this.from,to));
      KC.pose();return near(D[key],to);},
    done(){D[key]=to;KC.pose();if(doneMsg)say(doneMsg);}});
  const stopLine={label:"ライン停止(減速中)",
    start(){st.state="KNIFE";},
    run(){return st.v<=0.004;}};
  const unthread={label:"通板材の抜取り(入側シャーで切断・後端を巻取り)",
    start(){if(!st.thread){this.skip=true;return;}thread.mode="out";thread.s=0;},
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
    done(){say(st.paused?"カッター台車をラインへセットしました(ライン停止中)。":"カッター台車をラインへセットしました。運転を再開します。");}};

  const OUT_PRE=()=>[stopLine,unthread,unload,anim("cpl",0,"駆動継手を外す")];
  const PULL=()=>anim("travel",1,"①引き出す(レール走行)","レールに沿って引き出しました。回転テーブルの上です。");
  const BACK=()=>anim("travel",0,"①ラインへ戻す(レール走行)","ライン位置へ戻しました。");
  const OPEN=()=>anim("open",1,"②軸端部を外す(着地土台へ送り出し)","軸端部を 330mm 送り出しました。テーブルの外の土台に降り、軸の先が剥き出しです。");
  const CLOSE=()=>anim("open",0,"②軸端部を戻す","軸端部を戻しました。");
  const SPIN=()=>anim("rot",1,"③台車を回す(回転テーブル 180°)","台車を回しました。軸端部を外した側から部材を入れられます。");
  const UNSPIN=()=>anim("rot",0,"③台車を戻す","台車を戻しました。運転の向きです。");
  const IN_POST=()=>[anim("cpl",1,"駆動継手を入れる"),closeTables,doThread,reopen,resume];

  /* 手順の可否(WaveLog blockReason と同じ言葉) */
  function blockReason(step){
    if(busy())return "動いている間は押せません。";
    if(st.state==="DECEL"||st.state==="CHANGE")return "コイル交換中は段取りに入れません。";
    if(step==="pull"){
      if(!near(D.rot,0))return "先に「③台車を回す」で向きを戻します。";
      if(!near(D.open,0))return "先に「②軸端部を戻す」で本体に取り付けます。";
      return "";}
    if(step==="open"){
      if(!onTable())return "先に「①引き出す」で回転テーブルの上まで移動します。";
      if(!near(D.rot,0))return "先に「③台車を回す」で向きを戻します。";
      return "";}
    if(step==="spin"){
      if(!onTable())return "先に「①引き出す」で回転テーブルの上まで移動します。";
      if(!near(D.open,1))return "先に「②軸端部を外す」でスタンドをテーブルの外へ出します。";
      return "";}
    return "";}
  function run(list){for(const s of list)q.push(s);}
  function act(step){const why=blockReason(step);if(why){say(why);return false;}
    if(step==="pull")run(inLine()?[...OUT_PRE(),PULL()]:[BACK(),...IN_POST()]);
    else if(step==="open")run([near(D.open,1)?CLOSE():OPEN()]);
    else if(step==="spin")run([near(D.rot,1)?UNSPIN():SPIN()]);
    return true;}
  /* まとめて: ラインから出す(段取り位置まで)/ ラインへセット(運転再開まで) */
  function toggleAll(){
    if(busy()){say("動いている間は押せません。");return false;}
    if(st.state==="DECEL"||st.state==="CHANGE"){say("コイル交換中は段取りに入れません。");return false;}
    if(inLine()){run([...OUT_PRE(),PULL(),OPEN(),SPIN()]);return true;}
    const list=[];
    if(!near(D.rot,0))list.push(UNSPIN());
    if(!near(D.open,0))list.push(CLOSE());
    list.push(BACK(),...IN_POST());run(list);return true;}

  function step(dt){
    if(msgT>0){msgT-=dt;if(msgT<=0)msg="";}
    for(let guard=0;guard<4;guard++){
      if(!cur){cur=q.shift()||null;if(!cur)return;if(cur.start)cur.start();}
      if(!cur.run(dt))return;
      if(cur.done)cur.done();cur=null;dt=0;}}

  /* いまの台車の居場所(画面の読み出し) */
  function where(){
    if(cur)return cur.label;
    if(inLine())return st.state==="KNIFE"?"ライン内(段取り中)":"ライン内(運転位置)";
    if(onTable()&&near(D.rot,1))return "段取り位置(台車反転・軸端部外し)";
    if(onTable()&&near(D.open,1))return "回転テーブル上(軸端部外し)";
    if(onTable())return "回転テーブル上";
    return "レール上";}
  return{act,toggleAll,step,blockReason,where,busy,inLine,onTable,
    get note(){return msg;}, get label(){return cur?cur.label:"";}};
})();
