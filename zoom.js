// The single zoom controller for every scale (pure; no DOM, no THREE). It holds Z = ln(camera distance in
// light-years) — see zoom-ladder.js — and moves it with the same gain for the wheel and for a pinch, with
// momentum: wheel notches are eased in (exponential approach), and a pinch carries on briefly after the
// fingers lift (velocity decaying exponentially). Every scene's OrbitControls has enableZoom = false
// (rotation only); lab.js feeds gestures here and places each scene's camera from Z.
//
// Gains are the ones the scenes' own OrbitControls used (vendor/OrbitControls.js, zoomSpeed 1.8):
//  - wheel: radius × 0.95^(zoomSpeed × |deltaY| × 0.01) per event → ln step = zoomSpeed × 0.01 × ln(1/0.95)
//    per pixel of deltaY (≈ 0.0923 per 100 px), with OrbitControls' deltaMode and ctrl-key (trackpad pinch)
//    scaling;
//  - pinch: radius × (start/end)^zoomSpeed → ΔZ = −zoomSpeed × ln(end/start).
export const ZOOM_SPEED = 1.8;
export const WHEEL_GAIN = ZOOM_SPEED * 0.01 * Math.log(1 / 0.95);
export const PINCH_GAIN = ZOOM_SPEED;
export function wheelPixels(deltaY, deltaMode = 0, ctrlKey = false) {
  let d = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 100 : 1);
  if (ctrlKey) d *= 10;
  return d;
}
export const wheelZ = (deltaY, deltaMode = 0, ctrlKey = false) => WHEEL_GAIN * wheelPixels(deltaY, deltaMode, ctrlKey);
export const pinchZ = ratio => ratio > 0 && Number.isFinite(ratio) ? -PINCH_GAIN * Math.log(ratio) : 0;

// tau: wheel easing time constant (s). inertiaTau: decay of pinch momentum (s). maxStep: the most Z may move
// in one frame (every seam and every scene's own range is wider, so a frame can never skip one).
export function createZoomController({ tau = 0.09, inertiaTau = 0.3, maxStep = 0.6, maxSpeed = 8, reduced = () => false } = {}) {
  let Z = 0, pending = 0, held = 0, v = 0, est = 0, lastAt = -Infinity;
  const api = {
    get z() { return Z; },
    get velocity() { return v; },
    get pending() { return pending; },
    get moving() { return pending !== 0 || held !== 0 || v !== 0; },
    // Re-synchronise with a camera that moved on its own (a glide, a focus flight): drops any momentum.
    set(z) { Z = z; pending = 0; held = 0; v = 0; est = 0; },
    stop() { pending = 0; held = 0; v = 0; est = 0; },
    // A wheel step: eased in over a few frames, the full amount always arrives.
    nudge(dz) { if (Number.isFinite(dz)) { pending += dz; v = 0; } },
    // A pinch move: applied at once (direct manipulation); its speed is tracked for the release.
    drag(dz, now) {
      if (!Number.isFinite(dz)) return;
      held += dz; v = 0;
      const dt = Math.max(1 / 240, Math.min(0.1, (now - lastAt) / 1000));
      const inst = dz / dt, a = lastAt === -Infinity ? 1 : 1 - Math.exp(-dt / 0.05);
      est += (inst - est) * a; lastAt = now;
    },
    // Fingers lifted: keep the recent speed and let it decay, unless the fingers had already stopped.
    release(now) {
      const fresh = now - lastAt < 80;
      v = reduced() || !fresh ? 0 : Math.max(-maxSpeed, Math.min(maxSpeed, est));
      est = 0; lastAt = -Infinity;
    },
    // Advance one frame. instant: apply everything now (no animation frames, or reduced motion).
    step(dt, { min = -Infinity, max = Infinity, instant = false } = {}) {
      const before = Z; let move;
      if (instant || reduced()) { move = pending + held; pending = 0; held = 0; v = 0; }
      else {
        move = pending * (1 - Math.exp(-dt / tau));
        if (Math.abs(pending - move) < 1e-4) move = pending;
        pending -= move; move += held + v * dt; held = 0; v *= Math.exp(-dt / inertiaTau); if (Math.abs(v) < 0.02) v = 0;
      }
      if (move > maxStep) { pending += move - maxStep; move = maxStep; } else if (move < -maxStep) { pending += move + maxStep; move = -maxStep; }
      Z += move;
      let hitMin = false, hitMax = false;
      // A bound stops the zoom there (and drops momentum into it). If the camera is already outside a bound
      // (the bound just moved), it may move back towards it but not further away.
      if (Z < min) { Z = before < min ? Math.max(Z, before) : min; hitMin = true; if (pending < 0) pending = 0; if (v < 0) v = 0; }
      if (Z > max) { Z = before > max ? Math.min(Z, before) : max; hitMax = true; if (pending > 0) pending = 0; if (v > 0) v = 0; }
      return { z: Z, dz: Z - before, hitMin, hitMax };
    },
  };
  return api;
}
