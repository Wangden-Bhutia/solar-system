import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../cosmos-data.js';

test('cosmology (flat ΛCDM, Planck 2018): age 13.79 Gyr; MoM-z14 at 33.8 Gly, light 13.5 Gyr old; CMB at ~45–46 Gly', () => {
  assert.ok(Math.abs(C.AGE - 13.787) < 0.03, String(C.AGE));
  assert.ok(Math.abs(C.distanceNow(14.44) - 33.8) < 0.3 && Math.abs(C.lookback(14.44) - 13.53) < 0.1);
  assert.ok(C.CMB_GLY > 44.8 && C.CMB_GLY < 46.5, String(C.CMB_GLY));
  assert.ok(Math.abs(C.distanceNow(0.01) - 0.01 * 299792.458 / C.COSMO.H0 * 3.26156 / 1000) < 0.002, 'nearby: Hubble law');
});
test('look-back shells grow outward and stay inside the edge', () => {
  let prev = 0; for (const s of C.SHELLS) { assert.ok(s.gly > prev && s.gly < C.CMB_GLY); assert.ok(Math.abs(C.lookback(C.redshiftForLookback(s.gyr)) - s.gyr) < 1e-3); prev = s.gly; }
});
test('NGC galaxies unpack: 9,696, all beyond the Local Group and within a few billion ly; clusters sit where their galaxies crowd', () => {
  const g = C.ngcGalaxies(1);
  assert.equal(g.count, 9696);
  for (let i = 0; i < g.count; i += 37) { const d = Math.hypot(g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]); assert.ok(d > 12 && d < 6600, String(d)); assert.ok(Math.abs(d - g.dist[i]) < 0.2); }
  for (const name of ['Virgo Cluster', 'Coma Cluster', 'Perseus Cluster']) {
    const c = C.CLUSTERS.find(x => x.name === name), p = C.skyPosition(c.ra, c.dec, c.mly, 1), r = c.mly * 0.12;
    let n = 0; for (let i = 0; i < g.count; i++) if (Math.hypot(g.pos[i * 3] - p[0], g.pos[i * 3 + 1] - p[1], g.pos[i * 3 + 2] - p[2]) < r) n++;
    assert.ok(n >= 25, `${name}: ${n} NGC galaxies nearby`);
  }
});
