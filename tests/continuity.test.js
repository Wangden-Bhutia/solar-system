// Continuity invariants of the one zoom (real modules in linkedom; WebGL replaced). These are numeric checks of
// camera maths and label placement, not of what the GPU draws or how fast.
import test from 'node:test';import assert from 'node:assert/strict';import {bootApp} from './integration-harness.js';
import {WHEEL_GAIN} from '../zoom.js';import {hygPositions} from '../transition.js';
const ready=async()=>{const a=await bootApp({fakeClock:true});a.step(40);return a;};
const wheel=(a,dy)=>{const e=new a.window.Event('wheel',{cancelable:true});Object.assign(e,{deltaY:dy,deltaMode:0});a.canvas.dispatchEvent(e);};
const toStars=a=>{for(let i=0;i<600&&a.lab.state.value.view!=='stars';i++){wheel(a,120);a.step(1);}for(let i=0;i<60;i++)a.step(1);};
test('100 wheel units move Z by 0.0923 (= 1.8 × 0.01 × ln(1/0.95), the in-scene OrbitControls gain)',()=>{
 assert.ok(Math.abs(WHEEL_GAIN*100-0.09233)<1e-4,`${WHEEL_GAIN*100}`);
});
test('a steady wheel moves Z at one constant rate through the stars → Milky Way → Local Group seams (dZ/frame identical in and out of seams)',async()=>{
 const a=await ready();toStars(a);let prev=a.lab.Z;const steps=[];
 for(let i=0;i<400&&a.lab.state.value.view!=='local';i++){wheel(a,120);a.step(1);steps.push({dz:a.lab.Z-prev,seam:!!a.lab.bridge});prev=a.lab.Z;}
 assert.equal(a.lab.state.value.view,'local');const want=WHEEL_GAIN*120,body=steps.slice(30);
 assert.ok(body.some(s=>s.seam)&&body.some(s=>!s.seam),'sampled inside and outside seams');
 for(const [k,s] of body.entries())assert.ok(Math.abs(s.dz-want)<1e-6,`frame ${k+30}${s.seam?' (seam)':''}: dZ ${s.dz} vs ${want}`);
 for(let k=1;k<body.length;k++)assert.ok(Math.abs(body[k].dz-body[k-1].dz)<1e-7,'no change of rate (second difference ≈ 0, float rounding only)');
 assert.equal(a.errors.length,0);
});
test('anchor: equals the scale’s own “here” position when a seam opens, glides ≤ 3 px a frame, and changes words without moving',async()=>{
 const a=await ready();toStars(a);const out={},bounds=a.canvas.getBoundingClientRect();let last=null,maxMove=0,swapMove=0,opened=0;
 for(let i=0;i<400&&a.lab.state.value.view!=='local';i++){
  const wasBridge=!!a.lab.bridge,curView=a.lab.state.value.view;wheel(a,120);a.step(1);const b=a.lab.bridge,an=a.lab.anchor;
  if(!b){last=null;continue;}
  if(!wasBridge){const inner=b.pair==='stars>galaxy'?a.lab.starsView:a.lab.galaxyView;assert.ok(inner.anchor(out,bounds));assert.ok(Math.hypot(out.x-an.x,out.y-an.y)<0.5,`${b.pair} opens on the scene's own anchor (${out.x},${out.y}) vs (${an.x},${an.y})`);opened++;}
  if(last){const m=Math.hypot(an.x-last.x,an.y-last.y);maxMove=Math.max(maxMove,m);if(an.text!==last.text)swapMove=Math.max(swapMove,m);}
  last={x:an.x,y:an.y,text:an.text};
 }
 assert.equal(opened,2);assert.ok(maxMove<=3,`largest anchor move ${maxMove.toFixed(2)} px per 50 ms frame`);
 assert.ok(swapMove<=maxMove+1e-9&&swapMove<=3,`text swap frame moves ${swapMove.toFixed(2)} px (no jump)`);
 assert.equal(a.errors.length,0);
});
test('proxy pairs project to the same pixels at the swap (t ≈ 0.5): HYG field stars ↔ Milky Way < 0.01 px; Solar sky ↔ star map ≤ 2 px (parallax)',async()=>{
 const a=await ready(),THREE=await import('../vendor/three.module.min.js'),v=new THREE.Vector3();
 const ecl=hygPositions('ecl',1),gal=hygPositions('gal',1000),W=412,H=915;
 const px=(cam,arr,i)=>{v.fromArray(arr,i*3).project(cam);return [(v.x+1)/2*W,(1-v.y)/2*H,v.z];};
 const sky=i=>{const c=a.app.camera;v.fromArray(ecl,i*3).normalize().multiplyScalar(c.near*50).add(c.position).project(c);return [(v.x+1)/2*W,(1-v.y)/2*H];};
 let maxS=0,nS=0,maxG=0,nG=0;
 for(let i=0;i<900&&a.lab.state.value.view!=='local';i++){wheel(a,120);a.step(1);const b=a.lab.bridge;if(!b||Math.abs(b.t-0.5)>0.04)continue;
  for(let k=0;k<ecl.length/3;k+=7){const p=px(a.lab.starsView.camera,ecl,k);if(!(p[2]<1&&p[0]>0&&p[0]<W&&p[1]>0&&p[1]<H))continue;
   if(b.pair==='solar>stars'){const q=sky(k);maxS=Math.max(maxS,Math.hypot(p[0]-q[0],p[1]-q[1]));nS++;}
   if(b.pair==='stars>galaxy'){const q=px(a.lab.galaxyView.camera,gal,k);maxG=Math.max(maxG,Math.hypot(p[0]-q[0],p[1]-q[1]));nG++;}}}
 assert.ok(nS>20&&nG>0,`sampled ${nS} / ${nG} on-screen stars`);
 assert.ok(maxG<0.01,`stars ↔ Milky Way: ${maxG} px`);
 assert.ok(maxS<=2,`Solar sky (directions from the Sun) ↔ star map (true 3D from a camera ~0.25 ly out): ${maxS.toFixed(2)} px`);
});
test('Solar clip planes keep the depth range bounded across ~1 to ~6e8 scene units, unchanged close in', async () => {
 const a = await ready(), { clipFor } = a.app;
 for (const d of [1, 600, 5000]) assert.equal(clipFor(d).near, 0.05);
 for (const d of [1e6, 5.9e7, 5.9e8]) { const c = clipFor(d); assert.ok(c.far >= 4 * d && c.far / c.near <= 5e5 + 1e-6, `${d}: ${c.near}…${c.far}`); assert.ok(c.near < d / 1e4); }
});
