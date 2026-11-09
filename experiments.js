import * as THREE from './vendor/three.module.min.js';
import { tex } from './textures.js';
import { seasonGeometry, phaseGeometry } from './science.js';
// Reuses the single WebGL renderer, no second GPU context. No artificial ambient
// light in phase mode: a new Moon must not look intrinsically luminous.
export function createExperiments(renderer) {
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x050b15);
 const camera=new THREE.PerspectiveCamera(35,1,.05,100);
 const light=new THREE.DirectionalLight(0xfff7e8,3);scene.add(light);scene.add(light.target);
 const tilt=new THREE.Group();scene.add(tilt);
 const earthT=tex('Earth');
 const earth=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),new THREE.MeshStandardMaterial({map:earthT.map||earthT,bumpMap:earthT.bump||null,bumpScale:.015,roughness:.9}));tilt.add(earth);
 const clouds=new THREE.Mesh(new THREE.SphereGeometry(1.008,64,48),new THREE.MeshStandardMaterial({map:tex('EarthClouds'),transparent:true,depthWrite:false,roughness:1}));earth.add(clouds);
 const axis=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1.5,0),new THREE.Vector3(0,1.5,0)]),new THREE.LineBasicMaterial({color:0xffd286}));tilt.add(axis);
 const northDot=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshBasicMaterial({color:0xffd286}));northDot.position.y=1.5;tilt.add(northDot);
 const eq=new THREE.Mesh(new THREE.TorusGeometry(1.012,.003,4,128),new THREE.MeshBasicMaterial({color:0xc0e8ff,transparent:true,opacity:.6}));eq.rotation.x=Math.PI/2;tilt.add(eq);
 // A latitude circle encodes the observer selected in the daylight calculation.
 const latitude=new THREE.Mesh(new THREE.TorusGeometry(1,.006,4,128),new THREE.MeshBasicMaterial({color:0xffd286}));latitude.rotation.x=Math.PI/2;tilt.add(latitude);
 const moonT=tex('Moon');
 const moon=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),new THREE.MeshStandardMaterial({map:moonT.map,bumpMap:moonT.bump,bumpScale:.018,roughness:1}));scene.add(moon);
 let mode='seasons', state;
 function update(next) {
  state=next;mode=next.experiment;
  tilt.visible=mode==='seasons';moon.visible=mode==='phases';
  if(mode==='seasons') {
   const g=seasonGeometry(next.orbit,next.tilt);
   light.position.fromArray(g.sun).multiplyScalar(10);
   tilt.rotation.z=-next.tilt*Math.PI/180;
   earth.rotation.y=.5; // fixed illustrative longitude, not local live time
   const lat=next.latitude*Math.PI/180;
   latitude.scale.set(Math.cos(lat)*1.015,Math.cos(lat)*1.015,1);
   latitude.position.y=Math.sin(lat)*1.015;
   camera.position.set((g.sun[0]*.4-g.sun[2]*.916)*6,.5,(g.sun[2]*.4+g.sun[0]*.916)*6);camera.lookAt(0,0,0);
  } else {
   const g=phaseGeometry(next.phase);
   light.position.set(10,0,0);
   camera.position.fromArray(g.observerFromMoon).multiplyScalar(6);camera.lookAt(0,0,0);
   moon.rotation.y=next.phase*Math.PI/180;
  }
 }
 // Renders into the region above (or beside) the sheet so the globe stays fully visible.
 function render(width,height,visible) {
  renderer.setSize(width,height,false);
  const vw=Math.min(width,visible?.width??width), vh=Math.min(height,visible?.height??height);
  const fullW=2*width-vw, fullH=2*height-vh;
  camera.aspect=fullW/fullH;
  // Preserve the whole disk even in unusually narrow visible regions.
  camera.zoom=(vh/fullH)*Math.min(1,(vw/vh)/.8);
  if(vw===width&&vh===height)camera.clearViewOffset();else camera.setViewOffset(fullW,fullH,width-vw,height-vh,width,height);
  camera.updateProjectionMatrix();renderer.render(scene,camera);
 }
 return {update,render,scene,camera,light,tilt,moon,latitude};
}
