// Regressions from PR #25 (Solar → Stars seam): the Solar System's Oort cloud must be in its scene, the soft
// shells must keep their look when copied for another scale, and the Local Bubble must be visible from inside,
// where the star map's camera always is. Scene-graph and shader-source checks in linkedom with a fake renderer,
// plus the shell's viewing-angle maths; none of this is a GPU or pixel check.
import test from 'node:test';import assert from 'node:assert/strict';import {bootApp} from './integration-harness.js';
import * as T from '../transition.js';
const find=(scene,layer)=>{const out=[];scene.traverse(o=>{if(o.userData.layer===layer)out.push(o);});return out;};
test('the Solar System draws its Oort cloud: in the scene graph, registered with its level of detail, never frustum-culled',async()=>{
 const a=await bootApp({fakeClock:true});a.step(5);
 const {solarScene,solarLod,solarOort}=a.app;
 assert.ok(solarOort?.isPoints,'the Oort cloud is a point cloud');
 let inScene=false;solarScene.traverse(o=>{if(o===solarOort)inScene=true;});
 assert.ok(inScene,'the Oort cloud is in the Solar scene');
 assert.equal(solarOort.userData.layer,'oort');assert.equal(solarOort.frustumCulled,false);
 assert.ok(solarLod.has(solarOort),'registered with the Solar level of detail');
 // Its light follows the same inverse-square rule as the other additive clouds (lod.js FLUX_AUTO).
 const e=solarLod.entries.find(e=>e.mat===solarOort.material);assert.ok(e.objs.some(it=>it.o===solarOort&&it.flux),'flux-dimmed like other clouds');
 assert.equal(a.errors.length,0);
});
test('soft shells: the shader hook adds the rim term; a copied soft shell (Local Void in Laniakea) is a Mesh with the same hook',async()=>{
 const sh={vertexShader:'#include <project_vertex>',fragmentShader:'#include <dithering_fragment>'};T.softShellHook(sh);
 assert.match(sh.vertexShader,/vRim = 1\.0 - abs\(dot\(/);assert.match(sh.fragmentShader,/gl_FragColor\.a \*= pow\(vRim, 3\.0\)/);
 const soft=T.wireShell({layer:'x'});assert.ok(soft.isMesh);assert.equal(soft.material.onBeforeCompile,T.softShellHook);assert.equal(soft.userData.shell,'soft');
 const a=await bootApp({fakeClock:true});a.step(5);
 a.document.querySelector('#ladder [data-level="super"]').onclick();for(let i=0;i<4000&&(a.lab.state.value.view!=='super'||a.lab.animating||a.lab.bridge);i++)a.step(1);
 const lan=a.lab.sceneOf('super');assert.ok(lan,'Laniakea built');const copies=find(lan.scene,'local-void').filter(o=>o.userData.proxyOf);
 assert.equal(copies.length,1,'one Local Void copy in Laniakea');const c=copies[0],src=c.userData.proxyOf;
 assert.ok(src.isMesh&&c.isMesh,'source and copy are both meshes (not a point cloud of the sphere vertices)');
 assert.ok(!c.isPoints);assert.equal(c.geometry,src.geometry,'geometry shared, not duplicated');
 assert.notEqual(c.material,src.material,'own material (each scene fades its own copy)');
 // (the app runs in its own VM context, so its softShellHook is a different function object from T's)
 assert.equal(c.material.onBeforeCompile,src.material.onBeforeCompile,'the copy keeps the rim shader');assert.equal(c.material.onBeforeCompile.name,'softShellHook');
 assert.equal(c.material.side,src.material.side);assert.equal(c.material.blending,src.material.blending);
 // Every other shell (heliosphere, Local Bubble, Local Void) is drawn as the shell it is.
 for(const [s,l] of [[a.app.solarScene,'heliosphere'],[a.lab.sceneOf('stars').scene,'local-bubble'],[a.lab.sceneOf('local').scene,'local-void']])
  for(const o of find(s,l)){assert.ok(o.isMesh||o.isLineSegments,`${l} is a mesh or lines`);if(o.isMesh)assert.equal(o.material.onBeforeCompile.name,'softShellHook',`${l} keeps its hook`);}
 assert.equal(a.errors.length,0);
});
test('Local Bubble: visible from inside at every star-map distance (60–300 ly), unlike a soft rim',async()=>{
 const R=T.LOCAL_BUBBLE_LY/2;
 // Why a soft rim cannot work here: from inside, its brightest line of sight is nearly face-on.
 assert.ok(T.shellPeak('soft',300,R)<0.01,'soft rim at 300 ly inside a 500-ly shell: under 1% (invisible)');
 assert.equal(T.shellPeak('soft',600,R),1,'from outside a soft shell has a grazing edge');
 const a=await bootApp({fakeClock:true});a.step(5);
 const [b]=find(a.lab.sceneOf('stars').scene,'local-bubble');assert.ok(b,'the Local Bubble is drawn');
 assert.equal(b.scale.x,R,'radius unchanged: 500 ly (about 1,000 ly across)');assert.equal(b.userData.illustration,true);
 for(const d of [60,100,200,300])assert.ok(T.shellPeak(b.userData.shell,d,R)>=0.5,`visible from ${d} ly inside`);
 assert.equal(a.errors.length,0);
});
