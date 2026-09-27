"use strict";
/* =========================================================
 * テクスチャ / マテリアル
 * =======================================================*/
function canvasTex(w,h,draw){const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();t.encoding=THREE.sRGBEncoding;return t;}
/* =========================================================
 * アルミ材の外観(仕上げパターン + 詳細調整)
 * =========================================================
 * 板面テクスチャは1枚のキャンバスを描き直して差し替える(テクスチャ実体を
 * 保つのでUVスクロール offset の設定はそのまま効く)。
 * 目のパターンは圧延方向=帯板長手方向(テクスチャの横方向)に流れる。 */
function drawAluPattern(kind,g,w,h){
  const base={mill:"#d8dde2",hairline:"#d5dade",mirror:"#e3e9ee",matte:"#cdd3d9"}[kind]||"#d8dde2";
  g.clearRect(0,0,w,h);g.fillStyle=base;g.fillRect(0,0,w,h);
  const sheen=(n,half,a)=>{for(let i=0;i<n;i++){const x=Math.random()*w,gr=g.createLinearGradient(x-half,0,x+half,0);
    gr.addColorStop(0,"rgba(255,255,255,0)");gr.addColorStop(0.5,`rgba(255,255,255,${a})`);gr.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=gr;g.fillRect(x-half,0,half*2,h);}};
  if(kind==="mirror"){sheen(4,64,0.16);return;}                          // 鏡面(BA): 目がほぼ無く映り込みの帯
  if(kind==="hairline"){                                                 // ヘアライン: 細く密な長手方向の筋
    for(let i=0;i<420;i++){const len=60+Math.random()*300;
      g.fillStyle=`rgba(${Math.random()<0.5?"120,130,140":"255,255,255"},${0.05+Math.random()*0.10})`;
      g.fillRect(Math.random()*w,Math.random()*h,len,1);}
    sheen(2,50,0.07);return;}
  if(kind==="matte"){                                                    // つや消し(焼鈍/梨地): 微細な斑
    for(let i=0;i<2600;i++){g.fillStyle=`rgba(${Math.random()<0.5?"140,148,156":"236,240,244"},${0.05+Math.random()*0.08})`;
      g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}
    return;}
  for(let i=0;i<90;i++){const y=Math.random()*h,len=40+Math.random()*200; // ミルフィニッシュ(標準)
    g.fillStyle=`rgba(${Math.random()<0.5?"90,100,110":"255,255,255"},${0.03+Math.random()*0.06})`;g.fillRect(Math.random()*w,y,len,1+Math.random()*1.5);}
  sheen(5,22,0.10);}
const stripTex=canvasTex(512,128,(g,w,h)=>drawAluPattern("mill",g,w,h));
const coilCapTex=canvasTex(512,512,(g,w,h)=>{const cx=w/2,cy=h/2;g.fillStyle="#c2c8cf";g.fillRect(0,0,w,h);
  for(let r=8;r<w/2;r+=5){g.strokeStyle=`rgba(70,80,90,${0.10+Math.random()*0.14})`;g.lineWidth=1.4;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();}
  g.strokeStyle="rgba(60,70,80,0.55)";g.lineWidth=3.5;g.beginPath();g.moveTo(cx,cy);g.lineTo(w,cy);g.stroke();});
const rollCapTex=canvasTex(256,256,(g,w,h)=>{const cx=w/2,cy=h/2;g.fillStyle="#8d949c";g.fillRect(0,0,w,h);
  g.fillStyle="#5a6068";g.beginPath();g.arc(cx,cy,28,0,Math.PI*2);g.fill();g.strokeStyle="rgba(50,56,64,0.7)";g.lineWidth=9;
  for(let i=0;i<4;i++){const a=i*Math.PI/2;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*w/2,cy+Math.sin(a)*w/2);g.stroke();}
  g.strokeStyle="rgba(255,255,255,0.25)";g.lineWidth=4;g.beginPath();g.arc(cx,cy,w/2-12,0,Math.PI*2);g.stroke();});
