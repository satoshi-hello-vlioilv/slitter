"use strict";
/* =========================================================
 * リコイラのリール・ゴムスリーブ・スプール(部品ライブラリ)
 * ---------------------------------------------------------
 * 「スプール/スリーブ/リール 3Dモデル・組立ビューア」(three r160)から移植し、r128 に合わせた
 * (色テクスチャは encoding、sheen は Color、aoMap は uv2)。
 * 部品は mm の実寸・回転軸 = ローカルX・ドラム中心 = 原点 で作る(ビューアと同じ座標)。
 * ラインへはリコイラ側(coilers.js)で 1/1000 に縮め、X を −Z(駆動側)へ向けて載せる。
 *   リール  : RD-1467-03SB φ508(4セグメント・ウエッジ・グリップ有)/ RD-1467-04S φ300(グリップ無)
 *   スリーブ: SH18-J06 / FS4.508-610POR(呼称 φ508×φ610・実寸 φ480×φ587×1623L・外面ダイヤ溝)
 *   スプール: 鉄 SNA32B φ557×φ507 / 紙管・ベーク 内径 φ298・398・505 × 肉厚 10・15・20
 * 移植で変えたところ:
 *   ・櫛歯(セグメント両縁)とボルトは InstancedMesh(ライン全体の描画数を増やさない)
 *   ・テクスチャは 512px(密度はビューアの mm 実寸のまま)で、使う部品の分だけ初回に作る
 *   ・嵌合は「ドラムは内径に当たるまで開いて締める」で判定(ビューアは開度固定の直径差)
 * =======================================================*/
