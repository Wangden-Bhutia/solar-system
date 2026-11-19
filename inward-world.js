// The journey inward in 3D: one scene, every step centred on the next (the zoom always heads for the origin): Earth turned
// so the place is on top, then a chain of pictures from 3,600 km down to one linden leaf (real satellite imagery, then
// AI-made pictures), then the leaf's veins and its surface (drawn), a leaf cell, its nucleus, DNA on its spools, the
// double helix and one carbon atom (built here). Each layer fades in and out over a decade of zoom; a layer is built only when the zoom is
// near it, and freed when it is far away, so a phone never holds all of them.
import { CHAIN, CHAIN_W, TOP_W, toPicture } from './inward-data.js';
export async function createInwardWorld(canvas, { reduced = () => false } = {}) {
  const THREE = await import('./vendor/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 1, 10);
  scene.background = new THREE.Color('#02040c');
  const V = (x, y, z) => new THREE.Vector3(x, y, z), C = c => new THREE.Color(c);
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6); sun.position.set(-3, 5, -2); scene.add(sun, sun.target);
  scene.add(new THREE.AmbientLight(0x8a9ab8, 0.55), new THREE.HemisphereLight(0xdfe8ff, 0x3a2a20, 0.7));
  const rng = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const gauss = r => (r() + r() + r() - 1.5) / 1.5;
  const tex = (url, srgb = true) => { const t = new THREE.TextureLoader().load(url); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const canvasTex = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  // A soft-edged mask: opaque in the middle, fading to transparent over the outer `edge` of each side.
  const maskCache = {}; const edgeMask = (edge, round = false) => maskCache[edge + '' + round] ||= canvasTex(256, (x, n) => { const img = x.createImageData(n, n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const u = i / (n - 1), v = j / (n - 1); let a;
      if (round) { const d = Math.hypot(u - 0.5, v - 0.5) * 2; a = 1 - Math.min(1, Math.max(0, (d - (1 - edge * 2)) / (edge * 2))); }
      else { const e = Math.min(u, v, 1 - u, 1 - v); a = Math.min(1, e / edge); }
      a = a * a * (3 - 2 * a); const k = (j * n + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255 * a; img.data[k + 3] = 255; }
    x.putImageData(img, 0, 0); });
  // A flat picture lying on the ground, seen from above: width w (m), aspect, centred so that pixel (px, py) of an
  // image W × H pixels sits at the origin. Pictures stack in order, the smaller on top.
  let order = 0;
  function flat(map, w, h, cx = 0, cz = 0, edge = 0.06, round = false) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, alphaMap: edgeMask(edge, round), transparent: true, depthWrite: false, depthTest: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(cx, 0, cz); m.renderOrder = ++order; return m;
  }
  const photo = (url, wM, Wpx, Hpx, px, py, edge, round = false) => { const hM = wM * Hpx / Wpx; return flat(tex(url), wM, hM, (Wpx / 2 - px) / Wpx * wM, (Hpx / 2 - py) / Hpx * hM, edge, round); };

  // ---- the layers: [name, fade-in from w, fully in at w, fade-out from w, fully out at w, build] ----
  const LAYERS = [];
  const layer = (name, inFrom, inTo, outFrom, outTo, build) => LAYERS.push({ name, inFrom, inTo, outFrom, outTo, build, obj: null, mats: null });

  // The scene is built in "picture metres" (inward-data.js): real metres at the leaf and below, about 3 times smaller than
  // real by 3,600 km, so the pictures fit each other exactly. The Earth is scaled the same way, to meet the top picture.
  const KT = TOP_W / CHAIN_W.at(-1), R = 6.371e6 / KT, LAT = 48.48, LON = 12.55; /* the countryside north-east of Munich */
  // The Earth's turn that puts a place (lat, lon) at the top of the picture, north up the screen.
  let earthRef = null, earthHome = null, handover = null;
  function orientFor(lat, lon) {
    const ph = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) / 180 * Math.PI, p = V(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
    const q1 = new THREE.Quaternion().setFromUnitVectors(p, V(0, 1, 0)), north = V(0, 1, 0).sub(p.clone().multiplyScalar(p.y)).normalize().applyQuaternion(q1);
    const q2 = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI - Math.atan2(north.x, north.z));
    return q2.multiply(q1);
  }
  const TOPW = CHAIN_W.at(-1);
  layer('earth', Infinity, Infinity, TOPW / 2.5, TOPW / 4, () => {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: tex('textures/earth.webp'), roughness: 0.85 }));
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 96, 64), new THREE.MeshStandardMaterial({ map: tex('textures/earth-clouds.webp'), transparent: true, opacity: 0.5, depthWrite: false }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 64, 48), new THREE.MeshBasicMaterial({ color: C('#5a9aff'), transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }));
    g.add(body, clouds, glow);
    const ori = new THREE.Group(); ori.quaternion.copy(orientFor(LAT, LON)); ori.add(g); ori.position.y = -R; earthRef = ori; earthHome = ori.quaternion.clone();
    const holder = new THREE.Group(); holder.add(ori); holder.userData.update = t => { clouds.rotation.y = t * 0.004; }; return holder;
  });

  // ---- the pictures, from 3,600 km down to one leaf: each sits exactly inside the next ----
  // A picture stays fully shown until the one inside it covers any screen (a wide laptop shows about 3.5 times the
  // phone's width); the inner one fades in over its own patch only, on top, with soft edges, so nothing dips to black.
  { const centre = [[0, 0]]; /* where each picture's centre is, in picture metres (x across, z down the screen) */
    for (let k = 1; k < CHAIN.length; k++) { const [px, pz] = centre[k - 1], [cx, cy] = CHAIN[k].c; centre.push([px - (cx - 0.5) * CHAIN_W[k], pz - (cy - 0.5) * CHAIN_W[k]]); }
    for (let k = CHAIN.length - 1; k >= 0; k--) { const w0 = CHAIN_W[k], top = k === CHAIN.length - 1, inner = k > 0 ? CHAIN_W[k - 1] : 0;
      layer(CHAIN[k].f, top ? w0 * 7 : w0 * 4, top ? w0 * 2.5 : w0 * 2, k > 0 ? inner / 3.5 : 0.022, k > 0 ? inner / 5.5 : 0.011,
        () => flat(tex(`textures/${CHAIN[k].f}.webp`), w0, w0, centre[k][0], centre[k][1], top ? 0.2 : 0.16)); } }

  // ---- the leaf, closer than the photograph can show (drawn) ----
  const LEAFC = [84, 136, 28]; /* the leaf photograph's own green, sampled from it */
  // veins: a 20 mm tile of leaf, repeated to cover any screen (wrapped, so no seam). A few side veins cross it; smaller
  // veins branch off them, and smaller ones off those, each thinner, so no vein ends in the open. Between them the
  // finest veins close into a net of little islands (areoles) about 0.3-0.8 mm across.
  layer('veins', 0.03, 0.014, 2.2e-4, 1.1e-4, () => {
    const tile = canvasTex(2048, (x, n) => {
      const r = rng(41); x.fillStyle = `rgb(${LEAFC.join(',')})`; x.fillRect(0, 0, n, n);
      for (let k = 0; k < 2500; k++) { const u = r() * n, v = r() * n, g = (r() - 0.5) * 14; x.fillStyle = `rgba(${LEAFC[0] + g},${LEAFC[1] + g},${LEAFC[2] + g * 0.5},0.5)`; x.beginPath(); x.arc(u, v, 6 + r() * 30, 0, 6.283); x.fill(); }
      const OFF = [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n], [n, n], [-n, -n], [n, -n], [-n, n]];
      const stroke = (pts, wid, col) => { x.strokeStyle = col; x.lineWidth = wid; for (const [ox, oy] of OFF) { x.beginPath(); pts.forEach(([u, v], q) => q ? x.lineTo(u + ox, v + oy) : x.moveTo(u + ox, v + oy)); x.stroke(); } };
      x.lineJoin = 'round'; x.lineCap = 'round';
      /* the net: walls of an uneven pattern of cells (each the region nearest one of a jittered grid of points), wrapped */
      const G = 30, cs = n / G, P = []; for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) P.push([(i + 0.5 + (r() - 0.5) * 0.95) * cs, (j + 0.5 + (r() - 0.5) * 0.95) * cs]);
      const at = (i, j) => { const q = P[(((j % G) + G) % G) * G + (((i % G) + G) % G)]; return [q[0] + Math.floor(i / G) * n, q[1] + Math.floor(j / G) * n]; };
      const seen = new Set();
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const [sx, sy] = at(i, j); let poly = [[sx - cs * 2, sy - cs * 2], [sx + cs * 2, sy - cs * 2], [sx + cs * 2, sy + cs * 2], [sx - cs * 2, sy + cs * 2]];
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { if (!di && !dj) continue; const q = at(i + di, j + dj), mx = (sx + q[0]) / 2, my = (sy + q[1]) / 2, nx = q[0] - sx, ny = q[1] - sy, out = [], side = p => (p[0] - mx) * nx + (p[1] - my) * ny;
          for (let k = 0; k < poly.length; k++) { const A = poly[k], B = poly[(k + 1) % poly.length], sa = side(A), sb = side(B); if (sa <= 0) out.push(A); if (sa * sb < 0) { const t = sa / (sa - sb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } }
          poly = out; }
        for (let k = 0; k < poly.length; k++) { const A = poly[k], B = poly[(k + 1) % poly.length], key = [A, B].map(p => p.map(c => Math.round(((c % n) + n) % n)).join(',')).sort().join('|'); if (seen.has(key)) continue; seen.add(key);
          if (r() < 0.08) continue; /* a few walls missing, as in a real leaf, where veinlets end inside an island */
          const mx = (A[0] + B[0]) / 2 + (r() - 0.5) * cs * 0.18, my = (A[1] + B[1]) / 2 + (r() - 0.5) * cs * 0.18;
          stroke([A, [(A[0] + mx) / 2, (A[1] + my) / 2], [mx, my], [(B[0] + mx) / 2, (B[1] + my) / 2], B], 2.2, 'rgba(168,204,92,0.5)'); } }
      /* the branching veins: each grows in small curving steps and gives off thinner side veins */
      function vein(px, py, ang, len, wid, depth) { const pts = [[px, py]], steps = Math.max(6, Math.round(len / 18)), kids = [];
        for (let t = 0; t < steps; t++) { ang += (r() - 0.5) * (depth ? 0.35 : 0.08); px += Math.cos(ang) * len / steps; py += Math.sin(ang) * len / steps; pts.push([px, py]);
          if (depth < 2 && t > 1 && r() < (depth ? 0.12 : 0.07)) kids.push([px, py, ang + (r() < 0.5 ? 1 : -1) * (0.9 + r() * 0.5), len * (depth ? 0.25 + r() * 0.2 : 0.09 + r() * 0.08), wid * 0.5, depth + 1]); }
        /* the vein tapers: drawn as a few overlapping pieces, each a little thinner */
        for (let q = 0; q < 3; q++) stroke(pts.slice(Math.floor(q * pts.length / 3), Math.floor((q + 1) * pts.length / 3) + 1), wid * (1 - q * 0.22), `rgba(176,210,96,${0.75 - depth * 0.08})`);
        for (const k of kids) vein(...k); }
      for (let k = 0; k < 3; k++) vein(r() * n, -n * 0.1 + k * n * 0.4, 0.55 + (r() - 0.5) * 0.15, n * 1.25, 15, 0);
    });
    tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(5, 5); return flat(tile, 0.1, 0.1, 0, 0, 0.2);
  });
  // the leaf's skin seen from above: jigsaw-shaped cells about 50 µm across, each with its own wavy outline, locking
  // together with no gaps; and stomata (two bean-shaped guard cells round a slit, about 30 µm long) set between them
  layer('surface', 1.3e-3, 5.5e-4, 1.4e-4, 8e-5, () => flat(canvasTex(2048, (x, n) => {
    const r = rng(53), s = n / 0.0025, cs = 0.00005 * s, G = Math.ceil(n / cs) + 2, seeds = [];
    for (let j = -1; j < G; j++) for (let i = -1; i < G; i++) seeds.push([(i + 0.5 + (r() - 0.5) * 0.9) * cs, (j + 0.5 + (r() - 0.5) * 0.9) * cs, i, j]);
    const at = (i, j) => seeds[(j + 1) * (G + 1) + (i + 1)];
    // each cell is the part of the plane nearer its seed than any neighbour's (cut from a square by the half-way lines)
    const polyOf = (i, j) => { const [sx, sy] = at(i, j); let poly = [[sx - cs * 2, sy - cs * 2], [sx + cs * 2, sy - cs * 2], [sx + cs * 2, sy + cs * 2], [sx - cs * 2, sy + cs * 2]];
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { if (!di && !dj) continue; const q = at(i + di, j + dj); if (!q) continue;
        const mx = (sx + q[0]) / 2, my = (sy + q[1]) / 2, nx = q[0] - sx, ny = q[1] - sy, out = [], side = p => (p[0] - mx) * nx + (p[1] - my) * ny;
        for (let k = 0; k < poly.length; k++) { const A = poly[k], B = poly[(k + 1) % poly.length], sa = side(A), sb = side(B);
          if (sa <= 0) out.push(A); if (sa * sb < 0) { const t = sa / (sa - sb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } }
        poly = out; if (poly.length < 3) break; } return poly; };
    x.fillStyle = 'rgb(140,184,96)'; x.fillRect(0, 0, n, n);
    const edges = new Map();
    for (let j = 0; j < G - 1; j++) for (let i = 0; i < G - 1; i++) { const poly = polyOf(i, j); if (poly.length < 3) continue; const g = (r() - 0.5) * 10;
      x.fillStyle = `rgb(${146 + g},${188 + g},${100 + g * 0.6})`; x.beginPath(); poly.forEach(([u, v], k) => k ? x.lineTo(u, v) : x.moveTo(u, v)); x.fill();
      for (let k = 0; k < poly.length; k++) { const A = poly[k], B = poly[(k + 1) % poly.length], key = [A, B].map(p => p.map(c => Math.round(c)).join(',')).sort().join('|'); if (!edges.has(key)) edges.set(key, [A, B]); } }
    // the wavy walls: each shared wall bends in two to four lobes, the same for both cells (drawn once)
    x.strokeStyle = 'rgba(56,92,30,0.7)'; x.lineWidth = 2.6; x.lineJoin = 'round';
    for (const [A, B] of edges.values()) { const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy); if (L < 1) continue;
      const lobes = 1 + Math.floor(r() * 3), amp = Math.min(L * 0.16, cs * 0.12) * (0.6 + r() * 0.6), nx = -dy / L, ny = dx / L;
      x.beginPath(); for (let t = 0; t <= 1.0001; t += 1 / 24) { const o = amp * Math.sin(t * Math.PI * lobes) * Math.sin(t * Math.PI), u = A[0] + dx * t + nx * o, v = A[1] + dy * t + ny * o; t ? x.lineTo(u, v) : x.moveTo(u, v); } x.stroke(); }
    // stomata, about one for every seven cells, each in its own direction
    for (let k = 0; k < (G * G) / 7; k++) { const u = r() * n, v = r() * n, a = r() * 3.14, L = 0.00003 * s * (0.85 + r() * 0.3);
      x.save(); x.translate(u, v); x.rotate(a);
      x.beginPath(); x.ellipse(0, 0, L * 0.62, L * 0.5, 0, 0, 6.283); x.fillStyle = 'rgb(126,170,84)'; x.fill(); x.strokeStyle = 'rgba(56,92,30,0.6)'; x.lineWidth = 2; x.stroke(); /* the cells round it */
      for (const sd of [-1, 1]) { x.beginPath(); x.ellipse(0, sd * L * 0.17, L * 0.5, L * 0.2, 0, 0, 6.283); x.fillStyle = 'rgb(78,130,42)'; x.fill(); x.strokeStyle = 'rgba(36,64,18,0.8)'; x.lineWidth = 2; x.stroke(); }
      x.beginPath(); x.ellipse(0, 0, L * 0.32, L * 0.05, 0, 0, 6.283); x.fillStyle = 'rgb(24,38,12)'; x.fill(); x.restore(); }
  }), 0.0025, 0.0025, 0, 0, 0.2));

  // ---- built in 3D below this: a living cell, its nucleus, DNA, one atom ----
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color: C(color), roughness: 0.55, ...o });
  // Leaf cells under the skin (palisade cells): tall columns, drawn about 10 µm wide and 36 µm tall, packed side by side but
  // each a little different in width, height and tilt, their walls lined with green chloroplasts. One geometry for all,
  // drawn as instances, so seven hundred cells cost two draw calls.
  const CELL = (() => { const U = 1e-6, geo = new THREE.CapsuleGeometry(1, 6, 8, 24), pc = geo.attributes.position; /* 8 units tall, scaled per cell */
    for (let k = 0; k < pc.count; k++) { const f = 1 + 0.05 * Math.sin(pc.getY(k) * 2.1 + Math.atan2(pc.getZ(k), pc.getX(k)) * 3); pc.setXYZ(k, pc.getX(k) * f, pc.getY(k), pc.getZ(k) * f); } geo.computeVertexNormals();
    return { U, geo, nucGeo: new THREE.SphereGeometry(2.9 * U, 32, 24), cell: M('#86c25a', { transparent: true, opacity: 0.8, depthWrite: false, roughness: 0.3 }), nuc: M('#9a5aa8', { emissive: C('#2a0e30'), emissiveIntensity: 0.6 }),
      chlGeo: new THREE.SphereGeometry(0.75 * U, 12, 8).scale(1, 0.5, 0.75), chl: M('#3f9a2e', { emissive: C('#0e2a08'), emissiveIntensity: 0.5, roughness: 0.5 }) }; })();
  const COLS = (() => { const r = rng(61), U = CELL.U, out = [[0, 0, 5, 36, 0, 0, 0.4]]; /* x, z, radius, height, tilt x, tilt z, nucleus height (fraction) */
    for (let j = -17; j <= 17; j++) for (let i = -15; i <= 15; i++) { const x = (i + (j % 2) * 0.5) * 10.6 * U + (r() - 0.5) * 2.4 * U, z = j * 9.2 * U + (r() - 0.5) * 2.4 * U;
      if (Math.hypot(x, z) < 9 * U || Math.hypot(x, z) > 150 * U || r() < 0.04) continue; /* the cell we enter, the edge, a few air gaps */
      out.push([x, z, 4.3 + r() * 1.2, 30 + r() * 12, (r() - 0.5) * 0.12, (r() - 0.5) * 0.12, 0.2 + r() * 0.6]); }
    return out; })();
  // build some columns: walls, chloroplasts (about 28 per cell, spread over its wall) and, for the cell we enter, its nucleus
  // (in the others it is hidden behind their chloroplasts, as it mostly is under a microscope)
  function columns(list, seed) { const U = CELL.U, r = rng(seed), o = new THREE.Object3D(), q = new THREE.Object3D(), NCH = 28;
    /* each layer gets its own materials: layers fade by setting their materials' opacity, so they must not share them */
    const walls = new THREE.InstancedMesh(CELL.geo, CELL.cell.clone(), list.length), nucs = new THREE.InstancedMesh(CELL.nucGeo, CELL.nuc.clone(), list.length), chl = new THREE.InstancedMesh(CELL.chlGeo, CELL.chl.clone(), list.length * NCH);
    list.forEach(([cx, cz, rad, h, tx, tz, nh], k) => {
      o.position.set(cx, 0, cz); o.rotation.set(tx, r() * 6.283, tz); o.scale.set(rad * U, h * U / 8, rad * U); o.updateMatrix(); walls.setMatrixAt(k, o.matrix);
      const frame = new THREE.Object3D(); frame.position.set(cx, 0, cz); frame.rotation.copy(o.rotation); frame.updateMatrixWorld();
      q.position.set(cx || cz ? rad * 0.25 * U : 0, (nh - 0.5) * h * U * 0.8, 0); q.rotation.set(0, 0, 0); q.scale.setScalar(Math.min(1, rad / 5.6)); q.updateMatrix(); nucs.setMatrixAt(k, frame.matrixWorld.clone().multiply(q.matrix));
      for (let c = 0; c < NCH; c++) { const a = r() * 6.283, y = (r() - 0.5) * h * 0.82 * U, d = rad * 0.82 * U; q.position.set(Math.cos(a) * d, y, Math.sin(a) * d); q.scale.setScalar(1); q.lookAt(0, y, 0); q.updateMatrix();
        chl.setMatrixAt(k * NCH + c, frame.matrixWorld.clone().multiply(q.matrix)); } });
    chl.userData.sub = -0.2; nucs.userData.sub = -0.2; /* drawn before the see-through walls, so the walls tint them */
    const g = new THREE.Group(); g.add(walls, chl); if (list.length === 1) g.add(nucs); else nucs.dispose(); return g; }
  // living leaf cells, packed together, seen from above at a slant; the one at the origin is the one we enter
  layer('cells', 1.6e-4, 7e-5, 2.4e-5, 1.4e-5, () => {
    const g = columns(COLS.slice(1), 100), U = CELL.U;
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(420 * U, 420 * U), M('#2c5220', { roughness: 0.9, transparent: true })); bed.rotation.x = -Math.PI / 2; bed.position.y = -24 * U; bed.userData.sub = -0.5; g.add(bed); /* the spongy layer below, in shadow */
    return g;
  });
  // the one cell we enter: its wall fades away to show the nucleus (at the origin)
  layer('cell', 1.6e-4, 7e-5, 1.6e-5, 9e-6, () => { return columns([[0, 0, 5, 36, 0, 0, 0.5]], 7); });
  // the nucleus, opened up: a thin double wall with pores, and the DNA inside as tangled threads (chromatin)
  layer('nucleus', 1.6e-5, 9e-6, 6e-7, 2.6e-7, () => {
    const g = new THREE.Group(), U = 1e-6, r = rng(67);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(3 * U, 48, 32), M('#b07ac0', { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })));
    const pores = new THREE.InstancedMesh(new THREE.TorusGeometry(0.06 * U, 0.02 * U, 6, 12), M('#6a3a7a'), 160), o = new THREE.Object3D();
    for (let k = 0; k < 160; k++) { const u = r() * 2 - 1, a = r() * 6.283, s2 = Math.sqrt(1 - u * u); o.position.set(s2 * Math.cos(a) * 3 * U, u * 3 * U, s2 * Math.sin(a) * 3 * U); o.lookAt(0, 0, 0); o.updateMatrix(); pores.setMatrixAt(k, o.matrix); } g.add(pores);
    const lines = []; for (let s = 0; s < 22; s++) { let p = s === 0 ? V(0, 0, 0) : V((r() - 0.5) * 4, (r() - 0.5) * 4, (r() - 0.5) * 4).multiplyScalar(U); const d = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      for (let k = 0; k < 260; k++) { d.add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.5)).normalize(); const q = p.clone().addScaledVector(d, 0.09 * U); if (q.length() > 2.8 * U) { d.addScaledVector(q.clone().normalize(), -1).normalize(); continue; } lines.push(p.x, p.y, p.z, q.x, q.y, q.z); p = q; } }
    const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.032 * U, 10, 8), M('#e6a2ee', { emissive: C('#4a1858'), emissiveIntensity: 0.7, roughness: 0.4 }), lines.length / 6), bo = new THREE.Object3D();
    for (let k = 0; k < lines.length / 6; k++) { bo.position.set(lines[k * 6], lines[k * 6 + 1], lines[k * 6 + 2]); bo.updateMatrix(); beads.setMatrixAt(k, bo.matrix); } g.add(beads);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.8 * U, 24, 16), M('#7a3a8a', { transparent: true, opacity: 0.5 })).translateX(1.4 * U).translateY(0.6 * U)); /* the nucleolus */
    return g;
  });
  // DNA on its spools: protein spools (histones, about 11 nm across) with DNA wrapped round each nearly twice
  const SPOOLS = (() => { const r = rng(71), path = [], spools = [];
    for (let k = -6; k <= 5; k++) { const c = V(k * 22 + 11, (r() - 0.5) * 6, (r() - 0.5) * 8); if (k === 0) path.push(V(0, 0, 0)); /* the linker DNA between these two spools passes the origin */
      const rot = new THREE.Euler(Math.PI / 2 + (r() - 0.5), r() * 3, 0); spools.push([c, rot]);
      const ax = V(0, 1, 0).applyEuler(rot), e1 = V(1, 0, 0).applyEuler(rot), e2 = V().crossVectors(ax, e1);
      for (let t = 0; t <= 1; t += 1 / 40) { const a = t * 1.65 * 6.283; path.push(c.clone().addScaledVector(e1, Math.cos(a) * 6.6).addScaledVector(e2, Math.sin(a) * 6.6).addScaledVector(ax, (t - 0.5) * 4)); } }
    const curve = new THREE.CatmullRomCurve3(path), t0 = path.findIndex(p => p.lengthSq() === 0) / (path.length - 1);
    return { curve, spools, axis: curve.getPoint(t0 + 1e-4).sub(curve.getPoint(t0 - 1e-4)).normalize() }; })();
  layer('spools', 1.2e-6, 5e-7, 3e-8, 1.6e-8, () => { /* built in nanometres, then scaled: the curve's maths needs numbers near 1 */
    const g = new THREE.Group(), spoolM = M('#5a86c8', { roughness: 0.45 }), dnaM = M('#e8b0f0', { roughness: 0.4, emissive: C('#3a1a40'), emissiveIntensity: 0.4 }), sg = new THREE.CylinderGeometry(5.5, 5.5, 5.7, 24);
    /* the chain we follow, and about forty more round it (copies turned every way), as chromatin is packed in the nucleus */
    const r = rng(73), places = [[V(0, 0, 0), new THREE.Quaternion()]];
    while (places.length < 42) { const p = V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(1100); if (p.length() > 520 || p.length() < 70) continue;
      places.push([p, new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.283, r() * 6.283, r() * 6.283))]); }
    const spools = new THREE.InstancedMesh(sg, spoolM, places.length * SPOOLS.spools.length), o = new THREE.Object3D(), tube = new THREE.TubeGeometry(SPOOLS.curve, 2400, 1, 8);
    places.forEach(([p, q], k) => { SPOOLS.spools.forEach(([c, rot], i) => { o.position.copy(c).applyQuaternion(q).add(p); o.quaternion.setFromEuler(rot).premultiply(q); o.updateMatrix(); spools.setMatrixAt(k * SPOOLS.spools.length + i, o.matrix); });
      const t = new THREE.Mesh(tube, dnaM); t.position.copy(p); t.quaternion.copy(q); g.add(t); });
    g.add(spools); g.scale.setScalar(1e-9);
    return g;
  });
  // the double helix, atom by atom (B-DNA: 2 nm wide, 10.5 base pairs a turn, 0.34 nm apart); hydrogens left out.
  // One sugar carbon sits at the origin: the atom we zoom into.
  const HELIX = (() => {
    const atoms = [], N = 1e-9, rise = 0.338 * N, twist = 34.3 / 180 * Math.PI, minor = 2.4;
    const add = (el, r0, ang, y) => atoms.push([el, r0 * Math.cos(ang), y, r0 * Math.sin(ang)]);
    for (let b = -14; b <= 14; b++) { const y = b * rise, a = b * twist;
      for (const [s, off] of [[1, 0], [-1, minor]]) { const A = a + off;
        add('P', 0.89 * N, A, y + s * 0.03 * N); for (const [dr, da, dy] of [[0.12, 0.08, 0.06], [0.12, -0.08, -0.06], [-0.05, 0.12, 0.1], [0.05, -0.1, -0.1]]) add('O', (0.89 + dr) * N, A + da, y + dy * N);
        for (let k = 0; k < 4; k++) add('C', (0.72 - k * 0.06) * N, A + 0.2 + k * 0.12, y + s * (0.08 - k * 0.04) * N); add('O', 0.78 * N, A + 0.62, y);
        const tip = A + (s > 0 ? 0.35 : -0.35); for (let k = 0; k < 6; k++) add(k % 3 === 1 ? 'N' : 'C', (0.5 - k * 0.075) * N, tip + (k % 2 ? 0.12 : -0.05), y + (k % 2 ? 0.04 : -0.04) * N);
        if (b % 2 === 0) add('O', 0.3 * N, tip - 0.25, y); } }
    const o = atoms.find(a => a[0] === 'C' && Math.abs(a[2]) < 1e-12); /* a sugar carbon of the middle base pair */
    for (const a of atoms) { a[1] -= o[1]; a[2] -= o[2]; a[3] -= o[3]; } return atoms;
  })();
  const ELEMENT = { C: ['#8a8a8e', 0.11], O: ['#e0443a', 0.1], N: ['#4a70e8', 0.105], P: ['#f0901e', 0.13] };
  layer('helix', 6e-8, 2.4e-8, 1.6e-9, 1.05e-9, () => {
    const g = new THREE.Group(), N = 1e-9, sph = new THREE.SphereGeometry(1, 16, 12), o = new THREE.Object3D();
    g.quaternion.setFromUnitVectors(V(0, 1, 0), SPOOLS.axis); /* lying along the DNA between the two spools */
    for (const [el, [col, rad]] of Object.entries(ELEMENT)) { const list = HELIX.filter(a => a[0] === el); const im = new THREE.InstancedMesh(sph, M(col, { roughness: 0.35 }), list.length);
      list.forEach((a, k) => { o.position.set(a[1], a[2], a[3]); o.scale.setScalar(rad * N); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }); g.add(im); }
    return g;
  });
  // one carbon atom: its six electrons as a cloud of where they are likely to be (two close in, four further out in
  // lobes); the nucleus, 60,000 times smaller, is far too small to draw and is marked by a ring.
  layer('atom', 4e-9, 1.9e-9, 0, 0, () => {
    const g = new THREE.Group(), N = 1e-9, r = rng(83), n = 24000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tc = new THREE.Color();
    const HQ = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), SPOOLS.axis); /* the helix's own turn */
    const nb = HELIX.filter(a => { const d = Math.hypot(a[1], a[2], a[3]); return d > 1e-12 && d < 0.2 * N; }).map(a => V(a[1], a[2], a[3]).applyQuaternion(HQ).normalize());
    for (const d of [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]) if (nb.length < 4) nb.push(V(...d).normalize()); /* its four bonds */
    for (let i = 0; i < n; i++) { let x, y, z; if (r() < 0.1) { /* the two inner electrons, held close */ const rr = -Math.log(r() * r()) * 0.01 * N, u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u); x = rr * s * Math.cos(a); y = rr * u; z = rr * s * Math.sin(a); tc.set('#6a5a40'); } /* dimmer, or they pile up into a white blot */
      else { /* the four outer electrons, a cloud bulging toward each bond */ const d = nb[Math.floor(r() * nb.length)], rr = (0.04 + -Math.log(r() * r()) * 0.05) * N, sp = rr * 0.55; /* about 0.3 nm across in all */
        x = d.x * rr + gauss(r) * sp; y = d.y * rr + gauss(r) * sp; z = d.z * rr + gauss(r) * sp; tc.setHSL(0.57 + r() * 0.04, 0.7, 0.5 + r() * 0.25); }
      pos.set([x, y, z], i * 3); col.set([tc.r, tc.g, tc.b], i * 3); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const dot = canvasTex(64, (x) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }); /* soft round points */
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.022 * N, map: dot, vertexColors: true, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending })));
    /* its bonded neighbours, faint, as clouds too */
    for (const a of HELIX) { const d = Math.hypot(a[1], a[2], a[3]); if (d < 1e-12 || d > 0.32 * N) continue; const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.075 * N, 20, 14), new THREE.MeshBasicMaterial({ color: C(ELEMENT[a[0]][0]), transparent: true, opacity: 0.22, depthWrite: false })); s2.position.set(a[1], a[2], a[3]).applyQuaternion(HQ); g.add(s2); }
    /* the nucleus: a ring that keeps the same size on screen */
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, (x) => { x.strokeStyle = '#f3c887'; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 52, 0, 6.283); x.stroke(); x.fillStyle = '#fff4d8'; x.beginPath(); x.arc(64, 64, 4, 0, 6.283); x.fill(); }), transparent: true, depthTest: false, sizeAttenuation: false }));
    ring.scale.setScalar(0.035); ring.renderOrder = 1e6; g.add(ring); g.userData.update = t => { g.rotation.y = t * 0.08; }; return g;
  });

  // ---- view: Z = ln(width of view in metres) ----
  // w is the width of the view on a tall phone (aspect 0.46); every screen shows the same height, so the same subject fits on a
  // phone, an iPad or a wide laptop, and a wide screen simply shows more to the sides.
  const REF_ASPECT = 0.46;
  let w = toPicture(1.6e7), raf = 0, t0 = 0, W = 1, H = 1, running = false, aspect = 1;
  const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const opacityAt = (L, w2) => { const a = L.inFrom === Infinity ? 1 : sm(0, 1, Math.log(L.inFrom / w2) / Math.log(L.inFrom / L.inTo)), b = L.outFrom === 0 ? 1 : 1 - sm(0, 1, Math.log(L.outFrom / w2) / Math.log(L.outFrom / L.outTo)); return a * b; };
  const near = (L, w2, dec) => (L.inFrom === Infinity || w2 < L.inFrom * Math.pow(10, dec)) && (L.outTo === 0 || w2 > L.outTo / Math.pow(10, dec));
  function manage() {
    for (const L of LAYERS) {
      if (!L.obj && near(L, w, 0.6)) { L.obj = L.build(); L.mats = []; L.obj.traverse(o => { for (const m of [].concat(o.material || [])) { m.userData.base = m.opacity; m.transparent = true; L.mats.push(m); } }); L.obj.traverse(o => { o.renderOrder = L.name === 'earth' ? -1 : 1000 + LAYERS.indexOf(L) + (o.userData.sub || 0); }); /* Earth under the flat maps; the 3D steps over them */ scene.add(L.obj); }
      else if (L.obj && !near(L, w, 1.6)) { scene.remove(L.obj); L.obj.traverse(o => { o.geometry?.dispose?.(); for (const m of [].concat(o.material || [])) { for (const k of ['map', 'alphaMap']) if (m[k] && !Object.values(maskCache).includes(m[k])) m[k].dispose(); m.dispose(); } }); L.obj = null; }
    }
  }
  // The colour behind the micro-world, by zoom: dark green leaf, purple inside the cell, deep blue among the DNA, black for the atom.
  const BG = [[2e-4, '#02040c'], [9e-5, '#10220f'], [1.5e-5, '#241324'], [3e-6, '#1a0f2a'], [4e-7, '#0d1230'], [2e-8, '#070d22'], [3e-9, '#02040c']].map(([x, c]) => [Math.log(x), C(c)]);
  const bgNow = C('#02040c');
  function bgAt(lw) { if (lw >= BG[0][0]) return bgNow.copy(BG[0][1]); if (lw <= BG[BG.length - 1][0]) return bgNow.copy(BG[BG.length - 1][1]);
    for (let k = 0; k < BG.length - 1; k++) if (lw <= BG[k][0] && lw >= BG[k + 1][0]) { const t = (BG[k][0] - lw) / (BG[k][0] - BG[k + 1][0]); return bgNow.copy(BG[k][1]).lerp(BG[k + 1][1], t * t * (3 - 2 * t)); } return bgNow; }
  function size() { W = canvas.clientWidth || 412; H = canvas.clientHeight || 915; renderer.setSize(W, H, false); aspect = W / H; cam.aspect = aspect; cam.setViewOffset(W, H, 0, H * 0.12, W, H); cam.updateProjectionMatrix(); }
  function render(now) {
    // Handed over from the main zoom: the Earth starts turned to the place the main view was on, and turns to the city as we zoom in.
    if (earthRef && handover && handover.wEntry > handover.wCity) { const t = Math.min(1, Math.max(0, Math.log(handover.wEntry / w) / Math.log(handover.wEntry / handover.wCity))); earthRef.quaternion.copy(orientFor(handover.lat, handover.lon)).slerp(earthHome, t); }
    const t = reduced() ? 0 : (now - t0) / 1000; manage(); scene.background = bgAt(Math.log(w));
    for (const L of LAYERS) { if (!L.obj) continue; const a = opacityAt(L, w); L.obj.visible = a > 0.002; if (!L.obj.visible) continue; for (const m of L.mats) m.opacity = m.userData.base * a; L.obj.userData.update?.(t); }
    /* the camera: straight down (north up) until the living cells; then it tilts to show them in 3D, and slowly turns */
    const tilt = sm(Math.log(2.2e-4), Math.log(4e-5), Math.log(w)) * 0.85, az = (0.3 + (reduced() ? 0 : t * 0.04)) * tilt / 0.85; /* north stays up while looking straight down */
    const D = (w / REF_ASPECT) / (2 * Math.tan(cam.fov * Math.PI / 360)), dir = V(Math.sin(tilt) * Math.sin(az), Math.cos(tilt), Math.sin(tilt) * Math.cos(az));
    cam.position.copy(dir.multiplyScalar(D)); cam.up.set(-Math.sin(az), 0, -Math.cos(az)); cam.lookAt(0, 0, 0);
    cam.near = D * (w < 1e-5 ? 0.2 : 0.02); /* in the micro-world, nothing right in front of the lens */ cam.far = D * 60 + (w > 1e4 ? 2 * R : 0); cam.updateProjectionMatrix();
    renderer.render(scene, cam);
  }
  function frame(now) { if (!running) return; raf = requestAnimationFrame(frame); render(now); }
  return {
    setW(x) { w = toPicture(x); if (!running) render(performance.now()); },
    setHandover(h) { handover = h ? { ...h, wEntry: toPicture(h.wEntry), wCity: toPicture(h.wCity) } : null; if (!running) render(performance.now()); },
    get w() { return w; }, /* picture metres */
    get aspect() { return aspect; },
    resize() { size(); if (!running) render(performance.now()); },
    start() { size(); running = true; t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    _layers: () => LAYERS.filter(L => L.obj).map(L => L.name),
  };
}
