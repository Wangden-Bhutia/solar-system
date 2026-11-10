// The light model used by tests/light.test.js: the app's real scene graphs (DOM emulation, WebGL replaced) splatted
// on the CPU as the GPU would blend them (tests/model-splat.js: additive or max blend, sRGB-encoded, DPR 2, 412 × 915).
// "white" is the share of pure-white pixels (all channels ≥ 250/255) in the central 50% × 50% of the view. A model
// of what the app submits, not GPU pixels: it is what the browser sweep cross-checks, not a substitute for it.
import {bootApp} from './integration-harness.js';import {createSplat,PROFILES} from './model-splat.js';
export async function lightModel(){
 let SP=null,rec=false;
 const a=await bootApp({fakeClock:true,onRender:(s,c)=>{if(rec)SP.draw(s,c,PF,nameOf,{perLayer:true});}});a.step(40);const L=a.lab;
 const scenes=()=>({stars:L.starsView.scene,galaxy:L.galaxyView.scene,local:L.localView.scene,super:L.sceneOf('super')?.scene,universe:L.sceneOf('universe')?.scene});
 let PF=null;const profiles=()=>{const map=new Map(),s=scenes();s.stars.traverse(o=>{if(o.isSprite&&o.material.map)map.set(o.material.map,PROFILES.sky);});s.galaxy.traverse(o=>{if(o.isSprite&&o.material.map&&!map.has(o.material.map))map.set(o.material.map,PROFILES.galaxy);});for(const k of ['local','super','universe'])s[k]?.traverse(o=>{if(o.isSprite&&o.material.map&&!map.has(o.material.map))map.set(o.material.map,PROFILES.cosmos);});return o=>map.get(o.material.map)||PROFILES.cosmos;};
 const nameOf=o=>{const s=scenes();let r=o;while(r.parent)r=r.parent;const sc=Object.keys(s).find(k=>s[k]===r)||'solar';return `${sc}:${o.userData.layer||(o.isSprite?'sprites':'points')}${o.userData.proxyOf?'(copy)':''}`;};
 async function at(Z){const z0=L.Zcam;const n=Math.max(1,Math.ceil(Math.abs(Z-z0)/0.05));for(let i=1;i<=n;i++){L.placeZ(z0+(Z-z0)*i/n);a.step(1);}
  SP=createSplat();PF=profiles();rec=true;a.step(1);rec=false;const r=SP.report(8);return {Z,seam:L.bridge?.pair??null,view:L.state.value.view,white:r.whiteCentrePct,top:r.layers.slice(0,3).map(l=>l.layer)};}
 return {a,L,scenes,at};
}
