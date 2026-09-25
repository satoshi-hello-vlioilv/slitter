"use strict";
/* =========================================================
 * 全ロール配置(BOM準拠) — 横からの概略図に沿って西→東
 * 全ロールは両端チョック(軸受)+スタンド/サイドフレームで支持し宙に浮かせない
 * =======================================================*/
// ライン配置図(平面図)の寸法に準拠 — アンコイラ→スリッター 12650 / スリッター→リコイラ 13710
//  入側: アンコイラ +2150 入側ピンチ +790 レベラー +1200 入側シャー +6810(テーブル・No.1ピット)
//        +1700 スリッター前ピンチ → スリッター
//  出側: スリッター +2400 屑処理 +6880(出側テーブル・No.2ピット) テンション(MD) +2630
//        デフ・セパレーター +1800 リコイラ
// 回転方向の規約: 接触面の周速が帯板と同方向になる向き。
// 上面接触ロール=dir-1 / 下面接触ロール=dir+1 (帯板は+X方向へ走行)
roll('A',-11.25,PL+0.55,280,-1);                      // スナバーロール(上面接触)
roll('B',-10.90,PL+0.10,100,1);                       // ベンドロール(下面S掛け → dir+1)
housing(-10.50,PL+0.9); roll('C1',-10.50,PL+0.25,500,1);roll('C2',-10.50,PL-0.25,500,-1); // 入側ピンチ
// ラフレベラー — 小径ワークロール群(ピッチ220)は側板フレームに収める
roll('D1',-10.10,PL,60,-1,{frame:false,chock:false});
roll('E2-1',-9.88,PL-0.06,150,-1,{frame:false,chock:false});roll('E1-1',-9.66,PL+0.06,150,1,{frame:false,chock:false});
roll('E2-2',-9.44,PL-0.06,150,-1,{frame:false,chock:false});roll('E1-2',-9.22,PL+0.06,150,1,{frame:false,chock:false});
roll('E2-3',-9.00,PL-0.06,150,-1,{frame:false,chock:false});roll('D2',-8.80,PL,60,-1,{frame:false,chock:false});
(function(){ // レベラー側板(床から立ち上げ)+ベース
  const zs=STRIP_W/2+0.28, hp=PL+0.42, cx=-9.45, L=1.55;
  for(const s of [-1,1]){addBox(L,hp,0.07,M.paint,cx,hp/2,s*zs);
    addBox(L,0.1,0.07,M.paintDark,cx,hp+0.05,s*zs);}                 // 側板上フランジ
  addBox(L,0.22,2*zs+0.24,M.paintDark,cx,0.11,0,scene,false);
})();
housing(-8.51,PL+0.95,M.paintDark);                   // 入側シャー
roll('F',-8.51,PL+0.45,100,1);roll('G',-8.51,PL-0.30,60,-1,{frame:false});
addBox(0.04,0.5,STRIP_W+0.4,M.steel,-8.26,PL+0.55,0); // 上刃
addBox(0.04,0.4,STRIP_W+0.4,M.steel,-8.26,PL-0.35,0); // 下刃
roll('H1-1',-7.95,PL-d2r(98),98,-1,{frame:false});roll('H1-2',-7.55,PL-d2r(98),98,-1,{frame:false});
chainFrame(['H1-1','H1-2'],STRIP_W/2+0.27,2);         // 入側テーブル サイドフレーム
housing(-6.90,PL+0.95);                               // ループ前ピンチ(ニップ面=パスライン)
roll('J1',-7.15,PL+0.075,150,1,{frame:false,chock:false});roll('J4',-6.90,PL-0.075,150,-1,{frame:false,chock:false});
roll('J2',-6.65,PL+0.075,150,1,{frame:false,chock:false});
(function(){ // ピンチ群 側板+支脚
  const zs=STRIP_W/2+0.20;
  for(const s of [-1,1]){addBox(0.8,0.8,0.06,M.paint,-6.90,PL,s*zs);
    for(const lx of [-7.25,-6.55])addBox(0.12,PL-0.4,0.12,M.paint,lx,(PL-0.4)/2,s*zs);}
})();
// No.1ルーパー(入側カテナリー K1 / 開閉式ループテーブル / 出側カテナリー K2)
// ピット開口 = ループ区間(K1-3 → K2-1)
roll('K1-1',-6.20,PL-d2r(98),98,-1,{frame:false});roll('K1-2',-5.80,PL-d2r(98),98,-1,{frame:false});roll('K1-3',-5.40,PL-d2r(98),98,-1,{frame:false});
roll('K2-1',-2.40,PL-d2r(98),98,-1,{frame:false});roll('K2-2',-2.12,PL-d2r(98),98,-1,{frame:false});
chainFrame(['K1-1','K1-2','K1-3'],STRIP_W/2+0.27,2);
chainFrame(['K2-1','K2-2'],STRIP_W/2+0.27,2);
// 開閉式ループテーブル(長手2分割・下方折り畳み式):
//  閉(通板時) = 2枚のリーフが水平に閉じ、ロール上面=PLの平坦通板路を作る(ループ無し)
//  開(運転時) = 各リーフがループ両端(端部カテナリーロールのすぐ内側)のヒンジ軸まわりに
//               90°下方へ倒れ、ピット内へ垂直に退避する。帯板は端ロール間で何にも
//               触れない自重ループになる。
// 倒したリーフがループ経路を塞がないための要点:
//  ・ヒンジをループの始点/終点の直近に置く。そこは帯板がまだパスライン高さにある
//    位置なので、真下へ倒したリーフは垂れ下がる帯板と交差しない。
//  ・ヒンジ〜最初のロールの間はロールを置かない(clear)。倒した時にこの区間が帯板の
//    降下線より上に来るため、必要長さは端部勾配 4d/L(最大ループ深さ)から算出する。
//  ・ヒンジ軸はZ方向なので、軸受を板幅の外(|z|=0.95)へ出せる。ピット床から立てた
//    柱で支持し、リーフの回転範囲(|z|≦0.88)とは干渉しない。
//  ・軸は板幅を跨がない短いトラニオン。全幅の通し管にすると、降下する帯板が
//    パスライン直下の管を切ってしまう。
//  ・リーフの枠はロール軸と同じ高さ(バレル端の外側)に置く。デッキより下に出す枠は
//    倒す途中でヒンジより外へ張り出し、端部カテナリーの側枠を叩いてしまう。
const LT_FZ=0.84, LT_BZ=0.955;          // リーフ側枠のz / ヒンジ軸受のz
const looperGroup=new THREE.Group(); scene.add(looperGroup);   // テーブル一式(表示ON/OFF対象)
function buildLooperTable(lp,inset,nRolls){
  const r=d2r(98), HY=PL-r;
  const xa=R[lp.inR].x+inset, xb=R[lp.outR].x-inset;      // ヒンジ位置(ループ始点/終点の直近)
  const L=R[lp.outR].x-R[lp.inR].x, Lh=(xb-xa)/2;         // ループ全長 / 各リーフ長(中央で突き合わせ)
  const clear=4*lp.dmax/L*inset+r+0.08;                   // ヒンジ側のロール無し区間
  const n=Math.max(1,Math.round(nRolls/2)), pitch=(Lh-clear)/n;
  const leaves=[];
  for(const h of [{x:xa,dir:1},{x:xb,dir:-1}]){
    // --- 固定部: ヒンジ軸受(板幅の外)+ ピット床から立てた軸受柱 ---
    for(const sz of [-1,1]){const z=sz*LT_BZ, gy=groundY(h.x), hh=HY-0.10-gy;
      addBox(0.09,hh,0.09,M.frame,h.x,gy+hh/2,z,looperGroup);            // 軸受柱
      addBox(0.16,0.14,0.08,M.paintDark,h.x,HY-0.02,z,looperGroup);      // 軸受
      addBox(0.28,0.05,0.08,M.frame,h.x,gy+0.025,z,looperGroup,false);}  // ベースプレート(壁際なので幅方向は柱幅内)
    // --- 可動部: 折り畳みリーフ(ヒンジ軸=幅方向Z) ---
    const leaf=new THREE.Group(); leaf.position.set(h.x,HY,0); looperGroup.add(leaf);
    for(const sz of [-1,1]){
      addCylZ(0.045,0.24,M.steel,0,0,sz*0.87,leaf,14);                   // トラニオン(板幅の外だけ)
      addBox(Lh,0.09,0.10,M.frame,h.dir*Lh/2,0,sz*LT_FZ,leaf);           // 側部チャンネル(ロール軸高さ)
      addBox(0.13,0.12,0.11,M.paintDark,h.dir*0.07,0,sz*LT_FZ,leaf);}    // ヒンジ金具(枠→トラニオン)
    for(let i=0;i<n;i++){const u=h.dir*(clear+(i+0.5)*pitch);
      spin(addCylZ(r,STRIP_W+0.34,rollMats(),u,0,0,leaf,20),r,-1);       // テーブルロール(全幅)
      for(const sz of [-1,1])addBox(0.10,0.10,0.11,M.frame,u,0,sz*LT_FZ,leaf);}     // 軸受
    leaves.push({leaf,dir:h.dir});
  }
  //  k=0:閉(水平) → k=1:開(ピット内へ垂直に退避)
  return{setOpen(k){const ang=THREE.MathUtils.clamp(k,0,1)*Math.PI/2;
    for(const v of leaves)v.leaf.rotation.z=-v.dir*ang;}};
}
// ループ緒元(帯板経路はstrip.jsがこのメタ情報から動的に構築)
// dmax = 想定される最大ループ深さ(No.2は条毎の余長でLOOP_DMAXまで深くなる)
const LOOP1={inR:'K1-3',outR:'K2-1',depth:1.5,dmax:1.5};
const LOOP2={inR:'S1-3',outR:'S2-1',depth:1.6,dmax:LOOP_DMAX};
const looperTable1=buildLooperTable(LOOP1,0.20,6);
// VCロール / スリッター前ピンチ(スリッター手前1700) / ガイドテーブル — 全てニップ面=PL に整合
// 近接配置のためロールはハウジング(チョック)で支持し、床置きスタンドは設けない
housing(-1.91,PL+0.9); roll('L1',-1.91,PL+d2r(80),80,1,{frame:false});roll('L2',-1.91,PL-d2r(80),80,-1,{frame:false});
housing(-1.70,PL+0.9); roll('N1',-1.70,PL+d2r(200),200,1,{frame:false});roll('N2',-1.70,PL-d2r(98),98,-1,{frame:false});
// ガイドテーブルロール(5) — 上面=PL(帯板を下から支持)。
// バレル面長は必ず板幅より広く取る(狭いとチョックが板を貫通する物理違反になる)
for(let i=0;i<5;i++)roll('P'+(i+1),-1.45+i*0.2,PL-d2r(60),60,-1,{frame:false});
chainFrame(['P1','P2','P3','P4','P5'],STRIP_W/2+0.27,2);
// 板押えロール(下面=PLで帯板に接触)。足元はカッター台車の走行レール(x=±0.33)と台座(x=±0.38)が
// 通るので床から柱を立てない — チョックはガイドテーブルの側枠を延ばした腕で受ける。
roll('Q',-0.40,PL+d2r(120),120,1,{frame:false});
for(const s of [-1,1]){const z=s*(STRIP_W/2+0.27);
  addBox(0.20,0.09,0.12,M.frame,-0.465,PL-0.16,z);                  // 側枠の延長(P5 → Q)
  addBox(0.08,0.13,0.10,M.frame,-0.40,PL-0.10,z);}                  // 受け台(延長腕 → チョック)
