// Ladder taps during a trip are kept (the latest wins) and run on arrival; the target pill shows data-going until
// then, and aria-pressed always names the scale actually on screen. Far out, the inner planets merge into the Sun.
import test from 'node:test';import assert from 'node:assert/strict';import {bootApp} from './integration-harness.js';
test('a second ladder tap during a trip is queued, not lost; pills show arrived vs in progress',async()=>{
 const a=await bootApp({fakeClock:true});a.step(40);const L=a.lab,q=l=>a.document.querySelector(`#ladder [data-level="${l}"]`);
 const idle=()=>!L.animating&&!L.bridge&&!L.pendingTrip;
 q('universe').onclick();for(let i=0;i<3000&&L.state.value.view!=='universe';i++)a.step(1);
 for(let i=0;i<3000&&!idle();i++)a.step(1);assert.equal(L.state.value.view,'universe');
 q('galaxy').onclick();a.step(3);assert.ok(L.animating||L.bridge,'trip to the Galaxy under way');
 assert.equal(q('galaxy').dataset.going,'true');
 q('local').onclick(); // the race QA found: this tap used to be dropped
 assert.equal(L.pendingTrip,'local');assert.equal(q('local').dataset.going,'true');assert.notEqual(q('galaxy').dataset.going,'true');
 let pressedOk=true;for(let i=0;i<4000&&!(idle()&&L.state.value.view==='local');i++){a.step(1);const p=[...a.document.querySelectorAll('#ladder button')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.level);if(p.length!==1)pressedOk=false;}
 assert.equal(L.state.value.view,'local','the queued tap was carried out');assert.ok(pressedOk,'exactly one pressed pill on every frame');
 assert.ok(![...a.document.querySelectorAll('#ladder button')].some(b=>b.dataset.going==='true'),'no pill marked in progress after arrival');
 assert.equal(q('local').getAttribute('aria-pressed'),'true');assert.equal(a.errors.length,0);
});
