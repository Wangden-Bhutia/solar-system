import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { SUN, PLANETS, MOON, MOONS, SUN_SHRINK } from './data.js';
let realScale = false; const D = d => realScale ? d.realDist : d.dist;
import { tex, rimShell, ringGeometry, saturnRingTex, uranusRingTex, SATURN_RING, URANUS_RING } from './textures.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 5e6);
const HOME = { pos: new THREE.Vector3(0, 45, 75), target: new THREE.Vector3() };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.minDistance = 0.6; controls.maxDistance = 900;

// Starfield (re-centred on the camera every frame, so it always surrounds the view)
let stars;
{
  const n = 4000, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(400 + Math.random() * 400);
    p.set([v.x, v.y, v.z], i * 3);
    const b = 0.5 + Math.random() * 0.5, t = Math.random();
    c.set([b * (t < .15 ? 1 : .85), b * .9, b * (t > .85 ? 1 : .95)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, sizeAttenuation: false })); scene.add(stars);
}

scene.add(new THREE.AmbientLight(0x404660, 0.08));
scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x2a1a10, 0.12));
scene.add(new THREE.PointLight(0xfff2dd, 3, 0, 0));

function bandTex(hex) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 64;
  const x = cv.getContext('2d'), base = new THREE.Color(hex);
  for (let y = 0; y < 64; y++) {
    const k = 0.85 + 0.25 * Math.sin(y * 0.9) * Math.sin(y * 0.23);
    x.fillStyle = '#' + base.clone().multiplyScalar(k).getHexString(); x.fillRect(0, y, 4, 1);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const labelsEl = document.getElementById('labels');
const bodies = [];
function addLabel(body) {
  const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl'; el.textContent = body.data.name;
  el.tabIndex = -1; // keyboard users have "Go to a world" in the menu; moving labels would scramble tab order
  el.bodyRef = body; // a touch on the label selects its world at touch-down (see the tap recogniser)
  el.addEventListener('click', e => { e.stopPropagation(); if (performance.now() - lastTapAt < 700) return; lastTapAt = performance.now(); focus(body); }); labelsEl.appendChild(el); body.label = el;
}

// Sun
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN.size, 48, 32), new THREE.MeshBasicMaterial({ map: tex('Sun') }));
sunMesh.add(rimShell(SUN.size * 1.03, 0xffb347, 1.6, 1.2));
scene.add(sunMesh);
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,220,120,0.9)'); g.addColorStop(0.3, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv);
})(), blending: THREE.AdditiveBlending, depthWrite: false }));
glow.scale.setScalar(SUN.size * 3.5); sunMesh.add(glow);
const sunBody = { data: SUN, mesh: sunMesh, radius: SUN.size };
bodies.push(sunBody); addLabel(sunBody);