const concreteTexBase=canvasTex(256,256,(g,w,h)=>{g.fillStyle="#79808a";g.fillRect(0,0,w,h);
  for(let i=0;i<900;i++){g.fillStyle=`rgba(${Math.random()<0.5?"50,54,60":"175,182,190"},${0.04+Math.random()*0.05})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}
  g.strokeStyle="rgba(45,50,58,0.5)";g.lineWidth=2;g.strokeRect(0,0,w,h);});
function concreteTex(rx,ry){const t=concreteTexBase.clone();t.needsUpdate=true;t.repeat.set(rx,ry);return t;}
const hazardTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle="#16191d";g.fillRect(0,0,w,h);g.fillStyle="#e8b324";
  for(let x=-h;x<w+h;x+=44){g.beginPath();g.moveTo(x,0);g.lineTo(x+22,0);g.lineTo(x+22-h,h);g.lineTo(x-h,h);g.closePath();g.fill();}});

// 縞鋼板(チェッカープレート)— 斜めの突起を千鳥に並べる。box の UV は面ごとに 0〜1 なので 1面に 12×12 個
const checkerTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle="#8b939b";g.fillRect(0,0,w,h);
  const n=12,s=w/n;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const cx=(i+0.5)*s,cy=(j+0.5)*s,a=((i+j)%2?1:-1)*Math.PI/4;
    g.save();g.translate(cx,cy);g.rotate(a);g.fillStyle="rgba(40,46,52,0.55)";g.fillRect(-s*0.34,-s*0.07+1.2,s*0.68,s*0.14);
    g.fillStyle="rgba(215,222,228,0.75)";g.fillRect(-s*0.34,-s*0.07,s*0.68,s*0.12);g.restore();}});
const M={
  checker:new THREE.MeshStandardMaterial({map:checkerTex,metalness:0.6,roughness:0.45}),
  strip:new THREE.MeshStandardMaterial({map:stripTex,color:0xeef2f5,metalness:0.45,roughness:0.5,side:THREE.DoubleSide}),
  coilSide:new THREE.MeshStandardMaterial({map:stripTex,color:0xd2d8dd,metalness:0.8,roughness:0.32}),
  coilCap:new THREE.MeshStandardMaterial({map:coilCapTex,metalness:0.7,roughness:0.42}),
  roll:new THREE.MeshStandardMaterial({color:0x9aa2aa,metalness:0.9,roughness:0.32}),
  rollCap:new THREE.MeshStandardMaterial({map:rollCapTex,metalness:0.75,roughness:0.4}),
  rubber:new THREE.MeshStandardMaterial({color:0x2c3036,metalness:0.1,roughness:0.85}),
  rubberA:new THREE.MeshStandardMaterial({color:0x42474e,metalness:0.04,roughness:0.92}),
  rubberB:new THREE.MeshStandardMaterial({color:0x32363c,metalness:0.04,roughness:0.95}),
  paint:new THREE.MeshStandardMaterial({color:0x33688f,metalness:0.35,roughness:0.55}),
  paintDark:new THREE.MeshStandardMaterial({color:0x24465f,metalness:0.35,roughness:0.6}),
  frame:new THREE.MeshStandardMaterial({color:0x39424c,metalness:0.55,roughness:0.5}),
  frameGlass:new THREE.MeshStandardMaterial({color:0x5a6470,metalness:0.4,roughness:0.5,transparent:true,opacity:0.28,depthWrite:false}),
  steel:new THREE.MeshStandardMaterial({color:0xb6bcc3,metalness:0.9,roughness:0.3}),
  knife:new THREE.MeshStandardMaterial({color:0xd5dade,metalness:0.95,roughness:0.18}),
  yellow:new THREE.MeshStandardMaterial({color:0xe8b324,metalness:0.2,roughness:0.6}),
  hazard:new THREE.MeshStandardMaterial({map:hazardTex,metalness:0.1,roughness:0.8}),
  pit:new THREE.MeshStandardMaterial({color:0x4e545b,metalness:0.05,roughness:0.95}),
  screen:new THREE.MeshStandardMaterial({color:0x0a141c,emissive:0x1d4d66,emissiveIntensity:0.9,metalness:0.2,roughness:0.4}),
  lampLit:new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xfff4dc,emissiveIntensity:1.0}),
};
/* 足場(GL+1000 のステージ)— カッター台車の緑(cutter.js の PAINT と同じ sRGB 色を線形へ直して持つ = 同じ色に見える)。
   上面は滑り止めの縞鋼板: 1枚 1.08m 角(継ぎ目つき)・突起 12×12(約 90mm)。UV はメートルで貼る(repeat 1/1.08) */
const stageTex=canvasTex(256,256,(g,w,h)=>{g.fillStyle="#3b6a4f";g.fillRect(0,0,w,h);
  const n=12,s=w/n;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const cx=(i+0.5)*s,cy=(j+0.5)*s,a=((i+j)%2?1:-1)*Math.PI/4;
    g.save();g.translate(cx,cy);g.rotate(a);g.fillStyle="rgba(16,34,25,0.50)";g.fillRect(-s*0.34,-s*0.07+1.2,s*0.68,s*0.14);
    g.fillStyle="rgba(88,136,108,0.50)";g.fillRect(-s*0.34,-s*0.07,s*0.68,s*0.12);g.restore();}   // 突起(控えめに: 全体は台車の緑のまま)
  g.fillStyle="rgba(14,28,21,0.9)";g.fillRect(0,0,w,2);g.fillRect(0,0,2,h);});                 // パネルの継ぎ目
stageTex.repeat.set(1/1.08,1/1.08);
const srgbLin=c=>new THREE.Color(c).convertSRGBToLinear();
M.stageDeck=new THREE.MeshStandardMaterial({map:stageTex,metalness:0.18,roughness:0.62});      // 縞鋼板(上面・階段の踏板)
M.stage=new THREE.MeshStandardMaterial({color:srgbLin("#3b6a4f"),metalness:0.18,roughness:0.58}); // 骨組み(脚・梁・縁の溝形鋼)
// ピット・走行路の囲い: 緑のエキスパンドメタル(菱形の網目・抜きは透明)。1枚 0.24m 角に網目 3×4(UV はタイル数で貼る)
const stageMeshTex=canvasTex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle="#3b6a4f";g.lineWidth=7;g.lineJoin="round";
  const cw=w/3,ch=h/4;
  for(let j=0;j<=4;j++)for(let i=-1;i<=3;i++){const x=i*cw+(j%2?cw/2:0),y=j*ch;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+cw/2,y+ch/2);g.lineTo(x+cw,y);g.moveTo(x,y);g.lineTo(x+cw/2,y-ch/2);g.lineTo(x+cw,y);g.stroke();}});
M.stageMesh=new THREE.MeshStandardMaterial({map:stageMeshTex,alphaTest:0.5,side:THREE.DoubleSide,metalness:0.18,roughness:0.62});

/* アルミ材の見え方 — 仕上げパターン(プリセット)+ 色/金属感/粗さの詳細調整。
 * 帯板・コイル外周・コイル端面は同じ材なので、板を基準に相対関係を保って追従させる
 * (既定値は従来のマテリアル設定と一致する)。 */
const ALU_PRESETS={
  mill:    {label:"ミル",     color:"#eef2f5", metal:0.45, rough:0.50},
  hairline:{label:"ヘアライン",color:"#e6ecf1", metal:0.62, rough:0.40},
  mirror:  {label:"鏡面",     color:"#f4f8fb", metal:0.92, rough:0.13},
  matte:   {label:"つや消し", color:"#d8dee4", metal:0.22, rough:0.80},
};
const alu={pattern:"mill",color:ALU_PRESETS.mill.color,metal:ALU_PRESETS.mill.metal,rough:ALU_PRESETS.mill.rough};
function applyAlu(){
  const c=new THREE.Color(alu.color), cl=(v)=>THREE.MathUtils.clamp(v,0.02,1);
  M.strip.color.copy(c);    M.strip.metalness=cl(alu.metal);         M.strip.roughness=cl(alu.rough);
  M.coilSide.color.copy(c).multiplyScalar(0.88);
  M.coilSide.metalness=cl(alu.metal+0.35); M.coilSide.roughness=cl(alu.rough-0.18);
  M.coilCap.color.copy(c); M.coilCap.metalness=cl(alu.metal+0.25);   M.coilCap.roughness=cl(alu.rough-0.08);}
function setAluPattern(kind){const p=ALU_PRESETS[kind]||ALU_PRESETS.mill;
  alu.pattern=kind;alu.color=p.color;alu.metal=p.metal;alu.rough=p.rough;
  const c=stripTex.image;drawAluPattern(kind,c.getContext("2d"),c.width,c.height);stripTex.needsUpdate=true;
  applyAlu();}
applyAlu();
