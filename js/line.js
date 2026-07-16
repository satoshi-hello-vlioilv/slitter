"use strict";
/* =========================================================
 * 全ロール配置(BOM準拠) — 横からの概略図に沿って西→東
 * 全ロールは両端チョック(軸受)+スタンド/サイドフレームで支持し宙に浮かせない
 * =======================================================*/
// 入側
roll('A',-29.0,PL+0.55,280,-1);                       // スナバーロール
roll('B',-28.0,PL+0.16,100,-1);                       // ベンドロール
housing(-26.9,PL+0.9); roll('C1',-26.9,PL+0.25,500,1);roll('C2',-26.9,PL-0.25,500,-1); // 入側ピンチ
// ラフレベラー — 小径ワークロール群は側板フレームに収める
roll('D1',-25.95,PL,60,-1,{frame:false,chock:false});
roll('E2-1',-25.7,PL-0.06,150,-1,{frame:false,chock:false});roll('E1-1',-25.4,PL+0.06,150,1,{frame:false,chock:false});
roll('E2-2',-25.1,PL-0.06,150,-1,{frame:false,chock:false});roll('E1-2',-24.8,PL+0.06,150,1,{frame:false,chock:false});
roll('E2-3',-24.5,PL-0.06,150,-1,{frame:false,chock:false});roll('D2',-24.2,PL,60,-1,{frame:false,chock:false});
(function(){ // レベラー側板(床から立ち上げ)+ベース
  const zs=STRIP_W/2+0.28, hp=PL+0.42;
  for(const s of [-1,1])addBox(2.35,hp,0.07,M.paint,-25.05,hp/2,s*zs);
  addBox(2.35,0.22,2*zs+0.24,M.paintDark,-25.05,0.11,0,scene,false);
  addBox(2.35,0.1,0.07,M.paintDark,-25.05,hp+0.05,STRIP_W/2+0.28);   // 側板上フランジ
  addBox(2.35,0.1,0.07,M.paintDark,-25.05,hp+0.05,-(STRIP_W/2+0.28));
})();
housing(-22.7,PL+0.95,M.paintDark);                   // 入側シャー
roll('F',-22.7,PL+0.45,100,1);roll('G',-22.7,PL-0.30,60,-1,{frame:false});
addBox(0.04,0.5,STRIP_W+0.4,M.steel,-22.45,PL+0.55,0); // 上刃
addBox(0.04,0.4,STRIP_W+0.4,M.steel,-22.45,PL-0.35,0); // 下刃
roll('H1-1',-21.2,PL-d2r(98),98,-1,{frame:false});roll('H1-2',-20.6,PL-d2r(98),98,-1,{frame:false});roll('H1-3',-20.0,PL-d2r(98),98,-1,{frame:false});
chainFrame(['H1-1','H1-2','H1-3'],STRIP_W/2+0.27,2);   // 入側テーブル サイドフレーム
housing(-18.0,PL+0.95);                               // 板押え/検査/ループ前ピンチ
roll('J4',-18.4,PL-0.085,150,-1,{frame:false,chock:false});roll('J1',-18.8,PL+0.085,150,1,{frame:false,chock:false});
roll('J5',-17.6,PL-0.085,150,-1,{frame:false,chock:false});roll('J2',-18.0,PL+0.085,150,1,{frame:false,chock:false});
roll('J3',-17.2,PL+0.085,150,1,{frame:false,chock:false});
(function(){ // ピンチ群 側板+支脚
  const zs=STRIP_W/2+0.20;
  for(const s of [-1,1]){addBox(2.2,0.8,0.06,M.paint,-18.0,PL,s*zs);
    for(const lx of [-18.95,-17.05])addBox(0.12,PL-0.4,0.12,M.paint,lx,(PL-0.4)/2,s*zs);}
})();
// No.1ルーパー(入側カテナリー K1 / テーブル H2 / 出側カテナリー K2)
roll('K1-1',-15.8,PL-d2r(98),98,-1,{frame:false});roll('K1-2',-15.4,PL-d2r(98),98,-1,{frame:false});roll('K1-3',-15.0,PL-d2r(98),98,-1,{frame:false});
// たわみ形状(放物線 4t(1-t))は区間全体で凸(常に弦が曲線より上側)となり、
// たわみ内部のロール群を弦(帯板)が決して貫通しない。端(水平区間との接続部)は
// 経路を高密度サンプルすることでキンクによる食い込みを最小化する。
const sagShape=(t)=>4*t*(1-t);
const H2pts=[]; (function(){const x0=-14.5,x1=-9.6,depth=1.5,r=d2r(98),NR=9,NP=28;
  for(let i=0;i<NR;i++){const x=THREE.MathUtils.lerp(x0,x1,i/(NR-1));const t=(x-x0)/(x1-x0);const py=PL-depth*sagShape(t);
    roll('H2-'+(i+1),x,py-r,98,-1,{frame:false});}
  for(let i=0;i<NP;i++){const t=i/(NP-1);H2pts.push(V3(THREE.MathUtils.lerp(x0,x1,t),PL-depth*sagShape(t),0));} // 経路は密にサンプル(小径ロールへの食い込み防止)
})();
roll('K2-1',-9.2,PL-d2r(98),98,-1,{frame:false});roll('K2-2',-8.8,PL-d2r(98),98,-1,{frame:false});roll('K2-3',-8.4,PL-d2r(98),98,-1,{frame:false});
(function(){ // No.1ルーパー全域のサイドフレーム(ピット底まで支柱)
  const ids=['K1-1','K1-2','K1-3'];for(let i=1;i<=9;i++)ids.push('H2-'+i);ids.push('K2-1','K2-2','K2-3');
  chainFrame(ids,STRIP_W/2+0.27,3);
})();
// VCロール / パスロール / スリッター前ピンチ
housing(-7.4,PL+0.9); roll('L1',-7.4,PL+0.16,80,1);roll('L2',-7.4,PL-0.16,80,-1);
roll('M',-6.4,PL-d2r(60),60,-1);
housing(-5.1,PL+0.9); roll('N1',-5.1,PL+0.11,200,1);roll('N2',-5.1,PL-d2r(98),98,-1);
// サイドガイドロール(5) — 小テーブルフレームで支持
for(let i=0;i<5;i++)roll('P'+(i+1),-3.8+i*0.4,PL+0.0,60,-1,{frame:false,len:0.5});
chainFrame(['P1','P2','P3','P4','P5'],0.36,2);
roll('Q',-1.0,PL+0.13,120,1);                          // 板押えロール
// スリッター(I=スチールシャフトφ98 アーバー + 上下丸刃群)
const knifeUp=new THREE.Group(),knifeLo=new THREE.Group();
knifeUp.position.set(SLIT_X,PL+0.20,0);knifeLo.position.set(SLIT_X,PL-0.20,0);scene.add(knifeUp,knifeLo);
spin(knifeUp,0.18,1);spin(knifeLo,0.18,-1);
(function(){housing(SLIT_X,PL+1.1,M.paintDark);
  for(const y of [PL+0.20,PL-0.20]){addCylZ(d2r(98),STRIP_W+1.0,M.steel,SLIT_X,y,0,scene);
    addCylZ(0.16,0.5,M.paintDark,SLIT_X,y,-(STRIP_W/2+0.85),scene);}
  regRoll('I',SLIT_X,PL+0.20,d2r(98));})();
