import { bodies, focus, unfocus, hooks, renderer, controls, setHomeScope, fitHomeDistance, homeRadius, homeDirection } from './app.js';
import { createStars } from './stars.js';
import { frameOf, eclToGal, galToEcl, seamUp } from './frames.js';
import { showLabel, labelWidth, frameEvict, setExclusions } from './labels.js';
import { createGalaxy } from './galaxy.js';
import { createLocal } from './local.js';
import { createLaniakea, createUniverse } from './cosmos.js';
import { COSMOS_FACTS, SHELLS, CMB_GLY } from './cosmos-data.js';
import { LOCAL_FACTS, distanceBetween } from './local-data.js';
import { GALAXY_FACTS, R0 } from './galaxy-data.js';
import { viewWidth, hudText } from './hud.js';
import { STAR_TIME, yearsLabel, approachLabel } from './star-motion.js';
import { pairOf, periastron, apastron, nextPeriastron, keplerMass } from './star-pairs.js';
import { TIME_RANGE, timeLabel, lapsLabel, milestone, VC_SUN, OMEGA_ARMS, OMEGA_BAR, SUN_PERIOD } from './galaxy-motion.js';
import { LEVELS, levelIndex, PAIRS, pairFor, SEAMS, SEAM_Z, LEVEL_NAMES, layoutAt, zOf, dOf, UNIT_LY, AU_LY, solarZ, solarUnits, viewRate, smooth, auToUnits, metricBlend } from './zoom-ladder.js';
import { SAFE as LABEL_SAFE } from './labels.js';
import { camera, drawSolar, setSolarDistance, solarDistance, solarBusy, isRealScale, solarFocused, solarEdge,solarHome, solarOffCentre, solarDrift, solarAnchor, solarCamera, hideSunLabel } from './app.js';
import { createZoomController, wheelZ, pinchZ } from './zoom.js';
import { createZoomLog } from './zoomlog.js';
import { STAR_FACTS, habitableZone, sizeFromMass, lightLeftYear } from './stars-data.js';
import { createExperiments } from './experiments.js';
import { createLabState } from './lab-state.js';
import { createTour, mountTour, TOUR_STOPS } from './tour.js';
import { swipe, emptyTap, openHeight, classifyDrag, visibleRegion } from './sheet.js';
import { seasonGeometry, daylightHours, noonAltitude, phaseGeometry, phaseName, weightNewtons, NEARBY, wrap } from './science.js';
import { INSIGHTS, STRIKING, genericInsight, NASA, CHECKED, MOON_COUNT, SAT_SOURCES, JPL_RADII, DWARF_SOURCES, SBDB } from './insights.js';
import { LINES, VOICE } from './voice/lines.js';
import { createVoicePlayer } from './voice-player.js';
import { PREDICTIONS, judge, JOURNEYS, VOYAGE, journey, canAdvance, eclipseGeometry, tideLabel, tideRange, scaleWalk, sizeLike, formatMetres, formatDuration, lightSeconds, sunlightTo, AU_KM, FOOTBALL_CM, MOON_INCLINATION } from './learn.js';
// Labs drawn in their own 3D scene; the scale lab keeps the live Solar System behind the sheet.
const SCENE_LABS=new Set(['seasons','phases','eclipses','tides']);
const LAB_TITLES={seasons:'Why do seasons happen?',phases:'Explore the phases',eclipses:'Why aren’t eclipses monthly?',tides:'What makes the tides?',scale:'How big is space?'};
let labScene=null;
const $=id=>document.getElementById(id), state=createLabState(), experiments=new Proxy({},{get:(_,k)=>(labScene||=createExperiments(renderer))[k]}); // the labs' 3D scene is built the first time a lab opens
const sheet=$('sheet');
// ---- Beyond the Solar System: the nearby stars and their planets ----
const SPACE=new Set(['stars','system','pair','galaxy','local','super','universe']);
const ORBITS=new Set(['system','pair']); // close-up views inside the star map: planets, or two stars orbiting each other
const levelOf=v=>v==='universe'||v==='super'||v==='local'?v:v==='galaxy'?'galaxy':v==='stars'||ORBITS.has(v)?'stars':'solar';
const starsView=createStars({renderer,canvas:$('c'),labelsEl:$('labels'),onPick:e=>pickStar(e),onTime:()=>paintTime(),onPair:()=>paintPairClock()});
let shownLevel='solar',arrival=null;
const galaxyView=createGalaxy({renderer,canvas:$('c'),labelsEl:$('labels'),onPick:m=>pickLandmark(m),onTime:()=>paintTime()});
const localView=createLocal({renderer,canvas:$('c'),labelsEl:$('labels'),onPick:g=>pickGalaxy(g),galaxy:galaxyView});
// The two largest scales are built only when first visited: they hold the most points and most people start small.
const lazy=make=>{let v=null;const f=()=>v||(v=make());f.built=()=>!!v;return f;};
const built=l=>l==='super'?laniakeaView.built():l==='universe'?universeView.built():true;
const laniakeaView=lazy(()=>createLaniakea({renderer,canvas:$('c'),labelsEl:$('labels'),onPick:x=>pickCosmos('super',x),local:localView}));
const universeView=lazy(()=>createUniverse({renderer,canvas:$('c'),labelsEl:$('labels'),onPick:x=>pickCosmos('universe',x)}));
const sceneOf=l=>l==='stars'?starsView:l==='galaxy'?galaxyView:l==='local'?localView:l==='super'?laniakeaView():l==='universe'?universeView():null;
// Once the app has settled, build the far scales and compile every scene's shaders in idle moments, one
// step at a time, so the first zoom into a new scale never stalls on that work mid-gesture.
const idle=f=>(globalThis.requestIdleCallback?requestIdleCallback(f,{timeout:3000}):setTimeout(f,120));
function prewarm(){const steps=[()=>laniakeaView(),()=>universeView(),...['stars','galaxy','local','super','universe'].map(l=>()=>{const v=sceneOf(l);try{renderer.compile(v.scene,v.camera);}catch{}})];
 const run=()=>{const f=steps.shift();if(!f)return;f();idle(run);};idle(run);}
if(typeof globalThis.requestAnimationFrame==='function'&&typeof setTimeout==='function')setTimeout(prewarm,2500);
// ---- Time at the big scales: one clock bar, in thousands of years for the stars (star-motion.js)
// and millions for the Milky Way (galaxy-motion.js). Each scene keeps its own clock; leaving a scale
// (or zooming across a seam) first returns it to today, because every map is drawn as the sky is now.
const gtime=$('gtime'),gslider=$('gslider');
let timeText='';
const clockLevel=()=>{const v=state.value.view;return v==='galaxy'?'galaxy':v==='stars'?'stars':null;};
const clockOf=l=>l==='galaxy'?galaxyView:l==='stars'?starsView:null;
function paintTime(){const l=clockLevel(),c=clockOf(l);if(!c)return;const t=c.time(),p=c.playing(),g=l==='galaxy';
 let clock,note;
 if(g){clock=timeLabel(t);note=milestone(t)||(Math.abs(t)<0.5?'Press play to watch the Galaxy turn.':lapsLabel(t));}
 else{clock=yearsLabel(t);const n=c.nearest();note=n.entry?`${Math.abs(t)<50?'Nearest star now':'Nearest star'}: ${n.entry.name}, ${fmt(n.ly,1)} light-years`+(Math.abs(t)<50&&!p?' · press play to watch the stars drift':''):'';}
 const range=g?TIME_RANGE:STAR_TIME;gslider.min=range[0];gslider.max=range[1];gslider.step=g?1:100;
 gslider.setAttribute('aria-label',g?'Time, in millions of years from today':'Time, in years from today');
 if(document.activeElement!==gslider)gslider.value=String(Math.round(t));gslider.setAttribute('aria-valuetext',clock);
 const text=[l,clock,note,p].join('|');if(text===timeText)return;timeText=text;
 $('gclock').textContent=clock;$('gnote').textContent=note;$('gplay').dataset.state=p?'playing':'paused';$('gplay').setAttribute('aria-label',p?'Pause time':g?'Play time: watch the Galaxy turn':'Play time: watch the stars drift');$('gnow').hidden=Math.abs(t)<(g?0.5:50);gtime.setAttribute('aria-label',g?'Time in the Milky Way':'Time among the nearby stars');}
