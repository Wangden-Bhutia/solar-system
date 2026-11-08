// Procedural, stylised planet textures (generated at load; no image files).
import * as THREE from './vendor/three.module.min.js';
import { LAND_W, LAND_H, LAND_B64 } from './land.js';
const LAND = Uint8Array.from(atob(LAND_B64), ch => ch.charCodeAt(0));
const landBit = (x, y) => { x = ((x % LAND_W) + LAND_W) % LAND_W; y = Math.min(LAND_H - 1, Math.max(0, y)); const k = y * LAND_W + x; return (LAND[k >> 3] >> (k & 7)) & 1; };
// Bilinear sample of the land mask at texture coords u,v in [0,1)
function landAt(u, v) { const fx = u * LAND_W - 0.5, fy = v * LAND_H - 0.5, x = Math.floor(fx), y = Math.floor(fy), tx = fx - x, ty = fy - y;
  return (landBit(x, y) * (1 - tx) + landBit(x + 1, y) * tx) * (1 - ty) + (landBit(x, y + 1) * (1 - tx) + landBit(x + 1, y + 1) * tx) * ty; }

// ---- seeded 3D value noise ----
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const P = new Uint8Array(512); { const r = rng(7); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
const V = new Float32Array(256); { const r = rng(11); for (let i = 0; i < 256; i++) V[i] = r() * 2 - 1; }
const fade = t => t * t * (3 - 2 * t);
function noise(x, y, z) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
  const fx = fade(x - X), fy = fade(y - Y), fz = fade(z - Z);
  const h = (i, j, k) => V[P[P[P[(X + i) & 255] + ((Y + j) & 255)] + ((Z + k) & 255)]];
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(0,0,0), h(1,0,0), fx), l(h(0,1,0), h(1,1,0), fx), fy), l(l(h(0,0,1), h(1,0,1), fx), l(h(0,1,1), h(1,1,1), fx), fy), fz);
}
function fbm(x, y, z, oct = 5) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; }
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

// Paint an equirectangular map. fn(x,y,z,lat,lon) -> [r,g,b] or [r,g,b,a]; optional height channel.
function paint(W, H, fn, wantHeight) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
  const hc = wantHeight ? document.createElement('canvas') : null; let hd, himg;
  if (hc) { hc.width = W; hc.height = H; himg = hc.getContext('2d').createImageData(W, H); hd = himg.data; }
  for (let j = 0; j < H; j++) {
    const lat = (0.5 - (j + 0.5) / H) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < W; i++) {
      const lon = (i + 0.5) / W * Math.PI * 2;
      const out = fn(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat, lon, i, j);
      const k = (j * W + i) * 4;
      d[k] = out[0]; d[k + 1] = out[1]; d[k + 2] = out[2]; d[k + 3] = out.length > 3 ? out[3] : 255;
      if (hd) { const v = clamp(out.h ?? 0.5) * 255; hd[k] = hd[k + 1] = hd[k + 2] = v; hd[k + 3] = 255; }
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  let bump = null; if (hc) { hc.getContext('2d').putImageData(himg, 0, 0); bump = new THREE.CanvasTexture(hc); }
  return { map, bump };
}

// Crater field: returns f(lat,lon) -> height offset (bowl + rim)
function craters(n, seed, rmin, rmax) {
  const r = rng(seed), list = [];
  for (let i = 0; i < n; i++) { const lat = Math.asin(r() * 2 - 1), lon = r() * Math.PI * 2, rad = rmin + (rmax - rmin) * r() ** 3; list.push([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon), rad]); }
  return (x, y, z) => {
    let h = 0;
    for (const [cx, cy, cz, rad] of list) {
      const dx = x - cx, dy = y - cy, dz = z - cz, dd = Math.sqrt(dx * dx + dy * dy + dz * dz) / rad;
      if (dd < 1.3) h += dd < 1 ? -0.5 * (1 - dd * dd) : 0.25 * Math.sin((dd - 1) / 0.3 * Math.PI);
    }
    return h;
  };
}

