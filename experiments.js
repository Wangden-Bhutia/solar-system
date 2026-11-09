import * as THREE from './vendor/three.module.min.js';
import { tex, photo } from './textures.js';
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
 photo(earth.material,'earth');photo(clouds.material,'earth-clouds');
 const axis=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-1.5,0),new THREE.Vector3(0,1.5,0)]),new THREE.LineBasicMaterial({color:0xffd286}));tilt.add(axis);
 const northDot=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshBasicMaterial({color:0xffd286}));northDot.position.y=1.5;tilt.add(northDot);
 const eq=new THREE.Mesh(new THREE.TorusGeometry(1.012,.003,4,128),new THREE.MeshBasicMaterial({color:0xc0e8ff,transparent:true,opacity:.6}));eq.rotation.x=Math.PI/2;tilt.add(eq);
 // A latitude circle encodes the observer selected in the daylight calculation.
 const latitude=new THREE.Mesh(new THREE.TorusGeometry(1,.006,4,128),new THREE.MeshBasicMaterial({color:0xffd286}));latitude.rotation.x=Math.PI/2;tilt.add(latitude);
 const moonT=tex('Moon');
 const moon=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),new THREE.MeshStandardMaterial({map:moonT.map,bumpMap:moonT.bump,bumpScale:.018,roughness:1}));scene.add(moon);
 photo(moon.material,'moon',{normal:'moon-normal'});
 // Tides: a translucent ocean shell stretched toward (and away from) the Moon, hugely exaggerated.
 const ocean=new THREE.Mesh(new THREE.SphereGeometry(1.02,64,32),new THREE.MeshBasicMaterial({color:0x7fd0ff,transparent:true,opacity:.3,depthWrite:false}));scene.add(ocean);
 const pull=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.5,0,0),new THREE.Vector3(2.6,0,0)]),new THREE.LineBasicMaterial({color:0xc8c6c1}));ocean.add(pull);
 const moonDot=new THREE.Mesh(new THREE.SphereGeometry(.12,24,16),new THREE.MeshBasicMaterial({color:0xc8c6c1}));moonDot.position.x=2.75;ocean.add(moonDot);
 const moonColor=moon.material.color.clone(), copper=new THREE.Color(0x8a3a1c);
 // Eclipse lab: the Sun's disc behind the Moon, drawn at the Moon's apparent size (as in reality,
 // they look almost the same size) and shifted by how far the Moon passes above or below it.
 const sunDisk=new THREE.Mesh(new THREE.CircleGeometry(7.6,64),new THREE.MeshBasicMaterial({color:0xffe1a0}));sunDisk.rotation.y=-Math.PI/2;sunDisk.position.x=40;scene.add(sunDisk);
 const glow=new THREE.Mesh(new THREE.CircleGeometry(11,64),new THREE.MeshBasicMaterial({color:0xfff2d0,transparent:true,opacity:.5,depthWrite:false}));glow.position.z=-.01;sunDisk.add(glow);
 let mode='seasons', state;
 function update(next) {
  state=next;mode=next.experiment;
  const moonView=mode==='phases'||mode==='eclipses';
  tilt.visible=mode==='seasons'||mode==='tides';moon.visible=moonView;ocean.visible=mode==='tides';sunDisk.visible=false;
  axis.visible=northDot.visible=latitude.visible=mode==='seasons';
  camera.up.set(0,1,0);moon.material.color.copy(moonColor);
  if(mode==='tides') {
   // Seen from above the North Pole; sunlight from +x; the Moon at its angle from the Sun.
   light.position.set(10,0,0);tilt.rotation.z=0;earth.rotation.y=.5;
   const a=next.phase*Math.PI/180,k=next.tideRange??1;
   ocean.rotation.set(0,a,0);ocean.scale.set(1+.08*k,1,1-.03*k);
   camera.up.set(0,0,-1);camera.position.set(0,7,.001);camera.lookAt(0,0,0);
  } else if(moonView) {
   const g=phaseGeometry(next.phase);
   light.position.set(10,0,0);
   camera.position.fromArray(g.observerFromMoon).multiplyScalar(6);camera.lookAt(0,0,0);
   moon.rotation.y=next.phase*Math.PI/180;
   // Lunar eclipse: Earth's shadow turns the Moon dim and coppery (sunlight bent through our atmosphere).
   if(mode==='eclipses'&&/^lunar/.test(next.eclipse||''))moon.material.color.copy(copper);
   // Near new Moon the Sun sits behind it. 0.26° is the Sun's apparent radius; offsets beyond
   // about one Sun-width are clamped so the near miss stays visible at the edge of the view.
   if(mode==='eclipses'&&Math.cos(next.phase*Math.PI/180)>.95){
    sunDisk.visible=true;sunDisk.position.y=Math.max(-15,Math.min(15,-(next.eclipseLat||0)/.26*7.6));
   }
  } else if(mode==='seasons') {
   const g=seasonGeometry(next.orbit,next.tilt);
   light.position.fromArray(g.sun).multiplyScalar(10);
   tilt.rotation.z=-next.tilt*Math.PI/180;
   earth.rotation.y=.5; // fixed illustrative longitude, not local live time
   const lat=next.latitude*Math.PI/180;
   latitude.scale.set(Math.cos(lat)*1.015,Math.cos(lat)*1.015,1);
   latitude.position.y=Math.sin(lat)*1.015;
   camera.position.set((g.sun[0]*.4-g.sun[2]*.916)*6,.5,(g.sun[2]*.4+g.sun[0]*.916)*6);camera.lookAt(0,0,0);
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
 return {update,render,scene,camera,light,tilt,moon,latitude,ocean,sunDisk};
}