// 出側テーブル
for(let i=0;i<5;i++)roll('R1-'+(i+1),1.4+i*0.6,PL-d2r(98),98,-1,{frame:false});
chainFrame(['R1-1','R1-2','R1-3','R1-4','R1-5'],STRIP_W/2+0.27,2);
// No.2ルーパー(入側カテナリー S1 / テーブル R2 / 出側カテナリー S2)
roll('S1-1',4.8,PL-d2r(94),94,-1,{frame:false});roll('S1-2',5.2,PL-d2r(94),94,-1,{frame:false});roll('S1-3',5.6,PL-d2r(94),94,-1,{frame:false});
const R2pts=[]; (function(){const x0=6.1,x1=11.1,depth=1.6,r=d2r(98),NR=11,NP=32;
  for(let i=0;i<NR;i++){const x=THREE.MathUtils.lerp(x0,x1,i/(NR-1));const t=(x-x0)/(x1-x0);const py=PL-depth*sagShape(t);
    roll('R2-'+(i+1),x,py-r,98,-1,{frame:false});}
  for(let i=0;i<NP;i++){const t=i/(NP-1);R2pts.push(V3(THREE.MathUtils.lerp(x0,x1,t),PL-depth*sagShape(t),0));} // 経路は密にサンプル
})();
roll('S2-1',11.8,PL-d2r(80),80,-1,{frame:false});roll('S2-2',12.2,PL-d2r(80),80,-1,{frame:false});roll('S2-3',12.6,PL-d2r(80),80,-1,{frame:false});
(function(){ // No.2ルーパー全域のサイドフレーム
  const ids=['S1-1','S1-2','S1-3'];for(let i=1;i<=11;i++)ids.push('R2-'+i);ids.push('S2-1','S2-2','S2-3');
  chainFrame(ids,STRIP_W/2+0.27,3);
})();
// セパ押え / MDミニ前
roll('T1',13.6,PL+0.16,80,1);roll('T2',14.3,PL-d2r(80),80,-1);
// MDロール(上下ピンチ式): V=ミニφ250(ゴムディスク), W=主φ400(ゴムディスク) — 帯は上下間を通板
housing(15.2,PL+1.1); discRoll('V1',15.2,PL+0.16,250,1);discRoll('V2',15.2,PL-0.16,250,-1);
housing(16.8,PL+1.2,M.paintDark); discRoll('W1',16.8,PL+0.22,400,1);discRoll('W2',16.8,PL-0.22,400,-1);
addCylZ(0.18,0.5,M.paintDark,16.8,PL+0.22,-(STRIP_W/2+0.95),scene); // MD駆動モーター
addCylZ(0.18,0.5,M.paintDark,16.8,PL-0.22,-(STRIP_W/2+0.95),scene);
// 出側ピンチ
housing(18.4,PL+0.9); roll('X1',18.4,PL+0.11,200,1);roll('X2',18.4,PL-0.11,200,-1);
// デフロール(上下φ500)
roll('Y2',19.9,PL+0.27,500,1);roll('Y1',20.6,PL-0.27,500,-1);
// テールキャッチャー
roll('Z',22.0,PL+0.10,190,1);