const TRAIL_N = 160;
for (const d of PLANETS) {
  const pivot = new THREE.Object3D(); scene.add(pivot);
  const t = tex(d.name), tx = t.map ? t : { map: t };
  const mat = new THREE.MeshStandardMaterial({ map: tx.map, bumpMap: tx.bump || null, bumpScale: tx.bump ? d.size * 0.04 : 0, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.size, 48, 32), mat);
  // Real axial tilt: tilt group holds the spinning mesh (obliquity > 90° makes Venus/Uranus spin retrograde)
  const tiltG = new THREE.Object3D(); tiltG.rotation.z = THREE.MathUtils.degToRad(d.tilt);
  pivot.add(tiltG); tiltG.add(mesh);
  mesh.add(rimShell(d.size * 1.035, d.rim || d.color, 2.6, d.name === 'Earth' ? 1.1 : 0.55, 32));
  if (d.name === 'Earth') {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(d.size * 1.012, 48, 32), new THREE.MeshStandardMaterial({ map: tex('EarthClouds'), transparent: true, depthWrite: false, roughness: 1 }));
    mesh.add(cl); mesh.userData.clouds = cl;
    const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-d.size*1.5,0),new THREE.Vector3(0,d.size*1.5,0)]), new THREE.LineBasicMaterial({color:0xffd286}));
    tiltG.add(axis); mesh.userData.axis = axis;
  }
  if (d.rings) {
    const R = d.name === 'Uranus' ? URANUS_RING : SATURN_RING;
    const ring = new THREE.Mesh(ringGeometry(d.size * R.inner, d.size * R.outer), new THREE.MeshBasicMaterial({ map: d.name === 'Uranus' ? uranusRingTex() : saturnRingTex(), side: THREE.DoubleSide, transparent: true, depthWrite: false, color: 0xdddddd }));
    ring.rotation.x = Math.PI / 2; tiltG.add(ring); mesh.userData.ring = ring;
  }
  // Static orbit line
  const op = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; op.push(Math.cos(a), 0, Math.sin(a)); }
  const og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.Float32BufferAttribute(op, 3));
  const orbit = new THREE.Line(og, new THREE.LineBasicMaterial({ color: 0x2a3366, transparent: true, opacity: 0.35 })); orbit.scale.setScalar(d.dist); scene.add(orbit);
  // Fading trail
  const tp = new Float32Array(TRAIL_N * 3), tc = new Float32Array(TRAIL_N * 3);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending }));
  trail.frustumCulled = false; scene.add(trail);
  const body = { data: d, pivot, mesh, trail, orbit, radius: d.size, angle: Math.random() * Math.PI * 2 };
  if (d.moon) {
    const mp = new THREE.Object3D(); pivot.add(mp);
    const mm = new THREE.Mesh(new THREE.SphereGeometry(MOON.size, 20, 12), new THREE.MeshStandardMaterial({ map: tex('Moon').map, bumpMap: tex('Moon').bump, bumpScale: MOON.size * .04, roughness: 0.95 }));
    mm.position.x = MOON.dist; mp.add(mm); body.moonPivot = mp; body.moonMesh = mm;
  }
  bodies.push(body); addLabel(body);
}
const earthBody = bodies.find(b => b.data.name === 'Earth');
const moonBody = { data: MOON, mesh: earthBody.moonMesh, radius: MOON.size, satellite: true };
bodies.push(moonBody); addLabel(moonBody);
// Major moons of Mars and the giant planets. Each orbits in its planet's equatorial plane, so it
// inherits the planet's tilt (Uranus's moons circle it on their side); Triton's orbit is flipped
// (157°), so it goes round backwards. Sizes are true; orbit sizes are compressed (see data.js).
const moonOrbitMat = new THREE.LineBasicMaterial({ color: 0x8a9bb8, transparent: true, opacity: 0.28 });
const unitCircle = (() => { const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(Math.cos(a), 0, -Math.sin(a)); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g; })();
for (const m of MOONS) {
  const host = bodies.find(b => b.data.name === m.parent), equator = host.mesh.parent;
  const plane = new THREE.Object3D(); if (m.incl) plane.rotation.x = THREE.MathUtils.degToRad(m.incl); equator.add(plane);
  const orbitPivot = new THREE.Object3D(); plane.add(orbitPivot);
  const t = tex('Moon'), mat = m.plain ? new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.9 })
    : new THREE.MeshStandardMaterial({ map: t.map || t, bumpMap: t.bump || null, bumpScale: m.size * 0.04, color: m.color, roughness: 0.95 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(m.size, 24, 16), mat); mesh.position.x = m.dist; orbitPivot.add(mesh);
  const ring = new THREE.Line(unitCircle, moonOrbitMat); ring.scale.setScalar(m.dist); ring.visible = false; plane.add(ring);
  const body = { data: m, mesh, radius: m.size, satellite: true, host, orbitPivot, moonRing: ring, angle: Math.random() * Math.PI * 2 };
  (host.moons ||= []).push(body); bodies.push(body); addLabel(body);
}
// A moon of Mars or a giant planet is shown, labelled and tappable only while its own system is in view
// (its planet or one of its sibling moons is selected), so the overview stays clean. Earth's Moon keeps
// its existing behaviour.
const inSystem = b => !b.host || (!!focused && (focused === b.host || focused.host === b.host));
// Readable motion: true orbital speeds, except that moons faster than one orbit per 4 s on screen are
// slowed on a gentle curve (so Io still outpaces Callisto, but nothing strobes).
export const MOON_CAP = Math.PI * 2 / 4;
export const moonScreenSpeed = w => w <= MOON_CAP ? w : MOON_CAP * (w / MOON_CAP) ** 0.25;
function advanceMoons(dt, dDays) {
  if (!dt || !dDays) return;
  for (const b of bodies) { if (!b.orbitPivot) continue; b.angle += moonScreenSpeed(dDays / dt / b.data.period * Math.PI * 2) * dt; b.orbitPivot.rotation.y = b.angle; }
}
// Markers: small glowing dots so tiny planets can be found (shown when the planet is under ~5 px on screen)
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
for (const b of bodies) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: b.data.color, sizeAttenuation: false, depthWrite: false, transparent: true }));
  m.scale.setScalar(0.022); m.renderOrder = 5; (b.satellite ? b.mesh : b.pivot || scene).add(m); b.marker = m;
}

