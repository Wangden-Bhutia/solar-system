// Shared harness: the REAL index.html, app.js, OrbitControls, lab.js, sheet.js and
// voice player wired together in linkedom (DOM emulation, not a browser). Only the
// WebGL renderer, procedural textures and 2D canvas are replaced.
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import {parseHTML} from 'linkedom';
import * as THREE from '../vendor/three.module.min.js';
export async function bootApp({width=412,height=915,stored={},seed=1}={}){
 const {window,document}=parseHTML(fs.readFileSync('index.html','utf8'));
 const selections=new WeakMap();Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return selections.get(this)??this.querySelector('option')?.textContent??'';},set(v){selections.set(this,v);}});
 const rect=(l,t,w,h)=>({left:l,top:t,width:w,height:h,right:l+w,bottom:t+h,x:l,y:t});
 const canvas=document.getElementById('c');
 canvas.getBoundingClientRect=()=>rect(0,0,width,height);
 document.getElementById('stage').getBoundingClientRect=()=>rect(0,0,width,height);
 const sheetHeights={closed:0,peek:200,half:height*.52,full:height-80};
 const sheet=document.getElementById('sheet');sheet.getBoundingClientRect=()=>{const h=sheetHeights[sheet.dataset.state];return rect(0,height-h,width,h);};
 const captured=new Set();canvas.setPointerCapture=id=>captured.add(id);canvas.releasePointerCapture=id=>captured.delete(id);canvas.hasPointerCapture=id=>captured.has(id);
 const proto=window.HTMLElement.prototype;if(!proto.focus)proto.focus=function(){};
 // linkedom has no PointerEvent: a minimal one with the standard init dictionary.
 class PointerEvent extends window.Event{constructor(type,init={}){super(type,init);const d={clientX:0,clientY:0,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:0,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,...init};for(const k of Object.keys(d))if(k!=='bubbles'&&k!=='cancelable')Object.defineProperty(this,k,{value:d[k]});Object.defineProperty(this,'pageX',{value:d.clientX});Object.defineProperty(this,'pageY',{value:d.clientY});}}
 const storage={...stored};let frame;const errors=[];
 class Renderer{constructor(){this.domElement=canvas;}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}setScissorTest(){}setScissor(){}setViewport(){}setClearColor(){}clear(){}}
 const textures={tex:name=>['Moon','Earth','Mars','Mercury'].includes(name)?{map:new THREE.Texture(),bump:new THREE.Texture()}:new THREE.Texture(),rimShell:()=>new THREE.Object3D(),ringGeometry:()=>new THREE.RingGeometry(1,2),saturnRingTex:()=>new THREE.Texture(),uranusRingTex:()=>new THREE.Texture(),SATURN_RING:{inner:1.2,outer:2.3},URANUS_RING:{inner:1.5,outer:2}};
 // Every element can hand out a no-op 2D context (sprite glow, band textures).
 const ctx2d=new Proxy({},{get:(t,k)=>k==='createRadialGradient'||k==='createLinearGradient'?()=>({addColorStop(){}}):k==='createImageData'?(w,h)=>({data:new Uint8ClampedArray(w*h*4)}):()=>{}});
 window.HTMLCanvasElement.prototype.getContext=()=>ctx2d;
 const g={document,window,navigator:{userAgent:'node'},innerWidth:width,innerHeight:height,devicePixelRatio:2.625,performance,console,setTimeout,clearTimeout,
  localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=String(v);}},
  requestAnimationFrame:fn=>{frame=fn;},addEventListener:()=>{},removeEventListener:()=>{},matchMedia:()=>({matches:false,addEventListener(){}}),
  Event:window.Event,HTMLElement:window.HTMLElement,PointerEvent};
 // Planets start at random orbital angles; seed them so a failure can be replayed.
 let r=seed>>>0;const random=()=>{r=(r+0x6D2B79F5)>>>0;let t=r;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 g.Math=Object.assign(Object.create(Math),{random});
 const context=vm.createContext(g);g.globalThis=g;g.self=g;window.__errors=errors;
 const cache=new Map();
 const link=async(spec,ref)=>{
  const id=ref?.identifier||'index';
  if(spec.includes('three.module'))return syn('three',{...THREE,WebGLRenderer:Renderer});
  if(spec.endsWith('textures.js'))return syn('textures',textures);
  const file=path.normalize(path.join(path.dirname(id==='index'?'./x':id),spec));
  if(cache.has(file))return cache.get(file);
  const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;
 };
 const syn=(key,obj)=>{if(cache.has(key))return cache.get(key);const m=new vm.SyntheticModule(Object.keys(obj),function(){for(const[k,v]of Object.entries(obj))this.setExport(k,v);},{context});cache.set(key,m);return m;};
 const entry=await link('./lab.js');await entry.link(link);await entry.evaluate();
 const app=cache.get('app.js').namespace,lab=window.__lab;
 let t=performance.now();const step=(n=1)=>{for(let i=0;i<n;i++)frame(t+=50);};
 const pe=(type,x,y,o={})=>new PointerEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:o.id??1,pointerType:o.type??'touch',buttons:type==='pointerup'||type==='pointercancel'?0:1});
 const click=(target,x,y)=>{const e=new window.Event('click',{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y});target.dispatchEvent(e);};
 // A browser tap: pointerdown, optional moves, pointerup (OrbitControls has captured the pointer, so
 // all go to the canvas), then click. Same listeners the app registers; nothing is called directly.
 const tapAt=(x,y,o={})=>{const target=o.target||canvas;target.dispatchEvent(pe('pointerdown',x,y,o));const dx=o.move||0;if(dx)target.dispatchEvent(pe('pointermove',x+dx,y,o));target.dispatchEvent(pe(o.cancel?'pointercancel':'pointerup',x+dx,y,o));if(!o.cancel)click(target,x+dx,y);};
 const screenOf=name=>{const b=app.bodies.find(b=>b.data.name===name);const p=b.mesh.getWorldPosition(new THREE.Vector3()).project(app.camera);return [(p.x+1)/2*width,(1-p.y)/2*height,p.z];};
 return {window,document,canvas,app,lab,step,tapAt,pe,click,PointerEvent,screenOf,storage,errors,$:id=>document.getElementById(id),get sheet(){return sheet.dataset.state;}};
}