$('gplay').onclick=()=>{const c=clockOf(clockLevel());if(!c)return;if(c.playing())c.pause();else{dismissHint();c.play();}paintTime();};
gslider.oninput=()=>{const c=clockOf(clockLevel());if(!c)return;dismissHint();c.setTime(Number(gslider.value));paintTime();};
$('gnow').onclick=()=>{clockOf(clockLevel())?.rewind();paintTime();};
// ---- One continuous zoom across every scale (zoom.js holds Z; zoom-ladder.js maps it) ----
// Z = ln(camera distance in light-years) is the single zoom coordinate. The wheel and pinch move it with one
// gain everywhere (zoom.js); each frame the active scene's camera is placed from Z in its own units. Inside a
// seam (an interval of Z) both scenes are drawn, each camera at the same Z, seen from the same direction
// around the same centre (÷ k at the metric seams); the blend t comes from Z. Leaving the seam at either end
// arrives in that scale with the camera exactly where it was.
const reduceMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const smoothFrames=()=>typeof globalThis.requestAnimationFrame==='function'&&!reduceMotion();
const zoom=createZoomController({reduced:reduceMotion});
let bridge=null,animating=false,Zc=0,animGen=0,tourRef=null,tourUi=null,tourGen=0,tourWait=null; // animGen: a glide is cancelled (the tour's halt) by moving it on
const views={solar:{view:'explore',feature:'orbit'},stars:{view:'stars'},galaxy:{view:'galaxy'},local:{view:'local'},super:{view:'super'},universe:{view:'universe'}};
const viewDirOf=l=>l==='solar'?camera.position.clone().sub(controls.target).normalize():sceneOf(l).viewDir();
const real=()=>!!isRealScale?.();
const unitsOf=(l,Z)=>l==='solar'?solarUnits(Math.exp(Z),real()):dOf(l,Z);
const distOf=l=>l==='solar'?solarDistance():sceneOf(l).zoomState().d;
const zOfLevel=(l,d=distOf(l))=>l==='solar'?solarZ(d,real()):zOf(l,d);
function placeLevel(l,Z){const d=unitsOf(l,Z);if(l==='solar')setSolarDistance(d);else sceneOf(l).setDistance(d);}
function setLive(l,v){if(l!=='solar')sceneOf(l).liveLabels?.(v);}
// Inside a seam both scales are drawn, each object fading by its own rule (lod.js): no veil, no whole-scene fade.
// Stars ⇄ Milky Way also turns frames: the star map is drawn in ecliptic coordinates and the Galaxy in galactic ones
// (frames.js), so the viewing direction is converted and both cameras share one "up" that turns from the
// ecliptic pole to the Galactic pole across the seam; the two pictures stay aligned on screen.
const seamIn={role:'inner',t:0},seamOut={role:'outer',t:0},upTmp={x:0,y:0,z:0},upEcl={x:0,y:0,z:0};
// bridge.dir is in the frame of the scale the bridge started from; this gives it in level l's frame.
const dirTmp={x:0,y:0,z:0};
function dirFor(l){const out=dirTmp,d=bridge.dir;out.x=d.x;out.y=d.y;out.z=d.z;if(frameOf(l)!==bridge.frame){if(frameOf(l)==='gal')eclToGal(out,out);else galToEcl(out,out);}return out;}
function drawBridge(){
 if(!bridge)return;
 const r=$('stage').getBoundingClientRect(),[i,o]=PAIRS[bridge.pair],t=bridge.t;seamIn.t=t;seamOut.t=t;
 if(bridge.pair==='stars>galaxy'){seamUp(t,upTmp);galToEcl(upTmp,upEcl);starsView.setUp(upEcl);galaxyView.setUp(upTmp);}
 if(i==='solar'){setSolarDistance(unitsOf('solar',Zc));drawSolar(seamIn);}
 else{sceneOf(i).setView(dirFor(i),unitsOf(i,Zc),bridge.tgt||undefined);sceneOf(i).render(r.width,r.height,null,{seam:seamIn});}
 sceneOf(o).setView(dirFor(o),unitsOf(o,Zc),bridge.tgtOuter||undefined);sceneOf(o).render(r.width,r.height,null,{overlay:true,seam:seamOut});
 placeAnchor(i,o,t);
}
// One "you are here" anchor across a seam: it moves from one scale's anchor to the other's (the Sun, then the Milky
// Way's centre at the Local Group seam) and changes its words at the middle; each scale's own anchor label is
// hidden meanwhile, and the anchor sits exactly on it at either end.
const anchorEl=document.createElement('span');anchorEl.className='lbl space anchor';anchorEl.setAttribute('aria-hidden','true');anchorEl.hidden=true;$('labels').appendChild(anchorEl);
const anchorItem={el:anchorEl},aIn={x:0,y:0,off:0,text:''},aOut={x:0,y:0,off:0,text:''},anchorNow={x:NaN,y:NaN,text:''};
const anchorOf=(l,out,b)=>l==='solar'?!!solarAnchor?.(out,b):!!sceneOf(l).anchor?.(out,b);
function placeAnchor(i,o,t){
 const b=$('c').getBoundingClientRect(),okI=anchorOf(i,aIn,b),okO=anchorOf(o,aOut,b);
 if(!okI&&!okO){showLabel(anchorItem,false);anchorNow.x=NaN;return;}
 const k=smooth(t),A=okI?aIn:aOut,B=okO?aOut:aIn,x=A.x+(B.x-A.x)*k,y=A.y+(B.y-A.y)*k,off=A.off+(B.off-A.off)*k,text=t<0.5?A.text:B.text;
 if(anchorEl.textContent!==text)anchorEl.textContent=text;
 showLabel(anchorItem,true,x,y,Math.round(off*10)/10,1);claimAnchor(x,y,Math.round(off*10)/10);anchorNow.x=x;anchorNow.y=y;anchorNow.text=text;
}
function placeAnchorFrom(l){const b=$('c').getBoundingClientRect();if(!anchorOf(l,aIn,b))return;if(anchorEl.textContent!==aIn.text)anchorEl.textContent=aIn.text;showLabel(anchorItem,true,aIn.x,aIn.y,Math.round(aIn.off*10)/10,1);claimAnchor(aIn.x,aIn.y,Math.round(aIn.off*10)/10);anchorNow.x=aIn.x;anchorNow.y=aIn.y;anchorNow.text=aIn.text;}
// The anchor matters most: it takes its box in the frame's one label placement and hides any name under it.
function claimAnchor(x,y,off){const w=labelWidth(anchorItem);frameEvict(anchorItem,x-w/2,y-off-13,x+w/2,y-off);}
function hideAnchor(){showLabel(anchorItem,false);anchorNow.x=NaN;anchorNow.text='';}
// Each scale's centre of view crosses the seam with it (the Galaxy may be centred on the Sun or on its own centre).
// Stars ⇄ Galaxy always meets at the Sun, so it carries no centre.
function bridgeTarget(pair,cur){
 if(pair==='solar>stars'||pair==='stars>galaxy')return null;
 const [i,o]=PAIRS[pair],k=SEAMS[pair].k;return cur===i?sceneOf(i).controls.target.clone():sceneOf(o).controls.target.clone().multiplyScalar(k);
}
function beginBridge(pair){
 if(pair==='solar>stars')hideSunLabel(); // the anchor opens at the Sun's label on this same frame
 const cur=levelOf(state.value.view);if(ORBITS.has(state.value.view)){starsView.closeSystem();state.update({view:'stars'});}
 const tgt=bridgeTarget(pair,cur),k=SEAMS[pair]?.k;
 bridge={pair,t:0,dir:viewDirOf(cur),frame:frameOf(cur),tgt,tgtOuter:tgt&&k?tgt.clone().divideScalar(k):null,dom:cur};state.update({sheet:'closed',star:null,landmark:null});
 // Only the dominant scale's names are placed while both are drawn; they swap at the middle of the seam.
 // (the current scale's names are already on: re-enabling them would hide them all for the opening frame, a blink)
 for(const l of PAIRS[pair]){if(l!==cur)showLabelsOf(l,true);setLive(l,l===cur);if(l!=='solar')sceneOf(l).hideHere?.(true);}
 document.body.classList.add('bridging');render();
 // The anchor takes over from the scene's own label on this very frame (it is placed from the current scale's
 // camera, which is up to date; the seam itself is first drawn on the next frame).
 placeAnchorFrom(cur);
}
function settle(end){
 const b=bridge,[inner,outer]=PAIRS[b.pair],target=end==='outer'?outer:inner,cur=levelOf(state.value.view);bridge=null;document.body.classList.remove('bridging');
 const other=target===inner?outer:inner;showLabelsOf(other,false);setLive(target,true);hideAnchor();
 for(const l of PAIRS[b.pair])if(l!=='solar'){sceneOf(l).hideHere?.(false);sceneOf(l).setUp?.(null);}
 const dir=frameOf(target)===b.frame?b.dir:(frameOf(target)==='gal'?eclToGal(b.dir):galToEcl(b.dir));
 // Arrive with the camera exactly where the seam left it.
 const d=unitsOf(target,Zc),tg=target===inner?b.tgt:b.tgtOuter;
 arrival=target==='solar'?{solar:true}:{dir,d,tgt:tg?.toArray()};
 if(target!==cur)state.navigate({...views[target],star:null,landmark:null,experiment:null,sheet:'closed'});
 else{arrival=null;if(target!=='solar')sceneOf(target).setView(dir,d,tg||undefined);}
 render();
}
// Put the camera at Z: inside one scale, or inside a seam (opening it, or settling out of it, as needed).
// A jump past a whole scale (never from a gesture: zoom.js caps a frame's step) crosses one seam at a time.
function placeZ(Z){
 Zc=Z;const lay=layoutAt(Z);
 for(let guard=0;guard<LEVELS.length;guard++){
  const cur=levelOf(state.value.view),ci=levelIndex(cur);
  if(bridge){const [i,o]=PAIRS[bridge.pair];
   if(lay.pair===bridge.pair)break;
   settle((lay.pair?levelIndex(PAIRS[lay.pair][0]):levelIndex(lay.level))>=levelIndex(o)?'outer':'inner');continue;}
  if(lay.pair){const [i,o]=PAIRS[lay.pair];if(cur===i||cur===o){beginBridge(lay.pair);break;}const dir=levelIndex(i)>=ci?1:-1;beginBridge(pairFor(cur,dir));settle(dir>0?'outer':'inner');continue;}
  if(lay.level===cur)break;
  const dir=levelIndex(lay.level)>ci?1:-1;beginBridge(pairFor(cur,dir));settle(dir>0?'outer':'inner');
 }
 if(bridge){bridge.t=lay.t;const [i,o]=PAIRS[bridge.pair],dom=lay.t<0.5?i:o;if(dom!==bridge.dom){setLive(bridge.dom,false);setLive(dom,true);bridge.dom=dom;}}
 else placeLevel(levelOf(state.value.view),Z);
}
// The same zoom, played automatically for the scale ladder, Back and the voyage: ONE eased move of Z from where
// the camera is to where the target scale is framed, through every seam on the way (placeZ opens and settles
// each one), at the same speed inside scenes and seams. Going in, the Milky Way and Local Group views slide their
// centre onto the Sun as Z falls through them, reaching it exactly at the seam (the scale inside is centred on the
// Sun). Instant with reduced motion or without animation frames.
const RECENTRE={galaxy:()=>galaxyView,local:()=>localView};
function animateTo(end,done){
 zoom.stop();const from=Zc,span=Math.abs(end-from),dur=Math.min(9,Math.max(1.1,0.9+span*0.28)),inward=end<from;
 let rc=null; // {level, z0, p}: the inward recentring in progress
 const recentre=Z=>{if(!inward||bridge)return;const l=levelOf(state.value.view),sc=RECENTRE[l]?.();if(!sc){rc=null;return;}
  const zs=SEAM_Z[pairFor(l,-1)][1];if(!rc||rc.level!==l)rc={level:l,z0:Math.max(Z,zs+1e-6),p:0};
  const p=Math.min(1,Math.max(0,(rc.z0-Z)/(rc.z0-zs)));if(p<=rc.p)return;sc.towardSun(rc.p<1?(p-rc.p)/(1-rc.p):1);rc.p=p;};
 const fin=()=>{animating=false;if(bridge){const [a,b]=SEAM_Z[bridge.pair];Zc=end>=b?b:a;settle(end>=b?'outer':'inner');}done?.();};
 if(!smoothFrames()){animating=true;placeZ(end);recentre(end);fin();return;}
 animating=true;let last=performance.now(),k=0;const gen=++animGen;
 const tick=now=>{if(gen!==animGen)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  k=Math.min(1,k+dt/dur);const e=k<.5?2*k*k:1-(-2*k+2)**2/2,Z=from+(end-from)*e;placeZ(Z);recentre(Z);
  if(k>=1)fin();else globalThis.requestAnimationFrame(tick);};
 globalThis.requestAnimationFrame(tick);
}
// Where a ladder trip ends: the scale's framed view (its overview distance) or, for the star map and the Milky Way,
// just past the seam it came through; home in the Solar System is the whole-system view.
function arrivalZ(target,out){
 if(target==='solar')return solarZ(solarHome?.()||solarEdge?.()||900,real());
 if(target==='local'||target==='super'||target==='universe'){const sc=sceneOf(target),d=sc.overviewDistance?.();if(out&&d)return Math.max(zOf(target,d),SEAM_Z[pairFor(target,-1)][1]+1e-6);}
 const p=pairFor(target,out?-1:1);return out?SEAM_Z[p][1]+1e-6:SEAM_Z[p][0]-1e-6;
}
// after (optional): called once the target scale is reached (the voyage uses it to act on arrival).
// A ladder tap (or a voyage step) during a trip is not dropped: the latest one is kept and run when the trip in
// progress arrives (one pending trip; a newer tap replaces it). The target pill shows data-going until arrival.
let pendingTrip=null;
const markGoing=t=>{for(const b of $('ladder').querySelectorAll('button'))if((b.dataset.level===t)!==(b.dataset.going==='true'))b.dataset.going=String(b.dataset.level===t);};
function runPending(){if(!pendingTrip||bridge||animating)return;const p=pendingTrip;pendingTrip=null;goLevel(p.target,p.after);}
function goLevel(target,after){
 if(tourRef?.active)tourRef.exit(); // a ladder tap or the voyage takes over from the tour
 const cur=levelOf(state.value.view);if(bridge||animating){pendingTrip={target,after};markGoing(target);return;}if(target===cur){markGoing(null);after?.();return;}markGoing(target);stopAudio();$('settings').open=false;zoom.stop();
 const out=levelIndex(target)>levelIndex(cur);
 const ck=clockOf(cur);if(ck&&ck.time()!==0){animating=true;ck.rewind(()=>{animating=false;if(pendingTrip)runPending();else goLevel(target,after);});return;} // back to today first: every map is drawn as the sky is now
 if(ORBITS.has(state.value.view)){starsView.closeSystem();state.update({view:'stars',sheet:'closed'});render();}
 if(state.value.sheet!=='closed'){state.update({sheet:'closed',star:null,landmark:null});render();}
 const then=()=>{markGoing(pendingTrip?.target??null);if(pendingTrip){runPending();return;}if(levelOf(state.value.view)!==target)return; // stopped on the way (a gate): nothing more
  if(after)after();else if(target==='solar')unfocus(true,0.8);else if(target==='local'||target==='super'||target==='universe')sceneOf(target).overview();};
 const play=()=>{Zc=zOfLevel(levelOf(state.value.view));animateTo(arrivalZ(target,out),then);};
 // Only a few views need a move first: a selected world (let go and centre the Sun) and a view zoomed in so far
 // off-centre that there is no room left to slide back to the Sun on the way in.
 if(cur==='solar'){if(solarFocused?.())unfocus(false);if(solarOffCentred())solarDrift?.(1e9);play();return;}
 if(!out&&RECENTRE[cur]&&!(cur==='galaxy'?galaxyView.atSun():localView.zoomState().atSun)&&zOfLevel(cur)-SEAM_Z[pairFor(cur,-1)][1]<Math.log(5)){(cur==='galaxy'?galaxyView.zoomToSun:localView.zoomBackIn)(play);return;}
 play();
}
const enterStars=()=>goLevel('stars'),leaveStars=()=>goLevel('solar'),enterGalaxy=()=>goLevel('galaxy'),leaveGalaxy=()=>goLevel('stars'),leaveLocal=()=>goLevel('galaxy');
function showLabelsOf(l,v){if(l!=='solar')sceneOf(l).showLabels(v);}
for(const b of $('ladder').querySelectorAll('button'))b.onclick=()=>goLevel(b.dataset.level);
// ---- Gestures → the zoom controller ----
function zoomState(){const l=levelOf(state.value.view);
 if(l==='solar'){if(state.value.view==='try'&&state.value.experiment)return null;return {d:solarDistance(),busy:!!solarBusy?.()};}
 if(ORBITS.has(state.value.view))return null;
 return sceneOf(l).zoomState();}
const sheetOpen=()=>state.value.sheet==='half'||state.value.sheet==='full';
// Where the zoom may go from here. A seam may be entered only with the clock at today (every map is drawn as
// the sky is now) and, going in from the Milky Way or the Local Group, with the view centred on the Sun (the next map's centre);
// at that edge the zoom stops and the clock rewinds, or the view glides to the Sun, first.
// Off the Sun by more than a millionth of the camera distance (a relative test: a damped pan's leftover, a few
// units at 10^8 units away, is not 'off-centre' and must not hold the zoom at the seam).
const solarOffCentred=()=>solarOffCentre()>1e-6*Math.max(1,solarDistance());
function zoomBounds(){
 const l=bridge?null:levelOf(state.value.view);
 const lo=lv=>{const p=pairFor(lv,-1);return p?SEAM_Z[p][0]:solarZ(controls.minDistance||0.6,real());};
 const hi=lv=>{const p=pairFor(lv,1);return p?SEAM_Z[p][1]:zOfLevel('universe',sceneOf('universe').zoomState().max);};
 if(bridge){const [i,o]=PAIRS[bridge.pair],pi=pairFor(i,-1),po=pairFor(o,1);return {min:pi?SEAM_Z[pi][1]:lo(i),max:po?SEAM_Z[po][0]:hi(o)};}
 const b={min:lo(l),max:hi(l),gateIn:null,gateOut:null},ck=clockOf(l),pin=pairFor(l,-1),pout=pairFor(l,1);
 if(ck&&ck.time()!==0){if(pin){b.min=Math.max(b.min,SEAM_Z[pin][1]);b.gateIn=()=>ck.rewind();}if(pout){b.max=Math.min(b.max,SEAM_Z[pout][0]);b.gateOut=()=>ck.rewind();}}
 if(l==='galaxy'&&!b.gateIn&&!galaxyView.atSun()){b.min=Math.max(b.min,SEAM_Z[pin][1]);b.gateIn=()=>galaxyView.zoomToSun();}
 if(l==='local'&&!b.gateIn&&localView.zoomState().atSun===false){b.min=Math.max(b.min,SEAM_Z[pin][1]);b.gateIn=()=>localView.zoomBackIn();}
 if(l==='solar'&&solarOffCentred()){b.max=Math.min(b.max,SEAM_Z[pout][0]);b.gateOut=()=>{if(solarFocused?.())unfocus(false);solarDrift?.(1e9);};}
 return b;
}
function zoomTick(dt,instant){
 if(animating||!zoom.moving)return;
 if(!bridge){const z=zoomState();if(!z||z.busy){zoom.stop();return;}}
 const b=zoomBounds(),r=zoom.step(dt,{min:b.min,max:b.max,instant});
 if(r.dz!==0)placeZ(r.z);
 if(r.hitMax&&b.gateOut){zoom.stop();b.gateOut();render();}else if(r.hitMin&&b.gateIn){zoom.stop();b.gateIn();render();}
}
// Opt-in diagnostics (?zoomlog in the URL): a per-frame log of Z for real-browser checks (zoomlog.js).
// Each row also carries the anchor (screen position and words; empty outside a seam) and, with ?zoomlog=bright, the
// mean luminance (0–1) of a 48 × 48 px patch at the screen centre and of a 16 × 16 px patch on the anchor, read back
// from the frame just drawn (one frame behind the row's Z). Reading pixels stalls the GPU: diagnostics only.
const bright={centre:null,anchor:null},px48=new Uint8Array(48*48*4),px16=new Uint8Array(16*16*4);
const lum=(buf)=>{let s=0;for(let i=0;i<buf.length;i+=4)s+=0.2126*buf[i]+0.7152*buf[i+1]+0.0722*buf[i+2];return +(s/(buf.length/4)/255).toFixed(4);};
const zlog=createZoomLog({input:dz=>zoomInput(dz,'pinch',globalThis.performance?.now?.()??Date.now()),z:()=>Zc,
 extra:()=>({anchorX:Number.isFinite(anchorNow.x)?+anchorNow.x.toFixed(1):'',anchorY:Number.isFinite(anchorNow.y)?+anchorNow.y.toFixed(1):'',anchorText:anchorNow.text,lumCentre:bright.centre,lumAnchor:bright.anchor,points:renderer.info?.render?.points??'',calls:renderer.info?.render?.calls??''})}); // points/calls: three.js counters of the frame's last render call (the outer scene in a seam)
if(zlog?.mode==='bright')hooks.afterFrameLog=()=>{const gl=renderer.getContext?.();if(!gl?.readPixels)return;const W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,cb=$('c').getBoundingClientRect(),sx=W/(cb.width||W),sy=H/(cb.height||H);
 gl.readPixels(Math.max(0,(W>>1)-24),Math.max(0,(H>>1)-24),48,48,gl.RGBA,gl.UNSIGNED_BYTE,px48);bright.centre=lum(px48);
 if(Number.isFinite(anchorNow.x)){const ax=Math.round((anchorNow.x-cb.left)*sx)-8,ay=Math.round(H-(anchorNow.y-cb.top)*sy)-8;if(ax>=0&&ay>=0&&ax+16<=W&&ay+16<=H){gl.readPixels(ax,ay,16,16,gl.RGBA,gl.UNSIGNED_BYTE,px16);bright.anchor=lum(px16);}else bright.anchor=null;}else bright.anchor=null;};