// スリッター(I = カッター台車の上下アーバー)。刃組はカッター台車(cutter.js)が
// 刃組ガイダンスと同じ計算で組む。ハウジングは台車のギヤボックスと軸端部スタンドが兼ねる。
regRoll('I',SLIT_X,PL+KC_CD/2000,KC_KNIFE_D/2000);
// 出側テーブル
for(let i=0;i<5;i++)roll('R1-'+(i+1),0.75+i*0.45,PL-d2r(98),98,-1,{frame:false});
chainFrame(['R1-1','R1-2','R1-3','R1-4','R1-5'],STRIP_W/2+0.27,2);
// No.2ルーパー(入側カテナリー S1 / 開閉式ループテーブル / 出側カテナリー S2)
roll('S1-1',3.05,PL-d2r(94),94,-1,{frame:false});roll('S1-2',3.40,PL-d2r(94),94,-1,{frame:false});roll('S1-3',3.76,PL-d2r(94),94,-1,{frame:false});
roll('S2-1',7.25,PL-d2r(80),80,-1,{frame:false});roll('S2-2',7.60,PL-d2r(80),80,-1,{frame:false});roll('S2-3',7.95,PL-d2r(80),80,-1,{frame:false});
chainFrame(['S1-1','S1-2','S1-3'],STRIP_W/2+0.27,2);
chainFrame(['S2-1','S2-2','S2-3'],STRIP_W/2+0.27,2);
const looperTable2=buildLooperTable(LOOP2,0.20,6);
// セパ押え(下面=PLで接触) / MDミニ前
roll('T1',8.48,PL+d2r(80),80,1);roll('T2',8.64,PL-d2r(80),80,-1);
// テンションスタンド = MDロール(上下ピンチ式): V=ミニφ250 / W=主φ400(ゴムディスク) — 中心 +9280
housing(8.85,PL+1.1); discRoll('V1',8.85,PL+d2r(250),250,1);discRoll('V2',8.85,PL-d2r(250),250,-1);
housing(9.60,PL+1.2,M.paintDark); discRoll('W1',9.60,PL+d2r(400),400,1);discRoll('W2',9.60,PL-d2r(400),400,-1);
addCylZ(0.18,0.5,M.paintDark,9.60,PL+d2r(400),-(STRIP_W/2+0.95),scene); // MD駆動モーター
addCylZ(0.18,0.5,M.paintDark,9.60,PL-d2r(400),-(STRIP_W/2+0.95),scene);
// 出側ピンチ(ニップ面=PL)
housing(10.35,PL+0.9); roll('X1',10.35,PL+d2r(200),200,1);roll('X2',10.35,PL-d2r(200),200,-1);
// デフロール(上下φ500): Y2上面巻き(dir-1)→Y1下面巻き(dir+1)のS掛け
roll('Y2',10.95,PL+0.27,500,-1);roll('Y1',11.60,PL-0.27,500,1);
// テールキャッチャー(上面接触 → dir-1)
roll('Z',12.40,PL+0.10,190,-1);

