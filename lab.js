import { bodies, focus, unfocus, hooks, renderer, controls, setHomeScope } from './app.js';
import { createExperiments } from './experiments.js';
import { createLabState } from './lab-state.js';
import { swipe, emptyTap, openHeight, classifyDrag, visibleRegion } from './sheet.js';
import { seasonGeometry, daylightHours, noonAltitude, phaseGeometry, phaseName, weightNewtons, NEARBY, wrap } from './science.js';
import { INSIGHTS, STRIKING, genericInsight, NASA, CHECKED } from './insights.js';
import { LINES, VOICE } from './voice/lines.js';
import { createVoicePlayer } from './voice-player.js';
const $=id=>document.getElementById(id), state=createLabState(), experiments=createExperiments(renderer);
const sheet=$('sheet');
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
$('listen').onclick=()=>{if(!$('sound').checked){$('audio-status').textContent='Turn on optional voice in the ☰ menu.';return;}player.unlock();player.say(narration);};
$('sound').onchange=()=>{preferences.muted=!$('sound').checked;try{localStorage.setItem('solar.kids.v1',JSON.stringify(preferences));}catch{}if(preferences.muted)stopAudio();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){interrupted=['speaking','loading'].includes(lastAudioState);stopAudio();}else if(interrupted){lastAudioState='retry';$('audio-status').textContent='Tap ♫ to continue.';interrupted=false;}});
function go(patch){stopAudio();const next={...state.value,...patch};if(!('sheet' in patch))patch={...patch,sheet:openHeight(next)};state.navigate(patch);$('settings').open=false;render();}
function setSheet(patch){if(!patch)return;if(patch.view&&patch.view!==state.value.view)stopAudio();state.update(patch);render();}
function dismissHint(){hintSeen=true;}
// Back: previous card/lab; with no history it returns to the whole Solar System.
// At the overview (sheet closed) the same chip switches between the inner planets and all planets.
$('back').onclick=()=>{stopAudio();const s=state.value;
 if(s.sheet!=='closed'&&state.canBack)state.back();
 else if(s.sheet!=='closed')state.update({view:'explore',experiment:null,feature:'orbit',sheet:'closed'});
 else setHomeScope(hooks.homeScope==='inner'?'all':'inner');
 render();};
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{const view=button.dataset.view,s=state.value;
 const patch={view,experiment:null};
 if(view==='compare'&&NEARBY[s.world]){patch.compareA=s.world;if(s.compareB===s.world)patch.compareB=s.world==='Earth'?'Moon':'Earth';}
 go({...patch,sheet:'half'});};
