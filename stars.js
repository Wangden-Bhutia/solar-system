// The stellar neighbourhood (light-years) and other planetary systems (AU), drawn with the shared
// WebGL renderer as a separate scene, like the labs. The Solar System scene is not touched; lab.js
// switches between them through hooks.renderOverride, with a zoom-and-fade hand-off.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { NEIGHBOURS, SUN_ENTRY, starPixels, starColor, systemSummary, neighbourEntry } from './stars-data.js';
import { pairOf, pairState, compareOrbits, apastron } from './star-pairs.js';
import { starKind } from './stars-data.js';
import { VISITORS, withMotion, positionAt, nearestAt, STAR_TIME, YEARS_PER_SEC } from './star-motion.js';
import { STAR_NEAR, STAR_FAR, SCENE_RANGE } from './zoom-ladder.js';
import { createPlacer, placeAll, forgetLabel } from './labels.js';
import { skyPoints, placeSky, glowTex, glowScale } from './sky.js';
import { createLod, seamWindow } from './lod.js';

// glowTex: the shared glow (sky.js), so the Sun here and the Solar System's far-away Sun are drawn identically.

export function createStars({ renderer, canvas, labelsEl, onPick, onTime, onPair }) {
  const scene = new THREE.Scene(), bg = new THREE.Color(0x000005); scene.background = bg; // same black as the Solar System, so the zoom has no colour seam
  const camera = new THREE.PerspectiveCamera(50, 1, 0.001, 1e5);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enabled = false;
  // Zoom belongs to the one zoom controller (zoom.js via lab.js): OrbitControls only rotates. Its limits are this
  // scene's whole range, seams included, so it never clamps a distance the zoom has set.
  controls.enableZoom = false; controls.minDistance = SCENE_RANGE.stars[0]; controls.maxDistance = SCENE_RANGE.stars[1]; controls.enablePan = false;
  // Faint background stars far beyond the neighbourhood.
  const sky = skyPoints(0, { frame: 'ecl' }); scene.add(sky); // the shared sky (sky.js), in this scene's ecliptic frame
  // Distance rings in the plane of the Solar System: 5, 10 and 15 light-years from the Sun.
  const rings = new THREE.Group(); scene.add(rings);
  for (const r of [5, 10, 15]) {
    const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x33415c, transparent: true, opacity: 0.5 })));
  }
  const ringLabels = [5, 10, 15].map(r => { const el = document.createElement('span'); el.className = 'lbl space ring-lbl'; el.textContent = `${r} ly`; el.hidden = true; labelsEl.appendChild(el); return { el, r, pos: new THREE.Vector3(r, 0, 0), px: 0, ring: rings.children[[5, 10, 15].indexOf(r)] }; });
  // Every star carries its measured motion (star-motion.js); three famous passing stars join the map.
  const entries = [SUN_ENTRY, ...NEIGHBOURS, ...VISITORS.map(neighbourEntry)].map(withMotion), dots = [];
  for (const e of entries) {
    const color = new THREE.Color(...starColor(e.temp));
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, sizeAttenuation: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    const px = starPixels(e); sprite.userData.px = px; sprite.position.fromArray(e.pos); scene.add(sprite);
    // A thin line down to the Solar System's plane shows how far above or below it each star lies.
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...e.pos), new THREE.Vector3(e.pos[0], 0, e.pos[2])]), new THREE.LineBasicMaterial({ color: 0x3a4a66, transparent: true, opacity: 0.22 }));
    if (!e.sun) scene.add(stem);
    // Its path from today's position to where it is at the clock's time.
    const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...e.pos), new THREE.Vector3(...e.pos)]), new THREE.LineBasicMaterial({ color: new THREE.Color(...starColor(e.temp)), transparent: true, opacity: 0.28 }));
    trail.visible = false; trail.frustumCulled = false; stem.frustumCulled = false; if (!e.sun) scene.add(trail);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl space'; el.textContent = e.name; el.tabIndex = -1; el.hidden = true;
    el.addEventListener('click', ev => { ev.stopPropagation(); onPick?.(e); }); labelsEl.appendChild(el);
    dots.push({ e, sprite, stem, trail, el, pos: sprite.position, px: sprite.userData.px, mk: null, here: !!e.sun });
  }
  // Label priority: the Sun, systems with planets, the famous and the bright, then the rest.
  const FAMOUS = ['Alpha Centauri', 'Sirius', "Barnard's Star", 'Epsilon Eridani', 'Tau Ceti', 'Procyon', '61 Cygni', 'Luhman 16', 'TRAPPIST-1', 'Wolf 359'];
  const rank = d => d.e.sun ? 0 : d === nearDot ? 0.5 : FAMOUS.includes(d.e.name) ? 1 + FAMOUS.indexOf(d.e.name) : d.e.planets ? 20 : 40 - Math.min(19, starPixels(d.e));
  let nearDot = null; const byRank = () => [...dots].sort((a, b) => rank(a) - rank(b)); let ordered = byRank();
  // The label list (stars in priority order, then the ring distances), rebuilt only when the order changes.
  let starItems = []; const relist = () => { starItems = [...ordered, ...ringLabels]; }; relist();
  const placer = createPlacer(dots.length + 64), labelOpts = { enabled: true, visible: it => (!it.sprite || it.sprite.visible) && !(hideHere && it.here) && fadeOf(it) > 0.02, opacity: it => fadeOf(it) };
  // A label is as visible as the thing it names (lod.js); ring labels follow their ring.
  const fadeOf = it => it.sprite ? it.sprite.userData.fade ?? 1 : it.ring ? it.ring.userData.fade ?? 1 : seamWindow(seamNow);
  let hideHere = false, seamNow = null;
  // A line from the Sun to whichever star is nearest at the clock's time: the thing that changes.
  const nearLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xf3c887, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.75 }));
  nearLine.frustumCulled = false; scene.add(nearLine);
  // Per-object level of detail (lod.js): stars fade as they merge into the Sun on screen, rings and lines as they
  // shrink; the sky is drawn once across a seam; the Sun is the same glow as the Solar System's far-away Sun
  // (swapped at mid-seam) and cross-fades with the Milky Way map's "You are here" marker.
  const ORIGIN = new THREE.Vector3(), lod = createLod();
  lod.add(sky, 'proxy');
  for (const ring of rings.children) lod.add(ring, 'size');
  for (const d of dots) {
    if (d.e.sun) { lod.add(d.sprite, { outer: 'proxy', inner: 'model', alone: 'fixed' }); continue; }
    lod.add(d.sprite, 'marker'); lod.add(d.stem, 'marker', { at: d.sprite.position }); lod.add(d.trail, 'marker', { at: d.sprite.position });
  }
  lod.add(nearLine, 'fixed');

  // ---- Planetary system view (AU) ----
  const sys = new THREE.Scene(); sys.background = new THREE.Color(0x02030a);
  const sysCam = new THREE.PerspectiveCamera(45, 1, 1e-4, 1e4), sysControls = new OrbitControls(sysCam, canvas);
  sysControls.enableDamping = true; sysControls.enabled = false; sysControls.enablePan = false;
  const sysGroup = new THREE.Group(); sys.add(sysGroup); sys.add(new THREE.AmbientLight(0x404660, 0.35));
  const sysLight = new THREE.PointLight(0xffffff, 3, 0, 0); sys.add(sysLight);
  let current = null, sysT = 0;
  function circle(r, color, opacity, dashed) {
    const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const line = dashed ? new THREE.Line(g, new THREE.LineDashedMaterial({ color, dashSize: r * 0.06, gapSize: r * 0.05, transparent: true, opacity })) : new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
    if (dashed) line.computeLineDistances(); return line;
  }
  // Builds the view for one system. Orbits are to scale with each other (in AU); planets are drawn
  // far larger than true scale so they can be seen. Mercury's and Earth's orbits are drawn for comparison.
  function showSystem(entry) {
    sysGroup.clear(); current = entry; const ps = entry.planets; if (!ps) return null;
    const summary = systemSummary(entry), aMax = summary.aMax, scale = 10 / aMax; // the outermost orbit is 10 units
    const temp = entry.temp, color = new THREE.Color(...starColor(temp));
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 20), new THREE.MeshBasicMaterial({ color })); sysGroup.add(star);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); halo.scale.setScalar(2.2); sysGroup.add(halo);
    const hz = summary.hz;
    if (hz) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(hz[0] * scale, hz[1] * scale, 128), new THREE.MeshBasicMaterial({ color: 0x3fae6a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; sysGroup.add(ring);
    }
    const compare = summary.compare.map(c => { sysGroup.add(circle(c.au * scale, 0x9aa7c2, 0.55, true)); return { label: c.label, r: c.au * scale }; });
    const planets = summary.planets.map(p0 => {
      const { name, mass, a, period, r, measured, inHZ } = p0;
      const pivot = new THREE.Object3D(); sysGroup.add(pivot); sysGroup.add(circle(a * scale, 0x52637f, 0.6));
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.09, 0.07 * Math.sqrt(r) * 2.2), 24, 16), new THREE.MeshStandardMaterial({ color: inHZ ? 0x6fb7d8 : r > 6 ? 0xd8b48a : r > 2 ? 0x9cc3d8 : 0xb8a898, roughness: 0.9 }));
      mesh.position.x = a * scale; pivot.add(mesh); pivot.rotation.y = Math.random() * Math.PI * 2;
      return { name, mass, a, period, r, measured, inHZ, pivot, mesh };
    });
    sysCam.position.set(0, 9, 14); sysControls.target.set(0, 0, 0); sysControls.minDistance = 2; sysControls.maxDistance = 120; sysControls.update();
    return { planets, hz, compare, aMax };
  }

  // ---- Rendering ----
  let mode = 'stars', last = 0;
  const tmp = new THREE.Vector3();
  // ---- The clock (years from today): stars drift along their measured motions ----
  // Far beyond ±100,000 years (the Gliese 710 flyby) straight-line paths stop being trustworthy for the
  // others, so only the passing star the clock was sent to (and the Sun) are drawn there.
  const clock = { t: 0, playing: false, rewind: null, focus: null };
  const inRange = () => clock.t >= STAR_TIME[0] && clock.t <= STAR_TIME[1];
  const shown = d => d.e.sun || inRange() || d.e === clock.focus;
  function place() {
    for (const d of dots) {
      const p = clock.t ? positionAt(d.e, clock.t) : d.e.pos; d.sprite.position.fromArray(p); d.sprite.visible = shown(d);
      const sp = d.stem.geometry.attributes.position; sp.setXYZ(0, p[0], p[1], p[2]); sp.setXYZ(1, p[0], 0, p[2]); sp.needsUpdate = true; d.stem.visible = d.sprite.visible;
      const tp = d.trail.geometry.attributes.position; tp.setXYZ(1, p[0], p[1], p[2]); tp.needsUpdate = true; d.trail.visible = d.sprite.visible && Math.abs(clock.t) > 50;
    }
    markNearest();
  }
  function markNearest() {
    const n = nearest(), d = dots.find(x => x.e === n.entry) || null;
    if (d) { const p = d.sprite.position, a = nearLine.geometry.attributes.position; a.setXYZ(1, p.x, p.y, p.z); a.needsUpdate = true; nearLine.computeLineDistances(); }
    nearLine.visible = !!d; if (d !== nearDot) { nearDot = d; ordered = byRank(); relist(); }
  }
  // Running the clock frames the neighbourhood (about 18 light-years out); a flyby frames the pair closely.
  function frame(d) { if (fly.t < 1) return; const cur = camera.position.distanceTo(controls.target); if (Math.abs(cur / d - 1) < 0.15) return; fly.dir.copy(viewDir()); fly.start(cur, d, 1.3); }
  const neighbourhood = () => { const cur = camera.position.distanceTo(controls.target); if (cur < 8 || cur > 40) frame(18); };
  function tick(dt) {
    const before = clock.t;
    if (clock.rewind) { const r = clock.rewind; r.k = Math.min(1, r.k + dt / r.dur); clock.t = r.from * (1 - r.k) ** 3; if (r.k >= 1) { clock.t = 0; clock.rewind = null; r.done?.(); } }
    else if (clock.playing) { clock.t = Math.min(STAR_TIME[1], clock.t + YEARS_PER_SEC * dt); if (clock.t >= STAR_TIME[1]) clock.playing = false; }
    if (clock.t !== before) { place(); onTime?.(); }
  }
  function setTime(t, focus = null) { clock.rewind = null; clock.playing = false; clock.focus = focus; clock.t = t; place(); if (focus?.motion) frame(Math.max(STAR_NEAR * 1.05, focus.motion.close.ly * 9)); else if (t) neighbourhood(); onTime?.(); }
  function play() { clock.rewind = null; clock.focus = null; if (clock.t >= STAR_TIME[1] || !inRange()) clock.t = 0; clock.playing = true; place(); neighbourhood(); onTime?.(); }
  function pause() { clock.playing = false; onTime?.(); }
  function rewind(done) { clock.playing = false; clock.focus = null; if (clock.t === 0 || reduceMotion()) { setTime(0); done?.(); return; } clock.rewind = { from: clock.t, k: 0, dur: 1.2, done }; onTime?.(); }
  const nearest = () => nearestAt(dots.filter(d => !d.e.sun && shown(d)).map(d => d.e), clock.t);
  markNearest();
  // Allocation-free label placement (labels.js): each item has el, pos (a live Vector3) and px.
  let labelCam = camera; const project = (it, out) => { tmp.copy(it.pos).project(labelCam); out.x = tmp.x; out.y = tmp.y; out.z = tmp.z; return true; };
  function placeLabels(cam, bounds, list, count = list.length) { labelCam = cam; placeAll(list, count, placer, bounds, project, labelOpts); }
  // overlay: draw over whatever is already on screen (no background). seam: null, or { role: 'inner' | 'outer', t }
  // while a zoom crosses a seam; every object then fades by its own rule (lod.js), never the whole scene at once.
  function render(width, height, visible, { overlay = false, seam = null } = {}) {
    scene.background = overlay ? null : bg; seamNow = seam;
    const now = performance.now(), dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    renderer.setSize(width, height, false);
    const vw = Math.min(width, visible?.width ?? width), vh = Math.min(height, visible?.height ?? height);
    const cam = mode === 'system' ? sysCam : camera, ctl = mode === 'system' ? sysControls : controls;
    const fullW = 2 * width - vw, fullH = 2 * height - vh; cam.aspect = fullW / fullH; cam.zoom = vh / fullH;
    if (vw === width && vh === height) cam.clearViewOffset(); else cam.setViewOffset(fullW, fullH, width - vw, height - vh, width, height);
    cam.updateProjectionMatrix();
    fly.step(dt); if (mode === 'stars') tick(dt); ctl.update();
    const bounds = canvas.getBoundingClientRect();
    if (mode === 'stars') {
      // Non-attenuated sprites: on-screen size ≈ scale × (1 / tan(fov/2)) × visible height / 2, so this keeps
      // each glow at about 2.2 × its nominal pixel size whatever the screen or sheet height.
      const k = glowScale(1, camera.fov, vh);
      for (const d of dots) d.sprite.scale.setScalar(Math.max(d.sprite.userData.px, d === nearDot ? 9 : 0) * k * (d.e === selected ? 1.6 : 1));
      placeSky(sky, camera); lod.update(camera.position, ORIGIN, vh, camera.fov, seam); lastVh = vh;
      if (labelsLive) placeLabels(camera, bounds, starItems);
      const clear = renderer.autoClear; renderer.autoClear = !overlay; renderer.render(scene, camera); renderer.autoClear = clear;
    } else {
      if (pair) { pair.year += dt * pair.pr.P / 12; placePair(); onPair?.(); placeLabels(sysCam, bounds, pair.items); }
      sysT += dt; if (current?.sysView) for (const p of current.sysView.planets) { const w = Math.PI * 2 / Math.max(2.5, 2.5 * (p.period / current.sysView.planets[0].period) ** 0.5); p.pivot.rotation.y += w * dt; }
      if (current?.sysView) { const v = current.sysView; for (const it of v.items) if (it.mesh) it.mesh.getWorldPosition(it.pos); placeLabels(sysCam, bounds, v.items); }
      renderer.render(sys, sysCam);
    }
  }
  // Camera glides (distance from the Sun along a fixed viewing direction).
  const fly = { t: 1, from: 0, to: 0, dur: 1.4, dir: new THREE.Vector3(0.35, 0.55, 1).normalize(), done: null,
    start(from, to, dur, done) { this.from = from; this.to = to; this.t = 0; this.dur = reduceMotion() ? 0.01 : dur; this.done = done; controls.target.set(0, 0, 0); },
    step(dt) { if (this.t >= 1) return; this.t = Math.min(1, this.t + dt / this.dur); const k = 1 - (1 - this.t) ** 3, d = this.from * (this.to / this.from) ** k; camera.position.copy(this.dir).multiplyScalar(d); if (this.t >= 1) { const f = this.done; this.done = null; f?.(); } } };
  const reduceMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let selected = null;
  function pick(clientX, clientY) {
    if (mode !== 'stars') return null;
    const b = canvas.getBoundingClientRect(); let best = null, bestD = 44;
    for (const d of dots) { if (!d.sprite.visible) continue; tmp.copy(d.sprite.position).project(camera); if (tmp.z >= 1) continue; const x = b.left + (tmp.x + 1) / 2 * b.width, y = b.top + (1 - tmp.y) / 2 * b.height, dd = Math.hypot(x - clientX, y - clientY); if (dd < bestD) { bestD = dd; best = d.e; } }
    return best;
  }
  function select(e) { selected = e; }
  // Arriving out of the Solar System ("inside"): start at the Sun and pull back. Arriving down from the Galaxy ("outside"): sweep in.
  // Place the camera exactly: looking at the Sun from direction dir, at distance d light-years.
  function setView(dir, d) { fly.t = 1; fly.done = null; fly.dir.copy(dir).normalize(); controls.target.set(0, 0, 0); camera.position.copy(fly.dir).multiplyScalar(d); controls.update(); }
  const viewDir = () => camera.position.clone().sub(controls.target).normalize();
  // The zoom controller's hook: same direction and centre, new distance (light-years). No allocation.
  function setDistance(d) { fly.t = 1; fly.done = null; tmp.copy(camera.position).sub(controls.target); const l = tmp.length() || 1; camera.position.copy(controls.target).addScaledVector(tmp, d / l); }
  const distance = () => camera.position.distanceTo(controls.target);
  let labelsLive = true;
  function enter(from = 'inside') {
    if (from && typeof from === 'object') { mode = 'stars'; setLabels('stars'); controls.enabled = true; sysControls.enabled = false; setView(from.dir, from.d); return; } mode = 'stars'; setLabels('stars'); controls.enabled = true; sysControls.enabled = false; const d0 = from === 'outside' ? 110 : 0.05; camera.position.copy(fly.dir).multiplyScalar(d0); fly.start(d0, 26, from === 'outside' ? 1.4 : 1.8); }
  function zoomOut(done) { if (mode === 'system') closeSystem(); fly.dir.copy(viewDir()); fly.start(Math.max(camera.position.length(), STAR_NEAR), STAR_FAR, 1.0, done); }
  function leave() { setLabels(null); controls.enabled = false; sysControls.enabled = false; setTime(0); }
  function zoomBackIn(done) { fly.dir.copy(viewDir()); fly.start(Math.max(camera.position.length(), STAR_NEAR), STAR_NEAR, 1.1, done); }
  function openSystem(entry) {
    for (const x of pair?.els || []) x.el.remove(); pair = null;
    for (const p of current?.sysView?.planets || []) p.el.remove(); for (const c of current?.sysView?.compareEls || []) c.el.remove();
    const view = showSystem(entry); if (!view) return null;
    for (const p of view.planets) { p.el = document.createElement('span'); p.el.className = 'lbl space'; p.el.textContent = p.name.replace(/^.* (\w)$/, '$1'); labelsEl.appendChild(p.el); }
    view.compareEls = view.compare.map(c => { const el = document.createElement('span'); el.className = 'lbl space ring-lbl'; el.textContent = c.label; labelsEl.appendChild(el); return { el, pos: new THREE.Vector3(c.r * 0.72, 0, c.r * 0.72), px: 0 }; });
    view.items = [...view.planets.map(p => ({ el: p.el, mesh: p.mesh, pos: new THREE.Vector3(), px: 10 })), ...view.compareEls];
    entry.sysView = view; current = entry; mode = 'system'; setLabels('system'); controls.enabled = false; sysControls.enabled = true; return view;
  }
  // A pair of stars orbiting each other, drawn in the plane of their orbit (AU), face on. Both stars go
  // round the centre of mass; one lap takes about 12 seconds. Our planets' orbits of similar size are dashed.
  let pair = null;
  function openPair(entry) {
    for (const p of current?.sysView?.planets || []) p.el.remove(); for (const c of current?.sysView?.compareEls || []) c.el.remove(); for (const x of pair?.els || []) x.el.remove();
    const pr = pairOf(entry.name); if (!pr) return null;
    sysGroup.clear(); current = entry; entry.sysView = null;
    const scale = 10 / apastron(pr), typeOf = n => (entry.stars.find(x => x.name === n) || entry.stars[0]).type;
    const mk = (name, m, frac) => {
      const k = starKind(typeOf(name)), color = new THREE.Color(...starColor(k.temp)).lerp(new THREE.Color(0xffd2b0), pr.brown ? 0.45 : 0), r = k.kind === 'White dwarf' ? 0.1 : pr.brown ? 0.28 : Math.max(0.22, Math.min(0.6, 0.38 * m ** 0.5)); // a white dwarf is about Earth-sized: drawn tiny
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshBasicMaterial({ color })); sysGroup.add(ball);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); halo.scale.setScalar(r * 6); ball.add(halo);
      // This star's own ellipse about the centre of mass.
      const pts = []; for (let i = 0; i <= 240; i++) { const E = i / 240 * Math.PI * 2; pts.push(new THREE.Vector3(frac * pr.a * (Math.cos(E) - pr.e) * scale, 0, -frac * pr.a * Math.sqrt(1 - pr.e ** 2) * Math.sin(E) * scale)); }
      const sign = name === pr.A ? -1 : 1; const ell = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(v => v.multiplyScalar(sign))), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 })); sysGroup.add(ell);
      const el = document.createElement('span'); el.className = 'lbl space'; el.textContent = name; labelsEl.appendChild(el);
      return { name, ball, el, kind: k.kind };
    };
    const st = pairState(pr, 2026); // only the mass fractions are used here
    const A = mk(pr.A, pr.mA, st.fA), B = mk(pr.B, pr.mB, st.fB);
    const cm = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xf3c887 })); sysGroup.add(cm);
    const link = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineDashedMaterial({ color: 0x9aa7c2, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.6 })); link.frustumCulled = false; sysGroup.add(link);
    const compare = compareOrbits(pr).map(([label, au]) => { sysGroup.add(circle(au * scale, 0x9aa7c2, 0.4, true)); const el = document.createElement('span'); el.className = 'lbl space ring-lbl'; el.textContent = label; labelsEl.appendChild(el); return { el, pos: new THREE.Vector3(au * scale * 0.72, 0, au * scale * 0.72), px: 0 }; });
    const now = new Date(), y0 = now.getFullYear() + (now - new Date(now.getFullYear(), 0, 1)) / 31557600000;
    pair = { pr, A, B, link, scale, year: y0, compare, els: [A, B, ...compare], items: [{ el: A.el, pos: A.ball.position, px: 14 }, { el: B.el, pos: B.ball.position, px: 14 }, ...compare] };
    placePair();
    { const r = canvas.getBoundingClientRect(), k = r.height > r.width ? 1.55 : 1; sysCam.position.set(0, 14 * k, 10 * k); } sysControls.target.set(0, 0, 0); sysControls.minDistance = 3; sysControls.maxDistance = 80; sysControls.update();
    mode = 'system'; setLabels('system'); controls.enabled = false; sysControls.enabled = true;
    return pair;
  }
  function placePair() {
    const st = pairState(pair.pr, pair.year), k = pair.scale;
    pair.A.ball.position.set(st.A[0] * k, 0, -st.A[1] * k); pair.B.ball.position.set(st.B[0] * k, 0, -st.B[1] * k);
    const a = pair.link.geometry.attributes.position; a.setXYZ(0, st.A[0] * k, 0, -st.A[1] * k); a.setXYZ(1, st.B[0] * k, 0, -st.B[1] * k); a.needsUpdate = true; pair.link.computeLineDistances();
    pair.sep = st.sep;
  }
  const pairInfo = () => pair && { year: pair.year, sep: pair.sep, pr: pair.pr };
  function closeSystem() { for (const x of pair?.els || []) x.el.hidden = true; pair = null; for (const p of current?.sysView?.planets || []) p.el.hidden = true; for (const c of current?.sysView?.compareEls || []) c.el.hidden = true; mode = 'stars'; setLabels('stars'); controls.enabled = true; sysControls.enabled = false; }
  function setLabels(which) {
    for (const it of starItems) forgetLabel(it); for (const it of current?.sysView?.items || []) forgetLabel(it); for (const it of pair?.items || []) forgetLabel(it);
    for (const d of dots) d.el.hidden = which !== 'stars'; for (const r of ringLabels) r.el.hidden = which !== 'stars';
    for (const p of current?.sysView?.planets || []) p.el.hidden = which !== 'system'; for (const c of current?.sysView?.compareEls || []) c.el.hidden = which !== 'system';
    for (const x of pair?.els || []) x.el.hidden = which !== 'system';
  }
  // The "you are here" anchor at this scale: the Sun, labelled as its own label would be (lab.js draws one anchor
  // across a seam, moving from one scale's anchor to the other's).
  let lastVh = 1;
  function anchor(out, bounds) {
    tmp.copy(ORIGIN).project(camera); if (tmp.z >= 1) return false;
    out.x = bounds.left + (tmp.x + 1) / 2 * bounds.width; out.y = bounds.top + (1 - tmp.y) / 2 * bounds.height; out.off = dots[0].px / 2 + 4; out.text = dots[0].e.name; return true;
  }
  // Camera up (frames.js turns it across the stars ⇄ Milky Way seam); back to the ecliptic pole afterwards.
  function setUp(v) { if (v) camera.up.set(v.x, v.y, v.z); else camera.up.set(0, 1, 0); camera.lookAt(controls.target); }
  const zoomState = () => ({ d: camera.position.distanceTo(controls.target), min: controls.minDistance, max: controls.maxDistance, busy: fly.t < 1 || mode !== 'stars' || !!clock.rewind });
  return { render, anchor, setUp, hideHere(v) { hideHere = v; if (v) for (const it of dots) if (it.here) { it.el.hidden = true; forgetLabel(it); } }, sunPx: () => dots[0].px, pick, select, enter, leave, frame: d => { if (mode === 'stars') frame(d); }, setTime, play, pause, rewind, nearest, time: () => clock.t, playing: () => clock.playing, zoomBackIn, zoomOut, zoomState, setView, viewDir, showLabels: on => setLabels(on ? 'stars' : null), liveLabels(v) { labelsLive = v; if (!v) for (const it of starItems) { forgetLabel(it); it.el.hidden = true; } }, setDistance, distance, openSystem, openPair, pairInfo, closeSystem, get mode() { return mode; }, camera, controls, entries, scene, sys, fly };
}
