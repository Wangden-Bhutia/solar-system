// Continue where you left off, Back to Earth, and the phone's Back button (resume.js + lab.js). The pure checks
// read resume.js; the rest drive the real app modules in linkedom with a fake renderer (tests/integration-harness.js).
// DOM emulation, NOT a browser, GPU or phone: the glide is checked as numbers (Z, scale, direction), never as a picture.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {SPOT_KEY,SPOT_MAX_AGE_MS,makeSpot,parseSpot,isAway,spotLabel,AWAY_Z} from '../resume.js';
import {layoutAt,SEAM_Z} from '../zoom-ladder.js';
import {bootApp} from './integration-harness.js';

const SEEN={'solar.tour.v1':'{"seen":true}'}; // a returning visitor: the tour's first-visit hint is already dismissed
const now=1.79e12,ctx={now,levelAt:layoutAt,zMin:-30,zMax:40,names:{worlds:new Set(['Earth','Jupiter']),stars:new Set(['Sirius']),landmarks:new Set(['Orion Nebula'])}};
const settle=(a,max=900)=>{for(let i=0;i<max&&(a.lab.animating||a.lab.bridge||a.lab.pendingTrip);i++)a.step(1);a.step(40);};
const ladder=(a,l)=>{a.click(a.document.querySelector(`#ladder [data-level="${l}"]`));settle(a);};
const dirOf=(a,l)=>{const sc=a.lab.sceneOf(l),p=sc.camera.position.clone().sub(sc.controls.target).normalize();return p;};

test('a spot is saved as plain numbers and names, and read back only if it still fits the app',()=>{
 const z=(SEAM_Z['solar>stars'][1]+SEAM_Z['stars>galaxy'][0])/2;
 const sp=makeSpot({view:'stars',Z:z,dir:{x:0.6,y:0,z:0.8},star:'Sirius',now});
 assert.deepEqual(Object.keys(sp).sort(),['Z','dir','landmark','level','star','t','v','view','world']);
 const back=parseSpot(JSON.stringify(sp),ctx);assert.equal(back.level,'stars');assert.equal(back.star,'Sirius');assert.ok(Math.abs(back.Z-z)<1e-4);
 // Corrupt, foreign or stale values are ignored: the app starts as usual.
 const bad=[null,'','{','"text"','[]','{"v":2}',JSON.stringify({...sp,v:0}),JSON.stringify({...sp,Z:'1'}),JSON.stringify({...sp,Z:NaN}),JSON.stringify({...sp,Z:1e9}),
  JSON.stringify({...sp,level:'galaxy'}),JSON.stringify({...sp,view:'try'}),JSON.stringify({...sp,dir:[0,0]}),JSON.stringify({...sp,dir:[0,0,0]}),JSON.stringify({...sp,dir:[1,'a',0]}),
  JSON.stringify({...sp,star:'Vulcan'}),JSON.stringify({...sp,star:7}),JSON.stringify({...sp,t:now-SPOT_MAX_AGE_MS-1}),JSON.stringify({...sp,t:now+3600e3}),
  JSON.stringify({...sp,Z:SEAM_Z['solar>stars'][0]+(SEAM_Z['solar>stars'][1]-SEAM_Z['solar>stars'][0])/2}), // inside a seam: never a resting spot
  JSON.stringify({...sp,world:'Earth'})];
 for(const raw of bad)assert.equal(parseSpot(raw,ctx),null,String(raw).slice(0,80));
 // Away from the start: anything selected, another scale, or more than twice / half the home distance.
 const home=-7.7,solar=(Z,o={})=>({level:'solar',view:'explore',Z,dir:{x:0,y:1,z:0},world:null,star:null,landmark:null,...o});
 assert.equal(isAway(solar(home),home),false);assert.equal(isAway(solar(home+AWAY_Z*0.9),home),false);
 assert.equal(isAway(solar(home+AWAY_Z*1.1),home),true);assert.equal(isAway(solar(home,{world:'Jupiter'}),home),true);assert.equal(isAway(back,home),true);assert.equal(isAway(null,home),false);
 assert.equal(spotLabel(back),'Sirius · nearby stars');assert.equal(spotLabel(solar(home,{world:'Jupiter'})),'Jupiter');assert.equal(spotLabel({...back,star:null}),'the nearby stars');
 assert.equal(spotLabel(solar(home+2),home),'the Solar System, zoomed out');
});

