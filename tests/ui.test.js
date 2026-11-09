// DOM emulator only: NOT a browser, rendering test or actual mobile playback test.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {parseHTML} from 'linkedom';
import {SUN,PLANETS,MOON} from '../data.js';import * as science from '../science.js';import * as state from '../lab-state.js';import * as insights from '../insights.js';import * as lines from '../voice/lines.js';
async function setup(width=320,height=740){
 const {window,document}=parseHTML(fs.readFileSync('index.html','utf8'));
 const selections=new WeakMap();Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return selections.get(this)??this.querySelector('option')?.textContent??'';},set(v){selections.set(this,v);}});
 const stage=document.getElementById('stage');Object.defineProperties(stage,{clientWidth:{get:()=>width-24},clientHeight:{get:()=>height*.42}});stage.getBoundingClientRect=()=>({width:width-24,height:height*.42,top:120,left:12});
 const hooks={},focuses=[],updates=[],played=[],storage={};let unlocks=0,stops=0;
 const bodies=[SUN,...PLANETS,MOON].map(data=>({data}));const controls={};
 const app={hooks,bodies,controls,renderer:{},focus(b,opts={}){focuses.push([b.data.name,opts]);if(!opts.silent)hooks.onFocus?.(b);},unfocus(){focuses.push(['overview']);}};
 const audio={createVoicePlayer:({onState})=>({unlock(){unlocks++;},stop(){stops++;onState('idle');},say(id){assert.ok(lines.LINES[id],id);played.push(id);onState('speaking');return Promise.resolve();}})};
 const mods={'./app.js':app,'./science.js':science,'./lab-state.js':state,'./insights.js':insights,'./voice/lines.js':lines,'./voice-player.js':audio,'./experiments.js':{createExperiments:()=>({update(s){updates.push(s);},render(){}})}};
 const context=vm.createContext({document,window:{},console,innerWidth:width,innerHeight:height,addEventListener(){},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v}});
 const entry=new vm.SourceTextModule(fs.readFileSync('lab.js','utf8'),{context});await entry.link(s=>{const obj=mods[s];assert.ok(obj,s);return new vm.SyntheticModule(Object.keys(obj),function(){for(const[k,v]of Object.entries(obj))this.setExport(k,v);},{context});});await entry.evaluate();
 return {document,$:id=>document.getElementById(id),lab:context.window.__lab,focuses,updates,played,app,storage,get unlocks(){return unlocks;},get stops(){return stops;}};
}
test('default is Earth, all ten worlds selectable; meaningful Explore / Try / Compare actions, Back and Reset',async()=>{
 const a=await setup();assert.equal(a.$('world').querySelectorAll('option').length,10);assert.equal(a.$('world-title').textContent,'Earth');assert.equal(a.played.length,0);
 a.$('context-action').onclick();assert.equal(a.lab.state.value.experiment,'seasons');assert.equal(typeof a.app.hooks.renderOverride,'function');
 a.$('experiment-angle').value=180;a.$('experiment-angle').oninput();assert.match(a.$('experiment-result').textContent,/December/);
 a.$('no-tilt').checked=true;a.$('no-tilt').onchange();assert.match(a.$('experiment-result').textContent,/12 hours everywhere/);
 a.$('experiment-reset').onclick();assert.equal(a.lab.state.value.tilt,23.44);assert.equal(a.lab.state.value.orbit,0);
 a.$('back').onclick();assert.equal(a.lab.state.value.view,'explore');assert.equal(a.app.hooks.renderOverride,null);
 a.$('world').value='Moon';a.$('world').onchange();a.$('context-action').onclick();assert.equal(a.lab.state.value.experiment,'phases');
 a.$('experiment-angle').value=180;a.$('experiment-angle').oninput();assert.match(a.$('experiment-result').textContent,/Full Moon/);assert.match(a.$('experiment-result').textContent,/100%/);
 a.document.querySelector('[data-view="compare"]').onclick();assert.equal(a.$('compare-panel').hidden,false);assert.match(a.$('weight-result').textContent,/295 N.*49 N/);
 a.$('mass').value=60;a.$('mass').oninput();assert.match(a.$('weight-result').textContent,/589 N.*97 N/);
 a.$('back').onclick();assert.equal(a.lab.state.value.phase,180);assert.equal(a.lab.state.value.experiment,'phases');
});
test('every world has a working contextual action, facts and external source',async()=>{
 const a=await setup(412,915);
 for(const b of a.app.bodies){a.lab.go({view:'explore',world:b.data.name,feature:'overview',experiment:null});assert.equal(a.$('world-title').textContent,b.data.name);assert.ok(a.$('world-insight').textContent.length>20);assert.ok(a.$('world-sources').querySelector('a').getAttribute('href').startsWith('https://'));a.$('context-action').onclick();assert.ok(a.lab.state.value.experiment||a.lab.state.value.feature==='orbit');}
});
test('voice is opt-in per tap, preserves sound preference, and never autoplays on navigation',async()=>{
 const a=await setup();assert.equal(a.played.length,0);a.$('listen').onclick();assert.equal(a.unlocks,1);assert.equal(a.played[0],'lab_earth');
 a.$('sound').checked=false;a.$('sound').onchange();const count=a.played.length;a.$('listen').onclick();assert.equal(a.played.length,count);assert.equal(JSON.parse(a.storage['solar.kids.v1']).muted,true);
 a.lab.go({view:'try',experiment:'phases'});assert.equal(a.played.length,count);assert.ok(a.stops>0);
});
test('DOM contract at narrow widths: back, one controls menu and three primary choices; sliders/reset real',async()=>{
 for(const width of [320,360,412]){
 const a=await setup(width);assert.equal(a.document.querySelectorAll('.primary button').length,3);assert.equal(a.document.querySelectorAll('#settings').length,1);
 for(const mode of ['seasons','phases']){a.lab.go({view:'try',experiment:mode});for(const id of ['experiment-angle','experiment-reset'])assert.equal(typeof a.$(id)[id==='experiment-angle'?'oninput':'onclick'],'function');}
 const css=fs.readFileSync('style.css','utf8');assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/height:42svh/);assert.match(css,/touch-action:pan-y/);assert.match(css,/minmax\(0,1fr\)/);
 }
});
