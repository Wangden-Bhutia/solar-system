// Real Three.js scene graph/math with renderer, textures, controls, and DOM replaced.
// This deliberately does not test WebGL rendering or drive a browser.
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';import * as data from '../data.js';
test('Moon is independently focusable; kid/default/real scale keep radius ratios and correct parent distances',async()=>{
  function element(){return {style:{},value:'0',classList:{add(){},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},getContext(){return {createRadialGradient(){return {addColorStop(){}};},fillRect(){}};}};}
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
  hooks.guided=true;frame(performance.now()+16);focus(moon);frame(performance.now()+32);
  assert.equal(els['i-name'].textContent,'Moon');assert.ok(moon.marker);
  setKid(false);assert.equal(moon.radius,data.MOON.size);assert.equal(moon.mesh.position.x,1.5);
  setRealScale(true);frame(performance.now()+48);assert.equal(moon.mesh.position.x,data.MOON.realDist);
  assert.ok(Math.abs(earth.pivot.position.length()-data.PLANETS.find(p=>p.name==='Earth').realDist)<.001);
  setRealScale(false);assert.equal(moon.mesh.position.x,1.5);
});
