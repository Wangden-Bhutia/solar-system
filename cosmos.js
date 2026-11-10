// The two largest scales, drawn with the shared renderer like the other scenes:
//  - Laniakea, our supercluster (1 unit = 1 million light-years): ~9,700 real galaxies placed by redshift.
//  - The observable universe (1 unit = 100 million light-years): out to the cosmic microwave background.
// Each continues the zoom to scale from the level inside it (distances ÷ 100 at each seam).
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GALAXIES } from './local-data.js';
import { ngcGalaxies, skyPosition, CLUSTERS, SHELLS, FAR_GALAXY, CMB_GLY } from './cosmos-data.js';
import { SUPER_NEAR, SUPER_FAR, UNIVERSE_NEAR, UNIVERSE_FAR, SCENE_RANGE } from './zoom-ladder.js';
import { createPlacer, placeAll, forgetLabel } from './labels.js';
import { skyPoints, placeSky } from './sky.js';
import { createLod, seamWindow } from './lod.js';

const glow = (() => {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext?.('2d'); if (!x) return null;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
const KIND_COLOURS = [[1, 0.86, 0.66], [0.72, 0.82, 1], [0.85, 0.85, 0.9]]; // elliptical, spiral, other

// Shared scene machinery: camera, controls, labels, glides, picking, fading for the zoom bridge.
function createScene({ renderer, canvas, labelsEl, onPick, near, far, min, max = Infinity, home, overviewD, overviewDir, fitRadius = 0 }) {
  const scene = new THREE.Scene(), bg = new THREE.Color(0x000005); scene.background = bg;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 1e6);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enabled = false; controls.enablePan = false;
  // Zoom: zoom.js via lab.js (OrbitControls only rotates). Limits: the whole range, seams included.
  controls.enableZoom = false; controls.minDistance = min; controls.maxDistance = max;
  const marks = [], extras = [], glows = []; let labelsDirty = true, labelItems = []; const placer = createPlacer(256);
  // Each drawn object carries its level-of-detail rule (lod.js); see rules below.
  const rules = new Map(), HERE = { inner: 'model', outer: 'model', alone: 'fixed' };
  const points = (pos, col, size, opacity, color = 0xffffff, rule = 'size') => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos instanceof Float32Array ? pos : new Float32Array(pos), 3)); if (col) g.setAttribute('color', new THREE.BufferAttribute(col instanceof Float32Array ? col : new Float32Array(col), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: !!col, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); p.frustumCulled = false; scene.add(p); rules.set(p, rule); return p; };
  function mark(item, { px = 8, color = 0xdfe8ff, opacity = 0.8, label = item.name, rule = item.here ? HERE : 'marker' } = {}) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, sizeAttenuation: false, depthWrite: false, transparent: true, opacity, blending: THREE.AdditiveBlending }));
    sprite.position.fromArray(item.pos); sprite.userData.px = px; scene.add(sprite); rules.set(sprite, rule);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl space galaxy' + (item.here ? ' here' : ''); el.textContent = label; el.tabIndex = -1; el.hidden = true;
    el.addEventListener('click', ev => { ev.stopPropagation(); onPick?.(item); }); labelsEl.appendChild(el);
    marks.push({ item, sprite, el, pos: sprite.position, px, here: !!item.here }); labelsDirty = true; return sprite;
  }
  // A glow without a label (constant size on screen, like the marks).
  function glowAt(pos, px, color, opacity, rule = 'marker') { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, sizeAttenuation: false, depthWrite: false, transparent: true, opacity, blending: THREE.AdditiveBlending })); sp.position.fromArray(pos); sp.userData.px = px; scene.add(sp); glows.push(sp); rules.set(sp, rule); return sp; }
  function ring(r, text, color = 0x33415c, opacity = 0.45) {
    const pts = []; for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity })); scene.add(line); rules.set(line, 'size');
    if (text) { const el = document.createElement('span'); el.className = 'lbl space ring-lbl'; el.textContent = text; el.hidden = true; labelsEl.appendChild(el); extras.push({ el, pos: new THREE.Vector3(r * 0.7071, 0, r * 0.7071), px: 0, ring: line }); labelsDirty = true; }
  }
  let fitMax = max; const tmp = new THREE.Vector3(); let last = 0, selected = null, on = false, hideHere = false, seamNow = null, lod = null;
  // Per-object level of detail (lod.js), built on first draw from each object's rule: the sky is drawn once across
  // a seam; point clouds and rings fade as they shrink; markers fade as they merge into "you are here"; the
  // "you are here" marker cross-fades with the scale next to it; copies of the next scale's objects (rule 'proxy')
  // swap with them at mid-seam.
  const ANCHOR = new THREE.Vector3(...home);
  const buildLod = () => { lod = createLod(); scene.traverse(o => { if (o.material) lod.add(o, o.userData.sky ? 'proxy' : rules.get(o) ?? 'size', o.userData.lodOpts); }); };
  const fadeOf = it => it.sprite ? it.sprite.userData.fade ?? 1 : it.ring ? it.ring.userData.fade ?? 1 : seamWindow(seamNow);
  const reduce = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const portrait = () => { const r = canvas.getBoundingClientRect(); return r.height > r.width; };
  const HOME = new THREE.Vector3(...home);
  // Distance at which a sphere of fitRadius fills the screen with a margin, whichever of width or height is tighter
  // (a tall phone screen needs more room than its height alone suggests).
  const fitDistance = () => { const r = canvas.getBoundingClientRect(), a = r.width && r.height ? r.width / r.height : 1, v = camera.fov * Math.PI / 360, h = Math.atan(Math.tan(v) * a); return fitRadius / Math.sin(Math.min(v, h)) * 1.06; };
  const fly = { t: 1, from: null, to: null, dir: new THREE.Vector3(0.25, 0.75, 0.6).normalize(), done: null,
    start(toD, toT, dur, done, toDir) { this.from = { d: camera.position.distanceTo(controls.target) || near, tgt: controls.target.clone(), dir: viewDir() }; this.to = { d: toD, tgt: toT.clone(), dir: (toDir || this.from.dir).clone().normalize() }; this.t = 0; this.dur = reduce() ? 0.01 : dur; this.done = done; },
    step(dt) { if (this.t >= 1) return; this.t = Math.min(1, this.t + dt / this.dur); const k = 1 - (1 - this.t) ** 3, d = this.from.d * (this.to.d / this.from.d) ** k;
      controls.target.lerpVectors(this.from.tgt, this.to.tgt, k); this.dir.lerpVectors(this.from.dir, this.to.dir, k).normalize(); camera.position.copy(controls.target).addScaledVector(this.dir, d);
      if (this.t >= 1) { const f = this.done; this.done = null; f?.(); } } };
  const viewDir = () => { const v = camera.position.clone().sub(controls.target); return v.lengthSq() ? v.normalize() : fly.dir.clone(); };
  // The zoom controller's hook: same direction and centre, new distance. No allocation.
  const off = new THREE.Vector3();
  function setDistance(d) { fly.t = 1; fly.done = null; off.copy(camera.position).sub(controls.target); const l = off.length(); if (l) camera.position.copy(controls.target).addScaledVector(off, d / l); else camera.position.copy(controls.target).addScaledVector(fly.dir, d); }
  // Zooming in re-centres gently on HOME as the camera nears this scale's inner edge, so the hand-over to the
  // scale inside needs no automatic flight: it is just the zoom you are already doing.
  const driftStep = new THREE.Vector3();
  function drift(dt) {
    if (fly.t < 1 || !controls.enabled) return;
    const d = camera.position.distanceTo(controls.target), f = Math.min(1, Math.max(0, (near * 5 - d) / (near * 4)));
    if (f <= 0 || controls.target.distanceTo(HOME) < 1e-9) return;
    driftStep.copy(HOME).sub(controls.target).multiplyScalar(Math.min(1, f * dt * 3.5)); controls.target.add(driftStep); camera.position.add(driftStep);
  }
  // Allocation-free label placement (labels.js); the priority list is rebuilt only when marks are added.
  const project = (it, out) => { tmp.copy(it.pos).project(camera); out.x = tmp.x; out.y = tmp.y; out.z = tmp.z; return true; };
  const labelOpts = { enabled: true, visible: it => !(hideHere && it.here) && fadeOf(it) > 0.02, opacity: it => fadeOf(it) };
  let labelsLive = true;
  function placeLabels(bounds) {
    if (labelsDirty) { labelItems = [...[...marks].sort((a, b) => (a.item.rank ?? 9) - (b.item.rank ?? 9)), ...extras]; labelsDirty = false; }
    labelOpts.enabled = on && labelsLive; placeAll(labelItems, labelItems.length, placer, bounds, project, labelOpts);
  }
  // seam: null, or { role, t } inside a seam: every object fades by its own rule (lod.js).
  function render(width, height, visible, { overlay = false, seam = null } = {}) {
    scene.background = overlay ? null : bg; seamNow = seam; if (!lod) buildLod();
    const now = performance.now(), dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    renderer.setSize(width, height, false);
    const vw = Math.min(width, visible?.width ?? width), vh = Math.min(height, visible?.height ?? height), fullW = 2 * width - vw, fullH = 2 * height - vh;
    camera.aspect = fullW / fullH; camera.zoom = vh / fullH;
    if (vw === width && vh === height) camera.clearViewOffset(); else camera.setViewOffset(fullW, fullH, width - vw, height - vh, width, height);
    if (fitRadius) controls.maxDistance = Math.max(far, fitDistance() * 1.12); fitMax = controls.maxDistance;
    camera.far = Math.max(1e4, camera.position.length() * 6); camera.updateProjectionMatrix(); fly.step(dt); drift(dt); controls.update();
    const k = 2 * Math.tan(camera.fov * Math.PI / 360) * 2 / vh;
    for (const x of marks) x.sprite.scale.setScalar(x.sprite.userData.px * k * (x.item === selected ? 1.7 : 1));
    for (const sp of glows) sp.scale.setScalar(sp.userData.px * k);
    for (const o of scene.children) if (o.userData.sky) placeSky(o, camera);
    lod.update(camera.position, ANCHOR, vh, camera.fov, seam);
    placeLabels(canvas.getBoundingClientRect());
    const clear = renderer.autoClear; renderer.autoClear = !overlay; renderer.render(scene, camera); renderer.autoClear = clear;
  }
  function pick(cx, cy) {
    const b = canvas.getBoundingClientRect(); let best = null, bestD = 44;
    for (const x of marks) { tmp.copy(x.sprite.position).project(camera); if (tmp.z >= 1) continue; const d = Math.hypot(b.left + (tmp.x + 1) / 2 * b.width - cx, b.top + (1 - tmp.y) / 2 * b.height - cy) - (x.item.rank <= 1 ? 8 : 0); if (d < bestD) { bestD = d; best = x.item; } }
    return best;
  }
  function setLabels(v) { on = v; for (const x of marks) { forgetLabel(x); x.el.hidden = !v; } for (const x of extras) { forgetLabel(x); x.el.hidden = !v; } }
  function setView(dir, d, tgt = HOME) { fly.t = 1; fly.done = null; fly.dir.copy(dir).normalize(); controls.target.copy(tgt); camera.position.copy(controls.target).addScaledVector(fly.dir, d); controls.update(); }
  // The "you are here" anchor at this scale (its marker, placed as its own label would be).
  function anchor(out, bounds) {
    const h = marks.find(m => m.here); if (!h) return false;
    tmp.copy(h.sprite.position).project(camera); if (tmp.z >= 1) return false;
    out.x = bounds.left + (tmp.x + 1) / 2 * bounds.width; out.y = bounds.top + (1 - tmp.y) / 2 * bounds.height; out.off = h.px / 2 + 4; out.text = h.el.textContent; return true;
  }
  // Adopt an object made elsewhere (a proxy copy of the scale inside): drawn with a LOD rule; sprites keep their px.
  function adopt(o, rule, lodOpts) { scene.add(o); rules.set(o, rule); if (lodOpts) o.userData.lodOpts = lodOpts; if (o.isSprite) glows.push(o); return o; }
  const api = { scene, points, mark, ring, glowAt, adopt, render, anchor, hideHere(v) { hideHere = v; if (v) for (const it of marks) if (it.here) { it.el.hidden = true; forgetLabel(it); } }, pick, setView, viewDir, camera, controls, fly, setDistance, distance: () => camera.position.distanceTo(controls.target), liveLabels(v) { labelsLive = v; },
    enter(at) { setLabels(true); controls.enabled = true; if (at) setView(at.dir, at.d, at.tgt ? new THREE.Vector3(...at.tgt) : HOME); },
    leave() { setLabels(false); controls.enabled = false; },
    overviewDistance: () => fitRadius ? fitDistance() : portrait() ? overviewD * 1.5 : overviewD,
    overview(done) { fly.start(fitRadius ? fitDistance() : portrait() ? overviewD * 1.5 : overviewD, HOME, 2.2, done, overviewDir); },
    zoomOut(done) { fly.start(far, controls.target, 1.2, done); },
    zoomBackIn(done) { fly.start(near, HOME, 1.4, done); },
    zoomState: () => ({ d: camera.position.distanceTo(controls.target), min: controls.minDistance, max: fitMax, busy: fly.t < 1 }),
    showLabels: setLabels, select(item) { selected = item; }, items: () => marks.map(m => m.item) };
  return api;
}

