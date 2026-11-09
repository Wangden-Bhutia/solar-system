// One shared background of faint distant stars for every scale, and the shared glow texture.
// The same directions (fixed seed) are fixed on the SKY, in the galactic frame: scenes drawn in the ecliptic
// frame (Solar System, nearby stars) rotate them with frames.js, so during a zoom both scales show the very same
// sky. The sky is re-centred on the camera every frame (placeSky), at the geometric mean of the camera's near and
// far planes, so it never shows parallax and never clips. Illustrative background: not a star catalogue.
import * as THREE from './vendor/three.module.min.js';
import { galToEcl } from './frames.js';
export function skyPoints(_radius, { n = 2500, opacity = 0.6, frame = 'gal' } = {}) {
  let x = 20251109; const r = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), v = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < n; i++) {
    const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z), k = 0.45 + r() * 0.4, warm = r();
    v.x = s * Math.cos(a); v.y = z; v.z = s * Math.sin(a); if (frame === 'ecl') galToEcl(v, v);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    col[i * 3] = k * (0.85 + 0.15 * warm); col[i * 3 + 1] = k * 0.9; col[i * 3 + 2] = k * (1 - 0.15 * warm);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, vertexColors: true, transparent: true, opacity, depthWrite: false }));
  p.frustumCulled = false; p.renderOrder = -10; p.userData.sky = true; return p;
}
export function placeSky(sky, camera) { sky.position.copy(camera.position); sky.scale.setScalar(Math.sqrt(camera.near * camera.far)); }
// Soft round glow used for every star dot and the Sun's far-away glow (the same texture in every scene, so the
// Sun drawn by the Solar System and by the star map look identical).
export const glowTex = (() => {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext?.('2d'); if (!x) return null;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
// On-screen size of a non-attenuated sprite is scale × (visible height / 2) / tan(fov / 2): the scale that draws
// a glow `px` pixels across. Every scene uses this, so the same star is the same size in every scene.
export const glowScale = (px, fovDeg, vh) => px * 2.2 * Math.tan(fovDeg * Math.PI / 360) * 2 / vh;
