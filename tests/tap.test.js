// Real app modules (index.html, app.js, OrbitControls, lab.js, sheet.js, voice player) in linkedom.
// Taps are PointerEvent sequences dispatched at CSS coordinates projected from each world's
// position, through the listeners the app itself registers. DOM emulation, not a browser.
import test from 'node:test';import assert from 'node:assert/strict';import {bootApp} from './integration-harness.js';
const SEEDS=[1,2,3,4,5,6,7,8];
const ready=async(o)=>{const a=await bootApp(o);a.step(40);return a;};
test('touch tap on Earth (real event path, OrbitControls attached) opens its sheet',async()=>{
  const a=await ready();const [x,y]=a.screenOf('Earth');
  assert.ok(x>0&&x<412&&y>0&&y<915,`Earth on screen at ${x.toFixed(0)},${y.toFixed(0)}`);
  assert.equal(a.sheet,'closed');assert.equal(a.$('hint').hidden,false,'first-visit hint is shown');
  a.tapAt(x,y,{type:'touch'});
  assert.equal(a.sheet,'peek');assert.equal(a.$('title').textContent,'Earth');assert.equal(a.$('hint').hidden,true);
  assert.equal(a.errors.length,0);
});
test('repeated taps: select, empty tap closes and flies back out, select again (touch and mouse)',async()=>{
  const a=await ready();
  for(const [name,type] of [['Earth','touch'],['Mars','mouse'],['Venus','touch'],['Earth','touch']]){
    a.step(2);const [x,y]=a.screenOf(name);a.tapAt(x,y,{type,id:Math.floor(Math.random()*1000)});
    assert.equal(a.sheet,'peek',`${name} (${type}) opens`);assert.equal(a.$('title').textContent,name);
    a.step(30);a.tapAt(20,880,{type});assert.equal(a.sheet,'closed',`empty tap after ${name} closes`);
    a.step(40);assert.ok(a.app.camera.position.distanceTo(a.app.HOME.pos)<1e-3,'camera back at the overview');
  }
});
test('finger jitter up to 14 px still counts as a tap; drags, pinches and cancelled pointers do not select',async()=>{
  const a=await ready();let [x,y]=a.screenOf('Mars');const aimed=a.app.pickAt(x,y,'touch').data.name;
  a.tapAt(x,y,{type:'touch',move:10});assert.equal(a.sheet,'peek');assert.equal(a.$('title').textContent,aimed,'picks where the finger landed');
  a.tapAt(20,880,{type:'touch'});assert.equal(a.sheet,'closed');a.step(40);
  [x,y]=a.screenOf('Venus');a.tapAt(x,y,{type:'touch',move:40});assert.equal(a.sheet,'closed','a 40 px drag rotates, it does not select (and its click is ignored)');
  [x,y]=a.screenOf('Venus');a.tapAt(x,y,{type:'touch',cancel:true});assert.equal(a.sheet,'closed','pointercancel does not select');
  const c=a.canvas;c.dispatchEvent(a.pe('pointerdown',x,y,{id:5}));c.dispatchEvent(a.pe('pointerdown',x+80,y,{id:6}));c.dispatchEvent(a.pe('pointerup',x,y,{id:5}));c.dispatchEvent(a.pe('pointerup',x+80,y,{id:6}));
  assert.equal(a.sheet,'closed','two-finger gesture does not select');
});
test('a click with no pointer events (fallback) and a tap on a name label both select',async()=>{
  const a=await ready();const [x,y]=a.screenOf('Venus');
  a.click(a.canvas,x,y);assert.equal(a.$('title').textContent,'Venus');assert.equal(a.sheet,'peek');
  a.tapAt(20,880);assert.equal(a.sheet,'closed');a.step(40);
  const label=[...a.document.querySelectorAll('#labels .lbl')].find(l=>!l.hidden&&l.textContent!=='Venus'&&l.textContent!=='Sun');
  assert.equal(label.tagName,'BUTTON');
  label.dispatchEvent(a.pe('pointerdown',1,1));label.dispatchEvent(a.pe('pointerup',1,1));a.click(label,1,1);
  assert.equal(a.$('title').textContent,label.textContent);assert.equal(a.sheet,'peek');
});
test('taps on the open sheet or the top bar never count as empty-space taps',async()=>{
  const a=await ready();const [x,y]=a.screenOf('Earth');a.tapAt(x,y);assert.equal(a.sheet,'peek');
  a.tapAt(200,800,{target:a.$('title')});assert.equal(a.sheet,'peek');
  a.tapAt(380,30,{target:a.document.querySelector('#settings summary')});assert.equal(a.sheet,'peek','the menu button is not empty space');
});
test('labels: names shown in the overview without overlapping, for many planet arrangements',async()=>{
  for(const seed of SEEDS){
    const a=await ready({seed});const boxes=[];
    for(const l of a.document.querySelectorAll('#labels .lbl')){if(l.hidden)continue;boxes.push([...l.dataset.box.split(',').map(Number),l.textContent]);}
    const inner=boxes.filter(b=>['Mercury','Venus','Earth','Mars'].includes(b[4])).length;
    assert.ok(boxes.some(b=>b[4]==='Earth'),`seed ${seed}: Earth labelled`);assert.ok(inner===4,`seed ${seed}: ${inner} of 4 inner planets labelled (${boxes.map(b=>b[4]).join(', ')})`);
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const p=boxes[i],q=boxes[j];assert.ok(!(p[0]<q[2]&&p[2]>q[0]&&p[1]<q[3]&&p[3]>q[1]),`seed ${seed}: ${p[4]} overlaps ${q[4]}`);}
  }
});
test('every inner planet is tappable at its projected position, for many planet arrangements',async()=>{
  for(const seed of SEEDS){
    const a=await ready({seed});
    for(const n of ['Mercury','Venus','Earth','Mars']){
      const [x,y]=a.screenOf(n);a.tapAt(x,y,{type:'touch'});
      assert.equal(a.sheet,'peek',`seed ${seed}: ${n} opens a sheet`);assert.equal(a.$('title').textContent,n,`seed ${seed}: tapping ${n} selects ${n}`);
      a.tapAt(5,890);a.step(40);
    }
  }
});
test('a label selects its world even if the world moves between touch-down and lift-off',async()=>{
  const a=await ready({seed:3});
  const label=[...a.document.querySelectorAll('#labels .lbl')].find(l=>!l.hidden&&l.textContent==='Earth');
  a.canvas.ownerDocument;label.dispatchEvent(a.pe('pointerdown',1,1));a.step(6);label.dispatchEvent(a.pe('pointerup',1,1));a.click(label,1,1);
  assert.equal(a.$('title').textContent,'Earth');assert.equal(a.sheet,'peek');
});
test('experiments: slider and month/phase buttons come first, right under the title; tabs hidden; Reset is a header icon',async()=>{
  for(const experiment of ['seasons','phases']){
    const a=await ready();a.lab.go({view:'try',experiment});assert.equal(a.sheet,'half');
    const ids=[...a.$('experiment').children].map(e=>e.id||e.tagName.toLowerCase());
    assert.deepEqual(ids.slice(0,4),['angle-label','experiment-angle','presets','experiment-result'],ids.join(','));
    assert.ok(ids.indexOf('experiment-summary')>ids.indexOf('presets'),'explanation below the controls');
    assert.ok(a.$('presets').querySelectorAll('button').length>=4);
    assert.equal(a.document.querySelector('#sheet .tabs').hidden,true,'tabs hidden in a lab');
    assert.equal(a.$('experiment-reset').closest('.head-tools')!==null,true);assert.equal(a.$('experiment-reset').hidden,false);
    assert.equal(a.$('try-panel').hidden,false);
    // Only the header sits above the controls inside the sheet: nothing visible precedes #experiment in the body.
    const body=a.$('sheet-body');const before=[...body.children].slice(0,[...body.children].indexOf(a.$('try-panel'))).filter(e=>!e.hidden&&e.id!=='view-caption');
    assert.deepEqual(before.map(e=>e.className||e.id),[],'nothing above the lab in the sheet body');
  }
  const css=(await import('node:fs')).readFileSync('style.css','utf8');
  assert.match(css,/\.experiment-mode #view-caption\{order:2\}/);assert.match(css,/\.experiment-mode #sheet\[data-state=half\]\{max-height:60dvh\}/);
});