test('exploring saves the spot (throttled, never mid-glide); Continue glides back there on the next visit, camera turned the same way',async()=>{
 const a=await bootApp({fakeClock:true,stored:SEEN});a.step(40);
 assert.equal(a.lab.resumeOffer,null,'nothing saved yet: no prompt');
 ladder(a,'stars');
 // While the glide was running nothing was saved in a seam: the saved spot rests in the star map.
 let sp=JSON.parse(a.storage[SPOT_KEY]);assert.equal(sp.level,'stars');assert.equal(layoutAt(sp.Z).pair,null);
 // Turn the view and pick a star: the next save (≥ 1.5 s later) has both.
 const sc=a.lab.sceneOf('stars'),d=sc.zoomState().d;sc.setView({x:0.8,y:0.2,z:-0.565},d);
 const sirius=a.lab.starsView.entries.find(e=>e.name==='Sirius');a.lab.go({view:'stars',star:'Sirius',sheet:'peek'});a.step(40);
 sp=JSON.parse(a.storage[SPOT_KEY]);assert.ok(sirius);assert.equal(sp.star,'Sirius');assert.ok(Math.abs(sp.dir[0]-0.8/Math.hypot(0.8,0.2,0.565))<1e-3,'direction saved');
 const before=a.storage[SPOT_KEY];a.step(10);assert.equal(a.storage[SPOT_KEY],before,'unchanged view: no new write');
 // Next visit.
 const b=await bootApp({fakeClock:true,stored:{...SEEN,[SPOT_KEY]:a.storage[SPOT_KEY]}});b.step(20);
 assert.equal(b.$('resume').hidden,false,'the prompt shows');assert.match(b.$('resume-go').textContent,/Continue where you left off: Sirius · nearby stars/);
 assert.equal(b.$('tour-hint').hidden,true);
 b.step(80);assert.equal(b.storage[SPOT_KEY],a.storage[SPOT_KEY],'the start is not saved over the spot while it is offered');
 b.click(b.$('resume-go'));assert.equal(b.$('resume').hidden,true);settle(b);
 assert.equal(b.lab.state.value.view,'stars');assert.equal(b.lab.state.value.star,'Sirius');assert.equal(b.sheet,'peek','its card peeks up');
 assert.ok(Math.abs(b.lab.Zcam-sp.Z)<0.02,`Z ${b.lab.Zcam} vs ${sp.Z}`);
 const got=dirOf(b,'stars');assert.ok(got.x*sp.dir[0]+got.y*sp.dir[1]+got.z*sp.dir[2]>0.999,'turned to the saved direction');
 assert.deepEqual([...a.errors,...b.errors],[]);
});

test('a saved world reopens its card; corrupt data starts as usual; dismissing lets the new spot be saved',async()=>{
 const spot=JSON.stringify({v:1,t:Date.now(),level:'solar',view:'explore',Z:-12,dir:[0,0.85,0.53],world:'Jupiter',star:null,landmark:null});
 const a=await bootApp({fakeClock:true,stored:{...SEEN,[SPOT_KEY]:spot}});a.step(20);
 assert.match(a.$('resume-go').textContent,/Jupiter ›$/);a.click(a.$('resume-go'));settle(a);a.step(40);
 assert.equal(a.lab.state.value.world,'Jupiter');assert.equal(a.sheet,'peek');assert.equal(a.app.solarFocused?.()?.data.name,'Jupiter');
 for(const raw of ['{not json','{"v":1,"t":0}','null','{"v":1,"t":1e20,"level":"solar","view":"explore","Z":-12,"dir":[0,1,0]}']){
  const b=await bootApp({fakeClock:true,stored:{...SEEN,[SPOT_KEY]:raw}});b.step(20);
  assert.equal(b.$('resume').hidden,true,raw);assert.equal(b.lab.state.value.view,'explore');assert.deepEqual(b.errors,[]);}
 const c=await bootApp({fakeClock:true,stored:{...SEEN,[SPOT_KEY]:spot}});c.step(20);c.click(c.$('resume-x'));assert.equal(c.$('resume').hidden,true);
 c.step(40);assert.equal(JSON.parse(c.storage[SPOT_KEY]).world,null,'after ✕ the start is the spot');
 // Doing anything else (here: a ladder trip) also takes the offer away.
 const d=await bootApp({fakeClock:true,stored:{...SEEN,[SPOT_KEY]:spot}});d.step(20);assert.equal(d.$('resume').hidden,false);ladder(d,'stars');assert.equal(d.$('resume').hidden,true);
});

test('first visit: the tour hint wins over the Continue prompt; neither is saved over during the tour',async()=>{
 const spot=JSON.stringify({v:1,t:Date.now(),level:'stars',view:'stars',Z:-0.22,dir:[0,0.85,0.53],world:null,star:null,landmark:null});
 const a=await bootApp({fakeClock:true,stored:{[SPOT_KEY]:spot}});a.step(20);
 assert.equal(a.$('tour-hint').hidden,false,'tour hint');assert.equal(a.$('resume').hidden,true,'no Continue prompt beside it');
 // In the tour nothing is saved (it is not free exploring) and Back to Earth is hidden.
 const b=await bootApp({fakeClock:true,stored:SEEN});b.step(40);const kept=b.storage[SPOT_KEY];b.$('tour-start').onclick();
 const t=b.lab.tour;for(let i=0;i<3000&&t.active&&t.index<3;i++){b.step(1);assert.equal(b.$('home-earth').hidden,true,'hidden in the tour');}
 assert.ok(t.index>=3);assert.equal(b.storage[SPOT_KEY],kept,'nothing saved during the tour');
});