// Simulation state
let playing = true, speedExp = 0, trailsOn = true, focused = null;
let lastSize = [0, 0];
export const hooks = { kid: false, onFocus: null, intercept: null, focusMul: 0, here: false, renderOverride: null, hold: false, homeScope: 'all' };
const BASE_DAYS_PER_SEC = 365.26 / 20; // 1 Earth year per 20 s at 1x
// Overview only: the Sun is drawn at half its default size (1/10 of true size instead of 1/5) so
// the inner planets are not hidden behind it, and orbits run at 1/5 speed so they are easy to tap.
// Close-ups, the Sun's own card and Real scale use the normal sizes and speed.
export const OVERVIEW_SUN = 0.5, OVERVIEW_MOTION = 0.2;
let sunView = OVERVIEW_SUN, motionView = OVERVIEW_MOTION;
let simDays = 0;
const fly = { t: 1, fromPos: new THREE.Vector3(), fromTgt: new THREE.Vector3(), dur: 1.2 };

function placeBodies() {
  for (const b of bodies) {
    if (!b.pivot) continue;
    const a = b.angle + (simDays / b.data.period) * Math.PI * 2;
    b.pivot.position.set(Math.cos(a) * D(b.data), 0, -Math.sin(a) * D(b.data));
    if (b.moonPivot) b.moonPivot.rotation.y = (simDays / MOON.period) * Math.PI * 2;
  }
}
function updateTrails() {
  for (const b of bodies) {
    if (!b.trail) continue;
    b.trail.visible = trailsOn && !hooks.kid; if (!b.trail.visible) continue;
    const pos = b.trail.geometry.attributes.position, col = b.trail.geometry.attributes.color;
    const span = Math.min(0.35, 0.35) * Math.PI * 2; // trail covers ~35% of orbit
    const base = b.angle + (simDays / b.data.period) * Math.PI * 2, c = new THREE.Color(b.data.color);
    for (let i = 0; i < TRAIL_N; i++) {
      const f = i / (TRAIL_N - 1), a = base - f * span;
      pos.setXYZ(i, Math.cos(a) * D(b.data), 0, -Math.sin(a) * D(b.data));
      const k = (1 - f) ** 1.6; col.setXYZ(i, c.r * k, c.g * k, c.b * k);
    }
    pos.needsUpdate = col.needsUpdate = true;
  }
}

