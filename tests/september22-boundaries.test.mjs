import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';
import {honorBanner} from '../honor-visual.mjs';
import {firstFollowPopup} from '../follow-visual.mjs';
const add=(s,type,extra={})=>M.receive(s,{type,object:['honor','growth_star','follow'].includes(type)?M.OBJECTS.self:['admission','follow_build'].includes(type)?M.OBJECTS.bridge:M.OBJECTS.wheel,actor:{id:'u'+s.seq,name:'用户'+s.seq},...extra});
const bg=()=>Object.assign(M.createState(),{mode:'background'});
const build=(s,id)=>add(s,'follow_build',{actor:{id,name:id},work:{id:'work-'+id,name:id+'的作品'}});

test('ordinary interactions never send solely on time, foreground exit or notification re-enable',()=>{
 for(const transition of ['minute','round','background','permission']){
  const s=bg();if(transition==='minute')s.lastPush=s.now;if(transition==='round')s.ordinaryRound={start:s.now,used:2};if(transition==='background')s.mode='foreground';if(transition==='permission')s.notifications=false;
  add(s,'like');M.advance(s,transition==='round'?2*M.HOUR:M.MINUTE);s.mode='background';s.notifications=true;M.flushQueue(s);assert.equal(s.pushes.length,0,transition);
 }
});
test('new event includes unnotified same-message people, not an older message or unrelated type',()=>{
 const s=bg();s.lastPush=s.now;const a=add(s,'follow',{actor:{id:'a',name:'小明'}});add(s,'praise');M.advance(s,M.MINUTE);
 const b=add(s,'follow',{actor:{id:'b',name:'小红'}});assert.equal(a.id,b.id);assert.match(s.pushes[0].title,/小红等2位/);assert.equal(s.pushes[0].eventIds.length,2);
 assert.ok(s.events.find(e=>e.type==='praise').handled===false);
});
test('sent fan message closes aggregation permanently and fixed destination cannot read later fans',()=>{
 const s=bg(),first=add(s,'follow',{actor:{id:'a',name:'小明'}}),p=s.pushes[0],next=add(s,'follow',{actor:{id:'b',name:'小红'}});
 assert.notEqual(first.id,next.id);assert.equal(M.pushDestination(s,p).actor.id,'a');M.openNotification(s,p.messageId);assert.equal(M.unread(next),true);
 assert.deepEqual(first.events,p.eventIds);assert.equal(s.pushes.length,1);
});
test('a sent multi-fan message cannot accept more users, but other interactions still can',()=>{
 const s=M.createState();const m=add(s,'follow');s.mode='background';add(s,'follow');const p=s.pushes[0];assert.equal(p.eventIds.length,2);
 const next=add(s,'follow');assert.notEqual(next.id,m.id);assert.equal(M.pushDestination(s,p).kind,'message');M.openNotification(s,m.id);assert.equal(M.unread(next),true);
 const t=bg(),like=add(t,'like');assert.equal(add(t,'like').id,like.id);
});
test('ordinary officials and rejections automatically retry after limits and background/permission restore',()=>{
 for(const type of ['activity','review'])for(const gate of ['interval','count','foreground','permission']){
  const s=bg();if(gate==='interval')s.lastPush=s.now;if(gate==='count')s.ordinaryRound={start:s.now,used:2};if(gate==='foreground')s.mode='foreground';if(gate==='permission')s.notifications=false;
  const m=add(s,type,{push:true});assert.equal(s.pushes.length,0);s.mode='background';s.notifications=true;M.advance(s,gate==='count'?2*M.HOUR:M.MINUTE);assert.equal(s.pushes.length,1);assert.equal(s.pushes[0].messageId,m.id);
 }
});
test('successful resubmission stops previous rejection only; another rejection can notify',()=>{
 const s=M.createState(),old=add(s,'review'),other=add(s,'review',{object:M.OBJECTS.rocket});M.resubmit(s,M.OBJECTS.wheel.id);s.mode='background';M.flushQueue(s);
 assert.equal(s.pushes.length,1);assert.equal(s.pushes[0].messageId,other.id);assert.equal(M.unread(old),true);
 const fresh=add(s,'review');M.advance(s,M.MINUTE);assert.equal(s.pushes.at(-1).messageId,fresh.id);
});
test('read-all, popup close, actual reading and delete each stop pending Push without resetting count',()=>{
 for(const action of ['readAll','closePopup','view','remove'])for(const type of ['honor','follow_build']){
  const s=M.createState();s.ordinaryRound={start:s.now,used:1};const m=type==='follow_build'?build(s,'first'):add(s,type,{push:true,popup:true});
  if(action==='readAll')M.readAll(s,'all');else M[action](s,m.id);s.mode='background';M.advance(s,M.MINUTE);
  assert.equal(s.pushes.length,0,action+type);assert.equal(M.round(s).used,1);assert.equal(M.homePopup(s,{device:'B'}),null);
  if(action==='closePopup')assert.equal(M.unread(m),true);
 }
});
test('official popup: showing stops its pending Push, and a one-shot notice never shows again',()=>{
 for(const action of ['readAll','view','remove']){
  const s=M.createState();s.ordinaryRound={start:s.now,used:1};const m=add(s,'activity',{push:true,popup:true});
  if(action==='readAll')M.readAll(s,'all');else M[action](s,m.id);s.mode='background';M.advance(s,M.MINUTE);
  assert.equal(s.pushes.length,0,action);assert.equal(M.round(s).used,1);assert.equal(M.homePopup(s,{device:'B'}),null);
 }
 const s=M.createState(),launch={device:'A'},m=add(s,'activity',{push:true,popup:true});
 assert.equal(M.homePopup(s,launch).id,m.id);
 assert.equal(m.popupState,'shown');
 assert.equal(M.homePopup(s,launch),null);
 assert.equal(s.queue.length,0);
 M.suspendPopup(s,launch);
 assert.equal(M.homePopup(s,{device:'B'}),null);
 assert.equal(M.unread(m),true);
});
test('personal spacing is independent and Push click cannot reset either interval',()=>{
 const s=bg();add(s,'honor');add(s,'like');add(s,'growth_star');const first=build(s,'first');assert.equal(s.pushes.length,2);
 M.clickPush(s,s.pushes[0].id);s.mode='background';M.advance(s,M.MINUTE-1);assert.equal(s.pushes.length,2);M.advance(s,1);assert.equal(s.pushes.at(-1).type,'growth_star');M.advance(s,M.MINUTE);assert.equal(s.pushes.at(-1).messageId,first.id);assert.equal(M.round(s).used,0);
});
test('day waiting official and night honors share one recovery, no later sequential catch-up',()=>{
 const s=bg();s.now=Date.parse('2026-09-21T20:59:00+08:00');s.ordinaryRound={start:s.now,used:2};add(s,'activity',{push:true});M.advance(s,M.MINUTE);add(s,'honor');add(s,'growth_star');s.now+=10*M.HOUR;M.flushQueue(s);assert.deepEqual(s.pushes.map(p=>p.type),['activity']);M.advance(s,3*M.HOUR);assert.equal(s.pushes.length,1);assert.equal(s.messages.filter(m=>m.popupState==='pending').length,3);
});
test('multi-day permission recovery sends one Push with all eligible people of the chosen fan message',()=>{
 const s=bg();s.notifications=false;s.now=Date.parse('2026-09-19T22:00:00+08:00');add(s,'follow');M.advance(s,M.MINUTE);add(s,'follow');M.advance(s,M.DAY);add(s,'like');s.now=Date.parse('2026-09-22T08:00:00+08:00');s.notifications=true;M.flushQueue(s);
 assert.equal(s.pushes.length,1);assert.equal(s.pushes[0].type,'follow');assert.equal(s.pushes[0].eventIds.length,2);assert.equal(M.pushDestination(s,s.pushes[0]).kind,'message');M.advance(s,4*M.HOUR);assert.equal(s.pushes.length,1);
});
test('day missed interaction alone does not become automatic catch-up after crossing midnight',()=>{
 const s=M.createState();add(s,'like');s.now=Date.parse('2026-09-11T08:00:00+08:00');s.mode='background';M.flushQueue(s);assert.equal(s.pushes.length,0);
});
test('any foreground device blocks account Push; eligible most-recent device receives only once',()=>{
 const s=bg();M.setDevice(s,'A',{mode:'foreground'});M.setDevice(s,'B',{mode:'background'});const m=add(s,'honor');assert.equal(s.pushes.length,0);
 M.advance(s,M.MINUTE);M.setDevice(s,'A',{mode:'background'});M.setDevice(s,'B',{mode:'foreground'});M.flushQueue(s);assert.equal(s.pushes.length,0);M.setDevice(s,'B',{mode:'background'});M.flushQueue(s);assert.equal(s.pushes.length,1);assert.equal(s.pushes[0].deviceId,'B');assert.equal(s.pushes[0].messageId,m.id);M.flushQueue(s);assert.equal(s.pushes.length,1);
});
test('signed-out or permission-disabled device is never selected, no logged-in devices means no Push',()=>{
 const s=bg();M.setDevice(s,'A',{mode:'background',loggedIn:false});M.setDevice(s,'B',{mode:'background',notifications:false});add(s,'honor');assert.equal(s.pushes.length,0);M.setDevice(s,'B',{notifications:true});M.flushQueue(s);assert.equal(s.pushes[0].deviceId,'B');
});
test('two consecutive personal closes pause; foreground return does not reset; in-app reentry does',()=>{
 const s=M.createState(),launch={device:'A'};add(s,'activity',{popup:true});add(s,'honor');add(s,'growth_star');add(s,'selected');build(s,'first');
 let m=M.homePopup(s,launch);assert.equal(m.type,'activity');M.closePopup(s,m.id,launch);assert.equal(launch.personalCloses,undefined);
 for(let i=0;i<2;i++){m=M.homePopup(s,launch);M.closePopup(s,m.id,launch);}assert.equal(M.homePopup(s,launch),null);
 M.suspendPopup(s,launch);assert.equal(M.homePopup(s,launch),null);assert.equal(s.messages.filter(m=>m.popupPersistent&&m.popupState==='pending').length,2);
 M.enterHome(launch);assert.equal(M.homePopup(s,launch).type,'selected');
});
test('a personal result ends its reminder once shown; other devices, relaunch and cleanup never revive it',()=>{
 const s=M.createState(),m=add(s,'honor'),a={device:'A'},b={device:'B'};
 assert.equal(M.homePopup(s,a).id,m.id);
 assert.equal(m.popupState,'shown');
 assert.equal(M.homePopup(s,b),null);
 M.suspendPopup(s,a);
 assert.equal(M.homePopup(s,b),null);
 assert.equal(M.homePopup(s,a),null);
 assert.equal(M.unread(m),true);
 M.advance(s,100*M.DAY);
 assert.equal(M.homePopup(JSON.parse(JSON.stringify(s)),{device:'C'}),null);
});
test('direct visits do not read; failed notification navigation preserves state; unavailable explanation reads',()=>{
 const s=M.createState(),m=add(s,'honor');M.openNotification(s,m.id,{source:'direct'});assert.equal(M.unread(m),true);M.openNotification(s,m.id,{success:false});assert.equal(M.unread(m),true);assert.equal(m.popupState,'pending');M.invalidateTarget(s,m.id);assert.equal(M.openNotification(s,m.id).status,'unavailable');assert.equal(M.unread(m),false);
});
test('cleared history can open original target without recreating messages or badge',()=>{
 const s=M.createState(),m=add(s,'growth_star');M.advance(s,100*M.DAY);const count=s.messages.length;assert.equal(M.homePopup(s,{}).id,m.id);M.openNotification(s,m.id);assert.equal(s.messages.length,count);assert.equal(M.stats(s).unread,0);assert.equal(M.homePopup(s,{}),null);
});
test('target recovery never revives stopped personal Push or celebration',()=>{
 const s=M.createState(),m=add(s,'honor');M.invalidateTarget(s,m.id);m.targetAvailable=true;s.mode='background';M.flushQueue(s);assert.equal(s.pushes.length,0);assert.equal(M.homePopup(s,{}),null);
});
test('first follow invalidation never swaps work; partial ordinary work invalidation preserves valid feedback',()=>{
 const s=M.createState(),first=build(s,'first');M.invalidateFeedback(s,first.events[0]);build(s,'second');const ordinary=build(s,'third');M.invalidateFeedback(s,ordinary.events[0]);s.mode='background';build(s,'fourth');const p=s.pushes[0];assert.equal(p.specialPush,null);assert.ok(p.eventIds.every(id=>!s.events.find(e=>e.id===id).invalidated));assert.equal(p.eventIds.length,2);assert.equal(M.homePopup(s,{}),null);
});
test('new official defaults to station only; explicit opt-in permits either channel independently',()=>{
 const s=bg(),m=add(s,'activity');assert.equal(s.pushes.length,0);assert.equal(m.popup,false);assert.equal(M.list(s).length,1);add(s,'collection',{push:true});assert.equal(s.pushes.length,1);const pop=add(s,'marketing',{popup:true});assert.equal(M.homePopup(s,{}).id,pop.id);
});
test('historical growth period is stable in title, body, banner and destination',()=>{
 const s=M.createState(),m=add(s,'growth_star',{awardPeriod:'2025-12'});M.advance(s,100*M.DAY);assert.match(M.title(s,m),/2025年12月/);assert.match(honorBanner(m),/2025 · 12/);assert.match(M.target(m),/2025-12/);assert.doesNotMatch(M.body(s,m)+honorBanner(m),/本月/);
});
test('first-follow popup has avatar plus nickname and no later button',()=>{
 const s=M.createState(),m=build(s,'小宇'),html=firstFollowPopup(m,M.details(s,m)[0]);assert.match(html,/follow-avatar/);assert.match(html,/小宇/);assert.doesNotMatch(html,/稍后看/);assert.equal((html.match(/<button/g)||[]).length,2);
});
