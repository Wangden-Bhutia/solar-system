// The cosmic year in 3D: one WebGL scene, one stage per era laid out along a line, and a camera that flies from stage to stage.
// Built on first open (three.js itself is already loaded by the app). The 2D backdrop in cosmic-backdrop.js shows until it is ready, and stays as the fallback.
import { EVENTS } from './cosmic-calendar.js';

const STAGE_GAP = 1400;
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

export async function createWorld(canvas, { reduced = () => false } = {}) {
  const THREE = await import('./vendor/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(58, 1, 0.5, 9000);
  scene.fog = new THREE.Fog(0x02040c, 200, 1600); scene.background = new THREE.Color(0x02040c);
  const sun = new THREE.DirectionalLight(0xfff1d8, 2.4); sun.position.set(4, 1.5, 3); scene.add(sun, new THREE.AmbientLight(0x6b7fa8, 0.55));
  const V = (x, y, z) => new THREE.Vector3(x, y, z), C = c => new THREE.Color(c);
  const add = THREE.AdditiveBlending;

  // shared bits
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
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
  stages.galaxy = () => { const g = new THREE.Group(), r = rng(11), st = cloud(2200, (i, c) => { c.setHSL(0.58 + r() * 0.1, 0.5, 0.65 + r() * 0.3); return [(r() - 0.5) * 1300, (r() - 0.5) * 800, (r() - 0.5) * 1300]; }, { size: 3.4 }); g.add(st); for (let i = 0; i < 9; i++) { const s = glow(i % 3 ? '#7a8cff' : '#ffb27a', 120 + r() * 220, 0.35); s.position.set((r() - 0.5) * 900, (r() - 0.5) * 400, (r() - 0.5) * 900 - 100); g.add(s); }
    return { group: g, pose: { pos: V(0, 0, 380), look: V(0, 0, -100) }, fog: ['#02030a', 700, 2000], update(t) { st.rotation.y = t * 0.006; } }; };
  stages.disk = () => { const r = rng(13), g = new THREE.Group(), pts = cloud(11000, (i, c) => { const rr = Math.pow(r(), 0.75) * 330, arm = r() < 0.5 ? 0 : Math.PI, th = arm + rr / 330 * 4.4 + gauss(r) * (0.25 + rr / 900), y = gauss(r) * (14 * (1 - rr / 420)); c.setHSL(0.1 + (rr / 330) * 0.5, 0.55, 0.62 + r() * 0.3); return [Math.cos(th) * rr, y, Math.sin(th) * rr]; }, { size: 2.6 }), core = glow('#ffe2a8', 190, 0.9); g.add(pts, core);
    return { group: g, pose: { pos: V(0, 230, 380), look: V(0, 0, 0) }, fog: ['#02030a', 900, 2200], update(t) { pts.rotation.y = t * 0.035; } }; };
  stages.sun = () => { const r = rng(15), g = new THREE.Group(), star = new THREE.Mesh(new THREE.SphereGeometry(70, 48, 32), new THREE.MeshBasicMaterial({ map: photo('sun'), color: C('#ffe6b8'), fog: false })), halo = glow('#ff9c3a', 520, 0.9), disc = cloud(9000, (i, c) => { const rr = 120 + Math.pow(r(), 0.8) * 340, th = r() * 6.2832; c.setHSL(0.07 + r() * 0.05, 0.7, 0.45 + r() * 0.3); return [Math.cos(th) * rr, gauss(r) * 7, Math.sin(th) * rr]; }, { size: 1.9 }); g.add(star, halo, disc);
    return { group: g, pose: { pos: V(0, 120, 520), look: V(0, 0, 0) }, fog: ['#060304', 900, 2300], update(t) { disc.rotation.y = t * 0.08; star.rotation.y = t * 0.05; } }; };
  stages.earth = () => { const g = new THREE.Group(), e = earth({ tint: '#ff7a3a', emissive: '#7a1d02', glowColor: '#ff6a20', r0: 100 }), moon = new THREE.Mesh(new THREE.SphereGeometry(27, 32, 24), new THREE.MeshStandardMaterial({ color: C('#a89f95'), roughness: 1 })), r = rng(17), debris = cloud(900, (i, c) => { const rr = 135 + r() * 90, th = r() * 6.2832; c.set(r() > 0.5 ? '#ff9a50' : '#d8c0a8'); return [Math.cos(th) * rr, gauss(r) * 9, Math.sin(th) * rr]; }, { size: 2.4 }); g.add(e, moon, debris);
    return { group: g, pose: { pos: V(40, 40, 380), look: V(0, 0, 0) }, fog: ['#0a0204', 1000, 2600], update(t) { e.rotation.y = t * 0.06; moon.position.set(Math.cos(t * 0.18) * 250, 0, Math.sin(t * 0.18) * 250); debris.rotation.y = -t * 0.05; } }; };
  const planet = (o, pose, fogc, extra) => () => { const g = new THREE.Group(), e = earth(o); g.add(e); const ex = extra?.(g, e); return { group: g, pose, fog: fogc, update(t) { e.rotation.y = t * 0.05; if (e.userData.clouds) e.userData.clouds.rotation.y = t * 0.012; ex?.update?.(t, e); } }; };
  stages.life = planet({ tint: '#7fb8b0', glowColor: '#5fe0c0' }, { pos: V(0, 30, 360), look: V(0, 0, 0) }, ['#020a0d', 1000, 2600]);
  stages.oxygen = planet({ tint: '#a8c8ff', glowColor: '#6ab4ff', clouds: 0.7 }, { pos: V(-40, 20, 340), look: V(0, 0, 0) }, ['#041428', 1000, 2600]);
  stages.cells = () => { const r = rng(19), g = new THREE.Group(), cells = []; for (let i = 0; i < 70; i++) { const rad = 6 + r() * 18, c = new THREE.Group(); c.add(new THREE.Mesh(new THREE.SphereGeometry(rad, 24, 16), new THREE.MeshStandardMaterial({ color: C('#7fe8d0'), transparent: true, opacity: 0.28, roughness: 0.3, emissive: C('#0a4a44') })), new THREE.Mesh(new THREE.SphereGeometry(rad * 0.34, 16, 12), new THREE.MeshStandardMaterial({ color: C('#d8ffe8'), emissive: C('#3a9a80'), roughness: 0.5 }))); c.position.set((r() - 0.5) * 420, (r() - 0.5) * 300, (r() - 0.5) * 300 - 60); c.userData = { a: r() * 9, b: 0.2 + r() * 0.5 }; cells.push(c); g.add(c); }
    return { group: g, pose: { pos: V(0, 0, 230), look: V(0, 0, 0) }, fog: ['#031a1c', 300, 900], update(t) { for (const c of cells) { c.position.y += Math.sin(t * c.userData.b + c.userData.a) * 0.06; c.position.x += Math.cos(t * c.userData.b * 0.7 + c.userData.a) * 0.05; c.rotation.y = t * 0.2; } } }; };
  stages.animals = () => { const r = rng(21), g = new THREE.Group(), fish = []; for (let i = 0; i < 36; i++) { const f = new THREE.Group(), L = 8 + r() * 14, m = new THREE.MeshStandardMaterial({ color: C(i % 4 ? '#8fd0ff' : '#ffb27a'), roughness: 0.6, emissive: C('#0a2a44') }), body = new THREE.Mesh(new THREE.SphereGeometry(L, 16, 12), m), tail = new THREE.Mesh(new THREE.ConeGeometry(L * 0.5, L * 0.9, 10), m); body.scale.set(1, 0.38, 0.28); tail.rotation.z = Math.PI / 2; tail.position.x = -L * 1.25; f.add(body, tail); f.userData = { rad: 60 + r() * 220, sp: 0.15 + r() * 0.3, ph: r() * 6.28, y: (r() - 0.5) * 200, z: -r() * 240 }; fish.push(f); g.add(f); }
    const plankton = cloud(900, () => [(r() - 0.5) * 700, (r() - 0.5) * 420, (r() - 0.5) * 500 - 100], { size: 1.6, opacity: 0.6 }); g.add(plankton); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(40 + r() * 40, 700), new THREE.MeshBasicMaterial({ color: C('#9ad0ff'), transparent: true, opacity: 0.07, blending: add, depthWrite: false, side: THREE.DoubleSide })); s.position.set((r() - 0.5) * 500, 120, -140 - r() * 150); s.rotation.z = 0.25; g.add(s); }
    return { group: g, pose: { pos: V(0, 0, 260), look: V(0, 0, -60) }, fog: ['#03122e', 250, 800], update(t) { for (const f of fish) { const d = f.userData, a = t * d.sp + d.ph; f.position.set(Math.cos(a) * d.rad, d.y + Math.sin(a * 2) * 6, d.z + Math.sin(a) * 60); f.rotation.y = Math.atan2(-Math.cos(a) * 60, -Math.sin(a) * d.rad); /* face the way it swims */ } } }; };
  stages.plants = planet({ tint: '#a8e890', glowColor: '#7affa0', clouds: 0.55 }, { pos: V(30, 50, 340), look: V(0, 0, 0) }, ['#06180a', 1000, 2600]);
  stages.dinos = planet({ tint: '#ffe0b0', glowColor: '#ffb060', clouds: 0.45 }, { pos: V(-50, 20, 330), look: V(0, 0, 0) }, ['#2a1006', 1000, 2600], g => { const s = glow('#ffcf8a', 420, 0.8); s.position.set(300, 90, -260); g.add(s); });
  stages.impact = planet({ tint: '#d8c8b8', glowColor: '#ff7a30', clouds: 0.35 }, { pos: V(0, 20, 330), look: V(0, 0, 0) }, ['#050408', 1000, 2600], g => { const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), new THREE.MeshStandardMaterial({ color: C('#6a5a4a'), roughness: 1, emissive: C('#ff5a10'), emissiveIntensity: 0.6 })), tail = glow('#ffd28a', 70, 1), flash = glow('#fff0d0', 10, 0); g.add(rock, tail, flash); const tgt = ll(18, -90, 101);
    return { update(t, e) { const p = (t % 7) / 7, k = Math.min(1, p / 0.7), pos = V(300, 220, 100).lerp(tgt, ease(k) * 0.9 + k * 0.1); rock.position.copy(pos); tail.position.copy(pos); rock.visible = k < 1; tail.visible = k < 1; const hit = Math.max(0, (p - 0.7) / 0.3); flash.position.copy(tgt); flash.scale.setScalar(10 + 240 * hit); flash.material.opacity = hit > 0 ? 1 - hit : 0; e.userData.body.material.emissive.set(hit > 0 ? '#ff4a10' : '#000000'); e.userData.body.material.emissiveIntensity = hit > 0 ? 0.6 * (1 - hit) : 0; } }; });
  stages.humans = () => { const r = rng(23), g = new THREE.Group(), stars = cloud(900, (i, c) => { const d = sphereDir(r); c.setHSL(0.6, 0.3, 0.7 + r() * 0.3); return [d[0] * 1500, Math.abs(d[1]) * 1500, d[2] * 1500]; }, { size: 5, fog: false }), ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: C('#0a0c12'), roughness: 1 })), fire = glow('#ff9a3a', 170, 0.85), flame = cloud(240, () => [0, 0, 0], { size: 3.4, fog: false }); ground.rotation.x = -Math.PI / 2; ground.position.y = -10; fire.position.y = 8; g.add(stars, ground, fire, flame);
    const base = Array.from({ length: 240 }, () => ({ a: r() * 6.28, d: r() * 9, s: 0.4 + r() * 0.9, p: r() })); const fl = new THREE.PointLight(0xff9a40, 60000, 500, 2); fl.position.set(0, 14, 0); g.add(fl);
    return { group: g, pose: { pos: V(0, 24, 150), look: V(0, 36, 0) }, fog: ['#02030a', 600, 2200], update(t) { const a = flame.geometry.attributes.position, c = flame.geometry.attributes.color; base.forEach((b, i) => { const k = (t * 0.6 * b.s + b.p) % 1; a.setXYZ(i, Math.cos(b.a + t) * b.d * 0.9 * (1 - k * 0.7) + Math.sin(t * 3 + i) * 1.5 * k, k * 16, Math.sin(b.a + t) * b.d * 0.9 * (1 - k * 0.7)); c.setXYZ(i, 1, 0.75 - k * 0.5, 0.25 - k * 0.2); }); a.needsUpdate = c.needsUpdate = true; fire.material.opacity = 0.7 + 0.25 * Math.sin(t * 11) * Math.sin(t * 4.3); fl.intensity = 50000 + 20000 * Math.sin(t * 13) * Math.sin(t * 5.1); } }; };
  stages.farming = planet({ tint: '#f0e8d0', glowColor: '#ffc880', clouds: 0.4, lights: 60 }, { pos: V(0, 30, 300), look: V(0, 0, 0) }, ['#1b2a55', 1000, 2600]);
  stages.writing = planet({ tint: '#d8d4cc', glowColor: '#ffc070', clouds: 0.35, lights: 500 }, { pos: V(20, 30, 290), look: V(0, 0, 0) }, ['#120a04', 1000, 2600]);
  stages.modern = planet({ tint: '#9aa4c0', glowColor: '#7aa0ff', clouds: 0.35, lights: 4200 }, { pos: V(0, 20, 280), look: V(0, 0, 0) }, ['#02030a', 1000, 2600]);
  stages.now = planet({ tint: '#9aa4c0', glowColor: '#7aa0ff', clouds: 0.35, lights: 4200, marker: true }, { pos: V(0, 10, 760), look: V(0, 0, 0) }, ['#01020a', 2000, 4000], g => { const r = rng(29), s = cloud(1100, (i, c) => { const d = sphereDir(r); c.setHSL(0.6, 0.3, 0.7 + r() * 0.3); return [d[0] * 2600, d[1] * 2600, d[2] * 2600]; }, { size: 6, fog: false }); g.add(s); return { update(t, e) { const m = e.userData.marker; if (m) { m.scale.setScalar(20 + 12 * Math.sin(t * 2.2)); m.material.opacity = 0.75 + 0.25 * Math.sin(t * 2.2); } } }; });

  const built = EVENTS.map((e, i) => { const s = stages[e.id]?.(); if (!s) return null; s.group.position.set(0, 0, -i * STAGE_GAP); scene.add(s.group); s.group.visible = i < 2; return s; });
  const poseAt = (i, fit) => { const s = built[i], z = -i * STAGE_GAP, look = s.pose.look.clone().add(V(0, 0, z)), pos = s.pose.pos.clone().add(V(0, 0, z)); pos.sub(look).multiplyScalar(fit).add(look); return { pos, look }; };

  // camera, flight and frame loop
  let cur = 0, tNow = 0, prevIdx = -1, from = null, to = null, flight = 1, w = 0, h = 0, raf = 0, last = 0, t0 = 0, px = 0, py = 0, fit = 1, fogK = 1, drift = 0;
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0), fogFrom = { c: C('#02040c'), n: 200, f: 1600 }, fogTo = { c: C('#02040c'), n: 200, f: 1600 }, tmpC = new THREE.Color();
  function size() { w = canvas.clientWidth || 412; h = canvas.clientHeight || 915; renderer.setSize(w, h, false); cam.aspect = w / h; fit = w / h < 1 ? Math.min(2.1, 0.92 / Math.max(0.42, w / h)) : 1; cam.setViewOffset(w, h, 0, h * 0.16, w, h); /* lift the subject into the empty space above the card */ cam.updateProjectionMatrix(); }
  function setTarget(i, instant) {
    const a = built[i]; if (!a) return; const p = poseAt(i, fit); from = { pos: camPos.clone(), look: camLook.clone(), fog: { c: fogFrom.c.clone(), n: fogFrom.n, f: fogFrom.f } }; to = p; fogTo.c.set(a.fog[0]); fogTo.n = a.fog[1]; fogTo.f = a.fog[2];
    a.since = instant ? tNow : Infinity; const prev = cur; cur = i; prevIdx = instant || prev === i ? -1 : prev; flight = instant ? 1 : 0; if (instant) { camPos.copy(p.pos); camLook.copy(p.look); fogFrom.c.copy(fogTo.c); fogFrom.n = fogTo.n; fogFrom.f = fogTo.f; }
    built.forEach((s, k) => { if (s) s.group.visible = k === i || k === prevIdx; });
  }
  function render(now) {
    const t = reduced() ? 0 : Math.max(0, now - t0) / 1000, dt = Math.min(0.6, (now - last) / 1000 || 0.016); last = now;
    if (flight < 1) { flight = Math.min(1, flight + dt / 2.4); const k = ease(flight); camPos.lerpVectors(from.pos, to.pos, k); camLook.lerpVectors(from.look, to.look, k); fogFrom.c.lerp(fogTo.c, 0.06 + 0.1 * k); fogFrom.n += (fogTo.n - fogFrom.n) * 0.08; fogFrom.f += (fogTo.f - fogFrom.f) * 0.08; if (flight >= 1) { built.forEach((s, k2) => { if (s) s.group.visible = k2 === cur; }); prevIdx = -1; if (built[cur]) built[cur].since = t; } }
    else { fogFrom.c.lerp(fogTo.c, 0.1); }
    scene.fog.color.copy(fogFrom.c); scene.fog.near = fogFrom.n; scene.fog.far = fogFrom.f; scene.background.copy(fogFrom.c);
    const wob = reduced() ? 0 : 1; cam.position.set(camPos.x + (Math.sin(t * 0.13) * 14 + px * 26) * wob, camPos.y + (Math.cos(t * 0.1) * 8 - py * 16) * wob, camPos.z - drift * wob); cam.lookAt(camLook);
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
