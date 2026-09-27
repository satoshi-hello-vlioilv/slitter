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
roll('E2-1',-9.88,PL-0.06,150,-1,{frame:false,chock:false});const LEV_E1=[roll('E1-1',-9.66,PL+0.06,150,1,{frame:false,chock:false})];
roll('E2-2',-9.44,PL-0.06,150,-1,{frame:false,chock:false});LEV_E1.push(roll('E1-2',-9.22,PL+0.06,150,1,{frame:false,chock:false}));
/* 上ロール(E1-1 入側・E1-2 出側)の押込み d[m]: 上ロール下面 = 下ロール上面(PL+0.015)− d。
   材料力学(mech.js)が曲げの履歴から決める(自動)か、画面で手で入れる */
function setLeveler(d1,d2){[d1,d2].forEach((d,i)=>{const id=i?'E1-2':'E1-1',o=R[id],y=PL+0.015-d+o.r;
  o.y=y;LEV_E1[i].position.y=y;if(o.lbl)o.lbl.position.y=y+o.r;});}
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
  const leaves=[];lp.tableX=[];
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
    for(let i=0;i<n;i++)lp.tableX.push(h.x+h.dir*(clear+(i+0.5)*pitch));      // 閉じたときのテーブルロールの位置(通板の支点)
  }
  lp.tableX.sort((a,b)=>a-b);lp.tableR=r;
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
// セパ押え(下面=PLで接触) / MDミニ前 — 軸受は MD フレーム入側の柱(z ±0.96〜)に腕で取り付ける
roll('T1',8.44,PL+d2r(80),80,1,{frame:false});roll('T2',8.58,PL-d2r(80),80,-1,{frame:false});
for(const [x,y] of [[8.44,PL+d2r(80)],[8.58,PL-d2r(80)]])for(const s of [-1,1])addBox(0.08,0.10,0.05,M.frame,x,y,s*0.945);
// テンションスタンド = MD-1800(md.js): V=ミニφ250(前段)/ W=主φ400(後段)のマルチディスクロール — 中心 MD_X
// 出側ピンチ(ニップ面=PL)。MD の出側スイングテーブル(主ロール出側直後の長さ 400)の先に置く
housing(10.50,PL+0.9); roll('X1',10.50,PL+d2r(200),200,1);roll('X2',10.50,PL-d2r(200),200,-1);
// デフロール(上下φ500): Y2上面巻き(dir-1)→Y1下面巻き(dir+1)のS掛け
roll('Y2',10.95,PL+0.27,500,-1);roll('Y1',11.60,PL-0.27,500,1);
// テールキャッチャー(上面接触 → dir-1)
roll('Z',12.40,PL+0.10,190,-1);

/* ループの前後: 上流/下流の挟み点(ピンチ・刃・押えロール)と、そのあいだで帯を下から受けるロール。
   ループの重みで帯がロールの上から持ち上がる長さは挟み点までで頭打ち(mech.js lift)。 */
Object.assign(LOOP1,{clampInX:R.J2.x,clampOutX:R.L1.x,upRolls:['K1-1','K1-2'],dnRolls:['K2-2']});
Object.assign(LOOP2,{clampInX:SLIT_X,clampOutX:R.T1.x,upRolls:['R1-1','R1-2','R1-3','R1-4','R1-5','S1-1','S1-2'],dnRolls:['S2-2','S2-3']});
for(const lp of [LOOP1,LOOP2]){lp.clampIn=R[lp.inR].x-lp.clampInX;lp.clampOut=lp.clampOutX-R[lp.outR].x;}

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
  const gy=(x>MD_PIT.x0&&x<MD_PIT.x1)?MD_FL:0;                          // MD 区画の中は据付面から立てる
  for(const s of [-1,1])addBox(0.16,SEP_H-gy,0.16,M.frame,x,(SEP_H+gy)/2,s*1.3);
  addBox(0.2,0.16,2.76,M.yellow,x,SEP_H,0);
  addCylZ(0.04,STRIP_W+0.8,M.steel,x,SEP_Y,0,scene);
  for(const s of [-1,1])addBox(0.12,0.12,0.42,M.frame,x,SEP_Y,s*1.12);   // 軸受アーム(シャフト端→支柱)
}})();

