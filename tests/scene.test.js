// Real Three.js scene graph/math with renderer, textures, controls, and DOM replaced.
// This deliberately does not test WebGL rendering or drive a browser.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';import * as data from '../data.js';
test('Moon is independently focusable; kid/default/real scale keep radius ratios and correct parent distances',async()=>{
  function element(){return {style:{},getBoundingClientRect(){return {width:320,height:311,left:12,top:120};},value:'0',classList:{add(){},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}
  const els={};let frame;
  const context=vm.createContext({document:{getElementById:id=>els[id]||=element(),createElement:element,body:element()},window:{},innerWidth:320,innerHeight:740,devicePixelRatio:2,performance,addEventListener(){},requestAnimationFrame:fn=>{frame=fn;},console});
  class Renderer{setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}}
  class Controls{constructor(camera){this.camera=camera;this.target=new THREE.Vector3();}update(){this.camera.lookAt(this.target);}}
  const three={...THREE,WebGLRenderer:Renderer};
  const textures={tex:name=>['Moon','Earth','Mars','Mercury'].includes(name)?{map:new THREE.Texture(),bump:new THREE.Texture()}:new THREE.Texture(),rimShell:()=>new THREE.Object3D(),ringGeometry:()=>new THREE.RingGeometry(1,2),saturnRingTex:()=>new THREE.Texture(),uranusRingTex:()=>new THREE.Texture(),SATURN_RING:{inner:1.2,outer:2.3},URANUS_RING:{inner:1.5,outer:2}};
  const fake=(obj)=>new vm.SyntheticModule(Object.keys(obj),function(){for(const [k,v] of Object.entries(obj))this.setExport(k,v);},{context});
  const entry=new vm.SourceTextModule(fs.readFileSync('app.js','utf8'),{context});
  await entry.link(spec=>fake(spec.includes('three.module')?three:spec.includes('OrbitControls')?{OrbitControls:Controls}:spec.includes('data.js')?data:textures));await entry.evaluate();
  const {bodies,setKid,setRealScale,focus,hooks}=entry.namespace;
  const earth=bodies.find(b=>b.data.name==='Earth'),moon=bodies.find(b=>b.data.name==='Moon');
  assert.equal(bodies.length,10);assert.equal(moon.mesh,earth.moonMesh);assert.equal(moon.satellite,true);
  setKid(true,{noHome:true});assert.equal(earth.radius,1);assert.equal(moon.radius,data.MOON.size*2);
  assert.equal(moon.mesh.position.x,2.4);assert.equal(moon.mesh.scale.x,2);
  hooks.hold=true;frame(performance.now()+16);focus(moon);frame(performance.now()+32);
  assert.equal(els['i-name'].textContent,'Moon');assert.ok(moon.marker);
  setKid(false);assert.equal(moon.radius,data.MOON.size);assert.equal(moon.mesh.position.x,1.5);
  setRealScale(true);frame(performance.now()+48);assert.equal(moon.mesh.position.x,data.MOON.realDist);
  assert.ok(Math.abs(earth.pivot.position.length()-data.PLANETS.find(p=>p.name==='Earth').realDist)<.001);
  setRealScale(false);assert.equal(moon.mesh.position.x,1.5);
});
async function loadScene(width=390,height=844){
  function element(){return {style:{},getBoundingClientRect(){return {width,height,left:0,top:0};},value:'0',classList:{add(){},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}
  const els={};let frame;
  const context=vm.createContext({document:{getElementById:id=>els[id]||=element(),createElement:element,body:element()},window:{},innerWidth:width,innerHeight:height,devicePixelRatio:2,performance,addEventListener(){},requestAnimationFrame:fn=>{frame=fn;},console});
  class Renderer{setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}}
  class Controls{constructor(camera){this.camera=camera;this.target=new THREE.Vector3();}update(){this.camera.lookAt(this.target);}}
  const textures={tex:name=>['Moon','Earth','Mars','Mercury'].includes(name)?{map:new THREE.Texture(),bump:new THREE.Texture()}:new THREE.Texture(),rimShell:()=>new THREE.Object3D(),ringGeometry:()=>new THREE.RingGeometry(1,2),saturnRingTex:()=>new THREE.Texture(),uranusRingTex:()=>new THREE.Texture(),SATURN_RING:{inner:1.2,outer:2.3},URANUS_RING:{inner:1.5,outer:2}};
  const fake=(obj)=>new vm.SyntheticModule(Object.keys(obj),function(){for(const [k,v] of Object.entries(obj))this.setExport(k,v);},{context});
  const entry=new vm.SourceTextModule(fs.readFileSync('app.js','utf8'),{context});
  await entry.link(spec=>fake(spec.includes('three.module')?{...THREE,WebGLRenderer:Renderer}:spec.includes('OrbitControls')?{OrbitControls:Controls}:spec.includes('data.js')?data:textures));await entry.evaluate();
  let t=performance.now();const step=(n=1)=>{for(let i=0;i<n;i++)frame(t+=50);};
  return {...entry.namespace,step,context};
}
const screen=(camera,obj,w,h)=>{const p=obj.getWorldPosition(new THREE.Vector3()).project(camera);return [(p.x+1)/2*w,(1-p.y)/2*h];};
test('tiny planets are tappable with an enlarged touch radius; empty space picks nothing',async()=>{
  const s=await loadScene();s.hooks.hold=true;s.step(40);
  // In the overview, every planet is a few pixels wide. Tap 30 px outward from the outermost one.
  const world=s.bodies.filter(b=>b.pivot).map(b=>({b,p:screen(s.camera,b.mesh,390,844)})).sort((a,c)=>Math.hypot(c.p[0]-195,c.p[1]-422)-Math.hypot(a.p[0]-195,a.p[1]-422))[0];
  const [x,y]=world.p;assert.ok(x>0&&x<390&&y>0&&y<844,`${world.b.data.name} on screen in overview`);
  const dist=s.camera.position.distanceTo(world.b.mesh.getWorldPosition(new THREE.Vector3()));
  const projectedRadius=world.b.radius/dist*844/2/Math.tan(s.camera.fov*Math.PI/360);
  assert.ok(projectedRadius<10,`${world.b.data.name} is only ${projectedRadius.toFixed(1)} px`);
  const len=Math.hypot(x-195,y-422),ux=(x-195)/len,uy=(y-422)/len;
  assert.equal(s.pickAt(x+ux*30,y+uy*30,'touch')?.data.name,world.b.data.name,'30 px away still selects on touch');
  assert.notEqual(s.pickAt(x+ux*40,y+uy*40,'mouse')?.data.name,world.b.data.name,'mouse keeps a tighter radius');
  assert.equal(s.PICK_RADIUS.touch,48);
  assert.equal(s.pickAt(x+ux*60,y+uy*60,'touch'),null,'empty space beyond the radius returns null');
});
test('visible-region projection keeps the focused world centred above the sheet and picking aligned',async()=>{
  const s=await loadScene();s.hooks.hold=true;
  const mars=s.bodies.find(b=>b.data.name==='Mars');s.focus(mars,{silent:true,dur:.01});s.step(5);
  let [x,y]=screen(s.camera,mars.mesh,390,844);assert.ok(Math.abs(x-195)<2&&Math.abs(y-422)<2,`centred ${x},${y}`);
  s.hooks.visible=()=>({width:390,height:420});s.step(3);
  [x,y]=screen(s.camera,mars.mesh,390,844);assert.ok(Math.abs(x-195)<2&&Math.abs(y-210)<2,`above sheet ${x},${y}`);
  assert.equal(s.pickAt(x,y,'touch')?.data.name,'Mars');
  s.hooks.visible=()=>({width:444,height:390});
  const l=await loadScene(844,390);l.hooks.hold=true;l.hooks.visible=()=>({width:444,height:390});const lm=l.bodies.find(b=>b.data.name==='Mars');l.focus(lm,{silent:true,dur:.01});l.step(5);
  [x,y]=screen(l.camera,lm.mesh,844,390);assert.ok(Math.abs(x-222)<2&&Math.abs(y-195)<2,`left of docked sheet ${x},${y}`);
});
test('applyVisibleRegion: identity when uncovered; same on-screen scale as a screen of the visible height',async()=>{
  const s=await loadScene();const cam=new THREE.PerspectiveCamera(50,1,.1,100);cam.position.set(0,0,10);cam.lookAt(0,0,0);cam.updateMatrixWorld();
  let v=s.applyVisibleRegion(cam,390,844,null);assert.deepEqual({...v},{width:390,height:844,aspect:390/844});assert.equal(cam.view?.enabled??false,false);assert.equal(cam.zoom,1);
  v=s.applyVisibleRegion(cam,390,844,{width:390,height:400});cam.updateMatrixWorld();
  const top=new THREE.Vector3(0,1,0).project(cam),centre=new THREE.Vector3().project(cam);
  const pxPerUnit=(top.y-centre.y)/2*844;const expected=400/2/Math.tan(25*Math.PI/180)/10;
  assert.ok(Math.abs(pxPerUnit-expected)<1e-6,`${pxPerUnit} vs ${expected}`);
  assert.ok(Math.abs((1-centre.y)/2*844-200)<1e-6);
});
const PLANET_NAMES=data.PLANETS.map(p=>p.name);
const inFrustum=(camera,mesh)=>{const p=mesh.getWorldPosition(new THREE.Vector3()).project(camera);return p.z<1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1;};
for(const [w,h,label] of [[412,915,'portrait 412x915'],[390,844,'portrait 390x844'],[915,412,'landscape 915x412']]){
  test(`overview framing (${label}): opens on the whole system with all eight planets and the Sun inside the frustum (default scale)`,async()=>{
    const s=await loadScene(w,h);s.hooks.hold=true;s.step(2);
    assert.ok(s.camera.position.distanceTo(s.HOME.pos)<1e-6,'starts at the overview position');
    for(const b of s.bodies.filter(b=>b.pivot||b.data.name==='Sun'))assert.ok(inFrustum(s.camera,b.mesh),`${b.data.name} on screen`);
    // Not wastefully far out: the outermost orbit spans at least 75% of the narrow screen dimension.
    const ring=[0,Math.PI/2,Math.PI,Math.PI*1.5].map(a=>new THREE.Vector3(Math.cos(a),0,Math.sin(a)).multiplyScalar(Math.max(...data.PLANETS.map(p=>p.dist))).project(s.camera));
    const spanX=(Math.max(...ring.map(p=>p.x))-Math.min(...ring.map(p=>p.x)))/2;
    assert.ok(w<h?spanX>.75:Math.max(...ring.map(p=>Math.abs(p.y)))>.75,`span ${spanX.toFixed(2)}`);
  });
}
test('Overview flies the camera from a close-up back to the full-system framing',async()=>{
  const s=await loadScene(412,915);s.hooks.hold=true;
  const mars=s.bodies.find(b=>b.data.name==='Mars');s.focus(mars,{silent:true,dur:.3});s.step(12);
  const marsPos=mars.mesh.getWorldPosition(new THREE.Vector3());
  assert.ok(s.camera.position.distanceTo(marsPos)<mars.radius*20,'close-up on Mars');
  assert.ok(PLANET_NAMES.some(n=>!inFrustum(s.camera,s.bodies.find(b=>b.data.name===n).mesh)),'close-up hides some planets');
  s.unfocus(true,.3);s.step(12);
  assert.ok(s.camera.position.distanceTo(s.HOME.pos)<1e-6,'back at the overview position');
  assert.ok(s.controls.target.length()<1e-6,'looking at the Sun');
  for(const n of PLANET_NAMES)assert.ok(inFrustum(s.camera,s.bodies.find(b=>b.data.name===n).mesh),`${n} on screen again`);
});
test('fitHomeDistance: closer for landscape than portrait, and every ring point inside the frustum margin',async()=>{
  const s=await loadScene();const portrait=s.fitHomeDistance(100,50,412/915),landscape=s.fitHomeDistance(100,50,915/412);
  assert.ok(landscape<portrait);
  const cam=new THREE.PerspectiveCamera(50,412/915,.05,1e6);cam.position.copy(s.HOME_DIRECTION).multiplyScalar(portrait);cam.lookAt(0,0,0);cam.updateMatrixWorld();
  for(let i=0;i<360;i+=5){const p=new THREE.Vector3(Math.cos(i*Math.PI/180)*100,0,Math.sin(i*Math.PI/180)*100).project(cam);assert.ok(Math.abs(p.x)<=.91&&Math.abs(p.y)<=.91,`${i}°`);}
});
