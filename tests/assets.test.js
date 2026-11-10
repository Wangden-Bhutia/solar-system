import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {LINES} from '../voice/lines.js';
test('every loaded relative module is present and packaged; no runtime CDN dependencies',()=>{
 const seen=new Set(),workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
 function walk(file){file=path.normalize(file);if(seen.has(file))return;seen.add(file);assert.ok(fs.existsSync(file),file);
 if(!file.startsWith('vendor/')&&!file.startsWith('voice/'))assert.ok(workflow.includes(path.basename(file)),file);
 for(const [,spec]of fs.readFileSync(file,'utf8').matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){assert.ok(spec.startsWith('.'),`nonlocal dependency ${spec}`);walk(path.join(path.dirname(file),spec));}}
 walk('lab.js');assert.ok(seen.has('land.js'));assert.ok(seen.has('experiments.js'));
});
test('26 voice texts, assets and manifest entries agree exactly',()=>{
 const source=JSON.parse(fs.readFileSync('voice/lines.json'));const manifest=JSON.parse(fs.readFileSync('voice/manifest.json'));
 assert.deepEqual(source,LINES);assert.equal(Object.keys(source).length,26);
 for(const [id,text]of Object.entries(source)){assert.equal(manifest[id].text,text);assert.ok(manifest[id].dur>0);assert.ok(fs.statSync(`voice/${id}.mp3`).size>1000);}
});
test('three primary actions and no placeholder anchors',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.equal([...html.matchAll(/data-view=/g)].length,3);assert.ok(!html.includes('href="#"'));assert.match(html,/src="lab.js"/);
});
