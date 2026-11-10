// White piles (A1 Stars → Galaxy, the Milky Way disc, A2 Laniakea → Universe), measured with the CPU light model of
// the app's own scene graphs (tests/light-model.js): DOM emulation and a CPU splat, NOT GPU pixels or a device.
// Each check names the cause it guards; "before" numbers in comments are this model on main aaf1098.
import test from 'node:test';import assert from 'node:assert/strict';import {lightModel} from './light-model.js';
import * as lod from '../lod.js';import * as T from '../transition.js';import * as G from '../galaxy-data.js';
const LIMIT=0.5; // % of the central 50% × 50% of the view that may be pure white
async function built(){const m=await lightModel(),go=l=>{m.a.document.querySelector(`#ladder [data-level="${l}"]`).onclick();for(let i=0;i<8000&&(m.L.state.value.view!==(l==='solar'?'explore':l)||m.L.animating||m.L.bridge);i++)m.a.step(1);};
 go('universe');go('solar');const S=m.scenes();m.lods=Object.values(S).map(s=>s.userData.lod).filter(Boolean);m.S=S;return m;}
test('whole zoom, Solar System to Universe (Z −6 … 25.5, 0.25 steps): pure white stays under 0.5% of the centre everywhere',async()=>{
 const m=await built();let worst={white:-1};
 for(let Z=-6;Z<=25.5+1e-9;Z+=0.25){const r=await m.at(Z);if(r.white>worst.white)worst=r;}
 // main aaf1098 in this model: 4.81% (Z 22.2, Laniakea→Universe), 3.83% (Z 8.1, Milky Way), 3.46% (Z 23, Universe)
 assert.ok(worst.white<LIMIT,`worst ${worst.white}% at Z ${worst.Z} (${worst.seam||worst.view}; ${worst.top.join(', ')})`);
 assert.equal(m.a.errors.length,0);
});
test('A2: the NGC/IC catalogue and its copy get the 1/D² flux dimming (switching it off brings the pile back)',async()=>{
 const m=await built(),after=await m.at(22.2);assert.ok(after.white<LIMIT,`after ${after.white}%`);
 for(const l of m.lods)for(const e of l.entries)for(const it of e.objs)if(it.N)it.flux=false; // the old rule: catalogues with a count skipped it
 const before=await m.at(22.2);assert.ok(before.white>2,`flux off: ${before.white}% (the cause reproduced)`);
});
test('A1: the HYG completeness fade and marker merging keep the Stars → Galaxy centre clear (off: brighter)',async()=>{
 const m=await built(),after=await m.at(6.4);assert.ok(after.white<LIMIT,`after ${after.white}%`);
 for(const s of [m.S.stars,m.S.galaxy])s.traverse(o=>{if(o.userData.layer==='hyg')o.material.userData.hygR=Object.defineProperty({},'value',{get:()=>T.HYG_RMIN,set(){}});});
 for(const l of m.lods)l.glows.length=0;
 const before=await m.at(6.4);assert.ok(before.white>after.white*2,`completeness + merging off: ${before.white}% vs ${after.white}%`);
});
test('Milky Way disc: no white peak in the settled Galaxy (main: 3.83% at Z 8.1, 2.36% at Z 8.2 in this model)',async()=>{
 const m=await built();for(const Z of [8.1,8.2,9,10.5]){const r=await m.at(Z);assert.ok(r.white<LIMIT,`Z ${Z}: ${r.white}%`);}
});
test('HYG completeness (pure maths): the kept subset from outside is volume-complete to 1,000 ly and no star is brightened',()=>{
 const s=T.hygStars();let kept=0,full=0;
 for(let i=0;i<s.count;i++){const dl=T.completeLy(s.mag[i],s.ly[i]),w=T.hygWeight(dl,T.HYG_FIELD_LY),M=s.mag[i]-5*Math.log10(s.ly[i]/3.26156/10);
  assert.ok(w>=0&&w<=1);assert.equal(T.hygWeight(dl,T.HYG_RMIN),dl>=T.HYG_RMIN?1:T.hygWeight(dl,T.HYG_RMIN),'inside the Solar System every star is drawn');
  if(w>=1){full++;assert.ok(M<=-0.93+0.01,`full weight only if complete to 1,000 ly (M ${M.toFixed(2)})`);}if(w>0)kept++;}
 assert.equal(full,977);assert.ok(kept>=full);
 // Surface density in the Galactic plane (stars per area within |z| < 300 ly: the disc's flattening is real), in
 // 200-ly rings out to 1,000 ly. The full sample falls ~80× from the centre ring to the edge (the selection effect);
 // the kept subset stays within ±35% of its mean (measured: 223, 276, 298, 205, 161 per million ly²).
 const edges=[0,200,400,600,800,1000],ring=[0,0,0,0,0],all=[0,0,0,0,0];
 for(let i=0;i<s.count;i++){const [l,b]=G.toGalactic(s.ra[i],s.dec[i]),d=s.ly[i],z=d*Math.sin(b*Math.PI/180),R=d*Math.cos(b*Math.PI/180);if(Math.abs(z)>=300||R>=1000)continue;
  const k=edges.findIndex((e,j)=>R>=e&&R<edges[j+1]);all[k]++;if(T.hygWeight(T.completeLy(s.mag[i],d),T.HYG_FIELD_LY)>=1)ring[k]++;}
 const dens=c=>c.map((n,k)=>n/(Math.PI*(edges[k+1]**2-edges[k]**2))),dk=dens(ring),da=dens(all),mean=dk.reduce((x,y)=>x+y)/dk.length;
 assert.ok(da[0]/da[4]>50,`full sample: centre/edge ${(da[0]/da[4]).toFixed(0)}× (selection effect present in the data)`);
 for(const v of dk)assert.ok(Math.abs(v/mean-1)<0.35,`kept subset ring density ${(v/mean).toFixed(2)} × mean`);
});
test('marker merging never brightens and conserves light: apart → sum of members, on top of each other → the brightest',()=>{
 const n=3,sx=new Float64Array([0,0.5,1]),sy=new Float64Array([0,0,0]),L=new Float64Array([3,2,1]),o=new Int32Array(n),k=new Float64Array(n);
 lod.mergeGroups(n,sx,sy,L,o,k);let drawn=0;for(let i=0;i<n;i++){assert.ok(k[i]<=1&&k[i]>=0);drawn+=L[i]*k[i];}
 assert.equal(k[0],1,'the brightest is kept');assert.ok(drawn<=6&&drawn>=3-1e-9,`stacked: drawn ${drawn} between brightest 3 and sum 6`);
 const far=new Float64Array([0,500,1000]);lod.mergeGroups(n,far,sy,L,o,k);assert.deepEqual([...k],[1,1,1],'far apart: all drawn in full');
});
