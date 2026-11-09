// DOM and rendering hooks are fakes, not a browser: exercises event/state wiring only.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import { LINES,VOICE } from '../voice/lines.js';
async function app(width=320) {
  const els={};const classes=new Set();const handlers={};let resolveSpeech;const spoken=[];const focuses=[];
  const html=fs.readFileSync('index.html','utf8');
  for(const [,id] of html.matchAll(/id="([^"]+)"/g)) els[id]={hidden:true,disabled:false,style:{},setAttribute(){},addEventListener(){},classList:{add(){},remove(){}}};
  const document={getElementById:id=>{assert.ok(els[id],id);return els[id];},body:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(){}}},addEventListener:(e,f)=>handlers[e]=f};
  const hooks={};const bodies=['Sun','Earth','Moon','Mars','Saturn','Venus'].map(name=>({data:{name,color:0xffffff}}));
  const focus=(b,opts={})=>{if(!opts.silent&&hooks.intercept?.(b))return;focuses.push([b.data.name,opts]);if(!opts.silent)hooks.onFocus?.(b);};
  const player={unlock(){},stop(){resolveSpeech?.();},say(ids){for(const id of ids)assert.ok(LINES[id],id);spoken.push(ids);return new Promise(r=>{resolveSpeech=r;});}};
  const context=vm.createContext({document,window:{},innerWidth:width,innerHeight:740,localStorage:{getItem(){return null;},setItem(){}},addEventListener:(e,f)=>handlers[e]=f,setTimeout,clearTimeout,console});
  const sources={
    './app.js':`export const hooks=globalThis.H;export const bodies=globalThis.B;export const focus=globalThis.F;export const unfocus=()=>{};export const setKid=on=>{hooks.kid=on;};`,
    './voice/lines.js':`export const LINES=${JSON.stringify(LINES)};export const VOICE=${JSON.stringify(VOICE)};`,
    './voice-player.js':`export const createVoicePlayer=()=>globalThis.P;`,
    './adventure.js':fs.readFileSync('adventure.js','utf8')
  };
  Object.assign(context,{H:hooks,B:bodies,F:focus,P:player});
  const entry=new vm.SourceTextModule(fs.readFileSync('kids.js','utf8'),{context});
  await entry.link(s=>new vm.SourceTextModule(sources[s],{context}));await entry.evaluate();
  const settle=async()=>{resolveSpeech?.();await new Promise(r=>setImmediate(r));};
  return {els,hooks,bodies,focus,focuses,spoken,settle,kids:context.window.__kids,handlers,classes};
}
test('Start → Earth → Moon → neighbours → finish; no wrong-answer punishment; replay resets',async()=>{
  const a=await app();const {els,kids,focus,bodies,settle,focuses}=a;
  assert.equal(kids.trip.current,null);assert.equal(focuses[0][1].mul,7);
  els.introStart.onclick({stopPropagation(){}});assert.equal(kids.trip.current.target,'Earth');
  focus(bodies.find(b=>b.data.name==='Venus'));assert.equal(kids.trip.found,false);assert.equal(els['b-text'].textContent,LINES.trip_retry+' '+LINES.trip_earth);
  for(const name of ['Earth','Moon','Mars','Saturn']) {
    assert.equal(kids.trip.current.target,name);
    els['mission-action'].onclick();assert.equal(kids.trip.found,true);assert.equal(els['mission-action'].disabled,true);
    await settle();assert.equal(els['mission-action'].disabled,false);
    assert.equal(els['b-text'].textContent,LINES[kids.trip.current.fact]);
    els['mission-action'].onclick();
  }
  assert.equal(kids.trip.current,null);assert.equal(els.mission.hidden,true);assert.equal(a.hooks.guided,false);
  assert.equal(els['b-text'].textContent,LINES.trip_done);
  els['k-home'].onclick();assert.equal(kids.trip.index,0);
  els['mission-exit'].onclick();assert.equal(kids.trip.current,null);assert.equal(a.hooks.guided,false);
});
test('leaving during narration never reopens old action; games and Moon facts still work',async()=>{
  const a=await app(412);a.els.introStart.onclick({stopPropagation(){}});a.els['mission-action'].onclick();
  a.els['k-games'].onclick();await a.settle();assert.equal(a.els.mission.hidden,true);assert.equal(a.kids.trip.current,null);
  a.kids.startTrip();a.els['mission-exit'].onclick();a.focus(a.bodies.find(b=>b.data.name==='Moon'));
  assert.equal(a.els['b-text'].textContent,LINES.f_Moon_0);
  a.kids.enterGrownup();assert.equal(a.hooks.kid,false);assert.equal(a.hooks.guided,false);
});
