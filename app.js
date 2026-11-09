import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { SUN, PLANETS, MOON, SUN_SHRINK } from './data.js';
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

// Starfield
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
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, vertexColors: true, sizeAttenuation: false })));
}

scene.add(new THREE.AmbientLight(0x404660, 0.6));
scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x2a1a10, 0.35));
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
  const el = document.createElement('div'); el.className = 'lbl'; el.textContent = body.data.name;
  el.addEventListener('click', () => focus(body)); labelsEl.appendChild(el); body.label = el;
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
  const mat = new THREE.MeshStandardMaterial({ map: tx.map, bumpMap: tx.bump || null, bumpScale: tx.bump ? 2 : 0, roughness: 0.85, metalness: 0 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.size, 48, 32), mat);
  // Real axial tilt: tilt group holds the spinning mesh (obliquity > 90° makes Venus/Uranus spin retrograde)
  const tiltG = new THREE.Object3D(); tiltG.rotation.z = THREE.MathUtils.degToRad(d.tilt);
  pivot.add(tiltG); tiltG.add(mesh);
  mesh.add(rimShell(d.size * 1.035, d.rim || d.color, 2.6, d.name === 'Earth' ? 1.1 : 0.55, 32));
  if (d.name === 'Earth') {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(d.size * 1.012, 48, 32), new THREE.MeshStandardMaterial({ map: tex('EarthClouds'), transparent: true, depthWrite: false, roughness: 1 }));
    mesh.add(cl); mesh.userData.clouds = cl;
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
    const mm = new THREE.Mesh(new THREE.SphereGeometry(MOON.size, 20, 12), new THREE.MeshStandardMaterial({ map: tex('Moon').map, bumpMap: tex('Moon').bump, bumpScale: 1.5, roughness: 0.95 }));
    mm.position.x = MOON.dist; mp.add(mm); body.moonPivot = mp; body.moonMesh = mm;
  }
  bodies.push(body); addLabel(body);
}
const earthBody = bodies.find(b => b.data.name === 'Earth');
const moonBody = { data: MOON, mesh: earthBody.moonMesh, radius: MOON.size, satellite: true };
bodies.push(moonBody); addLabel(moonBody);
// Markers: small glowing dots so tiny planets can be found (shown when the planet is under ~5 px on screen)
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
for (const b of bodies) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: b.data.color, sizeAttenuation: false, depthWrite: false, transparent: true }));
  m.scale.setScalar(0.022); m.renderOrder = 5; (b.satellite ? b.mesh : b.pivot || scene).add(m); b.marker = m;
}

// Simulation state
let playing = true, speedExp = 0, trailsOn = true, focused = null;
export const hooks = { kid: false, onFocus: null, intercept: null, focusMul: 0, here: false, guided: false };
const BASE_DAYS_PER_SEC = 365.26 / 20; // 1 Earth year per 20 s at 1x
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
  focused = b; fly.dur = opts.dur || 1.2; hooks.focusMul = opts.mul || 0; hooks.outside = !!opts.outside;
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
document.getElementById('close').onclick = () => unfocus(false);

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1);
  ray.setFromCamera(ndc, camera);
  // Generous hit test: nearest body whose screen-space distance is small
  let best = null, bestD = hooks.kid ? 60 : 28;
  for (const b of bodies) {
    if (!b.pivot && !b.satellite) continue; // the Sun is big: only a direct hit (raycast) selects it
    const p = b.mesh.getWorldPosition(new THREE.Vector3()).project(camera);
    const d = Math.hypot((p.x - ndc.x) * innerWidth / 2, (p.y - ndc.y) * innerHeight / 2);
    if (p.z < 1 && d < bestD) { bestD = d; best = b; }
  }
  const hit = ray.intersectObjects(bodies.map(b => b.mesh), false)[0];
  const hb = hit && bodies.find(b => b.mesh === hit.object);
  if (hb && (hb.pivot || hb.satellite || !best)) best = hb; // planets near the Sun win over the Sun disc
  if (best) focus(best);
});