// Focus / info
const info = document.getElementById('info');
function focus(b, opts = {}) {
  if (!opts.silent && hooks.intercept && hooks.intercept(b)) return;
  focused = b; fly.dur = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? .01 : opts.dur || 1.2; hooks.focusMul = opts.mul || 0; hooks.outside = !!opts.outside;
  fly.fromPos.copy(camera.position); fly.fromTgt.copy(controls.target); fly.t = 0;
  document.getElementById('i-name').textContent = b.data.name;
  document.getElementById('i-blurb').textContent = b.data.blurb;
  document.getElementById('i-facts').innerHTML = b.data.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  info.hidden = hooks.kid;
  if (!opts.silent && hooks.onFocus) hooks.onFocus(b);
}
function unfocus(goHome, dur) {
  focused = null; info.hidden = true; fly.dur = dur || 1.2;
  if (goHome) { fly.fromPos.copy(camera.position); fly.fromTgt.copy(controls.target); fly.t = 0; fly.home = true; }
}
document.getElementById('info-close').onclick = () => unfocus(false);

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
// Touch needs a generous pick radius: tiny planets are a few pixels wide.
export const PICK_RADIUS = { touch: 60, mouse: 32 };
function pickAt(clientX, clientY, pointerType = 'touch') {
  const bounds = canvas.getBoundingClientRect();
  ndc.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  let best = null, bestD = pointerType === 'mouse' ? PICK_RADIUS.mouse : PICK_RADIUS.touch;
  for (const b of bodies) {
    if (!b.pivot && !b.satellite) continue; // the Sun is big: only a direct hit (raycast) selects it
    if (!inSystem(b)) continue; // other planets' moons are not tappable from afar
    const p = b.mesh.getWorldPosition(new THREE.Vector3()).project(camera);
    const d = Math.hypot((p.x - ndc.x) * bounds.width / 2, (p.y - ndc.y) * bounds.height / 2);
    if (p.z < 1 && d < bestD) { bestD = d; best = b; }
  }
  const hit = ray.intersectObjects(bodies.filter(inSystem).map(b => b.mesh), false)[0];
  const hb = hit && bodies.find(b => b.mesh === hit.object);
  if (hb && (hb.pivot || hb.satellite || !best)) best = hb; // planets near the Sun win over the Sun disc
  return best;
}
// Tap recogniser. Listens on the document in the capture phase so nothing layered over the
// canvas, and no listener on the canvas (OrbitControls captures the pointer), can swallow a tap.
// Touch gets a larger movement allowance than a mouse; two-finger gestures never count as taps.
// A click with no preceding pointer sequence (some automation, older browsers) is the fallback.
export const TAP_SLOP = { touch: 14, pen: 10, mouse: 6 };
const TAP_MAX_MS = 900, UI = 'button:not(.lbl),a,input,select,textarea,summary,label,details,#sheet,#topbar';
const pointers = new Map(); let multiTouch = false, lastTapAt = -1e9, lastPointerUpAt = -1e9;
const onScene = t => t === canvas || (t?.closest ? !t.closest(UI) : true);
function handleTap(x, y, type, picked) {
  lastTapAt = performance.now();
  if (hooks.renderOverride) return; // experiments own the scene while open
  const best = picked === undefined ? pickAt(x, y, type) : picked;
  if (best) focus(best); else hooks.onEmpty?.();
  return best;
}
document.addEventListener('pointerdown', e => {
  if (!onScene(e.target)) return;
  // Pick now: a little finger jitter rotates the camera (OrbitControls) before the finger lifts,
  // so what was under the finger at touch-down is what the child aimed at.
  const type = e.pointerType || 'mouse', label = e.target?.closest?.('.lbl');
  // A name label selects its own world even if it drifts a little before the finger lifts.
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), type, picked: hooks.renderOverride ? null : label?.bodyRef || pickAt(e.clientX, e.clientY, type) });
  if (pointers.size > 1) multiTouch = true;
}, true);
document.addEventListener('pointerup', e => {
  lastPointerUpAt = performance.now();
  const d = pointers.get(e.pointerId); pointers.delete(e.pointerId);
  const wasMulti = multiTouch; if (!pointers.size) multiTouch = false;
  if (!d || wasMulti) return;
  const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
  if (moved > (TAP_SLOP[d.type] ?? 10) || performance.now() - d.t > TAP_MAX_MS) return;
  handleTap(d.x, d.y, d.type, d.picked);
}, true);
document.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); if (!pointers.size) multiTouch = false; }, true);
canvas.addEventListener('click', e => {
  const now = performance.now();
  if (now - lastTapAt < 700 || now - lastPointerUpAt < 700) return; // already handled, or the end of a drag
  handleTap(e.clientX, e.clientY, globalThis.matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'mouse');
});

