// The Sources screen (sources.js + sources-page.js). Data checks are pure; the screen is driven in the real app
// modules with linkedom (tests/integration-harness.js) and a fake renderer: DOM checks, NOT a browser, GPU or phone
// test. The link check against the live sites is a separate, networked tool (tools/check-sources.mjs).
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {parseHTML} from 'linkedom';
import {REFS,claimGroups,illustrations,allClaims,usedRefs,LAB_REFS,JOURNEY_SRC} from '../sources.js';
import {sourcesHTML,refLinks} from '../sources-page.js';
import {SUN,PLANETS,MOON,MOONS,DWARFS} from '../data.js';import {STRIKING,MOON_COUNT} from '../insights.js';
import {PREDICTIONS,JOURNEYS,VOYAGE} from '../learn.js';import {TOUR_STOPS,SOURCES,sourcesOf} from '../tour.js';import {STOPS} from '../adventure.js';import {LINES} from '../voice/lines.js';
import {STAR_FACTS} from '../stars-data.js';import {VISITORS} from '../star-motion.js';import {LANDMARKS} from '../galaxy-data.js';import {GALAXIES} from '../local-data.js';import {CLUSTERS,FAR_GALAXY} from '../cosmos-data.js';
import {stampSite,writePrecache} from '../tools/stamp.mjs';
import {bootApp} from './integration-harness.js';

const claims=allClaims(),texts=claims.map(c=>c.text);
const has=(t,where)=>assert.ok(texts.some(x=>x.includes(t)),`${where}: "${t.slice(0,60)}" is listed`);

test('every claim has at least one source, and every source has a label and an https URL',()=>{
 assert.ok(claims.length>250,`${claims.length} claims`);
 for(const c of claims){assert.ok(c.text&&c.text.length>5,c.section);assert.ok(c.src.length>=1,`${c.section}: "${c.text.slice(0,50)}" has a source`);
  for(const k of c.src){assert.ok(REFS[k],`${c.section}: source ${k} exists`);}}
 for(const k of usedRefs()){const r=REFS[k];assert.ok(r.label&&r.label.length>3,k);assert.match(r.url,/^https:\/\/[^\s]+$/,k);}
 for(const i of illustrations()){assert.ok(i.where&&i.shown&&i.real,i.where);assert.ok(i.src.length>=1,i.where);for(const k of i.src)assert.ok(REFS[k],k);}
 for(const [lab,keys] of Object.entries(LAB_REFS))for(const k of keys)assert.ok(REFS[k],`${lab}: ${k}`);
});

test('every claim-bearing data entry is listed, with its text read from the data itself (no copies to drift)',()=>{
 for(const b of [SUN,...PLANETS,MOON]){has(STRIKING[b.name],b.name);has(b.blurb,b.name);for(const [k,v] of b.facts)if(k!=='Moons')has(`${k}: ${v}`,b.name);}
 for(const [n,c] of Object.entries(MOON_COUNT))has(`${n} has ${c}.`,'moon counts');
 for(const m of MOONS){has(`${m.name}: ${m.fact}`,'moons');for(const [k,v] of m.facts)has(`${k}: ${v}`,m.name);}
 for(const d of DWARFS){has(`${d.name}: ${d.fact}`,'dwarfs');for(const [k,v] of d.facts)has(`${k}: ${v}`,d.name);}
 for(const id of Object.keys(LINES).filter(id=>/^f_|^lab_(earth|moon|seasons|phases|compare|day)$|^trip_(earth|moon|mars|saturn)/.test(id)))has(LINES[id],id);
 for(const p of Object.values(PREDICTIONS))has(p.explain,'questions');
 for(const j of [...JOURNEYS,VOYAGE])j.steps.forEach((st,i)=>{const k=`${j.id}.${i}`;assert.ok(k in JOURNEY_SRC,`${k} is mapped (to sources, or to null when it states no fact)`);if(JOURNEY_SRC[k])has(st.text,k);});
 for(const s of TOUR_STOPS)has(s.text,s.id);
 for(const s of STOPS)for(const id of [s.prompt,s.fact])has(LINES[id],id);
 for(const [n,t] of Object.entries(STAR_FACTS))has(`${n}: ${t}`,'stars');for(const v of VISITORS)has(`${v.name}: ${v.fact}`,'visitors');
 for(const m of LANDMARKS)has(`${m.name}: ${m.fact}`,'galaxy');for(const g of GALAXIES.filter(g=>g.fact))has(`${g.name}: ${g.fact}`,'local');
 for(const c of CLUSTERS.filter(c=>c.fact))has(`${c.name}: ${c.fact}`,'cosmos');has(FAR_GALAXY.fact,'MoM-z14');
 // The tour's sources are the tour's own: the screen does not copy or relabel them.
 for(const s of TOUR_STOPS){const c=claims.find(x=>x.section===`tour-${s.id}`);assert.ok(c);assert.deepEqual(c.src,sourcesOf(s));for(const k of c.src)assert.equal(REFS[k],SOURCES[k]);}
});

