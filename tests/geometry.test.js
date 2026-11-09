import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import * as THREE from '../vendor/three.module.min.js';import * as science from '../science.js';
async function make(){
 const context=vm.createContext({console});
 const fake=obj=>new vm.SyntheticModule(Object.keys(obj),function(){for(const[k,v]of Object.entries(obj))this.setExport(k,v);},{context});
 const tex=name=>name==='EarthClouds'?new THREE.Texture():{map:new THREE.Texture(),bump:new THREE.Texture()};
 const mod=new vm.SourceTextModule(fs.readFileSync('experiments.js','utf8'),{context});await mod.link(spec=>fake(spec.includes('three.module')?THREE:spec.includes('science')?science:{tex,photo:()=>false,canPhoto:()=>false,swatch:()=>new THREE.Texture()}));await mod.evaluate();
 return mod.namespace.createExperiments({setSize(){},render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}});
}
test('rendered seasons axis/lighting agree with calculation and stay fixed across orbit',async()=>{
 const model=await make();
 for(const orbit of [0,90,180,270]){
  model.update({experiment:'seasons',orbit,tilt:23.44,latitude:40});model.render(320,235);
  const n=new THREE.Vector3(0,1,0).applyQuaternion(model.tilt.quaternion),sun=model.light.position.clone().normalize();
  assert.ok(Math.abs(n.dot(sun)-Math.sin(science.seasonGeometry(orbit).declination*Math.PI/180))<1e-10);
  assert.ok(Math.abs(model.latitude.position.y-Math.sin(40*Math.PI/180)*1.015)<1e-10);
 }
 model.update({experiment:'seasons',orbit:180,tilt:0,latitude:0});assert.ok(Math.abs(model.tilt.rotation.z)<1e-10);
});
test('rendered phase camera shows correct lit fraction and waxing right/waning left',async()=>{
 const model=await make();let originalFace;
 for(const phase of [0,45,90,135,180,225,270,315,360]){
  model.update({experiment:'phases',phase});model.render(412,320);
  const direction=model.camera.position.clone().normalize();const lit=(1+direction.dot(model.light.position.clone().normalize()))/2;
  assert.ok(Math.abs(lit-science.phaseGeometry(phase).illuminated)<1e-10);
  const localObserver=direction.clone().applyQuaternion(model.moon.quaternion.clone().invert());
  if(!originalFace)originalFace=localObserver;assert.ok(localObserver.distanceTo(originalFace)<1e-10,'same Moon face must point at Earth');
  if(phase===90||phase===270){const right=new THREE.Vector3(1,0,0).applyQuaternion(model.camera.quaternion);assert.ok(phase===90?right.dot(model.light.position)>0:right.dot(model.light.position)<0);}
 }
});