// Controls
const playBtn = document.getElementById('play');
playBtn.onclick = () => { playing = !playing; playBtn.dataset.state = playing ? 'playing' : 'paused'; playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); };
const speed = document.getElementById('speed'), speedTxt = document.getElementById('speedTxt');
function fmtSpeed() {
  const secPerYear = 20 / 10 ** speedExp;
  speedTxt.textContent = secPerYear >= 1 ? `1 yr / ${secPerYear.toFixed(secPerYear < 10 ? 1 : 0)} s` : `${(1 / secPerYear).toFixed(1)} yr / s`;
}
speed.oninput = () => { speedExp = +speed.value; fmtSpeed(); }; fmtSpeed();
function toggle(id, fn) { const b = document.getElementById(id); b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); fn(on); }; }
toggle('lbls', on => labelsEl.classList.toggle('off', !on));

// Overview framing. Portrait screens are narrow, so by default they get a steeper view framed on
// the inner Solar System (Mercury to Mars, so they are legible and tappable); "All planets" frames every
// orbit. Landscape defaults to all planets. The camera distance is fitted so the framed orbit,
// sampled around its full circle, sits inside the frustum with a margin.
export const HOME_DIRECTION = new THREE.Vector3(0, .52, .85).normalize();
export const homeDirection = aspect => { const elev = (aspect < 1 ? 58 : 32) * Math.PI / 180; return new THREE.Vector3(0, Math.sin(elev), Math.cos(elev)); };
export function fitHomeDistance(radius, fovDeg, aspect, direction = HOME_DIRECTION, margin = .9) {
  const cam = new THREE.PerspectiveCamera(fovDeg, aspect, .05, 1e9), p = new THREE.Vector3();
  const fits = d => {
    cam.position.copy(direction).multiplyScalar(d); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; p.set(Math.cos(a) * radius, 0, Math.sin(a) * radius).project(cam); if (p.z >= 1 || Math.abs(p.x) > margin || Math.abs(p.y) > margin) return false; }
    return true;
  };
  let lo = radius * .5, hi = radius * 2;
  while (!fits(hi)) hi *= 2;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  return hi;
}
let chosenScope = null, lastHome = null;
export function homeRadius(scope) {
  // 'inner': the rocky planets, Mercury to Mars (all within 2 AU).
  const list = scope === 'inner' ? PLANETS.filter(p => p.au < 2) : PLANETS;
  return Math.max(...list.map(p => D(p))) * (scope === 'inner' ? 1.1 : 1.04);
}
function resize() {
  const {width:w,height:h} = canvas.getBoundingClientRect();
  if (!w || !h) return;
  renderer.setSize(w, h, false); lastSize = [w, h]; camera.aspect = w / h;
  const portrait = h >= w;
  hooks.homeScope = realScale ? 'all' : chosenScope || (portrait ? 'inner' : 'all');
  if (hooks.kid) HOME.pos.copy(HOME_DIRECTION).multiplyScalar(150 / Math.min(1, w/h));
  else { const dir = homeDirection(w / h); HOME.pos.copy(dir).multiplyScalar(fitHomeDistance(homeRadius(hooks.homeScope), camera.fov, w / h, dir)); }
  controls.maxDistance = realScale ? Math.max(1.5e6,HOME.pos.length()*1.5) : Math.max(900, fitHomeDistance(homeRadius('all'), camera.fov, w / h, homeDirection(w / h)) * 1.5);
  camera.updateProjectionMatrix();
  // In the overview, re-frame when the framing changes noticeably: rotation, or a page first laid
  // out at another size (DevTools device emulation, split screen). Small changes such as the
  // mobile URL bar showing or hiding do not move the camera.
  const moved = lastHome && (lastHome.angleTo(HOME.pos) > .05 || Math.abs(HOME.pos.length() / lastHome.length() - 1) > .12);
  if (moved && !focused && controls.target.length() < 1e-6) unfocus(true, .6);
  lastHome = HOME.pos.clone();
}
export function setHomeScope(scope) { chosenScope = scope; resize(); unfocus(true, 1.2); }
addEventListener('resize', resize); resize(); camera.position.copy(HOME.pos);

