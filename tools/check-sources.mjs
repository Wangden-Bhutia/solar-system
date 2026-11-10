// Link check for the Sources screen: fetches every source URL the app cites (sources.js REFS that a claim uses)
// and, for the sources added or re-checked in November 2026, looks for the words that back the claim.
// Usage: node tools/check-sources.mjs [--json]   (needs network; some hosts block scripted fetches: see the report)
import { REFS, usedRefs } from '../sources.js';

// ref key → phrases (regular expressions, case-insensitive) that must appear in the page text.
export const EVIDENCE = {
  nasaMercury: ['smallest planet', '88 Earth days'], nasaVenus: ['hottest planet', 'carbon dioxide', 'opposite direction'],
  nasaEarth: ['only place we know of inhabited', 'tilted 23\\.4 degrees', 'one moon'], nasaMoon: ['only natural satellite', 'only see one side', 'crater'],
  nasaMars: ['iron minerals .{0,40}rust', 'largest volcano', 'dusty, cold'], nasaJupiter: ['more than twice the combined'],
  nasaSaturn: ['chunks of ice and rock'], nasaUranus: ['97\\.77 degrees'], nasaNeptune: ['windiest', '165-year orbit', 'most distant planet'],
  nasaSun: ['rotates at different speeds'], nasaPhases: ['reflected sunlight', 'half-lit'], nasaTidalLocking: ['large moons are tidally locked'],
  nasaJupiterMoons: ['more than 100 moons'], nasaSaturnMoons: ['293 confirmed moons'], nasaUranusMoons: ['29 officially recognized moons'],
  nasaNeptuneMoons: ['16 officially recognized moons'], nasaPlutoMoons: ['five moons'],
  nasaPhobos: ['three times a day'], nasaDeimos: ['15 by 12 by 11 kilometers'], nasaIo: ['most volcanically active'], nasaEuropa: ['twice as much water'],
  nasaGanymede: ['largest moon in the solar system'], nasaCallisto: ['most heavily cratered'], nasaMimas: ['one third of the diameter'],
  nasaEnceladus: ['jets', 'south pol', 'global ocean'], nasaTethys: ['almost entirely of water ice'], nasaDione: ['bright canyon ice walls'],
  nasaRhea: ['second largest moon of Saturn', 'ice and rock'], nasaTitan: ['lakes and seas of liquid hydrocarbons like methane and ethane', 'thick atmosphere|substantial atmosphere'],
  nasaIapetus: ['dark as coal'], nasaMiranda: ['12 times as deep as the Grand Canyon'], nasaAriel: ['brightest surface of the five largest'],
  nasaUmbriel: ['darkest of Uranus'], nasaTitania: ['largest moon'], nasaOberon: ['heavily cratered'], nasaTriton: ['retrograde'],
  nasaCharon: ['half the size of Pluto'], nhPlutoOrbit: ['common center of mass which lies between them', 'twice for every three orbits of Neptune'],
  nasaCeres: ['largest object in the asteroid belt', 'only dwarf planet in the inner solar system'], vestaTrek: ['brightest of the asteroids', 'unaided eye'],
  nasaPlutoHeart: ['solid nitrogen ice', '“heart”|"heart"|heart'], nasaHaumea: ['one rotation every 4 hours', 'football'],
  nasaMakemake: ['frozen methane and ethane', 'reddish-brownish'], nasaEris: ['557 Earth years', 'about the same size as Pluto'],
  nasaAsteroidFacts: ['1\\.1 and 1\\.9 million asteroids', 'less than that of Earth.s Moon'], gsfcAsteroids: ['mostly empty space'], nasaKuiper: ['leftovers'],
  noaaTideCause: ['about half that of the moon'], noaaLunarDay: ['two high and two low tides every 24 hours and 50 minutes'], noaaSpringNeap: ['spring tides', 'neap tides'],
  noaaTideTypes: ['diurnal'], noaaHighestTide: ['Bay of Fundy'], canEncFundy: ['16\\.1 m'], ifabBall: ['68 cm'], nasaMarsRelay: ['54\\.6 million kilometers', '22\\.4 minutes'],
  nhmDinosaurs: ['230 million years ago'], nhmExtinction: ['66 million years ago'], siHomo: ['2\\.75 to 2\\.80 million years'], nasaM31: ['2\\.5 million light-years'], uwaAndromeda: ['50'],
};
const text = h => h.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&#8217;|&rsquo;/g, '’').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const UA = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' };
async function check(key) {
  const { url } = REFS[key];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      const body = EVIDENCE[key] ? text(await r.text()) : '';
      const missing = (EVIDENCE[key] || []).filter(p => !new RegExp(p, 'i').test(body));
      if (r.status >= 500 && attempt === 0) { await new Promise(res => setTimeout(res, 3000)); continue; }
      return { key, url, status: r.status, final: r.url, missing };
    } catch (e) { if (attempt) return { key, url, status: 0, error: String(e.cause?.code || e.name), missing: EVIDENCE[key] || [] }; }
  }
}
const keys = usedRefs(), out = [];
for (let i = 0; i < keys.length; i += 6) out.push(...await Promise.all(keys.slice(i, i + 6).map(check)));
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else for (const r of out) console.log(`${r.status === 200 && !r.missing.length ? 'ok ' : 'CHECK'} ${r.status} ${r.key} ${r.url}${r.final && r.final !== r.url ? ` → ${r.final}` : ''}${r.error ? ` (${r.error})` : ''}${r.missing.length ? ` missing: ${r.missing.join(' | ')}` : ''}`);
