// One shared background of faint distant stars for every scale. Each scene places the same directions
// (fixed seed) far beyond its own scenery, so during a zoom between two scales both draw the same sky
// and nothing flickers as one fades into the other.
import * as THREE from './vendor/three.module.min.js';
export function skyPoints(radius, { n = 1500, opacity = 0.55 } = {}) {
  let x = 20251109; const r = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z), k = 0.45 + r() * 0.4, warm = r();
    pos.set([s * Math.cos(a) * radius, z * radius, s * Math.sin(a) * radius], i * 3);
    col.set([k * (0.85 + 0.15 * warm), k * 0.9, k * (1 - 0.15 * warm)], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, vertexColors: true, transparent: true, opacity, depthWrite: false }));
  p.frustumCulled = false; return p;
}
