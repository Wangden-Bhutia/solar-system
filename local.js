// The Local Group scene (1 unit = 10,000 light-years), drawn with the shared renderer like the Galaxy.
// The Milky Way here is the same particle model as the Galaxy scene, shrunk by 10, so the zoom between
// the two scales is to scale: the camera distance here is exactly the Galaxy's ÷ 10.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { galaxyParticles, R0 } from './galaxy-data.js';
import { GALAXIES, LOCAL_UNIT, discAxes, spiralParticles } from './local-data.js';
import { LOCAL_NEAR, LOCAL_FAR, SCENE_RANGE } from './zoom-ladder.js';
import { createPlacer, placeAll, forgetLabel } from './labels.js';
import { skyPoints, placeSky } from './sky.js';
import { createLod, seamWindow } from './lod.js';
import { sheetPositions, voidCentre, giants, pointCloud, wireShell, LOCAL_VOID } from './transition.js';
import { CLUSTERS, skyPosition } from './cosmos-data.js';

const glow = (() => {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext?.('2d'); if (!x) return null;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
const MW = { name: 'Milky Way', short: 'Milky Way', kind: 'Spiral galaxy', type: 'SBbc', mly: 0, pos: [0, 0, 0], rank: 0, here: true, stars: '100–400 billion',
  fact: 'Our own galaxy, the second biggest in the Local Group. Every star you can see in the night sky is part of it.' };

export function createLocal({ renderer, canvas, labelsEl, onPick }) {
  const scene = new THREE.Scene(), bg = new THREE.Color(0x000005); scene.background = bg;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 1e5);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enabled = false; controls.enablePan = false;
  controls.enableZoom = false; controls.minDistance = SCENE_RANGE.local[0]; controls.maxDistance = SCENE_RANGE.local[1]; // zoom: zoom.js via lab.js
  const points = (pos, col, size, opacity) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: !!col, color: col ? 0xffffff : 0x8a93a8, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); p.frustumCulled = false; scene.add(p); return p; };
  // Far background galaxies' glow is left out: this level is the Local Group alone. A faint star field for depth.
  const sky = skyPoints(0); scene.add(sky); // the shared sky (sky.js), galactic frame
  // The Milky Way: the Galaxy scene's own particles, shrunk 10×.
  let mwCloud; { const { positions, colors } = galaxyParticles({ bulge: 1800, disc: 2600, arm: 4200, seed: 11 }); mwCloud = points(Array.from(positions, v => v / LOCAL_UNIT), Array.from(colors), 1.3, 0.55); }
  // Spirals and clouds, each in its real place and orientation.
  const placeDisc = (g, n, seed, opts) => {
    const { positions, colors } = spiralParticles(g.size / 2 / LOCAL_UNIT, n, seed, opts), { major, normal } = discAxes(g);
    const M = new THREE.Vector3(...major), N = new THREE.Vector3(...normal), Y = new THREE.Vector3().crossVectors(N, M).normalize(), out = [];
    for (let i = 0; i < positions.length; i += 3) { const v = M.clone().multiplyScalar(positions[i]).addScaledVector(Y, positions[i + 1]).addScaledVector(N, positions[i + 2]).add(new THREE.Vector3(...g.pos)); out.push(v.x, v.y, v.z); }
    points(out, colors, 1.3, 0.6);
  };
  const blob = (g, n, seed) => { let x = seed; const r = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296), s = g.size / 2 / LOCAL_UNIT, out = [], col = [];
    for (let i = 0; i < n; i++) { const u = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * 0.45, v = new THREE.Vector3().randomDirection().multiplyScalar(u * s); v.y *= 0.55; out.push(v.x + g.pos[0], v.y + g.pos[1], v.z + g.pos[2]); const k = 0.55 + r() * 0.4; col.push(0.8 * k, 0.86 * k, k); }
    const p = points(out, col, 1.3, 0.6); if (g.short === 'LMC' || g.short === 'SMC') p.userData.magellanic = true; };
  for (const g of GALAXIES) { if (g.i != null) placeDisc(g, g.short === 'Andromeda' ? 9000 : 3200, g.short === 'Andromeda' ? 31 : 33); else if (g.blob) blob(g, g.short === 'LMC' ? 1500 : 800, g.short === 'LMC' ? 5 : 9); }
  // Phase 3 transition layers (transition.js, docs/sources.md), in this scene's units (10 kly). Leaving the Local
  // Group: the Local Sheet (an illustration of its measured size, in the supergalactic plane), the Local Void
  // (an illustrative shell: centre direction from SIMBAD, at least 75 Mly away), the nearby giant galaxies of
  // the "Council of Giants" (McCall 2014) at their measured places, and the Virgo Cluster's direction.
  const M = 1000 / LOCAL_UNIT; // scene units per Mly
  const sheet = pointCloud(sheetPositions().map(v => v * M), { color: 0x9fb4e0, size: 1.2, opacity: 0.3, layer: 'local-sheet' }); sheet.frustumCulled = false; scene.add(sheet);
  const voidShell = wireShell({ color: 0x5b6b8f, opacity: 0.22, layer: 'local-void' }); voidShell.position.fromArray(voidCentre().map(v => v * M)); voidShell.scale.setScalar(LOCAL_VOID.radiusMly * M); scene.add(voidShell);
  const far = [...giants().map(g => ({ pos: g.pos.map(v => v * M), px: 7, color: 0xdfe8ff, op: 0.8 })),
    ...CLUSTERS.filter(c => c.name === 'Virgo Cluster').map(c => ({ pos: skyPosition(c.ra, c.dec, c.mly, LOCAL_UNIT / 1000), px: 34, color: 0xffe6c0, op: 0.55 }))]
    .map(f => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: f.color, sizeAttenuation: false, depthWrite: false, transparent: true, opacity: f.op, blending: THREE.AdditiveBlending })); sp.position.fromArray(f.pos); sp.userData.px = f.px; sp.userData.far = true; scene.add(sp); return sp; });
  // Distance rings in the Milky Way's plane: 1, 2 and 3 million light-years from its centre.
  const ringLabels = [1, 2, 3].map(m => {
    const r = m * 1000 / LOCAL_UNIT, pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x33415c, transparent: true, opacity: 0.45 })); scene.add(ring);
    const el = document.createElement('span'); el.className = 'lbl space ring-lbl'; el.textContent = `${m} million ly`; el.hidden = true; labelsEl.appendChild(el); return { el, pos: new THREE.Vector3(r, 0, 0), px: 0, ring };
  });
  // Every galaxy gets a marker (dwarfs are only a glow at this scale) and a name.
  const all = [MW, ...GALAXIES];
  const marks = all.map(g => {
    const big = g.here || g.i != null || g.blob, sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: g.here ? 0xffe38a : big ? 0xdfe8ff : 0xb9c4dc, sizeAttenuation: false, depthWrite: false, transparent: true, opacity: g.rank === 1 ? 0.75 : g.rank === 2 ? 0.55 : big ? 0.35 : 0.9, blending: THREE.AdditiveBlending }));
    sprite.position.fromArray(g.pos); sprite.userData.px = g.rank === 1 ? 16 : big ? 10 : 5; scene.add(sprite);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl space galaxy' + (g.here ? ' here' : ''); el.textContent = g.here ? 'Milky Way · you are here' : g.short || g.name; el.tabIndex = -1; el.hidden = true;
    el.addEventListener('click', ev => { ev.stopPropagation(); onPick?.(g); }); labelsEl.appendChild(el);
    return { g, sprite, el, pos: sprite.position, px: sprite.userData.px, here: !!g.here };
  });
  const ordered = [...marks].sort((a, b) => a.g.rank - b.g.rank), labelItems = [...ordered, ...ringLabels], placer = createPlacer(labelItems.length + 8);
  const tmp = new THREE.Vector3(); let last = 0, selected = null, on = false, hideHere = false, seamNow = null;
  // Per-object level of detail (lod.js): the Milky Way's particles and marker cross-fade with the Galaxy scene's
  // model of it; other galaxies fade as they shrink (discs, clouds) or merge into the Milky Way on screen (markers).
  const lod = createLod(), mwMark = marks[0], ORIGIN = new THREE.Vector3();
  lod.add(sky, 'proxy');
  // Leaving structures appear only once the camera is out past them (appear: camera distance from the Milky Way).
  const OUT = { appear: [400, 1500] };
  scene.traverse(o => { if (!o.material || o === sky || o.isSprite) return;
    lod.add(o, o === mwCloud ? { outer: 'model', inner: 'size', alone: 'size' } : o.userData.magellanic ? { outer: 'model', inner: 'size', alone: 'size' } : 'size', o === sheet || o === voidShell ? OUT : undefined); });
  for (const sp of far) lod.add(sp, 'marker', OUT);
  // Going out, every marker swaps with Laniakea's identical copy of it (cosmos.js) at mid-seam.
  for (const x of marks) lod.add(x.sprite, x.here ? { outer: 'model', inner: 'proxy', alone: 'fixed' } : { inner: 'proxy', outer: 'marker', alone: 'marker' });
  const fadeOf = it => it.sprite ? it.sprite.userData.fade ?? 1 : it.ring ? it.ring.userData.fade ?? 1 : seamWindow(seamNow);
  const reduce = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const portrait = () => { const r = canvas.getBoundingClientRect(); return r.height > r.width; };
  const SUN = new THREE.Vector3(-R0 / LOCAL_UNIT, 0, 0), M31 = new THREE.Vector3(...GALAXIES[0].pos);
  // Camera glides: distance, target and viewing direction, eased together.
  const fly = { t: 1, from: null, to: null, dir: new THREE.Vector3(0.2, 0.8, 0.55).normalize(), done: null,
    start(toD, toT, dur, done, toDir) { this.from = { d: camera.position.distanceTo(controls.target) || LOCAL_NEAR, tgt: controls.target.clone(), dir: viewDir() }; this.to = { d: toD, tgt: toT.clone(), dir: (toDir || this.from.dir).clone().normalize() }; this.t = 0; this.dur = reduce() ? 0.01 : dur; this.done = done; },
    step(dt) { if (this.t >= 1) return; this.t = Math.min(1, this.t + dt / this.dur); const k = 1 - (1 - this.t) ** 3, d = this.from.d * (this.to.d / this.from.d) ** k;
      controls.target.lerpVectors(this.from.tgt, this.to.tgt, k); this.dir.lerpVectors(this.from.dir, this.to.dir, k).normalize(); camera.position.copy(controls.target).addScaledVector(this.dir, d);
      if (this.t >= 1) { const f = this.done; this.done = null; f?.(); } } };
  const viewDir = () => { const v = camera.position.clone().sub(controls.target); return v.lengthSq() ? v.normalize() : fly.dir.clone(); };
  // The zoom controller's hook: same direction and centre, new distance (units of 10 kly). No allocation.
  const off = new THREE.Vector3();
  function setDistance(d) { fly.t = 1; fly.done = null; off.copy(camera.position).sub(controls.target); const l = off.length(); if (l) camera.position.copy(controls.target).addScaledVector(off, d / l); else camera.position.copy(controls.target).addScaledVector(fly.dir, d); }
  const distance = () => camera.position.distanceTo(controls.target);
  // Zooming in re-centres gently on SUN as the camera nears this scale's inner edge, so the hand-over to the
  // scale inside needs no automatic flight: it is just the zoom you are already doing.
  const driftStep = new THREE.Vector3();
  function drift(dt) {
    if (fly.t < 1 || !controls.enabled) return;
    const d = camera.position.distanceTo(controls.target), f = Math.min(1, Math.max(0, (LOCAL_NEAR * 5 - d) / (LOCAL_NEAR * 4))); // complete at the seam
    if (f <= 0 || controls.target.distanceTo(SUN) < 1e-9) return;
    driftStep.copy(SUN).sub(controls.target).multiplyScalar(Math.min(1, f * dt * 3.5)); controls.target.add(driftStep); camera.position.add(driftStep);
  }
  // Allocation-free label placement (labels.js).
  const project = (it, out) => { tmp.copy(it.pos).project(camera); out.x = tmp.x; out.y = tmp.y; out.z = tmp.z; return true; };
  const labelOpts = { enabled: true, visible: it => !(hideHere && it.here) && fadeOf(it) > 0.02, opacity: it => fadeOf(it) };
  let labelsLive = true;
  function placeLabels(bounds) { labelOpts.enabled = on && labelsLive; placeAll(labelItems, labelItems.length, placer, bounds, project, labelOpts); }
  // seam: null, or { role, t } inside a seam: every object fades by its own rule (lod.js).
  function render(width, height, visible, { overlay = false, seam = null } = {}) {
    scene.background = overlay ? null : bg; seamNow = seam;
    const now = performance.now(), dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    renderer.setSize(width, height, false);
    const vw = Math.min(width, visible?.width ?? width), vh = Math.min(height, visible?.height ?? height), fullW = 2 * width - vw, fullH = 2 * height - vh;
    camera.aspect = fullW / fullH; camera.zoom = vh / fullH;
    if (vw === width && vh === height) camera.clearViewOffset(); else camera.setViewOffset(fullW, fullH, width - vw, height - vh, width, height);
    camera.updateProjectionMatrix(); fly.step(dt); drift(dt); controls.update();
    const k = 2 * Math.tan(camera.fov * Math.PI / 360) * 2 / vh;
    for (const sp of far) sp.scale.setScalar(sp.userData.px * k);
    for (const x of marks) x.sprite.scale.setScalar(x.sprite.userData.px * (x.g.i != null || x.g.blob || x.g.here ? 1.6 : 1) * k * (x.g === selected ? 1.7 : 1));
    camera.far = Math.max(1e5, camera.position.length() * 4); camera.updateProjectionMatrix();
    placeSky(sky, camera); lod.update(camera.position, ORIGIN, vh, camera.fov, seam);
    placeLabels(canvas.getBoundingClientRect());
    const clear = renderer.autoClear; renderer.autoClear = !overlay; renderer.render(scene, camera); renderer.autoClear = clear;
  }
  function pick(cx, cy) {
    const b = canvas.getBoundingClientRect(); let best = null, bestD = 44;
    for (const x of marks) { tmp.copy(x.sprite.position).project(camera); if (tmp.z >= 1) continue; const px = b.left + (tmp.x + 1) / 2 * b.width, py = b.top + (1 - tmp.y) / 2 * b.height, d = Math.hypot(px - cx, py - cy) - (x.g.rank <= 2 ? 10 : 0); if (d < bestD) { bestD = d; best = x.g; } }
    return best;
  }
  function setLabels(v) { on = v; for (const x of labelItems) { forgetLabel(x); x.el.hidden = !v; } }
  // Look from direction dir at distance d (units) at target tgt (units): the bridge from the Galaxy hands over
  // exactly here, with the Galaxy's own target ÷ 10.
  function setView(dir, d, tgt = SUN) { fly.t = 1; fly.done = null; fly.dir.copy(dir).normalize(); controls.target.copy(tgt); camera.position.copy(controls.target).addScaledVector(fly.dir, d); controls.update(); }
  function enter(at) { setLabels(true); controls.enabled = true; if (at) setView(at.dir, at.d, at.tgt ? new THREE.Vector3(...at.tgt) : SUN); }
  function leave() { setLabels(false); controls.enabled = false; }
  // Pull back to frame the whole group, centred between the Milky Way and Andromeda.
  function towardSun(k) { driftStep.copy(SUN).sub(controls.target).multiplyScalar(k); controls.target.add(driftStep); camera.position.add(driftStep); }
  const overviewDistance = () => portrait() ? 760 : 470;
  function overview(done) { fly.start(overviewDistance(), new THREE.Vector3().lerpVectors(new THREE.Vector3(), M31, 0.45), 2.2, done, new THREE.Vector3(0.25, 0.75, 0.6)); }
  // Back towards the Milky Way, ending where the bridge to the Galaxy begins (Sun-centred, closest view).
  function zoomBackIn(done) { fly.start(LOCAL_NEAR, SUN, 1.4, done); }
  // Out to the edge of this scale, keeping the centre of view, where Laniakea takes over.
  function zoomOut(done) { fly.start(LOCAL_FAR, controls.target, 1.2, done); }
  const zoomState = () => ({ d: camera.position.distanceTo(controls.target), min: controls.minDistance, max: controls.maxDistance, busy: fly.t < 1, atSun: controls.target.distanceTo(SUN) < LOCAL_NEAR * 0.01 });
  // The "you are here" anchor at this scale: the Milky Way's marker, placed as its own label would be.
  function anchor(out, bounds) {
    tmp.copy(mwMark.sprite.position).project(camera); if (tmp.z >= 1) return false;
    out.x = bounds.left + (tmp.x + 1) / 2 * bounds.width; out.y = bounds.top + (1 - tmp.y) / 2 * bounds.height; out.off = mwMark.px / 2 + 4; out.text = mwMark.el.textContent; return true;
  }
  return { camera, render, anchor, hideHere(v) { hideHere = v; if (v) for (const it of labelItems) if (it.here) { it.el.hidden = true; forgetLabel(it); } }, pick, enter, leave, setView, viewDir, overview, overviewDistance, towardSun, zoomBackIn, zoomOut, zoomState, showLabels: setLabels, liveLabels(v) { labelsLive = v; }, setDistance, distance, select(g) { selected = g; }, galaxies: all, camera, controls, scene, fly };
}
