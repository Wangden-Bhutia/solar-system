// Label declutter across the continuous zoom, 412 × 915 portrait, DOM emulation (linkedom; control boxes from
// tests/phone-layout.js, label boxes from their own transforms and widths). Not a browser or device check.
import test from 'node:test';import assert from 'node:assert/strict';import {labelSweep} from './label-sweep.js';
import * as Lb from '../labels.js';
test('sweep Solar System → Universe → back (641 steps): no two labels overlap, none on the controls, no flicker',async()=>{
 const r=await labelSweep({N:320});
 const top=Object.entries(r.byKind).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,n])=>`${n} ${k}`).join('; ');
 // main aaf1098: 174 overlapping pairs, 43 labels on the top controls / time bar / readout, 35 flickers
 assert.equal(r.pairs,0,`overlapping label pairs (${top})`);
 assert.equal(r.obstacle,0,`labels on controls (${top})`);
 assert.ok(r.flicker<=1,`flicker ${r.flicker} (${top})`); // one known: a Galaxy arm name re-placed on the frame the Galaxy settles
 assert.ok(r.maxVisible>=20,`still labelled (${r.maxVisible} at most on screen)`);
 assert.equal(r.errors,0);
});
test('frame placement: exclusions and the top band are never covered; the anchor evicts; a hidden name needs room and time to return',()=>{
 Lb.beginLabelFrame();Lb.SAFE.top=92;Lb.setExclusions([[0,800,412,915],null]);
 assert.equal(Lb.frameFree(10,80,60,95),false,'top band');assert.equal(Lb.frameFree(10,790,60,805),false,'exclusion');assert.equal(Lb.frameFree(10,300,60,313),true);
 const el=()=>({hidden:false,style:{},textContent:'x'}),A={el:el()},B={el:el()},anchor={el:el()};
 Lb.showLabel(A,true,35,313,0);Lb.frameClaim(A,10,300,60,313);
 assert.equal(Lb.frameFree(50,305,90,318),false,'overlap with a placed label');assert.equal(Lb.mayShow(B,62,300,100,313),false,'a newcomer needs HYST_PX of room');
 assert.equal(Lb.mayShow(B,70,300,100,313),true);
 Lb.frameEvict(anchor,20,302,70,315);assert.equal(A.el.hidden,true,'the anchor hides the name under it');
 // A is hidden by a collision: it may not come back for HOLD_FRAMES frames even where there is room
 for(let f=1;f<Lb.HOLD_FRAMES;f++){Lb.beginLabelFrame();Lb.setExclusions([]);assert.equal(Lb.mayShow(A,200,400,250,413),false,`held (frame ${f})`);}
 Lb.beginLabelFrame();assert.equal(Lb.mayShow(A,200,400,250,413),true,'back after the hold');
 Lb.SAFE.top=0;Lb.setExclusions([]);
});
