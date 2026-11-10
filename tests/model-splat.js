// The CPU splat model from the white-pile measurement probe, kept here for the light regression tests.
// CPU model of what the GPU would draw (additive points/sprites, sRGB-encoded before blending, clamp at 1).
// NOT GPU pixels: a cross-check of the scene graph the app submits. DPR 2 like the browser (min(dpr,2)).
import * as THREE from '../vendor/three.module.min.js';
import { hygWeight } from '../transition.js';
export const PROFILES = { sky: [[0,1],[.12,.95],[.3,.35],[1,0]], cosmos: [[0,1],[.3,.45],[1,0]], galaxy: [[0,1],[.25,.6],[1,0]] };
const prof = (st, r) => { if (r >= 1) return 0; for (let i = 1; i < st.length; i++) if (r <= st[i][0]) { const [a, va] = st[i-1], [b, vb] = st[i]; return va + (vb - va) * (r - a) / (b - a); } return 0; };
const enc = c => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
export function createSplat(W = 412, H = 915, dpr = 2) {
  const w = Math.round(W * dpr), h = Math.round(H * dpr), buf = new Float32Array(w * h * 3);
  const layers = new Map(); // name -> {light (sum rgb in centre), draws, verts}
  const cx0 = Math.floor(w / 4), cx1 = Math.ceil(3 * w / 4), cy0 = Math.floor(h / 4), cy1 = Math.ceil(3 * h / 4);
  const v = new THREE.Vector4(), m = new THREE.Matrix4(), col = new THREE.Color();
  let layerBufs = null;
  function mx(px, py, r, g, b, L) { if (px < 0 || py < 0 || px >= w || py >= h) return; const i = (py * w + px) * 3; const dr = Math.max(0, r - buf[i]), dg = Math.max(0, g - buf[i+1]), db = Math.max(0, b - buf[i+2]); buf[i] += dr; buf[i+1] += dg; buf[i+2] += db; if (px >= cx0 && px < cx1 && py >= cy0 && py < cy1) { L.light += dr + dg + db; if (L.buf) { L.buf[i] += dr; L.buf[i+1] += dg; L.buf[i+2] += db; } } }
  function add(px, py, r, g, b, L) { if (px < 0 || py < 0 || px >= w || py >= h) return; const i = (py * w + px) * 3; buf[i] += r; buf[i+1] += g; buf[i+2] += b; if (px >= cx0 && px < cx1 && py >= cy0 && py < cy1) { L.light += r + g + b; if (L.buf) { L.buf[i] += r; L.buf[i+1] += g; L.buf[i+2] += b; } } }
  function draw(scene, camera, profileOf, nameOf, { perLayer = true, opScale = null } = {}) {
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const P = camera.projectionMatrix, V = camera.matrixWorldInverse;
    scene.traverseVisible(o => {
      const mat = o.material; if (!mat || mat.visible === false || !(mat.opacity > 0)) return;
      if (!(o.isPoints || o.isSprite)) return;
      const isMax = mat.blending === THREE.CustomBlending && mat.blendEquation === THREE.MaxEquation; if (mat.blending !== THREE.AdditiveBlending && !isMax) return; const put = isMax ? mx : add;
      const name = nameOf(o); let L = layers.get(name); if (!L) { L = { light: 0, draws: 0, verts: 0, opacity: 0, buf: perLayer ? new Float32Array(w * h * 3) : null }; layers.set(name, L); }
      L.draws++; L.opacity = Math.max(L.opacity, mat.opacity);
      m.multiplyMatrices(V, o.matrixWorld);
      const mr = mat.color.r, mg = mat.color.g, mb = mat.color.b, op = mat.opacity * (opScale ? opScale(o, name) : 1); if (!(op > 0)) return;
      if (o.isPoints) {
        const pos = o.geometry.attributes.position, c = o.geometry.attributes.color, idx = o.geometry.index, dr = o.geometry.drawRange;
        const hd = o.geometry.attributes.hygDlim, hR = mat.userData.hygR?.value; const N = idx ? idx.count : pos.count, s0 = dr.start, s1 = Math.min(N, s0 + dr.count), size = mat.size * dpr;
        for (let k = s0; k < s1; k++) {
          const j = idx ? idx.getX(k) : k; const hw0 = hd ? hygWeight(hd.getX(j), hR) : 1; if (!(hw0 > 0)) continue; v.set(pos.getX(j), pos.getY(j), pos.getZ(j), 1).applyMatrix4(m).applyMatrix4(P);
          if (v.w <= 0) continue; const x = v.x / v.w, y = v.y / v.w, z = v.z / v.w; if (z < -1 || z > 1 || Math.abs(x) > 1.01 || Math.abs(y) > 1.01) continue;
          L.verts++;
          const px = (x + 1) / 2 * w, py = (1 - y) / 2 * h;
          let r = mr, g = mg, b = mb; if (mat.vertexColors && c) { r *= c.getX(j); g *= c.getY(j); b *= c.getZ(j); }
          r = enc(r * hw0) * op; g = enc(g * hw0) * op; b = enc(b * hw0) * op;
          const xa = Math.ceil(px - size / 2 - 0.5), xb = Math.floor(px + size / 2 - 0.5), ya = Math.ceil(py - size / 2 - 0.5), yb = Math.floor(py + size / 2 - 0.5);
          for (let yy = ya; yy <= Math.max(ya, yb); yy++) for (let xx = xa; xx <= Math.max(xa, xb); xx++) put(xx, yy, r, g, b, L);
        }
      } else {
        v.set(0, 0, 0, 1).applyMatrix4(m); const zv = v.z; v.applyMatrix4(P); if (v.w <= 0) return; const x = v.x / v.w, y = v.y / v.w;
        const sx = new THREE.Vector3().setFromMatrixScale(o.matrixWorld);
        const att = mat.sizeAttenuation !== false; const hw = 0.5 * sx.x * P.elements[0] * (att ? 1 / -zv : 1) * w / 2, hh = 0.5 * sx.y * P.elements[5] * (att ? 1 / -zv : 1) * h / 2;
        const px = (x + 1) / 2 * w, py = (1 - y) / 2 * h; if (px + hw < 0 || px - hw > w || py + hh < 0 || py - hh > h) return;
        L.verts++; L.spritePx = Math.max(L.spritePx || 0, 2 * hw / dpr);
        const st = profileOf(o), r0 = enc(mr) * op, g0 = enc(mg) * op, b0 = enc(mb) * op;
        for (let yy = Math.max(0, Math.floor(py - hh)); yy <= Math.min(h - 1, Math.ceil(py + hh)); yy++) for (let xx = Math.max(0, Math.floor(px - hw)); xx <= Math.min(w - 1, Math.ceil(px + hw)); xx++) {
          const dx = (xx + 0.5 - px) / hw, dy = (yy + 0.5 - py) / hh, a = prof(st, Math.hypot(dx, dy)); if (a > 0) put(xx, yy, r0 * a, g0 * a, b0 * a, L); }
      }
    });
  }
  function white(skip = null) { // share of pixels in the centre box with all channels >= 250/255
    let n = 0, tot = 0, first = null, sx = 0, sy = 0; const T = 250 / 255;
    for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) { const i = (y * w + x) * 3; tot++; let r = buf[i], g = buf[i+1], b = buf[i+2]; if (skip) { r -= skip[i]; g -= skip[i+1]; b -= skip[i+2]; } if (r >= T && g >= T && b >= T) { n++; sx += x; sy += y; } }
    return { share: n / tot, n, centroid: n ? [+(sx / n / dpr).toFixed(1), +(sy / n / dpr).toFixed(1)] : null };
  }
  function whiteFull() { let n = 0; const T = 250 / 255; for (let i = 0; i < buf.length; i += 3) if (buf[i] >= T && buf[i+1] >= T && buf[i+2] >= T) n++; return n / (w * h); }
  function report(topN = 12) {
    const all = white(); const rows = [...layers].map(([k, L]) => ({ layer: k, draws: L.draws, vertsOnScreen: L.verts, opacity: +L.opacity.toFixed(4), spritePx: L.spritePx ? +L.spritePx.toFixed(1) : undefined, centreLight: +L.light.toFixed(1), whiteIfRemoved: L.buf ? +(white(L.buf).share * 100).toFixed(3) : undefined }));
    rows.sort((a, b) => b.centreLight - a.centreLight);
    return { whiteCentrePct: +(all.share * 100).toFixed(3), whitePx: all.n, centroidCss: all.centroid, whiteFullPct: +(whiteFull() * 100).toFixed(3), layers: rows.slice(0, topN) };
  }
  return { draw, report, layers };
}
