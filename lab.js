import { bodies, focus, unfocus, hooks, renderer, controls, setHomeScope } from './app.js';
import { createStars, createDimmer } from './stars.js';
import { createGalaxy } from './galaxy.js';
import { GALAXY_FACTS } from './galaxy-data.js';
import { LEVELS, levelIndex, PAIRS, pairFor, bridgeFrame, stepBridge, atLimit, STAR_NEAR, STAR_FAR, GALAXY_NEAR } from './zoom-ladder.js';
import { camera, drawSolar } from './app.js';
import { STAR_FACTS, habitableZone, sizeFromMass, lightLeftYear } from './stars-data.js';
import { createExperiments } from './experiments.js';
import { createLabState } from './lab-state.js';
import { swipe, emptyTap, openHeight, classifyDrag, visibleRegion } from './sheet.js';
import { seasonGeometry, daylightHours, noonAltitude, phaseGeometry, phaseName, weightNewtons, NEARBY, wrap } from './science.js';
import { INSIGHTS, STRIKING, genericInsight, NASA, CHECKED, MOON_COUNT, SAT_SOURCES, JPL_RADII, DWARF_SOURCES, SBDB } from './insights.js';
import { LINES, VOICE } from './voice/lines.js';
import { createVoicePlayer } from './voice-player.js';
import { PREDICTIONS, judge, JOURNEYS, journey, canAdvance, eclipseGeometry, tideLabel, tideRange, scaleWalk, sizeLike, formatMetres, formatDuration, lightSeconds, sunlightTo, AU_KM, FOOTBALL_CM, MOON_INCLINATION } from './learn.js';
// Labs drawn in their own 3D scene; the scale lab keeps the live Solar System behind the sheet.
const SCENE_LABS=new Set(['seasons','phases','eclipses','tides']);
const LAB_TITLES={seasons:'Why do seasons happen?',phases:'Explore the phases',eclipses:'Why aren’t eclipses monthly?',tides:'What makes the tides?',scale:'How big is space?'};
const $=id=>document.getElementById(id), state=createLabState(), experiments=createExperiments(renderer);
const sheet=$('sheet');
// ---- Beyond the Solar System: the nearby stars and their planets ----
const SPACE=new Set(['stars','system','galaxy']);
const levelOf=v=>v==='galaxy'?'galaxy':v==='stars'||v==='system'?'stars':'solar';
const starsView=createStars({renderer,canvas:$('c'),labelsEl:$('labels'),onPick:e=>pickStar(e)});
let shownLevel='solar',arrival=null;
const galaxyView=createGalaxy({renderer,canvas:$('c'),labelsEl:$('labels'),onPick:m=>pickLandmark(m)});
// ---- One continuous zoom: Solar System ⇄ nearby stars ⇄ Milky Way ----
// Zooming past a scene's outer (or inner) limit opens a "bridge": both scenes are drawn at once and the
// zoom gesture itself moves the blend t (0 = inner scene, 1 = outer). The inner scene recedes and dims while
// the outer one dissolves in, centred on the Sun and seen from the same direction. No cuts, no fades to black.
const dim=createDimmer(renderer);
let bridge=null,animating=false;
const views={solar:{view:'explore',feature:'orbit'},stars:{view:'stars'},galaxy:{view:'galaxy'}};
const viewDirOf=l=>l==='solar'?camera.position.clone().sub(controls.target).normalize():l==='stars'?starsView.viewDir():galaxyView.viewDir();
function drawBridge(){
 const r=$('stage').getBoundingClientRect(),f=bridgeFrame(bridge.pair,bridge.t);
 if(bridge.pair==='solar>stars'){drawSolar(f.inner.recede);dim(f.inner.dim);starsView.setView(bridge.dir,f.outer.d);starsView.render(r.width,r.height,null,{overlay:true,opacity:f.outer.opacity});}
 else{starsView.setView(bridge.dir,f.inner.d);starsView.render(r.width,r.height,null,{opacity:1-f.inner.dim});dim(f.inner.dim);galaxyView.setView(bridge.dir,f.outer.d);galaxyView.render(r.width,r.height,null,{overlay:true,opacity:f.outer.opacity});}
}
function beginBridge(pair,t){
 const cur=levelOf(state.value.view);if(state.value.view==='system'){starsView.closeSystem();state.update({view:'stars'});}
 bridge={pair,t,dir:viewDirOf(cur)};state.update({sheet:'closed',star:null,landmark:null});
 if(pair==='solar>stars')starsView.showLabels(true);else galaxyView.showLabels(true);
 document.body.classList.add('bridging');render();
}
function moveBridge(amount){const {t,settled}=stepBridge(bridge.t,amount);bridge.t=t;if(settled)settle(settled);}
function settle(end){
 const b=bridge,[inner,outer]=PAIRS[b.pair],target=end==='outer'?outer:inner,cur=levelOf(state.value.view);bridge=null;document.body.classList.remove('bridging');
 const other=target===inner?outer:inner;if(other==='stars')starsView.showLabels(false);if(other==='galaxy')galaxyView.showLabels(false);
 // Arrive with the camera exactly where the bridge left it.
 arrival=target==='solar'?{solar:true}:target==='stars'?{dir:b.dir,d:b.pair==='solar>stars'?STAR_NEAR:STAR_FAR}:{dir:b.dir,d:GALAXY_NEAR};
 if(target!==cur)state.navigate({...views[target],star:null,landmark:null,experiment:null,sheet:'closed'});
 else{arrival=null;if(target==='stars')starsView.setView(b.dir,b.pair==='solar>stars'?STAR_NEAR:STAR_FAR);if(target==='galaxy')galaxyView.setView(b.dir,GALAXY_NEAR);}
 render();
}
// The same blend, played automatically for the scale ladder, Back and buttons: glide to the edge, then cross.
function animateBridge(to,done){
 if(typeof globalThis.requestAnimationFrame!=='function'||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){bridge.t=to;settle(to===1?'outer':'inner');done?.();return;}
 animating=true;let last=performance.now();
 const tick=now=>{const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!bridge){animating=false;return;}
  const {t,settled}=stepBridge(bridge.t,(to===1?1:-1)*dt/1.3*600);bridge.t=t;
  if(settled){animating=false;settle(settled);done?.();}else globalThis.requestAnimationFrame(tick);};
 globalThis.requestAnimationFrame(tick);
}
function goLevel(target){
 const cur=levelOf(state.value.view);if(target===cur||bridge||animating)return;stopAudio();$('settings').open=false;
 const out=levelIndex(target)>levelIndex(cur),pair=pairFor(cur,out?1:-1),then=()=>{if(levelOf(state.value.view)!==target)goLevel(target);};
 const play=()=>{beginBridge(pair,out?0:1);animateBridge(out?1:0,then);};
 if(state.value.view==='system'){starsView.closeSystem();state.update({view:'stars',sheet:'closed'});render();}
 if(out&&cur==='stars')starsView.zoomOut(play);
 else if(!out&&cur==='stars')starsView.zoomBackIn(play);
 else if(!out&&cur==='galaxy')galaxyView.zoomToSun(play);
 else{if(state.value.sheet!=='closed'){state.update({sheet:'closed'});render();}play();}
}
const enterStars=()=>goLevel('stars'),leaveStars=()=>goLevel('solar'),enterGalaxy=()=>goLevel('galaxy'),leaveGalaxy=()=>goLevel('stars');
for(const b of $('ladder').querySelectorAll('button'))b.onclick=()=>goLevel(b.dataset.level);
// Gestures: while bridging, the wheel and pinch move the blend; otherwise they open a bridge only when the
// active camera is already at its limit (so ordinary zooming inside a scale is untouched).
function zoomState(){const l=levelOf(state.value.view);
 if(l==='solar'){if(state.value.view==='try'&&state.value.experiment)return null;const d=camera.position.distanceTo(controls.target);return {d,min:controls.minDistance,max:controls.maxDistance,busy:false,outer:true,inner:false};}
 if(state.value.view==='system')return null;
 const z=(l==='stars'?starsView:galaxyView).zoomState();return {...z,outer:l==='stars',inner:true};}