for(const button of document.querySelectorAll('[data-experiment]'))button.onclick=()=>go({view:'try',experiment:button.dataset.experiment});
$('world').innerHTML=bodies.map(b=>`<option>${b.data.name}</option>`).join('');
$('world').onchange=()=>{dismissHint();go({view:'explore',world:$('world').value,feature:'overview',experiment:null});};
// Tap a world in the scene → glide to it and slide up its card.
hooks.onFocus=b=>{dismissHint();go({view:'explore',world:b.data.name,feature:'overview',experiment:null});};
hooks.onEmpty=()=>setSheet(state.value.sheet==='closed'?null:emptyTap(state.value));
hooks.visible=(w,h)=>{if(state.value.sheet==='closed')return {width:w,height:h};const r=sheet.getBoundingClientRect();return visibleRegion(w,h,r);};
$('reset').addEventListener('click',()=>{stopAudio();state.navigate({view:'explore',experiment:null,feature:'orbit',sheet:'closed'});$('settings').open=false;render();});
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
function diagram(experiment,angle){
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
 const s=state.value, seasons=s.experiment==='seasons';
 experiments.update(s);
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
function seasonLabel(a){
 const angle=wrap(a);
 if(angle<1||angle>359)return 'June solstice';if(Math.abs(angle-90)<1)return 'September equinox';if(Math.abs(angle-180)<1)return 'December solstice';if(Math.abs(angle-270)<1)return 'March equinox';
 return angle<90?'June → September':angle<180?'September → December':angle<270?'December → March':'March → June';
}
$('experiment-angle').oninput=()=>{stopAudio();const s=state.value;state.update(s.experiment==='seasons'?{orbit:+$('experiment-angle').value}:{phase:+$('experiment-angle').value});paintExperiment();};
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
let cameraKey=null;
function aimCamera(s,body){
 const key=s.sheet==='closed'||s.feature==='orbit'?'overview':`${s.world}`;
 if(key===cameraKey)return;cameraKey=key;
 if(key==='overview')unfocus(true,1.5);else focus(body,{silent:true,outside:s.world==='Earth',dur:1.1});
}
function paintExplore(){
 const s=state.value,body=bodies.find(b=>b.data.name===s.world),info=INSIGHTS[s.world]||genericInsight(body.data);
 $('world').value=s.world;$('kicker').textContent=s.world==='Sun'?'Our star':s.world==='Moon'?'Earth’s Moon':'Planet';$('title').textContent=s.world;
 $('fact').textContent=STRIKING[s.world];
 narration=info.line||`f_${s.world}_0`;$('world-insight').textContent=LINES[narration]||info.intro;
 $('features').innerHTML=info.features.map(([id,text])=>`<button data-feature="${id}" aria-pressed="${s.feature===id}">${text}</button>`).join('');
 for(const b of $('features').querySelectorAll('button'))b.onclick=()=>{
  if(b.dataset.feature==='moon')return go({world:'Moon',feature:'overview'});
  if(b.dataset.feature==='phases')return go({view:'try',experiment:'phases'});
  go({feature:b.dataset.feature,sheet:state.value.sheet});
 };
 $('action').hidden=false;$('action').textContent=info.question;
 $('action').onclick=()=>info.experiment?go({view:'try',experiment:info.experiment}):go({feature:'orbit',sheet:state.value.sheet});
 const ratio=body.data.km/12756;
 $('world-size').textContent=s.world==='Earth'?'Earth is 12,756 km wide at the equator.':`${s.world} is ${ratio>=1?ratio.toFixed(ratio>=10?0:1)+' times as wide as':Math.round(ratio*100)+'% as wide as'} Earth (${body.data.km.toLocaleString('en-IN')} km).`;
 const nearby=NEARBY[s.world];$('compare-shortcut').hidden=!nearby;
 if(nearby){const other=s.world==='Earth'?'Moon':'Earth';$('compare-shortcut').textContent=`Compare ${s.world} with ${other} →`;$('compare-shortcut').onclick=()=>go({view:'compare',experiment:null,compareA:s.world,compareB:other});}
 $('world-deeper').textContent=info.deeper;
 // Avoid stale, changing outer-planet moon counts in the new UI; dated legacy figures remain in data.js.
 $('world-facts').innerHTML=body.data.facts.filter(([k])=>k!=='Moons').map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('');
 const url=info.source?NASA[info.source]:`https://science.nasa.gov/${s.world==='Sun'?'sun':s.world.toLowerCase()}/facts/`;
 $('world-sources').innerHTML=`<a href="${url}" target="_blank" rel="noopener">NASA · ${s.world}</a>${info.source?sourceNote:'<p class="fine">Baseline facts checked 8 November 2026 against NASA sources; see docs/sources.md. Changing moon counts are omitted.</p>'}`;
 $('world-scale').textContent='Model caveats: spherical worlds, circular mostly coplanar orbits, accelerated time, procedural surfaces. Earth coastlines use Natural Earth data. Moon craters and weather are not live or mapped observations. Sun size is 1/5 in the default view; orbit gaps and Moon gap are compressed. Real scale restores size/distance ratios, not an actual-date sky. Faint fill light reveals the night-side shape.';
 aimCamera(s,body);
 $('view-caption').textContent=s.feature==='orbit'?(s.world==='Sun'?'The Sun and eight planets · schematic view, not current positions':`${s.world} orbits the Sun · schematic Solar System view; not current positions`):s.world==='Earth'?'Drag to look around · gold line: Earth’s tilted spin axis · day/night comes from sunlight':s.world==='Moon'?'Earth’s Moon · Explore the phases shows the view from Earth':`${s.world} · drag to look around · illustrative surface and lighting`;
 if(s.feature==='day'){narration='lab_day';$('world-insight').textContent=LINES[narration];}
}
function render(){
 const s=state.value,experiment=s.view==='try'&&!!s.experiment;
 sheet.dataset.state=s.sheet;document.body.dataset.sheet=s.sheet;
 const open=s.sheet!=='closed';sheet.inert=!open;sheet.setAttribute('aria-hidden',String(!open));
 if(!open&&sheet.contains(document.activeElement))$('back').focus();
 $('grip').setAttribute('aria-expanded',String(s.sheet==='half'||s.sheet==='full'));
 $('grip').setAttribute('aria-label',s.sheet==='full'?'Show less':'Show more');
 for(const v of ['explore','try','compare'])$(v+'-panel').hidden=s.view!==v;
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===s.view));
 if(!open){const all=hooks.homeScope!=='inner';$('back').textContent=all?'Inner planets':'All planets';$('back').setAttribute('aria-label',all?'Zoom in on the inner planets, Mercury to Mars':'Zoom out to show all eight planets');}
 else{const atOverview=!state.canBack;$('back').textContent=atOverview?'Overview':'← Back';$('back').setAttribute('aria-label',atOverview?'Close the card and show the Solar System':'Go back');}
 $('hint').hidden=hintSeen||open;
 $('world-depth').open=false;
 $('experiment-chooser').hidden=experiment;$('experiment').hidden=!experiment;$('experiment-reset').hidden=!experiment;
 $('orbit-map').hidden=!experiment;
 document.body.classList.toggle('experiment-mode',experiment);
 controls.enabled=!experiment;hooks.hold=experiment;
 hooks.renderOverride=experiment?()=>{const r=$('stage').getBoundingClientRect();experiments.render(r.width,r.height,s.sheet==='closed'?null:visibleRegion(r.width,r.height,sheet.getBoundingClientRect()));}:null;
 if(experiment){$('action').hidden=true;paintExperiment();}
 else if(s.view==='compare'){$('action').hidden=true;paintCompare();}
 else if(s.view==='explore')paintExplore();
 else{narration='lab_try';$('action').hidden=true;$('kicker').textContent='Small science lab';$('title').textContent='Try an idea';$('fact').textContent=LINES.lab_try;$('view-caption').textContent='Two experiments. Change one thing and see why it matters.';}
}
addEventListener('resize',()=>{if(state.value.view==='compare')paintCompare();});
render();
window.__lab={state,go,experiments,player,setSheet};