/* =========================================================
 * セパレーター(条数依存)
 * =======================================================*/
function clearGroup(grp){grp.traverse(o=>{if(o.geometry)o.geometry.dispose();});grp.clear();}
const sepGroups=[];
// セパレーターディスクは条境界(=丸刃の切断位置)で条間の隙間に垂れ込み、隣り合う条の
// 重なり/絡みを防ぐ。ディスク下端はPLより10mm下(条の間なので帯板とは干渉しない)。
const SEP_Y=PL+0.21, SEP_H=SEP_Y+0.45;          // 軸高さ / 門形フレームの梁高さ
function buildSeparators(){for(const sg of sepGroups)clearGroup(sg.g);
  // ディスク厚は条間隙間(STRAND_GAP)より薄く — 隙間に垂れ込んで条を仕切る
  for(const sg of sepGroups)for(const zc of strandCuts)addCylZ(0.22,STRAND_GAP*0.8,M.knife,sg.x,SEP_Y,zc,sg.g,28);}
(function(){for(const x of [8.25,12.0]){const g=new THREE.Group();scene.add(g);sepGroups.push({x,g});
  for(const s of [-1,1])addBox(0.16,SEP_H,0.16,M.frame,x,SEP_H/2,s*1.3);
  addBox(0.2,0.16,2.76,M.yellow,x,SEP_H,0);
  addCylZ(0.04,STRIP_W+0.8,M.steel,x,SEP_Y,0,scene);
  for(const s of [-1,1])addBox(0.12,0.12,0.42,M.frame,x,SEP_Y,s*1.12);   // 軸受アーム(シャフト端→支柱)
}})();