test('the page renders every group and every claim; links open in a new tab with rel=noopener',()=>{
 const {document}=parseHTML(`<!doctype html><body>${sourcesHTML()}</body>`);
 const groups=claimGroups();
 for(const g of groups){const el=document.getElementById(`src-${g.id}`);assert.ok(el,`group ${g.id}`);assert.equal(el.querySelector('h2').textContent,g.title);
  for(const s of g.sections){const d=document.getElementById(`src-${s.id}`);assert.ok(d,`section ${s.id}`);assert.equal(d.querySelectorAll('li').length,s.claims.length,s.id);}}
 assert.ok(document.getElementById('src-illustrations'),'the real-or-illustration list');
 assert.equal(document.querySelectorAll('.src-ill li').length,illustrations().length);
 assert.equal(document.querySelectorAll('.src-sec li').length,claims.length);
 const links=[...document.querySelectorAll('a')];assert.ok(links.length>=claims.length);
 for(const a of links){assert.equal(a.getAttribute('target'),'_blank',a.href);assert.equal(a.getAttribute('rel'),'noopener',a.href);assert.match(a.getAttribute('href'),/^https:\/\//);}
 assert.equal(document.querySelectorAll('[data-jump]').length,groups.length+1,'one jump button per group, plus illustrations');
 assert.match(refLinks(['iauAu']),/target="_blank" rel="noopener"/);
 for(const i of illustrations())assert.match(i.shown+i.where,/./);
 assert.ok(illustrations().some(i=>/Moon distance shortened/.test(i.shown)),'the shortened Moon distance is listed');
 assert.ok(illustrations().some(i=>/compressed/.test(i.shown)),'compressed planet distances are listed');
});

test('the Sources screen ships and works offline: in the Pages copy list and in precache.json',()=>{
 const copy=fs.readFileSync('.github/workflows/pages.yml','utf8').match(/cp -r (.+) _site\//)[1].split(/\s+/);
 for(const f of ['sources.js','sources-page.js'])assert.ok(copy.includes(f),`${f} is deployed`);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'site-'));for(const f of copy)fs.cpSync(f,path.join(dir,f),{recursive:true});
 stampSite(dir,'abc123def456');writePrecache(dir,'abc123def456',{strict:true});
 const list=JSON.parse(fs.readFileSync(path.join(dir,'precache.json'),'utf8')).files;
 for(const f of ['sources.js','sources-page.js'])assert.ok(list.includes(`${f}?v=abc123def456`),`${f} is precached`);
 assert.match(fs.readFileSync(path.join(dir,'lab.js'),'utf8'),/from '\.\/sources-page\.js\?v=abc123def456'/,'lab.js imports it with the deploy stamp');
});

test('menu → Sources opens over the scene and ✕ closes back to where you were; cards and the tour link to their section',async()=>{
 const a=await bootApp({fakeClock:true});a.step(30);
 const page=()=>a.$('sources-page');
 assert.ok(a.$('open-sources'),'a Sources row in the menu');
 const before={...a.lab.state.value};
 a.$('settings').open=true;a.click(a.$('open-sources'));
 assert.equal(page().hidden,false);assert.equal(a.$('settings').open,false,'the menu closes');assert.ok(a.document.body.classList.contains('sources-open'));
 for(const g of claimGroups())assert.ok(page().querySelector(`#src-${g.id}`),g.id);
 assert.deepEqual({...a.lab.state.value},before,'opening it changes nothing underneath');
 a.click(a.$('sources-close'));assert.equal(page().hidden,true);assert.deepEqual({...a.lab.state.value},before,'closing returns to the same place');
 // A world card's "All sources" opens that card's section.
 a.lab.go({view:'explore',world:'Mars',sheet:'half'});a.step(5);
 const btn=a.$('world-all-sources');assert.equal(btn.dataset.sources,'src-world-Mars');
 a.click(btn);assert.equal(page().hidden,false);assert.equal(a.$('src-world-Mars').open,true,'Mars section is opened');
 const kd=new a.window.Event('keydown',{bubbles:true});kd.key='Escape';a.document.dispatchEvent(kd);assert.equal(page().hidden,true,'Esc closes');
 assert.equal(a.lab.state.value.world,'Mars','still on the Mars card');
 for(const b of a.document.querySelectorAll('[data-sources]'))assert.ok(page().querySelector('#'+b.dataset.sources)||b.id==='world-all-sources'||b.id==='star-all-sources',`${b.dataset.sources} exists`);
 // Tour: each stop's sources line links to its section; a playing tour waits while the screen is open.
 const t=a.lab.tour;a.$('tour-start').onclick();for(let i=0;i<400&&!t.arrived;i++)a.step(1);
 const all=a.$('tour').querySelector('.tour-all');assert.ok(all,'tour sources link to the full list');assert.equal(all.dataset.sources,`src-tour-${TOUR_STOPS[t.index].id}`);
 assert.equal(t.paused,false);a.click(all);assert.equal(page().hidden,false);assert.equal(t.paused,true,'the tour waits');
 assert.equal(a.$(`src-tour-${TOUR_STOPS[t.index].id}`).open,true);
 a.click(a.$('sources-close'));assert.equal(t.paused,false,'and carries on after');assert.deepEqual(a.errors,[]);
});

test('every world, moon and dwarf card points its "All sources" at a section that exists',async()=>{
 const {document}=parseHTML(`<!doctype html><body>${sourcesHTML()}</body>`);
 for(const n of [SUN,...PLANETS,MOON].map(b=>b.name))assert.ok(document.getElementById(`src-world-${n}`),n);
 for(const id of ['src-world-moons','src-world-dwarfs','src-labs-notes','src-labs-compare','src-beyond-stars','src-beyond-galaxy','src-beyond-local','src-beyond-cosmos','src-worlds','src-beyond'])assert.ok(document.getElementById(id),id);
 for(const s of TOUR_STOPS)assert.ok(document.getElementById(`src-tour-${s.id}`),s.id);
});
