// Exact stand-ins across the outer seams (Galaxy → Local Group → Laniakea → Universe): each proxy pair is the same
// geometry (or the same catalogue) with the same material style; its copy lands on the same pixels at the same Z;
// exactly one of the pair is drawn at any moment. Numeric camera maths in linkedom, not a rendering or GPU check.
import test from 'node:test';import assert from 'node:assert/strict';import {bootApp} from './integration-harness.js';
const W=412,H=915;
const style=m=>({size:m.size,opacity:m.userData.base??m.opacity,blending:m.blending,color:m.color?.getHex(),vc:!!m.vertexColors,att:m.sizeAttenuation,map:m.map??null,type:m.type});
test('proxy pairs at Galaxy→Local, Local→Laniakea and Laniakea→Universe: same style, same pixels (< 0.01 px) on every seam frame, same size, one drawn at a time',async()=>{
 const a=await bootApp({fakeClock:true});a.step(40);const THREE=await import('../vendor/three.module.min.js'),v=new THREE.Vector3();
 const L=a.lab,btn=l=>a.document.querySelector(`#ladder [data-level="${l}"]`);
 const proj=(o,i,cam)=>{if(o.isSprite)v.set(0,0,0);else v.fromBufferAttribute(o.geometry.attributes.position,i);v.applyMatrix4(o.matrixWorld).project(cam);return [(v.x+1)/2*W,(1-v.y)/2*H,v.z];};
 const ngc=s=>{let r=null;s.scene.traverse(x=>{if(x.userData.layer==='ngc')r=x;});return r;};
 const pairsFor=pair=>{const [i,o]=pair.split('>'),si=L.sceneOf(i),so=L.sceneOf(o),out=[];
  so.scene.traverse(c=>{if(c.userData.proxyOf)out.push({src:c.userData.proxyOf,cp:c});});
  if(pair==='super>universe')out.push({src:ngc(si),cp:ngc(so)});
  return out.map(p=>({...p,ci:si.camera,co:so.camera}));};
 btn('galaxy').onclick();for(let i=0;i<3000&&(L.state.value.view!=='galaxy'||L.animating||L.bridge);i++)a.step(1);
 const seen=new Map();btn('universe').onclick();
 for(let f=0;f<4000&&(L.state.value.view!=='universe'||L.animating||L.bridge);f++){a.step(1);const b=L.bridge;if(!b)continue;
  const rec=seen.get(b.pair)||{maxPx:0,maxSize:0,n:0,both:0,frames:0,pairs:new Set()};rec.frames++;
  for(const p of pairsFor(b.pair)){rec.pairs.add(p.cp.userData.layer||p.src.userData.layer||p.src.type);
   assert.deepEqual(style(p.cp.material),style(p.src.material),`${b.pair}: ${p.src.userData.layer} styled identically`);
   // fades are written when each scene draws; the seam is first drawn on the frame after it opens
   if(rec.frames>1&&(p.src.userData.fade??1)>0&&(p.cp.userData.fade??1)>0)rec.both++;
   if(rec.frames<2)continue; // same Z, same direction: the pair must coincide on every seam frame, not only at the swap
   const n=p.src.isSprite?1:p.src.geometry.attributes.position.count,step=Math.max(1,Math.floor(n/60));
   for(let k=0;k<n;k+=step){const q1=proj(p.src,k,p.ci),q2=proj(p.cp,k,p.co);if(q1[2]>=1||q2[2]>=1||q1[0]<0||q1[0]>W||q1[1]<0||q1[1]>H)continue;rec.maxPx=Math.max(rec.maxPx,Math.hypot(q1[0]-q2[0],q1[1]-q2[1]));rec.n++;}
   if(p.src.isSprite){const s1=p.src.material.sizeAttenuation?p.src.scale.x/p.ci.position.distanceTo(p.src.getWorldPosition(new THREE.Vector3())):p.src.scale.x,s2=p.cp.material.sizeAttenuation?p.cp.scale.x/p.co.position.distanceTo(p.cp.getWorldPosition(new THREE.Vector3())):p.cp.scale.x;rec.maxSize=Math.max(rec.maxSize,Math.abs(s1/s2-1));}}
  seen.set(b.pair,rec);}
 assert.equal(L.state.value.view,'universe');
 const want={'galaxy>local':['mw-disc','mw-tracers','mw-core','globulars','halo','sgr-stream','magellanic'],'local>super':['local-sheet','local-void'],'super>universe':['ngc']};
 for(const [pair,layers] of Object.entries(want)){const r=seen.get(pair);assert.ok(r,`${pair} crossed`);
  for(const l of layers)assert.ok(r.pairs.has(l),`${pair}: ${l} has a copy (${[...r.pairs].join(', ')})`);
  assert.ok(r.n>20,`${pair}: ${r.n} points compared`);
  assert.ok(r.maxPx<0.01,`${pair}: copies land on the same pixels (largest ${r.maxPx} px)`);
  assert.ok(r.maxSize<1e-6,`${pair}: sprites the same size (${r.maxSize})`);
  assert.equal(r.both,0,`${pair}: never both of a pair drawn`);}
 assert.equal(a.errors.length,0);
});
