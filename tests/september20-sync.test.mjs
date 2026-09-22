import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';
import {renderCenter} from '../center-view.mjs';

const add=(s,type,extra={})=>M.receive(s,{push:true,type,object:['honor','growth_star','follow'].includes(type)?M.OBJECTS.self:['follow_build','admission'].includes(type)?M.OBJECTS.bridge:M.OBJECTS.wheel,actor:{id:'user-'+s.seq,name:'小宇'},...extra});
const follow=(s,user,object=M.OBJECTS.bridge,extra={})=>add(s,'follow_build',{actor:{id:user,name:user},object,work:{id:'upload-'+s.seq,name:user+'的作品'},...extra});

test('bulk read covers unloaded records and all popup types, survives cleanup and another device',()=>{
 const s=M.createState();
 for(let i=0;i<55;i++)add(s,'growth_star');
 add(s,'activity',{popup:true});follow(s,'a');
 s.ordinaryRound={start:s.now,used:2};
 M.readAll(s,'all');
 assert.equal(M.stats(s).read,57);
 assert.ok(s.messages.every(m=>m.popupState==='completed'));
 assert.equal(M.round(s).used,2);
 assert.equal(M.homePopup(s,{device:'A'}),null);
 M.advance(s,100*M.DAY);
 const other=JSON.parse(JSON.stringify(s));
 assert.equal(M.homePopup(other,{device:'B'}),null);
 assert.equal(M.list(other).length,0);
});
test('bulk read only ends reminders in the selected category',()=>{
 const s=M.createState();add(s,'activity',{popup:true});add(s,'honor');const first=follow(s,'a');
 M.readAll(s,'system');
 assert.equal(first.popupState,'pending');
 assert.equal(M.homePopup(s,{}).id,first.id);
 M.readAll(s,'feedback');
 assert.equal(M.homePopup(s,{}),null);
});
test('100-day personal popup can finish without recreating a station message',()=>{
 for(const action of ['view','closePopup']){
  const s=M.createState(),m=add(s,'growth_star'),count=s.messages.length;
  M.advance(s,100*M.DAY);
  assert.equal(M.list(s).length,0);
  assert.equal(M.homePopup(s,{device:'A'}).id,m.id);
  M[action](s,m.id);
  assert.equal(s.messages.length,count);
  assert.equal(M.stats(s).unread,0);
  assert.equal(M.homePopup(JSON.parse(JSON.stringify(s)),{device:'B'}),null);
 }
});
test('official validity stops delivery but preserves the original message, badge and navigation',()=>{
 const s=M.createState(),m=add(s,'activity',{popup:true,deliveryExpiresAt:s.now+M.HOUR});
 const title=M.title(s,m),body=M.body(s,m);
 M.advance(s,M.HOUR);s.mode='background';M.flushQueue(s);
 assert.equal(s.pushes.length,0);assert.equal(M.homePopup(s,{}),null);
 assert.equal(M.list(s).length,1);assert.equal(M.stats(s).unread,1);
 assert.equal(M.title(s,m),title);assert.equal(M.body(s,m),body);
 assert.equal(M.targetValid(s,m),true);
 const html=renderCenter({state:s,category:'system',items:M.list(s),selected:m.id});
 assert.doesNotMatch(html,/已结束/);
 assert.equal(M.view(s,m.id),true);assert.equal(M.unread(m),false);
 M.advance(s,90*M.DAY-M.HOUR);assert.equal(M.list(s).length,0);
});
test('deleted target excludes badge but preserves read state and history',()=>{
 const s=M.createState(),m=add(s,'like');m.targetAvailable=false;
 assert.equal(M.unread(m),true);
 assert.deepEqual(M.stats(s),{total:1,unread:0,read:0});
 assert.equal(M.targetValid(s,m),false);
});
test('official is first in a shared pending batch, with personal sends still exempt',()=>{
 const s=M.createState();add(s,'honor');add(s,'activity',{popup:true});follow(s,'a');add(s,'review');
 s.mode='background';M.flushQueue(s);
 assert.deepEqual(s.pushes.map(p=>p.type),['activity','honor']);
 assert.equal(M.round(s).used,1);
 M.advance(s,M.MINUTE);assert.deepEqual(s.pushes.slice(-2).map(p=>p.type),['follow_build','review']);
 assert.equal(M.round(s).used,2);
});
test('exhausted ordinary count does not block a lower-ranked exempt result',()=>{
 const s=M.createState();s.mode='background';add(s,'like');M.advance(s,M.MINUTE);add(s,'favorite');
 s.mode='foreground';add(s,'activity');add(s,'growth_star');
 s.mode='background';M.flushQueue(s);
 assert.deepEqual(s.pushes.map(p=>p.type),['like','favorite','growth_star']);
 assert.equal(M.round(s).used,2);
});
test('quiet catch-up selects the highest eligible message and releases only one Push',()=>{
 for(const exhausted of [false,true]){
  const s=M.createState(Date.parse('2026-09-19T22:00:00+08:00'));s.mode='background';
  add(s,'activity',{popup:true});add(s,'growth_star');
  s.now=Date.parse('2026-09-20T07:00:00+08:00');
  if(exhausted)s.ordinaryRound={start:s.now,used:2};
  M.flushQueue(s);
  assert.deepEqual(s.pushes.map(p=>p.type),[exhausted?'growth_star':'activity']);
  M.advance(s,3*M.HOUR);assert.equal(s.pushes.length,1);
  assert.ok(s.messages.every(m=>m.popupState==='pending'));
 }
});
test('a new official popup waits for the open personal popup, then preempts remaining results',()=>{
 const s=M.createState(),launch={device:'A'},star=add(s,'growth_star');
 assert.equal(M.homePopup(s,launch).id,star.id);
 const event=add(s,'activity',{popup:true});add(s,'collection',{popup:true});add(s,'honor');
 assert.equal(M.homePopup(s,launch),null);
 M.closePopup(s,star.id);
 assert.equal(M.homePopup(s,launch).id,event.id);M.view(s,event.id);
 const honor=M.homePopup(s,launch);assert.equal(honor.type,'honor');M.closePopup(s,honor.id);
 assert.equal(M.homePopup(s,launch),null);
 assert.equal(M.homePopup(s,{device:'A'}).type,'collection');
});
test('four followers across one-hour boundary yield two-person Push and matching detail',()=>{
 const s=M.createState(),fan=name=>add(s,'follow',{actor:{id:name,name}});
 const old=fan('小明');M.advance(s,10*M.MINUTE);fan('小红');
 M.advance(s,55*M.MINUTE);const current=fan('小雨');
 M.advance(s,5*M.MINUTE);s.mode='background';fan('乐乐');
 const p=s.pushes.at(-1);
 assert.match(p.title,/乐乐等2位/);
 assert.equal(p.eventIds.length,2);
 assert.equal(M.pushDestination(s,p).messageId,current.id);
 assert.deepEqual(M.users(s,current).map(u=>u.name),['小雨','乐乐']);
 assert.ok(p.eventIds.every(id=>current.events.includes(id)));
 M.view(s,current.id);assert.equal(M.unread(old),true);assert.equal(M.unread(current),false);
 assert.ok(M.details(s,old).every(e=>!e.handled&&!e.viewed));
});
test('one builder per model lifetime dedupe survives edits, deletion, reupload and 100 days',()=>{
 const s=M.createState(),m=follow(s,'小明');
 M.view(s,m.id);M.remove(s,m.id);M.advance(s,100*M.DAY);
 follow(s,'小明',M.OBJECTS.bridge,{work:{id:'reupload',name:'新照片'}});
 assert.equal(s.events.length,1);assert.equal(s.messages.length,1);
 follow(s,'小红');follow(s,'小明',M.OBJECTS.castle);
 assert.equal(s.events.length,3);
 assert.equal(s.messages.filter(m=>m.popupKind==='first_follow').length,1);
});
test('rejection reaches uploader; first approved feedback reaches original creator, never approval-result mail',()=>{
 const uploader=M.createState(),creator=M.createState();uploader.account='小明';creator.account='小红';
 const rejected={type:'review',object:M.OBJECTS.remix,recipient:'小明',approved:false};
 assert.ok(M.receive(uploader,rejected));assert.equal(M.receive(creator,rejected),null);
 assert.equal(M.receive(uploader,{...rejected,approved:true}),null);
 const feedback={type:'follow_build',object:M.OBJECTS.bridge,recipient:'小红',actor:{id:'小明',name:'小明'},work:{id:'work-1',name:'小桥'}};
 assert.equal(M.receive(creator,{...feedback,approved:false}),null);
 assert.equal(M.receive(uploader,{...feedback,approved:true}),null);
 assert.ok(M.receive(creator,{...feedback,approved:true}));
 assert.equal(creator.messages.length,1);assert.equal(uploader.messages.length,1);
});
test('official delivery starts at publication and popup range cannot outlive delivery validity',()=>{
 const s=M.createState(),m=add(s,'activity',{popup:true,publishedAt:s.now+M.HOUR,popupStart:s.now,popupEnd:s.now+4*M.HOUR,deliveryExpiresAt:s.now+2*M.HOUR});
 s.mode='background';M.flushQueue(s);assert.equal(s.pushes.length,0);
 assert.equal(M.list(s).length,0);assert.equal(M.homePopup(s,{}),null);
 M.advance(s,M.HOUR);assert.equal(s.pushes.length,1);assert.equal(M.list(s).length,1);
 assert.equal(M.homePopup(s,{}).id,m.id);
 M.advance(s,M.HOUR);assert.equal(M.popupValid(s,m),false);assert.equal(M.list(s).length,1);
});