const currentZ=()=>{if(bridge||zoom.moving)return Zc;const l=levelOf(state.value.view),z=zoomState();return z?zOfLevel(l,z.d):NaN;};
// ---- The scale readout (hud.js): width of view, distance from the Sun, light-crossing time ----
// Text is written only when it changes; computed from the dominant scale's own camera (no allocation per frame).
const hudEl=document.createElement('div');hudEl.id='hud';hudEl.className='hud';hudEl.setAttribute('aria-hidden','true');
const hudA=document.createElement('div'),hudB=document.createElement('div'),hudC=document.createElement('div'),hudN=document.createElement('div');hudN.className='hud-note';
hudEl.append(hudA,hudB,hudC,hudN);document.body.appendChild(hudEl);
const SUN_AT={stars:0,galaxy:-R0,local:-R0*1e3/UNIT_LY.local,super:-R0*1e3/UNIT_LY.super,universe:-R0*1e3/UNIT_LY.universe};
const hudSet=(el,t)=>{if(el.textContent!==t)el.textContent=t;};
function updateHud(){
 const z=currentZ();if(!Number.isFinite(z)){if(!hudEl.hidden)hudEl.hidden=true;return;}if(hudEl.hidden)hudEl.hidden=false;
 const l=bridge?bridge.dom:levelOf(state.value.view),b=$('c').getBoundingClientRect(),aspect=(b.width||1)/(b.height||1);
 let cam,sunLy,model=false,offSun=false;
 if(l==='solar'){cam=camera;const sc=solarCamera?.()||{au:0,metric:1};sunLy=sc.au*AU_LY;model=!isRealScale?.()&&sc.metric<1;offSun=controls.target.lengthSq()>1e-6;}
 else{const sc=sceneOf(l);cam=sc.camera;const p=cam.position,sx=SUN_AT[l];sunLy=Math.hypot(p.x-sx,p.y,p.z)*UNIT_LY[l];const t=sc.controls?.target;offSun=!!t&&Math.hypot(t.x-sx,t.y,t.z)*UNIT_LY[l]>0.01*Math.exp(z);}
 const h=hudText({widthLy:viewWidth(Math.exp(z),cam.fov,aspect),sunLy,model,offSun});
 hudSet(hudA,h.lines[0]);hudSet(hudB,h.lines[1]);hudSet(hudC,h.lines[2]);hudSet(hudN,h.note);
}
// The time bar eases in only once the zoom has come to rest at a scale with a clock (and eases out as soon as a
// zoom starts), so nothing pops up in the middle of a zoom; the scale readout gives way to it while it shows.
let restSince=0;
function updateTimeBar(){
 const now=globalThis.performance?.now?.()??Date.now(),still=!bridge&&!zoom.moving&&!gtime.hidden&&!document.body.classList.contains('touring');
 if(!still)restSince=0;else if(!restSince)restSince=now;
 const show=still&&now-restSince>450;
 if(gtime.classList.contains('resting')!==show){gtime.classList.toggle('resting',show);document.body.classList.toggle('time-resting',show);}
 // While faded out it is also out of reach of the keyboard and screen readers (not only of taps).
 if(gtime.hasAttribute('inert')===show){if(show)gtime.removeAttribute('inert');else gtime.setAttribute('inert','');}
}
hooks.afterFrame=()=>{updateHud();updateTimeBar();tourUi?.frame();hooks.afterFrameLog?.();};
// Inside a seam the "you are here" anchor stands at the Sun's label: the Sun's own label gives way (one label, not two).
hooks.labelsOff=b=>!!bridge&&b.data.name==='Sun';
// Labels never sit under the top controls: the band down to the scale ladder's bottom edge (read on layout only).
const safeTop=()=>{const r=$('ladder')?.getBoundingClientRect?.();LABEL_SAFE.top=r&&r.bottom>0?r.bottom+4:0;};safeTop();globalThis.addEventListener?.('resize',safeTop);
// Rects no label may cover, read each frame from the real elements (before this frame writes any label): the open
// sheet, the time bar and the scale readout. The top controls are SAFE.top (above).
const exRect=el=>{const r=el?.getBoundingClientRect?.();return r&&r.width>0&&r.height>0?[r.left,r.top,r.right,r.bottom]:null;};
const exList=[null,null,null,null,null];
function readExclusions(){const sh=$('sheet');exList[0]=sh&&sh.dataset.state!=='closed'?exRect(sh):null;exList[1]=!gtime.hidden&&!document.body.classList.contains('bridging')?exRect(gtime):null;exList[2]=!hudEl.hidden&&!document.body.classList.contains('time-resting')?exRect(hudEl):null;exList[3]=tourUi&&!tourUi.card.hidden?exRect(tourUi.card):null;exList[4]=tourUi&&!tourUi.hint.hidden?exRect(tourUi.hint):null;setExclusions(exList,globalThis.innerWidth||Infinity,globalThis.innerHeight||Infinity);}
hooks.beforeFrame=dt=>{readExclusions();tourFrame(dt);zoomTick(dt);zlog?.frame(dt,currentZ(),bridge,levelOf(state.value.view));};
// dz: a change of Z from a gesture (zoom.js gains). Zooming out of a selected world lets go of it.
function zoomInput(dz,kind,now){
 if(animating||!dz)return false;
 if(!bridge){const z=zoomState();if(!z||z.busy||sheetOpen())return false;if(!zoom.moving)zoom.set(zOfLevel(levelOf(state.value.view)));
  if(levelOf(state.value.view)==='solar'&&dz>0&&solarFocused?.()&&solarDistance()>0.5*solarEdge()){unfocus(false);if(state.value.sheet!=='closed'){state.update({sheet:'closed'});render();}}}
 dz/=viewRate(zoom.z,real()); // same apparent speed in the compressed Solar System as everywhere else
 if(kind==='pinch')zoom.drag(dz,now);else zoom.nudge(dz);
 if(!smoothFrames())zoomTick(0,true);
 return true;
}
$('c').addEventListener('wheel',e=>{tourRef?.interrupt();if(zoomInput(wheelZ(e.deltaY,e.deltaMode,e.ctrlKey),'wheel'))e.preventDefault?.();},{passive:false});
// Name labels sit above the scene and would swallow the wheel: pass it through so zooming works anywhere.
$('labels').addEventListener('wheel',e=>{e.preventDefault();$('c').dispatchEvent(new WheelEvent('wheel',{deltaX:e.deltaX,deltaY:e.deltaY,deltaMode:e.deltaMode,clientX:e.clientX,clientY:e.clientY,ctrlKey:e.ctrlKey,bubbles:true,cancelable:true}));},{passive:false});
const pinch=new Map();let spread=0;
const spreadOf=()=>{let ax=0,ay=0,bx=0,by=0,i=0;for(const p of pinch.values()){if(i===0){ax=p.x;ay=p.y;}else{bx=p.x;by=p.y;}i++;}return Math.hypot(ax-bx,ay-by);};
const nowMs=e=>globalThis.performance?.now?.()??e.timeStamp??Date.now();
// While two fingers pinch, no scene rotates or pans (as before, when each scene's OrbitControls owned the pinch):
// with its zoom off, OrbitControls would otherwise keep the first finger's rotation going under the pinch, and turn
// the fingers' sliding midpoint into a pan. In the Solar System (the only scale with pan on) that pan moved the
// centre off the Sun on every real pinch, so the off-centre gate below held the zoom at the Solar → Stars seam.
const held=new Map(),allControls=()=>[controls,starsView.controls,galaxyView.controls,localView.controls,sceneOf(levelOf(state.value.view))?.controls].filter(Boolean);
const lockRotate=on=>{if(on){for(const c of allControls())if(!held.has(c)){held.set(c,[c.enableRotate,c.enablePan]);c.enableRotate=false;c.enablePan=false;}}else{for(const [c,[r,p]] of held){c.enableRotate=r;c.enablePan=p;}held.clear();}};
document.addEventListener('pointerdown',e=>{if(e.target!==$('c'))return;tourRef?.interrupt();pinch.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch.size===2){spread=spreadOf();lockRotate(true);}},true);
document.addEventListener('pointermove',e=>{const p=pinch.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;if(pinch.size!==2)return;const d=spreadOf();if(spread>0&&d>0)zoomInput(pinchZ(d/spread),'pinch',nowMs(e));spread=d;},true);
for(const t of ['pointerup','pointercancel'])document.addEventListener(t,e=>{if(!pinch.delete(e.pointerId))return;if(pinch.size<2){if(spread>0)zoom.release(nowMs(e));spread=0;if(!pinch.size)lockRotate(false);}},true);
function pickGalaxy(g){dismissHint();go({view:'local',landmark:g.name,sheet:'peek'});}
function pickLandmark(m){dismissHint();galaxyView.pause();go({view:'galaxy',landmark:m.name,sheet:'peek'});}
function pickStar(e){dismissHint();starsView.pause();go({view:'stars',star:e.name,sheet:'peek'});}
hooks.overrideTap=(x,y)=>{const s=state.value;
 if(s.voyage!=null)return;
 if(s.view==='super'||s.view==='universe'){const it=sceneOf(s.view).pick(x,y);if(it)pickCosmos(s.view,it);else if(s.sheet!=='closed')setSheet({sheet:'closed',landmark:null});return;}
 if(s.view==='local'){const g=localView.pick(x,y);if(g)pickGalaxy(g);else if(s.sheet!=='closed')setSheet({sheet:'closed',landmark:null});return;}
 if(s.view==='galaxy'){const m=galaxyView.pick(x,y);if(m)pickLandmark(m);else if(s.sheet!=='closed')setSheet({sheet:'closed',landmark:null});return;}
 if(s.view!=='stars')return;const e=starsView.pick(x,y);if(e)pickStar(e);else if(s.sheet!=='closed')setSheet({sheet:'closed',star:null});};
const sourceLink=(key,label='NASA source')=>`<a href="${NASA[key]}" target="_blank" rel="noopener">${label}</a>`;
const sourceNote=`<p class="fine">Sources checked ${CHECKED}. This is an illustrative teaching model, not a live sky, weather forecast or spacecraft view.</p>`;
let narration='lab_earth', lastAudioState='idle', interrupted=false;
let preferences;try{preferences=JSON.parse(localStorage.getItem('solar.kids.v1'))||{};}catch{preferences={};}
// The hint shows on every visit until a world is selected. (Remembering it across visits hid it
// for anyone who had tapped once on this origin, including testers of a newer build.)
let hintSeen=false;
$('sound').checked=!preferences.muted;
const player=createVoicePlayer({lines:LINES,durations:VOICE.dur,onState:s=>{
 if(s==='idle' && lastAudioState==='retry')return;
 lastAudioState=s;$('audio-status').textContent=s==='loading'?'Loading voice…':s==='speaking'?'Reading this card':s==='retry'?'Tap ♫ to try again.':'';
}});
function stopAudio(){player.stop();}
$('listen').onclick=()=>{if(!narration||!LINES[narration])return;if(!$('sound').checked){$('audio-status').textContent='Turn on Voice in the menu (top right).';return;}player.unlock();player.say(narration);};
$('sound').onchange=()=>{preferences.muted=!$('sound').checked;try{localStorage.setItem('solar.kids.v1',JSON.stringify(preferences));}catch{}if(preferences.muted)stopAudio();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){interrupted=['speaking','loading'].includes(lastAudioState);stopAudio();}else if(interrupted){lastAudioState='retry';$('audio-status').textContent='Tap ♫ to continue.';interrupted=false;}});
function go(patch){stopAudio();const next={...state.value,...patch};if(!('sheet' in patch))patch={...patch,sheet:openHeight(next)};state.navigate(patch);$('settings').open=false;render();}
function setSheet(patch){if(!patch)return;if(patch.view&&patch.view!==state.value.view)stopAudio();state.update(patch);render();}
function dismissHint(){hintSeen=true;}
// Back: previous card/lab; with no history it returns to the whole Solar System.
// At the overview (sheet closed) the same chip switches between the inner planets and all planets.
// ‹ Back (in the card header): returns to the previous card, only when that card belongs to the same scale.
// Moving between scales is the scale ladder's job, and closing a card is ✕.
const levelOfState=v=>v&&levelOf(v.view);
function canGoBack(s=state.value){const p=state.previous;return s.voyage==null&&s.sheet!=='closed'&&!!p&&p.sheet!=='closed'&&levelOfState(p)===levelOf(s.view);}
$('back').onclick=()=>{stopAudio();if(!canGoBack())return;state.back();render();};
// Planets in view (menu): the inner planets or all of them, in the Solar System overview.
for(const [id,scope] of [['scope-inner','inner'],['scope-all','all']])$(id).onclick=()=>{setHomeScope(scope);paintScope();if(levelOf(state.value.view)!=='solar')goLevel('solar');};
function paintScope(){for(const [id,scope] of [['scope-inner','inner'],['scope-all','all']])$(id).setAttribute('aria-pressed',String(hooks.homeScope===scope));}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{const view=button.dataset.view,s=state.value;
 const patch={view,experiment:null};
 if(view==='compare'&&NEARBY[s.world]){patch.compareA=s.world;if(s.compareB===s.world)patch.compareB=s.world==='Earth'?'Moon':'Earth';}
 go({...patch,sheet:'half'});};
$('journeys').onclick=()=>{dismissHint();go({view:'journey',journey:null,step:0,experiment:null,sheet:'half'});};
for(const button of document.querySelectorAll('[data-experiment]'))button.onclick=()=>go({view:'try',experiment:button.dataset.experiment});
$('world').innerHTML=bodies.map(b=>`<option>${b.data.name}</option>`).join('');
$('world').onchange=()=>{dismissHint();go({view:'explore',world:$('world').value,feature:'overview',experiment:null});};
// Tap a world in the scene → glide to it and slide up its card.
hooks.onFocus=b=>{dismissHint();go({view:'explore',world:b.data.name,feature:'overview',experiment:null});};
hooks.onEmpty=()=>setSheet(state.value.sheet==='closed'?null:emptyTap(state.value));
hooks.visible=(w,h)=>{if(state.value.sheet==='closed')return {width:w,height:h};const r=sheet.getBoundingClientRect();return visibleRegion(w,h,r);};

// ✕ closes the card and stays at the same scale (in the voyage, it ends the voyage).
$('close').onclick=()=>{stopAudio();const s=state.value;
 if(s.voyage!=null){if(!voyageBusy)endVoyage();return;}
 const lv=levelOf(s.view);
 if(lv==='solar')setSheet({view:'explore',experiment:null,sheet:'closed'});
 else setSheet({view:ORBITS.has(s.view)?'stars':s.view,star:null,landmark:null,sheet:'closed'});};