const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const tmp = new THREE.Vector3(), prevFocus = new THREE.Vector3();
let last = performance.now();
// Keep the subject centred in the part of the screen not covered by the sheet,
// at the size it would have on a screen of that visible height. Picking and
// labels use the same projection, so taps stay accurate.
function applyVisibleRegion(cam, width, height, visible) {
  const vw = Math.min(width, Math.max(1, visible?.width ?? width)), vh = Math.min(height, Math.max(1, visible?.height ?? height));
  const fullW = 2 * width - vw, fullH = 2 * height - vh;
  cam.aspect = fullW / fullH; cam.zoom = vh / fullH;
  if (vw === width && vh === height) cam.clearViewOffset(); else cam.setViewOffset(fullW, fullH, width - vw, height - vh, width, height);
  cam.updateProjectionMatrix();
  return { width: vw, height: vh, aspect: vw / vh };
}
// Label priority when names would overlap: the focused world, then Earth and the most visible worlds.
const LABEL_ORDER = ['Earth', 'Mars', 'Venus', 'Mercury', 'Jupiter', 'Saturn', 'Sun', 'Uranus', 'Neptune', 'Moon']; // the Sun is easy to tap without one
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  if (hooks.renderOverride) { hooks.renderOverride(); requestAnimationFrame(frame); return; }
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width !== lastSize[0] || bounds.height !== lastSize[1]) { renderer.setSize(bounds.width, bounds.height, false); lastSize = [bounds.width, bounds.height]; } // resizing every frame reallocates the drawing buffer
  const view = applyVisibleRegion(camera, bounds.width, bounds.height, hooks.visible?.(bounds.width, bounds.height));
  const kidSlow = hooks.kid ? 0.25 : 1;
  const overview = !focused && !hooks.kid && !realScale, blend = Math.min(1, dt * 4);
  const approach = (v, target) => Math.abs(target - v) < 1e-3 ? target : v + (target - v) * blend;
  sunView = approach(sunView, overview ? OVERVIEW_SUN : 1); motionView = approach(motionView, overview ? OVERVIEW_MOTION : 1);
  { const sun = bodies[0], base = realScale ? SUN_SHRINK : 1; sun.mesh.scale.setScalar(base * sunView); sun.radius = SUN.size * base * sunView; }
  const kidMotion = kidSlow * (hooks.kid || realScale ? 1 : motionView);
  const dDays = playing && !hooks.hold ? dt * BASE_DAYS_PER_SEC * 10 ** speedExp * kidMotion : 0;
  simDays += dDays; advanceMoons(dt, dDays);
  placeBodies();
  for (const b of bodies) {
    const hours = Math.abs(b.data.rot); // direction comes from the tilt (Venus 177°, Uranus 98°)
    const spin = playing && !hooks.hold ? dt * BASE_DAYS_PER_SEC * 10 ** speedExp * kidMotion * 24 / hours * 0.02 * Math.PI * 2 : 0;
    if (!b.satellite) b.mesh.rotation.y += spin;
    if (b.mesh.userData.axis) b.mesh.userData.axis.visible = focused === b;
    if (b.mesh.userData.clouds) b.mesh.userData.clouds.rotation.y += spin * 0.15 + dt * 0.01;
  }
  updateTrails();

  if (fly.t < 1) {
    fly.t = Math.min(1, fly.t + dt / fly.dur); const k = ease(fly.t);
    let tgt, pos;
    if (focused) {
      tgt = focused.mesh.getWorldPosition(tmp).clone();
      const dir = hooks.outside ? (() => { const sw = tgt.clone().setY(0).normalize().negate(); return sw.multiplyScalar(0.8).add(new THREE.Vector3(-sw.z / 0.8, 0, sw.x / 0.8).multiplyScalar(0.6)).normalize(); })() : fly.fromPos.clone().sub(tgt).normalize();
      dir.y = Math.max(dir.y, 0.35); dir.normalize();
      pos = tgt.clone().add(dir.multiplyScalar(focused.radius * (hooks.focusMul || Math.max(focused.data.rings?5:4, (focused.data.rings ? 5.8 : 2.8) / view.aspect))));
    } else { tgt = HOME.target; pos = HOME.pos; }
    controls.target.lerpVectors(fly.fromTgt, tgt, k);
    camera.position.lerpVectors(fly.fromPos, pos, k);
    if (fly.t >= 1 && focused) prevFocus.copy(tgt);
  } else if (focused) {
    // Follow the focused body as it orbits
    const p = focused.mesh.getWorldPosition(tmp);
    const delta = p.clone().sub(prevFocus); prevFocus.copy(p);
    camera.position.add(delta); controls.target.add(delta);
  }
  // Tiny moons (Phobos is 22 km) need the camera to come closer than the default limits allow.
  { const r = focused ? focused.radius : 1; controls.minDistance = Math.min(0.6, r * 1.5); camera.near = Math.min(0.05, r * 0.2); }
  controls.update();

  stars.position.copy(camera.position);
  // Labels: small tappable names; overlapping ones are hidden so the view stays uncluttered.
  const placed = [], ordered = [...bodies].sort((a, b) => (b === focused) - (a === focused) || LABEL_ORDER.indexOf(a.data.name) - LABEL_ORDER.indexOf(b.data.name));
  for (const b of ordered) {
    const p = b.mesh.getWorldPosition(tmp).project(camera);
    const x = bounds.left + (p.x + 1) / 2 * bounds.width, y = bounds.top + (1 - p.y) / 2 * bounds.height;
    const w = b.data.name.length * 4.9 + 10, h = 13; // matches the .lbl tag: 8px text, 5px side padding
    // Above the world if there is room, otherwise below it.
    const spots = [[x - w / 2, y - 6 - h, x + w / 2, y - 6, 'calc(-100% - 6px)'], [x - w / 2, y + 6, x + w / 2, y + 6 + h, '6px']];
    let spot = null;
    if (p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 && !(b.satellite && !(b.host ? inSystem(b) : focused)))
      spot = spots.find(o2 => !placed.some(o => o2[0] < o[2] && o2[2] > o[0] && o2[1] < o[3] && o2[3] > o[1])) || null;
    if (spot) placed.push(spot);
    b.label.style.visibility = spot ? 'visible' : 'hidden';
    b.label.hidden = !spot;
    if (spot) { b.label.style.transform = `translate(${x}px,${y}px) translate(-50%,${spot[4]})`; b.label.dataset.box = spot.slice(0, 4).map(v => v.toFixed(1)).join(','); }
  }
  // "You are here" marker on Earth (kid overview only)
  const earth = bodies.find(b => b.data.name === 'Earth');
  const hp = earth.mesh.getWorldPosition(tmp).project(camera);
  const showHere = hooks.kid && hooks.here && !focused && fly.t >= 1 && hp.z < 1;
  hereEl.hidden = !showHere;
  if (showHere) hereEl.style.transform = `translate(${bounds.left + (hp.x + 1) / 2 * bounds.width}px,${bounds.top + (1 - hp.y) / 2 * bounds.height}px)`;
  // Show markers only for bodies that are too small to see/tap
  const pxPerUnit = view.height / 2 / Math.tan(camera.fov * Math.PI / 360);
  for (const b of bodies) { const dd = camera.position.distanceTo(b.mesh.getWorldPosition(tmp)); b.marker.visible = inSystem(b) && b.radius * (b === bodies[0] && realScale ? SUN_SHRINK : 1) / dd * pxPerUnit < 5; if (b.moonRing) b.moonRing.visible = inSystem(b) && !realScale; }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const hereEl = document.getElementById('here');