/* =========================================================
 * サイドスクラップワインダー(立軸・横回転)— ライン下にもぐらせる配置
 * =========================================================
 * 配置図ではワインダーはスリッター+2400、ライン中心から ±1230 にあり、出側テーブル
 * (板幅+340 のロール・側枠 ±870)と平面で重なる。そこでワインダーは床下のスクラップピット
 * (x 1.42〜3.42 をライン直角に横切る)に沈め、床より 450 下の面で巻く。
 * 出側テーブルの側枠はピットに渡した梁で受ける(柱はピットへ下ろさない)。
 *
 * 耳屑は幅方向=Z(水平に寝た姿勢)でスリッターを出る。経路(片側):
 *   ① 立面(XY面): 刃の外周(下刃、または上刃に押し下げられた下側の包絡)に沿って下がり
 *      SG1(下面接触)で水平に戻す → テーブルロールの下(床上 0.30)をくぐり
 *      SG2(上面接触)でピットへ垂直に落とす → SG3(下面接触)で巻取り面の高さ HTW に水平化
 *   ② ねじり区間: HTW の水平直線 0.61m(屑幅の約12倍)で幅方向を Z → Y へ 90° ひねる
 *   ③ 水平面(XZ面): VG1 → VG2(軸Y)で外へ振り返し、立軸ドラムへ接線で入れる
 * VG1・VG2・ドラムは「中心が常に進行方向の左側」に来る配置で統一してある(逆曲げ・逆巻きなし)。
 * ロール/ドラムの回転方向は接触点の周速が屑の進行方向と一致する向き。
 */
const ZTRIM=EFF_W/2+TRIM_W/2;            // 耳屑の中心z(スリッター出側)
const SGR=0.05, VGR=0.06;                // ガイドロール半径(φ100 / φ120)
const HTW=-0.45;                         // 巻取り面(床より 450 下 = ピットの中)
const SG1={x:0.58,y:0.36};              // SG1 水平戻しロール(台車の台座 x±0.38 の外・テーブルロールの下)
const SG2={x:1.58,y:0.25};              // SG2 落としロール(ピットの縁の内側)
const SG3={x:SG2.x+2*(SGR+0.006),y:HTW+SGR+0.006};   // SG3 水平化ロール(SG2 から垂直に落ちた所)
// 水平面は正準座標(u = side*z、ライン外側が正)で扱い、左右は u に side を掛けて反転
const VG1={x:2.30,u:ZTRIM+VGR+0.006};   // VG1(接点zが耳屑のzと一致する位置)
const VG2={x:3.10,u:0.80};              // VG2(ピットの下流側で外へ振り返す)
const WND={x:2.40,u:1.23};              // 立軸ドラム中心(配置図: スリッター+2400・ライン中心 ±1230)
const WND_FR=0.50;                       // 下フランジ半径(最大屑コイル r=0.42 を受ける)
const SGZ=1.18;                          // 屑ガイドロールの軸受柱列のz(出側テーブル側枠 ±0.87 の外)

