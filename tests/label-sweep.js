// Label sweep through the whole continuous zoom (Solar System → Universe → back) in the DOM emulation, counting
// what a viewer would see as clutter: two visible label boxes that intersect, a label box on the top controls, the
// open sheet, the time bar or the scale readout, and flicker (a label that comes back within 3 steps of going).
// Boxes come from the labels' own transforms and widths (no layout in linkedom); control boxes from
// tests/phone-layout.js. Model of the page's geometry, not a browser measurement.
import {bootApp} from './integration-harness.js';import {phoneLayout} from './phone-layout.js';
export async function labelSweep({N=320,zMax=26.2,W=412,H=915,onStep=null}={}){
 const a=await bootApp({fakeClock:true,layout:phoneLayout});a.step(40);const L=a.lab,doc=a.document,body=doc.body,labelsEl=doc.getElementById('labels');
 const parse=el=>{const t=el.style.transform||'';let m=/translate\(([-\d.]+)px,([-\d.]+)px\) translate\(-50%,calc\(-100% - ([-\d.]+)px\)\)/.exec(t);if(m)return[+m[1],+m[2],+m[3],0];m=/translate\(([-\d.]+)px,([-\d.]+)px\) translate\(-50%,([-\d.]+)px\)/.exec(t);return m?[+m[1],+m[2],+m[3],1]:null;};
 function visible(){const space=body.classList.contains('space-mode'),bridging=body.classList.contains('bridging'),out=[];if(labelsEl.classList.contains('off'))return out;
  for(const el of labelsEl.querySelectorAll('.lbl')){if(el.hidden||el.style.visibility==='hidden')continue;const isSpace=el.classList.contains('space');if(isSpace?!(space||bridging):(space||bridging))continue;if(+(el.style.opacity||1)<=0.02)continue;
   let box;if(!isSpace){if(!el.dataset.box)continue;box=el.dataset.box.split(',').map(Number);}else{const p=parse(el);if(!p)continue;const w=el.textContent.length*5.4+12;box=p[3]?[p[0]-w/2,p[1]+p[2],p[0]+w/2,p[1]+p[2]+13]:[p[0]-w/2,p[1]-p[2]-13,p[0]+w/2,p[1]-p[2]];}
   out.push({el,text:el.textContent,box,anchor:el.classList.contains('anchor')});}return out;}
 const r2a=r=>[r.left,r.top,r.right,r.bottom];
 function obstacles(){const o=[['top controls',[0,0,W,88]]];const hud=doc.getElementById('hud');if(hud&&!hud.hidden&&!body.classList.contains('time-resting')){const r=hud.getBoundingClientRect();if(r.width)o.push(['HUD',r2a(r)]);}
  const gt=doc.getElementById('gtime');if(gt&&!gt.hidden&&!body.classList.contains('bridging'))o.push(['time bar',r2a(gt.getBoundingClientRect())]);
  const sh=doc.getElementById('sheet');if(sh.dataset.state!=='closed'&&!body.classList.contains('bridging'))o.push(['sheet',r2a(sh.getBoundingClientRect())]);return o;}
 const hit=(p,q)=>p[0]<q[2]&&p[2]>q[0]&&p[1]<q[3]&&p[3]>q[1];
 const st={steps:0,pairs:0,obstacle:0,flicker:0,maxVisible:0,byKind:{}},last=new Map();
 function check(Z,dir,step){const ls=visible(),ob=obstacles();st.steps++;st.maxVisible=Math.max(st.maxVisible,ls.length);const lvl=L.bridge?L.bridge.pair:L.state.value.view;
  for(let i=0;i<ls.length;i++){for(let j=i+1;j<ls.length;j++)if(hit(ls[i].box,ls[j].box)){st.pairs++;const k=`${lvl}: ${ls[i].text} × ${ls[j].text}`;st.byKind[k]=(st.byKind[k]||0)+1;}
   for(const [n,r] of ob)if(hit(ls[i].box,r)){st.obstacle++;const k=`${lvl}: ${ls[i].text} × ${n}`;st.byKind[k]=(st.byKind[k]||0)+1;}}
  // flicker: visible at step s-k, hidden in between, visible again at s, with k ≤ 3
  const now=new Set(ls.map(l=>l.el));for(const el of now){const h=last.get(el);if(h&&h.off!=null&&step-h.off<=3&&h.offFrom!=null){st.flicker++;const k=`${lvl}: flicker ${el.textContent}`;st.byKind[k]=(st.byKind[k]||0)+1;}last.set(el,{on:step,off:null});}
  for(const [el,h] of last)if(!now.has(el)&&h.off==null){h.off=step;h.offFrom=h.on;}
  onStep?.({Z,dir,ls,ob,lvl,doc,L});}
 for(let i=0;i<60;i++)a.step(1);
 const z0=L.Zcam;let s=0;check(z0,'start',s);
 for(let i=1;i<=N;i++){const Z=z0+(zMax-z0)*i/N;L.placeZ(Z);a.step(1);check(Z,'out',++s);}
 for(let i=1;i<=N;i++){const Z=zMax+(z0-zMax)*i/N;L.placeZ(Z);a.step(1);check(Z,'in',++s);}
 return {z0,zMax,...st,errors:a.errors.length,a};
}
