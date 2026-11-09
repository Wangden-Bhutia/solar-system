// DOM emulator only: NOT a browser, rendering test or actual mobile playback test.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parseHTML} from 'linkedom';
import {SUN,PLANETS,MOON} from '../data.js';import * as science from '../science.js';import * as state from '../lab-state.js';import * as sheetMod from '../sheet.js';import * as insights from '../insights.js';import * as lines from '../voice/lines.js';
async function setup(width=390,height=844,stored={}){
 const {window,document}=parseHTML(fs.readFileSync('index.html','utf8'));
 const selections=new WeakMap();Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return selections.get(this)??this.querySelector('option')?.textContent??'';},set(v){selections.set(this,v);}});
 const sheetHeights={closed:0,peek:190,half:height*.52,full:height-80};
 const sheet=document.getElementById('sheet');sheet.getBoundingClientRect=()=>{const h=sheetHeights[sheet.dataset.state];return {left:0,top:height-h,width,height:h};};
 document.getElementById('stage').getBoundingClientRect=()=>({left:0,top:0,width,height});
 const hooks={homeScope:'inner'},focuses=[],updates=[],renders=[],played=[],storage={...stored};let unlocks=0,stops=0;
 const bodies=[SUN,...PLANETS,MOON].map(data=>({data}));const controls={};
 const app={hooks,bodies,controls,renderer:{},focus(b,opts={}){focuses.push([b.data.name,opts]);if(!opts.silent)hooks.onFocus?.(b);},unfocus(){focuses.push(['overview']);},setHomeScope(scope){hooks.homeScope=scope;focuses.push(['overview:'+scope]);}};
 const audio={createVoicePlayer:({onState})=>({unlock(){unlocks++;},stop(){stops++;onState('idle');},say(id){assert.ok(lines.LINES[id],id);played.push(id);onState('speaking');return Promise.resolve();}})};
 const mods={'./app.js':app,'./science.js':science,'./lab-state.js':state,'./sheet.js':sheetMod,'./insights.js':insights,'./voice/lines.js':lines,'./voice-player.js':audio,'./experiments.js':{createExperiments:()=>({update(s){updates.push(s);},render(w,h,v){renders.push([w,h,v]);}})}};
 const context=vm.createContext({document,window:{},console,innerWidth:width,innerHeight:height,addEventListener(){},setTimeout,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}});
 const entry=new vm.SourceTextModule(fs.readFileSync('lab.js','utf8'),{context});await entry.link(s=>{const obj=mods[s];assert.ok(obj,s);return new vm.SyntheticModule(Object.keys(obj),function(){for(const[k,v]of Object.entries(obj))this.setExport(k,v);},{context});});await entry.evaluate();
 const tap=name=>app.focus(bodies.find(b=>b.data.name===name));
 return {document,$:id=>document.getElementById(id),lab:context.window.__lab,focuses,updates,renders,played,app,storage,hooks,tap,get sheet(){return document.getElementById('sheet').dataset.state;},get unlocks(){return unlocks;},get stops(){return stops;}};
}
test('starts on the whole-system overview: sheet closed and inert, first-time hint shown, nothing autoplays',async()=>{
 const a=await setup();assert.equal(a.sheet,'closed');assert.equal(a.$('sheet').getAttribute('aria-hidden'),'true');assert.equal(a.$('sheet').inert,true);
 assert.equal(a.$('hint').hidden,false);assert.deepEqual([...a.focuses.map(f=>f[0])],['overview'],'opens on the whole-system overview, not a close-up of Earth');assert.equal(a.played.length,0);
 assert.equal(a.$('back').textContent,'All planets');
 assert.deepEqual({...a.hooks.visible(390,844)},{width:390,height:844});
});
test('tap-to-select glides to the world and slides up a peek card with name, striking fact and contextual action',async()=>{
 const a=await setup();a.tap('Moon');
 assert.equal(a.sheet,'peek');assert.equal(a.$('sheet').inert,false);assert.equal(a.$('title').textContent,'Moon');
 assert.equal(a.$('fact').textContent,insights.STRIKING.Moon);assert.equal(a.$('action').textContent,'Explore the phases');
 assert.equal(a.$('hint').hidden,true);
 assert.equal(a.focuses.at(-1)[0],'Moon');assert.equal(a.$('back').textContent,'← Back');
 assert.deepEqual(a.hooks.visible(390,844),{width:390,height:654});
 a.tap('Earth');assert.equal(a.$('action').textContent,'Why do seasons happen?');assert.match(a.$('fact').textContent,/23\.4°/);
 a.hooks.onEmpty();assert.equal(a.sheet,'closed');assert.equal(a.$('hint').hidden,true,'stays dismissed for this visit');
 const again=await setup(390,844,{'solar.hint.v1':'seen'});assert.equal(again.$('hint').hidden,false,'an old stored flag no longer hides it on a new visit');
});
test('grip buttons, keyboard and swipes expand to full details and collapse; empty tap closes',async()=>{
 const a=await setup();a.tap('Mars');
 a.$('grip').onclick();assert.equal(a.sheet,'half');assert.equal(a.$('grip').getAttribute('aria-expanded'),'true');
 a.$('grip').onclick();assert.equal(a.sheet,'full');assert.equal(a.$('grip').getAttribute('aria-label'),'Show less');
 assert.ok(a.$('world-sources').querySelector('a').getAttribute('href').startsWith('https://science.nasa.gov/'));
 assert.match(a.$('world-size').textContent,/Mars is 53% as wide as Earth/);
 a.$('grip').onclick();assert.equal(a.sheet,'half');
 const key=k=>{const e=new a.document.defaultView.Event('keydown',{bubbles:true});e.key=k;a.$('grip').dispatchEvent(e);};
 key('ArrowUp');assert.equal(a.sheet,'full');key('ArrowDown');assert.equal(a.sheet,'half');key('Escape');assert.equal(a.sheet,'peek');
 const drag=(dy)=>{const zone=a.$('grip-zone');const ev=(type,y)=>{const e=new a.document.defaultView.Event(type,{bubbles:true});e.clientY=y;e.pointerId=1;e.timeStamp=type==='pointerdown'?0:250;return e;};zone.dispatchEvent(ev('pointerdown',600));zone.dispatchEvent(ev('pointerup',600+dy));};
 drag(-80);assert.equal(a.sheet,'half');drag(80);assert.equal(a.sheet,'peek');drag(10);assert.equal(a.sheet,'peek');
 a.hooks.onEmpty();assert.equal(a.sheet,'closed');assert.equal(a.$('sheet').getAttribute('aria-hidden'),'true');
 a.hooks.onEmpty();assert.equal(a.sheet,'closed');
 a.tap('Saturn');a.$('close').onclick();assert.equal(a.sheet,'closed');
});
test('closing the sheet or Overview flies the camera back to the whole system; resizing the sheet does not re-aim',async()=>{
 const a=await setup();const last=()=>a.focuses.at(-1)[0];
 a.tap('Mars');assert.equal(last(),'Mars');const n=a.focuses.length;
 a.$('grip').onclick();a.$('grip').onclick();assert.equal(a.sheet,'full');assert.equal(a.focuses.length,n,'expanding keeps the glide');
 a.hooks.onEmpty();assert.equal(a.sheet,'closed');assert.equal(last(),'overview','empty tap returns to the overview camera');
 a.tap('Jupiter');a.$('close').onclick();assert.equal(last(),'overview','✕ returns to the overview camera');
 a.tap('Venus');a.$('back').onclick();assert.equal(a.sheet,'closed');assert.equal(last(),'overview','Back to the start state returns to the overview');
 a.tap('Saturn');a.$('reset').dispatchEvent(new a.document.defaultView.Event('click'));assert.equal(last(),'overview','menu overview');
 a.tap('Saturn');assert.equal(last(),'Saturn','re-selecting after the overview glides again');
});
test('Explore / Try it / Compare live inside the sheet; experiments stay half-open with the scene visible, and Reset/Back work',async()=>{
 const a=await setup();a.tap('Earth');
 assert.equal(a.document.querySelectorAll('#sheet .tabs [data-view]').length,3);assert.equal(a.document.querySelectorAll('body > nav [data-view]').length,0);
 a.$('action').onclick();assert.equal(a.lab.state.value.experiment,'seasons');assert.equal(a.sheet,'half');
 assert.equal(a.$('experiment-reset').hidden,false);assert.equal(a.$('orbit-map').hidden,false);
 a.app.hooks.renderOverride();assert.deepEqual(a.renders.at(-1),[390,844,{width:390,height:844-844*.52}]);
 a.$('experiment-angle').value=180;a.$('experiment-angle').oninput();assert.match(a.$('experiment-result').textContent,/December/);assert.equal(a.$('fact').textContent,'December solstice');
 a.$('no-tilt').checked=true;a.$('no-tilt').onchange();assert.match(a.$('experiment-result').textContent,/12 hours everywhere/);
 a.hooks.onEmpty();assert.equal(a.sheet,'half','stray taps do not dismiss a lab');
 a.$('grip').onclick();assert.equal(a.sheet,'full');a.$('grip').onclick();assert.equal(a.sheet,'half');
 a.$('experiment-reset').onclick();assert.equal(a.lab.state.value.tilt,23.44);assert.equal(a.lab.state.value.orbit,0);assert.equal(a.sheet,'half');
 a.$('back').onclick();assert.equal(a.lab.state.value.view,'explore');assert.equal(a.lab.state.value.world,'Earth');assert.equal(a.sheet,'peek');assert.equal(a.app.hooks.renderOverride,null);
 a.tap('Moon');a.$('action').onclick();a.$('experiment-angle').value=180;a.$('experiment-angle').oninput();assert.match(a.$('experiment-result').textContent,/Full Moon/);assert.match(a.$('experiment-result').textContent,/100%/);
 a.document.querySelector('[data-view="compare"]').onclick();assert.equal(a.$('compare-panel').hidden,false);assert.equal(a.sheet,'half');assert.equal(a.$('title').textContent,'Moon and Earth');
 assert.equal(a.lab.state.value.compareA,'Moon');assert.equal(a.lab.state.value.compareB,'Earth');assert.match(a.$('weight-result').textContent,/49 N.*295 N/);
 a.$('mass').value=60;a.$('mass').oninput();assert.match(a.$('weight-result').textContent,/97 N.*589 N/);
 a.$('back').onclick();assert.equal(a.lab.state.value.phase,180);assert.equal(a.lab.state.value.experiment,'phases');
 // Swiping a lab down from half returns to its world card rather than hiding controls over the scene.
 a.lab.setSheet(sheetMod.swipe(a.lab.state.value,'down'));assert.equal(a.lab.state.value.view,'explore');assert.equal(a.sheet,'peek');
});
test('Back with the card closed switches inner planets ↔ all planets; menu overview returns to the Solar System',async()=>{
 const a=await setup();a.tap('Jupiter');assert.equal(a.$('back').textContent,'← Back');a.hooks.onEmpty();assert.equal(a.$('back').textContent,'All planets');
 a.$('back').onclick();assert.deepEqual(a.focuses.at(-1),['overview:all']);assert.equal(a.sheet,'closed');assert.equal(a.$('back').textContent,'Inner planets');
 a.$('back').onclick();assert.deepEqual(a.focuses.at(-1),['overview:inner']);assert.equal(a.$('back').textContent,'All planets');
 a.tap('Venus');a.$('reset').dispatchEvent(new a.document.defaultView.Event('click'));assert.equal(a.sheet,'closed');assert.deepEqual(a.focuses.at(-1),['overview']);
});
test('every world has a working card, contextual action, facts and external source',async()=>{
 const a=await setup(412,915);
 for(const b of a.app.bodies){a.tap(b.data.name);assert.equal(a.$('title').textContent,b.data.name);assert.equal(a.$('fact').textContent,insights.STRIKING[b.data.name]);assert.ok(a.$('world-insight').textContent.length>20);assert.ok(a.$('world-sources').querySelector('a').getAttribute('href').startsWith('https://'));a.$('action').onclick();assert.ok(a.lab.state.value.experiment||a.lab.state.value.feature==='orbit');}
});
test('keyboard access: menu world picker opens a card; voice is opt-in per tap and remembered',async()=>{
 const a=await setup();assert.equal(a.$('world').querySelectorAll('option').length,10);
 a.$('world').value='Neptune';a.$('world').onchange();assert.equal(a.sheet,'peek');assert.equal(a.$('title').textContent,'Neptune');
 a.tap('Earth');assert.equal(a.played.length,0);a.$('listen').onclick();assert.equal(a.unlocks,1);assert.equal(a.played[0],'lab_earth');
 a.$('sound').checked=false;a.$('sound').onchange();const count=a.played.length;a.$('listen').onclick();assert.equal(a.played.length,count);assert.equal(JSON.parse(a.storage['solar.kids.v1']).muted,true);
 a.lab.go({view:'try',experiment:'phases'});assert.equal(a.played.length,count);assert.ok(a.stops>0);
});
test('landscape: sheet docks right, scene keeps the left region',async()=>{
 const a=await setup(844,390);a.$('sheet').getBoundingClientRect=()=>({left:444,top:0,width:400,height:390});
 a.tap('Saturn');assert.deepEqual(a.hooks.visible(844,390),{width:444,height:390});
 const css=fs.readFileSync('style.css','utf8');assert.match(css,/@media \(orientation:landscape\) and \(max-height:520px\)/);assert.match(css,/translateX\(calc\(100% \+ 20px\)\)/);
 for(const v of ['--safe-t','--safe-r','--safe-b','--safe-l'])assert.ok(css.includes(`var(${v})`),v);
 assert.match(css,/min-height:44px/);
});