/* =========================================================
 * スリッター丸刃 / 板押さえ / セパレーター(条数依存)
 * =======================================================*/
function clearGroup(grp){grp.traverse(o=>{if(o.geometry)o.geometry.dispose();});grp.clear();}
function buildKnives(N){
  clearGroup(knifeUp);clearGroup(knifeLo);
  addCylZ(0.118,STRIP_W+0.1,M.spacer,0,0,0,knifeUp);addCylZ(0.118,STRIP_W+0.1,M.spacer,0,0,0,knifeLo);
  const sw=EFF_W/N;
  for(let k=0;k<=N;k++){const zc=-EFF_W/2+k*sw;
    addCylZ(0.18,0.016,M.knife,0,0,zc-0.010,knifeUp,36);addCylZ(0.18,0.016,M.knife,0,0,zc+0.010,knifeLo,36);}
  // 板押さえゴムリング(ストリッパーリング): 丸刃間のスペーサ上に装着し、
  // 帯板を押さえて刃への巻付きを防ぐ。刃径よりやや小径のウレタン輪。アーバーと共回転。
  for(let k=0;k<N;k++){const z0=-EFF_W/2+k*sw;
    const nr=Math.max(2,Math.floor(sw/0.075));
    for(let i=0;i<nr;i++){const z=z0+sw*(i+0.5)/nr;
      addCylZ(0.172,0.034,(i%2?M.urethaneA:M.urethaneB),0,0,z,knifeUp,24);
      addCylZ(0.172,0.034,(i%2?M.urethaneB:M.urethaneA),0,0,z,knifeLo,24);}}}
// 薄板切断用フィンガー(板押さえ爪): 出側のフィンガーバーから丸刃間へ差し込み、
// 切断後の薄板を刃から剥がして通板を安定させる。上下1組。
const fingerGroup=new THREE.Group();scene.add(fingerGroup);
function buildFingers(N){
  clearGroup(fingerGroup);
  const sw=EFF_W/N, BX=SLIT_X+0.36;
  for(const s of [1,-1]){
    addCylZ(0.026,STRIP_W+1.0,M.steel,BX,PL+s*0.30,0,fingerGroup,14);   // フィンガーバー(ハウジング間)
    for(const zs of [-1,1])                                             // バー支持アーム → ハウジング柱
      addBox(0.44,0.06,0.10,M.paintDark,SLIT_X+0.17,PL+s*0.30,zs*(STRIP_W/2+0.42),fingerGroup);
    for(let k=0;k<N;k++){const zc=-EFF_W/2+(k+0.5)*sw;
      const f=addBox(0.38,0.014,Math.min(sw-0.06,0.10),M.yellow,SLIT_X+0.225,PL+s*0.168,zc,fingerGroup);
      f.rotation.z=s*0.78;}                                             // 爪先端は刃間ニップ直後の板面へ
  }}
