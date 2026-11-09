export const CHECKED = '9 November 2026';
export const NASA = {
 earth:'https://science.nasa.gov/earth/facts/',moon:'https://science.nasa.gov/moon/facts/',
 phases:'https://science.nasa.gov/moon/moon-phases/',
 earthfact:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
 moonfact:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
 marsfact:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
};
export const INSIGHTS = {
 Earth: {
  question:'Why do seasons happen?', experiment:'seasons', line:'lab_earth',
  intro:'A blue home with a tilted axis. One side faces daylight; the other turns into night.',
  features:[['overview','Our home'],['day','Day & night'],['moon','Visit the Moon']],
  deeper:'Earth’s axis is tilted about 23.4° from the perpendicular to its orbital plane. As Earth goes around the Sun, the axis keeps nearly the same direction in space. A hemisphere tilted toward the Sun gets higher midday sunlight and longer days. Summer in the north coincides with winter in the south: distance from the Sun cannot explain that opposition.',
  source:'earth',
 },
 Moon: {
  question:'Explore the phases', experiment:'phases', line:'lab_moon',
  intro:'One rocky companion, many changing shapes. The Moon reflects sunlight; it does not make its own.',
  features:[['overview','Rocky surface'],['phases','Phases from Earth']],
  deeper:'The Sun normally lights half the Moon. The fraction of that sunlit half visible from Earth changes as the Moon orbits. A phase cycle takes about 29.5 days; a trip around Earth relative to distant stars takes about 27.3 days. Earth moves around the Sun too, so the Moon needs extra time to line up with the Sun again. The far side also has day and night.',
  source:'phases',
 },
};
export function genericInsight(body) {
 const {name,rot,period}=body;
 return {intro:body.blurb,question:name==='Sun'?'See the Solar System':'See its place in the Solar System',experiment:null,line:null,
  features:name==='Sun'?[['overview','Our star'],['orbit','Solar System']]:[['overview','Look closer'],['orbit','Its orbit']],
  deeper:name==='Sun'?'The Sun is a star, not a planet. Its visible surface rotates at different rates at different latitudes. The time in the fact card is a representative rotation, not a solid-body day.':`One spin on ${name} takes about ${Math.abs(rot).toLocaleString('en-IN')} Earth hours. Its trip around the Sun takes about ${period.toLocaleString('en-IN')} Earth days. Spin and orbit are different motions; a sunrise-to-sunrise solar day can differ from a rotation measured against distant stars.`,
  source:null};
}
