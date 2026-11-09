// The stellar neighbourhood (light-years) and other planetary systems (AU), drawn with the shared
// WebGL renderer as a separate scene, like the labs. The Solar System scene is not touched; lab.js
// switches between them through hooks.renderOverride, with a zoom-and-fade hand-off.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { NEIGHBOURS, SUN_ENTRY, starPixels, starColor, systemSummary } from './stars-data.js';

const glowTex = (() => {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext?.('2d'); if (!x) return null;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();

export function createStars({ renderer, canvas, labelsEl, onPick }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x02030a);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.001, 1e5);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enabled = false;
  controls.minDistance = 0.4; controls.maxDistance = 120; controls.enablePan = false;
  // Faint background stars far beyond the neighbourhood.
  { const n = 2500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(4000 + Math.random() * 2000); p.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8a93a8, size: 1, sizeAttenuation: false, transparent: true, opacity: 0.6 }))); }
  // Distance rings in the plane of the Solar System: 5, 10 and 15 light-years from the Sun.
  const rings = new THREE.Group(); scene.add(rings);
  for (const r of [5, 10, 15]) {
    const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x33415c, transparent: true, opacity: 0.5 })));
  }
  const ringLabels = [5, 10, 15].map(r => { const el = document.createElement('span'); el.className = 'lbl space ring-lbl'; el.textContent = `${r} ly`; el.hidden = true; labelsEl.appendChild(el); return { el, r }; });
  const entries = [SUN_ENTRY, ...NEIGHBOURS], dots = [];
  for (const e of entries) {
    const color = new THREE.Color(...starColor(e.temp));
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, sizeAttenuation: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    const px = starPixels(e); sprite.userData.px = px; sprite.position.fromArray(e.pos); scene.add(sprite);
    // A thin line down to the Solar System's plane shows how far above or below it each star lies.
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...e.pos), new THREE.Vector3(e.pos[0], 0, e.pos[2])]), new THREE.LineBasicMaterial({ color: 0x3a4a66, transparent: true, opacity: 0.22 }));
    if (!e.sun) scene.add(stem);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl space'; el.textContent = e.name; el.tabIndex = -1; el.hidden = true;
    el.addEventListener('click', ev => { ev.stopPropagation(); onPick?.(e); }); labelsEl.appendChild(el);
    dots.push({ e, sprite, stem, el });
  }
  // Label priority: the Sun, systems with planets, the famous and the bright, then the rest.
  const FAMOUS = ['Alpha Centauri', 'Sirius', "Barnard's Star", 'Epsilon Eridani', 'Tau Ceti', 'Procyon', '61 Cygni', 'Luhman 16', 'TRAPPIST-1', 'Wolf 359'];
  const rank = d => d.e.sun ? 0 : FAMOUS.includes(d.e.name) ? 1 + FAMOUS.indexOf(d.e.name) : d.e.planets ? 20 : 40 - Math.min(19, starPixels(d.e));
  const ordered = [...dots].sort((a, b) => rank(a) - rank(b));

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
  function placeLabels(cam, bounds, list) {
    const placed = [];
    for (const { el, pos, px } of list) {
      tmp.copy(pos).project(cam);
      const x = bounds.left + (tmp.x + 1) / 2 * bounds.width, y = bounds.top + (1 - tmp.y) / 2 * bounds.height;
      const w = el.textContent.length * 4.9 + 10, h = 13, off = (px || 6) / 2 + 4;
      const box = [x - w / 2, y - off - h, x + w / 2, y - off];
      const ok = tmp.z < 1 && Math.abs(tmp.x) < 1.02 && Math.abs(tmp.y) < 1.02 && !placed.some(o => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]);
      el.hidden = !ok; el.style.visibility = ok ? 'visible' : 'hidden';
      if (ok) { placed.push(box); el.style.transform = `translate(${x}px,${y}px) translate(-50%,calc(-100% - ${off}px))`; }
    }
  }
  function render(width, height, visible) {
    const now = performance.now(), dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    renderer.setSize(width, height, false);
    const vw = Math.min(width, visible?.width ?? width), vh = Math.min(height, visible?.height ?? height);
    const cam = mode === 'system' ? sysCam : camera, ctl = mode === 'system' ? sysControls : controls;
    const fullW = 2 * width - vw, fullH = 2 * height - vh; cam.aspect = fullW / fullH; cam.zoom = vh / fullH;
    if (vw === width && vh === height) cam.clearViewOffset(); else cam.setViewOffset(fullW, fullH, width - vw, height - vh, width, height);
    cam.updateProjectionMatrix();
    fly.step(dt); ctl.update();
    const bounds = canvas.getBoundingClientRect();
    if (mode === 'stars') {
      // Non-attenuated sprites: on-screen size ≈ scale × (1 / tan(fov/2)) × visible height / 2, so this keeps
      // each glow at about 2.2 × its nominal pixel size whatever the screen or sheet height.
      const k = 2.2 * Math.tan(camera.fov * Math.PI / 360) * 2 / vh;
      for (const d of dots) d.sprite.scale.setScalar(d.sprite.userData.px * k * (d.e === selected ? 1.6 : 1));
      placeLabels(camera, bounds, ordered.map(d => ({ el: d.el, pos: d.sprite.position, px: d.sprite.userData.px })).concat(ringLabels.map(r => ({ el: r.el, pos: new THREE.Vector3(r.r, 0, 0), px: 0 }))));
      renderer.render(scene, camera);
    } else {
      sysT += dt; if (current?.sysView) for (const p of current.sysView.planets) { const w = Math.PI * 2 / Math.max(2.5, 2.5 * (p.period / current.sysView.planets[0].period) ** 0.5); p.pivot.rotation.y += w * dt; }
      if (current?.sysView) placeLabels(sysCam, bounds, current.sysView.planets.map(p => ({ el: p.el, pos: p.mesh.getWorldPosition(new THREE.Vector3()), px: 10 })).concat(current.sysView.compareEls));
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
    for (const d of dots) { tmp.copy(d.sprite.position).project(camera); if (tmp.z >= 1) continue; const x = b.left + (tmp.x + 1) / 2 * b.width, y = b.top + (1 - tmp.y) / 2 * b.height, dd = Math.hypot(x - clientX, y - clientY); if (dd < bestD) { bestD = dd; best = d.e; } }
    return best;
  }
  function select(e) { selected = e; }
  // Arriving out of the Solar System ("inside"): start at the Sun and pull back. Arriving down from the Galaxy ("outside"): sweep in.
  function enter(from = 'inside') { mode = 'stars'; setLabels('stars'); controls.enabled = true; sysControls.enabled = false; const d0 = from === 'outside' ? 110 : 0.05; camera.position.copy(fly.dir).multiplyScalar(d0); fly.start(d0, 26, from === 'outside' ? 1.4 : 1.8); }
  function zoomOut(done) { if (mode === 'system') closeSystem(); fly.start(Math.max(camera.position.length(), 1), 110, 1.0, done); }
  function leave() { setLabels(null); controls.enabled = false; sysControls.enabled = false; }
  function zoomBackIn(done) { const d = camera.position.length(); fly.start(Math.max(d, 1), 0.05, 1.1, done); }
  function openSystem(entry) {
    for (const p of current?.sysView?.planets || []) p.el.remove(); for (const c of current?.sysView?.compareEls || []) c.el.remove();
    const view = showSystem(entry); if (!view) return null;
    for (const p of view.planets) { p.el = document.createElement('span'); p.el.className = 'lbl space'; p.el.textContent = p.name.replace(/^.* (\w)$/, '$1'); labelsEl.appendChild(p.el); }
    view.compareEls = view.compare.map(c => { const el = document.createElement('span'); el.className = 'lbl space ring-lbl'; el.textContent = c.label; labelsEl.appendChild(el); return { el, pos: new THREE.Vector3(c.r * 0.72, 0, c.r * 0.72), px: 0 }; });
    entry.sysView = view; current = entry; mode = 'system'; setLabels('system'); controls.enabled = false; sysControls.enabled = true; return view;
  }
  function closeSystem() { for (const p of current?.sysView?.planets || []) p.el.hidden = true; for (const c of current?.sysView?.compareEls || []) c.el.hidden = true; mode = 'stars'; setLabels('stars'); controls.enabled = true; sysControls.enabled = false; }
  function setLabels(which) {
    for (const d of dots) d.el.hidden = which !== 'stars'; for (const r of ringLabels) r.el.hidden = which !== 'stars';
    for (const p of current?.sysView?.planets || []) p.el.hidden = which !== 'system'; for (const c of current?.sysView?.compareEls || []) c.el.hidden = which !== 'system';
  }
  return { render, pick, select, enter, leave, zoomBackIn, zoomOut, openSystem, closeSystem, get mode() { return mode; }, camera, controls, entries, scene, sys, fly };
}