// Grip: buttons, keys and swipes all drive the same state machine.
$('grip').onclick=()=>setSheet(state.value.sheet==='full'?swipe(state.value,'down'):swipe(state.value,'up'));
sheet.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();setSheet(swipe(state.value,'down'));}
 else if(e.target===$('grip')&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();setSheet(swipe(state.value,e.key==='ArrowUp'?'up':'down'));}
});
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('settings').open){$('settings').open=false;$('settings').querySelector('summary').focus();}});
let drag=null,suppressClick=false;
$('grip-zone').addEventListener('pointerdown',e=>{if(e.target.closest('input,select,a'))return;drag={y:e.clientY,t:e.timeStamp,id:e.pointerId};});
$('grip-zone').addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const dir=classifyDrag(e.clientY-drag.y,e.timeStamp-drag.t);drag=null;if(!dir)return;suppressClick=true;setTimeout(()=>suppressClick=false,0);setSheet(swipe(state.value,dir));});
$('grip-zone').addEventListener('pointercancel',()=>{drag=null;});
$('grip-zone').addEventListener('click',e=>{if(suppressClick){e.stopPropagation();e.preventDefault();suppressClick=false;}},true);
// Predict, then reveal: a lab or journey question is answered (or skipped) before the result shows.
function predictHtml(id){
 const p=PREDICTIONS[id],a=state.value.answers[id];
 if(a===undefined)return `<p class="predict-q"><span class="tag">Guess first</span> ${p.q}</p><div class="choices">${p.options.map((o,i)=>`<button data-choice="${i}">${o}</button>`).join('')}</div><button class="quiet skip" data-choice="skip">Skip the guess</button>`;
 const j=a==='skip'?null:judge(id,a);
 const verdict=a==='skip'?`<strong>Answer:</strong> ${p.options[p.answer]}`:j.right?`<strong>✓ You got it.</strong> ${p.options[p.answer]}`:`<strong>Not quite.</strong> You guessed “${p.options[a]}”. The answer: ${p.options[p.answer]}`;
 return `<p class="predict-q">${p.q}</p><div class="verdict ${a==='skip'?'skipped':j.right?'right':'wrong'}"><p>${verdict}</p><p>${p.explain}</p></div><button class="quiet skip" data-choice="again">Ask me again</button>`;
}
const answered=id=>state.value.answers[id]!==undefined;
function bindPredict(el,id,after){
 el.hidden=!id;if(!id){el.innerHTML='';return;}
 el.innerHTML=predictHtml(id);
 for(const b of el.querySelectorAll('[data-choice]'))b.onclick=()=>{stopAudio();const c=b.dataset.choice,answers={...state.value.answers};
  if(c==='again')delete answers[id];else answers[id]=c==='skip'?'skip':+c;
  state.update({answers});after();};
}
function diagram(experiment,angle){
 if(experiment==='eclipses'){
  const s=state.value,g=eclipseGeometry(s.phase,s.node),y=70-Math.max(-40,Math.min(40,g.latitude*12));
  const moonX=Math.cos(s.phase*Math.PI/180)>0?96:136; // new-Moon side: between Earth and the Sun
  return `<svg viewBox="0 0 160 140" role="img" aria-label="Side view along the Sun–Earth line; the Moon sits ${Math.abs(g.latitude).toFixed(1)} degrees ${g.latitude>=0?'above':'below'} it">
  <line x1="6" y1="70" x2="156" y2="70" stroke="#52677e" stroke-dasharray="3 3"/>
  <circle cx="14" cy="70" r="10" fill="#ffd591"/><text x="14" y="96" fill="#ffd591" font-size="9" text-anchor="middle">Sun</text>
  <circle cx="116" cy="70" r="7" fill="#5e9dd5"/><text x="116" y="92" fill="#bccce0" font-size="9" text-anchor="middle">Earth</text>
  <path d="M123 66L156 69V71L123 74Z" fill="#000" stroke="#334" opacity=".8"/>
  <circle cx="${moonX}" cy="${y.toFixed(1)}" r="3.5" fill="${/^(solar|lunar)/.test(g.kind)?'#ffb37a':'#c8c6c1'}"/>
  <text x="80" y="20" fill="#bccce0" font-size="9" text-anchor="middle">${Math.abs(g.latitude).toFixed(1)}° ${g.latitude>=0?'above':'below'} the line</text>
  <text x="80" y="135" fill="#aabbd3" font-size="8" text-anchor="middle">Side view • tilt exaggerated ×12</text></svg><p>${g.kind==='none'?'No eclipse here':'Eclipse!'}</p>`;
 }
 if(experiment==='tides'){
  const a=angle*Math.PI/180,mx=80+52*Math.cos(a),my=68-52*Math.sin(a),k=tideRange(angle);
  return `<svg viewBox="0 0 160 140" role="img" aria-label="Top-down view: ocean bulges point toward and away from the Moon">
  <path d="M153 40H136M153 68H136M153 96H136" stroke="#ffd591"/><text x="154" y="25" fill="#ffd591" font-size="9" text-anchor="end">Sunlight ←</text>
  <circle cx="80" cy="68" r="52" fill="none" stroke="#52677e" stroke-dasharray="3 3"/>
  <ellipse cx="80" cy="68" rx="${(16+7*k).toFixed(1)}" ry="${(16-3*k).toFixed(1)}" fill="#5fb4ff55" stroke="#5fb4ff" transform="rotate(${(-angle).toFixed(1)} 80 68)"/>
  <circle cx="80" cy="68" r="13" fill="#3f7fe0"/>
  <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" fill="#c8c6c1"/>
  <text x="80" y="135" fill="#aabbd3" font-size="8" text-anchor="middle">From above • bulges exaggerated</text></svg><p>${tideLabel(angle).name}</p>`;
 }
 const a=angle*Math.PI/180;
 const phase=experiment==='phases';
 const x=80+(phase?1:-1)*46*Math.cos(a), y=68+(phase?-1:1)*46*Math.sin(a);
 return `<svg viewBox="0 0 160 140" role="img" aria-label="${phase?'Moon orbit around Earth; sunlight from the right':'Earth orbit around Sun, tilt direction stays fixed'}">
 <circle cx="80" cy="68" r="46" fill="none" stroke="#52677e" stroke-dasharray="3 3"/>
 <circle cx="80" cy="68" r="${phase?9:11}" fill="${phase?'#5e9dd5':'#ffd591'}"/><text x="80" y="90" fill="#bccce0" font-size="10" text-anchor="middle">${phase?'Earth':'Sun'}</text>
 ${phase?'<path d="M153 40H130M153 64H130M153 88H130" stroke="#ffd591"/><text x="154" y="25" fill="#ffd591" font-size="9" text-anchor="end">Sunlight ←</text>':''}
 <circle cx="${x}" cy="${y}" r="6" fill="${phase?'#c8c6c1':'#72b2e6'}"/>
 ${phase?`<line x1="80" y1="68" x2="${x}" y2="${y}" stroke="#c8c6c1" stroke-dasharray="2 3"/>`:`<path d="M${x-10} ${y}H${x+14}l-4 -3m4 3l-4 3" stroke="#ffd591" fill="none"/>`}
 <text x="80" y="135" fill="#aabbd3" font-size="8" text-anchor="middle">${phase?'Top-down orbit • not to scale':'Tilt direction projected • not to scale'}</text></svg><p>${phase?'Main view: Moon seen from Earth':'Main view: following Earth'}</p>`;
}
function paintExperiment(){
 const s=state.value, seasons=s.experiment==='seasons', kind=s.experiment;
 if(kind==='scale')return paintScale();
 if(kind==='eclipses'||kind==='tides')return paintMoonLab();
 experiments.update(s);
 $('eclipse-controls').hidden=true;
 bindPredict($('predict'),kind,paintExperiment);
 $('experiment-result').hidden=$('experiment-summary').hidden=!answered(kind);
 $('kicker').textContent=seasons?'Earth lab · tilt & daylight':'Moon lab · reflected sunlight';
 $('title').textContent=seasons?'Why do seasons happen?':'Explore the phases';
 narration=seasons?'lab_seasons':'lab_phases';$('experiment-summary').textContent=LINES[narration];$('fact').textContent=seasons?seasonLabel(s.orbit):phaseName(s.phase);
 $('angle-label').textContent=seasons?'Move Earth around the Sun':'Move the Moon around Earth';
 $('experiment-angle').value=seasons?s.orbit:s.phase;
 $('experiment-angle').setAttribute('aria-valuetext',seasons?seasonLabel(s.orbit):phaseName(s.phase));
 $('season-controls').hidden=!seasons;
 $('no-tilt').checked=s.tilt===0;$('latitude').value=s.latitude;$('latitude-value').textContent=`${Math.abs(s.latitude)}° ${s.latitude<0?'south':s.latitude>0?'north':'(equator)'}`;
 const choices=seasons?[[0,'June'],[90,'September'],[180,'December'],[270,'March']]:[[0,'New'],[90,'First quarter'],[180,'Full'],[270,'Last quarter']];
 $('presets').innerHTML=choices.map(([a,label])=>`<button data-angle="${a}" aria-pressed="${Math.abs(wrap(seasons?s.orbit:s.phase)-a)<1}">${label}</button>`).join('');
 for(const b of $('presets').querySelectorAll('button'))b.onclick=()=>{stopAudio();state.update(seasons?{orbit:+b.dataset.angle}:{phase:+b.dataset.angle});paintExperiment();};
 $('orbit-map').innerHTML=diagram(s.experiment,seasons?s.orbit:s.phase);
 if(seasons){
  const g=seasonGeometry(s.orbit,s.tilt),hours=daylightHours(s.latitude,g.declination),alt=noonAltitude(s.latitude,g.declination);
  $('experiment-result').innerHTML=`<strong>${seasonLabel(s.orbit)}</strong><p>At your latitude: about <b>${hours.toFixed(1)} hours of daylight</b>. Midday Sun: <b>${alt.toFixed(1)}° above the horizon</b>.</p><p>${s.tilt===0?'With no tilt: about 12 hours everywhere in this ideal model, throughout the year.':g.declination>1?'The north leans toward sunlight; the south leans away.':g.declination< -1?'The south leans toward sunlight; the north leans away.':'Neither hemisphere leans toward the Sun: both get roughly equal daylight.'}</p>`;
  $('view-caption').textContent=`Tilt ${s.tilt.toFixed(2)}° · gold dot: north · gold circle: your latitude · camera follows Earth; diagram shows its orbit`;
  $('experiment-depth').innerHTML=`<p>${INSIGHTS.Earth.deeper}</p><p>Try 40° north in June, then December. Next remove the tilt: the difference disappears. Now move the latitude to 40° south and repeat.</p><p>The gold circle marks your latitude (distance north or south of the equator). The pale circle is the equator. The main globe is viewed obliquely from space, not from the chosen place. The axis holds a fixed direction in space while the camera follows Earth’s orbit. The globe is held at an illustrative fixed daily rotation; daylight totals are calculated over a full rotation.</p><p>Calculated daylight uses a spherical Earth, circular orbit, parallel sunlight and a flat horizon, excluding refraction, terrain and twilight. Orbit angle is not a date predictor. Midday angle is geometric solar altitude, not temperature. Distance is held constant to isolate tilt; no climate or weather simulation.</p>${sourceLink('earth','NASA · Earth and seasons')} · ${sourceLink('earthfact','NASA · tilt and orbit data')}${sourceNote}`;
 }else{
  const g=phaseGeometry(s.phase);
  $('experiment-result').innerHTML=`<strong>${phaseName(s.phase)}</strong><p>${(g.illuminated*100).toFixed(0)}% of the visible disk is sunlit. The Sun still lights half of the whole Moon.</p><p>${g.illuminated<.005?'The unlit face is almost invisible: that is a new Moon.':Math.abs(s.phase-180)<1?'The sunlit face points toward Earth at full Moon.':s.phase<180?'Waxing means the sunlit part we see is growing.':'Waning means the sunlit part we see is shrinking.'}</p>`;
  $('view-caption').textContent='From Earth · north-up reference view, not your local horizon · no eclipse or earthshine calculation';
  $('experiment-depth').innerHTML=`<p>${INSIGHTS.Moon.deeper}</p><p>The light source stays on the Sun side. The camera moves to the Earth-facing direction as you move the Moon; the same lunar face stays toward Earth. The fraction is (1 − cos elongation) / 2, where elongation here is the Moon’s circular-orbit angle from the Sun direction.</p><p>Phases are not Earth’s shadow. The Moon’s real orbit is tilted about 5° to Earth’s orbit, so new and full Moons usually do not align for eclipses. This coplanar phase-only model omits that tilt, eclipses, libration, earthshine and the local horizon. It must not be used to predict an eclipse or tonight’s Moon. Surface craters are illustrative, not mapped.</p>${sourceLink('phases','NASA · Moon phases and observer view')} · ${sourceLink('moonfact','NASA · orbit data')}${sourceNote}`;
 }
}
// Eclipses and tides share the Moon-position slider with the phases lab.
function paintMoonLab(){
 const s=state.value,eclipses=s.experiment==='eclipses',g=eclipseGeometry(s.phase,s.node),t=tideLabel(s.phase);
 experiments.update({...s,eclipse:g.kind,eclipseLat:g.latitude,tideRange:tideRange(s.phase)});
 bindPredict($('predict'),s.experiment,paintExperiment);
 const shown=answered(s.experiment);$('experiment-result').hidden=$('experiment-summary').hidden=!shown;
 $('season-controls').hidden=true;$('eclipse-controls').hidden=!eclipses;
 narration=null;
 $('kicker').textContent=eclipses?'Moon lab · lining up':'Earth lab · ocean tides';
 $('title').textContent=LAB_TITLES[s.experiment];
 $('fact').textContent=eclipses?(g.kind==='none'?phaseName(s.phase):g.label.split(':')[0]):`${t.name} · ${phaseName(s.phase)}`;
 $('angle-label').textContent='Move the Moon around Earth';
 $('experiment-angle').value=s.phase;$('experiment-angle').setAttribute('aria-valuetext',phaseName(s.phase));
 const choices=[[0,'New'],[90,'First quarter'],[180,'Full'],[270,'Last quarter']];
 $('presets').innerHTML=choices.map(([a,label])=>`<button data-angle="${a}" aria-pressed="${Math.abs(wrap(s.phase)-a)<1}">${label}</button>`).join('');
 for(const b of $('presets').querySelectorAll('button'))b.onclick=()=>{stopAudio();state.update({phase:+b.dataset.angle});paintExperiment();};
 $('orbit-map').innerHTML=diagram(s.experiment,s.phase);
 if(eclipses){
  $('node').value=s.node;$('node-value').textContent=`${Math.round(wrap(s.node))}° from the Sun line`;
  $('experiment-result').innerHTML=`<strong>${g.label}</strong><p>The Moon is ${Math.abs(g.latitude).toFixed(2)}° ${g.latitude>=0?'above':'below'} the Earth–Sun line — about ${g.moonWidths.toFixed(1)} Moon-widths.</p><p>${g.kind==='none'&&(wrap(s.phase)<1||Math.abs(wrap(s.phase)-180)<1)?'Slide the crossing point toward the Sun line and try again.':g.kind==='none'?'Pick New or Full first.':'This happens only when a new or full Moon falls near a crossing point: a few times a year, never every month.'}</p>`;
  $('experiment-summary').textContent='The Moon’s orbit is tilted about 5° to Earth’s. Most months it slips past above or below the Sun and Earth’s shadow. Twice a year or so, the crossing points line up with the Sun: eclipse season.';
  $('view-caption').textContent='From Earth · near new Moon the Sun’s disc sits behind the Moon (misses larger than a Sun-width are pulled into view) · in a lunar eclipse the Moon turns coppery';
  $('experiment-depth').innerHTML=`<p>Latitude above or below Earth’s orbital plane = asin(sin ${MOON_INCLINATION}° × sin(Moon angle − crossing angle)). A solar eclipse needs the Moon within about 1.5° of the Earth–Sun line at new Moon (about 0.9° for a total or annular one); a lunar eclipse within about 1.0° at full Moon (about 0.4° for a total one). These are approximate teaching limits; real limits shift with the Moon’s and Earth’s changing distances.</p><p>The crossing points (nodes) slowly drift, so eclipse seasons come about every 173 days. This model ignores where on Earth an eclipse is visible and cannot predict real eclipse dates.</p><a href="https://science.nasa.gov/eclipses/" target="_blank" rel="noopener">NASA · Eclipses</a> · ${sourceLink('moonfact','NASA · Moon orbit data')}${sourceNote}`;
 }else{
  $('experiment-result').innerHTML=`<strong>${t.name}</strong><p>Tidal range about ${Math.round(t.ratio*100)}% of the smallest (neap) range. ${t.name==='Spring tides'?'Sun and Moon pull in line: highest highs, lowest lows.':t.name==='Neap tides'?'Sun and Moon pull at right angles and partly cancel: gentle tides.':'Between the two.'}</p><p>Two bulges: one under the Moon, one on the far side. Earth turns through both, so most coasts get two high tides a day.</p>`;
  $('experiment-summary').textContent='The Moon pulls the near-side ocean a little more, and Earth a little more than the far-side ocean. That stretches the oceans into two bulges. The Sun does the same, about half as strongly.';
  $('view-caption').textContent='Looking down on the North Pole · Sun to the right · ocean bulges exaggerated thousands of times';
  $('experiment-depth').innerHTML=`<p>The Sun’s tide-raising force is about 46% of the Moon’s, because tidal force falls off with the cube of distance. Range here = √(1 + 0.46² + 2 × 0.46 × cos 2θ), relative to the Moon alone, where θ is the Moon’s angle from the Sun. Spring tides (new and full Moon) are about 2.7 times neap tides in this ideal model.</p><p>Real tides depend strongly on coastlines and ocean basins: some places get one tide a day, the Bay of Fundy gets 16 m, and peaks often lag the Moon by hours or days. Use a local tide table for real times.</p><a href="https://oceanservice.noaa.gov/education/tutorial_tides/" target="_blank" rel="noopener">NOAA · Tides tutorial</a>${sourceNote}`;
 }
}
// Scale walk and light race. The real Solar System stays live behind the sheet.
const SUN_PRESETS=[[2.5,'Marble'],[FOOTBALL_CM,'Football'],[65,'Gym ball']];
let race=null;
function paintScale(){
 const s=state.value,list=scaleWalk(s.sunCm);
 narration=null;$('kicker').textContent='Scale lab · size and distance';$('title').textContent=LAB_TITLES.scale;
 $('fact').textContent=`Sun ${s.sunCm} cm → Earth ${formatMetres(list[2].distanceM)} away`;
 $('sun-size').value=s.sunCm;$('sun-size-value').textContent=`${s.sunCm} cm`;
 $('sun-presets').innerHTML=SUN_PRESETS.map(([cm,label])=>`<button data-cm="${cm}" aria-pressed="${s.sunCm===cm}">${label}</button>`).join('');
 for(const b of $('sun-presets').querySelectorAll('button'))b.onclick=()=>{state.update({sunCm:+b.dataset.cm});paintScale();};
 bindPredict($('scale-predict'),'scale',paintScale);$('scale-reveal').hidden=!answered('scale');
 $('scale-result').innerHTML=`<strong>Sun: a ball ${s.sunCm} cm wide</strong><p>Earth: ${sizeLike(list[2].sizeMm)} (${list[2].sizeMm.toFixed(1)} mm), ${formatMetres(list[2].distanceM)} away. Neptune: ${formatMetres(list[7].distanceM)} away. Almost everything in the Solar System is empty space.</p>`;
 $('scale-list').innerHTML=list.map(p=>`<li><b>${p.name}</b> <span>${sizeLike(p.sizeMm)} · ${p.sizeMm<1?p.sizeMm.toFixed(2):p.sizeMm.toFixed(1)} mm</span><span>${formatMetres(p.distanceM)} from the Sun</span></li>`).join('');
 const maxAu=30.2,stops=list.map((p,i)=>({name:p.name,x:12+136*(i===list.length-1?1:scaleAu(p.name)/maxAu)}));
 $('light-race').innerHTML=`<svg viewBox="0 0 160 48" role="img" aria-label="Distances from the Sun to each planet in a straight line, to scale"><line x1="6" y1="20" x2="152" y2="20" stroke="#52677e"/><circle cx="6" cy="20" r="5" fill="#ffd591"/>${stops.map((p,i)=>`<circle cx="${p.x.toFixed(1)}" cy="20" r="2" fill="#c6d3e4"/>${i>=4?`<text x="${p.x.toFixed(1)}" y="${i%2?33:12}" fill="#aabbd3" font-size="6" text-anchor="middle">${p.name}</text>`:''}`).join('')}<text x="4" y="45" fill="#aabbd3" font-size="6">Mercury, Venus, Earth, Mars: all within the first few dots</text><circle id="photon" cx="6" cy="20" r="2.4" fill="#fff6c8"/></svg>`;
 if(!race)$('light-clock').textContent=`Sunlight reaches Earth in ${formatDuration(lightSeconds(AU_KM))} and Neptune in ${formatDuration(sunlightTo('Neptune'))}.`;
 $('scale-depth').innerHTML=`<p>Scale factor = ball size ÷ the Sun’s real diameter (1,391,400 km). Planet sizes and mean distances from the Sun are multiplied by the same factor, so this walk is true to scale. Light time = distance ÷ 299,792 km/s, using mean distances. Planets are never lined up like this; they are spread around their orbits.</p><p>The light race runs 600 times faster than real light: one second on screen is ten minutes in space.</p>${sourceLink('earthfact','NASA · planetary fact sheets')}${sourceNote}`;
 aimCamera({...s,feature:'orbit'});
}
const scaleAu=name=>bodies.find(b=>b.data.name===name).data.au;
$('sun-size').oninput=()=>{state.update({sunCm:+$('sun-size').value});paintScale();};
$('light-go').onclick=()=>{
 const end=sunlightTo('Neptune'),speed=600,reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const show=t=>{const reached=[...bodies].filter(b=>b.data.au&&!b.data.kind&&sunlightTo(b.data.name)<=t).map(b=>b.data.name).pop(); // the eight planets
  $('light-clock').textContent=`Light has travelled ${formatDuration(t)}${reached?` · just passed ${reached}`:''}`;
  const dot=document.getElementById('photon');if(dot)dot.setAttribute('cx',(6+146*Math.min(1,t/end)).toFixed(1));};
 if(race)globalThis.cancelAnimationFrame?.(race.id);
 if(reduce||typeof requestAnimationFrame!=='function'){race=null;show(end);return;}
 race={start:performance.now()};$('light-go').textContent='↻ Send it again';
 const tick=now=>{if(!race)return;const t=Math.min(end,(now-race.start)/1000*speed);show(t);if(t<end)race.id=requestAnimationFrame(tick);else race=null;};
 race.id=requestAnimationFrame(tick);
};
// Guided journeys: a list, then ordered steps that move the camera and the sheet together.
// ---- Voyage outward: one guided trip across every scale (learn.js VOYAGE). Each Next travels with the
// same seamless zoom, then shows what that stop is about; questions are answered before moving on.
let voyageBusy=false;
function startVoyage(){stopAudio();dismissHint();state.navigate({view:'explore',journey:null,step:0,experiment:null,star:null,landmark:null,voyage:0,sheet:'closed'});travel(0);}
function travel(i){
 const st=VOYAGE.steps[i];voyageBusy=true;state.update({voyage:i,sheet:'closed',star:null,landmark:null});
 if(levelOf(state.value.view)==='stars'&&st.level==='stars'&&state.value.view!=='stars')state.update({view:'stars'});
 render();goLevel(st.level,()=>arrive(i));
}
function arrive(i){
 const st=VOYAGE.steps[i];if(state.value.voyage!==i)return;
 state.update({view:st.view||views[st.level].view,star:st.star||null,landmark:st.landmark||null,sheet:'half'});
 if(st.level==='solar')unfocus(true,1.2);
 if(st.level==='stars'&&!st.view&&!st.act)starsView.frame(11); // pull back from the Sun to see the neighbours
 if(st.act==='drift'){starsView.setTime(0);starsView.play();}
 if(st.act==='turn'){galaxyView.setTime(0);galaxyView.play();}
 if(st.act==='overview')sceneOf(st.level).overview();
 voyageBusy=false;render();
}
function endVoyage(){state.update({voyage:null,sheet:'closed',star:null,landmark:null});render();}
function paintVoyage(){
 const s=state.value,i=s.voyage,st=VOYAGE.steps[i],last=i===VOYAGE.steps.length-1;narration=null;$('action').hidden=true;
 $('journey-list').hidden=true;$('journey-step').hidden=false;
 $('kicker').textContent=`${VOYAGE.title} · ${i+1} of ${VOYAGE.steps.length}`;$('title').textContent=st.title;$('fact').textContent=st.text;
 $('view-caption').textContent=voyageBusy?'Travelling…':{solar:'The Solar System',stars:'The nearest stars',galaxy:'The Milky Way',local:'The Local Group',super:'Laniakea, our supercluster',universe:'The observable universe'}[st.level]+' · models built from real measurements';
 bindPredict($('journey-predict'),st.predict,paintVoyage);$('journey-lab').parentElement.hidden=true;
 $('journey-prev').disabled=i===0||voyageBusy;
 const ok=canAdvance(st,s.answers)&&!voyageBusy;$('journey-next').disabled=!ok;$('journey-next').textContent=last?'Finish ✓':'Next →';
 $('journey-next').setAttribute('aria-label',voyageBusy?'Travelling':!canAdvance(st,s.answers)?'Answer the question to continue':last?'Finish the voyage':'Travel to the next stop');
 $('journey-dots').textContent=VOYAGE.steps.map((_,k)=>k<i?'●':k===i?'◉':'○').join(' ');
}
function paintJourney(){
 const s=state.value,j=journey(s.journey);narration=null;$('action').hidden=true;
 $('journey-list').hidden=!!j;$('journey-step').hidden=!j;
 if(!j){
  $('kicker').textContent='Guided journeys';$('title').textContent='Choose a journey';$('fact').textContent='Short tours. Make a guess, then see what really happens.';
  $('view-caption').textContent='';
  $('journey-list').innerHTML=[VOYAGE,...JOURNEYS].map(x=>`<button class="experiment-card${x===VOYAGE?' voyage-card':''}" data-journey="${x.id}"><strong>${x===VOYAGE?'✦ ':''}${x.title}</strong><span>${x.blurb} · ${x.steps.length} stops</span></button>`).join('');
  for(const b of $('journey-list').querySelectorAll('button'))b.onclick=()=>b.dataset.journey==='voyage'?startVoyage():go({view:'journey',journey:b.dataset.journey,step:0});
  aimCamera({...s,feature:'orbit'});return;
 }
 const i=Math.max(0,Math.min(j.steps.length-1,s.step)),st=j.steps[i],last=i===j.steps.length-1;
 $('kicker').textContent=`${j.title} · ${i+1} of ${j.steps.length}`;$('title').textContent=st.title;$('fact').textContent=st.text;
 $('view-caption').textContent=st.world?`${st.world} · schematic view, not current positions`:'The whole Solar System · schematic view';
 bindPredict($('journey-predict'),st.predict,paintJourney);
 const lab=st.lab||st.compare;$('journey-lab').parentElement.hidden=!lab;
 if(st.lab){$('journey-lab').textContent=`Try it: ${LAB_TITLES[st.lab]} →`;$('journey-lab').onclick=()=>go({view:'try',experiment:st.lab,sheet:'half'});}
 else if(st.compare){$('journey-lab').textContent=`Compare ${st.compare[0]} and ${st.compare[1]} →`;$('journey-lab').onclick=()=>go({view:'compare',experiment:null,compareA:st.compare[0],compareB:st.compare[1]});}
 $('journey-prev').disabled=i===0;
 const ok=canAdvance(st,s.answers);$('journey-next').disabled=!ok;$('journey-next').textContent=last?'Finish ✓':'Next →';
 $('journey-next').setAttribute('aria-label',ok?(last?'Finish the journey':'Next stop'):'Answer the question to continue');
 $('journey-dots').textContent=j.steps.map((_,k)=>k<i?'●':k===i?'◉':'○').join(' ');
 const body=st.world?bodies.find(b=>b.data.name===st.world):null;
 if(body)aimCamera({...s,world:st.world,feature:'overview'},body);else aimCamera({...s,feature:'orbit'});
}
$('journey-prev').onclick=()=>{stopAudio();if(state.value.voyage!=null){if(state.value.voyage>0&&!voyageBusy)travel(state.value.voyage-1);return;}state.update({step:Math.max(0,state.value.step-1)});render();};
$('journey-next').onclick=()=>{stopAudio();if(state.value.voyage!=null){const s=state.value,st=VOYAGE.steps[s.voyage];if(voyageBusy||!canAdvance(st,s.answers))return;if(s.voyage>=VOYAGE.steps.length-1)endVoyage();else travel(s.voyage+1);return;}const s=state.value,j=journey(s.journey);if(!j||!canAdvance(j.steps[s.step],s.answers))return;
 if(s.step>=j.steps.length-1)state.update({journey:null,step:0});else state.update({step:s.step+1});render();};
