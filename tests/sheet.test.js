import test from 'node:test';import assert from 'node:assert/strict';
import {swipe,emptyTap,openHeight,classifyDrag,visibleRegion,SHEETS} from '../sheet.js';
const explore=sheet=>({view:'explore',experiment:null,sheet});
test('explore card: swipe up peek→half→full, down full→half→peek→closed; clamps at both ends',()=>{
 assert.deepEqual(SHEETS,['closed','peek','half','full']);
 assert.deepEqual(swipe(explore('closed'),'up'),{sheet:'peek'});assert.deepEqual(swipe(explore('peek'),'up'),{sheet:'half'});
 assert.deepEqual(swipe(explore('half'),'up'),{sheet:'full'});assert.deepEqual(swipe(explore('full'),'up'),{sheet:'full'});
 assert.deepEqual(swipe(explore('full'),'down'),{sheet:'half'});assert.deepEqual(swipe(explore('half'),'down'),{sheet:'peek'});
 assert.deepEqual(swipe(explore('peek'),'down'),{sheet:'closed'});assert.deepEqual(swipe(explore('closed'),'down'),{sheet:'closed'});
 assert.throws(()=>swipe(explore('peek'),'left'));
});
test('labs and comparisons open half-way and never collapse over the scene controls',()=>{
 assert.equal(openHeight({view:'explore'}),'peek');assert.equal(openHeight({view:'try',experiment:'seasons'}),'half');assert.equal(openHeight({view:'compare'}),'half');
 const lab={view:'try',experiment:'phases',sheet:'full'};
 assert.deepEqual(swipe(lab,'down'),{sheet:'half'});
 assert.deepEqual(swipe({...lab,sheet:'half'},'down'),{view:'explore',experiment:null,sheet:'peek'});
 assert.deepEqual(swipe({view:'compare',experiment:null,sheet:'half'},'down'),{view:'explore',experiment:null,sheet:'peek'});
});
test('empty-space tap closes a world card but not a running experiment',()=>{
 for(const s of ['peek','half','full'])assert.deepEqual(emptyTap(explore(s)),{sheet:'closed'});
 assert.deepEqual(emptyTap({view:'compare',sheet:'half'}),{sheet:'closed'});
 assert.equal(emptyTap({view:'try',experiment:'seasons',sheet:'half'}),null);
});
test('drag classification ignores small jitters; long or quick flicks count',()=>{
 assert.equal(classifyDrag(5),null);assert.equal(classifyDrag(-30,400),null);
 assert.equal(classifyDrag(-60),'up');assert.equal(classifyDrag(60),'down');assert.equal(classifyDrag(-22,120),'up');
});
test('visible scene region: bottom sheet in portrait, right dock in landscape, centred sheet on tablets',()=>{
 assert.deepEqual(visibleRegion(390,844,null),{width:390,height:844});
 assert.deepEqual(visibleRegion(390,844,{left:0,top:420,width:390,height:424}),{width:390,height:420});
 assert.deepEqual(visibleRegion(390,844,{left:0,top:844,width:390,height:0}),{width:390,height:844});
 assert.deepEqual(visibleRegion(844,390,{left:444,top:0,width:400,height:390}),{width:444,height:390});
 assert.deepEqual(visibleRegion(1024,768,{left:192,top:500,width:640,height:268}),{width:1024,height:500});
 assert.deepEqual(visibleRegion(320,568,{left:0,top:40,width:320,height:528}),{width:320,height:140});
});
