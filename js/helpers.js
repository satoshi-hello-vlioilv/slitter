"use strict";
/* =========================================================
 * ヘルパー
 * =======================================================*/
function addBox(w,h,d,mat,x,y,z,parent,shadow){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);m.castShadow=shadow!==false;m.receiveShadow=true;(parent||scene).add(m);return m;}
function addCylZ(r,len,mats,x,y,z,parent,seg){const g=new THREE.CylinderGeometry(r,r,len,seg||28);g.rotateX(Math.PI/2);
  const m=new THREE.Mesh(g,mats);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;(parent||scene).add(m);return m;}
const rollMats=()=>[M.roll,M.rollCap,M.rollCap];
const coilMats=()=>[M.coilSide,M.coilCap,M.coilCap];
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);

const spinners=[];
function spin(obj,r,dir,axis){spinners.push({obj,r,dir,axis:axis||'z'});return obj;}

/* 回転体(ロール)レジストリ — BOM準拠 */
const R={};                       // id -> {x,y,r}
const idLabelGroup=new THREE.Group(); scene.add(idLabelGroup);
function regRoll(id,x,y,r){R[id]={x,y,r}; if(id) makeIdLabel(id,x,y+r+0.12,0);}

/* 軸受チョック(ピローブロック) — 本体ブロック+軸受ハウジング+軸端+取付ボルト */
function chock(x,y,r,z,parent){
  const s=THREE.MathUtils.clamp(r*1.6,0.12,0.30);
  const g=new THREE.Group();g.position.set(x,y,z);(parent||scene).add(g);
  addBox(s,s*1.15,0.10,M.frame,0,-s*0.10,0,g);                 // チョック本体
  addCylZ(s*0.46,0.115,M.steel,0,0,0,g,18);                    // 軸受ハウジング
  addCylZ(s*0.17,0.15,M.paintDark,0,0,0,g,12);                 // 軸端
  for(const bx of [-s*0.36,s*0.36])                            // 取付ボルト
    addBox(0.028,0.045,0.104,M.steel,bx,-s*0.62,0,g);
  return s;}
function chockPair(x,y,r,len){const s=chock(x,y,r,(len/2+0.10));chock(x,y,r,-(len/2+0.10));return s;}

/* 一般ロール(鋼) — 幅方向Z軸。chock:両端軸受 / frame:床置きスタンド(ベースプレート付) */
function roll(id,x,y,dMM,dir,opt){opt=opt||{};
  const r=d2r(dMM), len=opt.len||(STRIP_W+0.34), seg=dMM>=200?40:22;
  const m=addCylZ(r,len,opt.mats||rollMats(),x,y,0,scene,seg);
  spin(m,r,dir==null?-1:dir);
  const cs=(opt.chock!==false)?chockPair(x,y,r,len):0;
  if(opt.frame!==false && y-r>0.12){
    const s=cs||0.12, hh=Math.max(0.06,y-0.675*s);
    for(const sd of [-1,1]){const zc=sd*(len/2+0.10);
      addBox(Math.max(0.12,s*0.8),hh,0.13,M.frame,x,hh/2,zc);   // 支柱
      addBox(0.32,0.05,0.34,M.frame,x,0.025,zc,scene,false);}}  // ベースプレート
  regRoll(id,x,y,r); return m;}

/* MDロール — 1軸に幅狭ゴム輪切り円盤を多数(山王鐵工MDロール)。軸端チョック付 */
function discRoll(id,x,y,dMM,dir){
  const r=d2r(dMM), len=STRIP_W+0.16;
  addCylZ(0.05,len+0.5,M.steel,x,y,0,scene);
  chock(x,y,Math.max(r*0.55,0.08), (len+0.5)/2+0.04);
  chock(x,y,Math.max(r*0.55,0.08),-((len+0.5)/2+0.04));
  const g=new THREE.Group(); g.position.set(x,y,0); scene.add(g);
  const nd=Math.max(22,Math.round(len/0.038)), dz=len/nd;
  for(let i=0;i<nd;i++){const z=-len/2+dz*(i+0.5);addCylZ(r,dz*0.8,(i%2?M.rubberA:M.rubberB),0,0,z,g,18);}
  spin(g,r,dir); regRoll(id,x,y,r); return g;}

/* スタンドハウジング(2柱+天梁) */
function housing(x,h,mat){mat=mat||M.paint;
  addBox(0.16,h,0.16,mat,x,h/2,-(STRIP_W/2+0.42));
  addBox(0.16,h,0.16,mat,x,h/2, (STRIP_W/2+0.42));
  addBox(0.24,0.18,STRIP_W+1.1,M.paintDark,x,h+0.02,0);}

/* 床/ピット底の高さ */
function groundY(x){return ((x>PIT1.x0&&x<PIT1.x1)||(x>PIT2.x0&&x<PIT2.x1))?-2.32:0;}

/* ロール列のサイドフレーム — チョック下を縦通し材で繋ぎ、支柱で床/ピット底へ下ろす */
function chainFrame(ids,zoff,postStep){postStep=postStep||3;
  const pts=ids.map(id=>R[id]);
  for(const s of [-1,1]){
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];
      const dx=b.x-a.x,dy=b.y-a.y;
      const m=addBox(Math.hypot(dx,dy)+0.18,0.09,0.12,M.frame,(a.x+b.x)/2,(a.y+b.y)/2-0.13,s*zoff);
      m.rotation.z=Math.atan2(dy,dx);}
    const post=(p)=>{const gy=groundY(p.x),h=p.y-0.175-gy;
      if(h>0.06){addBox(0.09,h,0.09,M.frame,p.x,gy+h/2,s*zoff);
        addBox(0.22,0.04,0.22,M.frame,p.x,gy+0.02,s*zoff,scene,false);}};
    for(let i=0;i<pts.length;i+=postStep)post(pts[i]);
    if((pts.length-1)%postStep)post(pts[pts.length-1]);
  }}

