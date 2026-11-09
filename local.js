// The Local Group scene (1 unit = 10,000 light-years), drawn with the shared renderer like the Galaxy.
// The Milky Way here is the same particle model as the Galaxy scene, shrunk by 10, so the zoom between
// the two scales is to scale: the camera distance here is exactly the Galaxy's ÷ 10.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { galaxyParticles, R0 } from './galaxy-data.js';
import { GALAXIES, LOCAL_UNIT, discAxes, spiralParticles } from './local-data.js';
import { LOCAL_NEAR, LOCAL_FAR } from './zoom-ladder.js';

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
  controls.zoomSpeed = 1.8; controls.minDistance = LOCAL_NEAR; controls.maxDistance = LOCAL_FAR;
  const points = (pos, col, size, opacity) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (col) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: !!col, color: col ? 0xffffff : 0x8a93a8, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); p.frustumCulled = false; scene.add(p); return p; };
  // Far background galaxies' glow is left out: this level is the Local Group alone. A faint star field for depth.
  { const n = 1200, p = []; for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(20000); p.push(v.x, v.y, v.z); } points(p, null, 1, 0.5); }
  // The Milky Way: the Galaxy scene's own particles, shrunk 10×.
  { const { positions, colors } = galaxyParticles({ bulge: 1800, disc: 2600, arm: 4200, seed: 11 }); points(Array.from(positions, v => v / LOCAL_UNIT), Array.from(colors), 1.3, 0.55); }
  // Spirals and clouds, each in its real place and orientation.
  const placeDisc = (g, n, seed, opts) => {
    const { positions, colors } = spiralParticles(g.size / 2 / LOCAL_UNIT, n, seed, opts), { major, normal } = discAxes(g);
    const M = new THREE.Vector3(...major), N = new THREE.Vector3(...normal), Y = new THREE.Vector3().crossVectors(N, M).normalize(), out = [];
    for (let i = 0; i < positions.length; i += 3) { const v = M.clone().multiplyScalar(positions[i]).addScaledVector(Y, positions[i + 1]).addScaledVector(N, positions[i + 2]).add(new THREE.Vector3(...g.pos)); out.push(v.x, v.y, v.z); }
    points(out, colors, 1.3, 0.6);
  };
  const blob = (g, n, seed) => { let x = seed; const r = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296), s = g.size / 2 / LOCAL_UNIT, out = [], col = [];
    for (let i = 0; i < n; i++) { const u = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * 0.45, v = new THREE.Vector3().randomDirection().multiplyScalar(u * s); v.y *= 0.55; out.push(v.x + g.pos[0], v.y + g.pos[1], v.z + g.pos[2]); const k = 0.55 + r() * 0.4; col.push(0.8 * k, 0.86 * k, k); }
    points(out, col, 1.3, 0.6); };
  for (const g of GALAXIES) { if (g.i != null) placeDisc(g, g.short === 'Andromeda' ? 9000 : 3200, g.short === 'Andromeda' ? 31 : 33); else if (g.blob) blob(g, g.short === 'LMC' ? 1500 : 800, g.short === 'LMC' ? 5 : 9); }
  // Distance rings in the Milky Way's plane: 1, 2 and 3 million light-years from its centre.
  const ringLabels = [1, 2, 3].map(m => {
    const r = m * 1000 / LOCAL_UNIT, pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x33415c, transparent: true, opacity: 0.45 })));
    const el = document.createElement('span'); el.className = 'lbl space ring-lbl'; el.textContent = `${m} million ly`; el.hidden = true; labelsEl.appendChild(el); return { el, pos: new THREE.Vector3(r, 0, 0) };
  });
  // Every galaxy gets a marker (dwarfs are only a glow at this scale) and a name.
  const all = [MW, ...GALAXIES];
  const marks = all.map(g => {
    const big = g.here || g.i != null || g.blob, sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: g.here ? 0xffe38a : big ? 0xdfe8ff : 0xb9c4dc, sizeAttenuation: false, depthWrite: false, transparent: true, opacity: g.rank === 1 ? 0.75 : g.rank === 2 ? 0.55 : big ? 0.35 : 0.9, blending: THREE.AdditiveBlending }));
    sprite.position.fromArray(g.pos); sprite.userData.px = g.rank === 1 ? 16 : big ? 10 : 5; scene.add(sprite);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl space galaxy' + (g.here ? ' here' : ''); el.textContent = g.here ? 'Milky Way · you are here' : g.short || g.name; el.tabIndex = -1; el.hidden = true;
    el.addEventListener('click', ev => { ev.stopPropagation(); onPick?.(g); }); labelsEl.appendChild(el);
    return { g, sprite, el };
  });
  const ordered = [...marks].sort((a, b) => a.g.rank - b.g.rank);
  const tmp = new THREE.Vector3(); let last = 0, selected = null, on = false, labelOpacity = 1;
  const mats = []; scene.traverse(o => { if (o.material) { o.material.userData.base = o.material.opacity; o.material.transparent = true; mats.push(o.material); } });
  const setFade = f => { for (const m of mats) m.opacity = m.userData.base * f; };
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
  function placeLabels(bounds) {
    const placed = [], list = [...ordered.map(x => ({ el: x.el, pos: x.sprite.position, px: x.sprite.userData.px })), ...ringLabels.map(r => ({ el: r.el, pos: r.pos, px: 0 }))];
    for (const { el, pos, px } of list) {
      tmp.copy(pos).project(camera);
      const x = bounds.left + (tmp.x + 1) / 2 * bounds.width, y = bounds.top + (1 - tmp.y) / 2 * bounds.height, w = el.textContent.length * 4.9 + 10, h = 13, off = px / 2 + 4;
      const box = [x - w / 2, y - off - h, x + w / 2, y - off];
      const ok = on && tmp.z < 1 && Math.abs(tmp.x) < 1.02 && Math.abs(tmp.y) < 1.02 && !placed.some(o => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]);
      el.hidden = !ok; el.style.visibility = ok ? 'visible' : 'hidden'; el.style.opacity = labelOpacity;
      if (ok) { placed.push(box); el.style.transform = `translate(${x}px,${y}px) translate(-50%,calc(-100% - ${off}px))`; }
    }
  }
  function render(width, height, visible, { overlay = false, opacity = 1 } = {}) {
    scene.background = overlay ? null : bg; setFade(opacity); labelOpacity = opacity;
    const now = performance.now(), dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    renderer.setSize(width, height, false);
    const vw = Math.min(width, visible?.width ?? width), vh = Math.min(height, visible?.height ?? height), fullW = 2 * width - vw, fullH = 2 * height - vh;
    camera.aspect = fullW / fullH; camera.zoom = vh / fullH;
    if (vw === width && vh === height) camera.clearViewOffset(); else camera.setViewOffset(fullW, fullH, width - vw, height - vh, width, height);
    camera.updateProjectionMatrix(); fly.step(dt); controls.update();
    const k = 2 * Math.tan(camera.fov * Math.PI / 360) * 2 / vh;
    for (const x of marks) x.sprite.scale.setScalar(x.sprite.userData.px * (x.g.i != null || x.g.blob || x.g.here ? 1.6 : 1) * k * (x.g === selected ? 1.7 : 1));
    placeLabels(canvas.getBoundingClientRect());
    camera.far = Math.max(1e5, camera.position.length() * 4);
    const clear = renderer.autoClear; renderer.autoClear = !overlay; renderer.render(scene, camera); renderer.autoClear = clear;
  }
  function pick(cx, cy) {
    const b = canvas.getBoundingClientRect(); let best = null, bestD = 44;
    for (const x of marks) { tmp.copy(x.sprite.position).project(camera); if (tmp.z >= 1) continue; const px = b.left + (tmp.x + 1) / 2 * b.width, py = b.top + (1 - tmp.y) / 2 * b.height, d = Math.hypot(px - cx, py - cy) - (x.g.rank <= 2 ? 10 : 0); if (d < bestD) { bestD = d; best = x.g; } }
    return best;
  }
  function setLabels(v) { on = v; for (const x of [...marks, ...ringLabels]) x.el.hidden = !v; }
  // Look from direction dir at distance d (units) at target tgt (units): the bridge from the Galaxy hands over
  // exactly here, with the Galaxy's own target ÷ 10.
  function setView(dir, d, tgt = SUN) { fly.t = 1; fly.done = null; fly.dir.copy(dir).normalize(); controls.target.copy(tgt); camera.position.copy(controls.target).addScaledVector(fly.dir, d); controls.update(); }
  function enter(at) { setLabels(true); controls.enabled = true; if (at) setView(at.dir, at.d, at.tgt ? new THREE.Vector3(...at.tgt) : SUN); }
  function leave() { setLabels(false); controls.enabled = false; }
  // Pull back to frame the whole group, centred between the Milky Way and Andromeda.
  function overview(done) { fly.start(portrait() ? 760 : 470, new THREE.Vector3().lerpVectors(new THREE.Vector3(), M31, 0.45), 2.2, done, new THREE.Vector3(0.25, 0.75, 0.6)); }
  // Back towards the Milky Way, ending where the bridge to the Galaxy begins (Sun-centred, closest view).
  function zoomBackIn(done) { fly.start(LOCAL_NEAR, SUN, 1.4, done); }
  const zoomState = () => ({ d: camera.position.distanceTo(controls.target), min: controls.minDistance, max: controls.maxDistance, busy: fly.t < 1, atSun: controls.target.distanceTo(SUN) < 0.01 });
  return { render, pick, enter, leave, setView, viewDir, overview, zoomBackIn, zoomState, showLabels: setLabels, select(g) { selected = g; }, galaxies: all, camera, controls, scene, fly };
}