function buildScrapWinder(side){
  const s=side, zt=s*ZTRIM, zb=s*SGZ, PF=SCRAP_PIT.floor;
  // ---- SG1〜SG3(軸Z・側方の柱から片持ち) ----
  const sroll=(c,dir)=>{
    spin(addCylZ(SGR,0.16,rollMats(),c.x,c.y,zt,scene,20),SGR,dir);          // バレル(屑幅より広い)
    addCylZ(0.018,Math.abs(zb-zt)+0.12,M.steel,c.x,c.y,(zt+zb)/2,scene,12);   // 軸(柱へ片持ち)
    chock(c.x,c.y,SGR,zb);};
  sroll(SG1,1);sroll(SG2,-1);sroll(SG3,1);
  {const hh=SG1.y-0.081;addBox(0.12,hh,0.12,M.paint,SG1.x,hh/2,zb);addBox(0.26,0.05,0.34,M.frame,SG1.x,0.025,zb,scene,false);}
  {const x=(SG2.x+SG3.x)/2,top=SG2.y-0.08,hh=top-PF;                         // SG2/SG3 は1本の柱(ピット底から)
    addBox(0.14,hh,0.12,M.paint,x,PF+hh/2,zb);addBox(0.34,0.05,0.34,M.frame,x,PF+0.025,zb,scene,false);}
  // ---- 縦ガイドロール(軸Y・ピット底の台座) ----
  const vroll=c=>{const z=s*c.u,yb=HTW-0.09;
    spin(addCylY(VGR,0.18,rollMats(),c.x,HTW,z,scene,22),VGR,-s,'y');        // バレル(屑幅0.05を余裕で収める)
    addBox(0.24,0.12,0.24,M.paintDark,c.x,yb-0.06,z);                          // 軸受箱
    const hh=yb-0.12-PF;addBox(0.15,hh,0.15,M.paint,c.x,PF+hh/2,z);
    addBox(0.34,0.05,0.34,M.frame,c.x,PF+0.025,z,scene,false);};
  vroll(VG1);vroll(VG2);
  // ---- 立軸ワインダー本体(ピット底から積む) ----
  const wx=WND.x, wz=s*WND.u;
  const yRed=HTW-0.376, yCol=PF+0.32;                            // 減速機の下面 / ベースフレーム上面
  addBox(0.95,0.05,0.95,M.frame,wx,PF+0.025,wz,scene,false);     // 基礎プレート
  addBox(0.80,0.28,0.80,M.paintDark,wx,PF+0.18,wz);              // ベースフレーム
  addCylY(0.15,yRed-yCol,M.paint,wx,(yCol+yRed)/2,wz,scene,20);  // 固定支柱(ベース → 減速機)
  for(const b of [-1,1]){                                        // 補強ブレース(ベース外周 → 支柱上部)
    const dx=0.24,dy=(yRed-yCol)*0.75,br=addBox(0.08,Math.hypot(dx,dy),0.08,M.paint,wx+b*(0.15+dx/2),yCol+dy/2,wz);
    br.rotation.z=b*Math.atan2(dx,dy);}
  addBox(0.52,0.30,0.52,M.paintDark,wx,yRed+0.15,wz);            // 減速機
  addCylZ(0.13,0.42,M.paintDark,wx,yRed+0.13,wz+s*0.47,scene,18);// 駆動モーター(ライン外側へ)
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
// 取付点は設備の上面(コイラはコイルの上面を追う)。rank の小さい札から良い場所へ置く。
makeLabel("アンコイラ",UNC_X,0,0,{rank:2,follow:p=>p.set(UNC_X,UNC_Y+st.ru+0.02,0)});
makeLabel("リコイラ",REC_X,0,0,{rank:3,follow:p=>p.set(REC_X,REC_Y+Math.max(st.rr,R_MANDREL)+0.02,0)});
makeLabel("No.1ピット",(PIT1.x0+PIT1.x1)/2,0.02,PIT_HZ,{rank:4});          // ピット開口の操作側の縁
makeLabel("No.2ピット",(PIT2.x0+PIT2.x1)/2,0.02,PIT_HZ,{rank:5});
makeLabel("屑巻取機(立軸・横回転)",WND.x,0.02,(SCRAP_PIT.cover.z0+SCRAP_PIT.cover.hatch.z1)/2,{rank:7});   // 操作側は蓋の下 → 点検蓋に付ける
makeLabel("屑巻取機(立軸・横回転)",WND.x,HTW+0.24,-WND.u,{rank:7});                      // 駆動側は開口から見える(スクラップピット)
makeLabel("入側シャー",-8.51,PL+1.07,0,{rank:8});
makeLabel("ラフレベラー",-9.45,PL+0.15,0,{rank:9});
makeLabel("入側ピンチ",-10.50,PL+1.02,0,{rank:10});
makeLabel("ループ前ピンチ",-6.90,PL+1.07,0,{rank:11});
makeLabel("スリッター前ピンチ",-1.80,PL+1.02,0,{rank:12});
makeLabel("出側ピンチ",10.35,PL+1.02,0,{rank:13});
makeLabel("セパレーター",8.25,SEP_H+0.09,0,{rank:14});
makeLabel("デフロール",10.95,PL+0.53,0,{rank:15});
makeLabel("テールキャッチャー",12.40,PL+0.21,0,{rank:16});
makeLabel("耳屑ガイドロール",SG2.x,SG2.y+0.06, ZTRIM,{rank:17});
makeLabel("耳屑ガイドロール",SG2.x,SG2.y+0.06,-ZTRIM,{rank:17});
makeLabel("回転テーブル(台車入替え)",KC_TT.x-1.2,0.03,KC_TT_Z,{rank:18});  // 台車が載っても隠れない甲板の上流側の縁
