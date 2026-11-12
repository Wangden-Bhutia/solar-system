import test from 'node:test';import assert from 'node:assert/strict';
import {seasonGeometry,daylightHours,noonAltitude,phaseGeometry,phaseName,weightNewtons,NEARBY} from '../science.js';
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
test('fixed 23.44° axis, declination and opposite hemispheres across the orbit',()=>{
 const north=seasonGeometry(0).north;
 for(const a of [0,90,180,270,360])assert.deepEqual(seasonGeometry(a).north,north);
 near(seasonGeometry(0).declination,23.44);near(seasonGeometry(90).declination,0);near(seasonGeometry(180).declination,-23.44);
 for(let a=0;a<=360;a+=5){const g=seasonGeometry(a);near(dot(g.north,g.sun),Math.sin(g.declination*Math.PI/180));near(daylightHours(40,g.declination)+daylightHours(-40,g.declination),24);}
 assert.ok(daylightHours(40,23.44)>14.8);assert.ok(daylightHours(40,-23.44)<9.2);
 near(noonAltitude(40,23.44),73.44);near(noonAltitude(-40,-23.44),73.44);
});
test('zero tilt removes seasonal daylight variation; equator and polar boundaries',()=>{
 for(let a=0;a<360;a+=10)for(const lat of [-90,-60,0,40,90])near(daylightHours(lat,seasonGeometry(a,0).declination),12);
 near(daylightHours(0,23.44),12);near(daylightHours(90,23.44),24);near(daylightHours(90,-23.44),0);
 assert.throws(()=>daylightHours(91,0));
});
test('Moon fraction and observer direction agree for full cycle',()=>{
 for(let a=-360;a<720;a+=5){const g=phaseGeometry(a);near(g.illuminated,(1+dot(g.observerFromMoon,g.sun))/2);near(dot(g.observerFromMoon,g.moonFromEarth),-1);assert.ok(g.illuminated>=0&&g.illuminated<=1);}
 for(const [angle,fraction,name] of [[0,0,'New Moon'],[90,.5,'First quarter'],[180,1,'Full Moon'],[270,.5,'Last quarter'],[360,0,'New Moon']]){near(phaseGeometry(angle).illuminated,fraction);assert.equal(phaseName(angle),name);}
 assert.equal(phaseName(45),'Waxing crescent');assert.equal(phaseName(315),'Waning crescent');
});
test('mass is invariant; force and diameters use explicit NASA units',()=>{
 near(weightNewtons(30,NEARBY.Earth.gravity),294.6);near(weightNewtons(30,NEARBY.Moon.gravity),48.6);near(weightNewtons(30,NEARBY.Mars.gravity),111.9);
 near(NEARBY.Moon.gravity/NEARBY.Earth.gravity,.165,1e-3);assert.equal(NEARBY.Moon.distance,384400);assert.match(NEARBY.Moon.distanceLabel,/Earth/);assert.match(NEARBY.Mars.distanceLabel,/Sun/);
 assert.throws(()=>weightNewtons(-1,9.8));assert.ok(NEARBY.Moon.diameter/NEARBY.Earth.diameter<.273);
});
test('Earth–Sun distance: closest about 147.1 million km around 3 January, farthest about 152.1 million km in early July',async()=>{
 const {earthSunDistance,EARTH_ORBIT}=await import('../science.js');
 const near=earthSunDistance(EARTH_ORBIT.perihelion), far=earthSunDistance(EARTH_ORBIT.perihelion+180);
 assert.ok(Math.abs(near/1e6-147.1)<0.05,`${near}`); assert.ok(Math.abs(far/1e6-152.1)<0.05,`${far}`);
 /* the orbit is nearly a circle: about 3% between nearest and farthest */
 assert.ok((far-near)/near<0.035);
 /* June solstice (orbit 0) is near the farthest point; December (180) near the closest: summer in the north is not when Earth is nearest */
 assert.ok(earthSunDistance(0)>152e6 && earthSunDistance(180)<147.2e6);
 /* the closest point falls about 13 days after the December solstice (around 3 January) */
 const days=(EARTH_ORBIT.perihelion-180)/360*365.25; assert.ok(days>10&&days<16,`${days}`);
});
