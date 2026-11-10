// Voice guide after the trim: only the clips the app can play, none in the offline precache, and each one cached
// by the service worker the first time it plays. Node/vm models only: no browser, no audio output.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {LINES,VOICE} from '../voice/lines.js';import {INSIGHTS} from '../insights.js';import {SUN,PLANETS,MOON,MOONS,DWARFS} from '../data.js';
import {STOPS} from '../adventure.js';import {createVoicePlayer,pickVoice,FALLBACK} from '../voice-player.js';import {precacheList,stampSite,writePrecache,isClip} from '../tools/stamp.mjs';

// What the code can ask the player to say: literal ids in the modules that narrate, the adventure's stops, and a
// world card's `info.line || f_<World>_0` for every world in the scene.
function reachableIds(){
  const src=['lab.js','insights.js','adventure.js','learn.js','tour.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
  const ids=new Set();for(const m of src.matchAll(/['"`]((?:lab|trip|f)_[A-Za-z_0-9]+)['"`]/g))ids.add(m[1]);
  for(const s of STOPS){ids.add(s.prompt);ids.add(s.fact);}
  for(const w of [SUN,...PLANETS,MOON,...DWARFS,...MOONS])ids.add(INSIGHTS[w.name]?.line||`f_${w.name}_0`);
  return ids;
}
test('every clip the app can play exists, and there are no orphan clips, texts or manifest entries', () => {
  const clips=new Set(fs.readdirSync('voice').filter(f=>f.endsWith('.mp3')).map(f=>f.slice(0,-4)));
  const wanted=[...reachableIds()].filter(id=>clips.has(id)||LINES[id]);
  assert.equal(clips.size,26);
  for(const id of clips)assert.ok(reachableIds().has(id),`${id}.mp3 is reachable from the code`);
  for(const id of wanted)assert.ok(clips.has(id)&&LINES[id],`${id}: clip and text`);
  const manifest=JSON.parse(fs.readFileSync('voice/manifest.json','utf8'));
  assert.deepEqual(Object.keys(LINES).sort(),[...clips].sort());assert.deepEqual(Object.keys(manifest).sort(),[...clips].sort());
  assert.deepEqual(Object.keys(VOICE.hash).sort(),[...clips].sort());
  for(const id of clips){assert.equal(manifest[id].hash,VOICE.hash[id]);assert.equal(manifest[id].text,LINES[id]);}
  // Ids the code asks for without a clip (dwarf planets, most moons) fall back to the card text and show no ♫.
  assert.ok(!fs.existsSync('kids.js'),'kid mode is gone');
  assert.doesNotMatch(fs.readFileSync('.github/workflows/pages.yml','utf8'),/kids\.js/);
});

test('Save for offline / install precache lists no voice clips, still lists the stamped voice text module', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'site-'));
  const copy=fs.readFileSync('.github/workflows/pages.yml','utf8').match(/cp -r (.+) _site\//)[1].split(/\s+/);
  for(const f of copy)fs.cpSync(f,path.join(dir,f),{recursive:true});
  stampSite(dir,'abc123def456');writePrecache(dir,'abc123def456');
  const list=JSON.parse(fs.readFileSync(path.join(dir,'precache.json'),'utf8'));
  assert.equal(list.files.filter(f=>/\.mp3/.test(f)).length,0,'no clips');
  assert.ok(list.files.includes('voice/lines.js?v=abc123def456'));assert.ok(list.files.includes('adventure.js?v=abc123def456'));
  assert.equal(fs.readdirSync(path.join(dir,'voice')).filter(f=>f.endsWith('.mp3')).length,26,'clips are still deployed');
  assert.ok(isClip('voice/trip_earth.mp3'));assert.ok(!isClip('voice/lines.js'));
  assert.match(fs.readFileSync(path.join(dir,'lab.js'),'utf8'),/from '\.\/voice\/lines\.js\?v=abc123def456'/,'stamping still busts the text module');
});

// sw.js in a vm with fake caches/fetch: a clip fetched once is stored; afterwards it is served from the cache
// (offline too); a re-recorded clip (new ?h=) replaces the old copy.
function loadSw(){
  const store=new Map(),listeners={};let net=0,online=true;
  class Req{constructor(u){this.url=typeof u==='string'?u:u.url;this.method='GET';this.mode='cors';}}
  const res=body=>({ok:true,status:200,body,clone(){return res(body);}});
  const cache={async put(r,v){store.set(r.url,v);},async keys(){return [...store.keys()].map(url=>({url}));},async delete(k){return store.delete(k.url);}};
  const g={self:{location:{origin:'https://x.test',href:'https://x.test/app/sw.js'},addEventListener:(t,f)=>listeners[t]=f,skipWaiting(){},clients:{claim(){}}},
    caches:{open:async()=>cache,match:async r=>store.get(typeof r==='string'?r:r.url)},
    fetch:async r=>{if(!online)throw Error('offline');net++;return res('mp3:'+(typeof r==='string'?r:r.url));},Request:Req,URL,Response:{error:()=>({error:true})},console};
  g.addEventListener=g.self.addEventListener;vm.runInNewContext(fs.readFileSync('sw.js','utf8'),g);
  const get=async url=>{let p;listeners.fetch({request:new Req(url),respondWith(x){p=x;}});return p&&await p;};
  return {get,store,get net(){return net;},offline(){online=false;}};
}
test('service worker: a clip is cached at runtime after its first play, then served cache-first (offline too)', async () => {
  const sw=loadSw(),u=`https://x.test/app/voice/trip_earth.mp3?h=${VOICE.hash.trip_earth}`;
  const a=await sw.get(u);assert.equal(sw.net,1);await new Promise(r=>setTimeout(r,5));assert.ok(sw.store.has(u),'stored after first play');
  sw.offline();const b=await sw.get(u);assert.equal(sw.net,1,'no second download');assert.equal(b.body,a.body);
  const sw2=loadSw();await sw2.get('https://x.test/app/voice/trip_earth.mp3?h=old');await sw2.get('https://x.test/app/voice/trip_earth.mp3?h=new');await new Promise(r=>setTimeout(r,5));
  assert.deepEqual([...sw2.store.keys()],['https://x.test/app/voice/trip_earth.mp3?h=new'],'a re-recorded clip replaces the old one');
});

test('the player asks for each clip with its content hash (so the cache-first worker never serves a stale recording)', async () => {
  const urls=[];globalThis.fetch=async u=>{urls.push(u);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
  globalThis.AudioContext=class{state='running';destination={};resume(){return Promise.resolve();}createBuffer(){return {};}createBufferSource(){return {connect(){},start(){setTimeout(()=>this.onended?.(),1);},stop(){}};}decodeAudioData(){return Promise.resolve({duration:.01});}};
  const p=createVoicePlayer({lines:LINES,durations:VOICE.dur,versions:VOICE.hash});p.unlock();await p.say('lab_earth');
  assert.deepEqual(urls,[`voice/lab_earth.mp3?h=${VOICE.hash.lab_earth}`]);
  for(const f of ['lab.js','adventure.js'])assert.match(fs.readFileSync(f,'utf8'),/versions: ?VOICE\.hash/,f);
  delete globalThis.AudioContext;delete globalThis.fetch;
});

test('speech fallback: a male English voice when the device has one, calm rate 0.9, normal pitch', () => {
  assert.deepEqual({...FALLBACK},{rate:0.9,pitch:1});
  assert.equal(pickVoice([{name:'Samantha (Female)',lang:'en-US'},{name:'Google UK English Male',lang:'en-GB'}]).name,'Google UK English Male');
  assert.equal(pickVoice([{name:'Karen',lang:'en-AU'},{name:'Daniel',lang:'en-GB'},{name:'Thomas',lang:'fr-FR'}]).name,'Daniel');
  assert.equal(pickVoice([{name:'Female voice',lang:'en-US'}]).name,'Female voice','no male voice: the first English one');
  assert.equal(pickVoice([{name:'Thomas',lang:'fr-FR'}]),null,'never a non-English voice');
  assert.equal(VOICE.name,'bm_george');assert.ok(VOICE.speed<=0.9,'recorded clips: calm pace');
});
