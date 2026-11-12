// The cosmic year in 3D: one WebGL scene, one stage per era laid out along a line, and a camera that flies from stage to stage.
// Built on first open (three.js itself is already loaded by the app). The 2D backdrop in cosmic-backdrop.js shows until it is ready, and stays as the fallback.
import { EVENTS } from './cosmic-calendar.js';

const STAGE_GAP = 6000;
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

export async function createWorld(canvas, { reduced = () => false } = {}) {
  const THREE = await import('./vendor/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(58, 1, 0.5, 9000);
  scene.fog = new THREE.Fog(0x02040c, 200, 1600); scene.background = new THREE.Color(0x02040c);
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.4), amb = new THREE.AmbientLight(0x6b7fa8, 0.55); sun.position.set(4, 1.5, 3); scene.add(sun, amb);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), C = c => new THREE.Color(c);
  const add = THREE.AdditiveBlending;

  // shared bits
  // Opaque grey gradient, used with additive blending: iOS turns near-transparent canvas pixels into coloured speckles.
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.25, '#8c8c8c'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.premultiplyAlpha = false; return t; })();
  const glow = (color, size, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: C(color), blending: add, transparent: true, opacity, depthWrite: false, fog: false })); s.scale.setScalar(size); return s; };
  const cloud = (n, fn, { size = 2, opacity = 1, fog = true } = {}) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), tmp = new THREE.Color();
    for (let i = 0; i < n; i++) { const o = fn(i, tmp); pos[i * 3] = o[0]; pos[i * 3 + 1] = o[1]; pos[i * 3 + 2] = o[2]; col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, opacity, blending: add, depthWrite: false, sizeAttenuation: true, fog }));
  };
  const sphereDir = r => { const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u); return [s * Math.cos(a), u, s * Math.sin(a)]; };
  const gauss = r => (r() + r() + r() - 1.5) / 1.5;

  // Earth, with land-only city lights sampled from the colour map
  const tl = new THREE.TextureLoader(), photo = f => { const t = tl.load(`textures/${f}.webp`); t.colorSpace = THREE.SRGBColorSpace; return t; };
  let land = null; const landReady = [];
  { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 256, 128); const d = x.getImageData(0, 0, 256, 128).data, pts = []; for (let j = 8; j < 112; j++) for (let i = 0; i < 256; i++) { const k = (j * 256 + i) * 4, r = d[k], g = d[k + 1], b = d[k + 2]; if ((r + g > b * 1.5 || g > b) && !(r > 190 && g > 190 && b > 190)) pts.push([i / 256, j / 128]); } land = pts; landReady.forEach(f => f()); }; img.src = 'textures/earth.webp'; }
  const ll = (lat, lon, r) => { const ph = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) / 180 * Math.PI; return V(-Math.cos(ph) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r); };
  const earthMap = photo('earth'), cloudMap = photo('earth-clouds');
  function earth({ tint = '#ffffff', emissive = '#000000', glowColor = '#5aa0ff', clouds = 0, lights = 0, marker = false, r0 = 100 } = {}) {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(r0, 64, 48), new THREE.MeshStandardMaterial({ map: earthMap, color: C(tint), emissive: C(emissive), roughness: 0.85, metalness: 0 }));
    g.add(body); g.userData.body = body;
    if (clouds) { const cl = new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.012, 64, 48), new THREE.MeshStandardMaterial({ map: cloudMap, transparent: true, opacity: clouds, depthWrite: false, roughness: 1 })); g.add(cl); g.userData.clouds = cl; }
    const halo = glow(glowColor, r0 * 3.0, 0.28); g.add(halo); g.userData.halo = halo;
    const atm = new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.035, 48, 32), new THREE.ShaderMaterial({ transparent: true, blending: add, depthWrite: false, uniforms: { c: { value: C(glowColor) } }, vertexShader: 'varying vec3 n,v;void main(){n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}', fragmentShader: 'uniform vec3 c;varying vec3 n,v;void main(){float f=pow(1.-abs(dot(n,v)),3.2);gl_FragColor=vec4(c,f*1.1);}' })); g.add(atm);
    const addLights = () => { if (!lights || !land) return; const r = rng(77), n = lights, seeds = Math.max(4, Math.floor(n / 14)); const S = Array.from({ length: seeds }, () => land[Math.floor(r() * land.length)]); const pts = cloud(n, (i, col) => { const s = S[i % seeds], u = s[0] + gauss(r) * 0.018, v = s[1] + gauss(r) * 0.012; const p = ll(90 - v * 180, u * 360 - 180, r0 * 1.004); col.set(r() > 0.2 ? '#ffd68a' : '#fff4d6'); return [p.x, p.y, p.z]; }, { size: 1.5, opacity: 0.95, fog: false }); g.add(pts); };
    if (lights) { if (land) addLights(); else landReady.push(addLights); }
    if (marker) { const m = glow('#ffffff', 26, 1), p = ll(26.7, 88.4, r0 * 1.01); m.position.copy(p); g.add(m); g.userData.marker = m; }
    return g;
  }

  // The 18 stages. Each returns { group, pose: { pos, look }, fog: [colour, near, far], update(t) }.
  const R = rng(5), stages = {};
  // The Big Bang, as a 12-second loop. The Big Bang was not an explosion at one place in empty space: space itself
  // began stretching, everywhere at once, so there is no outside to watch it from. Everything we can see today was
  // once packed into something smaller than an atom, so it begins as one tiny point of light, trembling, held back.
  // Then it bursts and the light floods the whole view: we are inside it. Glowing matter rushes away on every side,
  // fast at first and then gently slowing, cooling from white to gold to red, every speck moving away from every
  // other (seen from anywhere, that is what expansion looks like) until it fades into the dark before the first light.
  stages.bang = () => {
    const r = rng(31), g = new THREE.Group(), LOOP = 12, BURST = 2, CAM = V(0, 0, 60);
    /* the point: a core, a halo that tightens, a four-way flare and slow ripples, all trembling */
    const core = glow('#ffffff', 1.2, 1), halo = glow('#ffe2b0', 8, 0.5), flare = new THREE.Group(), ripples = [];
    for (let k = 0; k < 4; k++) { const ray = mesh(new THREE.PlaneGeometry(9, 0.07), B('#fff0d8', { transparent: true, opacity: 0.6, blending: add, depthWrite: false, fog: false })); ray.rotation.z = k * Math.PI / 4; flare.add(ray); }
    for (let k = 0; k < 3; k++) { const ring = mesh(new THREE.RingGeometry(0.96, 1, 64), B('#ffe8c8', { transparent: true, opacity: 0, blending: add, depthWrite: false, side: THREE.DoubleSide, fog: false })); ring.userData.ph = k / 3; ripples.push(ring); g.add(ring); }
    g.add(halo, flare, core);
    /* the flash that floods the view: a sheet just in front of the camera */
    /* its own softer glow, fading like a bell curve, so even huge it has no visible edge */
    const soft = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); [[0, '#ffffff'], [0.12, '#f2f2f2'], [0.3, '#a8a8a8'], [0.5, '#525252'], [0.7, '#1a1a1a'], [0.88, '#050505'], [1, '#000000']].forEach(([k, c2]) => gr.addColorStop(k, c2)); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.premultiplyAlpha = false; return t; })();
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: C('#fffaf0'), blending: add, transparent: true, opacity: 0, depthWrite: false, fog: false })); flash.position.set(0, 0, 10); g.add(flash); /* it bursts out from the point, then fills the view */
    /* the matter: specks spread through all space round the viewer, carried apart as space stretches */
    const N = 7000, base = new Float32Array(N * 3), pos = new Float32Array(N * 3), col = new Float32Array(N * 3), tc = new THREE.Color();
    for (let i = 0; i < N; i++) { const d = sphereDir(r), rr = 30 + Math.pow(r(), 0.6) * 900; base.set([d[0] * rr, d[1] * rr, d[2] * rr], i * 3); tc.setHSL(0.08 + r() * 0.06, 0.4 + r() * 0.5, 0.7 + r() * 0.3); col.set([tc.r, tc.g, tc.b], i * 3); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const matter = new THREE.Points(pg, new THREE.PointsMaterial({ size: 4.5, map: dot, vertexColors: true, transparent: true, opacity: 0, blending: add, depthWrite: false, sizeAttenuation: true, fog: false })); matter.frustumCulled = false; g.add(matter);
    /* a hot haze that fills the space between, thinning as it spreads */
    const haze = []; for (let k = 0; k < 26; k++) { const d = sphereDir(r), s = glow('#ffb060', 1, 0); s.userData = { d: V(...d), rr: 120 + r() * 600, sz: 260 + r() * 400 }; haze.push(s); g.add(s); }
    const white = C('#fff8ec'), gold = C('#ffc860'), orange = C('#ff7a30'), red = C('#a02838'), tint = new THREE.Color();
    const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    return { group: g, pose: { pos: CAM.clone(), look: V(0, 0, 0) }, fit: 1, fog: ['#000000', 6000, 9000], update(t) {
      /* with reduced motion, hold on the moment inside the fireball */
      const T = reduced() ? 4 : t % LOOP, e = T - BURST;
      /* before: the point trembles, its halo tightening, ripples creeping outwards */
      const pre = e < 0, appear = sm(0, 0.6, T), tense = sm(0, BURST, T);
      core.visible = halo.visible = flare.visible = pre;
      if (pre) {
        const shimmer = 1 + 0.35 * Math.sin(T * 31) + 0.25 * Math.sin(T * 47 + 1) + 0.2 * Math.sin(T * 13);
        core.scale.setScalar((1 + tense * 0.8) * shimmer); core.material.opacity = appear;
        halo.scale.setScalar(9 - tense * 4.5 + Math.sin(T * 23) * 0.6); halo.material.opacity = appear * (0.3 + tense * 0.4);
        flare.rotation.z = T * 0.15; flare.scale.set((0.3 + tense * 0.7) * shimmer, 1, 1); flare.children.forEach((ray, k) => { ray.material.opacity = appear * (0.25 + 0.35 * tense) * (0.7 + 0.3 * Math.sin(T * 19 + k * 2)); });
      }
      for (const ring of ripples) { const u = (T * 0.55 + ring.userData.ph) % 1; ring.scale.setScalar(1.5 + u * 7); ring.material.opacity = pre ? appear * 0.3 * (1 - u) * tense : 0; }
      /* the bang: the flash eases in over a third of a second, then fades slowly */
      flash.material.opacity = e < 0 ? 0 : 1 - sm(0.45, 1.7, e); flash.scale.setScalar(4 + 2200 * Math.pow(sm(0, 0.26, e), 2)); flash.material.color.copy(white).lerp(gold, sm(0.4, 1.4, e));
      /* expansion: fast, then gently slowing; the matter cools and fades into the dark */
      const a = e < 0 ? 0 : 0.02 + 1.6 * (1 - Math.exp(-e * 0.42));
      for (let i = 0; i < N * 3; i++) pos[i] = base[i] * a;
      pg.attributes.position.needsUpdate = true;
      tint.copy(white).lerp(gold, sm(0.6, 2.2, e)).lerp(orange, sm(2, 4.2, e)).lerp(red, sm(4, 7, e));
      matter.material.color.copy(tint); matter.material.opacity = e < 0 ? 0 : sm(0.35, 0.9, e) * (1 - sm(6.5, 9, e));
      for (const s of haze) { const u = s.userData; s.position.copy(u.d).multiplyScalar(u.rr * a); s.scale.setScalar(u.sz * (0.4 + a)); s.material.color.copy(tint); s.material.opacity = e < 0 ? 0 : 0.07 * sm(0.4, 1, e) * (1 - sm(3.5, 7, e)); }
    } };
  };
  stages.cmb = () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'), r = rng(9); x.fillStyle = '#3a1206'; x.fillRect(0, 0, 1024, 512); for (let i = 0; i < 700; i++) { const px = r() * 1024, py = r() * 512, rad = 8 + r() * 46, hot = r() > 0.5, g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, hot ? 'rgba(255,140,50,.5)' : 'rgba(80,50,170,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sph = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 32), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })); const g = new THREE.Group(); g.add(sph);
    return { group: g, pose: { pos: V(0, 0, 0), look: V(0, 0, -100) }, fog: ['#140604', 3000, 6000], update(t2) { sph.rotation.y = t2 * 0.012; } }; };
  stages.disk = () => { const r = rng(13), g = new THREE.Group(), pts = cloud(11000, (i, c) => { const rr = Math.pow(r(), 0.75) * 330, arm = r() < 0.5 ? 0 : Math.PI, th = arm + rr / 330 * 4.4 + gauss(r) * (0.25 + rr / 900), y = gauss(r) * (14 * (1 - rr / 420)); c.setHSL(0.1 + (rr / 330) * 0.5, 0.55, 0.62 + r() * 0.3); return [Math.cos(th) * rr, y, Math.sin(th) * rr]; }, { size: 2.6 }), core = glow('#ffe2a8', 190, 0.9); g.add(pts, core);
    return { group: g, pose: { pos: V(0, 230, 380), look: V(0, 0, 0) }, fog: ['#02030a', 900, 2200], update(t) { pts.rotation.y = t * 0.035; } }; };
  // 3 Sep: Earth and the Moon, the giant impact, played as an 18-second loop. A young Earth, still with no continents,
  // its crust thin and cracked over molten rock, is struck a glancing blow by Theia, a world about the size of Mars
  // (half Earth's width). The impact melts Earth's whole surface and throws out a spray of molten and vaporised rock;
  // the part that does not fall back settles into a ring around Earth, and the ring gathers into the Moon, which
  // forms close to Earth and glows as it cools.
  stages.earth = () => {
    const g = new THREE.Group(), r = rng(17), R = 100, LOOP = 18, HIT = 4.2;
    const lavaTex = (seed, base, crack, glowOnly) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'), q = rng(seed);
      x.fillStyle = glowOnly ? '#000' : base; x.fillRect(0, 0, 512, 256);
      if (!glowOnly) for (let k = 0; k < 500; k++) { x.globalAlpha = 0.25; x.fillStyle = q() > 0.5 ? '#1a100c' : '#3a2418'; const rr = 4 + q() * 26; x.beginPath(); x.ellipse(q() * 512, q() * 256, rr, rr * 0.6, q() * 3, 0, 6.283); x.fill(); }
      x.globalAlpha = 1; x.strokeStyle = crack; x.lineCap = 'round';
      for (let k = 0; k < 140; k++) { x.lineWidth = 0.6 + q() * 2.2; x.beginPath(); let px = q() * 512, py = 20 + q() * 216; x.moveTo(px, py); for (let j = 0; j < 7; j++) { px += (q() - 0.5) * 40; py += (q() - 0.5) * 22; x.lineTo(px, py); } x.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    /* the young Earth: dark crust, glowing cracks; after the impact the whole surface runs molten */
    const crustM = new THREE.MeshStandardMaterial({ map: lavaTex(3, '#2c1c14', '#ff8a30'), emissiveMap: lavaTex(3, '', '#ff7a20', true), emissive: C('#ffffff'), emissiveIntensity: 1, roughness: 0.95 });
    const earthB = mesh(new THREE.SphereGeometry(R, 64, 40), crustM); earthB.rotation.z = 0.3; g.add(earthB);
    const melt = mesh(new THREE.SphereGeometry(R * 1.004, 64, 40), new THREE.MeshBasicMaterial({ color: C('#ff7a20'), transparent: true, opacity: 0, blending: add, depthWrite: false }));
    const halo = glow('#ff6a20', R * 3.4, 0.25); g.add(melt, halo);
    /* Theia: rocky, about the size of Mars */
    const theia = mesh(new THREE.SphereGeometry(R * 0.53, 48, 32), new THREE.MeshStandardMaterial({ map: lavaTex(8, '#8a7e72', '#a07050'), roughness: 1 })); g.add(theia);
    const contact = V(0.62, 0.42, 0.66).normalize().multiplyScalar(R), start = V(300, 150, 160), flash = glow('#fffbe8', 1, 0); g.add(flash);
    /* debris: each piece flies out from the contact point, bends round into an orbit, then joins the Moon */
    const N = 2600, MOON_R = 3 * R, piece = []; /* the Moon gathers about three Earth radii out, beyond the distance where Earth's pull would tear it apart */
    const tan = V().crossVectors(contact, V(0, 1, 0)).normalize(), out = contact.clone().normalize();
    for (let i = 0; i < N; i++) { const spread = V(gauss(r), gauss(r) * 0.6, gauss(r)).multiplyScalar(0.45), dir = out.clone().multiplyScalar(0.8).add(tan.clone().multiplyScalar(0.7)).add(spread).normalize();
      piece.push({ dir, sp: 120 + r() * 260, orb: 1.3 + Math.pow(r(), 0.8) * 1.4, th: Math.atan2(contact.z, contact.x) + (r() - 0.5) * 2.4, y: gauss(r) * 6, fall: r() < 0.3, join: 0.15 + r() * 0.85 }); }
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), tmpc = new THREE.Color();
    for (let i = 0; i < N; i++) { tmpc.setHSL(0.06 + r() * 0.07, 0.9, 0.55 + r() * 0.35); col.set([tmpc.r, tmpc.g, tmpc.b], i * 3); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const debris = new THREE.Points(dg, new THREE.PointsMaterial({ size: 5, map: dot, vertexColors: true, transparent: true, opacity: 0, blending: add, depthWrite: false, sizeAttenuation: true })); debris.frustumCulled = false; g.add(debris);
    /* the Moon: gathers from the ring, glowing, then cools to grey */
    const moonM = new THREE.MeshStandardMaterial({ map: lavaTex(11, '#7a7068', '#ff9a40'), emissiveMap: lavaTex(11, '', '#ff8a30', true), emissive: C('#ffffff'), emissiveIntensity: 0, roughness: 1 });
    const moon = mesh(new THREE.SphereGeometry(R * 0.27, 40, 28), moonM), moonGlow = glow('#ff8a40', R * 0.9, 0); g.add(moon, moonGlow);
    const P = V(), O = V(), hot = C('#fff0c0'), warm = C('#ff8a30'), cool = C('#a03a20'), tint = new THREE.Color();
    const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const moonAt = (T, out2) => { const a = -Math.PI / 2 - 1.05 + (T - HIT) * 0.04; return out2.set(Math.cos(a) * MOON_R, 6, Math.sin(a) * MOON_R); }; /* behind Earth and to the left, so it forms in open sky, clear of Earth */
    return { group: g, fit: 1, sun: 1.2, amb: 0.25, sunDir: [-3, 1.5, 2], pose: { pos: V(0, 470, 1040), look: V(0, -10, 0) }, fog: ['#0a0204', 2000, 4000], update(t) {
      const T = t % LOOP, after = T - HIT;
      earthB.rotation.y = t * 0.05;
      /* Theia: in on a glancing path, then sinks into Earth and is gone */
      if (after < 0) { const k = Math.pow(T / HIT, 1.5); theia.visible = true; theia.position.lerpVectors(start, contact.clone().multiplyScalar(1.45), k); theia.scale.setScalar(1); theia.rotation.y = t * 0.3; }
      else if (after < 0.9) { const k = after / 0.9; theia.visible = true; theia.position.lerpVectors(contact.clone().multiplyScalar(1.45), contact.clone().multiplyScalar(0.7), k); theia.scale.setScalar(1 - k * 0.85); }
      else theia.visible = false;
      /* the flash, and the surface running molten, cooling slowly */
      flash.position.copy(contact).multiplyScalar(1.15); flash.material.opacity = after > 0 && after < 1.4 ? Math.pow(1 - after / 1.4, 1.5) : 0; flash.scale.setScalar(R * (0.6 + Math.max(0, after) * 1.6));
      const molten = after > 0 ? sm(0, 0.8, after) * (1 - sm(4, LOOP - HIT, after) * 0.6) : 0;
      melt.material.opacity = 0.75 * molten; crustM.emissiveIntensity = 1 + molten * 2; halo.material.opacity = 0.25 + 0.3 * molten; halo.material.color.set(molten > 0.5 ? '#ff8a30' : '#ff6a20');
      /* debris */
      if (after <= 0) { debris.material.opacity = 0; }
      else {
        debris.material.opacity = Math.min(1, after * 3) * (1 - sm(LOOP - HIT - 1.5, LOOP - HIT, after));
        tint.copy(hot).lerp(warm, sm(0.3, 3, after)).lerp(cool, sm(6, 11, after)); debris.material.color.copy(tint);
        const ring = sm(1.4, 5.5, after), gather = after > 6 ? after - 6 : 0; moonAt(T, O);
        for (let i = 0; i < N; i++) { const p = piece[i], fly = Math.min(after, 3.5), d = p.sp * (1 - Math.exp(-fly * 0.9));
          P.copy(contact).addScaledVector(p.dir, d); if (p.fall) P.multiplyScalar(1 - sm(1.5, 4, after) * 0.3);
          const rr = p.orb * R, w = 1.5 / Math.pow(p.orb, 1.5), a = p.th + after * w; /* inner debris orbits faster, so the spray smears into a full ring */
          const ox = Math.cos(a) * rr, oz = Math.sin(a) * rr, oy = p.y; let x = P.x + (ox - P.x) * ring, y = P.y + (oy - P.y) * ring, z = P.z + (oz - P.z) * ring;
          if (p.fall) { const k = sm(2, 5, after); x *= 1 - k * 0.32; y *= 1 - k * 0.32; z *= 1 - k * 0.32; }
          else { const j = sm(p.join * 6, p.join * 6 + 2.5, gather); x += (O.x - x) * j; y += (O.y - y) * j; z += (O.z - z) * j; }
          pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; }
        dg.attributes.position.needsUpdate = true;
      }
      /* the Moon grows as the ring gathers, then cools */
      const grow = sm(6.5, 11.5, after); moon.visible = grow > 0.01; moonAt(T, moon.position); moon.scale.setScalar(Math.max(0.01, grow)); moon.rotation.y = t * 0.1;
      const mHot = grow * (1 - sm(12, LOOP - HIT, after) * 0.7); moonM.emissiveIntensity = 2.2 * mHot; moonGlow.position.copy(moon.position); moonGlow.material.opacity = 0.7 * mHot; moonGlow.scale.setScalar(R * 0.9 * Math.max(0.2, grow));
    } };
  };
  const planet = (o, pose, fogc, extra) => () => { const g = new THREE.Group(), e = earth(o); g.add(e); const ex = extra?.(g, e); return { group: g, pose, fog: fogc, update(t) { e.rotation.y = t * 0.05; if (e.userData.clouds) e.userData.clouds.rotation.y = t * 0.012; ex?.update?.(t, e); } }; };
  // 29 Oct: oxygen fills the air (the Great Oxidation Event, about 2.4 billion years ago), played as a 20-second loop
  // in a shallow sea. Mounds of blue-green microbes (stromatolites) give off oxygen in streams of tiny bubbles. The
  // oxygen first rusts the iron dissolved in the sea: red flakes drift down and the sea floor and the shore cliff
  // gain rust-red bands (banded iron formations), and the greenish water turns blue. Then the methane haze clears from
  // the sky, the bare rock reddens, and, with less methane to keep it warm, Earth slides into an ice age.
  stages.oxygen = () => {
    const r = rng(61), g = new THREE.Group(), LOOP = 20, WATER = 0.6;
    const sky = skyDome('#b07040', '#e2a868', '#7a6a50', 2400, { dir: [0.6, 0.35, -1], col: '#fff2d0' }), light = hemi('#ffd8a8', '#4a4030', 1.2);
    g.add(sky, light, ground(M('#8a7e62', { map: groundTex('#7e7258', ['#6a5e46', '#9a8e70', '#5a5040'], 23, 60) })));
    /* rust bands over the sea floor, fading in as the iron settles out */
    const bandTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); for (let y = 0; y < 256; y += 8) { x.fillStyle = (y / 8) % 2 ? '#c0582e' : '#9a9690'; x.fillRect(0, y, 64, 4 + (y % 24 === 0 ? 4 : 0)); x.fillStyle = (y / 8) % 2 ? '#d86a38' : '#aaa69e'; x.fillRect(0, y + 4, 64, 4); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
    const rustFloor = mesh(new THREE.CircleGeometry(60, 40), new THREE.MeshStandardMaterial({ color: C('#b0502a'), roughness: 1, transparent: true, opacity: 0, depthWrite: false }), 0, 0.02, -20); rustFloor.rotation.x = -Math.PI / 2; g.add(rustFloor);
    /* a low cliff on the shore, banded grey and rust-red: the rock record of this event */
    const cliffT = bandTex.clone(); cliffT.needsUpdate = true; cliffT.repeat.set(3, 2);
    const cliff = mesh(new THREE.BoxGeometry(16, 3.6, 4), new THREE.MeshStandardMaterial({ map: cliffT, roughness: 0.95, color: C('#c8c4bc') }), 7, 1.5, -22); cliff.rotation.y = -0.22; g.add(cliff);
    const rockM = M('#7a7670', { flatShading: true, roughness: 0.95 }), rocks = [];
    for (let k = 0; k < 16; k++) { const s = 0.3 + r() * 0.9, m = mesh(rockGeo(s, 700 + k, 1, 0.6), rockM, 4 + r() * 8, s * 0.2, -4 - r() * 12); m.rotation.y = r() * 6; rocks.push(m); g.add(m); }
    /* stromatolites: layered domes built by microbial mats, most just under the water, a few breaking the surface */
    const mats = M('#2e6a46', { roughness: 0.6, emissive: C('#0a3018'), emissiveIntensity: 0.6 }), rockS = M('#8a7c5e', { roughness: 0.95 });
    const prof = []; for (let k = 0; k <= 14; k++) { const y = k / 14; prof.push(new THREE.Vector2(y < 0.7 ? 1 - 0.05 * Math.sin(y * 48) - y * 0.1 : 0.9 * Math.sqrt(Math.max(0, 1 - ((y - 0.7) / 0.3) ** 2)), y)); }
    const moundG = new THREE.LatheGeometry(prof, 20), capG = new THREE.SphereGeometry(1, 20, 10, 0, 6.283, 0, Math.PI / 2), sources = [];
    for (let k = 0; k < 34; k++) { const x = (r() - 0.6) * 12, z = -0.5 - r() * 14, w = 0.3 + r() * 0.45, h = k < 6 ? 0.7 + r() * 0.35 : 0.25 + r() * 0.3, m = mesh(moundG, rockS, x, 0, z); m.scale.set(w, h, w * (0.8 + r() * 0.4)); const cap = mesh(capG, mats, x, h * 0.86, z); cap.scale.set(w * 0.86, h * 0.2 + 0.03, w * 0.86 * m.scale.z / w); g.add(m, cap); if (h < WATER - 0.02) sources.push([x, h, z, w]); }
    /* the sea: a shallow, clear sheet whose colour shifts from iron-green to blue (and frosts over at the end) */
    const waterM = new THREE.MeshStandardMaterial({ color: C('#4a8a6a'), transparent: true, opacity: 0.55, roughness: 0.12, metalness: 0.25, depthWrite: false });
    const water = mesh(new THREE.PlaneGeometry(400, 400), waterM, 0, WATER, -150); water.rotation.x = -Math.PI / 2; g.add(water);
    /* oxygen bubbles rising from the mats */
    const NB = 1100, bpos = new Float32Array(NB * 3), bub = []; for (let i = 0; i < NB; i++) { const s = sources[i % sources.length]; bub.push({ s, ox: (r() - 0.5) * s[3], oz: (r() - 0.5) * s[3], ph: r(), sp: 0.12 + r() * 0.2 }); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
    const bubbles = new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.045, map: dot, color: C('#e8fff8'), transparent: true, opacity: 0.9, blending: add, depthWrite: false })); bubbles.frustumCulled = false; g.add(bubbles);
    /* rust flakes settling through the water; later, snow */
    const NF = 500, fpos = new Float32Array(NF * 3), fl = []; for (let i = 0; i < NF; i++) fl.push({ x: (r() - 0.5) * 8, z: 1.5 - r() * 9, ph: r(), sp: 0.05 + r() * 0.06 });
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    const flakes = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.05, color: C('#c0502a'), alphaMap: dot, transparent: true, opacity: 0, depthWrite: false })); flakes.frustumCulled = false; g.add(flakes);
    const NS = 700, spos = new Float32Array(NS * 3), sn = []; for (let i = 0; i < NS; i++) sn.push({ x: (r() - 0.5) * 14, z: 3 - r() * 16, ph: r(), sp: 0.12 + r() * 0.12 });
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    const snow = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.05, color: C('#ffffff'), alphaMap: dot, transparent: true, opacity: 0, depthWrite: false })); snow.frustumCulled = false; g.add(snow);
    /* a lens on one mat: cyanobacteria, chains of cells, giving off bubbles of oxygen (magnified about 1,000 times) */
    const lens = new THREE.Group(), lensR = 1.55, flat = o => ({ fog: false, ...o }), lb = [];
    lens.add(mesh(new THREE.CircleGeometry(lensR, 48), B('#0c2a24', flat({ transparent: true, opacity: 0.94 }))), mesh(new THREE.TorusGeometry(lensR, 0.05, 8, 64), B('#f3c887', flat())));
    const cellM = new THREE.MeshStandardMaterial({ color: C('#4ab88a'), emissive: C('#1a6a48'), emissiveIntensity: 0.5, roughness: 0.4, fog: false }), cellG = new THREE.SphereGeometry(0.1, 12, 10);
    for (let f = 0; f < 6; f++) { const y0 = -1 + f * 0.38, n = 9 + Math.floor(r() * 5), x0 = -1.1 + r() * 0.3; for (let k = 0; k < n; k++) { const c = mesh(cellG, cellM, x0 + k * 0.19, y0 + Math.sin(k * 0.6 + f) * 0.08, 0.1); c.scale.set(1, 0.85, 0.85); if ((x0 + k * 0.19) ** 2 + y0 ** 2 < (lensR - 0.15) ** 2) lens.add(c); } }
    const bubG = new THREE.SphereGeometry(0.045, 10, 8), bubM = new THREE.MeshStandardMaterial({ color: C('#e8fff8'), emissive: C('#9ad8c8'), emissiveIntensity: 0.6, transparent: true, opacity: 0.85, fog: false });
    for (let k = 0; k < 18; k++) { const b = mesh(bubG, bubM, (r() - 0.5) * 2.2, 0, 0.2); b.userData = { x: b.position.x, ph: r(), sp: 0.15 + r() * 0.2 }; lb.push(b); lens.add(b); }
    const tag = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#0c2a24'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#f3c887'; x.font = '600 30px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('× 1,000', 128, 34); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, fog: false })); sp.scale.set(2, 0.5, 1); sp.position.set(0, -lensR - 0.42, 0); return sp; })();
    lens.add(tag); lens.scale.setScalar(0.27); g.add(lens);
    const lensAt = V(-0.22, 2.3, 3.2), lensTo = V(-0.9, 0.7, -1.2); lens.position.copy(lensAt); lens.lookAt(0, 2.2, 7.5);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(lensAt.x, lensAt.y - lensR * 0.27 - 0.12, lensAt.z), lensTo]), new THREE.LineBasicMaterial({ color: C('#f3c887'), transparent: true, opacity: 0.55, fog: false })));
    /* colours at the start and end of the change */
    const skyA = [C('#b07040'), C('#e2a868')], skyB = [C('#3a78c8'), C('#d0e4f2')], waterA = C('#4a8a6a'), waterB = C('#2a6aa8'), ice = C('#d8ecf4'), rockA = C('#7a7670'), rockB = C('#9a5034'), frost = C('#e8eef4'), hA = C('#ffd8a8'), hB = C('#d8ecff'), tmp = new THREE.Color();
    const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    return { group: g, fit: 1, sun: 1.6, amb: 0.4, sunDir: [3, 4, 2], pose: { pos: V(0, 2.2, 7.5), look: V(0, 0.7, -6) }, fog: ['#c8a880', 30, 400], update(t) {
      const T = t % LOOP, back = 1 - sm(18.6, 19.8, T); /* everything eases back to the start for the next loop */
      const o2 = sm(1, 4, T) * back, rust = sm(3, 8, T) * back, clear = sm(8, 14, T) * back, cold = sm(14, 17, T) * back;
      sky.material.uniforms.a.value.copy(skyA[0]).lerp(skyB[0], clear).lerp(C('#8ab0d8'), cold * 0.4); sky.material.uniforms.b.value.copy(skyA[1]).lerp(skyB[1], clear).lerp(ice, cold * 0.5);
      light.color.copy(hA).lerp(hB, clear);
      waterM.color.copy(waterA).lerp(waterB, sm(6, 12, T) * back).lerp(ice, cold * 0.8); waterM.opacity = 0.55 + cold * 0.35;
      rustFloor.material.opacity = 0.35 * rust; cliff.material.color.copy(C('#c8c4bc')).lerp(C('#ffffff'), rust * 0.5).lerp(frost, cold * 0.5);
      rockM.color.copy(rockA).lerp(rockB, sm(9, 14, T) * back).lerp(frost, cold * 0.7);
      for (let i = 0; i < NB; i++) { const b = bub[i], s = b.s, u = (T * b.sp + b.ph) % 1, top = s[1] + 0.03, y = top + u * (WATER - top); bpos[i * 3] = s[0] + b.ox + Math.sin(u * 9 + i) * 0.02; bpos[i * 3 + 1] = y; bpos[i * 3 + 2] = s[2] + b.oz; }
      bg.attributes.position.needsUpdate = true; bubbles.material.opacity = 0.9 * o2 * (1 - cold * 0.7);
      for (let i = 0; i < NF; i++) { const f = fl[i], u = (T * f.sp + f.ph) % 1; fpos[i * 3] = f.x + Math.sin(T * 0.5 + i) * 0.05; fpos[i * 3 + 1] = WATER - u * WATER; fpos[i * 3 + 2] = f.z; }
      fg.attributes.position.needsUpdate = true; flakes.material.opacity = 0.9 * rust * (1 - sm(11, 14, T));
      for (let i = 0; i < NS; i++) { const f = sn[i], u = (T * f.sp + f.ph) % 1; spos[i * 3] = f.x + Math.sin(T * 0.7 + i) * 0.15; spos[i * 3 + 1] = 4.5 - u * 4.2; spos[i * 3 + 2] = f.z; }
      sg.attributes.position.needsUpdate = true; snow.material.opacity = 0.9 * cold;
      for (const b of lb) { const u = (T * b.userData.sp + b.userData.ph) % 1; b.position.y = -1.2 + u * 2.4; b.position.x = b.userData.x + Math.sin(u * 8) * 0.05; b.visible = b.position.x ** 2 + b.position.y ** 2 < (lensR - 0.1) ** 2 && o2 > 0.1; }
    } };
  };
  // 9 Nov: complex cells, about 2 billion years ago, inside a drop of sea water magnified about 2,000 times. A complex
  // (eukaryotic) cell, about ten times the width of a bacterium, with its DNA in a nucleus behind a double wall with
  // pores, folded inner membranes, and mitochondria: power units that began as bacteria a larger cell swallowed and
  // kept. Bacteria swim around it, and every 16 seconds the cell reaches out, wraps one inside and, over the loop, the
  // captured bacterium becomes a new mitochondrion (the endosymbiosis that made complex life possible).
  stages.cells = () => {
    const r = rng(19), g = new THREE.Group(), RC = 3, LOOP = 16, flat = o => ({ ...o });
    g.add(skyDome('#0f4a48', '#08262a', '#041418', 400), hemi('#bff0e8', '#10201c', 1.1));
    /* the outer skin: a see-through shell with a bright rim, gently wobbling, and able to bulge into a cup */
    const fres = (col, k = 1) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: add, side: THREE.FrontSide, uniforms: { c: { value: C(col) }, k: { value: k } },
      vertexShader: 'varying vec3 n;varying vec3 v;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform vec3 c;uniform float k;varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(n,v)),2.2);gl_FragColor=vec4(c*(f*1.4+0.06)*k,1.);}' });
    const skinG = new THREE.SphereGeometry(RC, 64, 40), base = skinG.attributes.position.array.slice(), skin = mesh(skinG, fres('#9af0d8')); g.add(skin);
    const inside = mesh(new THREE.SphereGeometry(RC * 0.985, 48, 32), new THREE.MeshStandardMaterial({ color: C('#2a6a60'), transparent: true, opacity: 0.22, roughness: 0.6, depthWrite: false })); g.add(inside);
    /* the nucleus: a double wall with pores, and a darker nucleolus inside */
    const nuc = new THREE.Group(); nuc.position.set(-0.55, 0.25, 0.2);
    nuc.add(mesh(new THREE.SphereGeometry(1.05, 40, 28), new THREE.MeshStandardMaterial({ color: C('#e8a060'), emissive: C('#5a2a08'), emissiveIntensity: 0.6, roughness: 0.5, transparent: true, opacity: 0.85 })));
    nuc.add(mesh(new THREE.SphereGeometry(1.13, 40, 28), fres('#ffc890', 0.8)), mesh(new THREE.SphereGeometry(0.38, 24, 16), M('#9a4a2a', { emissive: C('#3a1408') }), 0.25, 0.15, 0.55));
    const pores = []; for (let k = 0; k < 40; k++) { const d = sphereDir(r); pores.push([d[0] * 1.12, d[1] * 1.12, d[2] * 1.12, 0, 0, 0, 1]); } nuc.add(instanced(new THREE.SphereGeometry(0.04, 6, 4), B('#5a2a10'), pores)); g.add(nuc);
    /* folded inner membranes wrapped round the nucleus */
    const erM = new THREE.MeshStandardMaterial({ color: C('#c8a8f0'), emissive: C('#3a2a5a'), emissiveIntensity: 0.5, roughness: 0.5, transparent: true, opacity: 0.75 });
    for (let k = 0; k < 6; k++) { const arc = mesh(new THREE.TorusGeometry(1.35 + k * 0.16, 0.035, 6, 40, 2.2 + r() * 1.2), erM, nuc.position.x, nuc.position.y, nuc.position.z); arc.rotation.set(r() * 3, r() * 3, r() * 3); g.add(arc); }
    /* mitochondria: orange beans with folded inner walls (striped) */
    const stripes = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#ff9a4a'; x.fillRect(0, 0, 128, 32); x.strokeStyle = '#a84a1a'; x.lineWidth = 3; for (let i = 8; i < 128; i += 14) { x.beginPath(); x.moveTo(i, 4); x.quadraticCurveTo(i + 6, 16, i, 28); x.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const mitoG = new THREE.CapsuleGeometry(0.2, 0.55, 8, 16), mitoM = new THREE.MeshStandardMaterial({ map: stripes, emissive: C('#5a2008'), emissiveIntensity: 0.5, roughness: 0.5 });
    const mitos = []; for (const [x, y, z] of [[1.4, 1.2, 0.4], [1.7, -0.5, 0.6], [0.6, -1.5, 0.9], [-1.8, -1.2, 0.5], [-1.6, 1.6, -0.3], [0.8, 1.9, -0.6]]) { const m = mesh(mitoG, mitoM, x, y, z); m.rotation.set(r() * 3, r() * 3, r() * 3); m.userData.a = r() * 6; mitos.push(m); g.add(m); }
    g.add(cloud(500, (i, c) => { c.setHSL(0.45, 0.4, 0.6); const d = sphereDir(r), rr = Math.cbrt(r()) * RC * 0.9; return [d[0] * rr, d[1] * rr, d[2] * rr]; }, { size: 0.04, opacity: 0.6 })); /* ribosomes */
    /* bacteria: about a tenth of the cell's width, each with a whipping tail */
    const bacM = new THREE.MeshStandardMaterial({ color: C('#5ad0a0'), emissive: C('#0e4a30'), emissiveIntensity: 0.6, roughness: 0.4 }), tailM = new THREE.LineBasicMaterial({ color: C('#8ae8c0'), transparent: true, opacity: 0.7 });
    const bacterium = (m = bacM) => { const b = new THREE.Group(), body = mesh(new THREE.CapsuleGeometry(0.11, 0.26, 6, 12), m); body.rotation.z = Math.PI / 2; const tg = new THREE.BufferGeometry(), tp = new Float32Array(16 * 3); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); const tail = new THREE.Line(tg, tailM.clone()); b.add(body, tail); b.userData = { tp, tg, tail, body }; return b; };
    const wag = (b, t) => { const { tp, tg } = b.userData; for (let i = 0; i < 16; i++) { const u = i / 15; tp[i * 3] = -0.22 - u * 0.5; tp[i * 3 + 1] = Math.sin(t * 14 - u * 9) * 0.06 * u; tp[i * 3 + 2] = 0; } tg.attributes.position.needsUpdate = true; };
    const swimmers = []; for (let k = 0; k < 16; k++) { const b = bacterium(); b.userData.o = { R: RC + 0.8 + r() * 2.6, a: r() * 6.283, sp: (0.12 + r() * 0.2) * (r() < 0.5 ? -1 : 1), z: (r() - 0.5) * 3, tilt: (r() - 0.5) * 0.8 }; swimmers.push(b); g.add(b); }
    /* the one that is swallowed */
    const preyM = bacM.clone(), prey = bacterium(preyM); g.add(prey);
    const vesicle = mesh(new THREE.SphereGeometry(0.34, 20, 14), fres('#9af0d8', 0.9)); g.add(vesicle);
    const dir = V(0.72, 0.55, 0.42).normalize(), out0 = dir.clone().multiplyScalar(RC + 3.2).add(V(1.2, 0.8, 0)), atSkin = dir.clone().multiplyScalar(RC + 0.25), inner = V(1.2, 0.2, 1.3);
    const tag = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#f3c887'; x.font = '600 28px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('× 2,000', 128, 32); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true })); sp.scale.set(2.2, 0.55, 1); sp.position.set(-2.4, -RC - 0.45, 0); return sp; })(); g.add(tag);
    const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const teal = C('#5ad0a0'), orange = C('#ff9a4a'), P = V(), Q = V();
    return { group: g, fit: 1, sun: 1.2, amb: 0.45, sunDir: [2, 3, 4], pose: { pos: V(0, 0.4, 15.5), look: V(0, 0, 0) }, fog: ['#08262a', 20, 60], update(t) {
      const T = t % LOOP;
      /* swimmers circle the cell */
      for (const b of swimmers) { const o = b.userData.o, a = o.a + t * o.sp * 0.5; b.position.set(Math.cos(a) * o.R, Math.sin(a) * o.R * 0.75 + Math.sin(a * 2) * 0.3, o.z); b.rotation.set(o.tilt, 0, a + (o.sp > 0 ? Math.PI / 2 : -Math.PI / 2)); wag(b, t + o.a); }
      /* the prey: swims in, is wrapped, carried inside, and becomes a mitochondrion */
      const come = sm(0, 5, T), sink = sm(5.5, 8.5, T), carry = sm(8.5, 11, T), become = sm(10.5, 14, T), reset = sm(15.2, 16, T);
      P.lerpVectors(out0, atSkin, come); P.lerp(Q.copy(dir).multiplyScalar(RC - 0.55), sink); P.lerp(inner, carry); prey.position.copy(P);
      if (carry < 0.9) { prey.lookAt(T < 8.5 ? Q.copy(P).add(dir.clone().multiplyScalar(-1)) : inner); prey.rotateY(-Math.PI / 2); } else prey.rotation.set(0.3, 0.2, 0.6 + T * 0.02); /* once inside it lies side-on, like the other mitochondria */ wag(prey, t);
      preyM.color.copy(teal).lerp(orange, become); preyM.map = become > 0.5 ? stripes : null; preyM.needsUpdate = become > 0.49 && become < 0.52;
      prey.userData.body.scale.set(1 + become * 0.9, 1 + become * 1.1, 1 + become * 0.9); prey.userData.tail.material.opacity = 0.7 * (1 - sink);
      prey.visible = reset < 0.5; prey.scale.setScalar(T < 0.6 ? T / 0.6 : 1);
      vesicle.position.copy(P); vesicle.visible = sink > 0.6 && become < 0.9; vesicle.material.uniforms.k.value = 0.9 * (1 - become);
      /* the skin: a slow wobble, and a raised cup that closes round the prey */
      const cup = sm(4, 6.5, T) * (1 - sm(7.5, 9, T)), pos = skinG.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) { const x = base[i], y = base[i + 1], z = base[i + 2], cosA = (x * dir.x + y * dir.y + z * dir.z) / RC, ang = Math.acos(Math.min(1, Math.max(-1, cosA)));
        const k = 1 + 0.02 * Math.sin(t * 1.3 + x * 1.7 + y) + 0.015 * Math.sin(t * 0.9 + z * 2.1) + cup * (0.22 * Math.exp(-(((ang - 0.2) / 0.1) ** 2)) - 0.08 * Math.exp(-((ang / 0.12) ** 2)));
        pos[i] = x * k; pos[i + 1] = y * k; pos[i + 2] = z * k; }
      skinG.attributes.position.needsUpdate = true; skinG.computeVertexNormals();
      for (const m of mitos) { m.rotation.y += 0.003; m.position.y += Math.sin(t * 0.6 + m.userData.a) * 0.0015; }
      nuc.rotation.y = t * 0.05;
    } };
  };
  stages.impact = planet({ tint: '#d8c8b8', glowColor: '#ff7a30', clouds: 0.35 }, { pos: V(0, 20, 330), look: V(0, 0, 0) }, ['#050408', 1000, 2600], g => { const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), new THREE.MeshStandardMaterial({ color: C('#6a5a4a'), roughness: 1, emissive: C('#ff5a10'), emissiveIntensity: 0.6 })), tail = glow('#ffd28a', 70, 1), flash = glow('#fff0d0', 10, 0); g.add(rock, tail, flash); const tgt = ll(18, -90, 101);
    return { update(t, e) { const p = (t % 7) / 7, k = Math.min(1, p / 0.7), pos = V(300, 220, 100).lerp(tgt, ease(k) * 0.9 + k * 0.1); rock.position.copy(pos); tail.position.copy(pos); rock.visible = k < 1; tail.visible = k < 1; const hit = Math.max(0, (p - 0.7) / 0.3); flash.position.copy(tgt); flash.scale.setScalar(10 + 240 * hit); flash.material.opacity = hit > 0 ? 1 - hit : 0; e.userData.body.material.emissive.set(hit > 0 ? '#ff4a10' : '#000000'); e.userData.body.material.emissiveIntensity = hit > 0 ? 0.6 * (1 - hit) : 0; } }; });
  stages.now = planet({ tint: '#9aa4c0', glowColor: '#7aa0ff', clouds: 0.35, lights: 4200, marker: true }, { pos: V(0, 10, 760), look: V(0, 0, 0) }, ['#01020a', 2000, 4000], g => { const r = rng(29), s = cloud(1100, (i, c) => { const d = sphereDir(r); c.setHSL(0.6, 0.3, 0.7 + r() * 0.3); return [d[0] * 2600, d[1] * 2600, d[2] * 2600]; }, { size: 6, fog: false }); g.add(s); return { update(t, e) { const m = e.userData.marker; if (m) { m.scale.setScalar(20 + 12 * Math.sin(t * 2.2)); m.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.2); } } }; });

  // ---- building blocks for the scenes that show their subject: sky, ground, people, plants, animals, buildings, spacecraft ----
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color: C(color), roughness: 0.9, metalness: 0, ...o });
  const B = (color, o = {}) => new THREE.MeshBasicMaterial({ color: C(color), ...o });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const tube = (pts, r, mat) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), 24, r, 8), mat);
  // Sky gradient, with an optional sun drawn into the sky itself, so the land in front covers it naturally
  // (a flat glow sprite at the horizon was cut off by the ground in a hard line).
  function skyDome(top, horizon, below = horizon, r = 2400, sun = null) {
    const dir = V(...(sun?.dir || [0, -1, 0])).normalize();
    const d = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: C(top) }, b: { value: C(horizon) }, c: { value: C(below) }, sd: { value: dir }, sc: { value: C(sun?.col || '#000000') } },
      vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 a,b,c,sd,sc;varying vec3 p;void main(){float y=p.y;vec3 col=y>0.?mix(b,a,pow(clamp(y,0.,1.),0.55)):mix(b,c,clamp(-y*5.,0.,1.));float k=max(dot(normalize(p),sd),0.);col+=sc*(smoothstep(0.99955,0.9997,k)*1.6+pow(k,60.)*0.55+pow(k,8.)*0.25);gl_FragColor=vec4(col,1.);\n#include <colorspace_fragment>\n}' }));
    d.renderOrder = -1; return d;
  }
  const ground = (mat, r = 2300) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), mat); m.rotation.x = -Math.PI / 2; return m; };
  const hemi = (sky, gnd, k = 1.2) => new THREE.HemisphereLight(C(sky), C(gnd), k);
  const stars = (n, R, seed, k = 1) => { const r = rng(seed); return cloud(n, (i, c) => { const d = sphereDir(r); c.setHSL(0.6, 0.3, (0.55 + r() * 0.45) * k); return [d[0] * R, Math.abs(d[1]) * R, d[2] * R]; }, { size: R / 260, fog: false }); };
  function person(mat, s = 1) {
    const g = new THREE.Group(), leg = new THREE.CylinderGeometry(0.11 * s, 0.08 * s, 0.9 * s, 6), arm = new THREE.CylinderGeometry(0.065 * s, 0.05 * s, 0.68 * s, 6);
    const a1 = mesh(arm, mat, -0.3 * s, 1.2 * s, 0), a2 = mesh(arm, mat, 0.3 * s, 1.2 * s, 0); a1.rotation.z = 0.28; a2.rotation.z = -0.28;
    g.add(mesh(leg, mat, -0.12 * s, 0.45 * s, 0), mesh(leg, mat, 0.12 * s, 0.45 * s, 0), mesh(new THREE.CapsuleGeometry(0.21 * s, 0.48 * s, 4, 8), mat, 0, 1.2 * s, 0), mesh(new THREE.SphereGeometry(0.14 * s, 10, 8), mat, 0, 1.7 * s, 0), a1, a2); return g;
  }
  function acacia(mat, s = 1) { const g = new THREE.Group(), t = mesh(new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 3.2 * s, 6), mat, 0, 1.6 * s, 0), c = mesh(new THREE.SphereGeometry(2.4 * s, 12, 8), mat, 0, 3.4 * s, 0); c.scale.y = 0.22; g.add(t, c); return g; }
  function palm(mat, s = 1) { const g = new THREE.Group(); g.add(tube([[0, 0, 0], [0.3 * s, 2 * s, 0], [0.8 * s, 4 * s, 0]], 0.14 * s, mat)); for (let k = 0; k < 7; k++) { const f = mesh(new THREE.ConeGeometry(0.28 * s, 2.6 * s, 4), mat, 0.8 * s, 4 * s, 0); f.geometry.translate(0, 1.3 * s, 0); f.rotation.z = -1.25; f.rotation.y = k / 7 * Math.PI * 2; f.scale.z = 0.25; const h = new THREE.Group(); h.position.set(0.8 * s, 4 * s, 0); f.position.set(0, 0, 0); h.add(f); h.rotation.y = k / 7 * Math.PI * 2; g.add(h); } return g; }
  function instanced(geo, mat, list) { const im = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(); list.forEach((p, k) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(p[4] || 0, p[3] || 0, p[5] || 0); const sc = p[6] ?? 1; if (Array.isArray(sc)) o.scale.set(...sc); else o.scale.setScalar(sc); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }); return im; }
  // ---- shapes for living things and landscapes ----
  // A smooth body swept along a curve that lies (mostly) in the x–y plane: rings of radius rad(t), t from the first
  // point (0) to the last (1), flattened sideways by sz. The side axis is fixed (z), so the body never twists.
  // colors(t, up), when given, colours each vertex: t along the body, up from -1 (belly) to 1 (back).
  function sweep(pts, rad, mat, { seg = 40, ring = 12, sz = 1, colors = null } = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p))), pos = [], idx = [], cols = [], Z = V(0, 0, 1), T = V(0, 0, 0), N = V(0, 0, 0), Bn = V(0, 0, 0);
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, c = curve.getPointAt(t), r = rad(t);
      curve.getTangentAt(t, T); N.crossVectors(Z, T).normalize(); if (N.lengthSq() < 1e-6) N.set(1, 0, 0); Bn.crossVectors(T, N).normalize();
      for (let j = 0; j <= ring; j++) {
        const a = j / ring * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r * sz;
        pos.push(c.x + N.x * u + Bn.x * v, c.y + N.y * u + Bn.y * v, c.z + N.z * u + Bn.z * v);
        if (colors) { const k = colors(t, (N.y * Math.cos(a) + Bn.y * Math.sin(a))); cols.push(k.r, k.g, k.b); }
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < ring; j++) { const a = i * (ring + 1) + j, b = a + ring + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); if (colors) geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    return new THREE.Mesh(geo, mat);
  }
  // A weathered rock: an icosahedron pushed in and out by a smooth function of position (so shared corners move
  // together and the surface stays closed), flattened where it sits on the ground. Flat-shaded facets.
  function rockGeo(s, seed, detail = 1, squash = 0.7) {
    const g = new THREE.IcosahedronGeometry(s, detail), p = g.attributes.position, a = seed * 1.37;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k) / s, y = p.getY(k) / s, z = p.getZ(k) / s;
      const n = 1 + 0.22 * Math.sin(x * 2.1 + a) * Math.sin(y * 2.7 + a * 2) * Math.sin(z * 2.3 + a * 3) + 0.08 * Math.sin(x * 5.3 + y * 4.1 + a) * Math.sin(z * 4.7 - a);
      p.setXYZ(k, x * s * n, Math.max(-0.35, y * squash) * s * n, z * s * n);
    }
    g.computeVertexNormals(); return g;
  }
  // A ground texture drawn once: blotches and grain over a base colour, tiled across the ground.
  function groundTex(base, marks, seed, rep = 40, strokes = null) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), q = rng(seed);
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 900; k++) { x.globalAlpha = 0.05 + q() * 0.12; x.fillStyle = marks[k % marks.length]; const rr = 2 + q() * 14; x.beginPath(); x.ellipse(q() * 256, q() * 256, rr, rr * (0.4 + q() * 0.6), q() * 3, 0, 6.283); x.fill(); }
    if (strokes) { x.lineWidth = 1.4; for (let k = 0; k < 260; k++) { x.globalAlpha = 0.12 + q() * 0.18; x.strokeStyle = strokes[k % strokes.length]; x.beginPath(); let px = q() * 256, py = q() * 256; x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (q() - 0.5) * 22; py += (q() - 0.5) * 22; x.lineTo(px, py); } x.stroke(); } }
    x.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  // Soft smoke or silt: a sprite whose shape comes from the opaque glow texture used as an alpha map (no
  // near-transparent canvas pixels, which iOS turns into speckles), drawn with normal blending so it can be dark.
  const puff = (color, size, opacity) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: C(color), alphaMap: dot, transparent: true, opacity, depthWrite: false })); s.scale.setScalar(size); return s; };
  // Light falling through water from the surface: long faint additive planes.
  const shafts = (g, n, seed, w, h, spread, color = '#bff6ea', o = 0.05) => { const q = rng(seed); for (let k = 0; k < n; k++) { const sh = mesh(new THREE.PlaneGeometry(w * (0.5 + q()), h), B(color, { transparent: true, opacity: o * (0.6 + q() * 0.8), blending: add, depthWrite: false, side: THREE.DoubleSide, fog: false }), (q() - 0.5) * spread, h * 0.45, -q() * spread * 0.6); sh.rotation.z = 0.25 + q() * 0.15; sh.rotation.y = (q() - 0.5) * 0.6; g.add(sh); } };
  // A cycad: a stout scaly trunk and a crown of stiff, arching leaves with leaflets.
  function cycad(mat, s = 1, leafMat = mat) {
    const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.32 * s, 0.42 * s, 1.3 * s, 9), mat, 0, 0.65 * s, 0));
    for (let k = 0; k < 11; k++) {
      const h = new THREE.Group(), L = (2 + (k % 3) * 0.3) * s, leaf = sweep([[0, 0, 0], [L * 0.45, L * 0.32, 0], [L, L * 0.08, 0]], t => 0.06 * s * (1 - t * 0.7), leafMat, { seg: 10, ring: 4, sz: 0.4 });
      h.add(leaf); for (let j = 1; j < 9; j++) { const t = j / 9, lf = mesh(new THREE.BoxGeometry(0.05 * s, 0.02 * s, 0.6 * s * (1 - t * 0.6)), leafMat, L * t, L * (0.3 * Math.sin(t * Math.PI)) + 0.02, 0); lf.rotation.x = 0.4; h.add(lf); }
      h.position.y = 1.3 * s; h.rotation.y = k / 11 * Math.PI * 2 + (k % 2) * 0.2; h.rotation.z = (k % 3 - 1) * 0.12; g.add(h);
    }
    return g;
  }
  function satellite(s = 1) { const g = new THREE.Group(), panel = M('#1a2a66', { metalness: 0.6, roughness: 0.35, emissive: C('#0a1440') }); g.add(mesh(new THREE.BoxGeometry(1 * s, 1 * s, 1.4 * s), M('#d8c070', { metalness: 0.8, roughness: 0.3 }))); for (const x of [-1.9, 1.9]) g.add(mesh(new THREE.BoxGeometry(2.6 * s, 0.05 * s, 1 * s), panel, x * s, 0, 0)); return g; }
  function station() {
    const g = new THREE.Group(), white = M('#e8e8e8', { metalness: 0.5, roughness: 0.4 }), panel = M('#c8902a', { metalness: 0.7, roughness: 0.3, emissive: C('#3a2208') }), truss = M('#9a9a9a', { metalness: 0.6, roughness: 0.5 });
    g.add(mesh(new THREE.BoxGeometry(30, 0.8, 0.8), truss)); for (const x of [-13, -9, 9, 13]) for (const z of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(2.6, 0.05, 11), panel, x, 0, z * 6.3); g.add(p); }
    for (const [x, len] of [[-2.5, 4], [0, 5], [2.6, 4]]) { const m = mesh(new THREE.CylinderGeometry(0.85, 0.85, len, 12), white, x, 0, 0); m.rotation.x = Math.PI / 2; g.add(m); }
    const lab = mesh(new THREE.CylinderGeometry(0.85, 0.85, 7, 12), white, 0, 0, 0); lab.rotation.z = Math.PI / 2; lab.position.set(0, 0, 0); g.add(lab); g.add(mesh(new THREE.BoxGeometry(1.6, 0.05, 4), M('#f0f0f0'), 0, 1.4, 0)); return g;
  }
  function hubble() { const g = new THREE.Group(), tubeM = M('#d8d8d8', { metalness: 0.9, roughness: 0.25 }), b = mesh(new THREE.CylinderGeometry(1.1, 1.1, 5.2, 16), tubeM); b.rotation.z = Math.PI / 2; g.add(b); const cap = mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.2, 16, 1, true), M('#333')); cap.rotation.z = Math.PI / 2; cap.position.x = 2.7; g.add(cap); for (const z of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(2.2, 0.05, 4.2), M('#2a3a7a', { metalness: 0.6, roughness: 0.3, emissive: C('#0a1440') }), -0.6, 0, z * 3.4)); return g; }

  // 7 Jan: the earliest galaxy we have seen. 290 million years after the Big Bang, galaxies were small, clumpy and
  // blazing blue-white with newborn stars: no spirals yet (those took billions of years to settle). The universe
  // between them was still filled with dark hydrogen haze; each young galaxy lit a bubble of glowing gas around it.
  stages.galaxy = () => {
    const r = rng(41), g = new THREE.Group(), gals = [];
    function youngGalaxy(size, seed, bright = 1) {
      const q = rng(seed), gg = new THREE.Group(), clumps = 2 + Math.floor(q() * 4);
      for (let c = 0; c < clumps; c++) {
        const cx = gauss(q) * size * 0.55, cy = gauss(q) * size * 0.4, cz = gauss(q) * size * 0.4, cr = size * (0.16 + q() * 0.2);
        gg.add(cloud(260, (i, col) => { col.setHSL(0.58 + q() * 0.06, 0.6 + q() * 0.3, 0.55 + q() * 0.35); const d = sphereDir(q), rr = Math.pow(q(), 2.2) * cr; return [cx + d[0] * rr, cy + d[1] * rr * 0.8, cz + d[2] * rr]; }, { size: size * 0.032, opacity: Math.min(1, 0.85 * bright) }));
        const core = glow('#a8c8ff', cr * 0.9, 0.22 * bright); core.position.set(cx, cy, cz); gg.add(core);
      }
      gg.add(glow('#2a62b0', size * 3.2, 0.06 * bright)); /* the bubble of gas its starlight has lit */
      return gg;
    }
    /* the haze: dim, warm and dark, everywhere between the galaxies */
    for (let k = 0; k < 36; k++) { const f = glow(k % 3 ? '#20150c' : '#1a140e', 260 + r() * 520, 0.4); f.position.set((r() - 0.5) * 1500, 28 + (r() - 0.35) * 900, -260 - r() * 1300); g.add(f); }
    /* MoM-z14: compact and the brightest, near the middle of the view */
    const first = youngGalaxy(44, 7, 2); first.position.set(0, 30, 0); first.scale.set(1.5, 0.75, 1); first.userData.sp = 0.02; /* MoM-z14 is compact and elongated */ gals.push(first); g.add(first);
    /* the others, kept to the part of the view above the card (the camera sits at z = 150) */
    for (let k = 0, n = 0; k < 200 && n < 20; k++) {
      const z = -60 - r() * 900, d = 150 - z, x = (r() - 0.5) * d * 0.55, y = 28 + (r() - 0.25) * d * 0.5;
      if (y - 28 < -0.03 * d || Math.hypot(x, y - 30) < 90) continue;
      const m = youngGalaxy(22 + r() * 40, 200 + k, 0.55 + r() * 0.5); m.position.set(x, y, z); m.rotation.set(r() * 3, r() * 3, 0); m.userData.sp = (r() - 0.5) * 0.08; gals.push(m); g.add(m); n++;
    }
    g.add(cloud(500, (i, c) => { c.setHSL(0.6, 0.4, 0.5 + r() * 0.4); const z = -900 - r() * 900, d = 150 - z; return [(r() - 0.5) * d * 0.9, 28 + (r() - 0.1) * d * 0.7, z]; }, { size: 2.4, opacity: 0.45 }));
    return { group: g, fit: 1, pose: { pos: V(0, 28, 150), look: V(0, 28, -40) }, fog: ['#020206', 1400, 3200], update(t) { for (const m of gals) m.rotation.y += m.userData.sp * 0.01; } };
  };
  // 2 Sep: the Sun in a ringed disc of dust, with planets forming in the gaps
  stages.sun = () => {
    const r = rng(15), g = new THREE.Group(), BANDS = [[95, 140], [165, 225], [255, 320], [360, 470]];
    const star = mesh(new THREE.SphereGeometry(34, 48, 32), new THREE.MeshBasicMaterial({ map: photo('sun'), color: C('#ffe6b8'), fog: false })), halo = glow('#ffa040', 260, 0.9);
    const disc = cloud(15000, (i, c) => { const b = BANDS[Math.floor(r() * BANDS.length)], rr = b[0] + r() * (b[1] - b[0]), th = r() * 6.2832; c.setHSL(0.07 + r() * 0.05, 0.65, 0.35 + r() * 0.35 * (200 / rr)); return [Math.cos(th) * rr, gauss(r) * 3.5, Math.sin(th) * rr]; }, { size: 2.1 });
    const planets = [[152, 5, '#9a8a7a'], [240, 7, '#5a8ac8'], [340, 15, '#d8b070'], [490, 11, '#8ab0c8']].map(([rr, rad, col], k) => { const p = mesh(new THREE.SphereGeometry(rad, 24, 16), M(col, { roughness: 0.7 })); p.userData = { rr, ph: k * 1.7, sp: 0.5 / Math.sqrt(rr / 100) }; if (k === 2) { const ring = mesh(new THREE.RingGeometry(rad * 1.5, rad * 2.4, 48), M('#c8a878', { side: THREE.DoubleSide, transparent: true, opacity: 0.7 })); ring.rotation.x = 1.2; p.add(ring); } g.add(p); return p; });
    g.add(star, halo, disc);
    return { group: g, pose: { pos: V(0, 230, 360), look: V(0, -20, 0) }, fog: ['#050304', 1200, 3000], update(t) { disc.rotation.y = t * 0.04; star.rotation.y = t * 0.05; for (const p of planets) { const a = p.userData.ph + t * p.userData.sp * 0.25; p.position.set(Math.cos(a) * p.userData.rr, 0, Math.sin(a) * p.userData.rr); p.rotation.y = t * 0.3; } } };
  };
  // 22 Sep: the first life. The oldest traces of life (3.7 to 4.1 billion years ago) are microscopic cells, and many
  // scientists think life began at vents on the dark sea floor, where hot, mineral-rich water rises through the rock.
  // So: a vent field, with black smokers trailing dark plumes and pale carbonate towers, and slimy films of microbes
  // on the rock. The cells themselves are far too small to see; they are the faint motes drifting in the water.
  // The early ocean had no oxygen and was rich in dissolved iron, which may have tinted it green.
  stages.life = () => {
    const r = rng(43), g = new THREE.Group(), plumes = [];
    g.add(skyDome('#2f7a68', '#0b2f2a', '#061a17', 400), ground(M('#3a3a34', { map: groundTex('#34332d', ['#1f1f1b', '#4a463c', '#2a2a24'], 5, 30) })), hemi('#7fd8c0', '#1c1c16', 1.7));
    const smoker = M('#3c3530', { roughness: 0.9, flatShading: true }), crust = M('#5a3a22', { roughness: 1 }), white = M('#cfc7b4', { roughness: 0.95, flatShading: true });
    const mat = (c, e) => M(c, { roughness: 0.6, emissive: C(e), emissiveIntensity: 0.9, transparent: true, opacity: 0.95 });
    const chimney = (x, z, h, w, m, seed) => { const q = rng(seed), wob = [0, 1, 2, 3, 4].map(() => (q() - 0.5) * w * 0.5); const c = sweep(wob.map((dx, k) => [x + dx, h * k / 4, z]), t => w * (1 - 0.55 * t) * (1 + 0.18 * Math.sin(t * 26 + seed) + 0.1 * Math.sin(t * 63 + seed * 2)), m, { seg: 30, ring: 10 }); c.position.y = -0.1; return c; };
    /* black smokers, with dark plumes rising and spreading */
    for (const [x, z, h, w] of [[-1.6, -3, 7.5, 0.75], [2.4, -6, 9.5, 0.9], [-5, -9, 6, 0.7], [6, -12, 8, 0.85], [0.6, -14, 11, 1]]) {
      const c = chimney(x, z, h, w, smoker, x * 7 + z); g.add(c); const top = V(x, h, z);
      g.add(mesh(new THREE.CylinderGeometry(w * 1.6, w * 2.2, 0.5, 12), crust, x, 0.2, z));
      for (let k = 0; k < 9; k++) { const p = puff(k % 2 ? '#141414' : '#1c1a18', 1, 0.55); p.userData = { top, ph: k / 9, sp: 0.06 + r() * 0.03, dx: (r() - 0.5) * 0.6 }; plumes.push(p); g.add(p); }
    }
    /* pale carbonate towers, like the Lost City vents: alkaline vents, a favourite idea for where life began */
    for (const [x, z, h, w] of [[-8, -5, 6, 1.1], [-10.5, -7, 8.5, 1.2], [9, -4, 4.5, 0.9]]) { g.add(chimney(x, z, h, w, white, x * 3 + z)); g.add(chimney(x + w, z + 0.5, h * 0.55, w * 0.6, white, x + z * 5)); }
    /* microbial mats on the rock around the vents: slimy films in white, ochre, rust and green, brightest where the warm water seeps */
    for (let k = 0; k < 90; k++) { const a = r() * 6.283, d = 0.6 + r() * 8, f = mesh(new THREE.CircleGeometry(0.5 + r() * 1.5, 12), mat(['#efe4c0', '#e0a040', '#c8602a', '#7ab84a'][k % 4], ['#6a5a30', '#6a3a08', '#5a1e06', '#2a5a10'][k % 4]), Math.cos(a) * d, 0.02 + k * 0.0004, -6 + Math.sin(a) * d * 0.8); f.rotation.x = -Math.PI / 2; f.scale.y = 0.5 + r() * 0.5; g.add(f); }
    for (let k = 0; k < 26; k++) { const s = 0.3 + r() * 1.2, m = mesh(rockGeo(s, 100 + k), M('#2e2d28', { flatShading: true, roughness: 1 }), (r() - 0.5) * 24, s * 0.2, 2 - r() * 18); m.rotation.y = r() * 6; g.add(m); }
    /* a lens over the mat: what the slime is made of, magnified about 2,000 times: rod- and ball-shaped cells,
       some dividing in two, each a thin skin around a speck of DNA */
    const lens = new THREE.Group(), lensR = 1.55, flat = o => ({ fog: false, ...o }), cells = [];
    lens.add(mesh(new THREE.CircleGeometry(lensR, 48), B('#0d2c27', flat({ transparent: true, opacity: 0.94 }))), mesh(new THREE.TorusGeometry(lensR, 0.05, 8, 64), B('#f3c887', flat())));
    const skin = (c) => new THREE.MeshStandardMaterial({ color: C(c), roughness: 0.35, transparent: true, opacity: 0.8, emissive: C(c), emissiveIntensity: 0.25, fog: false });
    const rodG = new THREE.CapsuleGeometry(0.11, 0.34, 6, 12), ballG = new THREE.SphereGeometry(0.13, 16, 12), dnaG = new THREE.SphereGeometry(0.035, 8, 6), dnaM = B('#2a4a30', flat());
    for (let k = 0; k < 22; k++) { const c = new THREE.Group(), kind = k % 4, m = skin(['#9fe0b0', '#c8e890', '#f0c888', '#a8d8e0'][k % 4]);
      if (kind === 3) { c.add(mesh(ballG, m, -0.1, 0, 0), mesh(ballG, m, 0.1, 0, 0)); } else c.add(mesh(kind === 1 ? ballG : rodG, m));
      c.add(mesh(dnaG, dnaM)); const a = r() * 6.283, d = Math.sqrt(r()) * (lensR - 0.3); c.position.set(Math.cos(a) * d, Math.sin(a) * d, 0.15); c.rotation.set(r() * 3, r() * 3, r() * 3); c.userData = { a, d, sp: (r() - 0.5) * 0.2, sp2: 0.3 + r() * 0.6 }; cells.push(c); lens.add(c); }
    const tag = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#0d2c27'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#f3c887'; x.font = '600 30px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('× 2,000', 128, 34); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, fog: false })); sp.scale.set(2, 0.5, 1); sp.position.set(0, -lensR - 0.42, 0); return sp; })();
    lens.add(tag); lens.scale.setScalar(0.55); lens.position.set(0.85, 4.75, 6); lens.lookAt(0, 3.4, 14); g.add(lens);
    /* a thin line from the lens down to the patch of mat it magnifies */
    { const lg = new THREE.BufferGeometry().setFromPoints([V(0.6, 4.75 - lensR * 0.55, 6), V(-0.4, 0.1, -0.5)]); g.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: C('#f3c887'), transparent: true, opacity: 0.55, fog: false }))); }
    { const spot = mesh(new THREE.CircleGeometry(0.5, 24), B('#f3c887', { transparent: true, opacity: 0.35 }), -0.4, 0.06, -0.5); spot.rotation.x = -Math.PI / 2; g.add(spot); }
    /* the rest: far too small to see one by one, a haze of motes over the vents */
    const motes = cloud(1600, (i, c) => { c.setHSL(0.33 + r() * 0.08, 0.5, 0.55 + r() * 0.3); return [(r() - 0.5) * 18, r() * 9, -r() * 16 + 2]; }, { size: 0.045, opacity: 0.7 }); g.add(motes);
    shafts(g, 5, 7, 2.4, 30, 22, '#a8f0d8', 0.035);
    return { group: g, sun: 0.9, amb: 0.45, sunDir: [-2, 5, 3], fit: 1, pose: { pos: V(0, 3.4, 14), look: V(0, 4.4, -6) }, fog: ['#0b2f2a', 4, 46], update(t) {
      for (const p of plumes) { const u = (t * p.userData.sp + p.userData.ph) % 1, d = p.userData.top; p.position.set(d.x + p.userData.dx * u * 4 + Math.sin(t * 0.3 + p.userData.ph * 6) * u, d.y + 0.2 + u * 9, d.z); p.scale.setScalar(0.6 + u * 4.5); p.material.opacity = 0.6 * (1 - u) * Math.min(1, u * 6); }
      motes.rotation.y = Math.sin(t * 0.05) * 0.05; motes.position.y = Math.sin(t * 0.2) * 0.15;
      for (const c of cells) { const u = c.userData, a = u.a + t * u.sp * 0.3; c.position.x = Math.cos(a) * u.d; c.position.y = Math.sin(a) * u.d; c.rotation.z += 0.004 * u.sp2; c.rotation.x += 0.003 * u.sp2; }
    } };
  };
  // 14 Dec: the first animals we can see as fossils: the Ediacaran sea floor, about 570 million years ago. Soft-bodied
  // life on a carpet of microbial mat: fern-like fronds (Charnia), ribbed ovals (Dickinsonia), three-armed discs
  // (Tribrachidium), the slug-like Kimberella and small vase sponges. Almost nothing swam yet; jellyfish are later.
  stages.animals = () => {
    const r = rng(47), g = new THREE.Group(), fronds = [], crawlers = [];
    g.add(skyDome('#6cc4e4', '#1a5a80', '#0c3048', 400), ground(M('#6a7058', { map: groundTex('#5e6a50', ['#4a5a40', '#7a805e', '#56604a'], 9, 60, ['#3e4a34', '#8a9070']) })), hemi('#c0ecff', '#3a4030', 1.35));
    /* their real colours are unknown (only impressions in rock survive); soft, living tones keep them apart from the mat */
    const tissue = (c, e) => M(c, { roughness: 0.55, emissive: C(e), emissiveIntensity: 0.35 });
    const peach = tissue('#ffb08a', '#5a2410'), tan = tissue('#e8907a', '#4a1a10'), sand = tissue('#ffd2a0', '#4a3010'), pale = tissue('#ffc8c8', '#4a2020');
    /* Charnia: a holdfast disc, a short stalk and a leaf-like frond of paired branches, smaller towards the tip */
    const branch = new THREE.SphereGeometry(1, 10, 8);
    const frond = (h, m) => { const f = new THREE.Group(); f.add(mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 14), tan), mesh(new THREE.CylinderGeometry(0.035, 0.045, h * 0.22, 6), tan, 0, h * 0.11, 0), mesh(new THREE.CylinderGeometry(0.02, 0.035, h * 0.8, 6), m, 0, h * 0.6, 0));
      for (let j = 0; j < 16; j++) { const t = j / 16, w = 0.42 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 0.05; for (const side of [-1, 1]) { const b = mesh(branch, m, side * w * 0.5, h * (0.24 + t * 0.72), 0); b.scale.set(w * 0.55, h * 0.022, 0.06); b.rotation.z = side * -0.5; f.add(b); } }
      return f; };
    for (let k = 0; k < 22; k++) { const near = k < 7, h = near ? 2.2 + r() * 1.6 : 1.2 + r() * 2.4, f = frond(h, k % 3 ? peach : pale); f.position.set(near ? (k - 3) * 1.6 + (r() - 0.5) * 0.6 : (r() - 0.5) * 20, 0, near ? -2.5 - r() * 3 : -5 - r() * 12); f.rotation.y = r() * 3; f.userData.a = r() * 9; fronds.push(f); g.add(f); }
    /* Dickinsonia: a flat oval, ribbed across from a midline */
    for (let k = 0; k < 9; k++) { const d = new THREE.Group(), L = 0.6 + r() * 0.8, body = mesh(new THREE.SphereGeometry(1, 20, 10), tan); body.scale.set(L, 0.04, L * 0.72); d.add(body);
      for (let j = -9; j <= 9; j++) { const x = j / 10 * L, w = L * 0.72 * Math.sqrt(1 - (j / 10) ** 2); d.add(mesh(new THREE.BoxGeometry(L * 0.025, 0.055, w * 1.9), sand, x, 0.02, 0)); }
      d.add(mesh(new THREE.BoxGeometry(L * 1.9, 0.06, 0.03), sand)); d.position.set((r() - 0.5) * 7, 0.02, -0.6 - r() * 5); d.rotation.y = r() * 3; g.add(d); }
    /* Tribrachidium: a low disc with three curved arms */
    for (let k = 0; k < 7; k++) { const tb = new THREE.Group(), s = 0.25 + r() * 0.2, dome = mesh(new THREE.SphereGeometry(s, 16, 8, 0, 6.283, 0, Math.PI / 2), pale); dome.scale.y = 0.35; tb.add(dome); for (let a = 0; a < 3; a++) { const arm = sweep([[0, 0, 0], [s * 0.5, s * 0.1, 0], [s * 0.85, s * 0.08, 0.3 * s]], t => s * 0.09 * (1 - t * 0.5), sand, { seg: 8, ring: 6 }); arm.rotation.y = a * 2.094; tb.add(arm); } tb.position.set((r() - 0.5) * 6, 0, -0.5 - r() * 4); g.add(tb); }
    /* Kimberella: a slug-like dome with a frilled edge, grazing the mat (slowly) */
    for (let k = 0; k < 4; k++) { const kb = new THREE.Group(), body = mesh(new THREE.SphereGeometry(0.5, 18, 10), peach); body.scale.set(1, 0.32, 0.6); body.position.y = 0.08; const frill = mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 24), sand, 0, 0.04, 0); frill.rotation.x = Math.PI / 2; frill.scale.set(1.05, 0.66, 1); kb.add(body, frill); kb.position.set((r() - 0.5) * 6, 0, -1 - r() * 4); kb.rotation.y = r() * 6; kb.userData = { x: kb.position.x, z: kb.position.z, a: r() * 6 }; crawlers.push(kb); g.add(kb); }
    /* small vase sponges */
    for (let k = 0; k < 9; k++) { const h = 0.5 + r() * 0.9, sp = sweep([[0, 0, 0], [0, h * 0.5, 0], [0, h, 0]], t => 0.12 + 0.16 * Math.sin(t * 2.4), M('#f0d060', { roughness: 0.8, side: THREE.DoubleSide, emissive: C('#4a3a08') }), { seg: 10, ring: 12 }); sp.position.set((r() - 0.5) * 18, 0, -r() * 14); g.add(sp); }
    const snow = cloud(500, () => [(r() - 0.5) * 26, r() * 10, -r() * 22 + 4], { size: 0.05, opacity: 0.35 }); g.add(snow);
    shafts(g, 6, 11, 2.2, 26, 22, '#c8f2ff', 0.045);
    return { group: g, sun: 1.6, amb: 0.45, sunDir: [2, 5, 3], fit: 1, pose: { pos: V(0, 1.5, 4.2), look: V(0, 1.4, -4) }, fog: ['#1a5a80', 5, 44], update(t) {
      for (const f of fronds) { f.rotation.z = Math.sin(t * 0.5 + f.userData.a) * 0.07; f.rotation.x = Math.sin(t * 0.37 + f.userData.a) * 0.04; }
      for (const c of crawlers) { const u = t * 0.02 + c.userData.a; c.position.x = c.userData.x + Math.cos(u) * 0.8; c.position.z = c.userData.z + Math.sin(u) * 0.5; c.rotation.y = -u; }
      snow.position.y = -((t * 0.08) % 1) * 0.6;
    } };
  };
  // 20 Dec: plants reach the land, about 450 to 470 million years ago. The first land plants were tiny and low, like
  // today's liverworts and mosses: green films and cushions on damp rock at the water's edge, with spore stalks no
  // taller than a fingernail. Taller, stemmed plants (like Cooksonia) came 20 to 30 million years later.
  stages.plants = () => {
    const r = rng(53), g = new THREE.Group(), foam = [];
    g.add(skyDome('#6a9ad4', '#f4e8cc', '#cdbd98', 2400, { dir: [0.7, 0.16, -1], col: '#fff4d8' }), ground(M('#6a6052', { map: groundTex('#5e564a', ['#4a443a', '#7a705e', '#3e3a32'], 13, 50) })), hemi('#d8e8ff', '#4a4034', 1.0));
    const sea = mesh(new THREE.PlaneGeometry(600, 300), M('#3a6a8c', { metalness: 0.35, roughness: 0.18 }), 0, 0.04, -160); sea.rotation.x = -Math.PI / 2; g.add(sea);
    for (let k = 0; k < 3; k++) { const f = mesh(new THREE.PlaneGeometry(80, 0.5 + k * 0.3), B('#f2f4f0', { transparent: true, opacity: 0.5 }), 0, 0.06 + k * 0.01, -11 - k * 2.2); f.rotation.x = -Math.PI / 2; f.userData = { z: f.position.z, a: k * 2 }; foam.push(f); g.add(f); }
    const wet = M('#55524c', { roughness: 0.35, metalness: 0.1, flatShading: true }), pool = M('#5a88a8', { metalness: 0.5, roughness: 0.08 });
    for (let k = 0; k < 9; k++) { const p = mesh(new THREE.CircleGeometry(0.4 + r() * 1.1, 18), pool, (r() - 0.5) * 14, 0.03, -2 - r() * 7); p.rotation.x = -Math.PI / 2; p.scale.y = 0.6 + r() * 0.4; g.add(p); }
    const rocks = []; for (let k = 0; k < 34; k++) { const z = 0.5 - r() * 13, s = (0.12 + r() * 0.35) * (1 + Math.max(0, -z - 3) * 0.25), m = mesh(rockGeo(s, 300 + k, 1, 0.55), z < -7 ? wet : M(['#77706a', '#6a625a', '#837a70'][k % 3], { flatShading: true, roughness: 0.95 }), (r() - 0.5) * 18, s * 0.12, z); m.rotation.y = r() * 6; rocks.push(m); g.add(m); }
    /* liverwort-like thalli: flat, forked, overlapping green lobes in rosettes, crowding the damp hollows */
    const lobe = new THREE.SphereGeometry(1, 10, 6), greens = ['#4e8a32', '#3c7428', '#5c9a3c', '#6aa646'].map(c => M(c, { roughness: 0.7 }));
    const patches = []; for (let k = 0; k < 34; k++) patches.push([(r() - 0.5) * (k < 14 ? 5 : 14), k < 14 ? -0.9 - r() * 3 : -r() * 9 + 0.5, 0.3 + r() * 0.8]);
    const lobes = []; for (const [px, pz, pr] of patches) for (let j = 0; j < 22; j++) { const a = r() * 6.283, d = Math.sqrt(r()) * pr; lobes.push([px + Math.cos(a) * d, 0.035, pz + Math.sin(a) * d, a, 0, 0, [0.1 + r() * 0.09, 0.02, 0.05 + r() * 0.035], j % 4]); }
    for (let c = 0; c < 4; c++) g.add(instanced(lobe, greens[c], lobes.filter(l => l[7] === c)));
    /* moss cushions in the cracks of the rocks, with tiny spore stalks (a few millimetres tall) */
    const cushion = M('#5a9638', { roughness: 1 }), tips = [], stalks = [];
    const bumps = []; for (let k = 0; k < 30; k++) { const s = 0.08 + r() * 0.18, x = (r() - 0.5) * (k < 14 ? 4 : 13), z = k < 14 ? -1.2 - r() * 2.4 : -1.2 - r() * 8; g.add(mesh(new THREE.SphereGeometry(s * 0.9, 12, 6, 0, 6.283, 0, Math.PI / 2), M('#3e6e28', { roughness: 1 }), x, 0, z)).children.at(-1).scale.y = 0.45;
      for (let j = 0; j < 45; j++) { const d = sphereDir(r), u = Math.abs(d[1]); bumps.push([x + d[0] * s, u * s * 0.45, z + d[2] * s, 0, 0, 0, s * (0.1 + r() * 0.06)]); }
      for (let j = 0; j < 7; j++) { const a = r() * 6.283, d = r() * s * 0.8, h = 0.04 + r() * 0.05, sx = x + Math.cos(a) * d, sz = z + Math.sin(a) * d; stalks.push([sx, s * 0.3 + h / 2, sz, 0, 0, (r() - 0.5) * 0.3, [1, h, 1]]); tips.push([sx, s * 0.3 + h, sz, 0, 0, 0, [1, 1.6, 1]]); } }
    g.add(instanced(new THREE.SphereGeometry(1, 6, 4), cushion, bumps), instanced(new THREE.CylinderGeometry(0.0022, 0.003, 1, 4), M('#e0c878'), stalks), instanced(new THREE.SphereGeometry(0.008, 6, 4), M('#5a3014'), tips));
    return { group: g, sun: 2.2, amb: 0.5, sunDir: [3, 2, 2], pose: { pos: V(0, 0.75, 1.6), look: V(0, 0.2, -2.6) }, fit: 1, fog: ['#e8dcc0', 14, 170], update(t) {
      for (const f of foam) { const u = Math.sin(t * 0.5 + f.userData.a); f.position.z = f.userData.z + u * 0.6; f.material.opacity = 0.3 + 0.25 * (u + 1) / 2; }
    } };
  };
  // 25 Dec: the dinosaurs appear, about 230 million years ago, in the Late Triassic, when all the land was one
  // continent, Pangaea. The first dinosaurs were small and walked on two legs: a hunter like Herrerasaurus and small
  // long-necked plant-eaters like Saturnalia, ancestors of the giant sauropods. They shared the land with stocky,
  // beaked dicynodonts (like Placerias), among conifers (Araucarioxylon, the Petrified Forest trees), tree ferns,
  // cycads and horsetails by a river. The giants (Brachiosaurus, T. rex) came tens of millions of years later.
  stages.dinos = () => {
    const r = rng(59), g = new THREE.Group(), walkers = [], drinkers = [], herd = [];
    g.add(skyDome('#5a86c0', '#ffd8a0', '#6a5030', 2400, { dir: [-1, 0.16, -0.55], col: '#fff4d8' }), ground(M('#5e5a34', { map: groundTex('#5a5632', ['#46482a', '#6e6a3c', '#7a5a34'], 17, 70) })), hemi('#ffe8c8', '#3a3420', 1.4));
    { const rim = new THREE.DirectionalLight(C('#fff0d0'), 2.2); rim.position.set(-6, 8, -40); rim.target.position.set(0, 0, -10); g.add(rim, rim.target); } /* backlight: a bright edge on every animal */
    /* the river, holding the sky's colour: a flat ribbon winding away from the middle distance */
    const bank = new THREE.CatmullRomCurve3([V(30, 0, -12), V(10, 0, -16), V(-6, 0, -26), V(4, 0, -48), V(30, 0, -90), V(10, 0, -160), V(-40, 0, -300)]), rp = [], ri = [], reeds = [];
    for (let i = 0; i <= 80; i++) { const t = i / 80, c = bank.getPointAt(t), tg = bank.getTangentAt(t), w = 2.2 + t * 22, nx = -tg.z, nz = tg.x; rp.push(c.x + nx * w, 0.05, c.z + nz * w, c.x - nx * w, 0.05, c.z - nz * w); if (i < 80) ri.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      for (let k = 0; k < (t < 0.4 ? 5 : 2); k++) { const side = k % 2 ? 1 : -1, off = w + 0.4 + r() * 2, h = 0.7 + r() * 1.3; reeds.push([c.x + nx * off * side, h / 2, c.z + nz * off * side, (r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.12, [1, h, 1]]); } }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
    g.add(mesh(rg, B('#e8d8b0', { transparent: true, opacity: 0.85, side: THREE.DoubleSide })));
    /* red-bed mesas on the horizon */
    for (let k = 0; k < 9; k++) { const w = 60 + r() * 120, h = 18 + r() * 40, m = mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.55, h, 7), M('#b8704a', { flatShading: true }), -500 + k * 130 + r() * 40, h / 2 - 1, -520 - r() * 200); m.rotation.y = r() * 3; g.add(m); }
    const bark = M('#4a3424', { roughness: 1 }), needle = M('#3a4a22', { roughness: 0.95, flatShading: true }), fern = M('#4a6a28', { roughness: 0.9, side: THREE.DoubleSide }), cy = M('#5a4a30');
    /* Triassic conifers: tall straight trunks with a crown of short whorled branches */
    const conifer = (x, z, h) => { const t = new THREE.Group(); t.add(mesh(new THREE.CylinderGeometry(0.35 * h / 30, 0.8 * h / 30, h, 8), bark, 0, h / 2, 0)); for (let k = 0; k < 7; k++) { const y = h * (0.62 + k * 0.055), L = h * (0.16 - k * 0.018); for (let a = 0; a < 5; a++) { const br = sweep([[0, 0, 0], [L * 0.5, L * 0.05, 0], [L, -L * 0.12, 0]], u => 0.4 * (1 - u * 0.6) * h / 30, bark, { seg: 6, ring: 5 }); const tuft = mesh(rockGeo(L * 0.35, k * 5 + a, 1, 0.6), needle, L, -L * 0.1, 0); const arm = new THREE.Group(); arm.add(br, tuft); arm.position.y = y; arm.rotation.y = a * 1.257 + k * 0.6; t.add(arm); } } t.add(mesh(rockGeo(h * 0.06, x, 1, 1.4), needle, 0, h * 1.02, 0)); t.position.set(x, 0, z); return t; };
    for (const [x, z, h] of [[-46, -70, 34], [-62, -96, 40], [-30, -130, 30], [58, -84, 36], [76, -120, 42], [34, -150, 28], [-90, -160, 38], [100, -180, 34]]) g.add(conifer(x, z, h));
    /* tree ferns: a fibrous trunk and arching, drooping fronds */
    const treeFern = (x, z, s) => { const t = new THREE.Group(); t.add(mesh(new THREE.CylinderGeometry(0.28 * s, 0.4 * s, 4 * s, 8), bark, 0, 2 * s, 0)); for (let k = 0; k < 12; k++) { const L = 3 * s, fr = sweep([[0, 0, 0], [L * 0.45, L * 0.35, 0], [L, -L * 0.15, 0]], u => (0.25 - u * 0.2) * s, fern, { seg: 10, ring: 3, sz: 0.15 }); fr.scale.z = 2.2; const h = new THREE.Group(); h.add(fr); h.position.y = 4 * s; h.rotation.y = k * 0.524; h.rotation.z = (k % 2) * 0.15; t.add(h); } t.position.set(x, 0, z); return t; };
    for (const [x, z, s] of [[-22, -26, 1.5], [-34, -44, 1.8], [26, -30, 1.4], [40, -52, 1.9], [-14, -60, 1.3]]) g.add(treeFern(x, z, s));
    for (const [x, z, s] of [[-17, -8, 1.3], [19, -10, 1.1], [30, -18, 1.5], [-28, -16, 1.4]]) { const c = cycad(cy, s, fern); c.position.set(x, 0, z); g.add(c); }
    /* horsetails along the river banks */
    g.add(instanced(new THREE.CylinderGeometry(0.03, 0.045, 1, 5), M('#5a6a2a'), reeds));
    /* the animals: smooth bodies swept along a spine, legs that swing as they walk */
    const hide = (c) => M(c, { roughness: 0.8 }), pattern = (back, belly, stripe) => { const A = C(back), Bc = C(belly), S2 = C(stripe), k = new THREE.Color(); return (t, up) => { k.copy(Bc).lerp(A, Math.min(1, Math.max(0, up * 0.8 + 0.5))); if (up > 0.1 && Math.sin(t * 70) > 0.55) k.lerp(S2, 0.55); return k; }; }, skin = M('#ffffff', { roughness: 0.75, vertexColors: true });
    const leg = (m, len, w, hipX, hipY, z) => { const j = new THREE.Group(); j.position.set(hipX, hipY, z); const l = sweep([[0, 0, 0], [len * 0.18, -len * 0.45, 0], [-len * 0.1, -len * 0.82, 0], [len * 0.12, -len, 0]], t => w * (1 - t * 0.65), m, { seg: 12, ring: 8 }); j.add(l); return j; };
    function biped({ spine, rad, legLen, legW, hip, armAt, m, s = 1, sz = 0.8, colors = null }) { const a = new THREE.Group(), body = sweep(spine, rad, colors ? skin : m, { seg: 64, ring: 14, sz, colors }); a.add(body); const legs = [-1, 1].map(side => { const l = leg(m, legLen, legW, hip[0], hip[1], side * legW * 1.3); a.add(l); return l; }); if (armAt) for (const side of [-1, 1]) a.add(sweep([[armAt[0], armAt[1], side * 0.2], [armAt[0] + 0.25, armAt[1] - 0.35, side * 0.25], [armAt[0] + 0.45, armAt[1] - 0.55, side * 0.22]], t => 0.07 * (1 - t * 0.5), m, { seg: 6, ring: 6 })); a.scale.setScalar(s); a.userData.legs = legs; return a; }
    /* Herrerasaurus: a lean two-legged hunter, about 4 m long */
    const herrera = s => biped({ s, m: hide('#5a3a22'), colors: pattern('#6a3a1e', '#e8c890', '#2a1608'), legLen: 1.55, legW: 0.17, hip: [-0.3, 1.55], armAt: [1.15, 1.45],
      spine: [[3.1, 2.05, 0], [2.6, 2.15, 0], [2.0, 2.0, 0], [1.4, 1.7, 0], [0.6, 1.55, 0], [-0.4, 1.6, 0], [-1.6, 1.55, 0], [-3, 1.4, 0], [-4.6, 1.3, 0]],
      rad: t => t < 0.08 ? 0.13 + t * 1.6 : t < 0.16 ? 0.26 - (t - 0.08) * 1.2 : t < 0.45 ? 0.17 + Math.sin((t - 0.16) / 0.29 * Math.PI / 2) * 0.38 : 0.55 * Math.pow(1 - (t - 0.45) / 0.55, 1.3) + 0.02 });
    for (const [x, z, ry, s, ph] of [[-0.6, -12, 0, 1, Math.PI / 2], [-1.2, -19, 0, 0.9, Math.PI * 1.35]]) { const h = herrera(s); h.position.set(x, 0, z); h.rotation.y = ry; h.userData.ph = ph; h.userData.x0 = x; h.userData.z0 = z; walkers.push(h); g.add(h); }
    /* Saturnalia-like early sauropodomorphs: small head, long neck, long tail, about 1.5 m, drinking at the river */
    const saturn = s => biped({ s, m: hide('#5a6a3a'), colors: pattern('#5a7038', '#e0dca8', '#3a4a20'), legLen: 1.05, legW: 0.12, hip: [-0.2, 1.05], armAt: [0.75, 1.0],
      spine: [[2.6, 0.55, 0], [2.3, 0.75, 0], [1.9, 1.05, 0], [1.4, 1.2, 0], [0.7, 1.1, 0], [-0.2, 1.1, 0], [-1.2, 1.05, 0], [-2.4, 0.9, 0], [-3.6, 0.75, 0]],
      rad: t => t < 0.05 ? 0.07 + t * 1.2 : t < 0.3 ? 0.1 + (t - 0.05) * 0.4 : t < 0.55 ? 0.2 + Math.sin((t - 0.3) / 0.25 * Math.PI / 2) * 0.12 : 0.32 * Math.pow(1 - (t - 0.55) / 0.45, 1.3) + 0.015 });
    for (const [x, z, ry] of [[2.6, -16, 2.75], [4.6, -18, 2.95], [1.6, -19.5, 2.5]]) { const a = saturn(1.1); a.position.set(x, 0, z); a.rotation.y = ry; a.userData.ph = x; drinkers.push(a); g.add(a); }
    /* dicynodonts (Placerias): barrel bodies on four short legs, a beak and two tusks; the big plant-eaters of the day */
    const dicyno = (x, z, ry, s) => { const a = new THREE.Group(), m = hide('#7a7468'); a.add(sweep([[1.15, 0.85, 0], [0.4, 0.95, 0], [-0.6, 0.92, 0], [-1.4, 0.72, 0], [-1.9, 0.55, 0]], t => 0.48 * Math.sin(Math.PI * (0.2 + t * 0.75)) + 0.05, skin, { seg: 30, ring: 14, sz: 1.15, colors: pattern('#6a665c', '#c8c0a8', '#6a665c') }));
      const head = mesh(new THREE.SphereGeometry(0.3, 14, 10), m, 1.45, 0.8, 0); head.scale.set(1.25, 0.9, 0.9); const beak = mesh(new THREE.ConeGeometry(0.13, 0.32, 8), M('#3a2c20'), 1.85, 0.68, 0); beak.rotation.z = -Math.PI / 2 - 0.5; a.add(head, beak);
      for (const [lx, lz] of [[0.9, 0.5], [0.9, -0.5], [-1, 0.5], [-1, -0.5]]) a.add(mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.5, 8), m, lx, 0.25, lz)); for (const side of [-1, 1]) { const tusk = mesh(new THREE.ConeGeometry(0.05, 0.3, 6), M('#e8dcc0'), 1.62, 0.5, side * 0.16); tusk.rotation.z = Math.PI; a.add(tusk); }
      a.scale.setScalar(s); a.position.set(x, 0, z); a.rotation.y = ry; a.userData.ph = x; herd.push(a); return a; };
    g.add(dicyno(-3.4, -22, 0.25, 1.35), dicyno(-5.6, -25, 0.45, 1.15), dicyno(-1.8, -26, 0.1, 1.25));
    return { group: g, sun: 2.4, amb: 0.5, sunDir: [-4, 2.4, 2.2], sunColor: '#ffd8a8', fit: 1, pose: { pos: V(0, 2.6, 6), look: V(0, 2.6, -20) }, fog: ['#e8c8a0', 40, 700], update(t) {
      for (const w of walkers) { const u = t * 1.6 + w.userData.ph, [l1, l2] = w.userData.legs; l1.rotation.z = Math.sin(u) * 0.45; l2.rotation.z = -Math.sin(u) * 0.45; /* a long, flat loop, so the hunters are seen side-on, striding across the view */ const th = t * 0.05 + w.userData.ph, A = 3.4, Bz = 0.7; w.position.x = w.userData.x0 + Math.cos(th) * A; w.position.z = w.userData.z0 + Math.sin(th) * Bz; w.rotation.y = Math.atan2(-Math.cos(th) * Bz, -Math.sin(th) * A); w.position.y = Math.abs(Math.sin(u)) * 0.06; }
      for (const a of drinkers) { a.children[0].rotation.z = -0.05 + Math.sin(t * 0.5 + a.userData.ph) * 0.05; }
      for (const a of herd) a.rotation.y += Math.sin(t * 0.2 + a.userData.ph) * 0.0008;
    } };
  };
  // A jointed early human: shaped torso, tapered limbs, head with jaw, nose and curly hair, hands, feet and a hide wrap.
  // Joints are groups, so a pose is a handful of angles (negative x swings a limb forward; knees bend with positive x).
  function human({ skin = '#4a2c1c', s = 1, female = false, pose = {}, seed = 1, cloth = null } = {}) {
    const q = rng(seed), SK = M(skin, { roughness: 0.62 }), HIDE = M(cloth || (q() > 0.5 ? '#7a5434' : '#6a4a2e'), { roughness: 1 }), HAIR = M('#120c08', { roughness: 1 });
    const limb = (len, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, len, 10); g.translate(0, -len / 2, 0); const m = new THREE.Mesh(g, SK); m.add(new THREE.Mesh(new THREE.SphereGeometry(r0, 10, 8), SK)); return m; };
    const joint = (x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); return j; };
    const root = new THREE.Group(), pelvis = joint(0, 0.93, 0); root.add(pelvis);
    const hipW = female ? 0.105 : 0.095, legs = [-1, 1].map(side => { const hip = joint(side * hipW, 0, 0), thigh = limb(0.44, 0.075, 0.055), knee = joint(0, -0.44, 0), shin = limb(0.42, 0.052, 0.036), ankle = joint(0, -0.42, 0), foot = mesh(new THREE.BoxGeometry(0.085, 0.05, 0.22), SK, 0, -0.035, 0.06); hip.add(thigh, knee); knee.add(shin, ankle); ankle.add(foot); pelvis.add(hip); return { hip, knee }; });
    const prof = (female ? [[0.12, -0.06], [0.175, 0], [0.16, 0.1], [0.125, 0.2], [0.15, 0.33], [0.165, 0.42], [0.17, 0.5], [0.09, 0.56]] : [[0.12, -0.06], [0.16, 0], [0.145, 0.1], [0.13, 0.2], [0.16, 0.33], [0.19, 0.44], [0.185, 0.5], [0.09, 0.56]]).map(([r, y]) => new THREE.Vector2(r, y));
    const spine = joint(0, 0, 0), torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), SK); torso.scale.z = 0.62; spine.add(torso); pelvis.add(spine);
    const wrap = mesh(new THREE.CylinderGeometry(0.165, female ? 0.2 : 0.19, cloth ? 0.3 : 0.2, 14, 1, true), new THREE.MeshStandardMaterial({ color: HIDE.color, roughness: 1, side: THREE.DoubleSide }), 0, cloth ? -0.1 : -0.06, 0); wrap.scale.z = 0.7; spine.add(wrap);
    if (female) { const top = mesh(new THREE.CylinderGeometry(0.165, 0.15, 0.12, 14, 1, true), new THREE.MeshStandardMaterial({ color: HIDE.color, roughness: 1, side: THREE.DoubleSide }), 0, 0.4, 0); top.scale.z = 0.72; spine.add(top); }
    const neck = mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.1, 10), SK, 0, 0.6, 0), headJ = joint(0, 0.66, 0); spine.add(neck, headJ);
    const head = mesh(new THREE.SphereGeometry(0.1, 16, 12), SK, 0, 0.06, 0); head.scale.set(0.82, 1.02, 0.95);
    const jaw = mesh(new THREE.SphereGeometry(0.068, 12, 10), SK, 0, 0.0, 0.035); jaw.scale.set(1, 0.75, 1);
    const nose = mesh(new THREE.ConeGeometry(0.018, 0.04, 6), SK, 0, 0.05, 0.095); nose.rotation.x = Math.PI / 2;
    const hg = new THREE.SphereGeometry(0.108, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hp = hg.attributes.position; for (let k = 0; k < hp.count; k++) { const n = 1 + (q() - 0.5) * 0.09; hp.setXYZ(k, hp.getX(k) * n, hp.getY(k) * n, hp.getZ(k) * n); } hg.computeVertexNormals();
    const hair = mesh(hg, HAIR, 0, 0.07, -0.008); hair.scale.set(0.86, 1.02, 0.98);
    for (const x of [-1, 1]) headJ.add(mesh(new THREE.SphereGeometry(0.022, 8, 6), SK, x * 0.08, 0.05, -0.005));
    headJ.add(head, jaw, nose, hair);
    const arms = [-1, 1].map(side => { const sh = joint(side * (female ? 0.17 : 0.19), 0.49, 0), up = limb(0.29, 0.05, 0.04), el = joint(0, -0.29, 0), fore = limb(0.26, 0.038, 0.03), wr = joint(0, -0.26, 0), hand = mesh(new THREE.SphereGeometry(0.04, 10, 8), SK, 0, -0.05, 0); hand.scale.set(0.75, 1.35, 0.45); sh.rotation.z = side * 0.08; sh.add(up, el); el.add(fore, wr); wr.add(hand); spine.add(sh); return { sh, el, wr }; });
    // pose: { lean, turn, head:[x,y], hips:[l,r], knees:[l,r], arms:[[x,z],[x,z]], elbows:[l,r], y }
    spine.rotation.x = pose.lean || 0; spine.rotation.y = pose.turn || 0; if (pose.head) { headJ.rotation.x = pose.head[0]; headJ.rotation.y = pose.head[1] || 0; }
    legs.forEach((L, k) => { L.hip.rotation.x = pose.hips?.[k] ?? 0; L.hip.rotation.z = (k ? 1 : -1) * (pose.spread || 0.02); L.knee.rotation.x = pose.knees?.[k] ?? 0; });
    arms.forEach((A, k) => { const a = pose.arms?.[k]; if (a) { A.sh.rotation.x = a[0]; A.sh.rotation.z = (k ? 1 : -1) * (a[1] ?? 0.08); } A.el.rotation.x = pose.elbows?.[k] ?? -0.12; });
    pelvis.position.y = pose.y ?? 0.93; root.scale.setScalar(s); root.userData = { arms, spine, headJ }; return root;
  }
  // 23:52: our species: early Homo sapiens at a hearth on the African savanna, about 200,000 years ago, under the Milky Way
  stages.humans = () => {
    const r = rng(23), g = new THREE.Group(), tree = B('#06080c');
    g.add(skyDome('#020412', '#0c1430', '#05060a'), ground(M('#2a2012', { roughness: 1 })), stars(1300, 2000, 61, 1.1));
    const band = cloud(2600, (i, c) => { const a = r() * 6.283, w = gauss(r) * 0.12; const d = V(Math.cos(a), 0.55 + w, Math.sin(a) * 0.6).normalize(); c.setHSL(0.6, 0.25, 0.45 + r() * 0.4); return [d.x * 1900, Math.abs(d.y) * 1900, d.z * 1900]; }, { size: 4.5, opacity: 0.55, fog: false }); g.add(band);
    for (const [x, z, s] of [[-14, -16, 1.4], [16, -22, 1.7], [-30, -40, 2], [36, -46, 1.8], [4, -60, 2.2]]) { const a = acacia(tree, s); a.position.set(x, 0, z); g.add(a); }
    // the hearth: a ring of stones, crossed logs, flames and the light they cast
    const stone = M('#5a524a', { roughness: 1 }); for (let k = 0; k < 11; k++) { const a = k / 11 * 6.283, m = mesh(new THREE.DodecahedronGeometry(0.11 + r() * 0.05, 0), stone, Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5); m.rotation.set(r() * 3, r() * 3, 0); g.add(m); }
    const log = new THREE.CylinderGeometry(0.05, 0.06, 0.9, 6), wood = M('#3a2010'); for (let k = 0; k < 4; k++) { const l = mesh(log, wood, 0, 0.1, 0); l.rotation.set(Math.PI / 2 - 0.3, k * 0.8, 0); g.add(l); }
    const fire = glow('#ff7a2a', 1.5, 0.8), base = Array.from({ length: 26 }, () => ({ a: r() * 6.28, d: r() * 0.22, s: 0.6 + r() * 0.8, p: r(), sz: 0.22 + r() * 0.3 })), tongues = base.map((b, k) => { const t = glow(k % 3 ? '#ff5a14' : '#ffb050', b.sz, 0.7); g.add(t); return t; });
    fire.position.y = 0.42; const pool = mesh(new THREE.CircleGeometry(3.2, 32), new THREE.MeshBasicMaterial({ map: dot, color: C('#ff7a30'), transparent: true, opacity: 0.35, blending: add, depthWrite: false }), 0, 0.02, 0); pool.rotation.x = -Math.PI / 2; g.add(pool); const fl = new THREE.PointLight(0xff8a3a, 14, 22, 1.6); fl.position.set(0, 0.6, 0); g.add(fire, fl, hemi('#1c2a52', '#140a04', 0.25));
    const moon = new THREE.DirectionalLight(0x8aa0d8, 0.35); moon.position.set(-6, 8, -4); g.add(moon);
    // the people: a knapper making a stone tool, a hunter with a spear, a mother and baby, two sitting, one feeding the fire, a child
    const ring = (a, d) => [Math.cos(a) * d, Math.sin(a) * d], face = (p, a) => { p.rotation.y = -a - Math.PI / 2; };
    const seat = (x, z) => g.add(mesh(new THREE.DodecahedronGeometry(0.2, 0), stone, x, 0.14, z));
    const cast = [
      { a: 1.9, d: 1.6, o: { skin: '#4a2c1c', seed: 3, pose: { lean: 0.5, hips: [-1.9, -1.7], knees: [2.4, 2.3], arms: [[-1.0, 0.2], [-0.9, 0.25]], elbows: [-0.7, -0.9], head: [0.35], y: 0.42 } }, prop: 'knap' },
      { a: 0.7, d: 1.75, o: { skin: '#3e2416', female: true, seed: 5, pose: { lean: 0.05, hips: [-1.35, -1.25], knees: [1.7, 1.6], arms: [[-0.7, 0.45], [-0.75, 0.4]], elbows: [-1.5, -1.45], head: [0.3], y: 0.5 } }, seat: true, prop: 'baby' },
      { a: -0.4, d: 1.8, o: { skin: '#5a3624', seed: 7, pose: { lean: 0.15, hips: [-1.4, -1.3], knees: [1.6, 1.7], arms: [[-0.4, 0.15], [-0.35, 0.2]], elbows: [-1.2, -1.0], head: [0.15], y: 0.5 } }, seat: true },
      { a: -1.5, d: 1.3, o: { skin: '#4a2c1c', seed: 9, pose: { lean: 0.55, hips: [-0.5, 0.1], knees: [0.5, 0.25], arms: [[-0.6, 0.1], [-1.3, 0.1]], elbows: [-0.2, -0.3], head: [0.3] } }, prop: 'stick' },
      { a: 3.3, d: 2.1, o: { skin: '#3e2416', female: true, seed: 11, pose: { lean: 0.1, hips: [-1.4, -1.4], knees: [1.65, 1.65], arms: [[-0.5, 0.25], [-0.5, 0.25]], elbows: [-0.9, -0.9], head: [0.2], y: 0.5 } }, seat: true },
      { a: 2.7, d: 2.6, o: { skin: '#5a3624', seed: 13, pose: { lean: -0.03, arms: [[-0.25, 0.12], [-0.05, 0.1]], elbows: [-1.25, -0.1], head: [-0.05, 0.4] } }, prop: 'spear' },
      { a: 0.15, d: 2.45, o: { skin: '#4a2c1c', seed: 15, s: 0.58, pose: { arms: [[0.1, 0.25], [-0.2, 0.3]], elbows: [-0.3, -0.4], head: [0.1] } } },
    ];
    const people = cast.map(c => { const h = human(c.o), [x, z] = ring(c.a, c.d); h.position.set(x, 0, z); face(h, c.a); if (c.o.s) h.scale.setScalar(c.o.s); if (c.seat) { const [sx, sz] = ring(c.a, c.d + 0.08); seat(sx, sz); }
      const A = h.userData.arms, hand = k => A[k].wr;
      if (c.prop === 'spear') { const sp = new THREE.Group(); sp.add(mesh(new THREE.CylinderGeometry(0.014, 0.016, 2.3, 6), M('#8a6a40')), mesh(new THREE.ConeGeometry(0.03, 0.12, 5), stone, 0, 1.2, 0)); sp.position.set(0, -0.05, 0.02); sp.rotation.x = 1.3; hand(1).add(sp); }
      if (c.prop === 'knap') { hand(0).add(mesh(new THREE.DodecahedronGeometry(0.05, 0), M('#8a8070'), 0, -0.07, 0)); hand(1).add(mesh(new THREE.DodecahedronGeometry(0.06, 0), M('#6a5e50'), 0, -0.07, 0)); }
      if (c.prop === 'stick') { const st = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.9, 5), wood, 0, -0.35, 0); hand(1).add(st); }
      if (c.prop === 'baby') { const b = human({ skin: c.o.skin, seed: 17, s: 0.3, pose: { hips: [-0.8, -0.9], knees: [1.2, 1.3], arms: [[-0.8, 0.3], [-0.8, 0.3]], elbows: [-1.2, -1.2] } }); b.rotation.set(0, Math.PI / 2, 1.35); b.position.set(-0.2, 1.05, 0.22); h.userData.spine.add(b); b.position.set(-0.22, 0.32, 0.17); }
      g.add(h); return h; });
    // a lean-to shelter of branches behind the group
    for (let k = 0; k < 14; k++) { const br = mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.6, 5), M('#1a1008', { roughness: 1 }), -3.4 + k * 0.2, 1.0, -4.4); br.rotation.x = -0.55; br.rotation.z = (r() - 0.5) * 0.15; g.add(br); }
    const knapper = people[0], feeder = people[3];
    return { group: g, sun: 0.12, amb: 0.12, pose: { pos: V(0.3, 1.6, 4.4), look: V(0, 0.9, 0) }, fog: ['#0a0e1c', 20, 160], update(t) {
      base.forEach((b, i) => { const k = (t * 0.9 * b.s + b.p) % 1, tg = tongues[i]; tg.position.set(Math.cos(b.a + t) * b.d * (1 - k), 0.15 + k * 0.7, Math.sin(b.a + t) * b.d * (1 - k)); tg.scale.setScalar(b.sz * (1 - k * 0.75)); tg.material.opacity = 0.75 * (1 - k); });
      const f = 0.8 + 0.2 * Math.sin(t * 11) * Math.sin(t * 4.3); fire.material.opacity = f; fl.intensity = 10 + 6 * f;
      knapper.userData.arms[1].sh.rotation.x = -0.9 + Math.max(0, Math.sin(t * 5)) * -0.35; feeder.userData.arms[1].sh.rotation.x = -1.3 + Math.sin(t * 0.7) * 0.12; } };
  };
  // ---- farm animals, pottery, fences, tools ----
  // A four-legged animal: sheep (woolly), goat (horns swept back, beard) or cow (big, horns out). graze lowers the head.
  function beast(kind, { seed = 1, col, graze = false } = {}) {
    const q = rng(seed), S = { sheep: { b: [0.52, 0.34, 0.3], leg: 0.4, c: '#e6dccb', f: '#2a2420' }, goat: { b: [0.48, 0.27, 0.22], leg: 0.48, c: ['#7a5636', '#2c2420', '#d8cdb8'][Math.floor(q() * 3)], f: null }, cow: { b: [0.95, 0.48, 0.42], leg: 0.72, c: ['#6a4630', '#3a2a20', '#c8b49a'][Math.floor(q() * 3)], f: null } }[kind];
    const coat = M(col || S.c, { roughness: 1 }), face = M(S.f || col || S.c, { roughness: 0.9 }), horn = M('#d8ccb0', { roughness: 0.6 }), g = new THREE.Group(), [bx, by, bz] = S.b, top = S.leg + by * 0.85;
    const bg = new THREE.SphereGeometry(1, 20, 14); if (kind === 'sheep') { const p = bg.attributes.position; for (let k = 0; k < p.count; k++) { const n = 1 + (q() - 0.5) * 0.12; p.setXYZ(k, p.getX(k) * n, p.getY(k) * n, p.getZ(k) * n); } bg.computeVertexNormals(); }
    const body = mesh(bg, coat, 0, top, 0); body.scale.set(bx, by, bz); g.add(body);
    for (const [x, z] of [[0.62, 0.55], [0.62, -0.55], [-0.6, 0.55], [-0.6, -0.55]]) g.add(mesh(new THREE.CylinderGeometry(0.045 * (bx + 0.4), 0.035 * (bx + 0.4), S.leg + 0.05, 7), face, x * bx, S.leg / 2, z * bz));
    const neck = new THREE.Group(); neck.position.set(bx * 0.8, top + by * 0.35, 0); neck.rotation.z = graze ? -1.6 : -0.5; g.add(neck);
    const nl = bx * 0.55; neck.add(mesh(new THREE.CylinderGeometry(by * 0.32, by * 0.42, nl, 10).translate(0, nl / 2, 0), coat));
    const head = new THREE.Group(); head.position.y = nl; head.rotation.z = graze ? 1.1 : 0.4; neck.add(head);
    const hd = mesh(new THREE.SphereGeometry(1, 14, 10), face, bx * 0.18, 0, 0); hd.scale.set(bx * 0.34, by * 0.36, by * 0.3); head.add(hd);
    for (const z of [-1, 1]) { const ear = mesh(new THREE.SphereGeometry(1, 8, 6), face, -bx * 0.02, by * 0.18, z * by * 0.32); ear.scale.set(by * 0.09, by * 0.05, by * 0.2); head.add(ear); }
    if (kind === 'goat') { for (const z of [-1, 1]) head.add(tube([[0, by * 0.25, z * 0.04], [-0.08, by * 0.5, z * 0.06], [-0.2, by * 0.55, z * 0.07]], 0.02, horn)); head.add(mesh(new THREE.ConeGeometry(0.035, 0.12, 6), face, bx * 0.3, -by * 0.38, 0)); }
    if (kind === 'cow') for (const z of [-1, 1]) head.add(tube([[0, by * 0.28, z * 0.1], [0, by * 0.4, z * 0.32], [0.08, by * 0.55, z * 0.42]], 0.035, horn));
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, by * (kind === 'cow' ? 1.6 : 0.5), 6), coat, -bx * 1.0, top - by * (kind === 'cow' ? 0.5 : 0.1), 0)); if (kind === 'cow') g.children.at(-1).rotation.z = -0.15;
    g.userData = { neck, graze }; return g;
  }
  const jar = (mat, s = 1, wide = 1) => mesh(new THREE.LatheGeometry([[0.01, 0], [0.16 * wide, 0.02], [0.26 * wide, 0.22], [0.24 * wide, 0.42], [0.12, 0.56], [0.1, 0.62], [0.13, 0.66]].map(([x, y]) => new THREE.Vector2(x * s, y * s)), 18), mat);
  function fence(r0, n, mat, h = 0.95, from = 0, to = Math.PI * 2) { const list = []; for (let k = 0; k < n; k++) { const a = from + (to - from) * k / (n - 1); list.push([Math.cos(a) * r0, h / 2, Math.sin(a) * r0, 0, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, [1, h, 1]]); } return instanced(new THREE.CylinderGeometry(0.05, 0.06, 1, 5), mat, list); }
  const sickle = mat => tube([[0, 0, 0], [0, -0.12, 0], [0.05, -0.2, 0.06], [0.14, -0.22, 0.12], [0.2, -0.16, 0.14]], 0.012, mat);

  // 23:59:32: farming, about 12,000 years ago in the Fertile Crescent: wheat and barley fields, sheep and goats penned, round mud-brick houses
  stages.farming = () => {
    const r = rng(67), g = new THREE.Group(), mud = M('#a87a52'), thatch = M('#c8a868', { roughness: 1 }), wood = M('#6a4a2a'), clay = M('#a8603a', { roughness: 0.8 }), stoneM = M('#8a8274');
    g.add(skyDome('#2c3e70', '#ffc890', '#5a4026', 2400, { dir: [-0.35, 0.05, -1], col: '#fff0c8' }), ground(M('#6a5030', { roughness: 1 })), hemi('#ffe0b8', '#5a4026', 1.3));
    // fields: crop rows with furrows between them, edged by low dry-stone walls
    const fields = [[-20, -10, 16, 10, '#e2c062', 0.85], [-2, -16, 14, 12, '#8ab040', 0.7], [-22, -26, 18, 12, '#d8b452', 1]];
    for (const [fx, fz, w, d, col, ht] of fields) { const list = []; for (let row = 0; row < d / 0.6; row++) for (let k = 0; k < w / 0.18; k++) list.push([fx + k * 0.18 + (r() - 0.5) * 0.06, 0.45 * ht, fz - row * 0.6 + (r() - 0.5) * 0.1, r() * 3, (r() - 0.5) * 0.2, (r() - 0.5) * 0.2, [1, ht * (0.75 + r() * 0.4), 1]]); g.add(instanced(new THREE.ConeGeometry(0.05, 0.95, 4), M(col, { roughness: 0.8 }), list));
      const furrow = mesh(new THREE.PlaneGeometry(w, d), M('#4a3420', { roughness: 1 }), fx + w / 2, 0.01, fz - d / 2 + 0.3); furrow.rotation.x = -Math.PI / 2; g.add(furrow);
      const wall = []; for (let k = 0; k <= w; k += 0.5) wall.push([fx + k, 0.15, fz + 0.8, r() * 3, r(), r(), 0.28 + r() * 0.1]); g.add(instanced(new THREE.DodecahedronGeometry(0.5, 0), stoneM, wall)); }
    // the village: round mud-brick houses with thatched roofs and dark doorways, storage jars, a hearth
    const houses = [[4, -15, 1], [9, -19, 1.2], [3, -24, 0.9], [12, -27, 1.1], [7, -31, 1], [14, -15, 0.8]];
    for (const [x, z, s] of houses) { const h = new THREE.Group(); h.add(mesh(new THREE.CylinderGeometry(1.7 * s, 1.8 * s, 1.9 * s, 18), mud, 0, 0.95 * s, 0), mesh(new THREE.ConeGeometry(2.25 * s, 1.5 * s, 18), thatch, 0, 1.9 * s + 0.72 * s, 0)); const door = mesh(new THREE.PlaneGeometry(0.7 * s, 1.15 * s), B('#140c06'), 0, 0.6 * s, 1.81 * s); h.add(door); h.position.set(x, 0, z); h.rotation.y = Math.atan2(-2 - x, 6 - z) ; g.add(h); }
    for (const [x, z, s] of [[1.5, -12, 1.2], [2.4, -11.6, 0.9], [1.9, -11.1, 1], [6.5, -12.4, 1.1]]) { const j = jar(clay, s); j.position.set(x, 0, z); g.add(j); }
    // the pen: a woven wattle fence with sheep and goats, a cow tethered outside
    const pen = new THREE.Group(); pen.position.set(-5, 0, -4); pen.add(fence(3.2, 70, wood, 0.9, 0.35, Math.PI * 2 - 0.15)); for (let k = 0; k < 3; k++) { const rail = mesh(new THREE.TorusGeometry(3.2, 0.03, 4, 48, Math.PI * 2 - 0.5), wood, 0, 0.25 + k * 0.3, 0); rail.rotation.x = Math.PI / 2; rail.rotation.z = 0.35; pen.add(rail); } g.add(pen);
    const herd = []; for (let k = 0; k < 9; k++) { const kind = k % 3 === 2 ? 'goat' : 'sheep', b = beast(kind, { seed: 200 + k, graze: k % 2 === 0 }), a = r() * 6.28, d = r() * 2.2; b.position.set(-5 + Math.cos(a) * d, 0, -4 + Math.sin(a) * d); b.rotation.y = r() * 6.28; b.userData.a = r() * 9; herd.push(b); g.add(b); }
    for (const [x, z, ry, seed] of [[2, -7, 2.4, 31], [-12, -3, 0.6, 32]]) { const cow = beast('cow', { seed, graze: seed === 31 }); cow.position.set(x, 0, z); cow.rotation.y = ry; herd.push(cow); g.add(cow); }
    // people: two harvesting with flint sickles, one carrying a basket of grain, one grinding grain on a quern, a child with a herding stick
    const skin = ['#7a4e34', '#6a4430', '#8a5a3c'], cloth = ['#c8b48a', '#a8885a', '#d8c8a0'];
    const reaper = (x, z, ry, seed) => { const h = human({ skin: skin[seed % 3], cloth: cloth[seed % 3], seed, pose: { lean: 0.7, hips: [-0.6, -0.2], knees: [0.7, 0.4], arms: [[-1.0, 0.2], [-1.4, 0.15]], elbows: [-0.4, -0.2], head: [0.3] } }); h.position.set(x, 0, z); h.rotation.y = ry; h.userData.arms[1].wr.add(sickle(M('#5a4a3a'))); g.add(h); return h; };
    const reapers = [reaper(-14, -11, 0.4, 41), reaper(-9, -13, -0.3, 42)];
    const carrier = human({ skin: skin[1], cloth: '#b84a2a', female: true, seed: 43, pose: { arms: [[-0.05, 0.5], [-3.0, 0.15]], elbows: [-0.05, -0.3] } }); carrier.position.set(3, 0, -10); carrier.rotation.y = 0.9; const basket = mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.22, 14), M('#b8945a')); basket.position.y = 0.2; carrier.userData.headJ.add(basket); g.add(carrier);
    const grinder = human({ skin: skin[2], cloth: '#d8c8a0', female: true, seed: 44, pose: { lean: 0.85, hips: [-1.6, -1.6], knees: [2.7, 2.7], arms: [[-1.2, 0.15], [-1.2, 0.15]], elbows: [-0.25, -0.25], head: [0.2], y: 0.36 } }); grinder.position.set(5, 0, -11); grinder.rotation.y = -2.4; g.add(grinder);
    const quern = mesh(new THREE.BoxGeometry(0.9, 0.18, 0.5), stoneM, 5 - 0.55, 0.09, -11 + 0.45); quern.rotation.y = -2.4; g.add(quern, mesh(new THREE.SphereGeometry(0.1, 10, 8), stoneM, 5 - 0.5, 0.25, -11 + 0.45));
    const kid = human({ skin: skin[0], cloth: cloth[1], seed: 45, s: 0.62, pose: { arms: [[-0.1, 0.2], [-0.7, 0.2]], elbows: [-0.2, -0.6] } }); kid.position.set(-1.2, 0, -2.2); kid.rotation.y = -1.9; kid.userData.arms[1].wr.add(mesh(new THREE.CylinderGeometry(0.012, 0.015, 1.1, 5).translate(0, -0.4, 0), wood)); g.add(kid);
    for (const [x, z, s] of [[26, -6, 1.3], [30, -24, 1.6], [24, -40, 1.4], [-30, -36, 1.5]]) { const p = palm(M('#2a3a1a'), s); p.position.set(x, 0, z); g.add(p); }
    const river = mesh(new THREE.PlaneGeometry(10, 500), M('#5a8ab0', { metalness: 0.3, roughness: 0.25 }), 34, 0.03, -120); river.rotation.x = -Math.PI / 2; river.rotation.z = 0.3; g.add(river);
    const smoke = cloud(60, () => [9 + gauss(r) * 0.25 + r() * r() * 2, 3.2 + r() * 6, -19 + gauss(r) * 0.25], { size: 1.4, opacity: 0.1 }); smoke.material.color.set('#3a3632'); g.add(smoke);
    return { group: g, fit: 1.25, pose: { pos: V(-3, 6.5, 13), look: V(-1.5, 1.2, -14) }, fog: ['#e8b888', 30, 380], update(t) {
      for (const b of herd) if (b.userData.graze) b.userData.neck.rotation.z = -1.6 + Math.sin(t * 0.8 + (b.userData.a || 0)) * 0.12;
      reapers.forEach((h, k) => { h.userData.arms[1].sh.rotation.x = -1.4 + Math.sin(t * 2.2 + k) * 0.35; });
      grinder.userData.spine.rotation.x = 0.85 + Math.sin(t * 2) * 0.1; smoke.rotation.y = t * 0.05; } };
  };

  // 23:59:48: writing and the first cities, about 5,000 years ago: Egypt's pyramids (one still being built), an obelisk, a Sumerian ziggurat,
  // an Indus brick city, workers hauling a stone block, a scribe, and the first writing: a cuneiform tablet, a papyrus, an Indus seal
  stages.writing = () => {
    const r = rng(71), g = new THREE.Group(), lime = M('#e4d0a2', { roughness: 0.85 }), sandstone = M('#c8a46a'), brick = M('#b07a4a'), gold = M('#f0c860', { metalness: 0.85, roughness: 0.3 }), wood = M('#6a4a2a'), linen = '#ece4d0';
    g.add(skyDome('#3a4a7a', '#ffb070', '#8a6a40', 2400, { dir: [0.45, 0.06, -1], col: '#fff0c8' }), ground(M('#c8a46a', { roughness: 1 })), hemi('#ffe4c0', '#8a6a40', 1.25));
    // Giza: true proportions (height about 0.64 of the base side), white casing and gilded capstones
    const pyr = (side, x, z, cap = true) => { const h = side * 0.636, p = mesh(new THREE.ConeGeometry(side / Math.SQRT2, h, 4), lime, x, h / 2, z); p.rotation.y = Math.PI / 4; g.add(p); if (cap) { const c = mesh(new THREE.ConeGeometry(side * 0.06 / Math.SQRT2, side * 0.06 * 0.636, 4), gold, x, h - side * 0.019, z); c.rotation.y = Math.PI / 4; g.add(c); } };
    pyr(46, -34, -110); pyr(43, -4, -128); pyr(22, 18, -140);
    // a pyramid still going up: stepped core, a mud-brick ramp, blocks waiting
    const ux = 13, uz = -50; for (let k = 0; k < 5; k++) { const s = 24 - k * 4.2; g.add(mesh(new THREE.BoxGeometry(s, 2.2, s), sandstone, ux, 1.1 + k * 2.2, uz)); }
    const ramp = mesh(new THREE.BoxGeometry(4, 1, 34), M('#9a7448'), ux - 4, 3.4, uz + 26); ramp.rotation.x = 0.36; g.add(ramp);
    g.add(instanced(new THREE.BoxGeometry(1.4, 0.9, 1.2), sandstone, Array.from({ length: 16 }, () => [ux - 14 + r() * 10, 0.45, uz + 18 + r() * 10, r() * 0.5])));
    // workers in linen kilts hauling a block on a wooden sledge; one pours water to wet the sand, an overseer with a staff
    const sled = new THREE.Group(); sled.add(mesh(new THREE.BoxGeometry(1.8, 1.2, 1.6), sandstone, 0, 0.82, 0)); for (const z of [-0.6, 0.6]) { const runner = mesh(new THREE.BoxGeometry(2.6, 0.18, 0.18), wood, 0, 0.12, z); g.add(runner); sled.add(runner); } sled.position.set(-1, 0, -13); sled.rotation.y = 0.5; g.add(sled);
    const haulers = []; for (let k = 0; k < 8; k++) { const row = Math.floor(k / 2), side = k % 2 ? 1 : -1, h = human({ skin: ['#7a4a2e', '#8a5636', '#6a3e26'][k % 3], cloth: linen, seed: 60 + k, pose: { lean: 0.55, hips: [-0.5, 0.25], knees: [0.4, 0.1], arms: [[-1.5, 0.1], [-1.4, 0.1]], elbows: [-0.2, -0.2], head: [-0.2] } });
      const ox = -1 + Math.cos(0.5) * (2.4 + row * 1.3) - Math.sin(0.5) * side * 0.55, oz = -13 - Math.sin(0.5) * (2.4 + row * 1.3) - Math.cos(0.5) * side * 0.55; h.position.set(ox, 0, oz); h.rotation.y = 0.5 + Math.PI / 2; h.userData.k = k; haulers.push(h); g.add(h); }
    for (const z of [-0.45, 0.45]) { const rope = tube([[1.3, 0.6, z], [4, 1.0, z], [7.5, 1.1, z]], 0.025, M('#a89060')); sled.add(rope); }
    const pourer = human({ skin: '#7a4a2e', cloth: linen, seed: 70, pose: { lean: 0.35, arms: [[-1.2, 0.2], [-1.0, 0.25]], elbows: [-0.6, -0.8], head: [0.4] } }); pourer.position.set(0.8, 0, -11.4); pourer.rotation.y = 0.5 + Math.PI / 2; pourer.userData.arms[0].wr.add(jar(M('#a8603a'), 0.45)); g.add(pourer);
    const boss = human({ skin: '#6a3e26', cloth: '#f4ecd8', seed: 71, pose: { arms: [[-0.25, 0.15], [-0.05, 0.1]], elbows: [-1.3, -0.1], head: [0, -0.5] } }); boss.position.set(-3.8, 0, -9.6); boss.rotation.y = -0.6; boss.userData.arms[0].wr.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.7, 5).translate(0, -0.1, 0), wood)); g.add(boss);
    // an obelisk with a gilded tip
    g.add(mesh(new THREE.CylinderGeometry(0.55 / Math.SQRT2 * 1.4, 1.0, 11, 4), M('#d0a878'), -20, 5.5, -44)); g.children.at(-1).rotation.y = Math.PI / 4; const tip = mesh(new THREE.ConeGeometry(0.55, 1, 4), gold, -20, 11.5, -44); tip.rotation.y = Math.PI / 4; g.add(tip);
    // Sumer: a ziggurat with three converging stairways and a shrine on top
    const zx = 34, zz = -112; for (const [w, d, y] of [[30, 24, 2.5], [21, 16, 7.5], [12, 9, 12]]) g.add(mesh(new THREE.BoxGeometry(w, 5, d), brick, zx, y, zz)); g.add(mesh(new THREE.BoxGeometry(6, 3.4, 5), M('#d8b080'), zx, 16.2, zz));
    for (const [dx, ry] of [[0, 0], [-6, 0.35], [6, -0.35]]) { const st = mesh(new THREE.BoxGeometry(3.2, 1, 20), M('#9a6a40'), zx + dx, 5.6, zz + 17); st.rotation.set(-0.5, ry, 0); g.add(st); }
    // the Indus: a grid of flat-roofed brick houses along straight streets
    const homes = []; for (let a = 0; a < 7; a++) for (let b = 0; b < 6; b++) if (r() > 0.15) { const h = 1.8 + r() * 1.4; homes.push([22 + a * 3.6, h / 2, -66 - b * 3.6, 0, 0, 0, [1, h, 1]]); } g.add(instanced(new THREE.BoxGeometry(2.8, 1, 2.8), M('#b8784a'), homes));
    // the Nile, with a sailing boat
    const river = mesh(new THREE.PlaneGeometry(14, 600), M('#5a8ab0', { metalness: 0.35, roughness: 0.2 }), -30, 0.03, -100); river.rotation.x = -Math.PI / 2; river.rotation.z = -0.08; g.add(river);
    const boat = new THREE.Group(), hull = mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#6a4a2a', { side: THREE.DoubleSide }), 0, 0.5, 0); hull.scale.set(3, 0.7, 0.9); const sail = mesh(new THREE.PlaneGeometry(2.2, 3.4), M('#f4ecd8', { side: THREE.DoubleSide }), 0.2, 2.6, 0); boat.add(hull, sail, mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2), wood, 0, 2.4, 0)); boat.position.set(-30, 0, -40); boat.rotation.y = Math.PI / 2; g.add(boat);
    for (const [x, z, s] of [[-22, -18, 1.4], [-38, -24, 1.7], [-24, -60, 1.6], [-40, -80, 1.8], [-20, -36, 1.2]]) { const p = palm(M('#2a3a1a'), s); p.position.set(x, 0, z); g.add(p); }
    // the first writing, set out on a low table: a scribe with a papyrus, a cuneiform tablet, an Indus seal, ink pot and jars
    const tx = -3.5, tz = -5.5, table = mesh(new THREE.BoxGeometry(2.2, 0.5, 1.1), M('#7a5634'), tx, 0.25, tz); g.add(table);
    const scribe = human({ skin: '#7a4a2e', cloth: linen, seed: 72, pose: { lean: 0.35, hips: [-1.5, -1.5], knees: [2.6, 2.6], spread: 0.5, arms: [[-0.9, 0.2], [-0.9, 0.25]], elbows: [-0.9, -0.9], head: [0.45], y: 0.3 } }); scribe.position.set(tx - 1.7, 0, tz + 0.2); scribe.rotation.y = Math.PI / 2; g.add(scribe);
    const scroll = new THREE.Group(); scroll.add(mesh(new THREE.BoxGeometry(0.9, 0.01, 0.4), M('#e8d8a8'))); for (const x of [-0.47, 0.47]) { const rl = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 10), M('#d8c48a'), x, 0.04, 0); rl.rotation.x = Math.PI / 2; scroll.add(rl); } for (let k = 0; k < 5; k++) scroll.add(mesh(new THREE.BoxGeometry(0.6, 0.012, 0.02), M('#3a2a1a'), 0, 0.011, -0.12 + k * 0.06)); scroll.position.set(tx - 0.5, 0.51, tz); g.add(scroll);
    const tablet = mesh(new THREE.BoxGeometry(0.5, 0.1, 0.36), M('#b8865a'), tx + 0.45, 0.55, tz); g.add(tablet); for (let k = 0; k < 4; k++) for (let w = 0; w < 6; w++) { const wedge = mesh(new THREE.ConeGeometry(0.018, 0.05, 3), M('#6a4a2a'), tx + 0.27 + w * 0.07, 0.605, tz - 0.12 + k * 0.08); wedge.rotation.z = Math.PI / 2; g.add(wedge); }
    const seal = mesh(new THREE.BoxGeometry(0.16, 0.06, 0.16), M('#e8dcc0'), tx + 0.85, 0.53, tz - 0.25); g.add(seal); g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 10), M('#2a1a10'), tx + 0.8, 0.54, tz + 0.25));
    for (const [x, z, s, w] of [[tx + 1.5, tz + 0.6, 1.3, 0.8], [tx + 1.9, tz - 0.2, 1.0, 1], [tx + 1.3, tz - 0.8, 1.6, 0.7]]) { const j = jar(M('#a8603a', { roughness: 0.8 }), s, w); j.position.set(x, 0, z); g.add(j); }
    return { group: g, fit: 1.25, pose: { pos: V(-2, 7, 15), look: V(1, 5, -32) }, fog: ['#e8b888', 70, 600], update(t) {
      boat.position.z = -40 + Math.sin(t * 0.05) * 30;
      haulers.forEach(h => { const k = h.userData.k, sw = Math.sin(t * 2.4 + k * 0.8); h.userData.spine.rotation.x = 0.55 + sw * 0.06; h.children[0].children[0].rotation.x = -0.5 + sw * 0.15; }); } };
  };
  // 23:59:58: telescopes to spaceflight: a space station, Hubble and satellites orbiting a city-lit Earth
  stages.modern = () => {
    const g = new THREE.Group(), r = rng(73), e = earth({ tint: '#7a86a8', glowColor: '#7aa0ff', clouds: 0.3, lights: 4200 }); g.add(e, stars(900, 2200, 74));
    const iss = station(); iss.scale.setScalar(2.2); g.add(iss); const hst = hubble(); hst.scale.setScalar(2.4); g.add(hst);
    const sats = []; for (let k = 0; k < 36; k++) { const s = satellite(0.9 + r() * 0.6), orbit = new THREE.Group(); orbit.rotation.set(r() * 3, r() * 3, 0); s.position.x = 112 + r() * 60; orbit.add(s); orbit.userData.sp = 0.03 + r() * 0.05; orbit.userData.ph = r() * 6.28; sats.push(orbit); g.add(orbit); }
    const moon = mesh(new THREE.SphereGeometry(18, 32, 24), M('#b0aaa0')); moon.position.set(-300, 120, -500); g.add(moon);
    return { group: g, pose: { pos: V(10, 30, 260), look: V(0, 10, 0) }, fog: ['#01020a', 2000, 4000], update(t) {
      e.rotation.y = t * 0.03; const a = t * 0.08; iss.position.set(28 + Math.sin(a) * 14, 48 + Math.cos(a * 0.7) * 5, 150); iss.rotation.set(0.3, a * 0.5, 0.15);
      hst.position.set(-46 + Math.sin(a * 0.8) * 6, -8, 170); hst.rotation.set(0.2, a * 0.7 + 1, 0.3);
      for (const o of sats) o.rotation.y = o.userData.ph + t * o.userData.sp; } };
  };

  const built = EVENTS.map((e, i) => { const s = stages[e.id]?.(); if (!s) return null; s.group.position.set(0, 0, -i * STAGE_GAP); scene.add(s.group); s.group.visible = i < 2; return s; });
  const poseAt = (i, fitAuto) => { const s = built[i], fit = s.fit ?? fitAuto, z = -i * STAGE_GAP, look = s.pose.look.clone().add(V(0, 0, z)), pos = s.pose.pos.clone().add(V(0, 0, z)); pos.sub(look).multiplyScalar(fit).add(look); return { pos, look }; };

  // camera, flight and frame loop
  let cur = 0, tNow = 0, prevIdx = -1, from = null, to = null, flight = 1, w = 0, h = 0, raf = 0, last = 0, t0 = 0, px = 0, py = 0, fit = 1, fogK = 1, drift = 0;
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0), fogFrom = { c: C('#02040c'), n: 200, f: 1600 }, fogTo = { c: C('#02040c'), n: 200, f: 1600 }, tmpC = new THREE.Color();
  function size() { w = canvas.clientWidth || 412; h = canvas.clientHeight || 915; renderer.setSize(w, h, false); cam.aspect = w / h; fit = w / h < 1 ? Math.min(2.1, 0.92 / Math.max(0.42, w / h)) : 1; cam.setViewOffset(w, h, 0, h * 0.16, w, h); /* lift the subject into the empty space above the card */ cam.updateProjectionMatrix(); }
  function setTarget(i, instant) {
    const a = built[i]; if (!a) return; const p = poseAt(i, fit); from = { pos: camPos.clone(), look: camLook.clone(), fog: { c: fogFrom.c.clone(), n: fogFrom.n, f: fogFrom.f } }; to = p; fogTo.c.set(a.fog[0]); fogTo.n = a.fog[1]; fogTo.f = a.fog[2];
    a.since = instant ? tNow : Infinity; sun.intensity = a.sun ?? 2.4; amb.intensity = a.amb ?? 0.55; sun.position.set(...(a.sunDir || [4, 1.5, 3])); sun.color.set(a.sunColor || '#fff1d8'); const prev = cur; cur = i; prevIdx = instant || prev === i ? -1 : prev; flight = instant ? 1 : 0; if (instant) { camPos.copy(p.pos); camLook.copy(p.look); fogFrom.c.copy(fogTo.c); fogFrom.n = fogTo.n; fogFrom.f = fogTo.f; }
    built.forEach((s, k) => { if (s) s.group.visible = k === i || k === prevIdx; });
  }
  function render(now) {
    const t = reduced() ? 0 : Math.max(0, now - t0) / 1000, dt = Math.min(0.6, (now - last) / 1000 || 0.016); last = now;
    if (flight < 1) { flight = Math.min(1, flight + dt / 2.4); const k = ease(flight); camPos.lerpVectors(from.pos, to.pos, k); camLook.lerpVectors(from.look, to.look, k); fogFrom.c.lerp(fogTo.c, 0.06 + 0.1 * k); fogFrom.n += (fogTo.n - fogFrom.n) * 0.08; fogFrom.f += (fogTo.f - fogFrom.f) * 0.08; if (flight >= 1) { built.forEach((s, k2) => { if (s) s.group.visible = k2 === cur; }); prevIdx = -1; if (built[cur]) built[cur].since = t; } }
    else { fogFrom.c.lerp(fogTo.c, 0.1); }
    scene.fog.color.copy(fogFrom.c); scene.fog.near = fogFrom.n; scene.fog.far = fogFrom.f; scene.background.copy(fogFrom.c);
    const wob = reduced() ? 0 : camPos.distanceTo(camLook) / 400; /* drift and parallax scale with the scene, so a ground-level camera never sinks below the ground */ cam.position.set(camPos.x + (Math.sin(t * 0.13) * 14 + px * 26) * wob, camPos.y + Math.max(-camPos.y * 0.5 / Math.max(wob, 1e-6), Math.cos(t * 0.1) * 8 - py * 16) * wob, camPos.z - drift * wob); cam.lookAt(camLook);
    tNow = t; const local = st => st && st.update?.(Math.max(0, t - (st.since || 0))); local(built[cur]); if (prevIdx >= 0) local(built[prevIdx]);
    renderer.render(scene, cam);
  }
  function refit() { size(); if (flight >= 1) setTarget(cur, true); if (!raf) render(performance.now()); }
  function frame(now) { raf = requestAnimationFrame(frame); render(now); }
  const move = e => { px = (e.clientX / (innerWidth || 1) - 0.5) * 2; py = (e.clientY / (innerHeight || 1) - 0.5) * 2; };
  return {
    go(i, instant) { size(); setTarget(i, instant || reduced()); if (reduced()) render(performance.now()); },
    start() { size(); t0 = performance.now(); last = t0; tNow = 0; addEventListener('pointermove', move); addEventListener('resize', refit); if (reduced() || typeof requestAnimationFrame !== 'function') { render(t0); return; } cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { if (raf) cancelAnimationFrame(raf); raf = 0; removeEventListener('pointermove', move); removeEventListener('resize', refit); },
    get index() { return cur; },
  };
}
