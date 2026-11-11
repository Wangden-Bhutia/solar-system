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
  // The Big Bang: a blinding flash, then a fireball and debris flying outward fast and slowing, cooling white to orange to red.
  // Each stage's clock starts when the camera arrives; until then the Big Bang waits as one bright point. It plays once, fades to dark, then repeats.
  stages.bang = () => {
    const r = rng(31), g = new THREE.Group(), RAD = 430;
    const debris = cloud(4600, (i, c) => { const d = sphereDir(r), v = Math.pow(r(), 0.45); c.setHSL(0.08 + r() * 0.06, 0.5 + r() * 0.5, 0.62 + r() * 0.38); return [d[0] * v * RAD, d[1] * v * RAD, d[2] * v * RAD]; }, { size: 3.6, fog: false });
    const front = cloud(1100, (i, c) => { const d = sphereDir(r), v = 0.94 + r() * 0.06; c.setRGB(1, 1, 1); return [d[0] * v * RAD, d[1] * v * RAD, d[2] * v * RAD]; }, { size: 5.5, fog: false });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(RAD, 48, 32), new THREE.ShaderMaterial({ transparent: true, blending: add, depthWrite: false, uniforms: { c: { value: C('#ffb060') }, a: { value: 1 } }, vertexShader: 'varying vec3 n,v;void main(){n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}', fragmentShader: 'uniform vec3 c;uniform float a;varying vec3 n,v;void main(){float f=pow(1.-abs(dot(n,v)),2.2);gl_FragColor=vec4(c,f*a);}' }));
    const fire = glow('#ffc070', 1, 1), flash = glow('#ffffff', 1, 1); g.add(fire, debris, front, shell, flash);
    const white = C('#ffffff'), hot = C('#ffe0a0'), warm = C('#ff7a30'), deep = C('#b03050'), tint = new THREE.Color();
    return { group: g, pose: { pos: V(0, 0, 330), look: V(0, 0, 0) }, fog: ['#07050a', 900, 2400], update(t) {
      const T = 12, p = (t % T) / 6.5, on = p <= 1, q = Math.min(1, p), e = 1 - Math.pow(1 - q, 3);
      const fade = q < 0.55 ? 1 : 1 - (q - 0.55) / 0.45;
      if (q < 0.12) tint.copy(white).lerp(hot, q / 0.12); else if (q < 0.5) tint.copy(hot).lerp(warm, (q - 0.12) / 0.38); else tint.copy(warm).lerp(deep, (q - 0.5) / 0.5);
      debris.scale.setScalar(0.01 + e); debris.material.color.copy(tint); debris.material.opacity = on ? fade : 0; debris.rotation.y = t * 0.03;
      front.scale.setScalar(0.01 + e * 1.03); front.material.opacity = on ? Math.max(0, 1 - q * 1.3) : 0;
      shell.scale.setScalar(0.01 + e * 1.05); shell.material.uniforms.a.value = on ? 0.6 * Math.max(0, 1 - q * 1.15) : 0; shell.material.uniforms.c.value.copy(tint);
      fire.scale.setScalar(40 + 760 * e); fire.material.color.copy(tint); fire.material.opacity = on ? 0.9 * Math.max(0, 1 - q * 1.1) : 0;
      const f = q / 0.07; flash.scale.setScalar(q < 0.07 ? 60 + 2200 * f : 2260 + 600 * (q - 0.07)); flash.material.opacity = on ? (q < 0.07 ? 1 : Math.max(0, 1 - (q - 0.07) / 0.22)) : 0;
    } };
  };
  stages.cmb = () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'), r = rng(9); x.fillStyle = '#3a1206'; x.fillRect(0, 0, 1024, 512); for (let i = 0; i < 700; i++) { const px = r() * 1024, py = r() * 512, rad = 8 + r() * 46, hot = r() > 0.5, g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, hot ? 'rgba(255,140,50,.5)' : 'rgba(80,50,170,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sph = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 32), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })); const g = new THREE.Group(); g.add(sph);
    return { group: g, pose: { pos: V(0, 0, 0), look: V(0, 0, -100) }, fog: ['#140604', 3000, 6000], update(t2) { sph.rotation.y = t2 * 0.012; } }; };
  stages.disk = () => { const r = rng(13), g = new THREE.Group(), pts = cloud(11000, (i, c) => { const rr = Math.pow(r(), 0.75) * 330, arm = r() < 0.5 ? 0 : Math.PI, th = arm + rr / 330 * 4.4 + gauss(r) * (0.25 + rr / 900), y = gauss(r) * (14 * (1 - rr / 420)); c.setHSL(0.1 + (rr / 330) * 0.5, 0.55, 0.62 + r() * 0.3); return [Math.cos(th) * rr, y, Math.sin(th) * rr]; }, { size: 2.6 }), core = glow('#ffe2a8', 190, 0.9); g.add(pts, core);
    return { group: g, pose: { pos: V(0, 230, 380), look: V(0, 0, 0) }, fog: ['#02030a', 900, 2200], update(t) { pts.rotation.y = t * 0.035; } }; };
  stages.earth = () => { const g = new THREE.Group(), e = earth({ tint: '#ff7a3a', emissive: '#7a1d02', glowColor: '#ff6a20', r0: 100 }), moon = new THREE.Mesh(new THREE.SphereGeometry(27, 32, 24), new THREE.MeshStandardMaterial({ color: C('#a89f95'), roughness: 1 })), r = rng(17), debris = cloud(900, (i, c) => { const rr = 135 + r() * 90, th = r() * 6.2832; c.set(r() > 0.5 ? '#ff9a50' : '#d8c0a8'); return [Math.cos(th) * rr, gauss(r) * 9, Math.sin(th) * rr]; }, { size: 2.4 }); g.add(e, moon, debris);
    return { group: g, pose: { pos: V(40, 40, 380), look: V(0, 0, 0) }, fog: ['#0a0204', 1000, 2600], update(t) { e.rotation.y = t * 0.06; moon.position.set(Math.cos(t * 0.18) * 250, 0, Math.sin(t * 0.18) * 250); debris.rotation.y = -t * 0.05; } }; };
  const planet = (o, pose, fogc, extra) => () => { const g = new THREE.Group(), e = earth(o); g.add(e); const ex = extra?.(g, e); return { group: g, pose, fog: fogc, update(t) { e.rotation.y = t * 0.05; if (e.userData.clouds) e.userData.clouds.rotation.y = t * 0.012; ex?.update?.(t, e); } }; };
  stages.oxygen = planet({ tint: '#a8c8ff', glowColor: '#6ab4ff', clouds: 0.7 }, { pos: V(-40, 20, 340), look: V(0, 0, 0) }, ['#041428', 1000, 2600]);
  stages.cells = () => { const r = rng(19), g = new THREE.Group(), cells = []; for (let i = 0; i < 70; i++) { const rad = 6 + r() * 18, c = new THREE.Group(); c.add(new THREE.Mesh(new THREE.SphereGeometry(rad, 24, 16), new THREE.MeshStandardMaterial({ color: C('#7fe8d0'), transparent: true, opacity: 0.28, roughness: 0.3, emissive: C('#0a4a44') })), new THREE.Mesh(new THREE.SphereGeometry(rad * 0.34, 16, 12), new THREE.MeshStandardMaterial({ color: C('#d8ffe8'), emissive: C('#3a9a80'), roughness: 0.5 }))); c.position.set((r() - 0.5) * 420, (r() - 0.5) * 300, (r() - 0.5) * 300 - 60); c.userData = { a: r() * 9, b: 0.2 + r() * 0.5 }; cells.push(c); g.add(c); }
    return { group: g, pose: { pos: V(0, 0, 230), look: V(0, 0, 0) }, fog: ['#031a1c', 300, 900], update(t) { for (const c of cells) { c.position.y += Math.sin(t * c.userData.b + c.userData.a) * 0.06; c.position.x += Math.cos(t * c.userData.b * 0.7 + c.userData.a) * 0.05; c.rotation.y = t * 0.2; } } }; };
  stages.impact = planet({ tint: '#d8c8b8', glowColor: '#ff7a30', clouds: 0.35 }, { pos: V(0, 20, 330), look: V(0, 0, 0) }, ['#050408', 1000, 2600], g => { const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), new THREE.MeshStandardMaterial({ color: C('#6a5a4a'), roughness: 1, emissive: C('#ff5a10'), emissiveIntensity: 0.6 })), tail = glow('#ffd28a', 70, 1), flash = glow('#fff0d0', 10, 0); g.add(rock, tail, flash); const tgt = ll(18, -90, 101);
    return { update(t, e) { const p = (t % 7) / 7, k = Math.min(1, p / 0.7), pos = V(300, 220, 100).lerp(tgt, ease(k) * 0.9 + k * 0.1); rock.position.copy(pos); tail.position.copy(pos); rock.visible = k < 1; tail.visible = k < 1; const hit = Math.max(0, (p - 0.7) / 0.3); flash.position.copy(tgt); flash.scale.setScalar(10 + 240 * hit); flash.material.opacity = hit > 0 ? 1 - hit : 0; e.userData.body.material.emissive.set(hit > 0 ? '#ff4a10' : '#000000'); e.userData.body.material.emissiveIntensity = hit > 0 ? 0.6 * (1 - hit) : 0; } }; });
  stages.now = planet({ tint: '#9aa4c0', glowColor: '#7aa0ff', clouds: 0.35, lights: 4200, marker: true }, { pos: V(0, 10, 760), look: V(0, 0, 0) }, ['#01020a', 2000, 4000], g => { const r = rng(29), s = cloud(1100, (i, c) => { const d = sphereDir(r); c.setHSL(0.6, 0.3, 0.7 + r() * 0.3); return [d[0] * 2600, d[1] * 2600, d[2] * 2600]; }, { size: 6, fog: false }); g.add(s); return { update(t, e) { const m = e.userData.marker; if (m) { m.scale.setScalar(20 + 12 * Math.sin(t * 2.2)); m.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.2); } } }; });

  // ---- building blocks for the scenes that show their subject: sky, ground, people, plants, animals, buildings, spacecraft ----
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color: C(color), roughness: 0.9, metalness: 0, ...o });
  const B = (color, o = {}) => new THREE.MeshBasicMaterial({ color: C(color), ...o });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const tube = (pts, r, mat) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), 24, r, 8), mat);
  function skyDome(top, horizon, below = horizon, r = 2400) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: C(top) }, b: { value: C(horizon) }, c: { value: C(below) } },
      vertexShader: 'varying float y;void main(){y=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 a,b,c;varying float y;void main(){vec3 col=y>0.?mix(b,a,pow(clamp(y,0.,1.),0.55)):mix(b,c,clamp(-y*5.,0.,1.));gl_FragColor=vec4(col,1.);\n#include <colorspace_fragment>\n}' }));
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
  function sauropod(mat, s = 1) { const g = new THREE.Group(), body = mesh(new THREE.SphereGeometry(1, 16, 12), mat, 0, 3.3, 0); body.scale.set(3.1, 1.5, 1.3); g.add(body, tube([[2.4, 3.8, 0], [4.4, 6.2, 0], [5.4, 8.6, 0], [6.3, 9.4, 0]], 0.34, mat), tube([[-2.6, 3.5, 0], [-5.5, 2.8, 0], [-8, 1.8, 0], [-10, 1.2, 0]], 0.3, mat)); const head = mesh(new THREE.SphereGeometry(0.5, 10, 8), mat, 6.5, 9.4, 0); head.scale.set(1.5, 0.7, 0.7); g.add(head); for (const [x, z] of [[1.8, 0.7], [1.8, -0.7], [-1.8, 0.7], [-1.8, -0.7]]) g.add(mesh(new THREE.CylinderGeometry(0.38, 0.32, 3.2, 8), mat, x, 1.6, z)); g.scale.setScalar(s); return g; }
  function theropod(mat, s = 1) { const g = new THREE.Group(), body = mesh(new THREE.SphereGeometry(1, 16, 12), mat, 0, 3.4, 0); body.scale.set(2.2, 1.05, 0.85); body.rotation.z = 0.18; const head = mesh(new THREE.BoxGeometry(1.7, 0.85, 0.75), mat, 2.7, 4.6, 0); head.rotation.z = -0.1; g.add(body, head, tube([[1.5, 3.9, 0], [2.2, 4.4, 0]], 0.42, mat), tube([[-1.8, 3.3, 0], [-4, 2.6, 0], [-6.5, 2.0, 0]], 0.32, mat)); for (const z of [0.4, -0.4]) { g.add(tube([[-0.2, 3.0, z], [0.3, 1.6, z], [-0.1, 0.1, z]], 0.26, mat)); g.add(tube([[1.4, 3.3, z * 0.8], [1.8, 2.9, z * 0.8]], 0.08, mat)); } g.scale.setScalar(s); return g; }
  function cycad(mat, s = 1) { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.3 * s, 0.4 * s, 1.2 * s, 8), mat, 0, 0.6 * s, 0)); for (let k = 0; k < 9; k++) { const h = new THREE.Group(), f = mesh(new THREE.ConeGeometry(0.22 * s, 2.2 * s, 4), mat); f.geometry.translate(0, 1.1 * s, 0); f.scale.z = 0.2; f.rotation.z = -0.9; h.add(f); h.position.y = 1.2 * s; h.rotation.y = k / 9 * Math.PI * 2; g.add(h); } return g; }
  function instanced(geo, mat, list) { const im = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(); list.forEach((p, k) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(p[4] || 0, p[3] || 0, p[5] || 0); const sc = p[6] ?? 1; if (Array.isArray(sc)) o.scale.set(...sc); else o.scale.setScalar(sc); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }); return im; }
  function miniGalaxy(r, kind, seed) {
    const q = rng(seed), n = kind === 'spiral' ? 520 : kind === 'elliptical' ? 320 : 160, g = new THREE.Group();
    g.add(cloud(n, (i, c) => { if (kind === 'spiral') { const rr = Math.pow(q(), 0.7), arm = q() < 0.5 ? 0 : Math.PI, th = arm + rr * 4 + gauss(q) * 0.35; c.setHSL(rr < 0.25 ? 0.1 : 0.6, 0.6, 0.6 + q() * 0.3); return [Math.cos(th) * rr * r, gauss(q) * r * 0.05, Math.sin(th) * rr * r]; } if (kind === 'elliptical') { c.setHSL(0.09, 0.6, 0.55 + q() * 0.3); return [gauss(q) * r * 0.7, gauss(q) * r * 0.45, gauss(q) * r * 0.5]; } c.setHSL(0.02, 0.8, 0.5 + q() * 0.3); return [gauss(q) * r * 0.5 + (q() < 0.3 ? r * 0.4 : 0), gauss(q) * r * 0.35, gauss(q) * r * 0.3]; }, { size: Math.max(1.6, r / 14), fog: false }));
    const core = glow(kind === 'irregular' ? '#ff5a3a' : '#ffe0b0', r * (kind === 'spiral' ? 0.7 : 0.9), kind === 'irregular' ? 0.45 : 0.5); g.add(core); return g;
  }
  function satellite(s = 1) { const g = new THREE.Group(), panel = M('#1a2a66', { metalness: 0.6, roughness: 0.35, emissive: C('#0a1440') }); g.add(mesh(new THREE.BoxGeometry(1 * s, 1 * s, 1.4 * s), M('#d8c070', { metalness: 0.8, roughness: 0.3 }))); for (const x of [-1.9, 1.9]) g.add(mesh(new THREE.BoxGeometry(2.6 * s, 0.05 * s, 1 * s), panel, x * s, 0, 0)); return g; }
  function station() {
    const g = new THREE.Group(), white = M('#e8e8e8', { metalness: 0.5, roughness: 0.4 }), panel = M('#c8902a', { metalness: 0.7, roughness: 0.3, emissive: C('#3a2208') }), truss = M('#9a9a9a', { metalness: 0.6, roughness: 0.5 });
    g.add(mesh(new THREE.BoxGeometry(30, 0.8, 0.8), truss)); for (const x of [-13, -9, 9, 13]) for (const z of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(2.6, 0.05, 11), panel, x, 0, z * 6.3); g.add(p); }
    for (const [x, len] of [[-2.5, 4], [0, 5], [2.6, 4]]) { const m = mesh(new THREE.CylinderGeometry(0.85, 0.85, len, 12), white, x, 0, 0); m.rotation.x = Math.PI / 2; g.add(m); }
    const lab = mesh(new THREE.CylinderGeometry(0.85, 0.85, 7, 12), white, 0, 0, 0); lab.rotation.z = Math.PI / 2; lab.position.set(0, 0, 0); g.add(lab); g.add(mesh(new THREE.BoxGeometry(1.6, 0.05, 4), M('#f0f0f0'), 0, 1.4, 0)); return g;
  }
  function hubble() { const g = new THREE.Group(), tubeM = M('#d8d8d8', { metalness: 0.9, roughness: 0.25 }), b = mesh(new THREE.CylinderGeometry(1.1, 1.1, 5.2, 16), tubeM); b.rotation.z = Math.PI / 2; g.add(b); const cap = mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.2, 16, 1, true), M('#333')); cap.rotation.z = Math.PI / 2; cap.position.x = 2.7; g.add(cap); for (const z of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(2.2, 0.05, 4.2), M('#2a3a7a', { metalness: 0.6, roughness: 0.3, emissive: C('#0a1440') }), -0.6, 0, z * 3.4)); return g; }

  // 7 Jan: the earliest galaxy we have seen, in a deep field of young galaxies
  stages.galaxy = () => {
    const r = rng(41), g = new THREE.Group(), gals = [];
    for (let k = 0; k < 34; k++) { const kind = k % 5 === 0 ? 'elliptical' : k % 3 === 0 ? 'irregular' : 'spiral', m = miniGalaxy(14 + r() * 46, kind, 100 + k); m.position.set((r() - 0.5) * 900, (r() - 0.5) * 700, -150 - r() * 1100); m.rotation.set(r() * 3, r() * 3, r() * 3); m.userData.sp = (r() - 0.5) * 0.06; gals.push(m); g.add(m); }
    const first = miniGalaxy(16, 'irregular', 7); first.position.set(0, 10, 0); g.add(first, glow('#ff6a4a', 46, 0.4)); g.children.at(-1).position.copy(first.position);
    g.add(cloud(400, () => [(r() - 0.5) * 1400, (r() - 0.5) * 1000, -r() * 1400], { size: 2.2, opacity: 0.5 }));
    return { group: g, pose: { pos: V(0, 0, 150), look: V(0, 0, -40) }, fog: ['#01020a', 1400, 3000], update(t) { for (const m of gals) m.rotation.y += m.userData.sp * 0.03; first.rotation.y = t * 0.1; } };
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
  // 22 Sep: the first life: single cells drifting in a shallow sea above stromatolite mounds
  stages.life = () => {
    const r = rng(43), g = new THREE.Group(), cells = [];
    g.add(skyDome('#5ad0c0', '#0b3a3e', '#06201f', 400), ground(M('#7a8a64')), hemi('#8ff0e0', '#2a3a2a', 1.4));
    const prof = []; for (let k = 0; k <= 12; k++) { const y = k / 12; prof.push(new THREE.Vector2(y < 0.75 ? 1 - 0.08 * Math.sin(y * 40) : Math.sqrt(Math.max(0, 1 - ((y - 0.75) / 0.25) ** 2)), y)); } const mound = new THREE.LatheGeometry(prof, 18);
    for (let k = 0; k < 22; k++) { const s2 = 0.6 + r() * 1.1, m = mesh(mound, M(k % 2 ? '#9a8a64' : '#857650'), (r() - 0.5) * 26, 0, -r() * 22 + 3); m.scale.set(s2, s2 * (1 + r() * 1.2), s2); g.add(m); }
    const rod = new THREE.CapsuleGeometry(0.16, 0.55, 4, 8), coc = new THREE.SphereGeometry(0.2, 10, 8);
    for (let k = 0; k < 240; k++) { const m = mesh(k % 3 ? rod : coc, M(k % 4 ? '#7fffc8' : '#c8ff8a', { emissive: C(k % 4 ? '#1f8a60' : '#5a8a20'), transparent: true, opacity: 0.85, roughness: 0.4 }), (r() - 0.5) * 14, 0.8 + r() * 5, -r() * 12 + 4); m.rotation.set(r() * 3, r() * 3, r() * 3); m.userData = { a: r() * 9, s: 0.2 + r() * 0.5 }; cells.push(m); g.add(m); }
    for (let k = 0; k < 5; k++) { const sh = mesh(new THREE.PlaneGeometry(2 + r() * 3, 40), B('#a0fff0', { transparent: true, opacity: 0.06, blending: add, depthWrite: false, side: THREE.DoubleSide }), (r() - 0.5) * 24, 14, -8 - r() * 10); sh.rotation.z = 0.3; g.add(sh); }
    return { group: g, pose: { pos: V(0, 3, 11), look: V(0, 2.2, 0) }, fog: ['#0e4a4c', 4, 45], update(t) { for (const c of cells) { c.rotation.x += 0.004; c.rotation.y += 0.006; c.position.y += Math.sin(t * c.userData.s + c.userData.a) * 0.004; } } };
  };
  // 14 Dec: the first animals: soft-bodied life of the Ediacaran sea: fronds, jellyfish, sponges and flat Dickinsonia
  stages.animals = () => {
    const r = rng(47), g = new THREE.Group(), fronds = [], jellies = [];
    g.add(skyDome('#3a7ac8', '#071c44', '#040f26', 400), ground(M('#5a5a50')), hemi('#9ac8ff', '#1a1a2a', 1.3));
    const frondM = M('#f0b080', { roughness: 0.6, emissive: C('#5a2a10') }), stalkM = M('#c08860');
    for (let k = 0; k < 16; k++) { const f = new THREE.Group(), h = 1.6 + r() * 2.2, leaf = mesh(new THREE.SphereGeometry(1, 14, 18), frondM, 0, h * 0.62, 0); leaf.scale.set(0.55, h * 0.45, 0.08); for (let j = 0; j < 9; j++) { const rib = mesh(new THREE.BoxGeometry(1.0, 0.035, 0.1), stalkM, 0, h * 0.3 + j * h * 0.075, 0); f.add(rib); } f.add(leaf, mesh(new THREE.CylinderGeometry(0.04, 0.05, h * 0.3, 6), stalkM, 0, h * 0.15, 0), mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 12), stalkM)); f.position.set((r() - 0.5) * 22, 0, -r() * 18 + 2); f.rotation.y = r() * 3; f.userData.a = r() * 9; fronds.push(f); g.add(f); }
    for (let k = 0; k < 8; k++) { const sp = mesh(new THREE.CylinderGeometry(0.35 + r() * 0.3, 0.25, 0.8 + r() * 1.4, 12, 1, true), M('#d8c060', { side: THREE.DoubleSide }), (r() - 0.5) * 20, 0.5, -r() * 16); g.add(sp); }
    for (let k = 0; k < 10; k++) { const d = mesh(new THREE.SphereGeometry(0.5 + r() * 0.5, 16, 8), M('#b8805a')); d.scale.set(1, 0.08, 0.7); d.position.set((r() - 0.5) * 18, 0.04, -r() * 14 + 3); g.add(d); }
    const bellG = new THREE.SphereGeometry(0.7, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let k = 0; k < 14; k++) { const j = new THREE.Group(), col = k % 2 ? '#ff9ad8' : '#9ad8ff'; j.add(mesh(bellG, M(col, { transparent: true, opacity: 0.55, emissive: C(col), emissiveIntensity: 0.5, side: THREE.DoubleSide }))); const lines = []; for (let n = 0; n < 8; n++) { const a = n / 8 * 6.283; lines.push(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, Math.cos(a) * 0.45, -1.6 - r(), Math.sin(a) * 0.45); } const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)); j.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C(col), transparent: true, opacity: 0.5 }))); j.position.set((r() - 0.5) * 16, 3 + r() * 5, -r() * 14 + 2); j.userData = { y: j.position.y, a: r() * 9 }; jellies.push(j); g.add(j); }
    g.add(cloud(600, () => [(r() - 0.5) * 30, r() * 12, -r() * 24 + 4], { size: 0.08, opacity: 0.6 }));
    return { group: g, pose: { pos: V(0, 2.6, 11), look: V(0, 2.4, 0) }, fog: ['#0a2a5a', 4, 48], update(t) { for (const f of fronds) f.rotation.z = Math.sin(t * 0.6 + f.userData.a) * 0.08; for (const j of jellies) { const p = (Math.sin(t * 1.1 + j.userData.a) + 1) / 2; j.position.y = j.userData.y + Math.sin(t * 0.4 + j.userData.a) * 0.6; j.children[0].scale.set(1 + p * 0.12, 1 - p * 0.18, 1 + p * 0.12); } } };
  };
  // 20 Dec: plants reach the land: mosses and the first stalked plants (like Cooksonia) on a rocky shore
  stages.plants = () => {
    const r = rng(53), g = new THREE.Group(), rock = M('#6a6a66'), moss = M('#4a8a2a', { roughness: 1 }), stem = M('#6aa03a');
    g.add(skyDome('#5a86c8', '#f0e0b8', '#c8b890'), ground(M('#5a4c36')), hemi('#cfe4ff', '#4a3a28', 1.1));
    const sea = mesh(new THREE.PlaneGeometry(400, 200), M('#2a5a80', { metalness: 0.3, roughness: 0.25 }), 0, 0.05, -110); sea.rotation.x = -Math.PI / 2; g.add(sea);
    for (let k = 0; k < 26; k++) { const s = 0.4 + r() * 1.6, m = mesh(new THREE.DodecahedronGeometry(s, 0), rock, (r() - 0.5) * 26, s * 0.4, -r() * 16 + 2); m.rotation.set(r() * 3, r() * 3, r() * 3); g.add(m); }
    for (let k = 0; k < 40; k++) { const m = mesh(new THREE.SphereGeometry(0.4 + r() * 0.8, 12, 8), moss, (r() - 0.5) * 22, 0, -r() * 14 + 3); m.scale.y = 0.28; g.add(m); }
    const stems = [], tips = []; for (let k = 0; k < 520; k++) { const x = (r() - 0.5) * 20, z = -r() * 12 + 3, h = 0.4 + r() * 0.8; stems.push([x, h / 2, z, 0, (r() - 0.5) * 0.2, (r() - 0.5) * 0.2, [1, h, 1]]); tips.push([x, h, z]); }
    g.add(instanced(new THREE.CylinderGeometry(0.018, 0.025, 1, 4), stem, stems), instanced(new THREE.SphereGeometry(0.05, 6, 4), M('#c8a040'), tips));
    return { group: g, pose: { pos: V(0, 1.7, 8.5), look: V(0, 0.8, 0) }, fog: ['#e0d4b4', 18, 160], update() {} };
  };
  // 25 Dec: the dinosaurs: long-necked sauropods and a tyrannosaur against a volcanic sunset, among cycads
  stages.dinos = () => {
    const r = rng(59), g = new THREE.Group(), dark = B('#1c0c06'), dark2 = B('#2a140a');
    g.add(skyDome('#3a1830', '#ff9848', '#2a1408'), ground(B('#24120a')));
    const sun = glow('#ffd08a', 170, 0.85); sun.position.set(30, 22, -420); const disc = mesh(new THREE.CircleGeometry(20, 32), B('#ffe0a0', { fog: false })); disc.position.set(30, 22, -430); g.add(sun, disc);
    const volc = mesh(new THREE.ConeGeometry(90, 70, 24, 1, true), B('#2a1210')); volc.position.set(-130, 34, -360); const lava = glow('#ff5a1a', 90, 0.9); lava.position.set(-130, 70, -358); g.add(volc, lava);
    const smoke = cloud(260, () => [-130 + gauss(r) * 14, 70 + r() * 120, -360 + gauss(r) * 10], { size: 14, opacity: 0.25 }); smoke.material.color.set('#5a3a30'); smoke.material.blending = THREE.NormalBlending; g.add(smoke);
    const herd = [sauropod(dark2, 1.4), sauropod(dark2, 1.0), sauropod(dark2, 0.7)]; herd[0].position.set(-26, 0, -70); herd[1].position.set(4, 0, -95); herd[2].position.set(24, 0, -110); herd[1].rotation.y = 0.15; herd[2].rotation.y = -0.2; herd[0].rotation.y = Math.PI - 0.3; g.add(...herd);
    const rex = theropod(dark, 1.15); rex.position.set(10, 0, -22); rex.rotation.y = Math.PI * 0.92; g.add(rex);
    for (const [x, z, s] of [[-18, -6, 1.6], [22, -8, 1.3], [-30, -30, 2], [34, -40, 2.2], [-6, -50, 1.4]]) { const c = cycad(dark, s); c.position.set(x, 0, z); g.add(c); }
    for (const [x, z, s] of [[-40, -55, 2.6], [46, -60, 2.4]]) { const p = palm(dark, s); p.position.set(x, 0, z); g.add(p); }
    const flock = []; for (let k = 0; k < 4; k++) { const b = new THREE.Group(), w = mesh(new THREE.ConeGeometry(0.5, 3.2, 3), dark); w.rotation.z = Math.PI / 2; w.scale.z = 0.2; b.add(w); b.position.set(-40 + k * 7, 40 + k * 3, -120); b.userData.a = k; flock.push(b); g.add(b); }
    return { group: g, pose: { pos: V(0, 6, 32), look: V(0, 9, -40) }, fog: ['#b85a32', 80, 700], update(t) { smoke.rotation.y = t * 0.02; for (const b of flock) { b.position.x = -60 + ((t * 4 + b.userData.a * 9) % 120); b.children[0].scale.y = 1 + 0.25 * Math.sin(t * 6 + b.userData.a); } herd.forEach((h, k) => { h.children[1].rotation.z = Math.sin(t * 0.4 + k) * 0.03; }); } };
  };
  // A jointed early human: shaped torso, tapered limbs, head with jaw, nose and curly hair, hands, feet and a hide wrap.
  // Joints are groups, so a pose is a handful of angles (negative x swings a limb forward; knees bend with positive x).
  function human({ skin = '#4a2c1c', s = 1, female = false, pose = {}, seed = 1 } = {}) {
    const q = rng(seed), SK = M(skin, { roughness: 0.62 }), HIDE = M(q() > 0.5 ? '#7a5434' : '#6a4a2e', { roughness: 1 }), HAIR = M('#120c08', { roughness: 1 });
    const limb = (len, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, len, 10); g.translate(0, -len / 2, 0); const m = new THREE.Mesh(g, SK); m.add(new THREE.Mesh(new THREE.SphereGeometry(r0, 10, 8), SK)); return m; };
    const joint = (x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); return j; };
    const root = new THREE.Group(), pelvis = joint(0, 0.93, 0); root.add(pelvis);
    const hipW = female ? 0.105 : 0.095, legs = [-1, 1].map(side => { const hip = joint(side * hipW, 0, 0), thigh = limb(0.44, 0.075, 0.055), knee = joint(0, -0.44, 0), shin = limb(0.42, 0.052, 0.036), ankle = joint(0, -0.42, 0), foot = mesh(new THREE.BoxGeometry(0.085, 0.05, 0.22), SK, 0, -0.035, 0.06); hip.add(thigh, knee); knee.add(shin, ankle); ankle.add(foot); pelvis.add(hip); return { hip, knee }; });
    const prof = (female ? [[0.12, -0.06], [0.175, 0], [0.16, 0.1], [0.125, 0.2], [0.15, 0.33], [0.165, 0.42], [0.17, 0.5], [0.09, 0.56]] : [[0.12, -0.06], [0.16, 0], [0.145, 0.1], [0.13, 0.2], [0.16, 0.33], [0.19, 0.44], [0.185, 0.5], [0.09, 0.56]]).map(([r, y]) => new THREE.Vector2(r, y));
    const spine = joint(0, 0, 0), torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), SK); torso.scale.z = 0.62; spine.add(torso); pelvis.add(spine);
    const wrap = mesh(new THREE.CylinderGeometry(0.165, female ? 0.2 : 0.185, 0.2, 14, 1, true), new THREE.MeshStandardMaterial({ color: HIDE.color, roughness: 1, side: THREE.DoubleSide }), 0, -0.06, 0); wrap.scale.z = 0.7; spine.add(wrap);
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
  // 23:59:32: farming: fields of wheat, round mud-brick huts and a river at dawn
  stages.farming = () => {
    const r = rng(67), g = new THREE.Group();
    g.add(skyDome('#2c3e70', '#ffc890', '#5a4026'), ground(M('#5a4228', { roughness: 1 })), hemi('#ffe0b8', '#5a4026', 1.3));
    const sun = glow('#ffd8a0', 90, 0.8); sun.position.set(-60, 8, -400); g.add(sun);
    const river = mesh(new THREE.PlaneGeometry(14, 600), M('#4a78a8', { metalness: 0.4, roughness: 0.2 }), 34, 0.04, -120); river.rotation.x = -Math.PI / 2; river.rotation.z = 0.35; g.add(river);
    const fields = [[-22, -8, 18, 12, '#e8c060'], [-2, -14, 16, 14, '#8ab040'], [-24, -30, 20, 14, '#d8b050'], [0, -36, 18, 16, '#e0c068']];
    for (const [fx, fz, w, d, col] of fields) { const list = []; for (let row = 0; row < d / 0.7; row++) for (let k = 0; k < w / 0.25; k++) list.push([fx + k * 0.25 + (r() - 0.5) * 0.1, 0.5, fz - row * 0.7 + (r() - 0.5) * 0.12, r() * 3, (r() - 0.5) * 0.25, (r() - 0.5) * 0.25, 0.7 + r() * 0.5]); g.add(instanced(new THREE.ConeGeometry(0.06, 1.1, 4), M(col, { roughness: 0.8 }), list)); }
    const mud = M('#a07048'), thatch = M('#c8a060');
    for (const [x, z, s] of [[14, -20, 1], [19, -26, 1.2], [12, -30, 0.9], [22, -36, 1.1], [16, -42, 1], [26, -18, 0.8]]) { g.add(mesh(new THREE.CylinderGeometry(1.7 * s, 1.8 * s, 2 * s, 14), mud, x, s, z), mesh(new THREE.ConeGeometry(2.2 * s, 1.8 * s, 14), thatch, x, 2 * s + 0.9 * s, z)); }
    for (const [x, z, s] of [[30, -8, 1.3], [40, -30, 1.6], [28, -50, 1.4], [44, -70, 1.8]]) { const p = palm(M('#2a3a1a'), s); p.position.set(x, 0, z); g.add(p); }
    const farmer = person(M('#5a3a24'), 1.1); farmer.position.set(-6, 0, -4); farmer.rotation.set(0, 0.6, 0); farmer.children[2].rotation.x = 0.5; g.add(farmer);
    const ox = new THREE.Group(), oxM = M('#4a3a2a'), body = mesh(new THREE.SphereGeometry(1, 12, 10), oxM, 0, 1.6, 0); body.scale.set(1.6, 0.8, 0.75); ox.add(body, mesh(new THREE.SphereGeometry(0.45, 10, 8), oxM, 1.8, 1.8, 0)); for (const [x, z] of [[0.9, 0.4], [0.9, -0.4], [-0.9, 0.4], [-0.9, -0.4]]) ox.add(mesh(new THREE.CylinderGeometry(0.15, 0.12, 1.1, 6), oxM, x, 0.55, z)); ox.position.set(-9, 0, -7); ox.rotation.y = 0.6; g.add(ox);
    return { group: g, pose: { pos: V(-4, 7, 18), look: V(0, 1, -16) }, fog: ['#e8b888', 40, 420], update(t) { g.children.forEach(c => { if (c.isInstancedMesh) c.rotation.z = Math.sin(t * 0.8) * 0.004; }); } };
  };
  // 23:59:48: writing and the first cities: pyramids, a ziggurat and a mud-brick city on a river
  stages.writing = () => {
    const r = rng(71), g = new THREE.Group(), sand = M('#d8b47a'), brick = M('#b07a4a'), stone = M('#e0c48a');
    g.add(skyDome('#3a4a7a', '#ffb070', '#8a6a40'), ground(M('#c8a46a', { roughness: 1 })), hemi('#ffe4c0', '#8a6a40', 1.25));
    const sun = glow('#ffd090', 110, 0.8); sun.position.set(80, 14, -420); g.add(sun);
    for (const [x, z, s] of [[-40, -70, 1], [-22, -84, 0.85], [-8, -94, 0.5]]) { const p = mesh(new THREE.ConeGeometry(16 * s, 15 * s, 4), stone, x, 7.5 * s, z); p.rotation.y = Math.PI / 4; g.add(p); }
    for (const [w, d, y] of [[22, 18, 2], [16, 12, 6], [10, 7, 10]]) g.add(mesh(new THREE.BoxGeometry(w, 4, d), brick, 22, y, -60));
    g.add(mesh(new THREE.BoxGeometry(3, 12, 12), brick, 22, 3.5, -46)); g.children.at(-1).rotation.x = -0.6;
    const homes = []; for (let a = 0; a < 9; a++) for (let b = 0; b < 7; b++) if (r() > 0.18) { const h = 1.6 + r() * 1.6; homes.push([4 + a * 3.4, h / 2, -12 - b * 3.4, 0, 0, 0, [1, h, 1]]); }
    g.add(instanced(new THREE.BoxGeometry(2.6, 1, 2.6), M('#c48c5a'), homes));
    const river = mesh(new THREE.PlaneGeometry(600, 12), M('#3a6a9a', { metalness: 0.4, roughness: 0.2 }), 0, 0.05, -2); river.rotation.x = -Math.PI / 2; g.add(river);
    const boat = new THREE.Group(), hull = mesh(new THREE.CylinderGeometry(0.7, 0.7, 5, 10, 1, false, 0, Math.PI), M('#6a4a2a'), 0, 0.5, 0); hull.rotation.set(0, 0, Math.PI / 2); hull.rotation.x = Math.PI; const sail = mesh(new THREE.PlaneGeometry(2.4, 3.2), M('#f0e8d0', { side: THREE.DoubleSide }), 0, 2.4, 0); boat.add(hull, sail, mesh(new THREE.CylinderGeometry(0.05, 0.05, 4), M('#4a3a2a'), 0, 2.2, 0)); boat.position.set(-10, 0, -2); g.add(boat);
    for (const [x, z, s] of [[-16, -8, 1.3], [-28, -9, 1.6], [-4, -8, 1.1], [34, -8, 1.4], [44, -10, 1.7]]) { const p = palm(M('#2a3a1a'), s); p.position.set(x, 0, z); g.add(p); }
    const tablet = mesh(new THREE.BoxGeometry(1.4, 1.9, 0.25), M('#b8865a'), -5, 1.1, 6); tablet.rotation.set(-0.3, 0.4, 0); g.add(tablet); for (let k = 0; k < 6; k++) { const line = mesh(new THREE.BoxGeometry(1.1, 0.05, 0.02), M('#6a4a2a'), -5, 1.7 - k * 0.24, 6.14); line.rotation.copy(tablet.rotation); g.add(line); }
    return { group: g, pose: { pos: V(-2, 12, 24), look: V(0, 4, -30) }, fog: ['#e8b888', 60, 480], update(t) { boat.position.x = -30 + ((t * 1.5) % 70); } };
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
  const poseAt = (i, fit) => { const s = built[i], z = -i * STAGE_GAP, look = s.pose.look.clone().add(V(0, 0, z)), pos = s.pose.pos.clone().add(V(0, 0, z)); pos.sub(look).multiplyScalar(fit).add(look); return { pos, look }; };

  // camera, flight and frame loop
  let cur = 0, tNow = 0, prevIdx = -1, from = null, to = null, flight = 1, w = 0, h = 0, raf = 0, last = 0, t0 = 0, px = 0, py = 0, fit = 1, fogK = 1, drift = 0;
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0), fogFrom = { c: C('#02040c'), n: 200, f: 1600 }, fogTo = { c: C('#02040c'), n: 200, f: 1600 }, tmpC = new THREE.Color();
  function size() { w = canvas.clientWidth || 412; h = canvas.clientHeight || 915; renderer.setSize(w, h, false); cam.aspect = w / h; fit = w / h < 1 ? Math.min(2.1, 0.92 / Math.max(0.42, w / h)) : 1; cam.setViewOffset(w, h, 0, h * 0.16, w, h); /* lift the subject into the empty space above the card */ cam.updateProjectionMatrix(); }
  function setTarget(i, instant) {
    const a = built[i]; if (!a) return; const p = poseAt(i, fit); from = { pos: camPos.clone(), look: camLook.clone(), fog: { c: fogFrom.c.clone(), n: fogFrom.n, f: fogFrom.f } }; to = p; fogTo.c.set(a.fog[0]); fogTo.n = a.fog[1]; fogTo.f = a.fog[2];
    a.since = instant ? tNow : Infinity; sun.intensity = a.sun ?? 2.4; amb.intensity = a.amb ?? 0.55; const prev = cur; cur = i; prevIdx = instant || prev === i ? -1 : prev; flight = instant ? 1 : 0; if (instant) { camPos.copy(p.pos); camLook.copy(p.look); fogFrom.c.copy(fogTo.c); fogFrom.n = fogTo.n; fogFrom.f = fogTo.f; }
    built.forEach((s, k) => { if (s) s.group.visible = k === i || k === prevIdx; });
  }
  function render(now) {
    const t = reduced() ? 0 : Math.max(0, now - t0) / 1000, dt = Math.min(0.6, (now - last) / 1000 || 0.016); last = now;
    if (flight < 1) { flight = Math.min(1, flight + dt / 2.4); const k = ease(flight); camPos.lerpVectors(from.pos, to.pos, k); camLook.lerpVectors(from.look, to.look, k); fogFrom.c.lerp(fogTo.c, 0.06 + 0.1 * k); fogFrom.n += (fogTo.n - fogFrom.n) * 0.08; fogFrom.f += (fogTo.f - fogFrom.f) * 0.08; if (flight >= 1) { built.forEach((s, k2) => { if (s) s.group.visible = k2 === cur; }); prevIdx = -1; if (built[cur]) built[cur].since = t; } }
    else { fogFrom.c.lerp(fogTo.c, 0.1); }
    scene.fog.color.copy(fogFrom.c); scene.fog.near = fogFrom.n; scene.fog.far = fogFrom.f; scene.background.copy(fogFrom.c);
    const wob = reduced() ? 0 : camPos.distanceTo(camLook) / 400; /* drift and parallax scale with the scene, so a ground-level camera never sinks below the ground */ cam.position.set(camPos.x + (Math.sin(t * 0.13) * 14 + px * 26) * wob, camPos.y + Math.max(-camPos.y * 0.5 / Math.max(wob, 1e-6), Math.cos(t * 0.1) * 8 - py * 16) * wob, camPos.z - drift * wob); cam.position.set(camPos.x + (Math.sin(t * 0.13) * 14 + px * 26) * wob, camPos.y + (Math.cos(t * 0.1) * 8 - py * 16) * wob, camPos.z - drift * wob); cam.lookAt(camLook);
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