function seasonLabel(a){
 const angle=wrap(a);
 if(angle<1||angle>359)return 'June solstice';if(Math.abs(angle-90)<1)return 'September equinox';if(Math.abs(angle-180)<1)return 'December solstice';if(Math.abs(angle-270)<1)return 'March equinox';
 return angle<90?'June → September':angle<180?'September → December':angle<270?'December → March':'March → June';
}
$('experiment-angle').oninput=()=>{stopAudio();const s=state.value;state.update(s.experiment==='seasons'?{orbit:+$('experiment-angle').value}:{phase:+$('experiment-angle').value});paintExperiment();};
$('node').oninput=()=>{stopAudio();state.update({node:+$('node').value});paintExperiment();};
$('node-line-up').onclick=()=>{stopAudio();const p=wrap(state.value.phase);state.update({node:p<90||p>270?0:180});paintExperiment();};
$('no-tilt').onchange=()=>{stopAudio();state.update({tilt:$('no-tilt').checked?0:23.44});paintExperiment();};
$('latitude').oninput=()=>{stopAudio();state.update({latitude:+$('latitude').value});paintExperiment();};
$('experiment-reset').onclick=()=>{stopAudio();state.reset();paintExperiment();};

for(const id of ['compare-a','compare-b'])$(id).innerHTML=Object.keys(NEARBY).map(n=>`<option>${n}</option>`).join('');
$('compare-a').onchange=()=>{state.update({compareA:$('compare-a').value});paintCompare();};
$('compare-b').onchange=()=>{state.update({compareB:$('compare-b').value});paintCompare();};
$('mass').oninput=()=>{state.update({mass:+$('mass').value});paintCompare();};
function paintCompare(){
 const {compareA:a,compareB:b,mass}=state.value,A=NEARBY[a],B=NEARBY[b];
 $('compare-a').value=a;$('compare-b').value=b;$('mass').value=mass;$('mass-value').textContent=`${mass} kg`;
 const max=Math.max(A.diameter,B.diameter), base=innerWidth<760?110:150;
 const colours={Earth:'#407cb6',Moon:'#aaa69e',Mars:'#a75f44'};
 $('kicker').textContent='Compare nearby worlds';$('title').textContent=`${a} and ${b}`;$('fact').textContent=`${a} is ${(A.diameter/B.diameter).toFixed(2)} times the width of ${b}.`;
 $('compare-visual').innerHTML=[[a,A],[b,B]].map(([n,d])=>`<figure><div class="disk" style="width:${base*d.diameter/max}px;height:${base*d.diameter/max}px;background:${colours[n]}"></div><figcaption>${n}<small>${Math.round(d.diameter).toLocaleString('en-IN')} km wide</small></figcaption></figure>`).join('');
 $('view-caption').textContent='Flat disks compare equatorial diameters at the same scale; distances are not pictured.';
 $('size-result').textContent=`${a} is ${(A.diameter/B.diameter).toFixed(2)} times the width of ${b}. The disks use the same size scale.`;
 $('weight-result').innerHTML=`<strong>${a}: ${weightNewtons(mass,A.gravity).toFixed(0)} N · ${b}: ${weightNewtons(mass,B.gravity).toFixed(0)} N</strong><p>Your mass stays ${mass} kg. Gravity pulls ${(A.gravity/B.gravity).toFixed(2)} times as strongly on ${a} as on ${b}. Your weight (the force of gravity) changes. N means newtons, the unit of force.</p>`;
 $('conditions').innerHTML=[[a,A],[b,B]].map(([n,d])=>`<h3>${n}</h3><p>${d.condition} ${d.atmosphere}</p><p><b>${d.distanceLabel}:</b> ${d.distance.toLocaleString('en-IN')} km.</p>`).join('');
 $('compare-depth').innerHTML=`<p>Equatorial diameter = width across the equator. The comparison Moon diameter (3,476.2 km) is equatorial; the scene’s 3,474.8 km Moon uses its mean diameter. Gravity values are approximate surface means: Earth 9.82, Moon 1.62, Mars 3.73 m/s² (metres per second squared). Weight = mass × surface gravity. Real readings vary with location.</p><p>Mean distance = average orbital scale, not today’s separation. Moon distance is measured from Earth’s centre; planet distances are from the Sun’s centre. These are different reference points, so do not compare them as distances from the same place. Mars–Earth distance changes continually.</p><p>Moon temperature examples depend strongly on sunlight and location, not a single “Moon temperature”. Conditions are descriptive, not live readings.</p>${sourceLink(A.source,a+' data')} · ${sourceLink(B.source,b+' data')} · ${sourceLink('moon','Lunar surface and temperatures')}${sourceNote}`;
 narration='lab_compare';
}
// Camera: a closed sheet (start, empty tap, ✕, Overview) or the orbit feature shows the
// whole system; an open world card glides to that world. Only re-aim when the target changes,
// so expanding or collapsing the sheet does not restart the glide.
const PHOTO_MAPS=['Sun','Mercury','Earth','Moon','Mars','Jupiter','Saturn','Uranus','Neptune'];
let cameraKey=null;
// Major moons are bodies whose data names a parent planet.
const moonsOf=name=>bodies.filter(b=>b.data.parent===name);
// Framing a whole moon system: far enough back that the outermost drawn orbit fits on screen.
// The camera's vertical field is 50°; on a portrait phone the horizontal field is much narrower, so
// the distance is set by whichever is tighter, with a 15% margin.
const systemMul=b=>{const ms=moonsOf(b.data.name);if(!ms.length)return 0;
 const half=Math.tan(25*Math.PI/180)*Math.min(1,(globalThis.innerWidth||1)/(globalThis.innerHeight||1));
 return Math.max(...ms.map(m=>m.data.dist))*1.15/half/b.data.size;};
