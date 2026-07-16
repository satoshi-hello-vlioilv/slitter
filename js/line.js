"use strict";
/* =========================================================
 * 全ロール配置(BOM準拠) — 横からの概略図に沿って西→東
 * 全ロールは両端チョック(軸受)+スタンド/サイドフレームで支持し宙に浮かせない
 * =======================================================*/
// 入側
// 回転方向の規約: 接触面の周速が帯板と同方向になる向き。
// 上面接触ロール=dir-1 / 下面接触ロール=dir+1 (帯板は+X方向へ走行)
roll('A',-29.0,PL+0.55,280,-1);                       // スナバーロール(上面接触)
roll('B',-28.0,PL+0.16,100,1);                        // ベンドロール(下面S掛け → dir+1)
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
// ピンチはニップ面がパスラインに一致(上ロール下面=PL/下ロール上面=PL)。
// 旧配置(±0.085)はロール面がPLから10mm浮きニップ不成立だった。
roll('J4',-18.4,PL-0.075,150,-1,{frame:false,chock:false});roll('J1',-18.8,PL+0.075,150,1,{frame:false,chock:false});
roll('J5',-17.6,PL-0.075,150,-1,{frame:false,chock:false});roll('J2',-18.0,PL+0.075,150,1,{frame:false,chock:false});
roll('J3',-17.2,PL+0.075,150,1,{frame:false,chock:false});
(function(){ // ピンチ群 側板+支脚
  const zs=STRIP_W/2+0.20;
  for(const s of [-1,1]){addBox(2.2,0.8,0.06,M.paint,-18.0,PL,s*zs);
    for(const lx of [-18.95,-17.05])addBox(0.12,PL-0.4,0.12,M.paint,lx,(PL-0.4)/2,s*zs);}
})();
// No.1ルーパー(入側カテナリー K1 / 開閉式ループテーブル / 出側カテナリー K2)
roll('K1-1',-15.8,PL-d2r(98),98,-1,{frame:false});roll('K1-2',-15.4,PL-d2r(98),98,-1,{frame:false});roll('K1-3',-15.0,PL-d2r(98),98,-1,{frame:false});
roll('K2-1',-9.2,PL-d2r(98),98,-1,{frame:false});roll('K2-2',-8.8,PL-d2r(98),98,-1,{frame:false});roll('K2-3',-8.4,PL-d2r(98),98,-1,{frame:false});
chainFrame(['K1-1','K1-2','K1-3'],STRIP_W/2+0.27,2);
chainFrame(['K2-1','K2-2','K2-3'],STRIP_W/2+0.27,2);
// 開閉式ループテーブル:
//  閉(通板時) = 両半テーブルが水平に閉じ、ロール上面=PLの平坦通板路を形成(ループ無し)
//  開(運転時) = 両半テーブルがピット端のヒンジで下方へ振り下がって退避し、
//               帯板は固定端ロール(K1-3/K2-1等)間で何にも触れない完全フリーの自重ループになる
function buildLooperTable(x0,x1,nRolls){
  const r=d2r(98), L=(x1-x0)/2, halves=[];
  for(const side of [0,1]){
    const hx=side?x1:x0, dir=side?-1:1;
    const piv=new THREE.Group();piv.position.set(hx,PL-r,0);scene.add(piv);
    for(const s of [-1,1])addBox(L,0.08,0.10,M.frame,dir*L/2,-0.11,s*(STRIP_W/2+0.27),piv); // 側部チャンネル
    const n=Math.ceil(nRolls/2);
    for(let i=0;i<n;i++){const lx=dir*((i+0.5)*L/n);
      const m=addCylZ(r,STRIP_W+0.34,rollMats(),lx,0,0,piv,22);spin(m,r,-1);
      for(const s of [-1,1])addBox(0.09,0.10,0.09,M.frame,lx,-0.02,s*(STRIP_W/2+0.22),piv);} // 軸受
    // ヒンジ軸(幅方向Z)と支持ブラケット
    addCylZ(0.05,STRIP_W+0.7,M.steel,0,0,0,piv);
    addBox(0.22,0.3,0.16,M.paintDark,hx,PL-r-0.25,-(STRIP_W/2+0.42));
    addBox(0.22,0.3,0.16,M.paintDark,hx,PL-r-0.25, (STRIP_W/2+0.42));
    halves.push(piv);
  }
  return{setOpen(k){const ang=THREE.MathUtils.clamp(k,0,1)*1.35; // 開放角 ~77°
    halves[0].rotation.z=-ang;halves[1].rotation.z=ang;}};
}
// ループ緒元(帯板経路はstrip.jsがこのメタ情報から動的に構築)
const LOOP1={inR:'K1-3',outR:'K2-1',depth:1.5};
const LOOP2={inR:'S1-3',outR:'S2-1',depth:1.6};
const looperTable1=buildLooperTable(-14.6,-9.6,8);
// VCロール / パスロール / スリッター前ピンチ — 全てニップ面=PL に整合
housing(-7.4,PL+0.9); roll('L1',-7.4,PL+d2r(80),80,1);roll('L2',-7.4,PL-d2r(80),80,-1);
roll('M',-6.4,PL-d2r(60),60,-1);
housing(-5.1,PL+0.9); roll('N1',-5.1,PL+d2r(200),200,1);roll('N2',-5.1,PL-d2r(98),98,-1);
// ガイドテーブルロール(5) — 上面=PL(帯板を下から支持)。
// バレル面長は必ず板幅より広く取る(狭いとチョックが板を貫通する物理違反になる)
for(let i=0;i<5;i++)roll('P'+(i+1),-3.8+i*0.4,PL-d2r(60),60,-1,{frame:false});
chainFrame(['P1','P2','P3','P4','P5'],STRIP_W/2+0.27,2);
roll('Q',-1.0,PL+d2r(120),120,1);                      // 板押えロール(下面=PLで帯板に接触)
// スリッター(I=スチールシャフトφ98 アーバー + 上下丸刃群)
// アーバー高さは丸刃径に連動し buildKnives で設定(刃先ラップが板を剪断する位置)
const knifeUp=new THREE.Group(),knifeLo=new THREE.Group();
let knifeRcur=0.18;
knifeUp.position.set(SLIT_X,PL+0.18,0);knifeLo.position.set(SLIT_X,PL-0.18,0);scene.add(knifeUp,knifeLo);
spin(knifeUp,()=>knifeRcur,1);spin(knifeLo,()=>knifeRcur,-1);
(function(){housing(SLIT_X,PL+1.1,M.paintDark);
  regRoll('I',SLIT_X,PL+0.18,0.18);})();
