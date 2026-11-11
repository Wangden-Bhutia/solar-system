// The Powers of Ten tour (tour.js) on the real lab.js and app.js (linkedom; WebGL replaced by a fake renderer, as
// in the other integration tests). DOM emulation, not a browser: this checks the order of stops, where each one
// lands, the captions, the controls and the readout agreement, never what the picture looks like on a phone.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {bootApp} from './integration-harness.js';
import {TOUR_STOPS,SOURCES,sourcesOf,TOUR_KEY,createTour} from '../tour.js';
import {layoutAt,LEVELS} from '../zoom-ladder.js';
import {formatLy} from '../hud.js';
const levelOfView=v=>v==='explore'?'solar':v;
const ready=async(o={})=>{const a=await bootApp({fakeClock:true,...o});a.step(40);a.lab.tour.dwellS=0.5;return a;};
const until=(a,f,max=2000)=>{for(let i=0;i<max;i++){if(f())return i;a.step(1);}assert.fail('timed out');};
const hud=a=>[...a.$('hud').children].map(e=>e.textContent);

test('every stop: sourced numbers, known https sources listed in docs/sources.md, outside the seams, in order outwards',()=>{
 const doc=fs.readFileSync('docs/sources.md','utf8');assert.ok(TOUR_STOPS.length>=12,'about one stop per power of ten');
 for(const s of TOUR_STOPS){
  assert.ok(s.title&&s.text,s.id);const keys=sourcesOf(s);assert.ok(keys.length>=1,`${s.id} has a source`);
  for(const k of keys){assert.ok(SOURCES[k],`${s.id}: source ${k}`);assert.match(SOURCES[k].url,/^https:\/\//);assert.ok(doc.includes(SOURCES[k].url),`${k} is in docs/sources.md`);}
  // Each fact is said in the text, and every digit in the text belongs to a sourced fact.
  for(const f of s.facts){assert.ok(s.text.includes(f.says),`${s.id}: "${f.says}" in the text`);assert.ok(f.src.length>0);}
  assert.ok(s.short&&s.short.length<=56,`${s.id}: one short line for the collapsed bar`);
  for(const line of [s.text,s.short]){let rest=line;for(const f of s.facts)rest=rest.split(f.says).join(' ');for(const n of s.names||[])rest=rest.split(n).join(' '); // proper names with digits (Voyager 1), not quantities
   assert.doesNotMatch(rest,/\d/,`${s.id}: a number without a source in "${rest}"`);}
  if(s.at.ly){const lay=layoutAt(Math.log(s.at.ly));assert.equal(lay.pair,null,`${s.id} rests outside a seam`);assert.equal(lay.level,s.level,s.id);}
 }
 const lys=TOUR_STOPS.filter(s=>s.at.ly).map(s=>s.at.ly);for(let i=1;i<lys.length;i++)assert.ok(lys[i]>lys[i-1]);
 assert.deepEqual([...new Set(TOUR_STOPS.map(s=>s.level))],LEVELS,'it passes through every scale, in order, from the Solar System to the universe');
 for(const id of ['heliosphere','oort','bubble','lookback'])assert.match(TOUR_STOPS.find(s=>s.id===id).illustration,/illustration/,`${id} is labelled an illustration`);
});

test('one tap plays every stop in order from Earth to the observable universe; each caption agrees with the readout',async()=>{
 const a=await ready(),t=a.lab.tour;
 assert.ok(a.$('tour-start'),'the Tour chip is in the top bar');assert.equal(a.$('tour').hidden,true);
 a.$('tour-start').onclick();assert.equal(t.active,true);assert.equal(a.$('tour').hidden,false);assert.ok(a.document.body.classList.contains('touring'));
 const seen=[],zs=[];
 for(let n=0;n<TOUR_STOPS.length;n++){
  until(a,()=>t.arrived&&t.index===n,3000);a.step(1);const s=TOUR_STOPS[n];seen.push(s.id);
  assert.equal(levelOfView(a.lab.state.value.view),s.level,`${s.id}: at its scale`);assert.equal(a.lab.bridge,null,`${s.id}: not left inside a seam`);
  const [w,d]=hud(a);assert.equal(a.$('hud').hidden,false,`${s.id}: the scale readout stays visible`);assert.equal(a.$('tour-here'),null,'one distance readout: the caption does not repeat it');
  if(s.at.ly)assert.equal(d.replace(/^≈ /,''),`${formatLy(s.at.ly)} from the Sun`,`${s.id}: the readout shows the stop's distance`);
  assert.equal(a.$('tour-kicker').textContent,`${n+1}/${TOUR_STOPS.length}`);assert.equal(a.$('tour-title').textContent,s.title);assert.equal(a.$('tour-short').textContent,s.short);assert.equal(a.$('tour-text').textContent,s.text);
  assert.equal(a.$('tour-more').hidden,true,`${s.id}: each stop starts collapsed (no auto-expand)`);assert.equal(a.$('tour-info').getAttribute('aria-expanded'),'false');
  a.$('tour-info').onclick();assert.equal(a.$('tour-more').hidden,false,'"i" opens the full caption');assert.equal(a.$('tour-sum').getAttribute('aria-expanded'),'true');
  const links=[...a.$('tour-sources').querySelectorAll('a')].map(x=>x.getAttribute('href'));assert.deepEqual(links,sourcesOf(s).map(k=>SOURCES[k].url),`${s.id}: source links`);
  assert.ok(links.length>=1,`${s.id}: sources reachable in the expanded caption`);
  const note=s.illustration||s.model||'';assert.equal(a.$('tour-note').hidden,!note);if(note)assert.equal(a.$('tour-note').textContent,note);
  if(n%2)a.$('tour-sum').onclick();else a.$('tour-info').onclick();assert.equal(a.$('tour-more').hidden,true,'a tap closes it again');
  zs.push(a.lab.Zcam);
 }
 assert.deepEqual(seen,TOUR_STOPS.map(s=>s.id));assert.deepEqual([...t.visits],seen,'no stop skipped or repeated');
 for(let i=2;i<zs.length;i++)assert.ok(zs[i]>zs[i-1],`stop ${i} is farther out than stop ${i-1}`);
 assert.equal(a.lab.state.value.view,'universe','reached the Universe scale');
 assert.match(hud(a)[3],/viewpoint outside the observable universe/,'the readout agrees with the last caption: this viewpoint is outside');
 assert.match(TOUR_STOPS.at(-1).illustration,/outside the observable universe/);
 until(a,()=>!t.active,400);const fin=a.document.getElementById('finale');assert.ok(fin&&!fin.hidden,'the last stop leads into the quiet finale');assert.equal(a.$('tour').hidden,true,'the tour bar steps aside for it');
 assert.equal(a.errors.length,0);
});

test('pause holds the stop; resume, next and back move; ✕ leaves free exploring at the current view',async()=>{
 const a=await ready(),t=a.lab.tour;a.$('tour-start').onclick();until(a,()=>t.arrived&&t.index===0);
 a.$('tour-next').onclick();until(a,()=>t.arrived&&t.index===1);a.$('tour-next').onclick();until(a,()=>t.arrived&&t.index===2);
 a.$('tour-play').onclick();assert.equal(t.paused,true);assert.equal(a.$('tour-play').getAttribute('aria-label'),'Resume the tour');
 for(let i=0;i<200;i++)a.step(1);assert.equal(t.index,2,'paused: no auto-advance');
 a.$('tour-play').onclick();assert.equal(t.paused,false);until(a,()=>t.index===3&&t.arrived,600);
 a.$('tour-prev').onclick();until(a,()=>t.arrived&&t.index===2);assert.equal(a.lab.state.value.view,'explore');
 for(let k=0;k<5;k++){a.$('tour-next').onclick();until(a,()=>t.arrived);}assert.equal(t.index,7);assert.equal(a.lab.state.value.view,'galaxy');
 const z=a.lab.Zcam;a.$('tour-exit').onclick();
 assert.equal(t.active,false);assert.equal(a.$('tour').hidden,true);assert.ok(!a.document.body.classList.contains('touring'));
 for(let i=0;i<200;i++)a.step(1);assert.equal(a.lab.state.value.view,'galaxy','still where the tour left off');assert.ok(Math.abs(a.lab.Zcam-z)<1e-9,'the view does not move after ✕');
 const e=new a.window.Event('wheel',{cancelable:true});Object.assign(e,{deltaY:120,deltaMode:0});a.canvas.dispatchEvent(e);for(let i=0;i<30;i++)a.step(1);
 assert.ok(a.lab.Zcam>z+0.01,'free zooming works straight away');assert.equal(a.errors.length,0);
});

test('a touch on the scene mid-glide pauses the tour on the spot; Resume carries on to that stop',async()=>{
 const a=await ready(),t=a.lab.tour;a.$('tour-start').onclick();
 for(let k=0;k<4;k++){until(a,()=>t.arrived);a.$('tour-next').onclick();}
 until(a,()=>t.arrived&&t.index===4);a.$('tour-next').onclick();
 for(let i=0;i<8;i++)a.step(1);assert.equal(t.moving,true);assert.equal(a.lab.animating,true,'gliding to the nearest stars');
 a.canvas.dispatchEvent(a.pe('pointerdown',200,400,{id:7,type:'touch'}));a.canvas.dispatchEvent(a.pe('pointerup',200,400,{id:7,type:'touch'}));
 assert.equal(t.paused,true);assert.equal(t.moving,false);assert.equal(a.lab.animating,false,'the glide stopped');assert.equal(a.$('tour-play').getAttribute('aria-label'),'Resume the tour');
 const z=a.lab.Z;for(let i=0;i<100;i++)a.step(1);assert.ok(Math.abs(a.lab.Z-z)<1e-9,'held where the finger came down');assert.equal(t.index,5);
 a.$('tour-play').onclick();until(a,()=>t.arrived&&t.index===5);assert.equal(a.lab.state.value.view,'stars');
 // A wheel also hands over; so does a scale-ladder tap, which ends the tour.
 const w=new a.window.Event('wheel',{cancelable:true});Object.assign(w,{deltaY:-120,deltaMode:0});a.canvas.dispatchEvent(w);assert.equal(t.paused,true);
 a.document.querySelector('#ladder [data-level="galaxy"]').onclick();assert.equal(t.active,false,'the ladder takes over');
 assert.equal(a.errors.length,0);
});

test('opening Explore pauses the tour and hides its caption until it closes',async()=>{
 const a=await ready(),t=a.lab.tour;a.$('tour-start').onclick();until(a,()=>t.arrived&&t.index===0);
 a.$('journeys').onclick();a.step(2);assert.equal(t.paused,true);assert.equal(a.$('explore').hidden,false);
 for(let i=0;i<100;i++)a.step(1);assert.equal(t.index,0);
 a.$('journey-list').querySelector('[data-act="tour"]').onclick();assert.equal(t.active,true,'the tour card resumes a paused tour; it does not end it');assert.equal(t.paused,false);assert.equal(a.$('explore').hidden,true);assert.equal(a.errors.length,0);
});

test('reduced motion: each stop is a cut, never a glide',async()=>{
 const a=await ready({reducedMotion:true}),t=a.lab.tour;a.$('tour-start').onclick();until(a,()=>t.arrived&&t.index===0,20);
 a.$('tour-next').onclick();until(a,()=>t.arrived&&t.index===1,5); // the Solar System's camera flight is a cut too (one frame)
 for(let n=2;n<TOUR_STOPS.length;n++){
  const z0=a.lab.Z;a.$('tour-next').onclick();
  assert.equal(t.arrived&&t.index===n,true,`${TOUR_STOPS[n].id}: there at once`);assert.equal(a.lab.animating,false);assert.equal(a.lab.bridge,null);
  assert.ok(Math.abs(a.lab.Z-z0)>0.3,'moved in one step');assert.equal(levelOfView(a.lab.state.value.view),TOUR_STOPS[n].level);
 }
 assert.equal(a.lab.state.value.view,'universe');assert.equal(a.errors.length,0);
});

test('first visit: a gentle one-time hint, remembered; later visits do not show it',async()=>{
 const a=await ready();assert.equal(a.$('tour-hint').hidden,false,'shown on a first visit');assert.ok(JSON.parse(a.storage[TOUR_KEY]).seen,'remembered at once');
 a.$('tour-hint-x').onclick();assert.equal(a.$('tour-hint').hidden,true);assert.equal(a.lab.tour.active,false,'dismissing does not start it');
 const b=await ready({stored:{[TOUR_KEY]:JSON.stringify({seen:true})}});assert.equal(b.$('tour-hint').hidden,true,'not again');assert.ok(b.$('tour-start'),'the Tour chip is always there');
 const c=await ready();c.$('tour-hint-go').onclick();assert.equal(c.lab.tour.active,true,'the hint starts the tour');assert.equal(c.$('tour-hint').hidden,true);
});

test('controller: a stale arrival after a halt is ignored; exit stops travel',()=>{
 const calls=[];let pendingDone=null,halts=0;
 const t=createTour({travel:(s,done)=>{calls.push(s.id);pendingDone=done;},halt:()=>halts++,readout:()=>['5 AU from the Sun','View 2 AU across']});
 t.start();assert.deepEqual(calls,['earth']);const stale=pendingDone;t.next();assert.equal(halts,1);stale();assert.equal(t.arrived,false,'the old glide arriving does not count');
 pendingDone();assert.equal(t.arrived,true);assert.equal(t.index,1);assert.equal(t.here(),'You are 5 AU from the Sun · view 2 AU across');
 t.tick(100);assert.equal(t.index,2,'moves on after the dwell');t.exit();assert.equal(t.active,false);const d=pendingDone;d();assert.equal(t.arrived,false);
});

test('the collapsed bar stays within its height budget (CSS estimate) and the readout sits above it',()=>{
 const css=fs.readFileSync('style.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const rule=sel=>{const m=css.match(new RegExp('(?:^|\\n|\\})'+sel.replace(/[.#[\]"=]/g,'\\$&')+'\\{([^}]*)\\}'));assert.ok(m,sel);return m[1];};
 const px=(body,prop)=>{const m=body.match(new RegExp('(?:^|;)'+prop+':([\\d.]+)px'));assert.ok(m,`${prop} in ${body}`);return +m[1];};
 const tour=rule('.tour'),pad=tour.match(/(?:^|;)padding:([\d.]+)px [\d.]+px ([\d.]+)px/),border=+tour.match(/(?:^|;)border:([\d.]+)px/)[1];
 const head=px(rule('.tour-head'),'height'),short=px(rule('.tour-short'),'height'),nav=rule('.tour-nav'),btn=rule('.tour-nav button');
 assert.equal(px(rule('.tour-head'),'line-height'),head,'the title is one line');assert.match(rule('.tour-head'),/white-space:nowrap/);
 assert.equal(px(rule('.tour-short'),'line-height'),short,'the key fact is one line');assert.match(rule('.tour-short'),/white-space:nowrap/);
 assert.ok(px(btn,'min-height')>=44&&px(btn,'min-width')>=44,'44 px tap targets');assert.equal(px(nav,'height'),px(btn,'height'));
 const total=2*border+ +pad[1]+ +pad[2]+head+short+px(nav,'margin-top')+px(nav,'height');
 assert.ok(total<=110,`collapsed bar ${total} px`);assert.equal(total,97);
 assert.match(rule('.tour-more[hidden]'),/display:none/,'collapsed: the rest of the caption takes no room');
 assert.match(tour,/bottom:calc\(var\(--safe-b\) \+ 8px\)/,'clear of the home indicator');
 assert.match(rule('body.touring .hud'),/bottom:calc\(var\(--tour-h,0px\) \+ 16px/,'the readout sits above the bar');
 assert.match(tour,/background:rgba\([^)]*,\.[0-5]\d?\)/,'translucent');
});

test('one guided story at a time: the tour ends the Earth–Moon adventure, and the adventure ends the tour',async()=>{
 const a=await ready(),t=a.lab.tour;
 a.$('adventure').onclick();until(a,()=>!a.$('story').hidden,200);
 a.$('tour-start').onclick();a.step(2);assert.equal(t.active,true);assert.equal(a.$('story').hidden,true,'the adventure panel closed');assert.ok(!a.document.body.classList.contains('story'));
 until(a,()=>t.arrived&&t.index===0);
 a.$('adventure').onclick();until(a,()=>!a.$('story').hidden,200);assert.equal(t.active,false,'the tour ended');assert.equal(a.$('tour').hidden,true);
 assert.equal(a.errors.length,0);
});