/* =========================================================
 * サイドスクラップワインダー(立軸・横回転)+ 耳屑ガイドロール列(両側)
 * =========================================================
 * 耳屑はスリッター出側では「幅方向=Z(水平に寝た姿勢)」で出てくる。これを立軸
 * (軸=Y)のドラムへ横回転で巻き取るには、(a)幅方向をY(垂直)へ90°ひねり、
 * (b)水平面内の進行方向をドラムの回転方向に合わせて接線で入れる、の2つが要る。
 * そのための誘導列(片側4本):
 *
 *   SG1 屑上げロール  (軸Z / 下面接触 dir+1) 耳屑をパスライン上へ振り上げる
 *   SG2 水平化ロール  (軸Z / 上面接触 dir-1) 頂点で水平に戻しねじり区間の入口を作る
 *   ── ねじり区間(直線 0.81m ≒ 屑幅の16倍。実機目安の8~10倍以上を満たすので
 *      座屈・耳波を起こさずに幅方向が Z→Y へ回る) ──
 *   VG1 縦ガイドロール(軸Y / 上部アーム吊り) 水平面内でライン外側へ振る
 *   VG2 縦ガイドロール(軸Y / 床置き台座)     ドラムへの接線に乗せる
 *   ドラム(軸Y・下フランジ付き)              横回転で平巻きの屑コイルにする
 *
 * VG1・VG2・ドラムは「中心が常に進行方向の左側」に来る配置で統一してある。
 * つまり耳屑は一度も逆向きに曲がらないまま同じ回転方向でドラムへ入る(逆ひねり
 * ・逆巻き・ロール貫通のいずれも起こらない)。ロール/ドラムの回転方向は接触点の
 * 周速が屑の進行方向と一致する向き = 上から見て左右で対称な向き(dir=-side)。
 */