// 出側テーブル
for(let i=0;i<5;i++)roll('R1-'+(i+1),1.4+i*0.6,PL-d2r(98),98,-1,{frame:false});
chainFrame(['R1-1','R1-2','R1-3','R1-4','R1-5'],STRIP_W/2+0.27,2);
// No.2ルーパー(入側カテナリー S1 / 開閉式ループテーブル / 出側カテナリー S2)
roll('S1-1',4.8,PL-d2r(94),94,-1,{frame:false});roll('S1-2',5.2,PL-d2r(94),94,-1,{frame:false});roll('S1-3',5.6,PL-d2r(94),94,-1,{frame:false});
roll('S2-1',11.8,PL-d2r(80),80,-1,{frame:false});roll('S2-2',12.2,PL-d2r(80),80,-1,{frame:false});roll('S2-3',12.6,PL-d2r(80),80,-1,{frame:false});
chainFrame(['S1-1','S1-2','S1-3'],STRIP_W/2+0.27,2);
chainFrame(['S2-1','S2-2','S2-3'],STRIP_W/2+0.27,2);
const looperTable2=buildLooperTable(6.2,11.2,10);
// セパ押え(下面=PLで接触) / MDミニ前
roll('T1',13.6,PL+d2r(80),80,1);roll('T2',14.3,PL-d2r(80),80,-1);
// MDロール(上下ピンチ式): V=ミニφ250(ゴムディスク), W=主φ400(ゴムディスク)
// 帯は上下間を通板 — ロール面がPLに接するニップ位置(旧配置は面が浮きピンチ不成立)
housing(15.2,PL+1.1); discRoll('V1',15.2,PL+d2r(250),250,1);discRoll('V2',15.2,PL-d2r(250),250,-1);
housing(16.8,PL+1.2,M.paintDark); discRoll('W1',16.8,PL+d2r(400),400,1);discRoll('W2',16.8,PL-d2r(400),400,-1);
addCylZ(0.18,0.5,M.paintDark,16.8,PL+d2r(400),-(STRIP_W/2+0.95),scene); // MD駆動モーター
addCylZ(0.18,0.5,M.paintDark,16.8,PL-d2r(400),-(STRIP_W/2+0.95),scene);
// 出側ピンチ(ニップ面=PL)
housing(18.4,PL+0.9); roll('X1',18.4,PL+d2r(200),200,1);roll('X2',18.4,PL-d2r(200),200,-1);
// デフロール(上下φ500): Y2上面巻き(dir-1)→Y1下面巻き(dir+1)のS掛け
roll('Y2',19.9,PL+0.27,500,-1);roll('Y1',20.6,PL-0.27,500,1);
// テールキャッチャー(上面接触 → dir-1)
roll('Z',22.0,PL+0.10,190,-1);

/* =========================================================
 * スリッター丸刃 / 板押さえ / セパレーター(条数依存)
 * =======================================================*/