// One style for the NGC/IC catalogue at both scales that show it (so they are an exact proxy pair).
let laniakeaNgc = null; // the Laniakea scene's NGC/IC layer: the Universe's copy of it names it as its source
export const NGC_STYLE = { size: 1.5, opacity: 0.75 };
export function ngcColours(g) { const col = new Float32Array(g.count * 3); for (let i = 0; i < g.count; i++) { const c = KIND_COLOURS[g.kind[i]], k = 0.6 + ((i * 2654435761) >>> 0) / 4294967296 * 0.4; col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k; } return col; }
const LOCAL_UNIT_MLY = 0.01; // the Local Group level's unit (10 kly) in Mly
// ---- Laniakea: 1 unit = 1 million light-years ----
export function createLaniakea(opts) {
  const s = createScene({ ...opts, near: SUPER_NEAR, far: SUPER_FAR, min: SCENE_RANGE.super[0], max: SCENE_RANGE.super[1], home: [0, 0, 0], overviewD: 520, overviewDir: new THREE.Vector3(0.3, 0.8, 0.5) });
  s.scene.add(skyPoints(0)); // the shared sky (sky.js), galactic frame
  // The NGC/IC catalogue, drawn identically here and (shrunk 100×) in the universe: an exact proxy pair, swapped at
  // mid-seam; in both it gives way by on-screen density.
  const g = ngcGalaxies(1);
  const ngcL = s.points(g.pos, ngcColours(g), NGC_STYLE.size, NGC_STYLE.opacity, 0xffffff, { inner: 'proxy', outer: 'size', alone: 'size' }); ngcL.userData.lodOpts = { N: g.count }; ngcL.userData.layer = 'ngc'; laniakeaNgc = ngcL;
  // The Local Sheet, the Local Void and the nearby giants' glows: exact copies of the Local Group level's (proxy pairs).
  if (opts.local?.proxyCopies) for (const c of opts.local.proxyCopies(LOCAL_UNIT_MLY)) s.adopt(c, c.isSprite ? { outer: 'proxy', inner: 'marker', alone: 'marker' } : { outer: 'proxy', inner: 'size', alone: 'size' }, { appear: [4, 15] });
  // The Local Group's own galaxies, shrunk from the level inside, drawn with the same glows (sizes, colours)
  // as the Local Group level, so they don't collapse into dots as one scale fades into the other.
  // These copies are identical on screen to the Local Group's own markers at the seam (rule 'proxy': swapped at mid-seam).
  const COPY = { outer: 'proxy', inner: 'marker', alone: 'marker' };
  s.glowAt([0, 0, 0], 16, 0xffe38a, 0.35, COPY);
  for (const g of GALAXIES) { const big = g.i != null || g.blob; s.glowAt(g.pos.map(v => v / 100), g.rank === 1 ? 25.6 : big ? 16 : 5, big ? 0xdfe8ff : 0xb9c4dc, g.rank === 1 ? 0.75 : g.rank === 2 ? 0.55 : big ? 0.35 : 0.9, COPY); }
  s.mark({ name: 'Local Group', kind: 'Our group of galaxies', here: true, rank: 0, pos: [0, 0, 0] }, { px: 12, color: 0xffe38a, opacity: 0.25, label: 'Local Group · you are here' });
  for (const c of CLUSTERS) s.mark({ ...c, pos: skyPosition(c.ra, c.dec, c.mly, 1) }, { px: c.rank <= 2 ? 12 : 8, color: c.attractor ? 0xffc890 : 0xdfe8ff, label: c.attractor ? 'Norma · Great Attractor' : c.name });
  for (const r of [100, 200, 300]) s.ring(r, `${r} million ly`);
  return s;
}

