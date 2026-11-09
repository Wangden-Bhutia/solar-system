// DOM emulator only: NOT a browser, rendering test or actual mobile playback test.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parseHTML} from 'linkedom';
import {SUN,PLANETS,MOON,MOONS,DWARFS} from '../data.js';import * as science from '../science.js';import * as state from '../lab-state.js';import * as sheetMod from '../sheet.js';import * as insights from '../insights.js';import * as learn from '../learn.js';import * as starsData from '../stars-data.js';import * as galaxyData from '../galaxy-data.js';import * as lines from '../voice/lines.js';
const space={log:[],pickResult:null,selected:null};
async function setup(width=390,height=844,stored={}){
 space.log=[];space.pickResult=null;
 const {window,document}=parseHTML(fs.readFileSync('index.html','utf8'));
 const selections=new WeakMap();Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return selections.get(this)??this.querySelector('option')?.textContent??'';},set(v){selections.set(this,v);}});
 const sheetHeights={closed:0,peek:190,half:height*.52,full:height-80};
 const sheet=document.getElementById('sheet');sheet.getBoundingClientRect=()=>{const h=sheetHeights[sheet.dataset.state];return {left:0,top:height-h,width,height:h};};
 document.getElementById('stage').getBoundingClientRect=()=>({left:0,top:0,width,height});
 const hooks={homeScope:'inner'},focuses=[],updates=[],renders=[],played=[],storage={...stored};let unlocks=0,stops=0;
 const bodies=[SUN,...PLANETS,MOON,...DWARFS,...MOONS].map(data=>({data}));const controls={};
 const app={hooks,bodies,controls,renderer:{},focus(b,opts={}){focuses.push([b.data.name,opts]);if(!opts.silent)hooks.onFocus?.(b);},unfocus(){focuses.push(['overview']);},setHomeScope(scope){hooks.homeScope=scope;focuses.push(['overview:'+scope]);}};
 const audio={createVoicePlayer:({onState})=>({unlock(){unlocks++;},stop(){stops++;onState('idle');},say(id){assert.ok(lines.LINES[id],id);played.push(id);onState('speaking');return Promise.resolve();}})};
 const mods={'./app.js':app,'./science.js':science,'./lab-state.js':state,'./sheet.js':sheetMod,'./insights.js':insights,'./voice/lines.js':lines,'./voice-player.js':audio,'./learn.js':learn,'./stars-data.js':starsData,'./galaxy-data.js':galaxyData,'./galaxy.js':{createGalaxy:()=>({landmarks:galaxyData.LANDMARKS,enter(){space.log.push('galaxy:enter');},leave(){space.log.push('galaxy:leave');},render(){},pick:()=>space.galaxyPick,select(m){space.galaxySel=m;},zoomToSun(done){space.log.push('galaxy:zoomToSun');done();}})},'./stars.js':{createStars:()=>{const entries=[starsData.SUN_ENTRY,...starsData.NEIGHBOURS];let mode='stars';const log=space.log;
  return {entries,get mode(){return mode;},enter(){log.push('enter');},leave(){log.push('leave');},render(){log.push('render');},pick:()=>space.pickResult,select(e){space.selected=e;},
   zoomBackIn(done){log.push('zoomIn');done();},zoomOut(done){log.push('starsOut');done();},openSystem(e){e.sysView=starsData.systemSummary(e);mode='system';log.push('open:'+e.name);return e.sysView;},closeSystem(){mode='stars';log.push('close');}};}},'./experiments.js':{createExperiments:()=>({update(s){updates.push(s);},render(w,h,v){renders.push([w,h,v]);}})}};
 const context=vm.createContext({document,window:{},console,innerWidth:width,innerHeight:height,addEventListener(){},setTimeout,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}});
 const entry=new vm.SourceTextModule(fs.readFileSync('lab.js','utf8'),{context});await entry.link(s=>{const obj=mods[s];assert.ok(obj,s);return new vm.SyntheticModule(Object.keys(obj),function(){for(const[k,v]of Object.entries(obj))this.setExport(k,v);},{context});});await entry.evaluate();
 const tap=name=>app.focus(bodies.find(b=>b.data.name===name));
 return {document,$:id=>document.getElementById(id),lab:context.window.__lab,focuses,updates,renders,played,app,storage,hooks,tap,get sheet(){return document.getElementById('sheet').dataset.state;},get unlocks(){return unlocks;},get stops(){return stops;}};
}
test('starts on the whole-system overview: sheet closed and inert, first-time hint shown, nothing autoplays',async()=>{
 const a=await setup();assert.equal(a.sheet,'closed');assert.equal(a.$('sheet').getAttribute('aria-hidden'),'true');assert.equal(a.$('sheet').inert,true);
 assert.equal(a.$('hint').hidden,false);assert.deepEqual([...a.focuses.map(f=>f[0])],['overview'],'opens on the whole-system overview, not a close-up of Earth');assert.equal(a.played.length,0);
 assert.equal(a.$('back').textContent,'Show all planets');
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
 a.tap('Saturn');a.$('close').onclick();assert.equal(last(),'overview','closing the card returns to the overview');
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
 const a=await setup();a.tap('Jupiter');assert.equal(a.$('back').textContent,'← Back');a.hooks.onEmpty();assert.equal(a.$('back').textContent,'Show all planets');
 a.$('back').onclick();assert.deepEqual(a.focuses.at(-1),['overview:all']);assert.equal(a.sheet,'closed');assert.equal(a.$('back').textContent,'Show inner planets');
 a.$('back').onclick();assert.deepEqual(a.focuses.at(-1),['overview:inner']);assert.equal(a.$('back').textContent,'Show all planets');
 a.tap('Venus');a.$('back').onclick();assert.equal(a.sheet,'closed');assert.deepEqual(a.focuses.at(-1),['overview']);
 // The menu keeps only real options: no duplicate overview button, no trails switch, no world picker.
 const menu=a.document.querySelector('#settings .menu');for(const id of ['reset','trails','world'])assert.equal(menu.querySelector('#'+id),null,id);
 assert.ok(a.document.querySelector('#world-nav #world'),'world picker lives in the keyboard skip-nav');
 assert.equal(menu.querySelectorAll('.mrow').length,4);
});
test('every world has a working card, contextual action, facts and external source',async()=>{
 const a=await setup(412,915);
 for(const b of a.app.bodies){a.tap(b.data.name);assert.equal(a.$('title').textContent,b.data.name);assert.equal(a.$('fact').textContent,insights.STRIKING[b.data.name]||b.data.fact);assert.ok(a.$('world-insight').textContent.length>20);assert.ok(a.$('world-sources').querySelector('a').getAttribute('href').startsWith('https://'));a.$('action').onclick();const v=a.lab.state.value;assert.ok(v.experiment||v.feature==='orbit'||(v.feature==='moons'&&(b.data.parent?v.world===b.data.parent:v.world===b.data.name)),b.data.name);}
});
test('keyboard access: menu world picker opens a card; voice is opt-in per tap and remembered',async()=>{
 const a=await setup();assert.equal(a.$('world').querySelectorAll('option').length,10+DWARFS.length+MOONS.length);
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
test('predict, then reveal: a lab hides its result until the learner guesses or skips; Back keeps the guess',async()=>{
 const a=await setup();a.lab.go({view:'try',experiment:'seasons'});
 assert.equal(a.$('predict').hidden,false);assert.match(a.$('predict').textContent,/Guess first/);
 assert.equal(a.$('experiment-result').hidden,true,'result waits for a guess');
 assert.ok(a.$('presets').querySelectorAll('button').length>=4,'controls still usable before guessing');
 const wrong=[...a.$('predict').querySelectorAll('[data-choice]')].find(b=>b.dataset.choice==='0');wrong.onclick();
 assert.equal(a.$('experiment-result').hidden,false);assert.match(a.$('predict').textContent,/Not quite/);assert.match(a.$('predict').textContent,/About 12 hours every day/);
 a.$('back').onclick();a.lab.go({view:'try',experiment:'seasons'});
 assert.equal(a.$('experiment-result').hidden,false,'the guess survives Back');
 [...a.$('predict').querySelectorAll('[data-choice]')].find(b=>b.dataset.choice==='again').onclick();
 assert.equal(a.$('experiment-result').hidden,true,'Ask me again hides the answer');
 [...a.$('predict').querySelectorAll('[data-choice]')].find(b=>b.dataset.choice==='skip').onclick();
 assert.match(a.$('predict').textContent,/Answer:/);assert.equal(a.$('experiment-result').hidden,false);
});
test('eclipse lab: default new Moon misses; lining up the crossing point gives an eclipse; full Moon turns coppery',async()=>{
 const a=await setup();a.lab.go({view:'try',experiment:'eclipses',phase:0});
 assert.equal(a.$('eclipse-controls').hidden,false);assert.equal(a.$('season-controls').hidden,true);assert.equal(a.$('listen').hidden,true,'no voice clip for this lab');
 [...a.$('predict').querySelectorAll('[data-choice]')].find(b=>b.dataset.choice==='1').onclick();
 assert.match(a.$('predict').textContent,/You got it/);
 assert.match(a.$('experiment-result').textContent,/No eclipse: the Moon passes 2\.6° below the Sun/);
 assert.match(a.$('orbit-map').innerHTML,/No eclipse here/);
 a.$('node-line-up').onclick();assert.match(a.$('experiment-result').textContent,/Solar eclipse/);assert.equal(a.updates.at(-1).eclipse,'solar-central');
 [...a.$('presets').querySelectorAll('button')].find(b=>b.textContent==='Full').onclick();a.$('node-line-up').onclick();
 assert.match(a.$('experiment-result').textContent,/Total lunar eclipse/);assert.equal(a.updates.at(-1).eclipse,'lunar-total');
 [...a.$('presets').querySelectorAll('button')].find(b=>b.textContent==='First quarter').onclick();
 assert.match(a.$('experiment-result').textContent,/only happen at new Moon or full Moon/);
});
test('tide lab: spring tides at new Moon, neap at quarter; the 3D ocean gets the tidal range',async()=>{
 const a=await setup();a.lab.go({view:'try',experiment:'tides',phase:0});
 [...a.$('predict').querySelectorAll('[data-choice]')].find(b=>b.dataset.choice==='skip').onclick();
 assert.equal(a.$('fact').textContent,'Spring tides · New Moon');assert.ok(a.updates.at(-1).tideRange>1.45);
 [...a.$('presets').querySelectorAll('button')].find(b=>b.textContent==='First quarter').onclick();
 assert.match(a.$('fact').textContent,/^Neap tides/);assert.ok(a.updates.at(-1).tideRange<.55);
 assert.match(a.$('experiment-depth').innerHTML,/oceanservice\.noaa\.gov/);
});
test('scale lab: keeps the live Solar System, walks the planets out to scale and races light',async()=>{
 const a=await setup();a.lab.go({view:'try',experiment:'scale'});
 assert.equal(a.$('scale-lab').hidden,false);assert.equal(a.$('experiment').hidden,true);assert.equal(a.$('orbit-map').hidden,true);
 assert.equal(a.lab.state.value.sheet,'half');assert.equal(a.$('scale-reveal').hidden,true,'walk waits for a guess');
 [...a.$('scale-predict').querySelectorAll('[data-choice]')].find(b=>b.dataset.choice==='1').onclick();
 assert.equal(a.$('scale-reveal').hidden,false);assert.match(a.$('scale-result').textContent,/peppercorn/);assert.match(a.$('scale-result').textContent,/24 m away/);
 assert.equal(a.$('scale-list').querySelectorAll('li').length,8);
 [...a.$('sun-presets').querySelectorAll('button')].find(b=>b.textContent==='Gym ball').onclick();assert.match(a.$('fact').textContent,/Sun 65 cm → Earth 70 m away/);
 a.$('light-go').onclick();assert.match(a.$('light-clock').textContent,/4 h 11 min · just passed Neptune/);
});
test('journeys: list → steps that move the camera; a question gates Next; labs open from a step and Back returns',async()=>{
 const a=await setup();a.$('journeys').onclick();
 assert.equal(a.$('journey-panel').hidden,false);assert.equal(a.document.querySelector('#sheet .tabs').hidden,true);
 assert.equal(a.$('journey-list').querySelectorAll('button').length,4);
 a.$('journey-list').querySelector('[data-journey="scale"]').onclick();
 assert.equal(a.$('title').textContent,'Our star');assert.equal(a.focuses.at(-1)[0],'Sun','glides to the Sun');assert.equal(a.$('journey-prev').disabled,true);
 a.$('journey-next').onclick();assert.equal(a.$('title').textContent,'Sunlight’s trip to Earth');assert.equal(a.focuses.at(-1)[0],'Earth');
 assert.equal(a.$('journey-next').disabled,true,'answer first');a.$('journey-next').onclick();assert.equal(a.lab.state.value.step,1);
 [...a.$('journey-predict').querySelectorAll('[data-choice]')].find(b=>b.dataset.choice==='0').onclick();
 assert.match(a.$('journey-predict').textContent,/8 min 19 s/);assert.equal(a.$('journey-next').disabled,false);
 a.$('journey-next').onclick();assert.equal(a.focuses.at(-1)[0],'Neptune');
 [...a.$('journey-predict').querySelectorAll('[data-choice]')].find(b=>b.dataset.choice==='1').onclick();a.$('journey-next').onclick();
 assert.equal(a.$('journey-lab').parentElement.hidden,false);assert.match(a.$('journey-lab').textContent,/How big is space/);assert.equal(a.$('journey-next').textContent,'Finish ✓');
 a.$('journey-lab').onclick();assert.equal(a.$('scale-lab').hidden,false);
 a.$('back').onclick();assert.equal(a.lab.state.value.view,'journey');assert.equal(a.$('title').textContent,'Shrink it all down');
 a.$('journey-next').onclick();assert.equal(a.$('title').textContent,'Choose a journey','Finish returns to the list');
 a.$('journey-list').querySelector('[data-journey="mars"]').onclick();a.$('journey-next').onclick();a.$('journey-next').onclick();
 assert.equal(a.$('title').textContent,'A Martian day','could not skip the unanswered question');
});
test('explore cards add sunlight travel time for planets',async()=>{
 const a=await setup();a.tap('Mars');assert.match(a.$('world-size').textContent,/Sunlight takes 12 min 40 s to get here/);
 a.tap('Moon');assert.doesNotMatch(a.$('world-size').textContent,/Sunlight/);
});
test('moons: planet cards list their big moons and count; a moon card has its own fact, sources and a way back',async()=>{
 const a=await setup();a.tap('Jupiter');
 assert.match(a.$('world-size').textContent,/Jupiter has more than 100 known moons\./);
 const chip=[...a.$('features').querySelectorAll('button')].find(b=>b.dataset.feature==='moons');assert.ok(chip,'Its moons chip');chip.onclick();
 assert.equal(a.$('world-moons').hidden,false);assert.deepEqual([...a.$('moon-list').querySelectorAll('button')].map(b=>b.dataset.moon),['Io','Europa','Ganymede','Callisto']);
 const f=a.focuses.at(-1);assert.equal(f[0],'Jupiter');assert.ok(Math.abs(f[1].mul-15.40*1.15/(Math.tan(25*Math.PI/180)*390/844)/5.6)<.05,'portrait: backs off far enough for Callisto’s orbit to fit across the narrow screen');
 a.$('moon-list').querySelector('[data-moon="Europa"]').onclick();
 assert.equal(a.$('title').textContent,'Europa');assert.equal(a.$('kicker').textContent,'Moon of Jupiter');assert.match(a.$('fact').textContent,/ocean/);
 assert.match(a.$('world-sources').innerHTML,/joviansatfact/);assert.match(a.$('world-sources').innerHTML,/ssd\.jpl\.nasa\.gov/);
 assert.match(a.$('world-facts').textContent,/3,122 km/);assert.match(a.$('world-facts').textContent,/3\.55 days/);
 assert.equal(a.$('world-moons').hidden,true);
 a.$('action').onclick();assert.equal(a.$('title').textContent,'Jupiter');assert.equal(a.$('world-moons').hidden,false,'action returns to the moon system');
 a.$('moon-list').querySelector('[data-moon="Io"]').onclick();[...a.$('features').querySelectorAll('button')].find(b=>b.dataset.feature==='parent').onclick();assert.equal(a.$('title').textContent,'Jupiter');
 a.tap('Triton');assert.match(a.$('world-deeper').textContent,/opposite way/);a.tap('Phobos');assert.match(a.$('world-facts').textContent,/7\.7 hours/);
 a.tap('Mercury');assert.match(a.$('world-size').textContent,/Mercury has no moons/);assert.equal([...a.$('features').querySelectorAll('button')].some(b=>b.dataset.feature==='moons'),false);
 a.tap('Mars');assert.equal(a.$('action').textContent,'Meet Mars’s moons');a.$('action').onclick();assert.equal(a.sheet,'half','opens the list');assert.match(a.$('moon-count').textContent,/two small moons\. Both are drawn here/);
 a.tap('Earth');assert.equal(a.$('action').textContent,'Why do seasons happen?','Earth keeps its lab');
});
test('dwarf planets and asteroids: own cards, kind, facts, sources, light time; Pluto shows Charon',async()=>{
 const a=await setup();
 a.tap('Pluto');assert.equal(a.$('kicker').textContent,'Dwarf planet');assert.match(a.$('fact').textContent,/heart/);
 assert.match(a.$('world-size').textContent,/Sunlight takes 5 h 28 min to get here\. Pluto has five known moons\./);
 assert.match(a.$('world-deeper').textContent,/inside Neptune’s orbit/);assert.match(a.$('world-sources').innerHTML,/plutofact/);assert.match(a.$('world-sources').innerHTML,/sbdb_lookup/);
 assert.equal(a.$('action').textContent,'Meet Pluto’s moons');a.$('action').onclick();assert.match(a.$('moon-count').textContent,/The biggest, Charon, is drawn here/);
 a.tap('Vesta');assert.equal(a.$('kicker').textContent,'Asteroid');assert.match(a.$('world-deeper').textContent,/weigh less than our Moon/);
 a.tap('Eris');assert.match(a.$('world-facts').textContent,/43\.9°/);assert.equal(a.$('action').textContent,'See its orbit');a.$('action').onclick();assert.equal(a.lab.state.value.feature,'orbit');
 a.tap('Haumea');assert.match(a.$('world-facts').textContent,/about 1,740 km \(long axis\)/);assert.match(a.$('world-sources').innerHTML,/science\.nasa\.gov\/dwarf-planets\/haumea/);
});
test('photographic maps are credited (CC BY 4.0); Venus explains its cloud look; worlds are approached from the sunlit side',async()=>{
 const a=await setup();a.tap('Mars');assert.match(a.$('world-sources').innerHTML,/solarsystemscope\.com\/textures/);assert.match(a.$('world-sources').innerHTML,/licenses\/by\/4\.0/);
 assert.equal(a.focuses.at(-1)[1].outside,true,'camera on the day side');
 a.tap('Venus');assert.match(a.$('world-sources').textContent,/cloud tops/);a.tap('Pluto');assert.doesNotMatch(a.$('world-sources').innerHTML,/solarsystemscope/);
 a.tap('Sun');assert.equal(a.focuses.at(-1)[1].outside,false);
});
test('zoom out to the nearby stars: star map, star cards, planets, habitable zone, and back to the Solar System',async()=>{
 const a=await setup();
 assert.equal(a.$('zoom').getAttribute('aria-label'),'Zoom out to the nearby stars');
 a.$('zoom').onclick();assert.equal(a.lab.state.value.view,'stars');assert.ok(space.log.includes('enter'));
 assert.equal(a.document.body.classList.contains('space-mode'),true);assert.equal(a.$('zoom').getAttribute('aria-label'),'Zoom out to the Milky Way');
 assert.equal(a.sheet,'closed');assert.equal(a.$('hint').hidden,false);assert.equal(a.$('hint').textContent,'Tap a star');assert.equal(a.$('back').textContent,'← Solar System');
 assert.equal(typeof a.hooks.renderOverride,'function');assert.equal(a.app.controls.enabled,false,'Solar System controls off');
 // Tap a star on the map
 space.pickResult=starsData.NEIGHBOURS.find(e=>e.name==='Sirius');a.hooks.overrideTap(100,100);
 assert.equal(a.sheet,'peek');assert.equal(a.$('title').textContent,'Sirius');assert.match(a.$('kicker').textContent,/White star · A1V/);
 assert.match(a.$('fact').textContent,/brightest star in our night sky/);assert.match(a.$('star-facts').textContent,/8\.71 light-years/);assert.match(a.$('star-facts').textContent,/visible to the naked eye/);
 assert.match(a.$('star-companions').textContent,/double system: Sirius A \(star\), Sirius B \(white dwarf\)/);assert.equal(a.$('action').hidden,true,'no planets: no visit button');
 // A system with planets
 space.pickResult=starsData.NEIGHBOURS.find(e=>e.name==='Alpha Centauri');a.hooks.overrideTap(10,10);
 assert.match(a.$('star-planets').textContent,/2 known planets\. At least one orbits in the habitable zone/);assert.equal(a.$('action').textContent,'Visit its planets');
 assert.match(a.$('star-companions').textContent,/triple system/);
 a.$('action').onclick();assert.equal(a.lab.state.value.view,'system');assert.equal(a.sheet,'half');assert.ok(space.log.includes('open:Alpha Centauri'));
 assert.equal(a.$('kicker').textContent,'Planets of Proxima Centauri');assert.match(a.$('fact').textContent,/closer to their star than Mercury/);
 assert.match(a.$('system-list').textContent,/Proxima b.*in the habitable zone/);assert.match(a.$('system-list').textContent,/estimated/);assert.match(a.$('system-depth').textContent,/minimum masses/);
 // Back returns to the star card, then to the map, then home
 a.$('back').onclick();assert.equal(a.lab.state.value.view,'stars');assert.equal(a.$('title').textContent,'Alpha Centauri');
 space.pickResult=null;a.hooks.overrideTap(5,5);assert.equal(a.sheet,'closed','empty tap closes the star card');
 a.$('back').onclick();assert.equal(a.lab.state.value.view,'explore');assert.ok(space.log.includes('zoomIn')&&space.log.includes('leave'));
 assert.equal(a.document.body.classList.contains('space-mode'),false);assert.equal(a.hooks.renderOverride,null);assert.equal(a.app.controls.enabled,true);
 // TRAPPIST-1: measured sizes, three in the habitable zone
 a.$('zoom').onclick();space.pickResult=starsData.NEIGHBOURS.find(e=>e.name==='TRAPPIST-1');a.hooks.overrideTap(1,1);a.$('action').onclick();
 const hz=[...a.$('system-list').querySelectorAll('li')].filter(li=>/habitable zone/.test(li.textContent)).map(li=>li.querySelector('b').textContent);
 assert.deepEqual(hz,['TRAPPIST-1 e','TRAPPIST-1 f','TRAPPIST-1 g']);assert.match(a.$('system-list').textContent,/0\.92 × Earth’s width/);assert.match(a.$('system-depth').textContent,/sizes are measured/);
 a.$('zoom').onclick();assert.equal(a.lab.state.value.view,'galaxy','the zoom chip steps out to the Milky Way, even from a planetary system');
});
test('the zoom ladder reaches the Milky Way: landmarks, Sun card with galaxy facts, honest model note, and Back steps in',async()=>{
 const a=await setup();a.$('zoom').onclick();assert.equal(a.lab.state.value.view,'stars');
 assert.equal(a.$('zoom').getAttribute('aria-label'),'Zoom out to the Milky Way');
 a.$('zoom').onclick();assert.equal(a.lab.state.value.view,'galaxy');assert.ok(space.log.includes('starsOut')&&space.log.includes('galaxy:enter')&&space.log.includes('leave'));
 assert.equal(a.$('zoom').hidden,true,'outermost level for now');assert.equal(a.$('back').textContent,'← Nearby stars');assert.equal(a.$('hint').textContent,'Tap a landmark');
 assert.equal(a.sheet,'closed');assert.equal(typeof a.hooks.renderOverride,'function');
 space.galaxyPick=galaxyData.LANDMARKS.find(m=>m.name==='Crab Nebula');a.hooks.overrideTap(5,5);
 assert.equal(a.sheet,'peek');assert.equal(a.$('kicker').textContent,'Supernova remnant');assert.match(a.$('fact').textContent,/1054/);
 assert.match(a.$('view-caption').textContent,/6,500 light-years from the Sun · toward Taurus/);assert.match(a.$('star-depth').textContent,/No one has seen the Milky Way from outside/);
 space.galaxyPick=galaxyData.LANDMARKS.find(m=>m.name==='Sagittarius A*');a.hooks.overrideTap(5,5);assert.match(a.$('star-facts').textContent,/4\.3 million Suns/);assert.match(a.$('star-facts').textContent,/2022/);
 space.galaxyPick=galaxyData.LANDMARKS[0];a.hooks.overrideTap(5,5);assert.equal(a.$('title').textContent,'The Sun in the Milky Way');assert.match(a.$('star-facts').textContent,/100–400 billion/);assert.match(a.$('star-facts').textContent,/230 million/);
 space.galaxyPick=null;a.hooks.overrideTap(5,5);assert.equal(a.sheet,'closed');
 a.$('back').onclick();assert.equal(a.lab.state.value.view,'stars','Back steps in one level');assert.ok(space.log.includes('galaxy:zoomToSun')&&space.log.includes('galaxy:leave'));
 assert.equal(a.$('zoom').hidden,false);a.$('back').onclick();assert.equal(a.lab.state.value.view,'explore');assert.equal(a.document.body.classList.contains('space-mode'),false);
});
