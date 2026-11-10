// Leaving the Solar System by a real two-finger pinch (iPhone report on PR #26: stuck at ~5,000 AU, "centred away
// from the Sun"). A real pinch also moves the fingers' midpoint, which OrbitControls turned into a pan of the Solar
// view's centre; the off-centre gate at the Solar → Stars seam then held the zoom at the seam's start for as long as
// the fingers kept moving and the damped pan kept drifting the centre. DOM emulation (linkedom, WebGL replaced),
// the app's own listeners, frame by frame: not a browser or GPU check.
import test from 'node:test';import assert from 'node:assert/strict';import {bootApp} from './integration-harness.js';
import {SEAM_Z} from '../zoom-ladder.js';
// OrbitControls scales a pan by the canvas's client size, which linkedom leaves at 0: give it the phone's.
const ready=async()=>{const a=await bootApp({fakeClock:true});for(const [k,v] of [['clientWidth',412],['clientHeight',915]])Object.defineProperty(a.canvas,k,{configurable:true,value:v});a.step(40);return a;};
// One pinch: fingers 260 px apart close to 80 px over 12 moves, their midpoint sliding sideways and down as real fingers do.
function pinchOut(a,{x0=206,y0=430,drift=5}={}){const c=a.canvas,P=(t,id,x,y)=>a.pe(t,x,y,{id,type:'touch'});
 let l=x0-130,r=x0+130,y=y0;c.dispatchEvent(P('pointerdown',1,l,y));c.dispatchEvent(P('pointerdown',2,r,y));a.step(1);
 for(let s=0;s<12;s++){l+=7.5+drift;r-=7.5-drift;y+=drift*0.6;c.dispatchEvent(P('pointermove',1,l,y));c.dispatchEvent(P('pointermove',2,r,y));a.step(1);}
 c.dispatchEvent(P('pointerup',2,r,y));c.dispatchEvent(P('pointerup',1,l,y));a.step(2);}
test('repeated real pinches (moving midpoint) zoom out of the Solar System into the Stars; the centre stays on the Sun',async()=>{
 const a=await ready();let n=0,maxZ=-Infinity;
 for(;n<60&&a.lab.state.value.view!=='stars';n++){pinchOut(a);maxZ=Math.max(maxZ,a.lab.Z);}
 for(let i=0;i<60&&(a.lab.bridge||a.lab.animating);i++)a.step(1);
 assert.equal(a.lab.state.value.view,'stars',`reached the Stars (after ${n} pinches; furthest Z ${maxZ.toFixed(3)}, seam opens at ${SEAM_Z['solar>stars'][0].toFixed(3)})`);
 assert.equal(a.errors.length,0);
});
test('a pinch does not pan the Solar view: the centre does not move under two fingers',async()=>{
 const a=await ready();const t0=a.app.controls.target.clone();pinchOut(a,{drift:12});for(let i=0;i<20;i++)a.step(1);
 assert.ok(a.app.controls.target.distanceTo(t0)<1e-9,`centre moved by ${a.app.controls.target.distanceTo(t0)}`);
 assert.equal(a.errors.length,0);
});
test('wheel out from an off-centre Solar view (centre panned away from the Sun) still reaches the Stars',async()=>{
 const a=await ready();const c=a.app.controls,cam=a.app.camera;
 // Pan the centre 30 units sideways (as a right-drag or an older two-finger pan would), then zoom out by wheel.
 const off=new (c.target.constructor)(30,0,-12);c.target.add(off);cam.position.add(off);c.update();a.step(2);
 assert.ok(a.app.solarOffCentre?.()===undefined||c.target.length()>1,'starts off-centre');
 const wheel=dy=>{const e=new a.window.Event('wheel',{cancelable:true});Object.assign(e,{deltaY:dy,deltaMode:0});a.canvas.dispatchEvent(e);};
 for(let i=0;i<900&&a.lab.state.value.view!=='stars';i++){wheel(120);a.step(1);}
 assert.equal(a.lab.state.value.view,'stars','reached the Stars');assert.equal(a.errors.length,0);
});
