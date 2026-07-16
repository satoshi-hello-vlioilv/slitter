"use strict";
/* =========================================================
 * アプリバージョン
 * =======================================================*/
const APP_VERSION = "1.4.0";
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
const ENTRY_N = 150, STRAND_N = 180, TRIM_N = 26;
const PIT1={x0:-15.2,x1:-8.4}, PIT2={x0:5.6,x1:11.6};   // ルーパーピット
const d2r = (mm)=> mm/2000;       // 直径[mm] → 半径[m]

const st = {
  v:0, target:80/60, paused:false, state:"RUN", tChange:0, swapped:false,
  ru:RU_MAX, rr:RR_MIN, rsL:0.13, rsR:0.13, len:0, N:4, texOfs:0,
};