const REEL=(function(){
  const T=THREE;
  /* ---- 諸元 ---- */
  const SP={OD:557,ID:507,Ro:278.5,Ri:253.5,B1_AX:10,B1_RA:3,B2_AX:10,B2_RA:10,EDGE:1,     // 鉄スプール SNA32B
    DENSITY:7.85e-6,WIDTHS:[1050,1100,1200,1300,1400,1500,1600,1800]};
  const TB={IDS:[298,398,505],TS:[10,15,20],W_MIN:10,W_MAX:1800,CH:1.0};                  // 紙管・ベーク(共通寸法)
  const DENS={paper:0.80e-6,bake:1.35e-6};
  const SL={ID:480,OD:587,NOM_ID:508,NOM_OD:610,L:1623,T_IN_AX:20,T_IN_RA:10,T_OUT_AX:50,T_OUT_RA:15,   // ゴムスリーブ
    GRV_W:3,GRV_D:3,GRV_N:24,DENSITY:1.30e-6,HS:70};
  const RC={Z:{thr0:-65,thr1:0,ob0:0,ob1:160,st0:160,st1:230,seg0:230,seg1:1940,col0:1940,col1:2035,col2:2095,
      sh0:2095,sh1:2255,hub0:2255,hub1:2620},                                              // ドラム軸方向の区切り(ローカルZ)
    OB_D:220,ST_D:250,COL_D:250,SH_D:350,HUB_D:420,THR_D:56,SEG_L:1710,TOTAL:2295,ANG:13,COMB_P:34,COMB_W:30};
  const REELS={
    D508:{label:"φ508",title:"φ508 リコイラードラム(4セグメント ウエッジ・グリップ有)",dwg:"RD-1467-03SB",
      D_EXP:508,D_CON:478,ST_R:15,ST_Z:65,DRUM_OD:160,WB_N:5,WB_L:210,COMB_H:15,BOLT_N:8,BOLT_R:160,BOLT_D:26,
      BOLT_M:"高張力六角ボルト M16×P2",GRIP:true},
    D300:{label:"φ300",title:"φ300 リコイラードラム(4セグメント ウエッジ・グリップ無)",dwg:"RD-1467-04S",
      D_EXP:300,D_CON:283.4,ST_R:8.31,ST_Z:36,DRUM_OD:154,WB_N:5,WB_L:210,COMB_H:20.26,BOLT_N:16,BOLT_R:160,BOLT_D:33,
      BOLT_M:"M22×P1.5(4ヶ所×4枚=16ヶ所)",GRIP:false}};
  const DRUM_CZ=(RC.Z.seg0+RC.Z.seg1)/2;                    // ドラム中心(ローカルZ)
  const clamp01=v=>Math.min(1,Math.max(0,v));

  /* =======================================================
   * 断面プロファイル(z: 軸方向, r: 半径)と体積
   * =====================================================*/
  function steelProfile(L){
    const h=L/2,rE=SP.Ri+SP.EDGE,rF=SP.Ro-SP.B1_RA-SP.B2_RA,rB=SP.Ro-SP.B1_RA;
    return [[-h+SP.EDGE,SP.Ri],[h-SP.EDGE,SP.Ri],[h,rE],[h,rF],[h-SP.B2_AX,rB],[h-SP.B2_AX-SP.B1_AX,SP.Ro],
      [-h+SP.B2_AX+SP.B1_AX,SP.Ro],[-h+SP.B2_AX,rB],[-h,rF],[-h,rE],[-h+SP.EDGE,SP.Ri]];}
  function tubeProfile(L,ri,t){
    const h=L/2,ro=ri+t,c=TB.CH;
    return {pts:[[-h+c,ri],[h-c,ri],[h,ri+c],[h,ro-c],[h-c,ro],[-h+c,ro],[-h,ro-c],[-h,ri+c],[-h+c,ri]],
      grp:[0,1,1,1,2,1,1,1]};}                              // 0:内面 1:端面(面取り含む) 2:外面
  /* ゴムスリーブ: 内径を ri まで押し広げた姿(肉厚一定) */
  function sleeveProfile(riOverride){
    const h=SL.L/2,ri=riOverride==null?SL.ID/2:riOverride,ro=ri+(SL.OD-SL.ID)/2,riT=ri+SL.T_IN_RA,roT=ro-SL.T_OUT_RA;
    return {pts:[[-h+SL.T_IN_AX,ri],[h-SL.T_IN_AX,ri],[h,riT],[h,roT],[h-SL.T_OUT_AX,ro],[-h+SL.T_OUT_AX,ro],
      [-h,roT],[-h,riT],[-h+SL.T_IN_AX,ri]],grp:[0,1,1,1,2,1,1,1]};}
  function volumeOf(pts){                                   // パップス‐ギュルダン
    let A=0,cr=0;
    for(let i=0;i<pts.length-1;i++){const [z0,r0]=pts[i],[z1,r1]=pts[i+1],c=z0*r1-z1*r0;A+=c;cr+=(r0+r1)*c;}
    A/=2;cr/=(6*A);return Math.abs(2*Math.PI*cr*A);}

  /* =======================================================
   * 回転体(UV は mm 実寸・稜線シャープ)— 軸 = X
   * =====================================================*/
  function revolve(pts,seg,grp,uRef){
    const pos=[],nor=[],uv=[],idx=[],groups=[];
    const RR=uRef!=null?uRef:Math.max(...pts.map(p=>p[1]));
    let base=0,acc=0,start=0;
    for(let s=0;s<pts.length-1;s++){
      const [z0,r0]=pts[s],[z1,r1]=pts[s+1],dz=z1-z0,dr=r1-r0,len=Math.hypot(dz,dr);
      if(len<1e-9)continue;
      const nz=dr/len,nr=-dz/len;
      for(let e=0;e<2;e++){const z=e?z1:z0,r=e?r1:r0,v=acc+(e?len:0);
        for(let j=0;j<=seg;j++){const t=Math.PI*2*j/seg,c=Math.cos(t),si=Math.sin(t);
          pos.push(z,r*c,r*si);nor.push(nz,nr*c,nr*si);uv.push(t*RR,v);}}
      for(let j=0;j<seg;j++){const a=base+j,b=a+1,c2=base+seg+1+j,d=c2+1;idx.push(a,c2,b,b,c2,d);}
      base+=(seg+1)*2;acc+=len;
      if(grp)groups.push({start,count:seg*6,mat:grp[s]});
      start+=seg*6;}
    const g=new T.BufferGeometry();
    g.setAttribute("position",new T.Float32BufferAttribute(pos,3));
    g.setAttribute("normal",new T.Float32BufferAttribute(nor,3));
    g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));
    g.setIndex(idx);
    if(grp)for(const o of groups)g.addGroup(o.start,o.count,o.mat);
    return g;}

  /* =======================================================
   * 手続きテクスチャ(ビューアと同じ作り方・512px)
   * =====================================================*/
  const TS=512, K=(TS/1024)*(TS/1024);                       // 1024px 版と同じ見た目密度にする係数
  const cv=s=>{const c=document.createElement("canvas");c.width=c.height=s;return c;};
  function tex(c,tile,srgb){const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;
    t.repeat.set(1/tile,1/tile);t.anisotropy=8;if(srgb)t.encoding=T.sRGBEncoding;return t;}
  function normalFromHeight(h,size,scale){
    const c=cv(size),x=c.getContext("2d"),img=x.createImageData(size,size);
    for(let y=0;y<size;y++)for(let X=0;X<size;X++){const i=y*size+X;
      const l=h[y*size+((X-1+size)%size)],r=h[y*size+((X+1)%size)],u=h[((y-1+size)%size)*size+X],d=h[((y+1)%size)*size+X];
      const nx=(l-r)*scale,ny=(u-d)*scale,inv=1/Math.hypot(nx,ny,1);
      img.data[i*4]=(nx*inv*.5+.5)*255;img.data[i*4+1]=(ny*inv*.5+.5)*255;img.data[i*4+2]=(inv*.5+.5)*255;img.data[i*4+3]=255;}
    x.putImageData(img,0,0);return c;}
  function grayCanvas(h,size,lo,hi){
    const c=cv(size),x=c.getContext("2d"),img=x.createImageData(size,size);
    for(let i=0;i<h.length;i++){const g=(lo+(hi-lo)*h[i])*255;img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=g;img.data[i*4+3]=255;}
    x.putImageData(img,0,0);return c;}
  function norm(h){let mn=Infinity,mx=-Infinity;for(const v of h){if(v<mn)mn=v;if(v>mx)mx=v;}
    const inv=1/(mx-mn||1);for(let i=0;i<h.length;i++)h[i]=(h[i]-mn)*inv;return h;}
  /* 鋼: ショットブラスト 25S */
  function blastHeight(size){
    const h=new Float32Array(size*size),s=size/1024;
    for(let k=0;k<24000*K;k++){const cx=Math.random()*size,cy=Math.random()*size;
      const rad=(1.4+Math.random()*4.2)*Math.max(s,0.6),dep=.35+Math.random()*.65,r0=Math.ceil(rad);
      for(let y=-r0;y<=r0;y++)for(let x=-r0;x<=r0;x++){const d=Math.hypot(x,y);if(d>rad)continue;
        const px=((((cx+x)|0)%size)+size)%size,py=((((cy+y)|0)%size)+size)%size;h[py*size+px]-=dep*(1-d/rad)**2;}}
    for(let y=0;y<size;y++){const b=Math.sin(y*Math.PI*2*18/size)*.16+Math.sin(y*Math.PI*2*47/size)*.07;
      for(let x=0;x<size;x++)h[y*size+x]+=b;}
    return norm(h);}
  /* 紙繊維 */
  function paperHeight(size,fiber){
    const h=new Float32Array(size*size),s=size/1024;
    for(let k=0;k<20000*fiber*K;k++){const cx=Math.random()*size,cy=Math.random()*size;
      const a=Math.random()*Math.PI,L=(6+Math.random()*26)*s,v=(Math.random()-.5)*.9;
      for(let q=0;q<L;q++){const px=((((cx+Math.cos(a)*q)|0)%size)+size)%size,py=((((cy+Math.sin(a)*q)|0)%size)+size)%size;
        h[py*size+px]+=v;}}
    return norm(h);}
  function paperColor(size,h,base,spiral,rings){
    const c=cv(size),x=c.getContext("2d"),img=x.createImageData(size,size),[br,bg,bb]=base;
    for(let i=0;i<h.length;i++){const s=.80+h[i]*.34;
      img.data[i*4]=Math.min(255,br*s);img.data[i*4+1]=Math.min(255,bg*s);img.data[i*4+2]=Math.min(255,bb*s);img.data[i*4+3]=255;}
    x.putImageData(img,0,0);
    if(spiral){x.save();x.globalAlpha=.5;x.strokeStyle="#8d5f2e";x.lineWidth=2.5*size/1024+0.5;     // スパイラル巻きの継ぎ目
      for(let i=-size;i<size*2;i+=size/4){x.beginPath();x.moveTo(i,0);x.lineTo(i+size,size);x.stroke();}
      x.globalAlpha=.22;x.strokeStyle="#e8c99b";x.lineWidth=1.2*size/1024+0.4;
      for(let i=-size;i<size*2;i+=size/4){x.beginPath();x.moveTo(i+6*size/1024,0);x.lineTo(i+size+6*size/1024,size);x.stroke();}
      x.restore();}
    if(rings){x.save();const pitch=size*0.5/200;                                                     // 端面の積層プライ(約0.5mm)
      for(let y=0;y<size;y+=pitch){x.globalAlpha=.30+Math.random()*.25;x.fillStyle="#6b4520";x.fillRect(0,y,size,pitch*0.45);}
      x.restore();}
    return tex(c,200,true);}
  function bakeColor(size,h,base,mode){
    const c=cv(size),x=c.getContext("2d"),img=x.createImageData(size,size),[br,bg,bb]=base;
    for(let i=0;i<h.length;i++){const s=.90+h[i]*.16;
      img.data[i*4]=Math.min(255,br*s);img.data[i*4+1]=Math.min(255,bg*s);img.data[i*4+2]=Math.min(255,bb*s);img.data[i*4+3]=255;}
    x.putImageData(img,0,0);
    if(mode==="outer"){x.save();x.globalAlpha=.10;x.strokeStyle="#2a1508";x.lineWidth=1;              // 旋削目・基材の斑
      for(let y=0;y<size;y+=size*0.4/200){x.beginPath();x.moveTo(0,y);x.lineTo(size,y);x.stroke();}
      x.globalAlpha=.07;x.fillStyle="#e8c9a8";
      for(let k=0;k<160;k++){x.beginPath();x.ellipse(Math.random()*size,Math.random()*size,(8+Math.random()*26)*size/1024,
        (3+Math.random()*9)*size/1024,Math.random()*Math.PI,0,Math.PI*2);x.fill();}
      x.restore();}
    if(mode==="end"){x.save();const pitch=size*0.3/200;                                              // 端面の積層縞(約0.3mm)
      for(let y=0;y<size;y+=pitch){x.globalAlpha=.30+Math.random()*.22;x.fillStyle="#2f1a0c";x.fillRect(0,y,size,pitch*0.5);
        x.globalAlpha=.14;x.fillStyle="#c79b6f";x.fillRect(0,y+pitch*0.5,size,pitch*0.3);}
      x.restore();}
    return tex(c,200,true);}
  /* ゴム: 粒状+ダイヤ溝 */
  function rubberHeight(size){
    const h=new Float32Array(size*size),s=size/1024;
    for(let k=0;k<40000*(size/1024)*(size/1024);k++){const x=(Math.random()*size)|0,y=(Math.random()*size)|0;
      const rad=(1+Math.random()*2.6)*Math.max(s,0.6),r0=Math.ceil(rad),v=(Math.random()-.5)*1.2;
      for(let b=-r0;b<=r0;b++)for(let a=-r0;a<=r0;a++){const d=Math.hypot(a,b);if(d>rad)continue;
        h[((((y+b)%size)+size)%size)*size+((((x+a)%size)+size)%size)]+=v*(1-d/rad);}}
    return norm(h);}
  function diamondMaps(size,pitchMM){
    const base=rubberHeight(size),h=new Float32Array(size*size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const d1=Math.abs(((x+y)%size)-size/2)/(size/2),d2=Math.abs(((x-y+size)%size)-size/2)/(size/2);
      let v=base[y*size+x]*0.10;
      const m1=(1-d1)*(size/2)*(pitchMM/size),m2=(1-d2)*(size/2)*(pitchMM/size);
      if(m1<SL.GRV_W/2)v-=(1-m1/(SL.GRV_W/2));
      if(m2<SL.GRV_W/2)v-=(1-m2/(SL.GRV_W/2));
      h[y*size+x]=v;}
    norm(h);
    return {normal:tex(normalFromHeight(h,size,3.2),pitchMM),ao:tex(grayCanvas(h,size,.35,1.0),pitchMM)};}
  /* 鉄スプール片端の刻印(幅と重量入り) */
  function markTexture(w){
    const c=document.createElement("canvas");c.width=1024;c.height=128;const x=c.getContext("2d");
    x.fillStyle="#808080";x.fillRect(0,0,c.width,c.height);
    x.save();x.translate(c.width/2,c.height/2);x.rotate(Math.PI);x.textAlign="center";x.textBaseline="middle";
    x.font='bold 52px "Yu Gothic UI",sans-serif';
    const t=`SP-${w}   SNA32B   2026-09   ${(volumeOf(steelProfile(w))*SP.DENSITY).toFixed(0)}kg`;
    x.fillStyle="#4a4a4a";x.fillText(t,0,2);x.fillStyle="#b4b4b4";x.fillText(t,0,-2);x.restore();
    const t2=new T.CanvasTexture(c);t2.wrapS=T.RepeatWrapping;t2.wrapT=T.ClampToEdgeWrapping;t2.anisotropy=8;return t2;}

  /* =======================================================
   * マテリアル(使う種類だけ初回に作る)
   * =====================================================*/
  const once=f=>{let v=null;return()=>v||(v=f());};
  // ビューア(r160)は色の16進を sRGB として扱う。r128 は線形のまま使うので、同じ見た目になるよう変換する
  const C=hex=>new T.Color(hex).convertSRGBToLinear();
  const matSteel=once(()=>{const h=blastHeight(TS);
    return new T.MeshPhysicalMaterial({color:C(0x9299a1),metalness:1,roughness:.72,
      roughnessMap:tex(grayCanvas(h,TS,.58,.92),60),normalMap:tex(normalFromHeight(h,TS,2.2),60),
      normalScale:new T.Vector2(.85,.85),clearcoat:.06,clearcoatRoughness:.85,side:T.DoubleSide,envMapIntensity:1.15});});
  const matPaper=once(()=>{const h=paperHeight(TS,1);
    const n=tex(normalFromHeight(h,TS,1.5),200),r=tex(grayCanvas(h,TS,.80,.98),200);
    const mk=map=>new T.MeshPhysicalMaterial({map,normalMap:n,roughnessMap:r,metalness:0,roughness:.92,
      sheen:C(0xd9b183).multiplyScalar(0.35),side:T.DoubleSide,envMapIntensity:.85});
    return [mk(paperColor(TS,h,[172,126,74],false,false)),       // 内面
            mk(paperColor(TS,h,[186,138,82],false,true)),        // 端面(積層プライ)
            mk(paperColor(TS,h,[196,146,86],true,false))];});    // 外面(スパイラル)
  const matBake=once(()=>{const h=paperHeight(TS,0.6);
    const n=tex(normalFromHeight(h,TS,0.55),200),r=tex(grayCanvas(h,TS,.26,.46),200);
    const mk=map=>new T.MeshPhysicalMaterial({map,normalMap:n,roughnessMap:r,color:C(0xffffff),metalness:0,roughness:.36,
      clearcoat:.55,clearcoatRoughness:.30,reflectivity:.55,normalScale:new T.Vector2(.55,.55),side:T.DoubleSide,envMapIntensity:1.0});
    return [mk(bakeColor(TS,h,[78,40,22],"inner")),mk(bakeColor(TS,h,[86,45,24],"end")),mk(bakeColor(TS,h,[92,48,26],"outer"))];});
  const matRubber=once(()=>{const h=rubberHeight(TS),dia=diamondMaps(256,Math.PI*SL.OD/SL.GRV_N);
    const plain=new T.MeshPhysicalMaterial({color:C(0x22262b),metalness:0,roughness:.95,
      normalMap:tex(normalFromHeight(h,TS,1.1),40),roughnessMap:tex(grayCanvas(h,TS,.88,.99),40),normalScale:new T.Vector2(.7,.7),
      sheen:C(0x4a5158).multiplyScalar(0.2),side:T.DoubleSide,envMapIntensity:.55});
    const knurl=new T.MeshPhysicalMaterial({color:C(0x262a30),metalness:0,roughness:.93,normalMap:dia.normal,aoMap:dia.ao,aoMapIntensity:1.0,
      normalScale:new T.Vector2(1.5,1.5),sheen:C(0x4a5158).multiplyScalar(0.22),side:T.DoubleSide,envMapIntensity:.6});
    return [plain,plain,knurl];});
  const matDrum=once(()=>({
    seg:new T.MeshStandardMaterial({color:C(0xc6ced6),metalness:.80,roughness:.26}),       // セグメント(クシ型)
    wedge:new T.MeshStandardMaterial({color:C(0xc2823a),metalness:.60,roughness:.38}),     // ウエッジ(青銅)
    spider:new T.MeshStandardMaterial({color:C(0x8d98a4),metalness:.62,roughness:.40}),    // ドラム芯・スパイダー
    shaft:new T.MeshStandardMaterial({color:C(0x9aa6b2),metalness:.72,roughness:.30}),     // 軸系
    oil:new T.MeshStandardMaterial({color:C(0x2f6f4f),metalness:.30,roughness:.55}),       // オイルレスプレート
    grip:new T.MeshStandardMaterial({color:C(0x2b3540),metalness:.45,roughness:.55})}));   // グリップ溝・ボルト

  /* =======================================================
   * リール(リコイラードラム)— ローカルZ(ハブ側 +Z)で組んでから X 軸へ回す
   * =====================================================*/
  function arcBlock({rOut,rIn,a0,aLen,z0,z1,n=64,taper=null}){
    const pos=[],idx=[];
    const V=(r,a,z)=>{pos.push(r*Math.cos(a),r*Math.sin(a),z);return pos.length/3-1;};
    const quad=(a,b,c,d)=>{idx.push(a,b,c,a,c,d);};
    const ro=z=>taper?Math.max(rIn+1,taper(z)):rOut;
    const O=[],I=[];
    for(let k=0;k<=n;k++){const a=a0+aLen*k/n;O.push([V(ro(z0),a,z0),V(ro(z1),a,z1)]);I.push([V(rIn,a,z0),V(rIn,a,z1)]);}
    for(let k=0;k<n;k++){quad(O[k][0],O[k+1][0],O[k+1][1],O[k][1]);quad(I[k][1],I[k+1][1],I[k+1][0],I[k][0]);
      quad(I[k][0],I[k+1][0],O[k+1][0],O[k][0]);quad(O[k][1],O[k+1][1],I[k+1][1],I[k][1]);}
    quad(I[0][0],O[0][0],O[0][1],I[0][1]);quad(O[n][0],I[n][0],I[n][1],O[n][1]);
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));
    g.setIndex(idx);g.computeVertexNormals();return g;}
  function zTube(od,z0,z1,n){const g=new T.CylinderGeometry(od/2,od/2,z1-z0,n||64,1,false);g.rotateX(Math.PI/2);g.translate(0,0,(z0+z1)/2);return g;}
  function zTaper(d0,d1,z0,z1,n){const g=new T.CylinderGeometry(d1/2,d0/2,z1-z0,n||64,1,false);g.rotateX(Math.PI/2);g.translate(0,0,(z0+z1)/2);return g;}
  const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_p=new T.Vector3(),_s=new T.Vector3(1,1,1);
  function makeDrum(key){
    const RS=REELS[key],Z=RC.Z,RM=matDrum(),R_EXP=RS.D_EXP/2,R_CON=RS.D_CON/2,TAN=Math.tan(RC.ANG*Math.PI/180);
    const inner=new T.Group();
    const add=(geo,m,par,shadow)=>{const me=new T.Mesh(geo,m);me.castShadow=shadow!==false;me.receiveShadow=true;(par||inner).add(me);return me;};
    // 軸系: ねじ端 → 外側軸受ジャーナル → ストッパ → ドラム芯 → カラー → 主軸 → ハブ(駆動フランジ)
    add(zTube(RC.THR_D,Z.thr0,Z.thr1,32),RM.shaft);
    add(zTube(RC.OB_D,Z.ob0,Z.ob1),RM.shaft);
    add(zTube(RC.ST_D,Z.st0,Z.st1),RM.shaft);
    add(zTube(RS.DRUM_OD,Z.st1,Z.col0),RM.spider);
    add(zTaper(RS.DRUM_OD,RC.COL_D,Z.col0,Z.col1),RM.shaft);
    add(zTube(RC.COL_D,Z.col1,Z.col2),RM.shaft);
    add(zTaper(RC.COL_D,RC.SH_D,Z.col2,Z.sh0+1),RM.shaft);
    add(zTube(RC.SH_D,Z.sh0,Z.hub0),RM.shaft);
    add(zTaper(RC.SH_D,RC.HUB_D,Z.hub0-40,Z.hub0),RM.shaft);
    add(zTube(RC.HUB_D,Z.hub0,Z.hub1),RM.shaft);
    const bolt=new T.CylinderGeometry(RS.BOLT_D/2,RS.BOLT_D/2,24,6);bolt.rotateX(Math.PI/2);
    const bolts=new T.InstancedMesh(bolt,RM.grip,RS.BOLT_N);
    for(let i=0;i<RS.BOLT_N;i++){const a=2*Math.PI*i/RS.BOLT_N;
      bolts.setMatrixAt(i,_m.makeTranslation(RS.BOLT_R*Math.cos(a),RS.BOLT_R*Math.sin(a),Z.hub0+12));}
    inner.add(bolts);
    // ウエッジ/スプレッダー(軸方向に動いてセグメントを押し広げる)
    const wedges=new T.Group();inner.add(wedges);
    const rDrum=RS.DRUM_OD/2,WZ0=Z.seg0+30,WZ1=Z.seg1-30,pitch=(WZ1-WZ0-RS.WB_L)/(RS.WB_N-1),ARC=Math.PI/2;
    for(let i=0;i<4;i++){const a0=-ARC/2+ARC*i+0.05,aL=ARC-0.10;
      add(arcBlock({rOut:rDrum+6,rIn:rDrum-1,a0,aLen:aL,z0:WZ0,z1:WZ1}),RM.spider,wedges,false);
      for(let j=0;j<RS.WB_N;j++){const z0=WZ0+j*pitch,z1=z0+RS.WB_L,hi=R_CON-3,tp=z=>hi-TAN*(z-z0);
        add(arcBlock({rOut:hi,rIn:rDrum-1,a0,aLen:aL,z0,z1,taper:tp}),RM.wedge,wedges,false);
        add(arcBlock({rOut:hi,rIn:rDrum,a0:a0+.05,aLen:aL-.10,z0:z0+25,z1:z1-25,n:36,taper:z=>tp(z)+2}),RM.oil,wedges,false);}}
    // セグメント(4分割・両縁はクシ型で隣と噛み合う)
    const segs=[],gapA=RS.ST_R/R_EXP,tDepth=Math.min(40,(R_EXP-rDrum)*0.55);
    const tooth=new T.BoxGeometry(tDepth,RS.COMB_H,RC.COMB_W);
    for(let i=0;i<4;i++){
      const sg=new T.Group(),a0=-ARC/2+ARC*i+gapA,aLen=ARC-2*gapA;
      add(arcBlock({rOut:R_EXP,rIn:R_CON-3,a0,aLen,z0:Z.seg0,z1:Z.seg1}),RM.seg,sg);
      const mats=[];
      for(let z=Z.seg0+12;z<=Z.seg1-RC.COMB_W-12;z+=RC.COMB_P){const zz=z+(i%2?RC.COMB_P/2:0);
        if(zz+RC.COMB_W>Z.seg1-12)break;
        for(const side of [0,1]){const a=side?a0+aLen:a0,dir=side?1:-1,rm=R_EXP-tDepth/2;
          _p.set(rm*Math.cos(a)-dir*(RS.COMB_H/2)*Math.sin(a),rm*Math.sin(a)+dir*(RS.COMB_H/2)*Math.cos(a),zz+RC.COMB_W/2);
          _q.setFromEuler(_e.set(0,0,a));mats.push(new T.Matrix4().compose(_p,_q,_s));}}
      const im=new T.InstancedMesh(tooth,RM.seg,mats.length);mats.forEach((m,k)=>im.setMatrixAt(k,m));
      im.castShadow=true;sg.add(im);
      if(RS.GRIP&&i===0){const a=a0+aLen*0.5;                                                  // 帯先端を咬ませるグリップ溝
        const sl=add(new T.BoxGeometry(24,12,RC.SEG_L-4),RM.grip,sg,false);          // (ビューアは1740 — セグメント長に収める)
        sl.position.set((R_EXP-12)*Math.cos(a),(R_EXP-12)*Math.sin(a),(Z.seg0+Z.seg1)/2);sl.rotation.z=a;}
      sg.userData.dir=new T.Vector3(Math.cos(ARC*i),Math.sin(ARC*i),0);
      inner.add(sg);segs.push(sg);}
    inner.rotation.y=Math.PI/2;inner.position.x=-DRUM_CZ;      // ローカルZ → X、ドラム中心を原点へ
    const group=new T.Group();group.add(inner);
    let expT=1;
    /* 拡縮: t=0 閉(φD_CON)… 1 開(φD_EXP)。セグメントは半径方向、ウエッジは軸方向に動く */
    function setExpand(t){expT=clamp01(t);const dr=RS.ST_R*expT;
      for(const s of segs)s.position.copy(s.userData.dir).multiplyScalar(dr-RS.ST_R);
      wedges.position.z=-RS.ST_Z*(1-expT);}
    setExpand(1);
    return {group,RS,setExpand,get dia(){return RS.D_CON+2*RS.ST_R*expT;},
      dispose(){group.traverse(o=>{if(o.geometry)o.geometry.dispose();});}};}

  /* =======================================================
   * 部品(軸 = X・中心 = 原点)。geoCache を渡すと同寸の部品は形を共有する
   * =====================================================*/
  function makeSteel(L){
    const pts=steelProfile(L),g=new T.Group();
    const m=new T.Mesh(revolve(pts,160,null,SP.Ro),matSteel());m.castShadow=m.receiveShadow=true;g.add(m);
    const h=L/2,rB=SP.Ro-SP.B1_RA,rF=SP.Ro-SP.B1_RA-SP.B2_RA;
    const markMat=new T.MeshPhysicalMaterial({color:C(0x9299a1),metalness:1,roughness:.78,normalMap:markTexture(L),
      normalScale:new T.Vector2(1.6,1.6),side:T.DoubleSide,envMapIntensity:1.1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const mk=new T.Mesh(revolve([[h,rF+1.2],[h-SP.B2_AX+1.2,rB-1.2]],64,null,SP.Ro),markMat);mk.renderOrder=1;g.add(mk);
    return {group:g,kind:"steel",L,ro:SP.Ro,ri:SP.Ri,mass:volumeOf(pts)*SP.DENSITY,
      dispose(){m.geometry.dispose();mk.geometry.dispose();markMat.normalMap.dispose();markMat.dispose();}};}
  function makeTube(kind,L,ri,t,geoCache){
    const key=`${L}|${ri}|${t}`;let geo=geoCache&&geoCache.get(key);
    const pr=tubeProfile(L,ri,t);
    if(!geo){geo=revolve(pr.pts,96,pr.grp,ri+t);if(geoCache)geoCache.set(key,geo);}
    const g=new T.Group(),m=new T.Mesh(geo,kind==="bake"?matBake():matPaper());m.castShadow=m.receiveShadow=true;g.add(m);
    return {group:g,kind,L,ro:ri+t,ri,mass:volumeOf(pr.pts)*DENS[kind],dispose(){if(!geoCache)geo.dispose();}};}
  function makeSleeve(riOverride){
    const pr=sleeveProfile(riOverride),ri=pr.pts[0][1],ro=ri+(SL.OD-SL.ID)/2;
    const geo=revolve(pr.pts,160,pr.grp,ro);geo.setAttribute("uv2",geo.getAttribute("uv"));   // aoMap(ダイヤ溝)用
    const g=new T.Group(),m=new T.Mesh(geo,matRubber());m.castShadow=m.receiveShadow=true;g.add(m);
    return {group:g,kind:"sleeve",L:SL.L,ro,ri,mass:volumeOf(sleeveProfile().pts)*SL.DENSITY,dispose(){geo.dispose();}};}

  /* =======================================================
   * 組合せと嵌合: ドラム(閉 D_CON 〜 開 D_EXP)→(ゴムスリーブ)→(スプール)
   *  ・剛体の管(鉄・紙管・ベーク)は、閉じたドラムに挿さり(内径 > D_CON)、
   *    開いて内径に当たるところで締め付ける(内径 ≦ D_EXP)。
   *  ・ゴムスリーブは全開まで押し広げられて把持され、外径が φ587 → 約φ615 になる。
   *  ・スリーブの上に剛体の管は挿さらない(外径 ≒ 615 に対し管の内径は最大 507)。
   * 返り値: ok / 巻き始め径 coreD / ドラム把持径 gripD / 開度 expT / 判定行 rows
   * =====================================================*/
  const nameOf={steel:"鉄スプール",paper:"紙管",bake:"ベーク",sleeve:"ゴムスリーブ"};
  const f1=v=>(Math.round(v*10)/10).toString();
  function stack(cfg){
    const RS=REELS[cfg.reel],rows=[],row=(label,cls,txt)=>rows.push({label,cls,txt});
    let ok=true,gripD=RS.D_EXP,coreD=RS.D_EXP,sleeveRi=null;
    if(cfg.sleeve){const lab="ドラム → ゴムスリーブ内径";
      if(SL.ID>RS.D_EXP){ok=false;row(lab,"ng",`すきま ${f1(SL.ID-RS.D_EXP)} mm(全開でも把持できない)`);}
      else if(SL.ID<RS.D_CON+0.5){ok=false;row(lab,"ng",`挿さらない(閉 φ${RS.D_CON} ≧ 内径 φ${SL.ID})`);}
      else{sleeveRi=RS.D_EXP/2;coreD=2*(sleeveRi+(SL.OD-SL.ID)/2);
        row(lab,"ok",`押し広げて把持(内径 φ${SL.ID} → φ${RS.D_EXP})`);}}
    if(ok&&cfg.spool!=="none"){
      const steel=cfg.spool==="steel",id=steel?SP.ID:cfg.tubeID,od=steel?SP.OD:cfg.tubeID+2*cfg.tubeT,nm=nameOf[cfg.spool];
      if(sleeveRi!=null){const c=id-coreD,lab=`スリーブ外径 → ${nm}内径`;
        if(c<-3){ok=false;row(lab,"ng",`挿さらない(締め代 ${f1(-c)} mm)`);}
        else if(c>2){ok=false;row(lab,"ng",`すきま ${f1(c)} mm(ガタ)`);}
        else{coreD=od;row(lab,"ok",c<0?`締め代 ${f1(-c)} mm(ゴムで保持)`:`すきま ${f1(c)} mm`);}}
      else{const lab=`ドラム → ${nm}内径`;
        if(id<RS.D_CON+1){ok=false;row(lab,"ng",`挿さらない(閉 φ${RS.D_CON} ≧ 内径 φ${id})`);}
        else if(id>RS.D_EXP){ok=false;row(lab,"ng",`すきま ${f1(id-RS.D_EXP)} mm(全開 φ${RS.D_EXP} でも届かない)`);}
        else{gripD=id;coreD=od;
          row(lab,"ok",`φ${f1(id)} まで開いて把持(開度 ${Math.round((id-RS.D_CON)/(RS.D_EXP-RS.D_CON)*100)}%)`);}}}
    if(ok&&!cfg.sleeve&&cfg.spool==="none")row("ドラム","ok",`帯を直接巻く(${RS.GRIP?"グリップ溝で先端を咬む":"グリップ無し"})`);
    return {ok,rows,RS,coreD,gripD,sleeveRi,expT:clamp01((gripD-RS.D_CON)/(RS.D_EXP-RS.D_CON))};}

  /* =======================================================
   * 巻いたコイル(中空リング・幅1で作って z を幅に伸ばす)。内径 r0・外径 r1 は毎フレーム書き換える。
   * 材質は [外周・内周(アルミの巻き面), 端面, 端面](= coilMats の並び)
   * =====================================================*/
  function coilRing(n){
    const BANDS=[{p:[[0,-.5],[1,-.5]],nrm:[0,0,-1],mat:1},{p:[[1,-.5],[1,.5]],nrm:"out",mat:0},
                 {p:[[1,.5],[0,.5]],nrm:[0,0,1],mat:2},{p:[[0,.5],[0,-.5]],nrm:"in",mat:0}];
    const nv=BANDS.length*2*(n+1),pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),uv=new Float32Array(nv*2),idx=[];
    const geo=new T.BufferGeometry();
    let v=0;
    BANDS.forEach(b=>{const base=v;
      for(let e=0;e<2;e++)for(let j=0;j<=n;j++){const a=2*Math.PI*j/n,c=Math.cos(a),s=Math.sin(a);
        nor.set(b.nrm==="out"?[c,s,0]:b.nrm==="in"?[-c,-s,0]:b.nrm,v*3);v++;}
      // 三角形の向きを法線に合わせる(表面だけ描く材質のため)
      const P=(e,j)=>{const [w,z]=b.p[e],r=w?1:0.5,a=2*Math.PI*j/n;return [r*Math.cos(a),r*Math.sin(a),z];};
      const A=P(0,0),B=P(1,0),C=P(0,1),u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],w=[C[0]-A[0],C[1]-A[1],C[2]-A[2]];
      const cr=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],N=nor.subarray(base*3,base*3+3);
      const flip=cr[0]*N[0]+cr[1]*N[1]+cr[2]*N[2]<0,start=idx.length;
      for(let j=0;j<n;j++){const a=base+j,b1=a+1,c=base+n+1+j,d=c+1;
        if(!flip)idx.push(a,c,b1,b1,c,d);else idx.push(a,b1,c,b1,d,c);}
      geo.addGroup(start,n*6,b.mat);});
    geo.setAttribute("position",new T.BufferAttribute(pos,3));geo.setAttribute("normal",new T.BufferAttribute(nor,3));
    geo.setAttribute("uv",new T.BufferAttribute(uv,2));geo.setIndex(idx);
    geo.boundingSphere=new T.Sphere(new T.Vector3(),1);geo.boundingBox=new T.Box3();
    let r0=-1,r1=-1;
    function set(a,b){if(Math.abs(a-r0)<1e-5&&Math.abs(b-r1)<1e-5)return;r0=a;r1=Math.max(b,a+1e-4);
      let k=0;
      for(const bd of BANDS){const side=typeof bd.nrm==="string";
        for(let e=0;e<2;e++){const [w,z]=bd.p[e],r=w?r1:r0;
          for(let j=0;j<=n;j++,k++){const a=2*Math.PI*j/n,c=Math.cos(a),s=Math.sin(a);
            pos[k*3]=r*c;pos[k*3+1]=r*s;pos[k*3+2]=z;
            if(side){uv[k*2]=j/n;uv[k*2+1]=z+0.5;}else{uv[k*2]=0.5+0.5*(r/r1)*c;uv[k*2+1]=0.5+0.5*(r/r1)*s;}}}}
      geo.attributes.position.needsUpdate=true;geo.attributes.uv.needsUpdate=true;
      geo.boundingSphere.radius=Math.hypot(r1,0.5);geo.boundingBox.set(new T.Vector3(-r1,-r1,-.5),new T.Vector3(r1,r1,.5));}
    set(0.25,0.3);
    return {geo,set};}

  return {SP,TB,SL,RC,REELS,DRUM_CZ,DENS,steelProfile,tubeProfile,sleeveProfile,volumeOf,
    makeDrum,makeSteel,makeTube,makeSleeve,stack,coilRing};
})();
