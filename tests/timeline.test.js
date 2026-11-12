// Far is long ago (timeline.js): the look-back line in the scale readout.
import test from 'node:test';import assert from 'node:assert/strict';
import {travelYears,lightLeft,NEAR_LY} from '../timeline.js';
import {EVENTS,eventDate} from '../cosmic-calendar.js';
import {FAR_GALAXY,SHELLS} from '../cosmos-data.js';
import {bootApp} from './integration-harness.js';
const near=(a,b,rel,msg)=>assert.ok(Math.abs(a-b)<=rel*b,`${msg}: ${a} vs ${b}`);
test('travel time: a light-year is a year nearby; far out it follows the same Planck 2018 model as the rest of the app',()=>{
 assert.equal(travelYears(4.24),4.24);assert.equal(travelYears(2.5e6),2.5e6);
 near(travelYears(NEAR_LY*1.001),NEAR_LY,0.002,'no jump where the model takes over');near(travelYears(1e8),1e8,0.01,'100 million light-years is about 100 million years');
 near(travelYears(SHELLS[0].gly*1e9),SHELLS[0].gyr*1e9,0.01,'the tour’s look-back shell');
 near(travelYears(FAR_GALAXY.gly*1e9),FAR_GALAXY.lookback*1e9,0.01,'the most distant galaxy known');
 assert.equal(travelYears(9e10),EVENTS.find(e=>e.id==='cmb').ago,'the edge is the light that broke free');
 let last=0;for(let ly=1e6;ly<5e10;ly*=1.5){const t=travelYears(ly);assert.ok(t>=last,'never goes back in time as you look further');last=t;}
});
test('the words: recent light gives the year; older light the nearest cosmic-year moment; the date matches that moment’s card',()=>{
 assert.equal(lightLeft(0.5),null,'under a year (the Solar System): no line');
 assert.match(lightLeft(4.24,2026).text,/left 4 years ago, in 2022\./);
 assert.match(lightLeft(640,2026).text,/about 640 years ago, around 1390/);
 /* rounded to two figures, so the readout does not claim (or flicker through) digits the view cannot give */
 assert.equal(lightLeft(60433).short,'Its light is about 60,000 years old');assert.match(lightLeft(60433).text,/left about 60,000 years ago/);assert.equal(lightLeft(4.65e10).short,'Its light is about 13.8 billion years old');assert.equal(lightLeft(4.24).short,'Its light is 4 years old');
 assert.match(lightLeft(2.5e6).text,/2\.5 million years ago, before our species appeared/);
 assert.match(lightLeft(5.4e7).text,/after the asteroid ended the dinosaurs/);
 assert.match(lightLeft(5.5e9).text,/before the Sun formed/);
 const edge=lightLeft(4.65e10);assert.equal(edge.eventId,'cmb');assert.equal(edge.cosmic,eventDate(EVENTS.find(e=>e.id==='cmb')).label,'same date as the first-light card');
 for(let ly=2;ly<5e10;ly*=1.7){const r=lightLeft(ly);assert.ok(EVENTS.some(e=>e.id===r.eventId),`${ly}: links to a real moment`);assert.ok(!/undefined/.test(r.text),r.text);}
});
test('in the app: no look-back line in the Solar System; in the Milky Way it shows, and a tap opens that moment in the cosmic year',async()=>{
 const a=await bootApp({fakeClock:true,stored:{'solar.tour.v1':JSON.stringify({seen:true})}});a.step(40);
 const line=()=>a.document.querySelector('.hud-time');
 assert.equal(line().hidden,true,'light crosses the Solar System in hours: nothing to say');
 a.click(a.document.querySelector('#ladder [data-level="galaxy"]'));a.step(400);
 assert.equal(line().hidden,false);assert.match(line().textContent,/^Its light is about .* years old ›$/);assert.match(a.document.querySelector('.hud-look').textContent,/^Light from the far side of this view left about .* In the cosmic year: /);
 assert.ok(EVENTS.some(e=>e.id===line().dataset.event));assert.equal(a.errors.length,0);
});
