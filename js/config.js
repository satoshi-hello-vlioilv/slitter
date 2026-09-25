"use strict";
/* =========================================================
 * アプリバージョン
 * =======================================================*/
const APP_VERSION = "1.12.0";
document.title = "アルミ多条割スリッターライン 3Dシミュレーター v" + APP_VERSION;
{
  const el = document.getElementById("appVersion");
  if (el) el.textContent = "v" + APP_VERSION;
}
console.log("[Slitter Simulator] version " + APP_VERSION);

/* =========================================================
 * カッター台車の機械寸法(WaveLog 刃組ガイダンス blade-3d.js の MACH を移植・単位mm)
 * 図面 SL-1458-01S(軸まわり)/ SL-1458-03SA(走行・回転)と外観図の概寸。
 * **ラインのパスラインはこの台車の高さから決める**: 台車は工場床のレールに載り、
 *   床 → 台座上面 floorDrop / 台座上面 → 下軸中心 baseDrop / 下軸 → パスライン = 軸間/2
 * 軸間 = 刃径 − ラップ(刃マスタの現状径・刃組基準値のラップ既定)。
 * =======================================================*/
const KC_MACH = {
  lineC:830, gapOS:30, gapDS:110, standDS:175, travel:330, arbor0:1600,
  baseL:2325, baseToLine:1240, baseD:760, baseH:80, baseDrop:285,
  gearW:300, gearD:460, standW:190, standD:430, brgW:130, brgD:300,
  tieY:475, tieR:26, tieHubR:72, wheelR:237.5,
  railZ:330, railDrop:216, floorDrop:268, wheelRun:65, skirtD:480, ribD:460,
  ttX:3400, ttPad:40, sepGap:40, sepW:470,
};
const KC_KNIFE_D = BLADESET_MASTER.blades.length ? BLADESET_MASTER.blades[0].currentDia : 318.2;
const KC_CD = KC_KNIFE_D - BLADESET_MASTER.standardDefaults.overlap;      // 上下軸の中心間(実寸)
// 回転テーブル(甲板半径 = 台座の半分 + 余裕)と引出し先の位置。床の開口もここから決まる
const KC_BASE_L = KC_MACH.baseL + (BLADESET_MASTER.standardDefaults.arborLen - KC_MACH.arbor0);
const KC_TT_R = KC_BASE_L/2 + KC_MACH.ttPad;                            // 甲板半径[mm]
const KC_TT_Z = KC_MACH.ttX/1000;                                        // 回転テーブル中心 z[m](操作側)
const KC_PIT_R = (KC_TT_R + 190)/1000;                                   // 回転テーブル ピット縁の半径[m]

/* =========================================================
 * ライン緒元 / レイアウト(横からの概略図に準拠・1単位=1m)
 * =======================================================*/
const PL      = (KC_MACH.floorDrop + KC_MACH.baseDrop + KC_CD/2)/1000;   // パスライン高さ [m] = 0.712
const STRIP_W = 1.20;             // 母材幅 [m]
const TRIM_W  = 0.05, EFF_W = STRIP_W - TRIM_W*2;
// コイラはマンドレル中心をパスラインより上に置く(φ2100の満巻きでも床から0.15m浮く高さ)。
// 帯板はスナバー/デフロールでパスラインとの高低差を取る。コイルカーは床下のピットを走る。
const UNC_X = -12.65, UNC_Y = 1.20; // アンコイラ中心(スリッター手前 12650)
const REC_X =  13.71, REC_Y = 1.20; // リコイラ中心(スリッター後 13710)
const SLIT_X = 0;                 // スリッターヘッド
const R_MANDREL = 0.20;
const RU_MAX = 1.05, RU_MIN = 0.40;
const RR_MIN = 0.30, RR_MAX = 1.00;
const H_VIS  = 0.020, UV_SCALE = 2.0;
const ACCEL = 0.40, DECEL = 0.55;
// リボン頂点数: 巻付き弧(コイル/スナバー/ベンド/デフ)が等間隔リサンプリングで
// 弦近似に潰れてロールへ食い込まない密度を確保する。耳屑は小径ガイドロール
// (φ100~120)への巻付き弧を多数含むので点間約8mmまで細かくする。
// TWIST_N = 耳屑ねじり区間(幅方向 Z→Y の90°ひねり)の分割数。
const ENTRY_N = 520, STRAND_N = 340, TRIM_N = 660, TWIST_N = 12;
// ルーパーピット(配置図の No.1/No.2 ピット)。開口 = ループ区間(端部カテナリーロール間)
const PIT1={x0:-5.40,x1:-2.40}, PIT2={x0:3.76,x1:7.25};
const FAC_X0=-22, FAC_X1=24;             // 建屋(床・柱)の範囲
const PIT_HZ=1.00;                      // ピット側壁の内面z(=床の開口端)
// ピット床(上面)。パスラインから 4.55m 下 — 最大ループ深さ LOOP_DMAX の下に 1.3m 余裕を残す
const PIT_FLOOR = PL-4.55;
// コイルカーピット(床下の走行溝)。コイラの中心が低いのでカーは床下を走ってコイルの下へ入る
const CAR_Y = -1.05;                     // カー走行面(レール上面)
const CAR_PIT_D = -CAR_Y+0.06;           // ピット深さ(床上面から。レール高さぶん下)
const CAR_PITS = [                       // 入側・出側コイルカーのピット(x中心, z範囲)
  {x:UNC_X, z0:-0.75, z1:5.20}, {x:REC_X, z0:-0.75, z1:6.30}];
const CAR_PIT_HW = 1.10;                 // ピット半幅(φ1900のコイルを載せたカーが通る)
// 板厚と可視化厚の比 = 表示長さ→実長さの倍率。コイル1本(可視長約150m)が
// 実機の約6000m(φ2100・t0.5・W1200相当)に対応する。板厚はUIで変えられる。
const lenScale = () => H_VIS/(st.thick/1000);   // 可視長 → 実長
const LOOP_DMAX = 3.2;                  // ループ最大深さ[m](ピット床まで余裕を残す)
const STRAND_GAP = 0.003;               // 条間の隙間[m] — 実機はスリット代のみでほぼ密着
const d2r = (mm)=> mm/2000;       // 直径[mm] → 半径[m]

const st = {
  v:0, target:80/60, paused:false, state:"RUN", tChange:0, swapped:false,
  ru:RU_MAX, rr:RR_MIN, rsL:0.13, rsR:0.13, len:0, N:4, texOfs:0,
  loop1:1, loop2:1, loop1Tgt:1, loop2Tgt:1,   // ルーパーテーブル開度(0=閉/ループ無し, 1=開/フリーループ)
  shape:"center", shapeI:20, lenCoil:0,       // 板形状(歪)の種類 / 量[I-unit] / 現コイルの通板長
  thick:0.5,                                  // 板厚[mm](刃組・コイル長さの両方が読む)
  thread:1,                                   // 通板状態(1=通板済 0=抜取済)。抜取り/通板の途中は strip.js の thread
};