function aimCamera(s,body){
 const system=s.feature==='moons'&&moonsOf(s.world).length>0;
 const key=s.sheet==='closed'||s.feature==='orbit'?'overview':`${s.world}${system?':moons':''}`;
 if(key===cameraKey)return;cameraKey=key;
 if(key==='overview')unfocus(true,1.5);else focus(body,{silent:true,outside:s.world!=='Sun'&&!system,dur:1.1,mul:system?systemMul(body):0}); // approach from the sunlit side
}
function dwarfInsight(d){
 const belt=d.a<5,years=d.period/365.25,km=d.km.toLocaleString('en-IN');
 return {intro:`${d.name} is ${d.kind==='Asteroid'?'one of the largest asteroids':'a dwarf planet'}, about ${km} km across, in the ${belt?'asteroid belt between Mars and Jupiter':'Kuiper Belt beyond Neptune'}.`,
  question:'See its orbit',experiment:null,line:null,features:[['overview','Look closer'],['orbit','Its orbit']],
  deeper:`${d.name} takes about ${years<10?years.toFixed(1):Math.round(years)} years to go round the Sun, at an average of ${d.a} AU. Its orbit is tilted ${d.i}° to Earth’s and ${d.e>0.15?'noticeably stretched':'nearly round'} (eccentricity ${d.e}).${d.name==='Pluto'?' At its closest it comes inside Neptune’s orbit, but the two never meet: Pluto goes round twice for every three Neptune orbits.':''}${belt?' The asteroid belt holds over a million rocks larger than 1 km, yet together they weigh less than our Moon. They are so far apart that spacecraft fly through without trying to dodge.':' The Kuiper Belt is a wide ring of icy worlds left over from when the planets formed.'}`,
  source:null,dwarf:true};
}
function moonInsight(d){
 const km=Math.round(d.km).toLocaleString('en-IN');
 return {intro:`${d.name} is one of ${d.parent}’s moons, about ${km} km across.`,question:`See all of ${d.parent}’s big moons`,experiment:null,line:null,
  features:[['overview','Look closer'],['parent',`Back to ${d.parent}`]],
  deeper:`${d.name} is about ${km} km across and orbits ${d.parent} once every ${d.period<2?(d.period*24).toFixed(1)+' hours':d.period.toFixed(d.period<10?2:1)+' days'}, at an average of ${d.aKm.toLocaleString('en-IN')} km. Like our Moon, it keeps the same face toward its planet.${d.incl?' Its orbit is tilted past upright, so it travels the opposite way to its planet’s spin.':''}`,
  source:null,moon:true};
}
// "Its moons": the planet's known-moon count, then a button for each big moon drawn in the scene.
function paintMoons(s,body,ms){
 const show=s.feature==='moons'&&ms.length>0;$('world-moons').hidden=!show;
 if(!show){if(MOON_COUNT[s.world]&&!body.data.parent)$('world-size').textContent+=` ${s.world} has ${MOON_COUNT[s.world]}.`;return;}
 $('moon-count').textContent=`${s.world} has ${MOON_COUNT[s.world]}. ${ms.length===1?`The biggest, ${ms[0].data.name}, is`:s.world==='Mars'?'Both are':'The big ones are'} drawn here:`;
 $('moon-list').innerHTML=ms.map(m=>`<button data-moon="${m.data.name}">${m.data.name}<small>${Math.round(m.data.km).toLocaleString('en-IN')} km</small></button>`).join('');
 for(const b of $('moon-list').querySelectorAll('button'))b.onclick=()=>go({world:b.dataset.moon,feature:'overview'});
 $('moon-note').textContent='Moon sizes are true to scale with the planet. Their orbits are drawn much closer in, in the right order; Real scale shows the true distances. All are drawn as spheres (Phobos and Deimos are really lumpy), with illustrative colours, and the fastest moons are slowed so they don’t blur.';
}
function paintExplore(){
 const s=state.value,body=bodies.find(b=>b.data.name===s.world),moon=!!body.data.parent,dwarf=!!body.data.kind,info=INSIGHTS[s.world]||(moon?moonInsight(body.data):dwarf?dwarfInsight(body.data):genericInsight(body.data));
 const sysMoons=moonsOf(s.world);
 if(sysMoons.length&&!info.features.some(f=>f[0]==='moons'))info.features=[...info.features,['moons','Its moons']];
 // A planet with moons: the main button shows them (Earth keeps its seasons lab).
 const meetMoons=sysMoons.length>0&&!info.experiment;
 $('world').value=s.world;$('kicker').textContent=s.world==='Sun'?'Our star':s.world==='Moon'?'Earth’s Moon':moon?`Moon of ${body.data.parent}`:dwarf?body.data.kind:'Planet';$('title').textContent=s.world;
 $('fact').textContent=STRIKING[s.world]||body.data.fact||'';
 narration=info.line||`f_${s.world}_0`;$('world-insight').textContent=LINES[narration]||info.intro;
 $('features').innerHTML=info.features.map(([id,text])=>`<button data-feature="${id}" aria-pressed="${s.feature===id}">${text}</button>`).join('');
 for(const b of $('features').querySelectorAll('button'))b.onclick=()=>{
  if(b.dataset.feature==='moon')return go({world:'Moon',feature:'overview'});
  if(b.dataset.feature==='phases')return go({view:'try',experiment:'phases'});
  if(b.dataset.feature==='parent')return go({world:body.data.parent,feature:'moons'});
  go({feature:b.dataset.feature,sheet:state.value.sheet});
 };
 $('action').hidden=false;$('action').textContent=meetMoons?`Meet ${s.world}’s moons`:info.question;
 $('action').onclick=()=>info.experiment?go({view:'try',experiment:info.experiment}):moon?go({world:body.data.parent,feature:'moons'}):meetMoons?go({feature:'moons',sheet:'half'}):go({feature:'orbit',sheet:state.value.sheet});
 const ratio=body.data.km/12756;
 const light=sunlightTo(s.world);
 $('world-size').textContent=(s.world==='Earth'?'Earth is 12,756 km wide at the equator.':`${s.world} is ${ratio>=1?ratio.toFixed(ratio>=10?0:1)+' times as wide as':Math.round(ratio*100)+'% as wide as'} Earth (${body.data.km.toLocaleString('en-IN')} km).`)+(light?` Sunlight takes ${formatDuration(light)} to get here.`:'');
 paintMoons(s,body,sysMoons);
 const nearby=NEARBY[s.world];$('compare-shortcut').hidden=!nearby;
 if(nearby){const other=s.world==='Earth'?'Moon':'Earth';$('compare-shortcut').textContent=`Compare ${s.world} with ${other} →`;$('compare-shortcut').onclick=()=>go({view:'compare',experiment:null,compareA:s.world,compareB:other});}
 $('world-deeper').textContent=info.deeper;
 // Avoid stale, changing outer-planet moon counts in the new UI; dated legacy figures remain in data.js.
 $('world-facts').innerHTML=body.data.facts.filter(([k])=>k!=='Moons').map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
 const url=info.source?NASA[info.source]:`https://science.nasa.gov/${s.world==='Sun'?'sun':s.world.toLowerCase()}/facts/`;
 const photoCredit=PHOTO_MAPS.includes(s.world)?'<p class="fine">Surface map: <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener">Solar System Scope</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>), based on NASA mission imagery.</p>':s.world==='Venus'?'<p class="fine">Shown as its cloud tops, as Venus looks from space; its surface is only seen by radar.</p>':'';
 if(dwarf){const [label,href]=DWARF_SOURCES[s.world];$('world-sources').innerHTML=`<a href="${href}" target="_blank" rel="noopener">${label}</a> · <a href="${SBDB(s.world)}" target="_blank" rel="noopener">JPL · orbit elements</a><p class="fine">Size and orbit data read 9 November 2026. Surface colours are illustrative: only Pluto, Ceres and Vesta have been seen up close.</p>`;}
 else if(moon){$('world-sources').innerHTML=`<a href="${SAT_SOURCES[body.data.parent]}" target="_blank" rel="noopener">NASA · ${body.data.parent} satellite fact sheet</a> · <a href="${JPL_RADII}" target="_blank" rel="noopener">JPL · moon sizes</a><p class="fine">Orbit and size data read 9 November 2026. Colours are illustrative.</p>`;}
 else $('world-sources').innerHTML=`<a href="${url}" target="_blank" rel="noopener">NASA · ${s.world}</a>${info.source?sourceNote:'<p class="fine">Baseline facts checked 8 November 2026 against NASA sources; see docs/sources.md. Changing moon counts are omitted.</p>'}`;
 $('world-sources').insertAdjacentHTML('beforeend',photoCredit);
 $('world-scale').textContent='Model caveats: spherical worlds, circular mostly coplanar orbits, accelerated time, procedural surfaces. Earth coastlines use Natural Earth data. Moon craters and weather are not live or mapped observations. Sun size is 1/5 in the default view and 1/10 in the overview (so the inner planets stay visible), where orbits also run at 1/5 speed; orbit gaps and Moon gap are compressed. Real scale restores size/distance ratios, not an actual-date sky. Faint fill light reveals the night-side shape.';
 aimCamera(s,body);
 $('view-caption').textContent=s.feature==='moons'&&sysMoons.length?`${s.world} and its big moons · true sizes, orbits drawn closer than real · not current positions`:moon?`${s.world} · a moon of ${body.data.parent} · drag to look around · illustrative colours`:s.feature==='orbit'?(s.world==='Sun'?'The Sun and eight planets · schematic view, not current positions':`${s.world} orbits the Sun · schematic Solar System view; not current positions`):s.world==='Earth'?'Drag to look around · gold line: Earth’s tilted spin axis · day/night comes from sunlight':s.world==='Moon'?'Earth’s Moon · Explore the phases shows the view from Earth':`${s.world} · drag to look around · illustrative surface and lighting`;
 if(s.feature==='day'){narration='lab_day';$('world-insight').textContent=LINES[narration];}
}
const fmt=(n,d=0)=>n.toLocaleString('en-IN',{maximumFractionDigits:d});
const entryOf=name=>starsView.entries.find(e=>e.name===name);
// The two largest scales (cosmos-data.js): Laniakea and the observable universe.
function pickCosmos(level,item){dismissHint();go({view:level,landmark:item.name,sheet:'peek'});}
function paintCosmos(){
 const s=state.value,lv=s.view,it=s.landmark&&sceneOf(lv).items().find(x=>x.name===s.landmark);narration=null;$('action').hidden=true;$('star-panel').hidden=false;
 $('star-companions').textContent='';$('star-planets').innerHTML='';
 const rows=r=>$('star-facts').innerHTML=r.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
 const link=(href,t)=>`<a href="${href}" target="_blank" rel="noopener">${t}</a>`,wiki=t=>link(`https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g,'_'))}`,t);
 if(lv==='super'){
  const depth=`<p>Each dot is a real galaxy from the NGC and IC catalogues (9,696 with measured redshifts, from OpenNGC). Its distance comes from its redshift using the Hubble law (distance = speed ÷ 70 km/s per megaparsec). That works well at these distances but not perfectly: galaxies in a cluster also swarm around inside it, which stretches each cluster along our line of sight. The catalogues favour bright, nearby galaxies, so the map thins out with distance; and few galaxies appear in a band around the sky where our own Galaxy’s dust blocks the view (the “zone of avoidance”). Laniakea itself has no sharp edge: it was defined in 2014 from the way galaxies flow, all heading towards the Great Attractor.</p>`;
  if(!it){$('kicker').textContent='Our supercluster';$('title').textContent='Laniakea';
   $('fact').textContent='The Local Group is one small part of Laniakea (Hawaiian for “immeasurable heaven”), a supercluster of about 100,000 galaxies. Every dot here is a real galaxy.';
   $('view-caption').textContent='Real galaxies placed by redshift · rings at 100, 200 and 300 million light-years';
   rows([['Across',`${COSMOS_FACTS.laniakeaWidth} light-years`],['Galaxies',COSMOS_FACTS.laniakeaGalaxies],['Mass',COSMOS_FACTS.laniakeaMass],['Mapped','2014, by Tully, Courtois, Hoffman and Pomarède'],['Dots shown','9,696 galaxies from the NGC and IC catalogues']]);
   $('star-depth').innerHTML=`${depth}${wiki('Laniakea Supercluster')} · ${link('https://github.com/mattiaverga/OpenNGC','OpenNGC (CC BY-SA 4.0)')}${sourceNote}`;return;}
  $('kicker').textContent=it.here?'Our group of galaxies':it.kind;$('title').textContent=it.name;
  $('fact').textContent=it.here?'Our own small group: the Milky Way, Andromeda, Triangulum and dozens of dwarfs. At this scale, all of it is one bright dot.':it.fact;
  $('view-caption').textContent=it.here?'You are here':`About ${fmt(it.mly)} million light-years away`;
  rows(it.here?[['Across','about 10 million light-years'],['Galaxies','more than 100']]:[['Distance',`about ${fmt(it.mly)} million light-years`],['The light you see left it',`about ${fmt(it.mly)} million years ago`],['Type',it.kind],...(it.galaxies?[['Galaxies',it.galaxies]]:[])]);
  $('star-depth').innerHTML=`${depth}${wiki(it.here?'Local Group':it.name==='Centaurus A'?'Centaurus A':it.name)}${sourceNote}`;return;
 }
 const depth=`<p>Light travels at a fixed speed, so looking far is looking back in time. The universe is 13.8 billion years old, yet we can see out to about 46 billion light-years in every direction, because space has been stretching while the light was on its way: the places where the oldest light set out are now far more distant than 13.8 billion light-years. The rings mark how long ago the light from each distance left. The web of galaxies drawn here is an illustration of the real pattern (strands and knots of galaxies around huge empty voids); real strands are far finer than this. Distances use the standard cosmological model with Planck 2018 values.</p>`;
 if(!it){$('kicker').textContent='Everything we can see';$('title').textContent='The observable universe';
  $('fact').textContent='About 93 billion light-years across. Its edge is not a wall: it is simply as far as light has had time to reach us from.';
  $('view-caption').textContent='Rings: how long ago the light left · the web is an illustration, not a map';
  $('star-companions').innerHTML='<b>Why is it round?</b> Light has had the same 13.8 billion years to reach us from every direction, so the part of the universe we can see is a sphere with us at its centre. Every observer, anywhere, sits at the centre of their own. The whole universe is bigger, perhaps infinite, and its shape is not known.';
  rows([['Across',`about 93 billion light-years`],['Age of the universe',COSMOS_FACTS.age],['Galaxies',COSMOS_FACTS.galaxies],['Light from the edge left',`about 13.8 billion years ago`],...SHELLS.map(x=>[`Light from ${fmt(x.gly,1)} billion ly away`,`left ${fmt(x.gyr,1)} billion years ago`])]);
  $('star-depth').innerHTML=`${depth}${wiki('Observable universe')} · ${wiki('Cosmic microwave background')}${sourceNote}`;return;}
 $('kicker').textContent=it.here?'Our supercluster':it.kind;$('title').textContent=it.cmb?'The cosmic microwave background':it.name;
 if(it.here){$('fact').textContent='Laniakea, with all its 100,000 galaxies, is the small bright knot at the centre.';$('view-caption').textContent='You are here';rows([['Across','about 400–500 million light-years'],['Share of the observable universe','about half a percent of its width']]);}
 else if(it.cmb){$('fact').textContent='The oldest light there is, released about 380,000 years after the Big Bang, when the universe first became clear enough for light to travel. It glows faintly from every direction; the pattern drawn here is an illustration.';$('view-caption').textContent='The edge of what we can see';
  rows([['Light left it','about 13.8 billion years ago'],['Where it set out from is now',`about ${fmt(CMB_GLY,1)} billion light-years away`],['Redshift','about 1,090: its light has been stretched more than a thousand times, into microwaves'],['Discovered','1965, by Penzias and Wilson']]);}
 else{$('fact').textContent=it.fact;$('view-caption').textContent=`Announced ${it.announced} · James Webb Space Telescope`;
  rows([['Its light left it',`about ${fmt(it.lookback,1)} billion years ago`],['We see it as it was','about 280 million years after the Big Bang'],['Where it is now','about 33.8 billion light-years away'],['Redshift',`${it.z}`]]);}
 $('star-depth').innerHTML=`${depth}${wiki(it.here?'Laniakea Supercluster':it.cmb?'Cosmic microwave background':'MoM-z14')}${sourceNote}`;
}
// The Local Group: our galaxy's neighbourhood (local-data.js).
function paintLocal(){
 const s=state.value,g=s.landmark&&localView.galaxies.find(x=>x.name===s.landmark);narration=null;$('action').hidden=true;$('star-panel').hidden=false;
 $('star-companions').textContent='';$('star-planets').innerHTML='';
 const caveat='<p>Galaxies are placed by their real direction in the sky and measured distance; 1 unit here is 10,000 light-years, so the Milky Way is drawn exactly as in the previous level, shrunk ten times. The spirals’ tilts come from their measured inclination and orientation. The shapes of Andromeda, Triangulum and the Magellanic Clouds are simple models, and dwarf galaxies are drawn as glows: most are too faint and spread out to show at this scale.</p>';
 const andromeda=localView.galaxies.find(x=>x.short==='Andromeda'),mw=localView.galaxies[0];
 if(!g){
  $('kicker').textContent='Our neighbourhood of galaxies';$('title').textContent='The Local Group';
  $('fact').textContent='The Milky Way and Andromeda, the two big spirals, with Triangulum and dozens of small dwarf galaxies, all held together by gravity.';
  $('view-caption').textContent='Rings: 1, 2 and 3 million light-years from the Milky Way · model, not a photograph';
  $('star-facts').innerHTML=[['Across',`${LOCAL_FACTS.width} light-years`],['Galaxies',LOCAL_FACTS.members],['Total mass',LOCAL_FACTS.mass],['Biggest members','Andromeda, the Milky Way, Triangulum'],['Milky Way to Andromeda',`about ${fmt(distanceBetween(mw,andromeda)/1000,1)} million light-years`]].map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('star-depth').innerHTML=`${caveat}<a href="https://en.wikipedia.org/wiki/Local_Group" target="_blank" rel="noopener">Local Group</a> · <a href="https://en.wikipedia.org/wiki/List_of_nearest_galaxies" target="_blank" rel="noopener">List of nearest galaxies</a>${sourceNote}`;
  return;
 }
 $('kicker').textContent=g.here?'Our galaxy':g.kind;$('title').textContent=g.name;
 $('fact').textContent=g.fact||`A ${g.kind.toLowerCase()} about ${g.mly<1?fmt(g.mly*1000)+' thousand':fmt(g.mly,2)+' million'} light-years away.`;
 $('view-caption').textContent=g.here?'You are here · the second-biggest galaxy in the Local Group':`${g.mly<1?fmt(g.mly*1000)+',000':fmt(g.mly,2)+' million'} light-years from the Sun`;
 const rows=[];
 if(!g.here){rows.push(['Distance',g.mly<1?`about ${fmt(g.mly*1000)},000 light-years`:`about ${fmt(g.mly,2)} million light-years`]);
  rows.push(['The light you see left it',g.short==='Andromeda'?'about 2.5 million years ago, around when the first humans of our genus, Homo, appeared':g.mly<1?`about ${fmt(g.mly*1000)},000 years ago`:`about ${fmt(g.mly,1)} million years ago`]);}
 rows.push(['Type',`${g.kind}${g.type?` (${g.type})`:''}`]);if(g.stars)rows.push(['Stars',g.stars]);if(g.size)rows.push(['Width',`about ${fmt(g.size)},000 light-years`]);if(g.alt)rows.push(['Also called',g.alt]);
 if(g.short==='Andromeda')rows.push(['Moving towards us','about 110 km/s'],['Will it hit the Milky Way?','Maybe. It was long predicted for about 4.5 billion years from now; a 2025 study with newer data gives about even odds of a merger within 10 billion years']);
 if(g.short==='Triangulum')rows.push(['Distance from Andromeda',`about ${fmt(distanceBetween(g,andromeda)/1000,2)} million light-years`]);
 $('star-facts').innerHTML=rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
 const wiki=g.here?'Milky_Way':g.name.replace(/’/g,"'").replace(/ /g,'_');
 $('star-depth').innerHTML=`${caveat}${g.short==='Andromeda'?'<p>Andromeda’s light is blueshifted: it is coming towards us. Its sideways motion is much harder to measure, which is why the odds of a collision keep changing. Earlier studies predicted a head-on merger in about 4.5 billion years; Sawala et al. (2025), adding newer Gaia and Hubble data and the pull of Triangulum and the Large Magellanic Cloud, found about a 50% chance of a merger in the next 10 billion years.</p>':''}<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(wiki)}" target="_blank" rel="noopener">${g.name}</a>${g.short==='Andromeda'?' · <a href="https://en.wikipedia.org/wiki/Andromeda%E2%80%93Milky_Way_collision" target="_blank" rel="noopener">Andromeda–Milky Way collision</a>':''}${sourceNote}`;
}
function paintGalaxy(){
 const s=state.value,m=s.landmark&&galaxyView.landmarks.find(x=>x.name===s.landmark);narration=null;$('action').hidden=true;$('star-panel').hidden=false;
 $('star-companions').textContent='';$('star-planets').innerHTML='';
 const caveat='<p>No one has seen the Milky Way from outside: we live inside its disc. This picture is a model built from maps of gas, young stars and their measured distances. The spiral arms follow published fits (Reid et al. 2019) and are best known on our side; the far side is extrapolated. Landmarks are placed by their real direction and distance.</p>';
 if(!m||m.name==='Sun'){
  $('kicker').textContent=m?'Our star':'Our galaxy';$('title').textContent=m?'The Sun in the Milky Way':'The Milky Way';
  $('fact').textContent=m?m.fact:'A spiral of 100–400 billion stars. The Sun is one of them, out in a small arm called the Orion Spur.';
  $('view-caption').textContent='Model of the Milky Way seen from above · dashed line: the Sun’s orbit · not a photograph';
  $('star-facts').innerHTML=[['Stars',GALAXY_FACTS.stars],['Width',`${GALAXY_FACTS.diameter} light-years`],['Disc thickness',`${GALAXY_FACTS.thickness} light-years`],['Sun to centre','about 27,000 light-years'],['One orbit of the Sun',`${GALAXY_FACTS.orbitMyr} years`],['Last time the Sun was here','the first dinosaurs were just appearing'],['The Sun’s speed around the centre',`about ${VC_SUN} km/s, or about ${fmt(Math.round(VC_SUN*3.6/10)*10000)} km/h`],['Spiral arms','a pattern that stars move through, like a traffic jam that cars drive in and out of'],['Laps since the Sun formed','about 20, over 4.6 billion years']].map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('star-depth').innerHTML=`${caveat}<p>Estimates of the Galaxy’s width range from about 87,000 to over 100,000 light-years depending on where you set the edge; of the Sun’s orbit, from 212 to 240 million years. Our whole 16-light-year neighbourhood from the previous level would be smaller than a single pixel here.</p><p><strong>How the motion works.</strong> Press play to run the clock, about 10 million years each second. Stars near the Sun and farther out move at nearly the same speed, about ${VC_SUN} km/s (a flat rotation curve), so inner stars go round in far less time: the disc shears rather than turning like a wheel. The bright moving stars follow their own orbits. The spiral arms are a density wave, a pattern that turns more slowly as one shape (about ${OMEGA_ARMS} km/s per kiloparsec), so stars drift into an arm, crowd together and move on; if the arms were made of the same stars, they would wind up tightly within a few turns. The central bar turns faster (about ${OMEGA_BAR}). Near the Sun, stars and arms move almost in step: the Sun sits close to what astronomers call corotation. In this model one lap of the Sun takes ${Math.round(SUN_PERIOD)} million years. The Sun also bobs up and down through the disc every 60–70 million years, reaching only about 150–300 light-years above and below its middle, too little to see at this scale. Simplifications: orbits are circles, the arm shapes are held fixed, and real stars also wander inwards and outwards over billions of years, so the clock runs only about one lap either way. Nebulae and young clusters last a few million years, so away from today only the Sun and the black hole are marked.</p><p class="fine">Sources: <a href="https://arxiv.org/abs/1810.09466" target="_blank" rel="noopener">Eilers et al. 2019 (rotation curve)</a> · <a href="https://arxiv.org/abs/1905.08133" target="_blank" rel="noopener">Dias et al. 2019 (arm pattern speed)</a> · <a href="https://arxiv.org/abs/2012.10130" target="_blank" rel="noopener">Shen &amp; Zheng 2020 (bar)</a> · <a href="https://ui.adsabs.harvard.edu/abs/1985Natur.316..706B/abstract" target="_blank" rel="noopener">Bahcall &amp; Bahcall 1985 (vertical motion)</a></p><a href="https://en.wikipedia.org/wiki/Milky_Way" target="_blank" rel="noopener">Milky Way overview</a> · <a href="https://science.nasa.gov/resource/the-milky-way-galaxy/" target="_blank" rel="noopener">NASA · The Milky Way</a>${sourceNote}`;
  return;
 }
 $('kicker').textContent=m.kind;$('title').textContent=m.name;$('fact').textContent=m.fact;
 $('view-caption').textContent=`${fmt(m.kly*1000)} light-years from the Sun · toward ${m.constellation} in our sky`;
 const ago=Math.round(m.kly*1000);
 const rows=[['Distance from the Sun',`about ${fmt(ago)} light-years`],['The light you see left it',m.name==='Crab Nebula'?'about 6,500 years before the 1054 explosion was seen':`about ${fmt(ago)} years ago`],['In our sky','toward '+m.constellation]];
 if(m.name==='Sagittarius A*')rows.push(['Mass','about 4.3 million Suns'],['First image','2022, Event Horizon Telescope']);
 $('star-facts').innerHTML=rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
 $('star-depth').innerHTML=`${caveat}<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(m.name.replace(/ /g,'_'))}" target="_blank" rel="noopener">${m.name}: distance and position</a>${sourceNote}`;
}
function paintStar(){
 const s=state.value,e=s.star&&entryOf(s.star);narration=null;
 $('star-panel').hidden=!e;$('action').hidden=true;
 if(!e){$('kicker').textContent='Our neighbourhood';$('title').textContent='The nearest stars';$('fact').textContent='Every star and brown dwarf within 16 light-years.';$('view-caption').textContent='';return;}
 const p=e.primary||e.stars[0];
 $('kicker').textContent=e.visitor?`Passing star · ${e.kind}`:`${e.kind} · ${p.type}`;$('title').textContent=e.name;
 $('fact').textContent=e.sun?'Our own star. From here, every other star is a point of light.':STAR_FACTS[e.name]||e.fact||`A ${e.kindBlurb}, ${fmt(e.ly,1)} light-years away.`;
 $('view-caption').textContent=e.sun?'The Sun at the centre · rings at 5, 10 and 15 light-years':`${fmt(e.ly,2)} light-years from the Sun · positions to scale · star sizes show brightness, not true size`;
 const naked=p.mag!=null&&p.mag<6;
 const rows=e.sun?[['Type','Yellow dwarf (G2V)'],['Surface temperature','about 5,800 K'],['Sunlight reaches Earth in','about 8 minutes']]:[
  ['Distance',`${fmt(e.ly,2)} light-years`],['The light you see left it',`around ${lightLeftYear(e.ly)}`],['Type',`${e.kind} (${p.type})`],
  ['Surface temperature',`about ${fmt(e.temp)} K`],['Visible brightness',p.mag==null?'too faint to see; infrared only':`magnitude ${p.mag}${naked?' · visible to the naked eye':' · needs a telescope or binoculars'}`]];
 const mo=e.motion;if(mo)rows.push(['Speed compared with the Sun',`about ${fmt(mo.kms)} km/s`+(mo.rvKnown?'':' across the sky (its speed towards or away from us is not yet measured)')],['Closest to the Sun',mo.rvKnown?approachLabel(mo.close):'unknown: needs its speed towards or away from us']);
 $('star-facts').innerHTML=rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
 $('star-companions').textContent=e.stars.length>1?`A ${['','','double','triple','quadruple'][e.stars.length]||'multiple'} system: ${e.stars.map(x=>`${x.name} (${starKindShort(x.type)})`).join(', ')}.`:'';

 const ps=e.planets;
 $('star-planets').innerHTML=ps?`<p><b>${ps.planets.length} known planet${ps.planets.length>1?'s':''}.</b> ${ps.logL!=null&&ps.planets.some(x=>{const hz=habitableZone(ps.logL,e.temp);return x[2]>=hz[0]&&x[2]<=hz[1];})?'At least one orbits in the habitable zone.':''}</p>`:e.sun?'':'<p class="fine">No planets confirmed yet.</p>';
 if(ps){$('action').hidden=false;$('action').textContent=`Visit its planets`;$('action').onclick=()=>go({view:'system',star:e.name,sheet:'half'});}
 const pr0=pairOf(e.name);if(pr0){const b=ps?$('action2'):$('action');b.hidden=false;b.textContent=ps?'Watch the pair orbit':`Watch ${pr0.brown?'the pair':'the two stars'} orbit each other`;b.setAttribute('aria-label',`Watch ${pr0.A} and ${pr0.B} orbit each other`);b.onclick=()=>go({view:'pair',star:e.name,sheet:'half'});}
 else if(e.visitor&&e.motion?.rvKnown){const c=e.motion.close;$('action').hidden=false;$('action').textContent=c.years<0?'Show its close pass':'Show its close approach';$('action').onclick=()=>{starsView.setTime(Math.round(c.years/100)*100,e);setSheet({sheet:'closed'});paintTime();};}
 else if(e.sun){$('action').hidden=false;$('action').textContent='Back to the Solar System';$('action').onclick=leaveStars;}
 $('star-depth').innerHTML=`<p>Positions come from each star’s direction in the sky and its measured distance, so the 3D layout is real. The rings mark 5, 10 and 15 light-years in the plane of the Solar System; the thin lines drop to that plane. Glow size shows how bright a star really is, not its true size; at this scale every star would be far too small to see.</p><p>Temperatures are typical values for the star’s spectral type. Magnitudes are visual brightness as seen from Earth (smaller is brighter; about 6 is the limit for the naked eye).</p><p><strong>How the stars move.</strong> Press play to run the clock, about 2,000 years each second, up to 100,000 years back or forward. Each star moves in a straight line at its measured speed: its drift across our sky (proper motion) combined with its speed towards or away from us (radial velocity). Over this span real paths are very nearly straight. The faint coloured line shows where a star has come from since today. A few cold brown dwarfs have no measured speed towards or away from us, so only their sideways drift is shown. The Sun’s neighbours all orbit the Galaxy too, but at almost the same speed as the Sun, so here you see only how they move relative to us. The map is drawn as the sky is now, so zooming out to the Milky Way or in to the Solar System first brings the clock back to today.</p><a href="https://en.wikipedia.org/wiki/List_of_nearest_stars" target="_blank" rel="noopener">Nearest-stars table (RECONS / Gaia values)</a>${ps?' · <a href="https://exoplanetarchive.ipac.caltech.edu/" target="_blank" rel="noopener">NASA Exoplanet Archive</a>':''}${sourceNote}`;
}
const starKindShort=t=>t[0]==='D'?'white dwarf':'LTY'.includes(t[0])?'brown dwarf':t[0]==='M'?'red dwarf':t[0]==='K'?'orange dwarf':t[0]==='G'?'Sun-like':'star';
// Two stars orbiting each other (star-pairs.js): the live year and separation tick in the card.
let pairText='';
function paintPairClock(){const i=starsView.pairInfo();if(!i||state.value.view!=='pair')return;const t=`Year ${Math.floor(i.year)} · ${fmt(i.sep,1)} AU apart`;if(t!==pairText){pairText=t;$('view-caption').textContent=`${t} · one lap shown in about 12 seconds`;}}
function paintPair(){
 const s=state.value,e=entryOf(s.star),pr=pairOf(e.name);narration=null;$('action').hidden=true;
 if(starsView.pairInfo()?.pr!==pr)starsView.openPair(e);pairText='';
 const brown=pr.brown,lap=pr.P<100?`${fmt(pr.P,1)} years`:`about ${fmt(Math.round(pr.P/10)*10)} years`,next=nextPeriastron(pr,new Date().getFullYear()+new Date().getMonth()/12);
 $('kicker').textContent=brown?'Two brown dwarfs':'Two stars';$('title').textContent=`${pr.A} and ${pr.B}`;
 $('fact').textContent=`They go round each other once every ${lap}. ${pr.note}`;
 paintPairClock();
 $('system-legend').innerHTML=`<span><i class="sw cmp"></i>Our planets’ orbits for comparison</span><span><i class="sw cm"></i>Centre of mass: both stars circle this point</span>`;
 const M=pr.mA+pr.mB,share=Math.round(pr.mB/M*100);
 $('system-list').innerHTML=[
  ['One lap',lap],
  ['Closest',`${fmt(periastron(pr),1)} AU apart${next?` · next in ${Math.floor(next)}`:''}`],
  ['Farthest',`${fmt(apastron(pr),1)} AU apart`],
  ['Masses',brown?`${fmt(pr.mA/0.000954588,0)} and ${fmt(pr.mB/0.000954588,0)} times Jupiter`:`${fmt(pr.mA,2)} and ${fmt(pr.mB,2)} times the Sun`],
 ].map(([k,v])=>`<li><b>${k}</b><span>${v}</span></li>`).join('');
 $('system-depth').innerHTML=`<p>Drawn face on, in the plane of their orbit, to scale in AU (Earth–Sun distances); the stars themselves are drawn far larger than real. Each star follows its own ellipse around the centre of mass, and the lighter one swings wider: ${pr.B} carries ${share}% of the pair’s mass. They move fastest when closest (Kepler’s second law). The orbit is computed from published elements (period, size, eccentricity and the date of closest approach), so their places in the year shown match the real pair${pr.T0==null?', except that for this pair the date of closest approach is not published, so the starting point along the orbit is illustrative':''}. As a check, Kepler’s third law gives a total of ${brown?fmt(keplerMass(pr)/0.000954588,0)+' Jupiter masses':fmt(keplerMass(pr),2)+' Suns'} from the period and size alone, matching the measured masses.</p><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(e.name.replace(/ /g,'_'))}" target="_blank" rel="noopener">${e.name}: orbit and masses</a>${sourceNote}`;
}
function paintSystem(){
 const s=state.value,e=entryOf(s.star),ps=e.planets;narration=null;$('action').hidden=true;
 const view=e.sysView||starsView.openSystem(e);
 $('kicker').textContent=`Planets of ${ps.host||e.name}`;$('title').textContent=`${ps.planets.length} world${ps.planets.length>1?'s':''} around ${ps.host||e.name}`;
 const outer=view.aMax,merc=outer<0.387;
 $('fact').textContent=merc?`All of them orbit closer to their star than Mercury is to the Sun.`:`The outermost orbits ${fmt(outer,2)} times as far as Earth is from the Sun.`;
 $('view-caption').textContent='Orbits to scale with each other · planets drawn far larger than real · green band: habitable zone';
 $('system-legend').innerHTML=`${view.hz?`<span><i class="sw hz"></i>Habitable zone ${fmt(view.hz[0],3)}–${fmt(view.hz[1],3)} AU</span>`:'<span class="fine">Habitable zone not drawn: star’s total brightness not in the archive.</span>'}${view.compare.length?'<span><i class="sw cmp"></i>Our planets’ orbits for comparison</span>':''}`;
 $('system-list').innerHTML=view.planets.map(p=>`<li><b>${p.name}</b><span>${p.measured?`${fmt(p.r,2)} × Earth’s width`:`about ${fmt(p.r,1)} × Earth’s width (estimated)`}${p.mass!=null?` · at least ${fmt(p.mass,p.mass<10?2:0)} Earth masses`:''}</span><span>One orbit: ${p.period<2?fmt(p.period*24,0)+' hours':fmt(p.period,p.period<100?1:0)+' days'} · ${fmt(p.a,3)} AU${p.inHZ?' · <em>in the habitable zone</em>':''}</span></li>`).join('');
 $('system-depth').innerHTML=`<p>${ps.transits?'These planets pass in front of their star, so their sizes are measured.':'None of these planets has been seen crossing its star. Their masses are minimum masses from the wobble they cause in the star, and their sizes are estimates from those masses.'} “Habitable zone” (the conservative zone of Kopparapu et al. 2014) is the range of distances where an Earth-like planet could keep liquid water; it depends on the star’s brightness and temperature, and it does not mean a planet is habitable.</p><p>AU = the Earth–Sun distance. Orbits are drawn circular and in one plane; motion is slowed and compressed so you can follow it.</p><a href="https://exoplanetarchive.ipac.caltech.edu/" target="_blank" rel="noopener">NASA Exoplanet Archive</a>${sourceNote}`;
}
function render(){
 const s=state.value,space=SPACE.has(s.view),experiment=s.view==='try'&&!!s.experiment,scene=experiment&&SCENE_LABS.has(s.experiment);
 const level=levelOf(s.view);
 if(level!==shownLevel){const from=shownLevel;shownLevel=level;
  if(from!=='solar')sceneOf(from).leave();
  const at=arrival;arrival=null;
  if(level==='stars')starsView.enter(at||(from==='galaxy'?'outside':'inside'));if(level!=='solar'&&level!=='stars')sceneOf(level).enter(at);
  if(level==='solar'&&!at)unfocus(true,.01);}
if(level==='stars')(s.view==='system'?(()=>{if(starsView.mode!=='system'||starsView.pairInfo())starsView.openSystem(entryOf(s.star));})():s.view==='pair'?(()=>{if(starsView.pairInfo()?.pr!==pairOf(s.star))starsView.openPair(entryOf(s.star));})():starsView.mode==='system'&&starsView.closeSystem());
 if(level==='stars')starsView.select(s.star&&entryOf(s.star));if(level==='galaxy')galaxyView.select(s.landmark&&galaxyView.landmarks.find(x=>x.name===s.landmark));if(level==='local')localView.select(s.landmark&&localView.galaxies.find(x=>x.name===s.landmark));if(level==='super'||level==='universe')sceneOf(level).select(s.landmark&&sceneOf(level).items().find(x=>x.name===s.landmark));
 document.body.classList.toggle('space-mode',space);
 for(const b of $('ladder').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.level===level));
 if(race&&!(experiment&&s.experiment==='scale')){globalThis.cancelAnimationFrame?.(race.id);race=null;}
 sheet.dataset.state=s.sheet;document.body.dataset.sheet=s.sheet;
 const open=s.sheet!=='closed';sheet.inert=!open;sheet.setAttribute('aria-hidden',String(!open));
 if(!open&&sheet.contains(document.activeElement))$('back').focus();
 $('grip').setAttribute('aria-expanded',String(s.sheet==='half'||s.sheet==='full'));
 $('grip').setAttribute('aria-label',s.sheet==='full'?'Show less':'Show more');
 const voyage=s.voyage!=null;for(const v of ['explore','try','compare','journey'])$(v+'-panel').hidden=voyage?v!=='journey':s.view!==v;
 $('star-panel').hidden=voyage||!['stars','galaxy','local','super','universe'].includes(s.view);$('system-panel').hidden=voyage||!ORBITS.has(s.view);
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===s.view));
 $('back').hidden=!canGoBack(s);paintScope();
 gtime.hidden=!clockLevel()||open||voyage;if(!gtime.hidden)paintTime();
 $('world-depth').open=false;
 sheet.querySelector('.tabs').hidden=experiment||s.view==='journey'||space||voyage; // labs: controls first, Back returns to the tabs
 $('experiment-chooser').hidden=experiment;$('experiment').hidden=!scene;$('scale-lab').hidden=!(experiment&&s.experiment==='scale');$('experiment-reset').hidden=!experiment;
 $('orbit-map').hidden=!scene;
 document.body.classList.toggle('experiment-mode',scene);
 controls.enabled=!scene&&!space;hooks.hold=scene||space;
 hooks.renderOverride=level==='local'||level==='super'||level==='universe'?()=>{const r=$('stage').getBoundingClientRect();sceneOf(level).render(r.width,r.height,s.sheet==='closed'?null:visibleRegion(r.width,r.height,sheet.getBoundingClientRect()));}:level==='galaxy'?()=>{const r=$('stage').getBoundingClientRect();galaxyView.render(r.width,r.height,s.sheet==='closed'?null:visibleRegion(r.width,r.height,sheet.getBoundingClientRect()));}:space?()=>{const r=$('stage').getBoundingClientRect();starsView.render(r.width,r.height,s.sheet==='closed'?null:visibleRegion(r.width,r.height,sheet.getBoundingClientRect()));}:scene?()=>{const r=$('stage').getBoundingClientRect();experiments.render(r.width,r.height,s.sheet==='closed'?null:visibleRegion(r.width,r.height,sheet.getBoundingClientRect()));}:null;
 $('action2').hidden=true;
 if(voyage)paintVoyage();
 else if(s.view==='local')paintLocal();
 else if(s.view==='super'||s.view==='universe')paintCosmos();
 else if(s.view==='galaxy')paintGalaxy();
 else if(s.view==='stars')paintStar();
 else if(s.view==='system')paintSystem();
 else if(s.view==='pair')paintPair();
 else if(experiment){$('action').hidden=true;paintExperiment();}
 else if(s.view==='compare'){$('action').hidden=true;paintCompare();}
 else if(s.view==='explore')paintExplore();
 else if(s.view==='journey')paintJourney();
 else{narration='lab_try';$('action').hidden=true;$('kicker').textContent='Small science lab';$('title').textContent='Try an idea';$('fact').textContent=LINES.lab_try;$('view-caption').textContent='Five experiments. Change one thing and see why it matters.';}
 $('listen').hidden=!narration||!LINES[narration];
 if(bridge){hooks.renderOverride=drawBridge;hooks.hold=true;controls.enabled=false;starsView.controls.enabled=false;galaxyView.controls.enabled=false;localView.controls.enabled=false;for(const l of ['super','universe'])if(built(l))sceneOf(l).controls.enabled=false;}
 else{starsView.controls.enabled=level==='stars'&&starsView.mode==='stars';galaxyView.controls.enabled=level==='galaxy';localView.controls.enabled=level==='local';for(const l of ['super','universe'])if(built(l))sceneOf(l).controls.enabled=level===l;}
}
addEventListener('resize',()=>{if(state.value.view==='compare')paintCompare();});
render();