test('Back to Earth: hidden at home, shown away from Earth, one tap glides back and flies in to Earth',async()=>{
 const a=await bootApp({fakeClock:true,stored:SEEN});a.step(40);const btn=a.$('home-earth');
 assert.equal(btn.hidden,true,'at the start');assert.equal(btn.getAttribute('aria-label'),'Back to Earth');
 for(const l of ['stars','galaxy','universe']){
  ladder(a,l);assert.equal(a.lab.state.value.view,l);assert.equal(btn.hidden,false,`shown at ${l}`);
  a.lab.go({view:l,sheet:'half'});a.step(2);assert.equal(btn.hidden,true,'hidden while a card is open');a.click(a.$('close'));a.step(2);assert.equal(btn.hidden,false);
  a.click(btn);settle(a,1500);a.step(40);
  assert.equal(a.lab.state.value.view,'explore',`${l} → the Solar System`);assert.equal(a.app.solarFocused?.()?.data.name,'Earth','flies in to Earth');
  assert.equal(a.sheet,'closed');assert.equal(btn.hidden,true,'home again: hidden');
 }
 // Another world in close-up, card closed; and the Solar System zoomed far out.
 a.lab.go({view:'explore',world:'Jupiter',feature:'overview',sheet:'peek'});a.step(40);a.click(a.$('close'));
 a.app.focus(a.app.bodies.find(b=>b.data.name==='Jupiter'),{silent:true});a.step(40);assert.equal(btn.hidden,false,'Jupiter close up');
 a.click(btn);settle(a);a.step(40);assert.equal(a.app.solarFocused?.()?.data.name,'Earth');
 a.app.unfocus(true,.01);a.step(10);a.lab.zoom.set(a.lab.Zcam);a.lab.placeZ(a.lab.homeZ()+1.5);a.step(5);assert.equal(btn.hidden,false,'far out in the Solar System');
 a.click(btn);settle(a);a.step(40);assert.ok(a.lab.Zcam<a.lab.homeZ()+0.1);assert.equal(a.app.solarFocused?.()?.data.name,'Earth');
 // The button sits clear of the top bar and the ladder, and is in the label exclusions.
 // Its box on a 412 × 915 phone (style.css; linkedom has no layout): a 36 px chip at top 96 px, under the ladder
 // (56 + 32 px, tests/phone-layout.js), and at 156 px below the tour hint / Continue prompt (top 100 px, 44 px tall).
 const css=fs.readFileSync('style.css','utf8');
 assert.match(css,/\.home-earth\{position:fixed;z-index:12;top:calc\(var\(--safe-t\) \+ 96px\);right:/);assert.ok(96>=56+32+4);
 assert.match(css,/body\.hint-up \.home-earth\{top:calc\(var\(--safe-t\) \+ 156px\)\}/);assert.ok(156>=100+44+8);
 assert.match(css,/\.tour-hint\{position:fixed;z-index:11;left:50%;transform:translateX\(-50%\);top:calc\(var\(--safe-t\) \+ 100px\)/);
 assert.deepEqual(a.errors,[]);
});

test('the phone’s Back button closes the Sources screen, then the card, and leaves the history as it was',async()=>{
 const a=await bootApp({fakeClock:true,stored:SEEN});a.step(30);const h=a.history,n0=h.length;
 a.lab.go({view:'explore',world:'Mars',feature:'overview',sheet:'half'});a.step(5);assert.equal(h.length,n0+1,'a card adds one entry');
 a.lab.go({view:'explore',world:'Venus',feature:'overview'});a.step(5);assert.equal(h.length,n0+1,'card to card: no more entries');
 a.click(a.$('world-all-sources'));assert.equal(a.$('sources-page').hidden,false);assert.equal(h.length,n0+2);
 h.back();assert.equal(a.$('sources-page').hidden,true,'Back closes Sources');assert.notEqual(a.sheet,'closed','the card stays');
 h.back();assert.equal(a.sheet,'closed','Back again closes the card');assert.equal(h.length,n0);
 // Closing with ✕ removes the entry it added (no dead Back presses later).
 a.lab.go({view:'explore',world:'Mars',feature:'overview',sheet:'half'});a.step(2);a.click(a.$('open-sources'));assert.equal(h.length,n0+2);
 a.click(a.$('sources-close'));assert.equal(h.length,n0+1);a.click(a.$('close'));a.step(2);assert.equal(h.length,n0);assert.equal(a.sheet,'closed');
 assert.equal(a.lab.layers.length,0);assert.deepEqual(a.errors,[]);
});

test('Explore hands over to a journey card without losing its Back entry, even when the browser steps back later',async()=>{
 const a=await bootApp({fakeClock:true,stored:SEEN,asyncBack:true});a.step(30);const h=a.history,n0=h.length;
 a.$('journeys').onclick();a.step(1);assert.equal(h.state?.solarLayer,'explore');
 a.$('journey-list').querySelector('[data-journey="moon"]').onclick();a.step(3);
 assert.notEqual(a.sheet,'closed','the journey card is open');assert.equal(h.state?.solarLayer,'sheet','the card has its own entry after the step back landed');
 h.back();a.step(2);assert.equal(a.sheet,'closed','Back closes the card');assert.equal(h.length,n0,'history as it was');
 assert.equal(a.errors.length,0);
});
