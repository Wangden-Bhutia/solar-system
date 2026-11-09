// The Milky Way scene (1 unit = 1,000 light-years), drawn with the shared renderer like the star map.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { R0, ARMS, armRadius, discPosition, galaxyParticles, LANDMARKS } from './galaxy-data.js';
import { GALAXY_NEAR, GALAXY_FAR, SCENE_RANGE } from './zoom-ladder.js';
import { createPlacer, placeAll, forgetLabel } from './labels.js';
import { skyPoints, placeSky } from './sky.js';
import { createLod, seamWindow } from './lod.js';
import { hygPoints, globularPositions, haloPositions, sgrPositions, magellanicPositions, pointCloud } from './transition.js';
import { omega, ARMS_OMEGA, BAR_OMEGA, SUN_OMEGA, turn, sunPosition, tracerStars, TIME_RANGE, MYR_PER_SEC } from './galaxy-motion.js';

// Each particle carries its own angular speed (radians per Myr); the vertex shader turns it about the
// centre by omega × t, so the whole Galaxy moves on the GPU with one uniform. Same maths as turn().
const uT = { value: 0 };
function spinning(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'attribute float omega;\nuniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n{ float a = omega * uT; float c = cos(a), s = sin(a); transformed.xz = vec2(transformed.x * c - transformed.z * s, transformed.x * s + transformed.z * c); }');
  };
  return mat;
}

