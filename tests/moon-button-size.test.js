// Moon close-up, the adventure's primary button and the offline size label. Node harness / model checks only
// (fake renderer, linkedom, CSS text): NOT a browser, GPU or phone check.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {bootApp} from './integration-harness.js';import {STOPS} from '../adventure.js';import {LINES} from '../voice/lines.js';
import {stampSite,writePrecache,sizeLabel,writeOfflineSize} from '../tools/stamp.mjs';

const css=fs.readFileSync('style.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const lum=hex=>{const c=hex.replace('#','').match(/../g).map(h=>parseInt(h,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const contrast=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
const decl=(sel,prop)=>{const m=[...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(r=>r[1].split(',').map(s=>s.trim()).includes(sel)).map(r=>new RegExp(`(?:^|;)${prop}:([^;]+)`).exec(r[2])?.[1]).filter(Boolean);return m.at(-1);};

test('Moon close-up: a smooth sphere (64×40), its silhouette within half a pixel of a circle on a 412 px phone', async () => {
  const a=await bootApp();a.step(40);
  const moon=a.app.bodies.find(b=>b.data.name==='Moon'),g=moon.mesh.geometry.parameters;
  assert.ok(g.widthSegments>=64&&g.heightSegments>=40,`${g.widthSegments}×${g.heightSegments}`);
  for(const b of a.app.bodies.filter(b=>b.satellite&&b.host))assert.ok(b.mesh.geometry.parameters.widthSegments>=40,b.data.name);
  // The adventure's Visit Moon: how big the Moon is on screen, and the worst gap between the faceted edge and a circle.
  a.click(a.$('adventure'));a.step(5);a.click(a.$('story-skip'));a.step(40);a.click(a.$('story-main'));a.step(60);
  const c=moon.mesh.getWorldPosition(a.app.controls.target.clone()),d=a.app.camera.position.distanceTo(c);
  const rPx=moon.radius/(d*Math.tan(a.app.camera.fov*Math.PI/360))*915/2;
  assert.ok(rPx>100,`Moon fills the view (${rPx.toFixed(0)} px radius)`);
  assert.ok(rPx*(1-Math.cos(Math.PI/g.heightSegments))<0.5,`edge error across latitude bands ${(rPx*(1-Math.cos(Math.PI/g.heightSegments))).toFixed(2)} px`);
  assert.ok(rPx*(1-Math.cos(Math.PI/g.widthSegments))<0.5,`edge error ${(rPx*(1-Math.cos(Math.PI/g.widthSegments))).toFixed(2)} px`);
  assert.ok(rPx*(1-Math.cos(Math.PI/20))>1,`the old 20-segment Moon was visibly faceted at this size (${(rPx*(1-Math.cos(Math.PI/20))).toFixed(1)} px, r ${rPx.toFixed(0)} px)`);
});

test('the scale readout has no box behind it (it painted a grey rectangle over the Moon) and stays readable by its outline', () => {
  const bg=decl('.hud','background');assert.equal(bg,undefined,`no background: ${bg}`);
  assert.match(decl('.hud','text-shadow'),/#000/);
});

test('the readout is lifted again whenever the story caption changes the panel height', async () => {
  const a=await bootApp();a.step(40);
  a.click(a.$('adventure'));a.step(5);
  const panel=a.$('story');Object.defineProperty(panel,'offsetHeight',{configurable:true,get:()=>100+a.$('story-caption').textContent.length});
  const [x,y]=a.screenOf('Earth');a.tapAt(x,y,{type:'touch'});
  assert.equal(a.document.body.style.getPropertyValue('--story-h'),`${100+LINES.trip_earth_found.length}px`,'measured after the fact caption was written');
  a.click(a.$('story-main'));a.step(5);
  assert.equal(a.document.body.style.getPropertyValue('--story-h'),`${100+LINES.trip_moon.length}px`);
});

test('adventure primary button: dark text on the light accent in every state (WCAG AA ≥ 4.5:1), and hover cannot turn it dark', () => {
  const fg=decl('.story-main','color').trim(),bg=decl('.story-main','background').trim().replace('var(--accent)','#b6d9f1');
  assert.match(css,/--accent:#b6d9f1/);
  assert.ok(contrast(fg,bg)>=4.5,`normal ${contrast(fg,bg).toFixed(1)}`);
  for(const st of [':hover',':active',':disabled']){const b=decl('.story-main'+st,'background'),f=decl('.story-main'+st,'color')||fg;assert.ok(b,`${st} has its own background (the generic button:hover is dark)`);assert.ok(contrast(f.trim(),b.trim())>=4.5,`${st} ${contrast(f.trim(),b.trim()).toFixed(1)}`);}
  assert.ok(contrast(fg,decl('button:hover','background').trim())<4.5,'the bug: the generic hover background with this text colour');
});

test('button labels match what the narration says: the Moon stop shows "Visit Moon", and no other button says "Visit the Moon"', () => {
  assert.equal(STOPS[1].hint,'Visit Moon');assert.ok(LINES[STOPS[1].prompt].includes(`${STOPS[1].hint} button`));
  for(const s of STOPS){assert.doesNotMatch(s.hint,/Visit the Moon/);assert.doesNotMatch(s.next,/Visit/);}
  assert.equal(STOPS[0].next,'On to the Moon →');
});

test('Save for offline shows the real download size, written at deploy from precache.json (69 files ≈ 4.2 MB, with the Sources screen)', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'site-'));
  const copy=fs.readFileSync('.github/workflows/pages.yml','utf8').match(/cp -r (.+) _site\//)[1].split(/\s+/);
  for(const f of copy)fs.cpSync(f,path.join(dir,f),{recursive:true});
  stampSite(dir,'abc123def456');writePrecache(dir,'abc123def456',{strict:true});
  const list=JSON.parse(fs.readFileSync(path.join(dir,'precache.json'),'utf8')),label=sizeLabel(list.bytes);
  assert.equal(list.files.length,69);assert.equal(label,'about 4.2 MB',`${list.bytes} bytes`);
  assert.ok(fs.readFileSync(path.join(dir,'lab.js'),'utf8').includes(`const OFFLINE_SIZE='${label}'`));
  assert.ok(fs.readFileSync(path.join(dir,'index.html'),'utf8').includes(`Keeps the whole app (${label})`));
  // The source files carry the same figure, so a local run or preview also shows it.
  assert.ok(fs.readFileSync('lab.js','utf8').includes(`const OFFLINE_SIZE='${label}'`));assert.ok(fs.readFileSync('index.html','utf8').includes(`Keeps the whole app (${label})`));
  assert.doesNotMatch(fs.readFileSync('lab.js','utf8')+fs.readFileSync('index.html','utf8'),/4\.5 MB/);
  assert.equal(sizeLabel(3991623),'about 4.0 MB');assert.equal(sizeLabel(5286540),'about 5.3 MB');
  const bad=fs.mkdtempSync(path.join(os.tmpdir(),'site-'));fs.writeFileSync(path.join(bad,'lab.js'),'no marker');assert.throws(()=>writeOfflineSize(bad,1,{strict:true}),/marker missing/);
});

test('the menu note shows the size before any save', async () => {
  const a=await bootApp();assert.ok(a.$('offline-note'));
  assert.match(fs.readFileSync('lab.js','utf8'),/Keeps the whole app \(\$\{OFFLINE_SIZE\}\)/);
});
