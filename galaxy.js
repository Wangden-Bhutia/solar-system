// The Milky Way scene (1 unit = 1,000 light-years), drawn with the shared renderer like the star map.
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { R0, ARMS, armRadius, discPosition, galaxyParticles, LANDMARKS } from './galaxy-data.js';

const glow = (() => {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext?.('2d'); if (!x) return null;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();

export function createGalaxy({ renderer, canvas, labelsEl, onPick }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010207);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1e5);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enabled = false; controls.enablePan = false;
  controls.minDistance = 0.3; controls.maxDistance = 260;
  // Distant background stars and other galaxies' faint glow are left out on purpose: this level is our Galaxy alone.
  { const n = 1500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(3000); p.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x5c6478, size: 1, sizeAttenuation: false }))); }
  const { positions, colors } = galaxyParticles();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3)); g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const cloud = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(cloud);
  // Central glow of the bulge.
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffd8a0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); core.scale.setScalar(26); scene.add(core);
  // The Sun's orbit around the centre, and a marker for the Sun.
  const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 181 }, (_, i) => { const a = i / 180 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * R0, 0, Math.sin(a) * R0); })), new THREE.LineDashedMaterial({ color: 0xf3c887, dashSize: 1.2, gapSize: 1.2, transparent: true, opacity: 0.45 }));
  orbit.computeLineDistances(); scene.add(orbit);
  const marks = LANDMARKS.map(m => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: m.name === 'Sun' ? 0xffe38a : m.name === 'Sagittarius A*' ? 0xffb38a : 0xffffff, sizeAttenuation: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    sprite.position.fromArray(m.pos); scene.add(sprite);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl space galaxy' + (m.name === 'Sun' ? ' here' : ''); el.textContent = m.name === 'Sun' ? 'You are here' : m.name; el.tabIndex = -1; el.hidden = true;
    el.addEventListener('click', ev => { ev.stopPropagation(); onPick?.(m); }); labelsEl.appendChild(el);
    return { m, sprite, el };
  });
  const armLabels = ARMS.map(a => { const b = a.spur ? 22 : 60; const el = document.createElement('span'); el.className = 'lbl space galaxy arm-lbl'; el.textContent = a.name; el.hidden = true; labelsEl.appendChild(el); return { el, pos: new THREE.Vector3(...discPosition(armRadius(a, b), b)) }; });
  const tmp = new THREE.Vector3(); let last = 0, selected = null, on = false;
  // Camera glides along a fixed viewing direction, centred on a target (the Sun, then the whole Galaxy).
  const fly = { t: 1, dur: 1.6, from: { d: 1, tgt: new THREE.Vector3() }, to: { d: 1, tgt: new THREE.Vector3() }, dir: new THREE.Vector3(0.15, 0.85, 0.5).normalize(), done: null,
    start(fromD, fromT, toD, toT, dur, done) { this.from = { d: fromD, tgt: fromT.clone() }; this.to = { d: toD, tgt: toT.clone() }; this.t = 0; this.dur = reduce() ? 0.01 : dur; this.done = done; },
    step(dt) { if (this.t >= 1) return; this.t = Math.min(1, this.t + dt / this.dur); const k = 1 - (1 - this.t) ** 3;
      const d = this.from.d * (this.to.d / this.from.d) ** k; controls.target.lerpVectors(this.from.tgt, this.to.tgt, k); camera.position.copy(controls.target).addScaledVector(this.dir, d);
      if (this.t >= 1) { const f = this.done; this.done = null; f?.(); } } };
  const reduce = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const portrait = () => { const r = canvas.getBoundingClientRect(); return r.height > r.width; };
  const SUN = new THREE.Vector3(-R0, 0, 0), CENTRE = new THREE.Vector3();
  function placeLabels(bounds) {
    const placed = [];
    const list = [...marks.map(x => ({ el: x.el, pos: x.sprite.position, px: 10 })), ...armLabels.map(a => ({ el: a.el, pos: a.pos, px: 0 }))];
    for (const { el, pos, px } of list) {
      tmp.copy(pos).project(camera);
      const x = bounds.left + (tmp.x + 1) / 2 * bounds.width, y = bounds.top + (1 - tmp.y) / 2 * bounds.height, w = el.textContent.length * 4.9 + 10, h = 13, off = px / 2 + 4;
      const box = [x - w / 2, y - off - h, x + w / 2, y - off];
      const ok = on && tmp.z < 1 && Math.abs(tmp.x) < 1.02 && Math.abs(tmp.y) < 1.02 && !placed.some(o => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1]);
      el.hidden = !ok; el.style.visibility = ok ? 'visible' : 'hidden';
      if (ok) { placed.push(box); el.style.transform = `translate(${x}px,${y}px) translate(-50%,calc(-100% - ${off}px))`; }
    }
  }
  function render(width, height, visible) {
    const now = performance.now(), dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    renderer.setSize(width, height, false);
    const vw = Math.min(width, visible?.width ?? width), vh = Math.min(height, visible?.height ?? height), fullW = 2 * width - vw, fullH = 2 * height - vh;
    camera.aspect = fullW / fullH; camera.zoom = vh / fullH;
    if (vw === width && vh === height) camera.clearViewOffset(); else camera.setViewOffset(fullW, fullH, width - vw, height - vh, width, height);
    camera.updateProjectionMatrix(); fly.step(dt); controls.update();
    const k = 2 * Math.tan(camera.fov * Math.PI / 360) * 2 / vh; // ~ pixels → non-attenuated sprite scale
    for (const x of marks) x.sprite.scale.setScalar((x.m.name === 'Sun' ? 14 : x.m.name === 'Sagittarius A*' ? 12 : 9) * k * (x.m === selected ? 1.7 : 1));
    // Sun-sized glow scales with distance from the camera so the bulge reads as a glow, not a disc.
    placeLabels(canvas.getBoundingClientRect());
    renderer.render(scene, camera);
  }
  function pick(cx, cy) {
    const b = canvas.getBoundingClientRect(); let best = null, bestD = 44;
    for (const x of marks) { tmp.copy(x.sprite.position).project(camera); if (tmp.z >= 1) continue; const px = b.left + (tmp.x + 1) / 2 * b.width, py = b.top + (1 - tmp.y) / 2 * b.height, d = Math.hypot(px - cx, py - cy); if (d < bestD) { bestD = d; best = x.m; } }
    return best;
  }
  function setLabels(v) { for (const x of [...marks, ...armLabels]) x.el.hidden = !v; }
  // Arriving from the star map: start right at the Sun and pull back until the whole Galaxy fits.
  function enter() { on = true; controls.enabled = true; setLabels(true); fly.start(0.05, SUN, portrait() ? 215 : 125, CENTRE, 2.6); }
  function leave() { on = false; controls.enabled = false; setLabels(false); }
  function zoomToSun(done) { fly.start(camera.position.distanceTo(controls.target) || 140, controls.target, 0.05, SUN, 1.3, done); }
  return { render, pick, enter, leave, zoomToSun, select(m) { selected = m; }, marks, camera, controls, scene, cloud, fly, landmarks: LANDMARKS };
}