function clearGroup(grp){grp.traverse(o=>{if(o.geometry)o.geometry.dispose();});grp.clear();}
function buildKnives(N){
  clearGroup(knifeUp);clearGroup(knifeLo);
  const sw=EFF_W/N;
  // 丸刃半径は条ピッチに応じて縮小(狭条で隣接刃が視覚融合するのを防ぐ)。
  // アーバー高さは刃径に連動: 上下刃の刃先がパスラインをLAPだけ越えて重なる
  // (=実機のナイフラップ)。これで「刃が板に届かない」「刃が板を飲み込む」の
  // どちらの誤描写も起きない。スペーサ(r=118mm)より必ず大径にクランプ。
  const knifeR=Math.min(0.18,Math.max(0.13,sw*0.9)), LAP=0.004;
  knifeRcur=knifeR;
  knifeUp.position.y=PL+knifeR-LAP; knifeLo.position.y=PL-knifeR+LAP;
  addCylZ(d2r(98),STRIP_W+1.6,M.steel,0,0,0,knifeUp);                  // アーバーシャフト
  addCylZ(d2r(98),STRIP_W+1.6,M.steel,0,0,0,knifeLo);
  addCylZ(0.16,0.5,M.paintDark,0,0,-(STRIP_W/2+1.05),knifeUp);         // 駆動継手
  addCylZ(0.16,0.5,M.paintDark,0,0,-(STRIP_W/2+1.05),knifeLo);
  addCylZ(0.118,STRIP_W+0.1,M.spacer,0,0,0,knifeUp);addCylZ(0.118,STRIP_W+0.1,M.spacer,0,0,0,knifeLo);
  for(let k=0;k<=N;k++){const zc=-EFF_W/2+k*sw;
    addCylZ(knifeR,0.016,M.knife,0,0,zc-0.010,knifeUp,36);addCylZ(knifeR,0.016,M.knife,0,0,zc+0.010,knifeLo,36);}
  // 板押さえゴムリング(ストリッパーリング): 丸刃間のスペーサ上に装着し、
  // 帯板を押さえて刃への巻付きを防ぐ。半径=刃-6mm → リング面は板面すれすれ
  // (LAP+2mmのクリアランス)で「押さえているが食い込まない」実機の見え方になる。
  const ringR=knifeR-0.006;
  const nr=sw<0.05?1:Math.max(2,Math.floor(sw/0.075));
  for(let k=0;k<N;k++){const z0=-EFF_W/2+k*sw;
    const seg=sw/nr, ringLen=Math.min(0.034,seg*0.7);
    for(let i=0;i<nr;i++){const z=z0+seg*(i+0.5);
      addCylZ(ringR,ringLen,(i%2?M.urethaneA:M.urethaneB),0,0,z,knifeUp,24);
      addCylZ(ringR,ringLen,(i%2?M.urethaneB:M.urethaneA),0,0,z,knifeLo,24);}}}
// 薄板切断用フィンガー(板押さえ爪): 出側のフィンガーバーから丸刃間へ差し込み、
// 切断後の薄板を刃から剥がして通板を安定させる。上下1組。
const fingerGroup=new THREE.Group();scene.add(fingerGroup);
function buildFingers(N){
  clearGroup(fingerGroup);
  const sw=EFF_W/N, BX=SLIT_X+0.36;
  // 爪幅は条幅に比例させ(隣条との隙間を確保しつつ)上限0.10m・下限4mmでクランプ。
  // 狭条(多条数)では爪が細くなり、極端に狭い条では省略も可能な設計。
  const fw=Math.max(0.004,Math.min(sw*0.62,0.10));
  for(const s of [1,-1]){
    addCylZ(0.026,STRIP_W+1.0,M.steel,BX,PL+s*0.30,0,fingerGroup,14);   // フィンガーバー(ハウジング間)
    for(const zs of [-1,1])                                             // バー支持アーム → ハウジング柱
      addBox(0.44,0.06,0.10,M.paintDark,SLIT_X+0.17,PL+s*0.30,zs*(STRIP_W/2+0.42),fingerGroup);
    for(let k=0;k<N;k++){const zc=-EFF_W/2+(k+0.5)*sw;
      const f=addBox(0.38,0.014,fw,M.yellow,SLIT_X+0.225,PL+s*0.168,zc,fingerGroup);
      f.rotation.z=s*0.78;}                                             // 爪先端は刃間ニップ直後の板面へ
  }}
const sepGroups=[];
// セパレーターディスクは条境界(=丸刃と同じz)で条間の隙間に垂れ込み、隣り合う条の
// 重なり/絡みを防ぐ。ディスク下端はPLより10mm下(条の間なので帯板とは干渉しない)。
const SEP_Y=PL+0.21;
function buildSeparators(N){for(const sg of sepGroups){while(sg.g.children.length){const c=sg.g.children.pop();c.geometry.dispose();sg.g.remove(c);}}
  const sw=EFF_W/N;
  for(const sg of sepGroups){for(let k=0;k<=N;k++){const zc=-EFF_W/2+k*sw;addCylZ(0.22,0.012,M.knife,sg.x,SEP_Y,zc,sg.g,28);}}}
(function(){for(const x of [13.0,21.0]){const g=new THREE.Group();scene.add(g);sepGroups.push({x,g});
  addBox(0.16,3.0,0.16,M.frame,x,1.5,-1.3);addBox(0.16,3.0,0.16,M.frame,x,1.5,1.3);addBox(0.2,0.16,2.76,M.yellow,x,3.0,0);
  addCylZ(0.04,STRIP_W+0.8,M.steel,x,SEP_Y,0,scene);
  for(const s of [-1,1])addBox(0.12,0.12,0.42,M.frame,x,SEP_Y,s*1.12);   // 軸受アーム(シャフト端→支柱)
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