const S = 512, Hh = 256; // default map size (phone friendly)
const gen = {
  Sun() {
    return paint(S, Hh, (x, y, z) => {
      const g = fbm(x * 18, y * 18, z * 18, 3), big = fbm(x * 3, y * 3, z * 3, 3);
      let c = mix(hex(0xff9a1f), hex(0xfff0a0), clamp(0.55 + g * 1.4 + big * 0.5));
      const spot = smooth(0.32, 0.4, fbm(x * 5 + 9, y * 5, z * 5, 3)); // a few soft sunspots
      return mix(c, hex(0xb4561a), spot * 0.7);
    }).map;
  },
  Mercury() {
    const cr = craters(260, 3, 0.02, 0.16);
    return paint(S, Hh, (x, y, z) => {
      const n = fbm(x * 4, y * 4, z * 4), h = 0.5 + n * 0.5 + cr(x, y, z) * 0.6;
      const c = mix(hex(0x6f6a66), hex(0xc4bdb4), clamp(h)); c.h = h; return c;
    }, true);
  },
  Venus() {
    return paint(S, Hh, (x, y, z, lat) => {
      const w = fbm(x * 2, y * 2, z * 2, 4);
      const band = Math.sin(lat * 7 + w * 6 + fbm(x * 5, y * 5, z * 5, 3) * 3);
      return mix(hex(0xd9a85c), hex(0xfbe7b5), clamp(0.55 + band * 0.25 + w * 0.6));
    }).map;
  },
  Earth() {
    // Real coastlines from Natural Earth (land.js); noise only adds texture/colour variation.
    return paint(768, 384, (x, y, z, lat, lon, i, j) => {
      const land = landAt((i + 0.5) / 768, (j + 0.5) / 384) + fbm(x * 14, y * 14, z * 14, 2) * 0.25;
      const n = 0.02 + Math.max(0, fbm(x * 3 + 3, y * 3, z * 3, 5)) * 0.6 + (land - 0.5) * 0.3;
      const alat = Math.abs(lat) * 180 / Math.PI; let c;
      if (land < 0.5) { // ocean (shallower near coasts)
        const n = -0.25 + land * 0.5;
        c = mix(hex(0x0b3d91), hex(0x2f8fd8), smooth(-0.25, 0.02, n)); c.h = 0.35;
      } else {
        const dry = smooth(10, 30, alat) * (1 - smooth(35, 55, alat)) * smooth(-0.1, 0.25, fbm(x * 6, y * 6, z * 6, 3));
        c = mix(mix(hex(0x3f9b3a), hex(0x2f6e2c), smooth(0.02, 0.35, n)), hex(0xc9a46a), dry);
        c = mix(c, hex(0x8a7a62), smooth(0.25, 0.45, n)); c.h = 0.5 + n;
      }
      const ice = smooth(68, 74, alat + fbm(x * 8, y * 8, z * 8, 3) * 10);
      const o = mix(c, hex(0xf4f8ff), ice); o.h = c.h + ice * 0.2; return o;
    }, true);
  },
  EarthClouds() {
    return paint(S, Hh, (x, y, z, lat) => {
      const n = fbm(x * 3 + 20, y * 6, z * 3, 6) + 0.1 * Math.sin(lat * 9);
      return [255, 255, 255, smooth(0.02, 0.35, n) * 230];
    }).map;
  },
  Moon() {
    const cr = craters(160, 5, 0.03, 0.2);
    return paint(256, 128, (x, y, z) => {
      const maria = smooth(0.05, 0.2, fbm(x * 1.6 + 4, y * 1.6, z * 1.6, 4));
      const h = 0.6 + fbm(x * 6, y * 6, z * 6, 3) * 0.3 + cr(x, y, z) * 0.5;
      const c = mix(mix(hex(0x8d8a86), hex(0xd8d5cf), clamp(h)), hex(0x55534f), maria * 0.75); c.h = h - maria * 0.2; return c;
    }, true);
  },
  Mars() {
    const cr = craters(80, 9, 0.02, 0.08);
    return paint(S, Hh, (x, y, z, lat, lon) => {
      const n = fbm(x * 3, y * 3, z * 3, 5);
      let c = mix(hex(0xb5532a), hex(0xe08a4f), clamp(0.5 + n));
      c = mix(c, hex(0x5e2c1c), smooth(0.08, 0.3, fbm(x * 2 + 7, y * 2, z * 2, 4)) * 0.8); // dark regions
      let h = 0.5 + n * 0.4 + cr(x, y, z) * 0.4;
      // Valles Marineris hint: dark gash just south of equator
      const vl = Math.abs(lat + 0.14 + 0.04 * Math.sin(lon * 6)) < 0.025 && lon > 4.1 && lon < 5.0;
      if (vl) { c = mix(c, hex(0x3d1a10), 0.7); h -= 0.3; }
      // Olympus Mons hint: broad low dome
      const om = Math.hypot(lat - 0.32, (lon - 3.6) * Math.cos(lat)); if (om < 0.12) { h += 0.4 * (1 - om / 0.12); c = mix(c, hex(0xd9875a), 0.4 * (1 - om / 0.12)); }
      const cap = smooth(1.28, 1.36, Math.abs(lat) + fbm(x * 9, y * 9, z * 9, 3) * 0.08);
      c = mix(c, hex(0xf6f0ea), cap); c.h = h; return c;
    }, true);
  },
  Jupiter() {
    const cols = [0xf3e3c3, 0xc98f5a, 0xead2a8, 0x9c6a43, 0xf6ead0, 0xb87c4b, 0xe8cfa0].map(hex);
    return paint(S, Hh, (x, y, z, lat, lon) => {
      const w = fbm(x * 4, y * 4, z * 4, 4) * 0.12 + fbm(x * 12, y * 12, z * 12, 3) * 0.03;
      const t = (Math.sin(lat) + 1) * 0.5 * 13 + w * 3; const i = Math.floor(t);
      let c = mix(cols[((i % 7) + 7) % 7], cols[(((i + 1) % 7) + 7) % 7], smooth(0.3, 0.7, t - i));
      // Great Red Spot (~22°S)
      const dx = (lon - 1.2) * Math.cos(lat) / 0.17, dy = (lat + 0.38) / 0.08, e = Math.hypot(dx, dy);
      if (e < 1.4) c = mix(c, e < 1 ? mix(hex(0xc0502e), hex(0xe0805a), e) : hex(0xf0dcc0), smooth(1.4, 0.8, e));
      return c;
    }).map;
  },
  Saturn() {
    const cols = [0xf1e1b0, 0xd9bf85, 0xeedcae, 0xc9a96b, 0xf4e8c4].map(hex);
    return paint(S, Hh, (x, y, z, lat) => {
      const t = (Math.sin(lat) + 1) * 0.5 * 11 + fbm(x * 5, y * 5, z * 5, 3) * 0.25; const i = Math.floor(t);
      const m5 = k => cols[((k % 5) + 5) % 5]; return mix(m5(i), m5(i + 1), smooth(0.2, 0.8, t - i));
    }).map;
  },
  Uranus() {
    return paint(256, 128, (x, y, z, lat) => mix(hex(0x7fd3dc), hex(0xb4eef0), clamp(0.5 + Math.sin(lat * 10) * 0.12 + fbm(x * 3, y * 3, z * 3, 3) * 0.3))).map;
  },
  Neptune() {
    return paint(S, Hh, (x, y, z, lat, lon) => {
      let c = mix(hex(0x1d3f9e), hex(0x3f6fe0), clamp(0.5 + Math.sin(lat * 8) * 0.15 + fbm(x * 3, y * 3, z * 3, 4) * 0.5));
      const streak = smooth(0.55, 0.9, Math.sin(lat * 40 + fbm(x * 6, y * 6, z * 6, 3) * 4)) * smooth(0.0, 0.25, fbm(x * 4 + 5, y * 9, z * 4, 3));
      c = mix(c, hex(0xe8f2ff), streak * 0.8);
      const e = Math.hypot((lon - 2.2) * Math.cos(lat) / 0.16, (lat + 0.35) / 0.08);
      if (e < 1.3) c = mix(c, hex(0x0d1f5c), smooth(1.3, 0.7, e));
      return c;
    }).map;
  },
};