// ---- Powers of Ten (tour.js): one tap glides from Earth to the edge of the observable universe, stopping about
// once per power of ten. Each stop is played with the same glide as the scale ladder (animateTo), or a cut with
// reduced motion; a touch, pinch or wheel on the scene pauses it, and ✕ leaves you exploring from where you are.
// Where a stop is, as Z. The Solar System stops use the app's own framings (fitHomeDistance) for the current screen.
function tourZ(stop){const a=stop.at;
 if(a.ly)return Math.log(a.ly);
 if(a.overview)return zOf('universe',universeView().overviewDistance());
 const b=$('c').getBoundingClientRect(),asp=(b.width||1)/(b.height||1),dir=homeDirection(asp),fit=r=>fitHomeDistance(r,camera.fov,asp,dir);
 if(a.fit)return solarZ(fit(homeRadius(a.fit)),real());
 // A circle fitAU au across in the model: the model's blend depends on Z itself, so settle it in a few rounds.
 let Z=solarZ(fit(auToUnits(a.fitAU,real()?1:0)),real());for(let i=0;i<8&&!real();i++)Z=solarZ(fit(auToUnits(a.fitAU,metricBlend(Z))),real());return Z;}
const framesRun=()=>typeof globalThis.requestAnimationFrame==='function';
const tourAfter=(cond,then)=>{if(!framesRun()||cond())then();else tourWait={cond,then};};
function tourFrame(dt){
 if(tourWait&&tourWait.cond()){const f=tourWait.then;tourWait=null;f();}
 if(!tourRef?.active)return;
 if(state.value.sheet!=='closed'&&!tourRef.paused)tourRef.pause(); // a card opened (a tap, Journeys, the menu): wait
 tourRef.tick(dt);}
