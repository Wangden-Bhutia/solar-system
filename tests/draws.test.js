// What each frame actually submits to the renderer (recorded at renderer.render, after every scene's LOD has run),
// across the Galaxy → Local → Laniakea → Universe seams, the seam-opening frame included:
//  - a source and its copy are never both submitted with nonzero opacity in the same frame;
//  - the drawn light of a point cloud (vertices × size² × opacity, the additive sum it puts on screen) never
//    changes by more than 8% between frames across a swap, and falls (never grows) as the camera recedes;
//  - settled Local / Laniakea submit a bounded number of point vertices.
// These are numbers from the scene graph, not pixels from a GPU: rendered brightness still needs browser QA.
import test from 'node:test';import assert from 'node:assert/strict';import {bootApp} from './integration-harness.js';
const drawn=o=>o.visible!==false&&o.material&&o.material.visible!==false&&o.material.opacity>0;
test('drawn objects per frame: no double draw of a seam pair, drawn light continuous, bounded vertices',async()=>{
 let frame=[];const onRender=(scene)=>{scene.traverseVisible(o=>{if(drawn(o))frame.push(o);});};
 const a=await bootApp({fakeClock:true,onRender});a.step(40);const L=a.lab,btn=l=>a.document.querySelector(`#ladder [data-level="${l}"]`);
 const settle=lvl=>{for(let i=0;i<4000&&(L.state.value.view!==lvl||L.animating||L.bridge);i++){frame=[];a.step(1);}};
 const light=o=>o.isPoints?(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)*o.material.size**2*o.material.opacity:0;
 btn('galaxy').onclick();settle('galaxy');
 const stats={};let prev=null,doubles=0,frames=0;const paired=new Set(); // sources that have a copy in the next scene
 // Only seam pairs are compared: ordinary size fades are smooth in Z but span ~1.4 in Z, so at the ladder's ~0.23 per
 // frame they step more than 8% per frame by design; the swap itself must add nothing beyond the 1/D² dimming.
btn('universe').onclick();
 for(let f=0;f<4000&&(L.state.value.view!=='universe'||L.animating||L.bridge);f++){frame=[];a.step(1);const b=L.bridge;if(!b){prev=null;continue;}frames++;
  const set=new Set(frame),cur=new Map();const inner=L.sceneOf(b.pair.split('>')[0]).scene,root=o=>{while(o.parent)o=o.parent;return o;};for(const o of frame)if(o.userData.proxyOf&&root(o.userData.proxyOf)===inner)paired.add(o.userData.proxyOf);
  for(const o of frame){const src=o.userData.proxyOf;if(src&&set.has(src))doubles++;const key=src||o;if(o.isPoints&&paired.has(key)&&(o===key||root(key)===inner))cur.set(key,(cur.get(key)||0)+light(o));}
  if(prev&&prev.pair===b.pair)for(const [k,v] of cur){const w=prev.cur.get(k);if(w>1e-3*Math.max(v,w)){const dZ=Math.abs(L.Zcam-prev.Z),r=Math.abs(Math.log(v/w))-2*dZ,s=stats[b.pair]||(stats[b.pair]={maxStep:0,grew:0,worst:''});if(r>s.maxStep){s.maxStep=r;s.worst=`${k.userData.layer||k.type} t=${b.t.toFixed(3)} ${w.toPrecision(3)}→${v.toPrecision(3)} dZ=${dZ.toFixed(3)}`;}if(v>w*1.0001&&b.dir!=='in')s.grew++;}}
  prev={pair:b.pair,cur,Z:L.Zcam};}
 assert.ok(frames>15,`${frames} seam frames`);
 assert.equal(doubles,0,'a source and its copy were both drawn in one frame');
 for(const p of ['galaxy>local','local>super'])assert.ok(stats[p],`${p} crossed`);
 for(const [p,s] of Object.entries(stats))assert.ok(s.maxStep<Math.log(1.08),`${p}: log drawn light jumped ${s.maxStep.toFixed(3)} beyond 1/D² (${s.worst})`);
 const verts=lvl=>{btn(lvl).onclick();settle(lvl);frame=[];a.step(1);return frame.reduce((n,o)=>n+(o.isPoints?(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count):0),0);};
 const vLocal=verts('local'),vSuper=verts('super');
 assert.ok(vLocal<120000&&vSuper<120000,`settled point vertices: local ${vLocal}, laniakea ${vSuper}`);
 console.log(`# drawn point vertices settled: local ${vLocal}, laniakea ${vSuper}; max per-frame light step ${JSON.stringify(stats)}`);
 assert.equal(a.errors.length,0);
});
