"use strict";
/* =========================================================
 * 刃組マスタ(WaveLog 刃組ガイダンスからマスタごと移植)
 * =========================================================
 * 出どころ: WaveLog `backend/repositories/bladeset_repo.py`
 *   STANDARD_DEFAULTS / SEED_* / RING_COLOR_CYCLE / FINGER_SHAPE / CARRIAGE_SEED と
 *   seed_standard_parts()(「図面どおりの1式」)・context() の戻りの形。
 * 表の並び・列名・既定値・初期セットの数量は WaveLog のまま持つ。画面と計算
 * (blade-core.js)は WaveLog の `/api/bladeset/context` と同じ形でこれを読む。
 * 設備諸元の出どころは設備図面 SL-1458-01S(アーバー有効長 1599.6 / 軸Φ200 ほか)。
 * =======================================================*/
const BLADESET_MASTER=(function(){
  const EQ="アルミ多条割スリッターライン";          // 設備名(1設備=1行)

  /* ---- 5 刃組基準値マスタ(既定はコード・上書きだけがDB) ---- */
  const STANDARD_DEFAULTS={
    arborLen:1599.6,
    centerFromDatum:null,          // 板の中心(基準面から)。空=有効長の中央
    floatSeatStroke:0.95,          // フローティングシート押さえ代(F.P.ストローク)
    shaftDia:200.0,
    spacerOD:240.0, ringBore:241.0,
    minDia:305.0, grindCycleDays:60,
    fingerMax:0.6, gapMax:5.0,
    pushTarget:0.5, pushMin:0.4, pushMax:0.9,
    pushHardMin:0.3, pushHardMax:1.0,
    nipMin:0.5, nipMax:1.0, nipHardMin:0.3, nipHardMax:1.3,
    offsetTol:0.05, offsetHardTol:0.10,
    clearance:0.15, clearanceRate:0.1, overlap:0.2, bladeThickness:10.0,
    canNakanuki:true, scrapWidth:30.0, sizeStep:0.05,
    ringGapMin:2.0, ringGapMax:5.0,
    fingerGapMin:0.0, fingerGapMax:0.0,
    viewDatumPos:"右", sideNameOS:"OS", sideNameDS:"DS",
  };
  // DBの列名 ↔ 鍵(WaveLog `_STANDARD_MAP`)
  const STANDARD_MAP=[
    ["アーバー有効長","arborLen","num"],["板の中心","centerFromDatum","num"],
    ["フローティングシート押さえ代","floatSeatStroke","num"],["軸外径","shaftDia","num"],
    ["スペーサー外径","spacerOD","num"],["リング内径","ringBore","num"],
    ["刃使用限界径","minDia","num"],["研磨周期日","grindCycleDays","int"],
    ["フィンガー切替板厚","fingerMax","num"],["刃間隙間上限","gapMax","num"],
    ["押上目標","pushTarget","num"],["押上下限","pushMin","num"],["押上上限","pushMax","num"],
    ["押上不適下限","pushHardMin","num"],["押上不適上限","pushHardMax","num"],
    ["ニップ下限","nipMin","num"],["ニップ上限","nipMax","num"],
    ["ニップ不適下限","nipHardMin","num"],["ニップ不適上限","nipHardMax","num"],
    ["上下左右差許容","offsetTol","num"],["上下左右差不適","offsetHardTol","num"],
    ["クリアランス既定","clearance","num"],["クリアランス率","clearanceRate","num"],
    ["ラップ既定","overlap","num"],["刃厚既定","bladeThickness","num"],
    ["中抜き可","canNakanuki","flag"],["屑条幅既定","scrapWidth","num"],["寸法刻み","sizeStep","num"],
    ["ゴムリング空き下限","ringGapMin","num"],["ゴムリング空き上限","ringGapMax","num"],
    ["フィンガー空き下限","fingerGapMin","num"],["フィンガー空き上限","fingerGapMax","num"],
    ["図の基準原点の位置","viewDatumPos","pos"],["OSの呼び方","sideNameOS","text"],["DSの呼び方","sideNameDS","text"],
  ];

  /* ---- 語彙 ---- */
  const BLADE_GENERAL="一般", BLADE_MAINT="メンテナンス中", BLADE_SPECIAL="専用";
  const BLADE_STATUS=[BLADE_GENERAL,BLADE_MAINT,BLADE_SPECIAL];
  const SPACER_USES=["基準用","基準微調整用","巾設定用","軽量形"];
  // 外径1mmごとの色の周期(内径241のとき 赤40.5 … ピンク36.0)
  const RING_COLOR_CYCLE=[
    ["赤","#d93a34"],["青","#1f6fc4"],["黄","#e8b400"],
    ["緑","#2e9e4f"],["茶","#8a5a2b"],["灰","#9aa0a6"],
    ["橙","#f08a1c"],["黒","#2b3038"],["水","#33bff0"],
    ["ピンク","#f0a882"],
  ];
  const RING_COLOR_TOP_OD=322;      // 周期の先頭(新品時の外径)
  // フィンガーの形(図面 N2-10689-1 / DK4-0300 LS-4 布入ベークライト)
  const FINGER_SHAPE={length:560.0,thickness:20.0,grindRun:20.0,grindDrop:6.0};
  const CARRIAGE_SEED=["A台車","B台車"], CARRIAGE_NONE="台車なし";
  const BLADEPICK_FIELDS=[
    ["thickness","板厚","num"],["coilWidth","元コイル幅","num"],["strips","条数","num"],
    ["minWidth","条幅（いちばん狭い）","num"],["maxWidth","条幅（いちばん広い）","num"],
    ["material","材質","text"],["lotNo","ロット番号","text"],
  ];
  const BLADEPICK_OPS=[["eq","＝"],["ne","≠"],["ge","≧"],["gt","＞"],["le","≦"],["lt","＜"],["between","範囲"],["contains","含む"]];

  /* ---- 初期セット(図面の製作数どおりの1式) ---- */
  const SEED_SPACERS=[
    [100,30,"軽量形"],[50,50,"軽量形"],[30,50,"巾設定用"],
    [20,60,"巾設定用"],[15,60,"巾設定用"],[14,60,"巾設定用"],
    [13,60,"巾設定用"],[12,60,"巾設定用"],[11,60,"巾設定用"],
    [10.9,40,"基準微調整用"],[10.8,40,"基準微調整用"],
    [10.75,40,"基準微調整用"],[10.7,40,"基準微調整用"],
    [10.6,40,"基準微調整用"],[10.5,40,"基準微調整用"],
    [10.4,40,"基準微調整用"],[10.3,42,"基準微調整用"],
    [10.2,42,"基準微調整用"],[10.1,42,"基準微調整用"],
    [10.05,22,"基準微調整用"],[10.025,2,"基準用"],
    [10,60,"巾設定用"],[9,60,"巾設定用"],[8,60,"巾設定用"],
    [7,60,"巾設定用"],[6,60,"巾設定用"],
  ];
  const SEED_RING_WIDTHS=[[50,50],[30,40],[20,40],[15,30],[10,30]];   // ゴムリングの幅と本数(色ごと同じ顔ぶれ)
  const SEED_LUBE={color:"潤滑",width:10.0,od:270.0,bore:240.0,qty:80};  // 潤滑リング
  const SEED_BLADE_GROUPS=["A","B","C"], SEED_BLADE_THICKNESS=[10,5], SEED_BLADE_QTY=70, SEED_BLADE_DIA=318.2;
  const SEED_FINGERS=[
    ["フィンガー 10",10.0,60],["フィンガー 20",20.0,60],
    ["フィンガー 21",21.0,60],["フィンガー 22",22.0,60],
    ["フィンガー 23",23.0,60],["フィンガー 24",24.0,60],
    ["フィンガー 25",25.0,60],["フィンガー 26",26.0,60],
    ["フィンガー 27",27.0,60],["フィンガー 28",28.0,60],
    ["フィンガー 29",29.0,60],["フィンガー 30",30.0,50],
    ["フィンガー 50",50.0,50],["フィンガー 100",100.0,30],
  ];

  function ringColorOf(od){                 // 外径から色(マスタに無い径でも必ず答える)
    const n=Number(od);if(!Number.isFinite(n))return{color:"",hex:"#8d97a6"};
    const L=RING_COLOR_CYCLE.length,i=((Math.round(RING_COLOR_TOP_OD-n)%L)+L)%L;
    return{color:RING_COLOR_CYCLE[i][0],hex:RING_COLOR_CYCLE[i][1]};}

  /* seed_standard_parts() と同じ手順で各マスタの行を起こす(行の形は _xxx_row() の戻り) */
  const on=(o)=>Object.assign(o,{equipment:EQ,enabled:true,enabledText:"有効"});
  const blades=[];let id=0,order=0;
  for(const g of SEED_BLADE_GROUPS)for(const tk of SEED_BLADE_THICKNESS){order+=10;
    blades.push(on({id:++id,name:tk+"mm "+g,group:g,thickness:tk,currentDia:SEED_BLADE_DIA,
      qty:SEED_BLADE_QTY,minQty:0,lastGrind:"",grindCount:0,status:BLADE_GENERAL,note:"",order}));}
  const spacers=[];id=0;order=0;
  for(const [sz,qty,use] of SEED_SPACERS){order+=10;
    spacers.push(on({id:++id,size:sz,qty,minQty:0,use,note:"",order}));}
  const rings=[];id=0;order=0;
  RING_COLOR_CYCLE.forEach(([color,hex],i)=>{const od=RING_COLOR_TOP_OD-i;
    for(const [width,qty] of SEED_RING_WIDTHS){order+=10;
      rings.push(on({id:++id,color,hex,lube:false,lubeText:"ゴムリング",od,bore:STANDARD_DEFAULTS.ringBore,
        width,qty,minQty:0,note:"",order}));}});
  order+=10;
  rings.push(on({id:++id,color:SEED_LUBE.color,hex:"",lube:true,lubeText:"潤滑リング",od:SEED_LUBE.od,
    bore:SEED_LUBE.bore,width:SEED_LUBE.width,qty:SEED_LUBE.qty,minQty:0,note:"",order}));
  const fingers=[];id=0;order=0;
  for(const [name,width,qty] of SEED_FINGERS){order+=10;
    fingers.push(on({id:++id,name,width,qty,minQty:0,maxThickness:STANDARD_DEFAULTS.fingerMax,
      length:FINGER_SHAPE.length,thickness:FINGER_SHAPE.thickness,grindRun:FINGER_SHAPE.grindRun,
      grindDrop:FINGER_SHAPE.grindDrop,note:"",order}));}
  const carriages=CARRIAGE_SEED.map((name,i)=>on({id:i+1,name,note:"",order:(i+1)*10}));

  /* context() と同じ形(1往復ぶんのひとまとまり) */
  return{
    equipment:EQ,
    standard:Object.assign({},STANDARD_DEFAULTS), standardStored:false, standardId:null,
    standardDefaults:Object.assign({},STANDARD_DEFAULTS),
    blades, spacers, rings, fingers,
    history:[],                      // 刃組履歴マスタ(記録なし)
    picks:[],                        // 刃選択マスタ(「専用」を選ぶ決まり — 登録なし)
    carriages, carriageSeed:CARRIAGE_SEED.slice(), carriageNone:CARRIAGE_NONE,
    designs:[],                      // 条設計マスタ(登録なし)
    bladeStatus:BLADE_STATUS.slice(), bladeGeneral:BLADE_GENERAL, bladeSpecial:BLADE_SPECIAL, bladeMaint:BLADE_MAINT,
    fingerShape:Object.assign({},FINGER_SHAPE),
    pickFields:BLADEPICK_FIELDS.map(([field,label,kind])=>({field,label,kind})),
    pickOps:BLADEPICK_OPS.map(([op,label])=>({op,label,two:op==="between"})),
    spacerUses:SPACER_USES.slice(),
    ringColors:RING_COLOR_CYCLE.map(([color,hex],i)=>({color,hex,od:RING_COLOR_TOP_OD-i})),
    // 表の定義(画面のマスタ一覧が列名をここから引く)
    STANDARD_MAP, ringColorOf, RING_COLOR_TOP_OD,
  };
})();
