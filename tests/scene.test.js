// Real Three.js scene graph/math with renderer, textures, controls, and DOM replaced.
// This deliberately does not test WebGL rendering or drive a browser.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';import * as data from '../data.js';
test('Moon is independently focusable; kid/default/real scale keep radius ratios and correct parent distances',async()=>{
  function element(){return {style:{},dataset:{},getBoundingClientRect(){return {width:320,height:311,left:12,top:120};},value:'0',classList:{add(){},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}
  const els={};let frame;
  const context=vm.createContext({document:{getElementById:id=>els[id]||=element(),createElement:element,body:element(),addEventListener(){}},window:{},innerWidth:320,innerHeight:740,devicePixelRatio:2,performance,addEventListener(){},requestAnimationFrame:fn=>{frame=fn;},console});
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
  const size={width,height},listeners={};
  function element(){return {style:{},dataset:{},getBoundingClientRect(){return {width:size.width,height:size.height,left:0,top:0};},value:'0',classList:{add(){},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}
  const els={};let frame;
  const context=vm.createContext({document:{getElementById:id=>els[id]||=element(),createElement:element,body:element(),addEventListener(){}},window:{},innerWidth:width,innerHeight:height,devicePixelRatio:2,performance,addEventListener(type,fn){(listeners[type]||=[]).push(fn);},requestAnimationFrame:fn=>{frame=fn;},console});
  class Renderer{setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}}
  class Controls{constructor(camera){this.camera=camera;this.target=new THREE.Vector3();}update(){this.camera.lookAt(this.target);}}
  const textures={tex:name=>['Moon','Earth','Mars','Mercury'].includes(name)?{map:new THREE.Texture(),bump:new THREE.Texture()}:new THREE.Texture(),rimShell:()=>new THREE.Object3D(),ringGeometry:()=>new THREE.RingGeometry(1,2),saturnRingTex:()=>new THREE.Texture(),uranusRingTex:()=>new THREE.Texture(),SATURN_RING:{inner:1.2,outer:2.3},URANUS_RING:{inner:1.5,outer:2}};
  const fake=(obj)=>new vm.SyntheticModule(Object.keys(obj),function(){for(const [k,v] of Object.entries(obj))this.setExport(k,v);},{context});
  const entry=new vm.SourceTextModule(fs.readFileSync('app.js','utf8'),{context});
  await entry.link(spec=>fake(spec.includes('three.module')?{...THREE,WebGLRenderer:Renderer}:spec.includes('OrbitControls')?{OrbitControls:Controls}:spec.includes('data.js')?data:textures));await entry.evaluate();
  let t=performance.now();const step=(n=1)=>{for(let i=0;i<n;i++)frame(t+=50);};
  const resizeTo=(w,h)=>{size.width=w;size.height=h;for(const fn of listeners.resize||[])fn();};
  return {...entry.namespace,step,context,resizeTo};
}
const screen=(camera,obj,w,h)=>{const p=obj.getWorldPosition(new THREE.Vector3()).project(camera);return [(p.x+1)/2*w,(1-p.y)/2*h];};
test('tiny planets are tappable with an enlarged touch radius; empty space picks nothing',async()=>{
  const s=await loadScene();s.hooks.hold=true;s.setHomeScope('all');s.step(40);
  // In the all-planets overview, every planet is a few pixels wide. Tap 50 px outward from the outermost one.
  const world=s.bodies.filter(b=>b.pivot).map(b=>({b,p:screen(s.camera,b.mesh,390,844)})).sort((a,c)=>Math.hypot(c.p[0]-195,c.p[1]-422)-Math.hypot(a.p[0]-195,a.p[1]-422))[0];
  const [x,y]=world.p;assert.ok(x>0&&x<390&&y>0&&y<844,`${world.b.data.name} on screen in overview`);
  const dist=s.camera.position.distanceTo(world.b.mesh.getWorldPosition(new THREE.Vector3()));
  const projectedRadius=world.b.radius/dist*844/2/Math.tan(s.camera.fov*Math.PI/360);
  assert.ok(projectedRadius<10,`${world.b.data.name} is only ${projectedRadius.toFixed(1)} px`);
  const len=Math.hypot(x-195,y-422),ux=(x-195)/len,uy=(y-422)/len;
  assert.equal(s.pickAt(x+ux*50,y+uy*50,'touch')?.data.name,world.b.data.name,'50 px away still selects on touch');
  assert.notEqual(s.pickAt(x+ux*40,y+uy*40,'mouse')?.data.name,world.b.data.name,'mouse keeps a tighter radius');
  assert.equal(s.PICK_RADIUS.touch,60);
  assert.equal(s.pickAt(x+ux*80,y+uy*80,'touch')?.data.name??null,null,'empty space beyond the radius returns null');
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
const PLANET_NAMES=data.PLANETS.map(p=>p.name),INNER=['Mercury','Venus','Earth','Mars'];
const inFrustum=(camera,mesh)=>{const p=mesh.getWorldPosition(new THREE.Vector3()).project(camera);return p.z<1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1;};
const ringPx=(camera,r,w)=>{const p=new THREE.Vector3(r,0,0).project(camera),c=new THREE.Vector3().project(camera);return (p.x-c.x)/2*w;};
for(const [w,h] of [[412,915],[390,844]]){
  test(`portrait overview ${w}x${h}: opens on the inner planets, legible and tappable (default scale)`,async()=>{
    const s=await loadScene(w,h);s.hooks.hold=true;s.step(2);
    assert.equal(s.hooks.homeScope,'inner');assert.ok(s.camera.position.distanceTo(s.HOME.pos)<1e-6,'starts at the overview position');
    for(const n of ['Sun',...INNER])assert.ok(inFrustum(s.camera,s.bodies.find(b=>b.data.name===n).mesh),`${n} on screen`);
    const radii=INNER.map(n=>ringPx(s.camera,data.PLANETS.find(p=>p.name===n).dist,w));
    const sunPx=ringPx(s.camera,data.SUN.size,w);
    assert.ok(radii[0]-sunPx>=15,`Mercury's orbit clears the Sun disc (${(radii[0]-sunPx).toFixed(0)} px)`);
    for(let i=1;i<radii.length;i++)assert.ok(radii[i]-radii[i-1]>=20,`${INNER[i-1]}→${INNER[i]} orbits ${(radii[i]-radii[i-1]).toFixed(0)} px apart`);
    assert.ok(radii.at(-1)>w*.38&&radii.at(-1)<=w*.46,`Mars orbit ${radii.at(-1).toFixed(0)} px fills the width without leaving it`);
    // Steeper than the landscape view so the orbit ellipses use the tall screen.
    assert.ok(s.HOME.pos.y/s.HOME.pos.length()>Math.sin(50*Math.PI/180));
  });
}
for(const [w,h,label,defaultAll] of [[412,915,'portrait 412x915',false],[390,844,'portrait 390x844',false],[915,412,'landscape 915x412',true]]){
  test(`all-planets overview (${label}): all eight planets and the Sun inside the frustum (default scale)`,async()=>{
    const s=await loadScene(w,h);s.hooks.hold=true;
    if(defaultAll)assert.equal(s.hooks.homeScope,'all','landscape defaults to all planets');else s.setHomeScope('all');
    s.step(40);
    assert.ok(s.camera.position.distanceTo(s.HOME.pos)<1e-6,'at the overview position');
    for(const b of s.bodies.filter(b=>b.pivot||b.data.name==='Sun'))assert.ok(inFrustum(s.camera,b.mesh),`${b.data.name} on screen`);
    const r=ringPx(s.camera,Math.max(...data.PLANETS.map(p=>p.dist)),w);assert.ok(r<=w/2&&(w<h?r>w*.35:true),`Neptune orbit ${r.toFixed(0)} px`);
  });
}
test('Overview flies the camera from a close-up back to the overview framing',async()=>{
  const s=await loadScene(412,915);s.hooks.hold=true;
  const mars=s.bodies.find(b=>b.data.name==='Mars');s.focus(mars,{silent:true,dur:.3});s.step(12);
  assert.ok(s.camera.position.distanceTo(mars.mesh.getWorldPosition(new THREE.Vector3()))<mars.radius*20,'close-up on Mars');
  assert.ok(!inFrustum(s.camera,s.bodies.find(b=>b.data.name==='Sun').mesh)||INNER.some(n=>!inFrustum(s.camera,s.bodies.find(b=>b.data.name===n).mesh)),'close-up hides part of the system');
  s.unfocus(true,.3);s.step(12);
  assert.ok(s.camera.position.distanceTo(s.HOME.pos)<1e-6,'back at the overview position');assert.ok(s.controls.target.length()<1e-6,'looking at the Sun');
  for(const n of INNER)assert.ok(inFrustum(s.camera,s.bodies.find(b=>b.data.name===n).mesh),`${n} on screen again`);
  s.setHomeScope('all');s.step(30);for(const n of PLANET_NAMES)assert.ok(inFrustum(s.camera,s.bodies.find(b=>b.data.name===n).mesh),`${n} on screen with all planets`);
});
test('fitHomeDistance: closer for landscape than portrait, and every ring point inside the frustum margin',async()=>{
  const s=await loadScene();const portrait=s.fitHomeDistance(100,50,412/915,s.homeDirection(412/915)),landscape=s.fitHomeDistance(100,50,915/412,s.homeDirection(915/412));
  assert.ok(landscape<portrait);
  const cam=new THREE.PerspectiveCamera(50,412/915,.05,1e6);cam.position.copy(s.homeDirection(412/915)).multiplyScalar(portrait);cam.lookAt(0,0,0);cam.updateMatrixWorld();
  for(let i=0;i<360;i+=5){const p=new THREE.Vector3(Math.cos(i*Math.PI/180)*100,0,Math.sin(i*Math.PI/180)*100).project(cam);assert.ok(Math.abs(p.x)<=.91&&Math.abs(p.y)<=.91,`${i}°`);}
});
test('overview Sun is drawn smaller (apparent radius capped) and returns to normal size for close-ups and Real scale',async()=>{
  const s=await loadScene(412,915);s.hooks.hold=true;s.step(40);
  const sun=s.bodies[0],pxPerUnit=915/2/Math.tan(s.camera.fov*Math.PI/360);
  const sunPx=sun.radius/s.camera.position.length()*pxPerUnit;
  const mercuryPx=ringPx(s.camera,data.PLANETS[0].dist,412);
  assert.equal(s.OVERVIEW_SUN,.5);assert.ok(Math.abs(sun.radius-data.SUN.size*.5)<1e-6,'overview Sun at half its default size');
  assert.ok(sunPx<=32,`Sun apparent radius ${sunPx.toFixed(1)} px ≤ 32 px`);assert.ok(sunPx<=.45*mercuryPx,`Sun ${sunPx.toFixed(0)} px vs Mercury orbit ${mercuryPx.toFixed(0)} px`);
  s.focus(sun,{silent:true,dur:.3});s.step(40);assert.ok(Math.abs(sun.radius-data.SUN.size)<1e-6,'Sun card / close-up: default 1/5 size');
  s.unfocus(true,.3);s.step(40);assert.ok(Math.abs(sun.radius-data.SUN.size*.5)<1e-6);
  s.setRealScale(true);s.step(40);assert.ok(Math.abs(sun.radius-data.SUN.size*data.SUN_SHRINK)<1e-6,'Real scale keeps the true Sun size');
});
test('orbits run at 1/5 speed in the overview and full speed in a close-up',async()=>{
  const s=await loadScene(412,915);s.step(40);
  const earth=s.bodies.find(b=>b.data.name==='Earth');const ang=()=>Math.atan2(-earth.pivot.position.z,earth.pivot.position.x);
  const sweep=()=>{const a0=ang();s.step(20);let d=ang()-a0;if(d<0)d+=Math.PI*2;return d*180/Math.PI;};
  const overview=sweep();
  s.focus(s.bodies.find(b=>b.data.name==='Mars'),{silent:true,dur:.05});s.step(40);const close=sweep();
  assert.ok(Math.abs(close-18)<.5,`close-up: ${close.toFixed(2)}° per second (1 year / 20 s)`);
  assert.ok(Math.abs(overview-3.6)<.3,`overview: ${overview.toFixed(2)}° per second`);
});
test('a page first laid out at another size re-frames the overview when it becomes 412x915 (stale framing bug)',async()=>{
  const s=await loadScene(800,800);s.hooks.hold=true;s.step(40);
  const before=s.camera.position.length();
  s.resizeTo(412,915);s.step(40);
  assert.ok(s.camera.position.distanceTo(s.HOME.pos)<1e-6,'camera flew to the new overview');assert.ok(Math.abs(s.camera.position.length()-before)>1);
  for(const n of ['Sun',...INNER])assert.ok(inFrustum(s.camera,s.bodies.find(b=>b.data.name===n).mesh),`${n} on screen`);
  const home=s.HOME.pos.clone();s.resizeTo(412,860);s.step(40);// URL bar: small change, camera keeps framing within the fitted margin
  for(const n of ['Sun',...INNER])assert.ok(inFrustum(s.camera,s.bodies.find(b=>b.data.name===n).mesh),`${n} still on screen after a URL-bar resize`);
  void home;
});
