// Close-ups name only the world in view and its family (app.js inCloseUp): no names of worlds that merely line up
// behind it on screen. Real app.js and lab.js on the integration harness (DOM emulation, a fake renderer).
import test from 'node:test';import assert from 'node:assert/strict';
import {bootApp} from './integration-harness.js';
const SEEN={'solar.tour.v1':JSON.stringify({seen:true})};
const shown=a=>[...a.document.querySelectorAll('#labels > *')].filter(e=>!e.hidden).map(e=>e.textContent.trim()).filter(Boolean);
const open=(a,w)=>{const s=a.$('world');s.value=w;s.dispatchEvent(new a.window.Event('change'));a.step(80);};
test('a close-up names only the world in view and its family; the overview names them all again',async()=>{
 const a=await bootApp({fakeClock:true,stored:SEEN});a.step(40);
 const family={Mars:['Mars','Phobos','Deimos'],Ceres:['Ceres'],Earth:['Earth','Moon'],Moon:['Moon','Earth'],Saturn:['Saturn','Mimas','Enceladus','Tethys','Dione','Rhea','Titan','Iapetus'],Titan:['Titan','Saturn','Mimas','Enceladus','Tethys','Dione','Rhea','Iapetus'],Pluto:['Pluto','Charon']};
 const overview=shown(a);assert.ok(overview.length>=4,`the overview names several worlds: ${overview}`);
 for(const [w,ok] of Object.entries(family)){open(a,w);const s=shown(a);assert.ok(s.includes(w),`${w} is named in its own close-up`);
  for(const n of s)assert.ok(ok.includes(n),`${w} close-up: "${n}" is not ${w}'s family`);a.$('close').onclick();a.step(80);}
 assert.ok(shown(a).length>=4,'back in the overview, the names come back');assert.equal(a.errors.length,0);
});