const glow = (() => {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext?.('2d'); if (!x) return null;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();

export function createGalaxy({ renderer, canvas, labelsEl, onPick, onTime }) {
  const scene = new THREE.Scene(), bg = new THREE.Color(0x000005); scene.background = bg; // same black at every scale
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1e5);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enabled = false; controls.enablePan = false;
  controls.enableZoom = false; controls.minDistance = SCENE_RANGE.galaxy[0]; controls.maxDistance = SCENE_RANGE.galaxy[1]; // zoom: zoom.js via lab.js (OrbitControls only rotates)
  // Distant background stars and other galaxies' faint glow are left out on purpose: this level is our Galaxy alone.
  const sky = skyPoints(0); scene.add(sky); // the shared sky (sky.js), galactic frame
  const { positions, colors, kinds } = galaxyParticles();
  const spin = new Float32Array(kinds.length);
  for (let i = 0; i < kinds.length; i++) spin[i] = kinds[i] === 0 ? BAR_OMEGA : kinds[i] === 2 ? ARMS_OMEGA : omega(Math.hypot(positions[i * 3], positions[i * 3 + 2]));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3)); g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); g.setAttribute('omega', new THREE.BufferAttribute(spin, 1));
  const cloud = new THREE.Points(g, spinning(new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })));
  cloud.frustumCulled = false; scene.add(cloud);
  let tracers = null;
  // Brighter stars at their true orbital speed: they stream through the arms (inner ones overtake, outer ones lag).
  { const tr = tracerStars(); const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tr.positions, 3)); tg.setAttribute('omega', new THREE.BufferAttribute(tr.omegas, 1));
    scene.add(tracers = new THREE.Points(tg, spinning(new THREE.PointsMaterial({ color: 0xfff1d6, size: 1.9, sizeAttenuation: false, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })))); scene.children.at(-1).frustumCulled = false; }
  // Central glow of the bulge.
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffd8a0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); core.scale.setScalar(26); scene.add(core);
  // The Sun's orbit around the centre, and a marker for the Sun.
  const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 181 }, (_, i) => { const a = i / 180 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R0, 0, Math.sin(a) * R0); })), new THREE.LineDashedMaterial({ color: 0xf3c887, dashSize: 1.2, gapSize: 1.2, transparent: true, opacity: 0.45 }));
  orbit.computeLineDistances(); scene.add(orbit);
  // Phase 3 transition layers (transition.js, docs/sources.md). The 7,696 naked-eye HYG stars within 1,000 ly,
  // drawn exactly as the star map draws them (a proxy pair across the seam), turning with the Sun.
  const hyg = hygPoints('gal', 1000); hyg.geometry.setAttribute('omega', new THREE.BufferAttribute(new Float32Array(hyg.geometry.attributes.position.count).fill(SUN_OMEGA), 1));
  spinning(hyg.material); hyg.frustumCulled = false; scene.add(hyg);
  // The 157 globular clusters of Harris 1996 (2010 edition), at their measured positions.
  const globulars = pointCloud(globularPositions(1), { color: 0xffe2b0, size: 2.4, opacity: 0.85, layer: 'globulars' }); scene.add(globulars);
  // Illustrations: the stellar halo (a random sample of its density law), the Sagittarius stream's plane, and the
  // Magellanic Clouds' glow at their measured places.
  const halo = pointCloud(haloPositions(), { color: 0x9fb0d8, size: 1.2, opacity: 0.22, layer: 'halo' }); scene.add(halo);
  const sgr = pointCloud(sgrPositions(), { color: 0xd8c0ff, size: 1.2, opacity: 0.26, layer: 'sgr-stream' }); scene.add(sgr);
  const magellanic = pointCloud(magellanicPositions(), { color: 0xd8e2ff, size: 1.3, opacity: 0.5, layer: 'magellanic' }); scene.add(magellanic);
  for (const o of [globulars, halo, sgr, magellanic]) o.frustumCulled = false;
  const marks = LANDMARKS.map(m => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: m.name === 'Sun' ? 0xffe38a : m.name === 'Sagittarius A*' ? 0xffb38a : 0xffffff, sizeAttenuation: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    sprite.position.fromArray(m.pos); scene.add(sprite); const home = m.pos, R = Math.hypot(m.pos[0], m.pos[2]);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl space galaxy' + (m.name === 'Sun' ? ' here' : ''); el.textContent = m.name === 'Sun' ? 'You are here' : m.name; el.tabIndex = -1; el.hidden = true;
    el.addEventListener('click', ev => { ev.stopPropagation(); onPick?.(m); }); labelsEl.appendChild(el);
    return { m, sprite, el, home, pos: sprite.position, px: 10, w: m.name === 'Sun' ? SUN_OMEGA : omega(R), always: m.name === 'Sun' || m.name === 'Sagittarius A*', here: m.name === 'Sun' };
  });
  const armLabels = ARMS.map(a => { const b = a.spur ? 22 : 60; const el = document.createElement('span'); el.className = 'lbl space galaxy arm-lbl'; el.textContent = a.name; el.hidden = true; labelsEl.appendChild(el); return { el, home: discPosition(armRadius(a, b), b), pos: new THREE.Vector3(...discPosition(armRadius(a, b), b)), px: 0 }; });
  const labelItems = [...marks, ...armLabels], placer = createPlacer(labelItems.length + 8);
  const tmp = new THREE.Vector3(); let last = 0, selected = null, on = false, hideHere = false, seamNow = null;
  // Per-object level of detail (lod.js). Going out to the Local Group the particle disc, the bulge glow and the
  // black hole cross-fade with the Local Group's picture of the Milky Way (a different model of the same thing);
  // other landmarks fade as they merge into the Sun on screen; the Sun's marker cross-fades with the star map's Sun.
  const sunMark = marks.find(x => x.here), lod = createLod();
  lod.add(sky, 'proxy');
  lod.add(cloud, { inner: 'model', outer: 'size', alone: 'size' }); lod.add(tracers, { inner: 'model', outer: 'size', alone: 'size' });
  lod.add(core, { inner: 'model', outer: 'fixed', alone: 'fixed' }, { L: 13 });
  lod.add(orbit, 'size');
  lod.add(hyg, { outer: 'proxy', inner: 'size', alone: 'size' });
  // The halo and its clusters and stream are the Galaxy's own model: they hand over to the Local Group's picture.
  for (const o of [globulars, halo, sgr]) lod.add(o, { inner: 'model', outer: 'size', alone: 'size' });
  lod.add(magellanic, { inner: 'model', outer: 'size', alone: 'size' });
  for (const x of marks) lod.add(x.sprite, x.here ? { inner: 'model', outer: 'model', alone: 'fixed' } : x.m.name === 'Sagittarius A*' ? { inner: 'model', outer: 'marker', alone: 'marker' } : 'marker');
  const fadeOf = it => it.sprite ? it.sprite.userData.fade ?? 1 : seamWindow(seamNow) * (orbit.userData.fade ?? 1);
  // The clock (Myr from today). Nebulae and young clusters live only a few million years, so away from
  // today only the Sun and the black hole keep their markers.
  const clock = { t: 0, playing: false, rewind: null };
  const present = () => Math.abs(clock.t) < 0.5;
  function place() {
    uT.value = clock.t;
    for (const x of marks) { if (x.m.name === 'Sun') x.sprite.position.fromArray(sunPosition(clock.t)); else x.sprite.position.fromArray(turn(x.home, x.w * clock.t)); x.sprite.visible = x.always || present(); }
    for (const a of armLabels) a.pos.fromArray(turn(a.home, ARMS_OMEGA * clock.t));
  }
  function tick(dt) {
    const before = clock.t;
    if (clock.rewind) { const r = clock.rewind; r.k = Math.min(1, r.k + dt / r.dur); clock.t = r.from * (1 - (1 - (1 - r.k) ** 3)); if (r.k >= 1) { clock.t = 0; clock.rewind = null; r.done?.(); } }
    else if (clock.playing) { clock.t = Math.min(TIME_RANGE[1], clock.t + MYR_PER_SEC * dt); if (clock.t >= TIME_RANGE[1]) clock.playing = false; }
    if (clock.t !== before) { place(); onTime?.(); }
  }
  // Camera glides along a fixed viewing direction, centred on a target (the Sun, then the whole Galaxy).
  const fly = { t: 1, dur: 1.6, from: { d: 1, tgt: new THREE.Vector3() }, to: { d: 1, tgt: new THREE.Vector3() }, dir: new THREE.Vector3(0.15, 0.85, 0.5).normalize(), done: null,
    // toDir (optional): also swing the viewing direction, so the camera eases into the overview tilt.
    start(fromD, fromT, toD, toT, dur, done, toDir) { this.from = { d: fromD, tgt: fromT.clone(), dir: this.dir.clone() }; this.to = { d: toD, tgt: toT.clone(), dir: (toDir || this.dir).clone().normalize() }; this.t = 0; this.dur = reduce() ? 0.01 : dur; this.done = done; },
    step(dt) { if (this.t >= 1) return; this.t = Math.min(1, this.t + dt / this.dur); const k = 1 - (1 - this.t) ** 3;
      const d = this.from.d * (this.to.d / this.from.d) ** k; controls.target.lerpVectors(this.from.tgt, this.to.tgt, k); this.dir.lerpVectors(this.from.dir, this.to.dir, k).normalize(); camera.position.copy(controls.target).addScaledVector(this.dir, d);
      if (this.t >= 1) { const f = this.done; this.done = null; f?.(); } } };
  const reduce = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const portrait = () => { const r = canvas.getBoundingClientRect(); return r.height > r.width; };
  const SUN = new THREE.Vector3(-R0, 0, 0), CENTRE = new THREE.Vector3();
  // Zooming in re-centres gently on SUN as the camera nears this scale's inner edge, so the hand-over to the
  // scale inside needs no automatic flight: it is just the zoom you are already doing.
  const driftStep = new THREE.Vector3();
  function drift(dt) {
    if (fly.t < 1 || !controls.enabled) return;
    const d = camera.position.distanceTo(controls.target), f = Math.min(1, Math.max(0, (GALAXY_NEAR * 20 - d) / (GALAXY_NEAR * 19))); // from 60 kly in, complete at the seam
    if (f <= 0 || controls.target.distanceTo(SUN) < 1e-9) return;
    driftStep.copy(SUN).sub(controls.target).multiplyScalar(Math.min(1, f * dt * 3.5)); controls.target.add(driftStep); camera.position.add(driftStep);
  }
  // Allocation-free label placement (labels.js).
  const project = (it, out) => { tmp.copy(it.pos).project(camera); out.x = tmp.x; out.y = tmp.y; out.z = tmp.z; return true; };
  const labelOpts = { enabled: true, visible: it => (!it.sprite || it.sprite.visible) && !(hideHere && it.here) && fadeOf(it) > 0.02, opacity: it => fadeOf(it) };
  function placeLabels(bounds) { labelOpts.enabled = on && labelsLive; placeAll(labelItems, labelItems.length, placer, bounds, project, labelOpts); }
  let labelsLive = true;
  // seam: null, or { role, t } inside a seam: every object fades by its own rule (lod.js).
  function render(width, height, visible, { overlay = false, seam = null } = {}) {
    scene.background = overlay ? null : bg; seamNow = seam;
    const now = performance.now(), dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    renderer.setSize(width, height, false);
    const vw = Math.min(width, visible?.width ?? width), vh = Math.min(height, visible?.height ?? height), fullW = 2 * width - vw, fullH = 2 * height - vh;
    camera.aspect = fullW / fullH; camera.zoom = vh / fullH;
    if (vw === width && vh === height) camera.clearViewOffset(); else camera.setViewOffset(fullW, fullH, width - vw, height - vh, width, height);
    camera.updateProjectionMatrix(); fly.step(dt); tick(dt); drift(dt); controls.update();
    const k = 2 * Math.tan(camera.fov * Math.PI / 360) * 2 / vh; // ~ pixels → non-attenuated sprite scale
    for (const x of marks) x.sprite.scale.setScalar((x.m.name === 'Sun' ? 14 : x.m.name === 'Sagittarius A*' ? 12 : 9) * k * (x.m === selected ? 1.7 : 1));
    placeSky(sky, camera); lod.update(camera.position, sunMark.sprite.position, vh, camera.fov, seam);
    // Sun-sized glow scales with distance from the camera so the bulge reads as a glow, not a disc.
    placeLabels(canvas.getBoundingClientRect());
    const clear = renderer.autoClear; renderer.autoClear = !overlay; renderer.render(scene, camera); renderer.autoClear = clear;
  }
  function pick(cx, cy) {
    const b = canvas.getBoundingClientRect(); let best = null, bestD = 44;
    for (const x of marks) { if (!x.sprite.visible) continue; tmp.copy(x.sprite.position).project(camera); if (tmp.z >= 1) continue; const px = b.left + (tmp.x + 1) / 2 * b.width, py = b.top + (1 - tmp.y) / 2 * b.height, d = Math.hypot(px - cx, py - cy); if (d < bestD) { bestD = d; best = x.m; } }
    return best;
  }
  function setLabels(v) { for (const x of labelItems) { forgetLabel(x); x.el.hidden = !v; } }
  // Look at the Sun from direction dir at distance d (kly): the Galaxy bridge hands over at exactly
  // the star map's view, ÷ 1,000. The Sun stays the centre of rotation, so “You are here” never drifts.
  function setView(dir, d, tgt = SUN) { fly.t = 1; fly.done = null; fly.dir.copy(dir).normalize(); controls.target.copy(tgt); camera.position.copy(controls.target).addScaledVector(fly.dir, d); controls.update(); }
  const viewDir = () => camera.position.clone().sub(controls.target).normalize();
  // The zoom controller's hook: same direction and centre, new distance (kly). No allocation.
  const off = new THREE.Vector3();
  function setDistance(d) { fly.t = 1; fly.done = null; off.copy(camera.position).sub(controls.target); const l = off.length() || 1; camera.position.copy(controls.target).addScaledVector(off, d / l); }
  const distance = () => camera.position.distanceTo(controls.target);
  function enter(at) { on = true; controls.enabled = true; setLabels(true); if (at) setView(at.dir, at.d, at.tgt ? new THREE.Vector3(...at.tgt) : SUN); else fly.start(0.05, SUN, portrait() ? 215 : 125, SUN, 2.6); }
  function leave() { on = false; controls.enabled = false; setLabels(false); setTime(0, false); }
  // Time controls. Leaving the Galaxy always returns to today, so the zoom back into the nearby stars
  // (which are mapped as they are now) meets at the same Sun.
  function setTime(t, pull = true) { if (pull) overview(); clock.rewind = null; clock.t = Math.max(TIME_RANGE[0], Math.min(TIME_RANGE[1], t)); clock.playing = false; place(); onTime?.(); }
  // Motion only reads with the whole disc in view: running the clock from close in first pulls back to the overview.
  // It centres on the galactic centre, seen from above at a slight tilt, so the whole disc turns in view.
  const TILT = new THREE.Vector3(0.12, 0.93, 0.35).normalize();
  function overview() { if (fly.t < 1 || controls.target.distanceTo(CENTRE) < 0.01) return; fly.dir.copy(viewDir()); fly.start(camera.position.distanceTo(controls.target), controls.target, portrait() ? 240 : 125, CENTRE, 1.6, null, TILT); }
  const atSun = () => controls.target.distanceTo(SUN) < GALAXY_NEAR * 1e-3 && fly.t >= 1;
  function play() { overview(); clock.rewind = null; if (clock.t >= TIME_RANGE[1]) clock.t = 0; clock.playing = true; place(); onTime?.(); }
  function pause() { clock.playing = false; onTime?.(); }
  function rewind(done) { clock.playing = false; if (clock.t === 0 || reduce()) { setTime(0, false); done?.(); return; } clock.rewind = { from: clock.t, k: 0, dur: Math.min(1.4, 0.5 + Math.abs(clock.t) / 250), done }; onTime?.(); }
  // Out to the edge of this scale, keeping the same centre, where the Local Group takes over.
  function zoomOut(done) { fly.dir.copy(viewDir()); fly.start(camera.position.distanceTo(controls.target) || 140, controls.target, GALAXY_FAR, controls.target, 1.1, done); }
  const target = () => controls.target.toArray();
  // Move the centre of view a fraction k of the way to the Sun, the camera keeping its offset (lab.js uses it while it
  // plays the zoom inwards, so the view is centred on the Sun exactly when it reaches the seam to the star map).
  function towardSun(k) { driftStep.copy(SUN).sub(controls.target).multiplyScalar(k); controls.target.add(driftStep); camera.position.add(driftStep); }
  function zoomToSun(done) { fly.dir.copy(viewDir()); fly.start(camera.position.distanceTo(controls.target) || 140, controls.target, GALAXY_NEAR, SUN, 1.1, done); }
  const zoomState = () => ({ d: camera.position.distanceTo(controls.target), min: controls.minDistance, max: controls.maxDistance, busy: fly.t < 1 || !!clock.rewind });
  // The "you are here" anchor at this scale: the Sun's marker, placed as its own label would be.
  function anchor(out, bounds) {
    tmp.copy(sunMark.sprite.position).project(camera); if (tmp.z >= 1) return false;
    out.x = bounds.left + (tmp.x + 1) / 2 * bounds.width; out.y = bounds.top + (1 - tmp.y) / 2 * bounds.height; out.off = sunMark.px / 2 + 4; out.text = sunMark.el.textContent; return true;
  }
  function setUp(v) { if (v) camera.up.set(v.x, v.y, v.z); else camera.up.set(0, 1, 0); camera.lookAt(controls.target); }
  return { camera, render, anchor, setUp, hideHere(v) { hideHere = v; if (v) for (const it of labelItems) if (it.here) { it.el.hidden = true; forgetLabel(it); } }, pick, enter, leave, zoomToSun, towardSun, zoomOut, target, zoomState, atSun, setTime, play, pause, rewind, time: () => clock.t, playing: () => clock.playing, setView, viewDir, showLabels: v => { on = v; setLabels(v); }, liveLabels(v) { labelsLive = v; }, setDistance, distance, select(m) { selected = m; }, marks, camera, controls, scene, cloud, fly, landmarks: LANDMARKS };
}