/* 接線(コイル外周→外部点) */
function tangentPoint(cx,cy,Rr,px,py,sign){const dx=px-cx,dy=py-cy,d=Math.hypot(dx,dy)||1e-4;
  const base=Math.atan2(dy,dx),off=Math.acos(THREE.MathUtils.clamp(Rr/d,-1,1)),a=base+sign*off;
  return {x:cx+Rr*Math.cos(a),y:cy+Rr*Math.sin(a),a};}

/* =========================================================
 * リボンストリップ(動的)
 * =======================================================*/
class Ribbon{
  constructor(width,count,material){this.w=width;this.n=count;
    const g=new THREE.BufferGeometry();
    this.pos=new Float32Array(count*6);this.nor=new Float32Array(count*6);this.uv=new Float32Array(count*4);
    const idx=[];for(let i=0;i<count-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    g.setIndex(idx);
    g.setAttribute("position",new THREE.BufferAttribute(this.pos,3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("normal",new THREE.BufferAttribute(this.nor,3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv",new THREE.BufferAttribute(this.uv,2).setUsage(THREE.DynamicDrawUsage));
    this.geo=g;this.mesh=new THREE.Mesh(g,material);this.mesh.castShadow=true;this.mesh.frustumCulled=false;scene.add(this.mesh);}
  update(pts){const h=this.w/2;let s=0;const n=Math.min(pts.length,this.n);let pnx=0,pny=1;
    for(let i=0;i<n;i++){const p=pts[i];const pp=pts[Math.max(i-1,0)],pn=pts[Math.min(i+1,n-1)];
      let tx=pn.x-pp.x,ty=pn.y-pp.y;const tl=Math.hypot(tx,ty);let nx,ny;
      if(tl<1e-5){nx=pnx;ny=pny;}else{tx/=tl;ty/=tl;nx=-ty;ny=tx;pnx=nx;pny=ny;}
      if(i>0)s+=p.distanceTo(pts[i-1]);const o=i*6;
      this.pos[o]=p.x;this.pos[o+1]=p.y;this.pos[o+2]=p.z-h;this.pos[o+3]=p.x;this.pos[o+4]=p.y;this.pos[o+5]=p.z+h;
      this.nor[o]=nx;this.nor[o+1]=ny;this.nor[o+2]=0;this.nor[o+3]=nx;this.nor[o+4]=ny;this.nor[o+5]=0;
      const u=s/UV_SCALE,q=i*4;this.uv[q]=u;this.uv[q+1]=0;this.uv[q+2]=u;this.uv[q+3]=1;}
    this.geo.attributes.position.needsUpdate=true;this.geo.attributes.normal.needsUpdate=true;this.geo.attributes.uv.needsUpdate=true;}
  dispose(){scene.remove(this.mesh);this.geo.dispose();}
}
function samplePolyline(pts,n,out){out=out||[];const lens=[];let total=0;
  for(let i=0;i<pts.length-1;i++){const l=pts[i].distanceTo(pts[i+1]);lens.push(l);total+=l;}
  let seg=0,segStart=0;
  for(let i=0;i<n;i++){const d=total*i/(n-1);
    while(seg<lens.length-1&&d>segStart+lens[seg]){segStart+=lens[seg];seg++;}
    const t=lens[seg]>0?Math.min((d-segStart)/lens[seg],1):0;
    out.push(new THREE.Vector3().lerpVectors(pts[seg],pts[seg+1],t));}
  return out;}

/* =========================================================
 * ラベル(スプライト)
 * =======================================================*/
const labelGroup=new THREE.Group(); scene.add(labelGroup);
function spriteText(text,size,bg,bd,fg){const c=document.createElement("canvas"),g=c.getContext("2d");
  const font=`600 ${size}px "Segoe UI","Hiragino Sans",Meiryo,sans-serif`;g.font=font;
  const tw=Math.ceil(g.measureText(text).width);c.width=tw+24;c.height=size+22;g.font=font;
  g.fillStyle=bg;g.strokeStyle=bd;g.lineWidth=2;const r=8,w=c.width,h=c.height;
  g.beginPath();g.moveTo(r,1);g.lineTo(w-r,1);g.quadraticCurveTo(w-1,1,w-1,r);g.lineTo(w-1,h-r);
  g.quadraticCurveTo(w-1,h-1,w-r,h-1);g.lineTo(r,h-1);g.quadraticCurveTo(1,h-1,1,h-r);g.lineTo(1,r);g.quadraticCurveTo(1,1,r,1);g.closePath();g.fill();g.stroke();
  g.fillStyle=fg;g.textBaseline="middle";g.fillText(text,12,h/2+1);
  const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;tex.minFilter=THREE.LinearFilter;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:true}));
  sp._aspect=c.width/c.height;return sp;}
function makeLabel(text,x,y,z){const sp=spriteText(text,30,"rgba(10,15,21,0.82)","rgba(79,198,255,0.45)","#cfe3f2");
  const s=0.62;sp.scale.set(sp._aspect*s,s,1);sp.position.set(x,y,z);labelGroup.add(sp);}
function makeIdLabel(text,x,y,z){const sp=spriteText(text,26,"rgba(20,12,6,0.8)","rgba(240,180,40,0.6)","#ffe6a8");
  const s=0.3;sp.scale.set(sp._aspect*s,s,1);sp.position.set(x,y,z);idLabelGroup.add(sp);}
idLabelGroup.visible=false;