// Controls
const playBtn = document.getElementById('play');
playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? '❚❚' : '▶'; playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); };
const speed = document.getElementById('speed'), speedTxt = document.getElementById('speedTxt');
function fmtSpeed() {
  const secPerYear = 20 / 10 ** speedExp;
  speedTxt.textContent = secPerYear >= 1 ? `1 yr / ${secPerYear.toFixed(secPerYear < 10 ? 1 : 0)} s` : `${(1 / secPerYear).toFixed(1)} yr / s`;
}
speed.oninput = () => { speedExp = +speed.value; fmtSpeed(); }; fmtSpeed();
function toggle(id, fn) { const b = document.getElementById(id); b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); fn(on); }; }
toggle('trails', on => { trailsOn = on; });
toggle('lbls', on => labelsEl.classList.toggle('off', !on));
document.getElementById('reset').onclick = () => unfocus(true);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  // Frame the whole system (grown-up), the inner system out to Jupiter (kid), or true-scale orbits
  const base = realScale ? new THREE.Vector3(0, 1.6e5, 2.9e5) : hooks.kid ? new THREE.Vector3(0, 38, 62) : new THREE.Vector3(0, 130, 215);
  HOME.pos.copy(base).multiplyScalar(w / h < 1 ? 1.9 : 1);
  controls.maxDistance = realScale ? 1.5e6 : 900;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize(); camera.position.copy(HOME.pos);

const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const tmp = new THREE.Vector3(), prevFocus = new THREE.Vector3();
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  const kidSlow = hooks.kid ? 0.25 : 1;
  if (playing && !hooks.guided) simDays += dt * BASE_DAYS_PER_SEC * 10 ** speedExp * kidSlow;
  placeBodies();
  for (const b of bodies) {
    const hours = Math.abs(b.data.rot); // direction comes from the tilt (Venus 177°, Uranus 98°)
    const spin = playing && !hooks.guided ? dt * BASE_DAYS_PER_SEC * 10 ** speedExp * kidSlow * 24 / hours * 0.02 * Math.PI * 2 : 0;
    if (!b.satellite) b.mesh.rotation.y += spin;
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
      // Keep the full ring system inside narrow phone views, not just the globe.
      const framing = innerWidth < innerHeight ? (focused.data.rings ? Math.max(9, 6 / camera.aspect) : 9) : 6;
      pos = tgt.clone().add(dir.multiplyScalar(focused.radius * (hooks.focusMul || framing)));
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
  controls.update();

  // Labels
  for (const b of bodies) {
    const p = b.mesh.getWorldPosition(tmp).project(camera);
    const vis = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
    b.label.style.visibility = vis ? 'visible' : 'hidden';
    if (vis) b.label.style.transform = `translate(${(p.x + 1) / 2 * innerWidth}px,${(1 - p.y) / 2 * innerHeight}px) translate(-50%,-150%)`;
  }
  // "You are here" marker on Earth (kid overview only)
  const earth = bodies.find(b => b.data.name === 'Earth');
  const hp = earth.mesh.getWorldPosition(tmp).project(camera);
  const showHere = hooks.kid && hooks.here && !focused && fly.t >= 1 && hp.z < 1;
  hereEl.hidden = !showHere;
  if (showHere) hereEl.style.transform = `translate(${(hp.x + 1) / 2 * innerWidth}px,${(1 - hp.y) / 2 * innerHeight}px)`;
  // Show markers only for bodies that are too small to see/tap
  const pxPerUnit = innerHeight / 2 / Math.tan(camera.fov * Math.PI / 360);
  for (const b of bodies) { const dd = camera.position.distanceTo(b.mesh.getWorldPosition(tmp)); b.marker.visible = b.radius * (b === bodies[0] && realScale ? SUN_SHRINK : 1) / dd * pxPerUnit < 5; }
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
  ambient.intensity = on ? 1.6 : 0.6;
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
  for (const b of bodies) { if (b.orbit) b.orbit.scale.setScalar(D(b.data)); if (b.moonMesh) b.moonMesh.position.x = on ? MOON.realDist : MOON.dist; }
  resize(); unfocus(true, 1.6);
}
document.getElementById('realBtn').onclick = e => { const on = !realScale; e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-pressed', on); document.getElementById('scaleNote').textContent = on ? 'true sizes & distances' : 'sizes to scale (Sun 1/5) · distances shrunk'; setRealScale(on); };
window.__face = (name, lonDeg) => { const b = bodies.find(x => x.data.name === name); const d = camera.position.clone().sub(b.mesh.getWorldPosition(new THREE.Vector3())); const tilt = b.mesh.parent; const local = tilt.worldToLocal(camera.position.clone()).sub(tilt.worldToLocal(b.mesh.getWorldPosition(new THREE.Vector3()))); b.mesh.rotation.y = Math.atan2(-local.z, local.x) - lonDeg * Math.PI / 180; void d; };
export { bodies, focus, unfocus, camera, controls };
window.__solar = { screenOf: n => { const b = bodies.find(x => x.data.name === n); const p = b.mesh.getWorldPosition(new THREE.Vector3()).project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; }, focusByName: n => focus(bodies.find(b => b.data.name === n)), setKid };
window.__cam = () => [camera.position.toArray().map(v => +v.toFixed(3)), controls.target.toArray().map(v => +v.toFixed(3))];