function feedZoom(amount){
 if(animating)return;if(bridge){moveBridge(amount);return;}
 const l=levelOf(state.value.view),z=zoomState();if(!z||z.busy||state.value.sheet==='half'||state.value.sheet==='full')return;
 const lim=atLimit(z.d,z.min,z.max);
 if(amount>0&&lim.atOuter&&z.outer){beginBridge(pairFor(l,1),0);moveBridge(amount);}
 else if(amount<0&&lim.atInner&&z.inner){beginBridge(pairFor(l,-1),1);moveBridge(amount);}
}
$('c').addEventListener('wheel',e=>feedZoom(Math.max(-120,Math.min(120,e.deltaY))),{passive:true});
// Name labels sit above the scene and would swallow the wheel: pass it through so zooming works anywhere.
$('labels').addEventListener('wheel',e=>{e.preventDefault();$('c').dispatchEvent(new WheelEvent('wheel',{deltaX:e.deltaX,deltaY:e.deltaY,deltaMode:e.deltaMode,clientX:e.clientX,clientY:e.clientY,ctrlKey:e.ctrlKey,bubbles:true,cancelable:true}));},{passive:false});
const pinch=new Map();let spread=0;
const spreadOf=()=>{const [a,b]=[...pinch.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
document.addEventListener('pointerdown',e=>{if(e.target!==$('c'))return;pinch.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch.size===2)spread=spreadOf();},true);
document.addEventListener('pointermove',e=>{if(!pinch.has(e.pointerId))return;pinch.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch.size!==2)return;const d=spreadOf();if(spread>0&&d>0)feedZoom(-Math.log(d/spread)*600);spread=d;},true);
for(const t of ['pointerup','pointercancel'])document.addEventListener(t,e=>{pinch.delete(e.pointerId);if(pinch.size<2)spread=0;},true);
function pickLandmark(m){dismissHint();go({view:'galaxy',landmark:m.name,sheet:'peek'});}
function pickStar(e){dismissHint();go({view:'stars',star:e.name,sheet:'peek'});}
hooks.overrideTap=(x,y)=>{const s=state.value;
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
$('back').onclick=()=>{stopAudio();const s=state.value;
 if(s.sheet!=='closed'&&state.canBack)state.back();
 else if(s.view==='galaxy'&&s.sheet==='closed'){leaveGalaxy();return;}
 else if(SPACE.has(s.view)&&s.sheet==='closed'){leaveStars();return;}
 else if(s.view==='galaxy')state.update({landmark:null,sheet:'closed'});
 else if(SPACE.has(s.view))state.update({view:'stars',star:null,sheet:'closed'});
 else if(s.sheet!=='closed')state.update({view:'explore',experiment:null,feature:'orbit',sheet:'closed'});
 else setHomeScope(hooks.homeScope==='inner'?'all':'inner');
 render();};
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

$('close').onclick=()=>setSheet({view:'explore',experiment:null,sheet:'closed'});
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
function paintJourney(){
 const s=state.value,j=journey(s.journey);narration=null;$('action').hidden=true;
 $('journey-list').hidden=!!j;$('journey-step').hidden=!j;
 if(!j){
  $('kicker').textContent='Guided journeys';$('title').textContent='Choose a journey';$('fact').textContent='Short tours. Make a guess, then see what really happens.';
  $('view-caption').textContent='';
  $('journey-list').innerHTML=JOURNEYS.map(x=>`<button class="experiment-card" data-journey="${x.id}"><strong>${x.title}</strong><span>${x.blurb} · ${x.steps.length} stops</span></button>`).join('');
  for(const b of $('journey-list').querySelectorAll('button'))b.onclick=()=>go({view:'journey',journey:b.dataset.journey,step:0});
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
$('journey-prev').onclick=()=>{stopAudio();state.update({step:Math.max(0,state.value.step-1)});render();};
$('journey-next').onclick=()=>{stopAudio();const s=state.value,j=journey(s.journey);if(!j||!canAdvance(j.steps[s.step],s.answers))return;
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
function paintGalaxy(){
 const s=state.value,m=s.landmark&&galaxyView.landmarks.find(x=>x.name===s.landmark);narration=null;$('action').hidden=true;$('star-panel').hidden=false;
 $('star-companions').textContent='';$('star-planets').innerHTML='';
 const caveat='<p>No one has seen the Milky Way from outside: we live inside its disc. This picture is a model built from maps of gas, young stars and their measured distances. The spiral arms follow published fits (Reid et al. 2019) and are best known on our side; the far side is extrapolated. Landmarks are placed by their real direction and distance.</p>';
 if(!m||m.name==='Sun'){
  $('kicker').textContent=m?'Our star':'Our galaxy';$('title').textContent=m?'The Sun in the Milky Way':'The Milky Way';
  $('fact').textContent=m?m.fact:'A spiral of 100–400 billion stars. The Sun is one of them, out in a small arm called the Orion Spur.';
  $('view-caption').textContent='Model of the Milky Way seen from above · dashed line: the Sun’s orbit · not a photograph';
  $('star-facts').innerHTML=[['Stars',GALAXY_FACTS.stars],['Width',`${GALAXY_FACTS.diameter} light-years`],['Disc thickness',`${GALAXY_FACTS.thickness} light-years`],['Sun to centre','about 27,000 light-years'],['One orbit of the Sun',`${GALAXY_FACTS.orbitMyr} years`],['Last time the Sun was here','the first dinosaurs were just appearing']].map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('star-depth').innerHTML=`${caveat}<p>Estimates of the Galaxy’s width range from about 87,000 to over 100,000 light-years depending on where you set the edge; of the Sun’s orbit, from 212 to 240 million years. Our whole 16-light-year neighbourhood from the previous level would be smaller than a single pixel here.</p><a href="https://en.wikipedia.org/wiki/Milky_Way" target="_blank" rel="noopener">Milky Way overview</a> · <a href="https://science.nasa.gov/resource/the-milky-way-galaxy/" target="_blank" rel="noopener">NASA · The Milky Way</a>${sourceNote}`;
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
 $('kicker').textContent=`${e.kind} · ${p.type}`;$('title').textContent=e.name;
 $('fact').textContent=e.sun?'Our own star. From here, every other star is a point of light.':STAR_FACTS[e.name]||`A ${e.kindBlurb}, ${fmt(e.ly,1)} light-years away.`;
 $('view-caption').textContent=e.sun?'The Sun at the centre · rings at 5, 10 and 15 light-years':`${fmt(e.ly,2)} light-years from the Sun · positions to scale · star sizes show brightness, not true size`;
 const naked=p.mag!=null&&p.mag<6;
 const rows=e.sun?[['Type','Yellow dwarf (G2V)'],['Surface temperature','about 5,800 K'],['Sunlight reaches Earth in','about 8 minutes']]:[
  ['Distance',`${fmt(e.ly,2)} light-years`],['The light you see left it',`around ${lightLeftYear(e.ly)}`],['Type',`${e.kind} (${p.type})`],
  ['Surface temperature',`about ${fmt(e.temp)} K`],['Visible brightness',p.mag==null?'too faint to see; infrared only':`magnitude ${p.mag}${naked?' · visible to the naked eye':' · needs a telescope or binoculars'}`]];
 $('star-facts').innerHTML=rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
 $('star-companions').textContent=e.stars.length>1?`A ${['','','double','triple','quadruple'][e.stars.length]||'multiple'} system: ${e.stars.map(x=>`${x.name} (${starKindShort(x.type)})`).join(', ')}.`:'';
 const ps=e.planets;
 $('star-planets').innerHTML=ps?`<p><b>${ps.planets.length} known planet${ps.planets.length>1?'s':''}.</b> ${ps.logL!=null&&ps.planets.some(x=>{const hz=habitableZone(ps.logL,e.temp);return x[2]>=hz[0]&&x[2]<=hz[1];})?'At least one orbits in the habitable zone.':''}</p>`:e.sun?'':'<p class="fine">No planets confirmed yet.</p>';
 if(ps){$('action').hidden=false;$('action').textContent=`Visit its planets`;$('action').onclick=()=>go({view:'system',star:e.name,sheet:'half'});}
 else if(e.sun){$('action').hidden=false;$('action').textContent='Back to the Solar System';$('action').onclick=leaveStars;}
 $('star-depth').innerHTML=`<p>Positions come from each star’s direction in the sky and its measured distance, so the 3D layout is real. The rings mark 5, 10 and 15 light-years in the plane of the Solar System; the thin lines drop to that plane. Glow size shows how bright a star really is, not its true size; at this scale every star would be far too small to see.</p><p>Temperatures are typical values for the star’s spectral type. Magnitudes are visual brightness as seen from Earth (smaller is brighter; about 6 is the limit for the naked eye).</p><a href="https://en.wikipedia.org/wiki/List_of_nearest_stars" target="_blank" rel="noopener">Nearest-stars table (RECONS / Gaia values)</a>${ps?' · <a href="https://exoplanetarchive.ipac.caltech.edu/" target="_blank" rel="noopener">NASA Exoplanet Archive</a>':''}${sourceNote}`;
}
const starKindShort=t=>t[0]==='D'?'white dwarf':'LTY'.includes(t[0])?'brown dwarf':t[0]==='M'?'red dwarf':t[0]==='K'?'orange dwarf':t[0]==='G'?'Sun-like':'star';
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
  if(from==='stars')starsView.leave();if(from==='galaxy')galaxyView.leave();
  const at=arrival;arrival=null;
  if(level==='stars')starsView.enter(at||(from==='galaxy'?'outside':'inside'));if(level==='galaxy')galaxyView.enter(at);
  if(level==='solar'&&!at)unfocus(true,.01);}
if(level==='stars')(s.view==='system'?(()=>{if(starsView.mode!=='system')starsView.openSystem(entryOf(s.star));})():starsView.mode==='system'&&starsView.closeSystem());
 if(level==='stars')starsView.select(s.star&&entryOf(s.star));if(level==='galaxy')galaxyView.select(s.landmark&&galaxyView.landmarks.find(x=>x.name===s.landmark));
 document.body.classList.toggle('space-mode',space);
 for(const b of $('ladder').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.level===level));
 if(race&&!(experiment&&s.experiment==='scale')){globalThis.cancelAnimationFrame?.(race.id);race=null;}
 sheet.dataset.state=s.sheet;document.body.dataset.sheet=s.sheet;
 const open=s.sheet!=='closed';sheet.inert=!open;sheet.setAttribute('aria-hidden',String(!open));
 if(!open&&sheet.contains(document.activeElement))$('back').focus();
 $('grip').setAttribute('aria-expanded',String(s.sheet==='half'||s.sheet==='full'));
 $('grip').setAttribute('aria-label',s.sheet==='full'?'Show less':'Show more');
 for(const v of ['explore','try','compare','journey'])$(v+'-panel').hidden=s.view!==v;
 $('star-panel').hidden=s.view!=='stars'&&s.view!=='galaxy';$('system-panel').hidden=s.view!=='system';
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===s.view));
 if(!open&&space){const g=level==='galaxy';$('back').textContent=g?'← Nearby stars':'← Solar System';$('back').setAttribute('aria-label',g?'Zoom back in to the nearby stars':'Zoom back in to the Solar System');}
 else if(!open){const all=hooks.homeScope!=='inner';$('back').textContent=all?'Show inner planets':'Show all planets';$('back').setAttribute('aria-label',all?'Zoom in on the inner planets, Mercury to Mars':'Zoom out to show all eight planets');}
 else{const atOverview=!state.canBack;$('back').textContent=atOverview?'Overview':'← Back';$('back').setAttribute('aria-label',atOverview?'Close the card and show the Solar System':'Go back');}
 $('hint').hidden=(hintSeen&&!space)||open;$('hint').textContent=level==='galaxy'?'Tap a landmark':space?'Tap a star':'Tap a planet, the Sun or the Moon';
 $('world-depth').open=false;
 sheet.querySelector('.tabs').hidden=experiment||s.view==='journey'||space; // labs: controls first, Back returns to the tabs
 $('experiment-chooser').hidden=experiment;$('experiment').hidden=!scene;$('scale-lab').hidden=!(experiment&&s.experiment==='scale');$('experiment-reset').hidden=!experiment;
 $('orbit-map').hidden=!scene;
 document.body.classList.toggle('experiment-mode',scene);
 controls.enabled=!scene&&!space;hooks.hold=scene||space;
 hooks.renderOverride=level==='galaxy'?()=>{const r=$('stage').getBoundingClientRect();galaxyView.render(r.width,r.height,s.sheet==='closed'?null:visibleRegion(r.width,r.height,sheet.getBoundingClientRect()));}:space?()=>{const r=$('stage').getBoundingClientRect();starsView.render(r.width,r.height,s.sheet==='closed'?null:visibleRegion(r.width,r.height,sheet.getBoundingClientRect()));}:scene?()=>{const r=$('stage').getBoundingClientRect();experiments.render(r.width,r.height,s.sheet==='closed'?null:visibleRegion(r.width,r.height,sheet.getBoundingClientRect()));}:null;
 if(s.view==='galaxy')paintGalaxy();
 else if(s.view==='stars')paintStar();
 else if(s.view==='system')paintSystem();
 else if(experiment){$('action').hidden=true;paintExperiment();}
 else if(s.view==='compare'){$('action').hidden=true;paintCompare();}
 else if(s.view==='explore')paintExplore();
 else if(s.view==='journey')paintJourney();
 else{narration='lab_try';$('action').hidden=true;$('kicker').textContent='Small science lab';$('title').textContent='Try an idea';$('fact').textContent=LINES.lab_try;$('view-caption').textContent='Five experiments. Change one thing and see why it matters.';}
 $('listen').hidden=!narration||!LINES[narration];
 if(bridge){hooks.renderOverride=drawBridge;hooks.hold=true;controls.enabled=false;starsView.controls.enabled=false;galaxyView.controls.enabled=false;}
 else{starsView.controls.enabled=level==='stars'&&starsView.mode==='stars';galaxyView.controls.enabled=level==='galaxy';}
}
addEventListener('resize',()=>{if(state.value.view==='compare')paintCompare();});
render();
window.__lab={state,go,experiments,player,setSheet};