const ZTRIM=EFF_W/2+TRIM_W/2;            // 耳屑の中心z(スリッター出側)
const SGR=0.05, VGR=0.06;                // ガイドロール半径(φ100 / φ120)
const SG1={x:0.62,y:PL+0.20};           // SG1 屑上げロール中心(立面)
const SG2={x:1.35,y:PL+0.52};           // SG2 水平化ロール中心(立面)
const HTW=SG2.y+SGR+0.006;              // SG2頂点 = ねじり区間 = 巻取り面の高さ
// 水平面は正準座標(u = side*z、ライン外側が正)で扱い、左右は u に side を掛けて反転
const VG1={x:2.16,u:ZTRIM+VGR+0.006};   // VG1(接点zが耳屑のzと一致する位置)
const VG2={x:2.84,u:1.45};              // VG2
const WND={x:2.40,u:2.26};              // 立軸ドラム中心(配置図: スリッター+2400)
const WND_FR=0.50;                       // 下フランジ半径(最大屑コイル r=0.42 を受ける)
const SGZ=1.18;                          // 屑ガイドスタンド柱列のz(出側テーブル枠・その基礎板の外側)

function buildScrapWinder(side){
  const s=side, zt=s*ZTRIM, zb=s*SGZ;
  // ---- 屑上げ/水平化ロール(軸Z・側方スタンドから片持ち) ----
  for(const sg of [{c:SG1,dir:1},{c:SG2,dir:-1}]){const c=sg.c;
    spin(addCylZ(SGR,0.16,rollMats(),c.x,c.y,zt,scene,20),SGR,sg.dir);     // バレル(屑幅より広い)
    addCylZ(0.018,Math.abs(zb-zt)+0.12,M.steel,c.x,c.y,(zt+zb)/2,scene,12);// 軸(スタンドへ片持ち)
    chock(c.x,c.y,SGR,zb);                                                 // 軸受(ピローブロック)
    const hh=c.y-0.081;
    addBox(0.12,hh,0.12,M.paint,c.x,hh/2,zb);                              // 支柱(床から)
    addBox(0.26,0.05,0.34,M.frame,c.x,0.025,zb,scene,false);}              // ベースプレート(台車レールの外に収める)
  // ---- 縦ガイドロール(軸Y) ----
  //  arm : 出側テーブルの真上なので床から柱を立てられない → 外側の柱+水平アームで吊る
  //  base: ライン外側なので床置き台座で支える
  const vroll=(c,mount)=>{
    const z=s*c.u, yb=HTW-0.09, yt=HTW+0.09;
    spin(addCylY(VGR,0.18,rollMats(),c.x,HTW,z,scene,22),VGR,-s,'y');      // バレル(屑幅0.05を余裕で収める)
    if(mount==="arm"){
      addCylY(0.022,0.14,M.steel,c.x,yt+0.07,z,scene,12);                  // 軸(上へ)
      addBox(0.20,0.09,0.20,M.paintDark,c.x,yt+0.045,z);                   // 軸受箱
      const ay=HTW+0.25;
      addBox(0.14,0.14,Math.abs(zb-z)+0.14,M.paint,c.x,ay,(z+zb)/2);       // 水平アーム(屑の上0.15を通す)
      const hh=ay+0.07;
      addBox(0.13,hh,0.13,M.paint,c.x,hh/2,zb);                            // 柱
      addBox(0.36,0.05,0.36,M.frame,c.x,0.025,zb,scene,false);
    }else{
      addBox(0.24,0.12,0.24,M.paintDark,c.x,yb-0.06,z);                    // 軸受箱(台座上)
      const hh=yb-0.12;
      addBox(0.15,hh,0.15,M.paint,c.x,hh/2,z);                             // 台座柱
      addBox(0.34,0.05,0.34,M.frame,c.x,0.025,z,scene,false);}
  };
  vroll(VG1,"arm"); vroll(VG2,"base");
  // ---- 立軸ワインダー本体(高さは巻取り面 HTW から下へ積む) ----
  const wx=WND.x, wz=s*WND.u;
  const yRed=HTW-0.376, yCol=0.32;                               // 減速機の下面 / ベースフレーム上面
  addBox(1.20,0.05,1.20,M.frame,wx,0.025,wz,scene,false);        // 基礎プレート
  addBox(1.00,0.28,1.00,M.paintDark,wx,0.18,wz);                 // ベースフレーム(0.04→0.32)
  addCylY(0.15,yRed-yCol,M.paint,wx,(yCol+yRed)/2,wz,scene,20);  // 固定支柱(ベース → 減速機)
  for(const b of [-1,1]){                                        // 補強ブレース(ベース外周 → 支柱上部)
    const dx=0.30,dy=(yRed-yCol)*0.75,br=addBox(0.09,Math.hypot(dx,dy),0.09,M.paint,wx+b*(0.15+dx/2),yCol+dy/2,wz);
    br.rotation.z=b*Math.atan2(dx,dy);}
  addBox(0.52,0.30,0.52,M.paintDark,wx,yRed+0.15,wz);            // 減速機
  addCylZ(0.13,0.42,M.paintDark,wx,yRed+0.13,wz+s*0.47,scene,18);// 駆動モーター
  addCylY(0.13,0.02,M.steel,wx,yRed+0.31,wz,scene,20);           // 軸受ボス
  // 回転部(軸=Y): 下フランジで平巻きコイルを受け、ドラム外周に巻き付く
  const g=new THREE.Group();g.position.set(wx,HTW,wz);scene.add(g);
  addCylY(WND_FR,0.03,M.paintDark,0,-0.04,0,g,44);               // 下フランジ(軸受ボスの直上)
  addCylY(0.126,0.20,rollMats(),0,0.075,0,g,24);                 // ドラム(巻芯 φ252)
  const coil=addCylY(1,TRIM_W,coilMats(),0,0,0,g,44);            // 屑コイル(平巻き・屑幅厚)
  addCylY(0.24,0.025,M.steel,0,0.0375,0,g,28);                   // 押えプレート(巻き始めの浮き止め)
  addCylY(0.07,0.06,M.steel,0,0.205,0,g,16);                     // 締付ナット
  spin(g,side>0?()=>st.rsR:()=>st.rsL,-s,'y');                   // 横回転(接触点周速=屑の進行方向)
  return {coil,side};
}
const scrapR=buildScrapWinder(1),scrapL=buildScrapWinder(-1);

