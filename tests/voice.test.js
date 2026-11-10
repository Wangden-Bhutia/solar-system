import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoicePlayer } from '../voice-player.js';
const tick = () => new Promise(r => setTimeout(r, 12));
let played, spoken, requests, resumed, mode, instances;
class FakeContext {
  state='suspended'; destination={};
  constructor() { instances.push(this); }
  resume() { resumed++; this.state='running'; return Promise.resolve(); }
  createBuffer() { return {silent:true}; }
  createBufferSource() { return { connect(){}, start(){ if (!this.buffer.silent) { played++; if(mode!=='hold') setTimeout(()=>this.onended?.(),1); } }, stop(){this.onended?.();} }; }
  decodeAudioData() { return Promise.resolve({duration:0.01}); }
}
function setup() {
  played=spoken=requests=resumed=0; mode='normal'; instances=[];
  globalThis.AudioContext=FakeContext;
  globalThis.SpeechSynthesisUtterance=class { constructor(text){this.text=text;} };
  globalThis.speechSynthesis={cancel(){},getVoices(){return [{name:'Female',lang:'en-US'},{name:'Daniel',lang:'en-GB'}];},speak(u){spoken++;assert.equal(u.voice.name,'Daniel');assert.equal(u.pitch,1);assert.equal(u.rate,.9);setTimeout(()=>u.onend(),1);}};
  globalThis.fetch=async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
  const states=[];
  return {p:createVoicePlayer({lines:{a:'Hello Earth.',b:'Hello Moon.'},durations:{a:.01,b:.01},onState:s=>states.push(s)}),states};
}
test('no autoplay; gesture creates/resumes context, clips requested and sequentially played; cache reuse',async()=>{
  const {p}=setup(); assert.equal(instances.length,0); assert.equal(requests,0);
  p.unlock(); await p.say(['a','b']); assert.equal(resumed,1);assert.equal(played,2);assert.equal(requests,2);
  await p.say('a');assert.equal(requests,2);assert.equal(played,3);
  instances[0].state='interrupted';p.unlock();assert.equal(resumed,2);
  await p.say('b');assert.equal(played,4);
});
test('missing clip and unsupported AudioContext fall back to male speech, mute requests nothing',async()=>{
  const {p}=setup();p.unlock();globalThis.fetch=async()=>({ok:false});
  await p.say('a');assert.equal(spoken,1);assert.equal(played,0);
  const before=requests;await p.say('b',true);assert.equal(requests,before);assert.equal(spoken,1);
  globalThis.AudioContext=class{constructor(){throw Error('unsupported');}};
  const q=createVoicePlayer({lines:{a:'Earth'},durations:{a:1}});q.unlock();await q.say('a');assert.equal(spoken,2);
});
test('cancelling a playing sequence resolves immediately and never starts next clip',async()=>{
  const {p}=setup();p.unlock();mode='hold';const speaking=p.say(['a','b']);
  await tick();assert.equal(played,1);p.stop();await speaking;await tick();assert.equal(played,1);
});
test('late network result cannot start superseded narration',async()=>{
  const {p}=setup();p.unlock();let release;
  globalThis.fetch=()=>new Promise(r=>{release=()=>r({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});});
  const pending=p.say('a');p.stop();release();await pending;assert.equal(played,0);
});
