import test from 'node:test';import assert from 'node:assert/strict';import {createLabState} from '../lab-state.js';
test('explore / experiment / compare / Back restore selected world and experiment values',()=>{
 const s=createLabState();assert.equal(s.value.world,'Earth');assert.equal(s.canBack,false);
 s.navigate({world:'Moon'});s.navigate({view:'try',experiment:'phases'});s.update({phase:180});
 s.navigate({view:'compare',experiment:null});s.update({mass:50,compareA:'Mars'});
 s.back();assert.equal(s.value.experiment,'phases');assert.equal(s.value.phase,180);s.reset();assert.equal(s.value.phase,90);
 s.back();assert.equal(s.value.world,'Moon');assert.equal(s.value.view,'explore');s.back();assert.equal(s.value.world,'Earth');assert.equal(s.canBack,false);
});
test('Reset returns experiment controls to known reproducible values, without changing mode',()=>{
 const s=createLabState();s.navigate({view:'try',experiment:'seasons'});s.update({tilt:0,orbit:180,latitude:-40});s.reset();
 assert.deepEqual([s.value.view,s.value.experiment,s.value.orbit,s.value.tilt,s.value.latitude],['try','seasons',0,23.44,40]);
 const snapshot=s.value;snapshot.world='Sun';assert.equal(s.value.world,'Earth');
});