/* =========================================================
 * ラベル(設備名)
 * =======================================================*/
makeLabel("アンコイラ",UNC_X,UNC_Y+1.35,0);
makeLabel("入側ピンチ",-10.50,PL+1.3,0);
makeLabel("ラフレベラー",-9.45,PL+0.9,0);
makeLabel("入側シャー",-8.51,PL+1.4,0);
makeLabel("ループ前ピンチ",-6.90,PL+1.4,0);
makeLabel("No.1ピット",-3.9,PL+0.5,0);
makeLabel("スリッター前ピンチ",-1.75,PL+1.35,0);
makeLabel("耳屑ガイドロール",SG2.x,PL+1.02, SGZ);
makeLabel("耳屑ガイドロール",SG2.x,PL+1.02,-SGZ);
makeLabel("屑巻取機(立軸・横回転)",WND.x,HTW+0.55, WND.u);
makeLabel("屑巻取機(立軸・横回転)",WND.x,HTW+0.55,-WND.u);
makeLabel("No.2ピット",5.5,PL+0.5,0);
makeLabel("セパレーター",8.25,SEP_H+0.4,0);
makeLabel("テンションスタンド(MD)",9.25,PL+1.65,0);
makeLabel("出側ピンチ",10.35,PL+1.3,0);
makeLabel("デフロール",11.25,PL+1.5,0);
makeLabel("テールキャッチャー",12.40,PL+0.9,0);
makeLabel("リコイラ",REC_X,REC_Y+1.35,0);
makeLabel("回転テーブル(刃組段取り)",SLIT_X,1.35,KC_TT_Z);
