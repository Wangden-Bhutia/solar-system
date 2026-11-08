import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { SUN, PLANETS, MOON } from './data.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
const HOME = { pos: new THREE.Vector3(0, 45, 75), target: new THREE.Vector3() };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.minDistance = 2; controls.maxDistance = 300;

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
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN.size, 48, 32), new THREE.MeshBasicMaterial({ color: SUN.color }));
scene.add(sunMesh);
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,220,120,0.9)'); g.addColorStop(0.3, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv);
})(), blending: THREE.AdditiveBlending, depthWrite: false }));
glow.scale.setScalar(SUN.size * 6); sunMesh.add(glow);
const sunBody = { data: SUN, mesh: sunMesh, radius: SUN.size };
bodies.push(sunBody); addLabel(sunBody);

const TRAIL_N = 160;
for (const d of PLANETS) {
  const pivot = new THREE.Object3D(); scene.add(pivot);
  const mat = new THREE.MeshStandardMaterial({ color: d.bands ? 0xffffff : d.color, map: d.bands ? bandTex(d.color) : null, roughness: 1 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.size, 40, 24), mat);
  mesh.rotation.z = THREE.MathUtils.degToRad(d.tilt);
  pivot.add(mesh);
  if (d.rings) {
    const rg = new THREE.RingGeometry(d.size * 1.3, d.size * 2.3, 64);
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xcdbb8e, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
    ring.rotation.x = Math.PI / 2; mesh.add(ring);
  }
  // Static orbit line
  const op = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; op.push(Math.cos(a) * d.dist, 0, Math.sin(a) * d.dist); }
  const og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.Float32BufferAttribute(op, 3));
  scene.add(new THREE.Line(og, new THREE.LineBasicMaterial({ color: 0x2a3366, transparent: true, opacity: 0.35 })));
  // Fading trail
  const tp = new Float32Array(TRAIL_N * 3), tc = new Float32Array(TRAIL_N * 3);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending }));
  trail.frustumCulled = false; scene.add(trail);
  const body = { data: d, pivot, mesh, trail, radius: d.size, angle: Math.random() * Math.PI * 2 };
  if (d.moon) {
    const mp = new THREE.Object3D(); pivot.add(mp);
    const mm = new THREE.Mesh(new THREE.SphereGeometry(MOON.size, 20, 12), new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 1 }));
    mm.position.x = MOON.dist; mp.add(mm); body.moonPivot = mp;
  }
  bodies.push(body); addLabel(body);
}

// Simulation state
let playing = true, speedExp = 0, trailsOn = true, focused = null;
export const hooks = { kid: false, onFocus: null };
const BASE_DAYS_PER_SEC = 365.26 / 20; // 1 Earth year per 20 s at 1x
let simDays = 0;
const fly = { t: 1, fromPos: new THREE.Vector3(), fromTgt: new THREE.Vector3(), dur: 1.2 };

function placeBodies() {
  for (const b of bodies) {
    if (!b.pivot) continue;
    const a = b.angle + (simDays / b.data.period) * Math.PI * 2;
    b.pivot.position.set(Math.cos(a) * b.data.dist, 0, -Math.sin(a) * b.data.dist);
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
      pos.setXYZ(i, Math.cos(a) * b.data.dist, 0, -Math.sin(a) * b.data.dist);
      const k = (1 - f) ** 1.6; col.setXYZ(i, c.r * k, c.g * k, c.b * k);
    }
    pos.needsUpdate = col.needsUpdate = true;
  }
}

// Focus / info
const info = document.getElementById('info');
function focus(b) {
  focused = b;
  fly.fromPos.copy(camera.position); fly.fromTgt.copy(controls.target); fly.t = 0;
  document.getElementById('i-name').textContent = b.data.name;
  document.getElementById('i-blurb').textContent = b.data.blurb;
  document.getElementById('i-facts').innerHTML = b.data.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  info.hidden = hooks.kid;
  if (hooks.onFocus) hooks.onFocus(b);
}
function unfocus(goHome) {
  focused = null; info.hidden = true;
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
    const p = b.mesh.getWorldPosition(new THREE.Vector3()).project(camera);
    const d = Math.hypot((p.x - ndc.x) * innerWidth / 2, (p.y - ndc.y) * innerHeight / 2);
    if (p.z < 1 && d < bestD) { bestD = d; best = b; }
  }
  const hit = ray.intersectObjects(bodies.map(b => b.mesh), false)[0];
  if (hit) best = bodies.find(b => b.mesh === hit.object) || best;
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
  HOME.pos.set(0, 45, 75).multiplyScalar((w / h < 1 ? 1.9 : 1) * (hooks.kid ? 0.8 : 1));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize(); camera.position.copy(HOME.pos);

const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const tmp = new THREE.Vector3(), prevFocus = new THREE.Vector3();
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  const kidSlow = hooks.kid ? 0.25 : 1;
  if (playing) simDays += dt * BASE_DAYS_PER_SEC * 10 ** speedExp * kidSlow;
  placeBodies();
  for (const b of bodies) {
    const hours = b.data.rot;
    b.mesh.rotation.y += playing ? dt * BASE_DAYS_PER_SEC * 10 ** speedExp * 24 / hours * 0.02 * Math.PI * 2 : 0;
  }
  updateTrails();

  if (fly.t < 1) {
    fly.t = Math.min(1, fly.t + dt / fly.dur); const k = ease(fly.t);
    let tgt, pos;
    if (focused) {
      tgt = focused.mesh.getWorldPosition(tmp).clone();
      const dir = fly.fromPos.clone().sub(tgt).normalize();
      dir.y = Math.max(dir.y, 0.35); dir.normalize();
      pos = tgt.clone().add(dir.multiplyScalar(focused.radius * (innerWidth < innerHeight ? 9 : 6)));
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
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
const ambient = scene.children.find(o => o.isAmbientLight);
export function setKid(on) {
  hooks.kid = on;
  document.body.classList.toggle('kid', on);
  ambient.intensity = on ? 1.6 : 0.6;
  for (const b of bodies) {
    const k = on && b.pivot ? Math.max(2.2, 2 / b.data.size) : 1;
    b.mesh.scale.setScalar(k); b.radius = b.data.size * k;
    if (b.trail) b.trail.visible = !on && trailsOn;
  }
  trailsHidden = on;
  resize();
  unfocus(true);
}
let trailsHidden = false;
export { bodies, focus, unfocus };
window.__solar = { focusByName: n => focus(bodies.find(b => b.data.name === n)), setKid };
