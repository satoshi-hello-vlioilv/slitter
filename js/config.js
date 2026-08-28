"use strict";
/* =========================================================
 * アプリバージョン
 * =======================================================*/
const APP_VERSION = "1.10.0";
document.title = "アルミ多条割スリッターライン 3Dシミュレーター v" + APP_VERSION;
{
  const el = document.getElementById("appVersion");
  if (el) el.textContent = "v" + APP_VERSION;
}
console.log("[Slitter Simulator] version " + APP_VERSION);

/* =========================================================
 * ライン緒元 / レイアウト(横からの概略図に準拠・1単位=1m)
 * =======================================================*/
const PL      = 2.2;              // パスライン高さ [m]
const STRIP_W = 1.20;             // 母材幅 [m]
const TRIM_W  = 0.05, EFF_W = STRIP_W - TRIM_W*2;
const UNC_X = -31.0, UNC_Y = PL;  // アンコイラ中心
const REC_X =  24.5, REC_Y = PL;  // リコイラ中心
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
// ルーパーピット。開口はループ区間(端部カテナリーロール間)を必ず含む —
// PIT2の出側はループ終端 S2-1(x=11.8)に合わせてある。
const PIT1={x0:-15.2,x1:-8.4}, PIT2={x0:5.6,x1:11.8};
const PIT_HZ=1.00;                      // ピット側壁の内面z(=床の開口端)
// 板厚と可視化厚の比 = 表示長さ→実長さの倍率。コイル1本(可視長約150m)が
// 実機の約6000m(φ2100・t0.5・W1200相当)に対応する。
const STRIP_T = 0.0005;                 // 実板厚 0.5mm
const LEN_SCALE = H_VIS/STRIP_T;        // 可視長 → 実長 (=40)
const LOOP_DMAX = 3.2;                  // ループ最大深さ[m](ピット床まで余裕を残す)
const STRAND_GAP = 0.003;               // 条間の隙間[m] — 実機はスリット代のみでほぼ密着
const d2r = (mm)=> mm/2000;       // 直径[mm] → 半径[m]

const st = {
  v:0, target:80/60, paused:false, state:"RUN", tChange:0, swapped:false,
  ru:RU_MAX, rr:RR_MIN, rsL:0.13, rsR:0.13, len:0, N:4, texOfs:0,
  loop1:1, loop2:1, loop1Tgt:1, loop2Tgt:1,   // ルーパーテーブル開度(0=閉/ループ無し, 1=開/フリーループ)
  shape:"center", shapeI:20, lenCoil:0,       // 板形状(歪)の種類 / 量[I-unit] / 現コイルの通板長
};
