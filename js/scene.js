"use strict";
/* =========================================================
 * レンダラ / シーン / カメラ
 * =======================================================*/
const container=document.getElementById("scene");
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.18;
container.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x1b222b);
scene.fog=new THREE.Fog(0x1b222b,70,150);
const camera=new THREE.PerspectiveCamera(48,window.innerWidth/window.innerHeight,0.05,400);

(function buildEnvironment(){
  const env=new THREE.Scene();
  const sg=new THREE.SphereGeometry(70,24,16);
  const pos=sg.attributes.position, colors=new Float32Array(pos.count*3);
  const cTop=new THREE.Color(0xcfe2f4), cBot=new THREE.Color(0x39404a), tmp=new THREE.Color();
  for(let i=0;i<pos.count;i++){const t=THREE.MathUtils.clamp(pos.getY(i)/70*0.5+0.5,0,1);
    tmp.copy(cBot).lerp(cTop,t); colors[i*3]=tmp.r; colors[i*3+1]=tmp.g; colors[i*3+2]=tmp.b;}
  sg.setAttribute("color",new THREE.BufferAttribute(colors,3));
  env.add(new THREE.Mesh(sg,new THREE.MeshBasicMaterial({side:THREE.BackSide,vertexColors:true})));
  const lampMat=new THREE.MeshBasicMaterial({color:0xffffff});
  for(let x=-34;x<=28;x+=8) for(const z of [-6,6]){
    const lamp=new THREE.Mesh(new THREE.PlaneGeometry(5,1.6),lampMat);
    lamp.position.set(x,34,z); lamp.rotation.x=Math.PI/2; env.add(lamp);
  }
  const pm=new THREE.PMREMGenerator(renderer);
  scene.environment=pm.fromScene(env,0.04).texture; pm.dispose();
})();

scene.add(new THREE.HemisphereLight(0xbcd6ef,0x3a3832,0.85));
const sun=new THREE.DirectionalLight(0xfff3e2,1.4);
sun.position.set(12,26,12); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-40; sun.shadow.camera.right=40;
sun.shadow.camera.top=20; sun.shadow.camera.bottom=-12;
sun.shadow.camera.far=80; sun.shadow.bias=-0.0006;
scene.add(sun);
const fill=new THREE.DirectionalLight(0xb8d2ee,0.35); fill.position.set(-16,12,-12); scene.add(fill);
const back=new THREE.DirectionalLight(0xdfe9f4,0.22); back.position.set(4,10,-18); scene.add(back);

/* =========================================================
 * カメラコントロール — 各設備へ大きく寄れるようズーム余裕を確保
 * =======================================================*/
class OrbitCam{
  constructor(cam,dom){
    this.cam=cam; this.dom=dom; this.target=new THREE.Vector3(-3,2,0);
    this.r=40; this.theta=0.55; this.phi=1.14;
    this.minR=0.7; this.maxR=130; this.minPhi=0.08; this.maxPhi=1.54;
    this._btn=-1; this._px=0; this._py=0; this.tween=null;
    dom.addEventListener("pointerdown",e=>{this._btn=e.button;this._px=e.clientX;this._py=e.clientY;dom.setPointerCapture(e.pointerId);});
    dom.addEventListener("pointermove",e=>{
      if(this._btn<0)return; const dx=e.clientX-this._px,dy=e.clientY-this._py; this._px=e.clientX;this._py=e.clientY;
      if(this._btn===0){this.theta-=dx*0.005;this.phi=THREE.MathUtils.clamp(this.phi-dy*0.005,this.minPhi,this.maxPhi);}
      else this._pan(dx,dy); this.tween=null;});
    dom.addEventListener("pointerup",()=>{this._btn=-1;});
    dom.addEventListener("wheel",e=>{e.preventDefault();
      const f=this.r<4?1.06:1.1;   // 近接時は細かくズーム
      this.r=THREE.MathUtils.clamp(this.r*(e.deltaY>0?f:1/f),this.minR,this.maxR);this.tween=null;},{passive:false});
    dom.addEventListener("contextmenu",e=>e.preventDefault());
  }
  _pan(dx,dy){const s=this.r*0.0012;
    const fwd=new THREE.Vector3().subVectors(this.target,this.cam.position).normalize();
    const right=new THREE.Vector3().crossVectors(fwd,this.cam.up).normalize();
    const up=new THREE.Vector3().crossVectors(right,fwd).normalize();
    this.target.addScaledVector(right,-dx*s).addScaledVector(up,dy*s);}
  flyTo(tx,ty,tz,r,theta,phi){this.tween={k:0,
    f:{x:this.target.x,y:this.target.y,z:this.target.z,r:this.r,th:this.theta,ph:this.phi},
    t:{x:tx,y:ty,z:tz,r:r,th:theta,ph:phi}};}
  update(dt){
    if(this.tween){const tw=this.tween; tw.k=Math.min(tw.k+dt/0.9,1);
      const e=tw.k<0.5?2*tw.k*tw.k:1-Math.pow(-2*tw.k+2,2)/2;
      this.target.set(THREE.MathUtils.lerp(tw.f.x,tw.t.x,e),THREE.MathUtils.lerp(tw.f.y,tw.t.y,e),THREE.MathUtils.lerp(tw.f.z,tw.t.z,e));
      this.r=THREE.MathUtils.lerp(tw.f.r,tw.t.r,e); this.theta=THREE.MathUtils.lerp(tw.f.th,tw.t.th,e); this.phi=THREE.MathUtils.lerp(tw.f.ph,tw.t.ph,e);
      if(tw.k>=1)this.tween=null;}
    const sp=Math.sin(this.phi);
    this.cam.position.set(this.target.x+this.r*sp*Math.sin(this.theta),this.target.y+this.r*Math.cos(this.phi),this.target.z+this.r*sp*Math.cos(this.theta));
    this.cam.lookAt(this.target);}
}
const controls=new OrbitCam(camera,renderer.domElement);