function tourTravel(stop,done){
 const g=++tourGen,ok=()=>g===tourGen&&!!tourRef?.active;tourWait=null;
 stopAudio();$('settings').open=false;pendingTrip=null;markGoing(null);zoom.stop();
 const cur=levelOf(state.value.view),ck=clockOf(cur);
 if(ck&&ck.time()!==0&&!bridge){ck.rewind(()=>{if(ok())tourTravel(stop,done);});return;} // every map is drawn as the sky is now
 if(ORBITS.has(state.value.view))starsView.closeSystem();
 state.update({view:cur==='solar'?'explore':views[cur].view,journey:null,experiment:null,star:null,landmark:null,voyage:null,sheet:'closed'});render();
 const glide=(Z,then)=>{if(!bridge)Zc=zOfLevel(levelOf(state.value.view));animateTo(Z,()=>{if(ok())then();});};
 if(stop.at.focus){const b=bodies.find(x=>x.data.name===stop.at.focus);
  const land=()=>{state.update({world:b.data.name,feature:'overview'});focus(b,{silent:true,outside:true});tourAfter(()=>!solarBusy(),()=>{if(ok())done();});};
  if(cur==='solar'&&!bridge)land();else glide(tourZ(TOUR_STOPS.find(s=>s.at.fit)),land);return;}
 const Z=tourZ(stop);
 if(cur==='solar'&&!bridge&&(solarFocused?.()||solarOffCentred())){unfocus(true,smoothFrames()?1.4:0.01);tourAfter(()=>!solarBusy(),()=>{if(ok())glide(Z,done);});return;}
 glide(Z,done);}
// Stop a move where it is: the glide (its frames are dropped), a wait for the Solar System's camera flight, and
// the zoom controller takes over at the current Z (so a gesture right after carries on from here).
function tourHalt(){tourGen++;tourWait=null;if(animating){animGen++;animating=false;}zoom.set(Zc);}
tourRef=createTour({travel:tourTravel,halt:tourHalt,readout:()=>hudEl.hidden?null:[hudB.textContent,hudA.textContent],onChange:()=>tourUi?.paint()});
tourUi=mountTour(document,tourRef,{storage:globalThis.localStorage,afterNode:$('journeys')});
// ---- Install and offline ----
// "Install app" uses the browser's own install prompt where it offers one (Android, desktop Chrome/Edge); on
// iPhone and iPad the note explains Share → Add to Home Screen. Installing, or "Save for offline", stores the
// whole app on the device (sw.js saveAll), so it opens fast and works with no signal. An installed app
// refreshes its saved copy on each launch (only changed files are downloaded).
let installEvent=null,offline=null;
const nav=globalThis.navigator||{},sw=globalThis.isSecureContext&&nav.serviceWorker;
const standalone=()=>!!globalThis.matchMedia?.('(display-mode: standalone)').matches||nav.standalone===true;
const appleTouch=/iphone|ipad|ipod/i.test(nav.userAgent||'')||(/macintosh/i.test(nav.userAgent||'')&&(nav.maxTouchPoints||0)>1);
const savedBefore=()=>{try{return localStorage.getItem('offline-saved');}catch{return null;}};
function saveOffline(){if(!sw)return;offline={done:0,total:0};paintOffline();sw.ready.then(reg=>reg.active?.postMessage({saveAll:true}));}
function paintOffline(){
 $('install').hidden=!installEvent;$('save-offline').hidden=!sw;$('save-offline').disabled=!!offline&&!offline.finished&&!offline.error;
 const note=offline?.error?'Couldn’t save just now. Check the connection and try again.':offline&&!offline.finished?`Saving… ${offline.done} of ${offline.total||'…'} files`:offline?.finished?(offline.failed?`Saved, except ${offline.failed} files. Try again with a better connection.`:'Saved ✓ The whole app is on this device and opens even with no signal.'):savedBefore()?'Saved for offline ✓ New versions are saved as you use them.':!sw?'Offline use needs the secure (https) version of the site.':appleTouch&&!standalone()?'To install on iPhone or iPad: tap Share, then “Add to Home Screen”. Or save for offline here.':'Keeps the whole app (about 4.5 MB) on this device so it opens fast, even with no signal.';
 $('offline-note').textContent=note;$('save-offline').textContent=offline?.finished&&!offline.failed||savedBefore()?'Save again':'Save for offline';
}
globalThis.addEventListener?.('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;paintOffline();});
globalThis.addEventListener?.('appinstalled',()=>{installEvent=null;saveOffline();});
if(sw)sw.addEventListener('message',e=>{const m=e.data?.offline;if(!m)return;offline=m;if(m.finished&&!m.failed){try{localStorage.setItem('offline-saved',m.version||'1');}catch{}}paintOffline();});
$('install').onclick=async()=>{if(!installEvent)return;const e=installEvent;e.prompt();const r=await e.userChoice.catch(()=>({}));installEvent=null;if(r.outcome==='accepted')saveOffline();paintOffline();};
$('save-offline').onclick=saveOffline;
paintOffline();
if(sw&&standalone()&&typeof setTimeout==='function')setTimeout(saveOffline,4000);
// Offline: cache what has been loaded, so the app opens again without a connection (sw.js).
if(globalThis.isSecureContext&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(reg=>setTimeout(()=>reg.active?.postMessage({cache:[location.href.split('#')[0],...performance.getEntriesByType('resource').map(e=>e.name)]}),3000)).catch(()=>{});
window.__lab={state,go,experiments,player,setSheet,starsView,galaxyView,localView,zoom,placeZ,get Z(){return Zc;},get bridge(){return bridge;},get animating(){return animating;},get Zcam(){return currentZ();},get anchor(){return anchorNow;},get pendingTrip(){return pendingTrip?.target??null;},sceneOf:l=>(l==='super'||l==='universe')&&!built(l)?null:sceneOf(l),tour:tourRef,tourUi,tourZ};
