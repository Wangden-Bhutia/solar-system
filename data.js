// Facts checked 2026-11-08 against NASA NSSDCA fact sheets and NASA Science moon pages; see docs/sources.md.
// size/dist are stylised scene units, NOT to scale.
export const SUN = { name:'Sun', color:0xffcc55, size:4,
  blurb:'Our star, a G2 V main-sequence star. About 1.3 million Earths would fit inside it.', rot:609.12,
  facts:[['Diameter','1,391,400 km'],['Rotation','25.4 days (at 16\u00b0 latitude)'],['Surface temp.','~5,500 \u00b0C (5,772 K)']] };
export const PLANETS = [
 {name:'Mercury',color:0xa8a29a,size:.45,dist:8,period:87.97,rot:1407.6,tilt:0.03,
  blurb:'Smallest planet and closest to the Sun.',facts:[['Diameter','4,881 km'],['Distance from Sun','0.39 AU'],['Orbital period','88 days'],['Day length','176 Earth days (one spin: 58.6 days)'],['Moons','0']]},
 {name:'Venus',color:0xe8c58a,size:.8,dist:11,period:224.7,rot:-5832.5,tilt:177.4,
  blurb:'Hottest planet, wrapped in thick CO\u2082 clouds; spins backwards.',facts:[['Diameter','12,104 km'],['Distance from Sun','0.72 AU'],['Orbital period','224.7 days'],['Day length','117 Earth days (spins backwards; one spin: 243 days)'],['Moons','0']]},
 {name:'Earth',color:0x3f7fe0,size:.85,dist:14.5,period:365.26,rot:23.93,tilt:23.4,moon:true,
  blurb:'The only world known to host life.',facts:[['Diameter','12,756 km'],['Distance from Sun','1.00 AU'],['Orbital period','365.26 days'],['Day length','24 hours'],['Moons','1']]},
 {name:'Mars',color:0xc1502e,size:.6,dist:18,period:686.98,rot:24.62,tilt:25.2,
  blurb:'The cold, dusty red planet with the tallest volcano known.',facts:[['Diameter','6,792 km'],['Distance from Sun','1.52 AU'],['Orbital period','687 days'],['Day length','24.7 hours'],['Moons','2']]},
 {name:'Jupiter',color:0xd8b48a,size:2.2,dist:26,period:4332.59,rot:9.93,tilt:3.1,bands:true,
  blurb:'Gas giant more than twice as massive as all other planets combined.',facts:[['Diameter','142,984 km'],['Distance from Sun','5.20 AU'],['Orbital period','11.86 years'],['Day length','9.9 hours'],['Moons','115 (NASA, 2026)']]},
 {name:'Saturn',color:0xe3cf9a,size:1.9,dist:35,period:10755.70,rot:10.7,tilt:26.7,rings:true,bands:true,
  blurb:'Gas giant famous for its bright ring system of ice and rock.',facts:[['Diameter','120,536 km'],['Distance from Sun','9.57 AU'],['Orbital period','29.4 years'],['Day length','10.7 hours'],['Moons','293 (NASA, Aug 2026)']]},
 {name:'Uranus',color:0x9fd9e3,size:1.3,dist:43,period:30685.4,rot:-17.2,tilt:97.8,
  blurb:'Ice giant tipped on its side, rolling around the Sun.',facts:[['Diameter','51,118 km'],['Distance from Sun','19.2 AU'],['Orbital period','84 years'],['Day length','17.2 hours (retrograde)'],['Moons','28']]},
 {name:'Neptune',color:0x4166d8,size:1.25,dist:50,period:60189.0,rot:16.1,tilt:28.3,
  blurb:'Windiest planet; the farthest from the Sun.',facts:[['Diameter','49,528 km'],['Distance from Sun','30.18 AU'],['Orbital period','164.8 years'],['Day length','16.1 hours'],['Moons','16']]},
];
export const MOON = {name:'Moon',size:.25,dist:1.7,period:27.32};