// ---- The observable universe: 1 unit = 100 million light-years ----
function rng(seed) { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
export function cosmicWeb(radius, nodes = 900, perEdge = 12, seed = 4) {
  // Illustration of the cosmic web: knots joined to their nearest neighbours by strands of galaxies.
  const r = rng(seed), knots = [];
  for (let i = 0; i < nodes; i++) { const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); if (v.length() > 1) { i--; continue; } knots.push(v.multiplyScalar(radius)); }
  const pos = [], col = [];
  for (const a of knots) {
    const near3 = knots.map(b => [b, a.distanceToSquared(b)]).filter(x => x[1] > 0).sort((x, y) => x[1] - y[1]).slice(0, 3);
    for (const [b] of near3) for (let j = 0; j < perEdge; j++) { const t = r(), p = a.clone().lerp(b, t), jit = radius * 0.012; pos.push(p.x + (r() - 0.5) * jit, p.y + (r() - 0.5) * jit, p.z + (r() - 0.5) * jit); const k = 0.45 + r() * 0.4; col.push(0.75 * k, 0.8 * k, k); }
    for (let j = 0; j < 6; j++) { const p = a.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(r() * radius * 0.015)); pos.push(p.x, p.y, p.z); col.push(1, 0.9, 0.75); }
  }
  return { pos, col };
}
export function createUniverse(opts) {
  const R = CMB_GLY * 10; // units of 100 million ly
  const s = createScene({ ...opts, near: UNIVERSE_NEAR, far: UNIVERSE_FAR, min: SCENE_RANGE.universe[0], max: UNIVERSE_FAR, home: [0, 0, 0], overviewD: 960, fitRadius: R, overviewDir: new THREE.Vector3(0.35, 0.6, 0.72) });
  s.scene.add(skyPoints(0)); // the shared sky (sky.js), galactic frame
  // Laniakea's galaxies, shrunk 100× from the level inside: a small bright knot at the centre.
  // The NGC/IC galaxies give way to the illustrated web as they crowd together on screen (lod.js density: N over
  // the area of the catalogue's disc on screen), so the catalogue is never drawn as one saturated blob.
  const g = ngcGalaxies(100); const ngcU = s.points(g.pos, ngcColours(g), NGC_STYLE.size, NGC_STYLE.opacity, 0xffffff, { outer: 'proxy', inner: 'size', alone: 'size' }); ngcU.userData.lodOpts = { N: g.count }; ngcU.userData.layer = 'ngc'; if (laniakeaNgc) ngcU.userData.proxyOf = laniakeaNgc; // the same catalogue and style: the seam pair
  const web = cosmicWeb(R * 0.98); s.points(web.pos, web.col, 1.2, 0.35);
  // The cosmic microwave background: the oldest light, from the edge of what we can see. Drawn as a shell of
  // points whose warm/cool speckle is an illustration of the tiny temperature ripples in the real maps.
  { const r = rng(9), n = 26000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), waves = Array.from({ length: 14 }, () => [new THREE.Vector3().randomDirection().multiplyScalar(2 + r() * 9), r() * 6.28]);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection(); let f = 0; for (const [k, ph] of waves) f += Math.sin(k.dot(v) + ph); f = Math.max(-1, Math.min(1, f / 3.5));
      pos.set([v.x * R, v.y * R, v.z * R], i * 3); const t = (f + 1) / 2; col.set([0.25 + 0.75 * t, 0.35 + 0.3 * t, 0.85 - 0.65 * t], i * 3); }
    s.points(pos, col, 1.4, 0.55); }
  s.mark({ name: 'Laniakea', kind: 'Our supercluster', here: true, rank: 0, pos: [0, 0, 0] }, { px: 12, color: 0xffe38a, label: 'Laniakea · you are here' });
  s.mark({ ...FAR_GALAXY, rank: 1, pos: skyPosition(FAR_GALAXY.ra, FAR_GALAXY.dec, FAR_GALAXY.gly * 1000, 100) }, { px: 9, color: 0xffb38a, label: 'MoM-z14 · most distant galaxy known' });
  s.mark({ name: 'Cosmic microwave background', kind: 'The oldest light', rank: 2, cmb: true, pos: [0, R, 0] }, { px: 6, color: 0xffc890, label: 'Cosmic microwave background' });
  for (const sh of SHELLS) s.ring(sh.gly * 10, sh.label, 0x46557a, 0.5);
  s.ring(R, '', 0xc98a52, 0.6);
  return s;
}
