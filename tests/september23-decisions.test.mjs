import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';

const objectFor=t=>['honor','growth_star','follow'].includes(t)?M.OBJECTS.self:t==='review'?M.OBJECTS.wheel:M.OBJECTS.wheel;
const add=(s,type,extra={})=>M.receive(s,{push:true,type,object:objectFor(type),actor:{id:'user-'+s.seq,name:'小宇'},...extra});

test('未读角标与列表统计同口径：目标失效的未读消息也计入',()=>{
 const s=M.createState();add(s,'like');const honor=add(s,'honor');
 M.invalidateTarget(s,honor.id);
 assert.equal(M.unread(honor),true);
 assert.deepEqual(M.stats(s,'system'),{total:1,unread:1,read:0});
 assert.deepEqual(M.stats(s),{total:2,unread:2,read:0});
 M.view(s,honor.id);
 assert.deepEqual(M.stats(s,'system'),{total:1,unread:0,read:1});
});

test('个人成果弹窗展示即结束：停止待发Push、其他设备与重启都不再展示，阅读状态不变',()=>{
 const s=M.createState(),m=add(s,'honor');
 assert.equal(s.queue.length,1);
 assert.equal(M.homePopup(s,{device:'A'}).id,m.id);
 assert.equal(m.popupState,'shown');
 assert.equal(s.queue.length,0);
 s.mode='background';M.flushQueue(s);
 assert.equal(s.pushes.length,0);
 assert.equal(M.unread(m),true);
 assert.equal(M.homePopup(s,{device:'B'}),null);
 assert.equal(M.homePopup(s,{device:'A'}),null);
});

test('首页弹窗不受发送时段限制；官方通知弹窗离开首页后仍可再次展示',()=>{
 const s=M.createState(Date.parse('2026-09-10T23:00:00+08:00')),launch={device:'A'};
 const m=add(s,'honor');
 assert.equal(M.sendingHours(s.now),false);
 assert.equal(M.homePopup(s,launch).id,m.id);
 const t=M.createState(),l2={device:'A'},o=add(t,'activity',{popup:true});
 assert.equal(M.homePopup(t,l2).id,o.id);
 M.suspendPopup(t,l2);
 assert.equal(M.homePopup(t,l2),null);
 assert.equal(M.homePopup(t,{device:'A'}).id,o.id);
});

test('跟拼作品审核调整通知使用跟拼文案与跳转，作品审核保持原文案',()=>{
 const s=M.createState(),official={id:'official',name:'Zometool官方'};
 const remix=M.receive(s,{type:'review',object:M.OBJECTS.remix,actor:official,approved:false});
 assert.equal(M.title(s,remix),'跟拼作品需要调整一下');
 assert.match(M.body(s,remix),/你的跟拼作品「/);
 assert.equal(M.target(remix),'跟拼作品修改');
 const work=M.receive(s,{type:'review',object:M.OBJECTS.wheel,actor:official,approved:false});
 assert.equal(M.title(s,work),'作品需要调整一下');
 assert.match(M.body(s,work),/你的作品「/);
 assert.equal(M.target(work),'作品修改');
});