const sepGroups=[];
function buildSeparators(N){for(const sg of sepGroups){while(sg.g.children.length){const c=sg.g.children.pop();c.geometry.dispose();sg.g.remove(c);}}
  const sw=EFF_W/N;
  for(const sg of sepGroups){for(let k=0;k<=N;k++){const zc=-EFF_W/2+k*sw;addCylZ(0.22,0.012,M.knife,sg.x,PL+0.32,zc,sg.g,28);}}}
(function(){for(const x of [13.0,21.0]){const g=new THREE.Group();scene.add(g);sepGroups.push({x,g});
  addBox(0.16,3.0,0.16,M.frame,x,1.5,-1.3);addBox(0.16,3.0,0.16,M.frame,x,1.5,1.3);addBox(0.2,0.16,2.76,M.yellow,x,3.0,0);
  addCylZ(0.04,STRIP_W+0.8,M.steel,x,PL+0.32,0,scene);
  for(const s of [-1,1])addBox(0.12,0.12,0.42,M.frame,x,PL+0.32,s*1.12);   // 軸受アーム(シャフト端→支柱)
}})();

/* =========================================================
 * サイドワインダー(耳屑巻取機・両側)
 * =======================================================*/
// 耳屑は両側に分かれて排出 → 各側の側方ワインダーで自然に横向き巻取り
// (ガイドロールなし。屑コイル軸=Z, 帯耳幅と同じ薄幅コイルへ接線巻取り)
function buildScrapWinder(side){
  const Wx=1.6, Wy=PL-0.12, Wz=side*1.15;
  addBox(0.5,Wy,0.5,M.paintDark,Wx,Wy/2,Wz+side*0.4);     // 架台
  addCylZ(0.16,0.34,M.paintDark,Wx,Wy,Wz+side*0.2,scene); // 駆動部
  addCylZ(0.09,0.6,M.steel,Wx,Wy,Wz,scene);               // スピンドル(軸Z)
  const g=new THREE.Group();g.position.set(Wx,Wy,Wz);scene.add(g);
  const coil=addCylZ(1,TRIM_W+0.02,coilMats(),0,0,0,g,28); // 屑コイル(軸Z・薄幅)
  addCylZ(0.16,0.02,rollMats(),0,0,-(TRIM_W/2+0.02),g,18); // フランジ
  addCylZ(0.16,0.02,rollMats(),0,0, (TRIM_W/2+0.02),g,18);
  spin(g, side>0?()=>st.rsR:()=>st.rsL, -1);              // 軸Z回転
  return {coil, side, Wx, Wy, Wz};
}
const scrapR=buildScrapWinder(1),scrapL=buildScrapWinder(-1);

/* =========================================================
 * ラベル(設備名)
 * =======================================================*/
makeLabel("アンコイラ",UNC_X,PL+1.7,0);
makeLabel("入側ピンチ",-26.9,PL+1.3,0);
makeLabel("ラフレベラー",-25.1,PL+0.9,0);
makeLabel("入側シャー",-22.7,PL+1.4,0);
makeLabel("ループ前ピンチ",-18.0,PL+1.4,0);
makeLabel("No.1ルーパー",-12.0,PL+0.5,0);
makeLabel("VCロール",-7.4,PL+1.3,0);
makeLabel("スリッター前ピンチ",-5.1,PL+1.35,0);
makeLabel("スリッターヘッド",SLIT_X,PL+1.55,0);
makeLabel("屑巻取機",1.6,PL+0.7, 1.15);
makeLabel("屑巻取機",1.6,PL+0.7,-1.15);
makeLabel("No.2ルーパー",8.6,PL+0.5,0);
makeLabel("セパレーター",13.0,PL+1.45,0);
makeLabel("MDロール(上下ピンチ)",16.0,PL+1.65,0);
makeLabel("出側ピンチ",18.4,PL+1.3,0);
makeLabel("デフロール",20.2,PL+1.5,0);
makeLabel("テールキャッチャー",22.0,PL+0.9,0);
makeLabel("リコイラ",REC_X,PL+1.7,0);
