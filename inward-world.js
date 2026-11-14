// The journey inward in 3D: one scene measured in metres, every step centred on the next (the zoom always heads for
// the origin): Earth turned so the city is on top, the city, the park, the girl, her hand, her skin (photographs),
// then skin creases, dead skin cells, a living cell, its nucleus, DNA on its spools, the double helix and one
// carbon atom (built here). Each layer fades in and out over a decade of zoom; a layer is built only when the zoom is
// near it, and freed when it is far away, so a phone never holds all of them.
const GRASS = [90, 108, 33];
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
  const photo = (url, wM, Wpx, Hpx, px, py, edge) => { const hM = wM * Hpx / Wpx; return flat(tex(url), wM, hM, (Wpx / 2 - px) / Wpx * wM, (Hpx / 2 - py) / Hpx * hM, edge); };

  // ---- the layers: [name, fade-in from w, fully in at w, fade-out from w, fully out at w, build] ----
  const LAYERS = [];
  const layer = (name, inFrom, inTo, outFrom, outTo, build) => LAYERS.push({ name, inFrom, inTo, outFrom, outTo, build, obj: null, mats: null });

  // Earth, turned so the city (in northern India) is on top and north is up the screen.
  const R = 6.371e6, LAT = 28.6, LON = 77.2;
  layer('earth', Infinity, Infinity, 5e4, 2e4, () => {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: tex('textures/earth.webp'), roughness: 0.85 }));
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 96, 64), new THREE.MeshStandardMaterial({ map: tex('textures/earth-clouds.webp'), transparent: true, opacity: 0.5, depthWrite: false }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 64, 48), new THREE.MeshBasicMaterial({ color: C('#5a9aff'), transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }));
    g.add(body, clouds, glow);
    const ph = (LON + 180) / 360 * Math.PI * 2, th = (90 - LAT) / 180 * Math.PI, p = V(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
    const q1 = new THREE.Quaternion().setFromUnitVectors(p, V(0, 1, 0)), north = V(0, 1, 0).sub(p.clone().multiplyScalar(p.y)).normalize().applyQuaternion(q1);
    const q2 = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI - Math.atan2(north.x, north.z)); /* turn north to -z: up the screen */
    const ori = new THREE.Group(); ori.quaternion.copy(q2.multiply(q1)); ori.add(g); ori.position.y = -R;
    const holder = new THREE.Group(); holder.add(ori); holder.userData.update = t => { clouds.rotation.y = t * 0.004; }; return holder;
  });

  // ---- the city: one map drawn at three scales from the same features, so they line up exactly ----
  const city = (() => {
    const r = rng(11), f = { river: [], greens: [], fields: [], blocks: [] };
    for (let k = -130; k <= 130; k++) { const z = k * 600; f.river.push([1300 + Math.sin(z / 3100) * 900 + Math.sin(z / 870) * 160, z]); }
    for (let k = 0; k < 90; k++) { const a = r() * 6.283, d = 600 + Math.pow(r(), 0.7) * 8500, w = 120 + r() * 520, h = 120 + r() * 420; f.greens.push([Math.cos(a) * d, Math.sin(a) * d, w, h]); }
    for (let k = 0; k < 2600; k++) { const a = r() * 6.283, d = 9800 + Math.pow(r(), 0.8) * 22000; f.fields.push([Math.cos(a) * d, Math.sin(a) * d, 150 + r() * 500, 120 + r() * 380, r()]); }
    return f;
  })();
  const PARK = [-190, -130, 430, 310]; /* x, z, width, depth (m): the girl lies at the origin, on an open lawn */
  const riverX = z => 1300 + Math.sin(z / 3100) * 900 + Math.sin(z / 870) * 160;
  const inGreen = (x, z) => (x > PARK[0] && x < PARK[0] + PARK[2] && z > PARK[1] && z < PARK[1] + PARK[3]) || city.greens.some(([gx, gz, w, h]) => Math.abs(x - gx) < w / 2 && Math.abs(z - gz) < h / 2) || Math.abs(x - riverX(z)) < 210;
  function drawCity(x, n, extent) {
    const s = n / extent, P = (wx, wz) => [n / 2 + wx * s, n / 2 + wz * s], r = rng(5);
    const ROOF = ['#b9b2a6', '#c9c0b0', '#a8a196', '#d2c7b4', '#b48c70', '#9a9a96', '#c8b8a0'];
    x.fillStyle = '#ac9f7e'; x.fillRect(0, 0, n, n);
    for (const [fx, fz, w, h, t] of city.fields) { const [u, v] = P(fx, fz); if (u < -400 || v < -400 || u > n + 400 || v > n + 400) continue; x.fillStyle = t < 0.4 ? '#9c9a68' : t < 0.7 ? '#b2a47c' : t < 0.85 ? '#8e9460' : '#bcac86'; x.fillRect(u, v, w * s, h * s); }
    /* the city: a disc about 9 km across, its texture of rooftops */
    const cityR = 9000, [cu, cv] = P(0, 0);
    const grd = x.createRadialGradient(cu, cv, cityR * s * 0.6, cu, cv, cityR * s * 1.1); grd.addColorStop(0, 'rgba(184,176,160,1)'); grd.addColorStop(1, 'rgba(184,176,160,0)'); x.fillStyle = grd; x.beginPath(); x.arc(cu, cv, cityR * s * 1.1, 0, 6.283); x.fill();
    if (s < 0.1) { const img = x.getImageData(0, 0, n, n), d = img.data; for (let i = 0; i < d.length; i += 4) { const k = (r() - 0.5) * 34; d[i] += k; d[i + 1] += k; d[i + 2] += k; } x.putImageData(img, 0, 0); }
    else { /* individual buildings in a grid of streets (streets every ~150 m), skipping parks and the river */
      const step = 150, lim = extent / 2 + step; for (let gx = -lim; gx < lim; gx += step) for (let gz = -lim; gz < lim; gz += step) { if (Math.hypot(gx, gz) > cityR) continue; const rr = rng(((gx * 73856093) ^ (gz * 19349663)) >>> 0);
        for (let bx = gx + 8; bx < gx + step - 14; bx += 12 + rr() * 10) for (let bz = gz + 8; bz < gz + step - 14; bz += 12 + rr() * 10) { if (inGreen(bx, bz)) continue; const w = 8 + rr() * 9, h = 8 + rr() * 9, [u, v] = P(bx, bz); if (u < -20 || v < -20 || u > n + 20 || v > n + 20) continue;
          x.fillStyle = 'rgba(40,36,30,0.35)'; x.fillRect(u + 2.5 * s, v + 2.5 * s, w * s, h * s); x.fillStyle = ROOF[Math.floor(rr() * ROOF.length)]; x.fillRect(u, v, w * s, h * s);
          if (rr() < 0.25 && s > 0.6) { x.fillStyle = rr() < 0.5 ? '#2a3a5a' : '#e8e4dc'; x.beginPath(); x.arc(u + w * s * 0.7, v + h * s * 0.3, 1.1 * s, 0, 6.283); x.fill(); } /* water tanks on the roofs */ } } }
    /* streets: a grid every 150 m (minor) and 900 m (major), and a ring road */
    x.save(); x.beginPath(); x.arc(cu, cv, cityR * s, 0, 6.283); x.clip();
    x.strokeStyle = '#6e6a64'; for (const [step, wid, col] of [[150, 7, s < 0.1 ? 'rgba(122,118,110,0.45)' : '#7a766e'], [900, 22, '#5a5852']]) { if (step * s < 3) continue; x.strokeStyle = col; x.lineWidth = Math.max(1, wid * s); const lim = Math.min(extent / 2 + step, cityR);
      for (let k = -lim; k <= lim; k += step) { x.beginPath(); x.moveTo(...P(k, -lim)); x.lineTo(...P(k, lim)); x.stroke(); x.beginPath(); x.moveTo(...P(-lim, k)); x.lineTo(...P(lim, k)); x.stroke(); } }
    x.restore(); x.strokeStyle = '#55524c'; x.lineWidth = Math.max(1.5, 34 * s); x.beginPath(); x.arc(cu, cv, 6200 * s, 0, 6.283); x.stroke();
    /* green spaces, the park, the river with sandy banks */
    for (const [gx, gz, w, h] of city.greens) { const [u, v] = P(gx - w / 2, gz - h / 2); x.fillStyle = '#4e6e2e'; x.fillRect(u, v, w * s, h * s); }
    { const [u, v] = P(PARK[0], PARK[1]); x.fillStyle = '#5a7a2e'; x.fillRect(u, v, PARK[2] * s, PARK[3] * s); }
    for (const [wid, col] of [[420, '#c8b88a'], [300, '#4a7088']]) { x.strokeStyle = col; x.lineWidth = wid * s; x.lineJoin = 'round'; x.beginPath(); city.river.forEach(([rx, rz], k) => { const [u, v] = P(rx, rz); if (k) x.lineTo(u, v); else x.moveTo(u, v); }); x.stroke(); }
  }
  /* the park itself, drawn in detail: mown lawn, paths, trees with their shadows, a pond; open lawn round the origin */
  function drawPark(x, n, extent) {
    drawCity(x, n, extent); const s = n / extent, P = (wx, wz) => [n / 2 + wx * s, n / 2 + wz * s], r = rng(23);
    const [u0, v0] = P(PARK[0], PARK[1]); x.fillStyle = `rgb(${GRASS[0] + 6},${GRASS[1] + 10},${GRASS[2] + 8})`; x.fillRect(u0, v0, PARK[2] * s, PARK[3] * s);
    for (let k = 0; k < PARK[2]; k += 6) { x.fillStyle = k % 12 ? 'rgba(255,255,220,0.05)' : 'rgba(0,30,0,0.05)'; x.fillRect(u0 + k * s, v0, 6 * s, PARK[3] * s); } /* mowing stripes */
    x.strokeStyle = '#d8ccb0'; x.lineWidth = 3.5 * s; x.lineCap = 'round';
    for (const path of [[[PARK[0], 60], [-60, 40], [40, 70], [PARK[0] + PARK[2], 40]], [[30, PARK[1]], [60, -20], [90, 80], [70, PARK[1] + PARK[3]]], [[PARK[0], -70], [-80, -40], [0, -60]]]) { x.beginPath(); path.forEach(([px, pz], k) => { const [u, v] = P(px, pz); if (k) x.lineTo(u, v); else x.moveTo(u, v); }); x.stroke(); }
    { const [u, v] = P(150, -60); x.fillStyle = '#4a7a8a'; x.beginPath(); x.ellipse(u, v, 38 * s, 24 * s, 0.3, 0, 6.283); x.fill(); x.strokeStyle = '#8a8270'; x.lineWidth = 1.5 * s; x.stroke(); }
    for (let k = 0; k < 170; k++) { const tx = PARK[0] + 8 + r() * (PARK[2] - 16), tz = PARK[1] + 8 + r() * (PARK[3] - 16), cr = 3 + r() * 5; if (Math.hypot(tx, tz) < 28 || Math.hypot(tx - 150, tz + 60) < 45) continue; const [u, v] = P(tx, tz);
      x.fillStyle = 'rgba(20,30,10,0.4)'; x.beginPath(); x.arc(u + cr * 0.5 * s, v + cr * 0.6 * s, cr * s, 0, 6.283); x.fill();
      const g2 = x.createRadialGradient(u - cr * 0.3 * s, v - cr * 0.3 * s, 0, u, v, cr * s); g2.addColorStop(0, '#6a9a3a'); g2.addColorStop(1, '#2e5418'); x.fillStyle = g2; x.beginPath(); x.arc(u, v, cr * s, 0, 6.283); x.fill(); }
    /* the girl, from far above: a dot of yellow on the grass */
    const [gu, gv] = P(0.05, -0.25); x.fillStyle = '#f0c840'; x.beginPath(); x.ellipse(gu, gv, Math.max(1, 0.22 * s), Math.max(1.5, 0.4 * s), 0, 0, 6.283); x.fill();
  }
  layer('region', 9e5, 3e5, 8e3, 4e3, () => flat(canvasTex(2048, (x, n) => drawCity(x, n, 140000)), 140000, 140000, 0, 0, 0.18, true));
  layer('metro', 1.2e5, 6e4, 2.5e3, 1.2e3, () => flat(canvasTex(2048, (x, n) => drawCity(x, n, 30000)), 30000, 30000, 0, 0, 0.2, true));
  layer('district', 1.4e4, 6e3, 260, 120, () => flat(canvasTex(2048, (x, n) => drawCity(x, n, 6000)), 6000, 6000, 0, 0, 0.2, true));
  layer('park', 1.4e3, 600, 9, 3.5, () => flat(canvasTex(2048, (x, n) => drawPark(x, n, 600)), 600, 600, 0, 0, 0.2, true));
  // the lawn round the girl: grass blades and a few daisies, close to the photograph's own grass
  layer('lawn', 60, 22, 2.5, 1.2, () => flat(canvasTex(2048, (x, n) => {
    const r = rng(31); x.fillStyle = `rgb(${GRASS.join(',')})`; x.fillRect(0, 0, n, n);
    const img = x.getImageData(0, 0, n, n), d = img.data; for (let i = 0; i < d.length; i += 4) { const l = r(), k = l < 0.3 ? -38 : l < 0.75 ? 4 : 40; d[i] += k * 0.8; d[i + 1] += k; d[i + 2] += k * 0.35; } x.putImageData(img, 0, 0);
  }), 40, 40, 0, 0, 0.2, true));
  // the turf close round her: a tile of grass 40 cm square, repeated, so it stays sharp from 6 m down to 1 cm. Tapered
  // blades 2-4 mm wide and 3-8 cm long in the photographs' greens (sampled from them).
  layer('turf', 6, 2.5, 0.02, 0.01, () => { const T = 0.4, map = canvasTex(1024, (x, n) => {
    const r = rng(37), s = n / T; x.fillStyle = 'rgb(26,38,2)'; x.fillRect(0, 0, n, n);
    const TONES = [[50, 70, 10], [76, 102, 18], [94, 124, 26], [116, 148, 36], [140, 170, 58], [164, 188, 76]], COUNT = 4500;
    const blade = (u, v, a, L, w, bend, g) => { const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, mx = u + ca * L * 0.5 + nx * bend * L * 0.3, my = v + sa * L * 0.5 + ny * bend * L * 0.3, ex = u + ca * L + nx * bend * L * 0.5, ey = v + sa * L + ny * bend * L * 0.5;
      const gr = x.createLinearGradient(u, v, ex, ey); gr.addColorStop(0, g[0]); gr.addColorStop(1, g[1]); x.fillStyle = gr;
      x.beginPath(); x.moveTo(u + nx * w / 2, v + ny * w / 2); x.quadraticCurveTo(mx + nx * w * 0.4, my + ny * w * 0.4, ex, ey); x.quadraticCurveTo(mx - nx * w * 0.4, my - ny * w * 0.4, u - nx * w / 2, v - ny * w / 2); x.fill(); };
    for (let k = 0; k < COUNT; k++) { const u = r() * n, v = r() * n, a = r() * 6.283, L = (0.03 + r() * 0.05) * s, w = (0.002 + r() * 0.002) * s, bend = (r() - 0.5) * 0.6;
      const q = r(), [cr, cg, cb] = TONES[q < 0.1 ? 0 : q < 0.3 ? 1 : q < 0.55 ? 2 : q < 0.78 ? 3 : q < 0.93 ? 4 : 5], g = [`rgb(${cr * 0.55},${cg * 0.55},${cb * 0.55})`, `rgb(${cr},${cg},${cb})`];
      for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) { const bu = u + ox, bv = v + oy; if (bu + L < 0 || bv + L < 0 || bu - L > n || bv - L > n) continue; blade(bu, bv, a, L, w, bend, g); } }
  }); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(8 / T, 8 / T); return flat(map, 8, 8, 0, 0, 0.15, true); });
  // the three photographs (illustrations made for the app), each placed so the next one's centre sits at the origin
  layer('girl', 6, 2.6, 0.1, 0.05, () => photo('textures/inward-girl.webp', 0.724, 1448, 1086, 557, 972, 0.08));
  layer('hand', 0.55, 0.24, 0.025, 0.013, () => photo('textures/inward-hand.webp', 0.17, 1448, 1086, 705, 523, 0.09));
  layer('skin', 0.13, 0.065, 2.5e-3, 1.3e-3, () => photo('textures/inward-skin.webp', 0.058, 1448, 1086, 724, 543, 0.1));
  // skin close up: a network of creases (coarse ones about 0.6 mm apart, finer ones between) and a fine hair
  const SKIN = [200, 148, 115];
  layer('creases', 0.014, 0.0065, 2.2e-4, 1.1e-4, () => flat(canvasTex(2048, (x, n) => {
    const r = rng(41); x.fillStyle = `rgb(${SKIN.join(',')})`; x.fillRect(0, 0, n, n); const s = n / 0.008;
    for (let k = 0; k < 2500; k++) { const u = r() * n, v = r() * n, g = (r() - 0.5) * 18; x.fillStyle = `rgba(${SKIN[0] + g},${SKIN[1] + g},${SKIN[2] + g},0.5)`; x.beginPath(); x.arc(u, v, 6 + r() * 30, 0, 6.283); x.fill(); }
    for (const [spacing, wid, a] of [[0.0006 * s, 3.2, 0.45], [0.00022 * s, 1.4, 0.3]]) { x.strokeStyle = `rgba(120,70,48,${a})`; x.lineWidth = wid;
      for (const ang of [0.5, -0.45, 1.4]) { const cs = Math.cos(ang), sn = Math.sin(ang); for (let k = -n * 1.5; k < n * 1.5; k += spacing * (0.7 + r() * 0.6)) { x.beginPath(); let px = n / 2 + cs * -n * 1.5 - sn * k, py = n / 2 + sn * -n * 1.5 + cs * k; x.moveTo(px, py); for (let t = 0; t < 60; t++) { px += cs * n * 0.05 + (r() - 0.5) * 6; py += sn * n * 0.05 + (r() - 0.5) * 6; x.lineTo(px, py); } x.stroke(); } } }
    /* a fine hair, about 0.03 mm thick, growing from its follicle */
    x.strokeStyle = 'rgba(70,40,25,0.55)'; x.lineWidth = 0.00003 * s; x.lineCap = 'round'; x.beginPath(); x.moveTo(n * 0.55, n * 0.57); x.bezierCurveTo(n * 0.62, n * 0.5, n * 0.7, n * 0.47, n * 0.86, n * 0.42); x.stroke();
    x.fillStyle = 'rgba(110,60,40,0.5)'; x.beginPath(); x.arc(n * 0.55, n * 0.57, 0.00004 * s, 0, 6.283); x.fill();
  }), 0.008, 0.008, 0, 0, 0.12));
  // the outer layer: flat dead cells about 30-40 µm across, overlapping like tiles, some edges lifting
  layer('flakes', 1.3e-3, 5.5e-4, 1.3e-4, 6e-5, () => flat(canvasTex(2048, (x, n) => {
    const r = rng(53), s = n / 0.001; x.fillStyle = `rgb(${SKIN[0] - 10},${SKIN[1] - 12},${SKIN[2] - 10})`; x.fillRect(0, 0, n, n);
    const cell = 0.000034 * s, pts = []; for (let j = -1; j < n / (cell * 0.87) + 1; j++) for (let i = -1; i < n / cell + 1; i++) pts.push([(i + (j % 2) * 0.5) * cell + (r() - 0.5) * cell * 0.35, j * cell * 0.87 + (r() - 0.5) * cell * 0.35]);
    pts.sort(() => r() - 0.5);
    for (const [u, v] of pts) { const sides = 6, rad = cell * (0.58 + r() * 0.1), rot = r() * 6.283, g = (r() - 0.5) * 20; x.beginPath(); for (let k = 0; k < sides; k++) { const a = rot + k / sides * 6.283, rr = rad * (0.88 + r() * 0.2); const px = u + Math.cos(a) * rr, py = v + Math.sin(a) * rr; if (k) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath();
      x.fillStyle = `rgb(${SKIN[0] + 18 + g},${SKIN[1] + 22 + g},${SKIN[2] + 26 + g})`; x.fill(); x.strokeStyle = 'rgba(120,80,60,0.45)'; x.lineWidth = 2.2; x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.08)'; x.beginPath(); x.arc(u - rad * 0.2, v - rad * 0.2, rad * 0.5, 0, 6.283); x.fill(); }
  }), 0.001, 0.001, 0, 0, 0.12));

  // ---- built in 3D below this: a living cell, its nucleus, DNA, one atom ----
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color: C(color), roughness: 0.55, ...o });
  const CELL = (() => { const U = 1e-6, geo = new THREE.IcosahedronGeometry(5.6 * U, 3), pc = geo.attributes.position;
    for (let k = 0; k < pc.count; k++) { const f = 1 + 0.07 * Math.sin(pc.getX(k) / U * 1.7) * Math.sin(pc.getY(k) / U * 1.3); pc.setXYZ(k, pc.getX(k) * f, pc.getY(k) * f * 0.8, pc.getZ(k) * f); } geo.computeVertexNormals();
    return { geo, nucGeo: new THREE.SphereGeometry(2.9 * U, 32, 24), cell: M('#f2c4b4', { transparent: true, opacity: 0.5, depthWrite: false }), nuc: M('#9a5aa8', { emissive: C('#2a0e30'), emissiveIntensity: 0.6 }) }; })();
  // living skin cells (about 10 µm), packed together, each with its nucleus; the one at the origin is the one we enter
  layer('cells', 1.6e-4, 7e-5, 2.4e-5, 1.4e-5, () => {
    const g = new THREE.Group(), r = rng(61), U = 1e-6;
    for (let i = -4; i <= 4; i++) for (let k = -4; k <= 4; k++) { if (!i && !k) continue; const c = new THREE.Group(); c.position.set(i * 11 * U + (r() - 0.5) * 2.5 * U, (r() - 0.5) * 1.5 * U, k * 11 * U + (r() - 0.5) * 2.5 * U); c.rotation.set(r() * 3, r() * 3, r() * 3);
      c.add(new THREE.Mesh(CELL.geo, CELL.cell), new THREE.Mesh(CELL.nucGeo, CELL.nuc)); g.add(c); }
    return g;
  });
  // the one cell we enter: its outer membrane fades away to show the nucleus
  layer('cell', 1.6e-4, 7e-5, 1.2e-5, 7e-6, () => { const g = new THREE.Group(); g.add(new THREE.Mesh(CELL.geo, CELL.cell.clone()), new THREE.Mesh(CELL.nucGeo, CELL.nuc.clone())); return g; });
  // the nucleus, opened up: a thin double wall with pores, and the DNA inside as tangled threads (chromatin)
  layer('nucleus', 1.6e-5, 9e-6, 6e-7, 2.6e-7, () => {
    const g = new THREE.Group(), U = 1e-6, r = rng(67);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(3 * U, 48, 32), M('#b07ac0', { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })));
    const pores = new THREE.InstancedMesh(new THREE.TorusGeometry(0.06 * U, 0.02 * U, 6, 12), M('#6a3a7a'), 160), o = new THREE.Object3D();
    for (let k = 0; k < 160; k++) { const u = r() * 2 - 1, a = r() * 6.283, s2 = Math.sqrt(1 - u * u); o.position.set(s2 * Math.cos(a) * 3 * U, u * 3 * U, s2 * Math.sin(a) * 3 * U); o.lookAt(0, 0, 0); o.updateMatrix(); pores.setMatrixAt(k, o.matrix); } g.add(pores);
    const lines = []; for (let s = 0; s < 22; s++) { let p = s === 0 ? V(0, 0, 0) : V((r() - 0.5) * 4, (r() - 0.5) * 4, (r() - 0.5) * 4).multiplyScalar(U); const d = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      for (let k = 0; k < 260; k++) { d.add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.5)).normalize(); const q = p.clone().addScaledVector(d, 0.09 * U); if (q.length() > 2.8 * U) { d.addScaledVector(q.clone().normalize(), -1).normalize(); continue; } lines.push(p.x, p.y, p.z, q.x, q.y, q.z); p = q; } }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C('#e8a0f0'), transparent: true, opacity: 0.75 })));
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
    for (const [c, rot] of SPOOLS.spools) { const m = new THREE.Mesh(sg, spoolM); m.position.copy(c); m.rotation.copy(rot); g.add(m); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(SPOOLS.curve, 2400, 1, 8), dnaM)); g.scale.setScalar(1e-9);
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
    const g = new THREE.Group(), N = 1e-9, r = rng(83), n = 16000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tc = new THREE.Color();
    const HQ = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), SPOOLS.axis); /* the helix's own turn */
    const nb = HELIX.filter(a => { const d = Math.hypot(a[1], a[2], a[3]); return d > 1e-12 && d < 0.2 * N; }).map(a => V(a[1], a[2], a[3]).applyQuaternion(HQ).normalize());
    for (const d of [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]) if (nb.length < 4) nb.push(V(...d).normalize()); /* its four bonds */
    for (let i = 0; i < n; i++) { let x, y, z; if (r() < 0.2) { /* the two inner electrons, held close */ const rr = -Math.log(r() * r()) * 0.008 * N, u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u); x = rr * s * Math.cos(a); y = rr * u; z = rr * s * Math.sin(a); tc.set('#ffe6b0'); }
      else { /* the four outer electrons, a cloud bulging toward each bond */ const d = nb[Math.floor(r() * nb.length)], rr = (0.015 + -Math.log(r() * r()) * 0.035) * N, sp = rr * 0.75;
        x = d.x * rr + gauss(r) * sp; y = d.y * rr + gauss(r) * sp; z = d.z * rr + gauss(r) * sp; tc.setHSL(0.58, 0.55, 0.55 + r() * 0.3); }
      pos.set([x, y, z], i * 3); col.set([tc.r, tc.g, tc.b], i * 3); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.012 * N, vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })));
    /* its bonded neighbours, faint, as clouds too */
    for (const a of HELIX) { const d = Math.hypot(a[1], a[2], a[3]); if (d < 1e-12 || d > 0.32 * N) continue; const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.075 * N, 20, 14), new THREE.MeshBasicMaterial({ color: C(ELEMENT[a[0]][0]), transparent: true, opacity: 0.12, depthWrite: false })); s2.position.set(a[1], a[2], a[3]).applyQuaternion(HQ); g.add(s2); }
    /* the nucleus: a ring that keeps the same size on screen */
    const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, (x) => { x.strokeStyle = '#f3c887'; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 52, 0, 6.283); x.stroke(); x.fillStyle = '#fff4d8'; x.beginPath(); x.arc(64, 64, 4, 0, 6.283); x.fill(); }), transparent: true, depthTest: false, sizeAttenuation: false }));
    ring.scale.setScalar(0.035); ring.renderOrder = 1e6; g.add(ring); g.userData.update = t => { g.rotation.y = t * 0.08; }; return g;
  });

  // ---- view: Z = ln(width of view in metres) ----
  let w = 1.6e7, raf = 0, t0 = 0, W = 1, H = 1, running = false, aspect = 1;
  const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const opacityAt = (L, w2) => { const a = L.inFrom === Infinity ? 1 : sm(0, 1, Math.log(L.inFrom / w2) / Math.log(L.inFrom / L.inTo)), b = L.outFrom === 0 ? 1 : 1 - sm(0, 1, Math.log(L.outFrom / w2) / Math.log(L.outFrom / L.outTo)); return a * b; };
  const near = (L, w2, dec) => (L.inFrom === Infinity || w2 < L.inFrom * Math.pow(10, dec)) && (L.outTo === 0 || w2 > L.outTo / Math.pow(10, dec));
  function manage() {
    for (const L of LAYERS) {
      if (!L.obj && near(L, w, 0.6)) { L.obj = L.build(); L.mats = []; L.obj.traverse(o => { for (const m of [].concat(o.material || [])) { m.userData.base = m.opacity; m.transparent = true; L.mats.push(m); } }); L.obj.traverse(o => { if (!o.renderOrder) o.renderOrder = L.name === 'earth' ? -1 : 1000; }); /* Earth under the flat maps; the 3D steps over them */ scene.add(L.obj); }
      else if (L.obj && !near(L, w, 1.6)) { scene.remove(L.obj); L.obj.traverse(o => { o.geometry?.dispose?.(); for (const m of [].concat(o.material || [])) { for (const k of ['map', 'alphaMap']) if (m[k] && !Object.values(maskCache).includes(m[k])) m[k].dispose(); m.dispose(); } }); L.obj = null; }
    }
  }
  function size() { W = canvas.clientWidth || 412; H = canvas.clientHeight || 915; renderer.setSize(W, H, false); aspect = W / H; cam.aspect = aspect; cam.setViewOffset(W, H, 0, H * 0.12, W, H); cam.updateProjectionMatrix(); }
  function render(now) {
    const t = reduced() ? 0 : (now - t0) / 1000; manage();
    for (const L of LAYERS) { if (!L.obj) continue; const a = opacityAt(L, w); L.obj.visible = a > 0.002; if (!L.obj.visible) continue; for (const m of L.mats) m.opacity = m.userData.base * a; L.obj.userData.update?.(t); }
    /* the camera: straight down (north up) until the living cells; then it tilts to show them in 3D, and slowly turns */
    const tilt = sm(Math.log(2.2e-4), Math.log(4e-5), Math.log(w)) * 0.85, az = (0.3 + (reduced() ? 0 : t * 0.04)) * tilt / 0.85; /* north stays up while looking straight down */
    const D = w / (2 * Math.tan(cam.fov * Math.PI / 360) * Math.min(1, aspect)), dir = V(Math.sin(tilt) * Math.sin(az), Math.cos(tilt), Math.sin(tilt) * Math.cos(az));
    cam.position.copy(dir.multiplyScalar(D)); cam.up.set(-Math.sin(az), 0, -Math.cos(az)); cam.lookAt(0, 0, 0);
    cam.near = D * 0.02; cam.far = D * 60 + (w > 1e5 ? 2 * R : 0); cam.updateProjectionMatrix();
    renderer.render(scene, cam);
  }
  function frame(now) { if (!running) return; raf = requestAnimationFrame(frame); render(now); }
  return {
    setW(x) { w = x; if (!running) render(performance.now()); },
    get w() { return w; },
    resize() { size(); if (!running) render(performance.now()); },
    start() { size(); running = true; t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    _layers: () => LAYERS.filter(L => L.obj).map(L => L.name),
  };
}
