// The real lab.js, app.js and every real scene module (linkedom; WebGL replaced): the unified zoom driven by
// wheel and pinch events through the listeners the app registers, frame by frame. DOM emulation, not a
// browser: this checks the logic of Z, seams and arrivals, never GPU timing or what the picture looks like.
import test from 'node:test';import assert from 'node:assert/strict';import {bootApp} from './integration-harness.js';
import {SEAM_Z,layoutAt} from '../zoom-ladder.js';
const ready=async()=>{const a=await bootApp({fakeClock:true});a.step(40);return a;};
const wheel=(a,dy)=>{const e=new a.window.Event('wheel',{cancelable:true});Object.assign(e,{deltaY:dy,deltaMode:0});a.canvas.dispatchEvent(e);return e;};
test('wheel out of the Solar System crosses into the stars in small continuous steps, and back in again',async()=>{
 const a=await ready(),zs=[],views=new Set();let sawBridge=false;
 for(let i=0;i<600&&a.lab.state.value.view!=='stars';i++){const e=wheel(a,120);assert.equal(e.defaultPrevented,true);a.step(1);zs.push(a.lab.Z);if(a.lab.bridge)sawBridge=true;views.add(a.lab.state.value.view);}
 assert.equal(a.lab.state.value.view,'stars','reached the nearby stars');assert.ok(sawBridge,'drawn through the seam');
 for(let i=1;i<zs.length;i++){assert.ok(zs[i]>=zs[i-1]-1e-9,`zoom out never reverses (frame ${i})`);assert.ok(zs[i]-zs[i-1]<=0.6+1e-9,`no jump (frame ${i})`);}
 for(let i=0;i<40;i++)a.step(1);
 assert.ok(a.lab.Z>SEAM_Z['solar>stars'][1]-1e-6,'settled past the seam');
 for(let i=0;i<600&&a.lab.state.value.view!=='explore';i++){wheel(a,-120);a.step(1);}
 assert.equal(a.lab.state.value.view,'explore','zoomed back into the Solar System');
 assert.equal(a.errors.length,0);
});
test('a two-finger pinch moves the same Z on the OrbitControls touch basis (fingers together = out), and lifting the fingers settles',async()=>{
 const a=await ready();for(let i=0;i<600&&a.lab.state.value.view!=='stars';i++){wheel(a,120);a.step(1);}for(let i=0;i<60;i++)a.step(1);
 const z0=a.lab.Z,d0=a.lab.starsView.zoomState().d;
 const c=a.canvas,P=(t,id,x)=>a.pe(t,x,400,{id,type:'touch'});
 c.dispatchEvent(P('pointerdown',1,150));c.dispatchEvent(P('pointerdown',2,350));
 for(let s=1;s<=10;s++){c.dispatchEvent(P('pointermove',2,350-s*10));a.step(1);}
 // Spread 200 → 100 px: ΔZ = −1.8 ln(100/200) (OrbitControls touch basis), all inside the star map.
 const zHeld=a.lab.Z;assert.ok(Math.abs((zHeld-z0)-1.8*Math.log(2))<1e-6,`pinch ΔZ ${zHeld-z0}`);
 assert.ok(Math.abs(a.lab.starsView.zoomState().d/(d0*2**1.8)-1)<1e-6,'the stars camera moved out by 2^1.8');
 c.dispatchEvent(P('pointerup',2,250));c.dispatchEvent(P('pointerup',1,150));for(let i=0;i<80;i++)a.step(1);
 assert.equal(a.lab.zoom.moving,false,'momentum dies out');assert.equal(layoutAt(a.lab.Z).pair,null,'never left inside a seam by a gesture that stopped outside one');
 assert.equal(a.errors.length,0);
});
test('the scale ladder plays the same zoom through every seam, out to the universe and home again, with Z continuous',async()=>{
 const a=await ready(),btn=l=>a.document.querySelector(`#ladder [data-level="${l}"]`),seen=[];
 const run=(target,cap=4000)=>{let last=null,maxJump=0;btn(target).onclick();for(let i=0;i<cap&&(a.lab.state.value.view!==(target==='solar'?'explore':target)||a.lab.bridge||a.lab.animating);i++){a.step(1);const z=a.lab.Zcam;if(z!=null&&last!=null)maxJump=Math.max(maxJump,Math.abs(z-last));last=z;if(!seen.includes(a.lab.state.value.view))seen.push(a.lab.state.value.view);}return maxJump;};
 const j1=run('universe');assert.equal(a.lab.state.value.view,'universe');assert.deepEqual(seen,['explore','stars','galaxy','local','super','universe']);
 assert.ok(j1<0.6,`camera Z never jumps, seams and arrivals included (largest step ${j1.toFixed(3)} per 50 ms frame)`);
 const j2=run('solar');assert.equal(a.lab.state.value.view,'explore');assert.ok(j2<0.6,`inward: largest step ${j2.toFixed(3)}`);
 for(let i=0;i<60;i++)a.step(1);
 assert.equal(a.errors.length,0);
});