const ambient = scene.children.find(o => o.isAmbientLight);
export function setKid(on, opts = {}) {
  if (on && realScale) document.getElementById('realBtn').click();
  hooks.kid = on;
  document.body.classList.toggle('kid', on);
  ambient.intensity = on ? 1.6 : 0.08;
  for (const b of bodies) {
    const k = on && (b.pivot || b.satellite) ? 2 : 1; // kid: planets x2 (same for all, ratios kept)
    b.mesh.scale.setScalar(k); b.radius = b.data.size * k;
    if (b.mesh.userData.ring) b.mesh.userData.ring.scale.setScalar(k);
    if (b.trail) b.trail.visible = !on && trailsOn;
    if (b.moonPivot) { const m = b.moonPivot.children[0]; m.scale.setScalar(on ? 2 : 1); m.position.x = on ? b.radius + 1.4 : (realScale ? MOON.realDist : MOON.dist); }
  }
  trailsHidden = on;
  resize();
  if (!opts.noHome) unfocus(true);
}
let trailsHidden = false;
export function setRealScale(on) {
  realScale = on; document.body.classList.toggle('real', on);
  const sun = bodies[0]; sun.mesh.scale.setScalar(on ? SUN_SHRINK : 1); sun.radius = SUN.size * (on ? SUN_SHRINK : 1);
  for (const b of bodies) { if (b.orbit) b.orbit.scale.setScalar(D(b.data)); if (b.moonMesh) b.moonMesh.position.x = on ? MOON.realDist : MOON.dist; if (b.orbitPivot) b.mesh.position.x = on ? b.data.realDist : b.data.dist; }
  resize(); unfocus(true, 1.6);
}
document.getElementById('realBtn').onclick = e => { const on = !realScale; e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', on); document.getElementById('scaleNote').textContent = on ? 'true sizes & distances' : 'sizes to scale (Sun 1/5) · distances shrunk'; setRealScale(on); };
window.__face = (name, lonDeg) => { const b = bodies.find(x => x.data.name === name); const d = camera.position.clone().sub(b.mesh.getWorldPosition(new THREE.Vector3())); const tilt = b.mesh.parent; const local = tilt.worldToLocal(camera.position.clone()).sub(tilt.worldToLocal(b.mesh.getWorldPosition(new THREE.Vector3()))); b.mesh.rotation.y = Math.atan2(-local.z, local.x) - lonDeg * Math.PI / 180; void d; };
export { bodies, focus, unfocus, camera, controls, renderer, pickAt, applyVisibleRegion, HOME, handleTap, inSystem };
window.__solar = { pickAt, screenOf: n => { const bounds=canvas.getBoundingClientRect(); const b = bodies.find(x => x.data.name === n); const p = b.mesh.getWorldPosition(new THREE.Vector3()).project(camera); return [bounds.left + (p.x + 1) / 2 * bounds.width, bounds.top + (1 - p.y) / 2 * bounds.height]; }, focusByName: n => focus(bodies.find(b => b.data.name === n)), setKid };
window.__cam = () => [camera.position.toArray().map(v => +v.toFixed(3)), controls.target.toArray().map(v => +v.toFixed(3))];