// Rings: radial strip; profile(r in [0,1]) -> [rgb, alpha]
function ringTex(profile) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 4; const ctx = c.getContext('2d');
  for (let i = 0; i < 512; i++) { const [rgb, a] = profile(i / 511); ctx.fillStyle = `rgba(${rgb.map(Math.round)},${a})`; ctx.fillRect(i, 0, 1, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Saturn ring radii in Saturn radii (approx.): C 1.24-1.53, B 1.53-1.95, Cassini division 1.95-2.03, A 2.03-2.27 (Encke gap ~2.21)
export const SATURN_RING = { inner: 1.24, outer: 2.27 };
export function saturnRingTex() {
  return ringTex(u => {
    const r = 1.24 + u * 1.03, fine = 0.85 + 0.15 * noise(r * 120, 0.5, 0.5);
    if (r < 1.53) return [mix(hex(0x8f7d62), hex(0xb7a27f), (r - 1.24) / 0.29), 0.25 * fine];
    if (r < 1.95) return [mix(hex(0xe9d6a8), hex(0xf6e8c4), noise(r * 40, 1, 1) * 0.5 + 0.5), 0.9 * fine];
    if (r < 2.03) return [hex(0x3a3328), 0.06];
    if (Math.abs(r - 2.215) < 0.008) return [hex(0x3a3328), 0.05];
    return [mix(hex(0xd8c597), hex(0xcbb98c), (r - 2.03) / 0.24), 0.7 * fine];
  });
}
export const URANUS_RING = { inner: 1.6, outer: 2.0 };
export function uranusRingTex() { return ringTex(u => [hex(0xcfe7ee), (Math.abs(u - 0.95) < 0.02 ? 0.5 : 0) + (Math.sin(u * 60) > 0.97 ? 0.25 : 0)]); }

// Ring geometry with radial UVs
export function ringGeometry(inner, outer, seg = 96) {
  const g = new THREE.RingGeometry(inner, outer, seg, 1);
  const pos = g.attributes.position, uv = g.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5); }
  return g;
}

// Soft Pixar-style rim glow shell
export function rimShell(radius, color, power = 2.5, strength = 0.8, seg = 40) {
  const m = new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(color) }, p: { value: power }, s: { value: strength } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); n = normalize(normalMatrix*normal); v = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; uniform float p; uniform float s; varying vec3 n; varying vec3 v; void main(){ float f = pow(1.0 - max(dot(normalize(n), normalize(v)), 0.0), p); gl_FragColor = vec4(c, f*s); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, seg, Math.round(seg * 0.6)), m);
}

const cache = {};
export function tex(name) { if (!(name in cache)) cache[name] = gen[name](); return cache[name]; }
