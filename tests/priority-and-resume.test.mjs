import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';
import {renderCenter} from '../center-view.mjs';

const objectFor=t=>['honor','growth_star','follow'].includes(t)?M.OBJECTS.self:['admission','follow_build','model_batch'].includes(t)?M.OBJECTS.bridge:M.OBJECTS.wheel;
const add=(s,type,extra={})=>M.receive(s,{push:true,type,object:objectFor(type),actor:{id:'user-'+s.seq,name:'小宇'},...extra});
const follow=(s,id,extra={})=>add(s,'follow_build',{id,actor:{id:'builder-'+id,name:'小宇'},work:{id:'work-'+id,name:'小宇的作品',icon:'🌁'},...extra});

test('first follow stays independent before and after read, including concurrent same-model feedback',()=>{
 const s=M.createState(),first=follow(s,'first',{silent:true}),ordinary=follow(s,'second',{silent:true});
 assert.notEqual(first.id,ordinary.id);
 assert.deepEqual(first.events,['first']);
 follow(s,'third',{silent:true});
 assert.deepEqual(ordinary.events,['second','third']);
 assert.equal(s.messages.length,2);
 assert.equal(M.title(s,first),'你的创意，第一次有人跟着拼啦！');
 M.view(s,first.id);
 follow(s,'fourth',{silent:true});
 assert.deepEqual(first.events,['first']);
 assert.equal(M.unread(first),false);
});
test('out-of-order approved batch selects earliest once and leaves other works in ordinary record',()=>{
 const s=M.createState(),at=s.now;
 M.receiveBatch(s,['late','early','middle'].map((id,i)=>({id,type:'follow_build',object:M.OBJECTS.bridge,actor:{id,name:id},work:{id:'work-'+id},at:at+[2,0,1][i]})));
 const first=M.findMessage(s,s.firstFollow.messageId);
 assert.deepEqual(first.events,['early']);
 assert.equal(s.messages.filter(m=>m.popupKind==='first_follow').length,1);
 assert.equal(s.messages.length,2);
 assert.deepEqual(s.messages.find(m=>m!==first).events,['middle','late']);
});
test('an earlier approval received before delivery replaces only the first-follow designation',()=>{
 const s=M.createState(),later=follow(s,'later',{silent:true});
 const earlier=follow(s,'earlier',{at:s.now-M.MINUTE,silent:true});
 assert.equal(s.firstFollow.messageId,earlier.id);
 assert.equal(later.popupKind,undefined);
 assert.equal(later.popup,false);
 assert.deepEqual(earlier.events,['earlier']);
});
test('same-tier honors use result time, not a fixed order between the two identities',()=>{
 for(const types of [['honor','growth_star'],['growth_star','honor']]){
  const s=M.createState();add(s,types[0]);s.now+=M.MINUTE;add(s,types[1]);s.now+=M.MINUTE;add(s,'selected');add(s,'admission');
  const launch={device:'A'},actual=[];
  for(let m;(m=M.homePopup(s,launch));){actual.push(m.type);M.closePopup(s,m.id);}
  assert.deepEqual(actual,[types[1],types[0],'selected','admission']);
 }
});
test('quiet recovery respects type before recency and sends exactly one',()=>{
 const s=M.createState(Date.parse('2026-09-18T22:00:00+08:00'));s.mode='background';
 add(s,'honor');s.now+=M.MINUTE;add(s,'selected');s.now+=M.MINUTE;add(s,'admission');follow(s,'first');
 s.now=Date.parse('2026-09-19T07:00:00+08:00');M.flushQueue(s);M.advance(s,3*M.HOUR);
 assert.deepEqual(s.pushes.map(p=>p.type),['honor']);
 assert.equal(M.round(s).used,0);
 assert.equal(s.messages.filter(m=>m.popup&&m.popupState==='pending').length,4);
});
test('official Push and popup type order override newer lower-priority content',()=>{
 const s=M.createState(),types=['activity','model_batch','collection','feature','course','marketing'];
 for(const type of types){add(s,type,{popup:true});s.now+=M.MINUTE;}
 add(s,'review');s.mode='background';M.flushQueue(s);
 const sent=[];
 while(s.queue.length){const p=s.pushes.at(-1);sent.push(p.type);M.clickPush(s,p.id);s.mode='background';M.advance(s,M.MINUTE);}
 sent.push(s.pushes.at(-1).type);
 assert.deepEqual(sent,[...types,'review']);
 for(const type of types){const launch={device:'A'},m=M.homePopup(s,launch);assert.equal(m.type,type);M.closePopup(s,m.id);assert.equal(M.homePopup(s,launch),null);}
});
test('all ordinary interaction types follow the published content-type order',()=>{
 const cases=[['follow_build','bridge'],['praise','wheel'],['praise','remix'],['follow','self'],['favorite','bridge'],['favorite','wheel'],['favorite','remix'],['like','wheel'],['like','remix'],['share','bridge'],['share','wheel'],['share','remix']];
 const events=cases.map(([type,id],i)=>({id:String(i),type,object:M.OBJECTS[id],at:i*M.MINUTE}));
 assert.deepEqual(events.toReversed().sort(M.compareNotifications).map(e=>[e.type,e.object.id]),cases);
 const comment=(kind,at)=>({id:kind,type:'expert_comment',object:{kind},at});
 assert.ok(M.compareNotifications(comment('work',0),comment('remix',M.MINUTE))<0);
});
test('new interaction sends only its own message and leaves older higher-priority feedback untouched',()=>{
 const s=M.createState();s.mode='background';add(s,'like');M.advance(s,M.MINUTE);add(s,'favorite');
 const praise=add(s,'praise');
 M.advance(s,2*M.HOUR);assert.equal(s.pushes.length,2);
 const fresh=add(s,'share');
 assert.equal(s.pushes.at(-1).messageId,fresh.id);
 assert.equal(s.pushes.at(-1).type,'share');
 assert.ok(M.details(s,praise).every(e=>!e.handled));
});
test('a displayed personal result ends its reminder while a newer result still shows',()=>{
 const s=M.createState(),launch={device:'A'},admission=add(s,'admission');
 assert.equal(M.homePopup(s,launch).id,admission.id);
 M.suspendPopup(s,launch);
 const honor=add(s,'honor');
 assert.equal(M.homePopup(s,launch).id,honor.id);
 M.view(s,honor.id);
 assert.equal(M.homePopup(s,launch),null);
 assert.equal(admission.popupState,'completed');
 assert.equal(M.unread(admission),true);
});
test('official display is consumed only when shown; background does not reset launch count',()=>{
 const s=M.createState(),launch={device:'A'};assert.equal(M.homePopup(s,launch),null);
 const official=add(s,'activity',{popup:true});assert.equal(M.homePopup(s,launch).id,official.id);
 M.suspendPopup(s,launch);
 assert.equal(M.homePopup(s,launch),null);
 assert.equal(M.homePopup(s,{device:'A'}).id,official.id);
});
test('suspending one device does not release a popup displayed by another device',()=>{
 const s=M.createState(),m=add(s,'honor');M.homePopup(s,{device:'A'});
 M.suspendPopup(s,{device:'B'});
 assert.equal(m.popupState,'shown');
 assert.equal(M.homePopup(s,{device:'B'}),null);
});
test('first-follow center uses exclusive copy and each ordinary follower has one work without an avatar',()=>{
 const s=M.createState(),first=follow(s,'first',{silent:true}),ordinary=follow(s,'next',{silent:true});follow(s,'another',{silent:true});
 const render=m=>renderCenter({state:s,category:'feedback',items:M.list(s),selected:m.id}).match(/<article[\s\S]*?<\/article>/)[0];
 assert.match(render(first),/第一次有人跟着拼啦/);
 assert.match(render(first),/>看看跟拼作品<\/button>/);
 const html=render(ordinary);
 assert.equal((html.match(/class="avatar-card"/g)||[]).length,0);
 assert.equal((html.match(/class="avatar-name"/g)||[]).length,0);
 assert.equal((html.match(/class="work-img"/g)||[]).length,2);
 assert.match(html,/class="work-name">小宇的作品/);
});
