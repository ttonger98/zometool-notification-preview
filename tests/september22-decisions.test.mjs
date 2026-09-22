import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';
import {renderCenter} from '../center-view.mjs';

const at=s=>Date.parse(`2026-09-${s}+08:00`);
const bg=(now=at('22T10:00:00'))=>Object.assign(M.createState(now),{mode:'background'});
const add=(s,type,extra={})=>M.receive(s,{type,object:['honor','growth_star','follow'].includes(type)?M.OBJECTS.self:['admission','follow_build'].includes(type)?M.OBJECTS.bridge:M.OBJECTS.wheel,actor:{id:`u${s.seq}`,name:`用户${s.seq}`},...extra});

test('跨夜恢复发送不影响当天新消息的独立判断',()=>{
 const s=bg(at('21T22:00:00'));
 add(s,'growth_star');
 s.now=at('22T07:00:00');
 const fresh=add(s,'like',{actor:{id:'today',name:'今天的用户'}});
 assert.deepEqual(s.pushes.map(p=>p.type),['growth_star','like']);
 assert.ok(s.pushes.some(p=>p.messageId===fresh.id));
});

test('跨夜官方通知等待间隔时，不阻塞当天新个人成果',()=>{
 const s=bg(at('21T22:00:00'));
 add(s,'activity',{push:true});
 s.now=at('22T07:00:00');s.lastPush=s.now-30_000;
 const fresh=add(s,'growth_star');
 assert.deepEqual(s.pushes.map(p=>p.messageId),[fresh.id]);
 M.advance(s,30_000);
 assert.deepEqual(s.pushes.map(p=>p.type),['growth_star','activity']);
});

test('跨夜候选暂不满足条件时保持等待，条件恢复后只补发1条',()=>{
 const s=bg(at('22T05:00:00'));
 add(s,'activity',{push:true});
 s.ordinaryRound={start:at('22T06:30:00'),used:2};
 s.now=at('22T07:00:00');M.flushQueue(s);
 assert.equal(s.pushes.length,0);
 assert.equal(s.events.find(e=>e.type==='activity').quietReleased,undefined);
 s.now=at('22T08:31:00');M.flushQueue(s);
 assert.deepEqual(s.pushes.map(p=>p.type),['activity']);
 assert.equal(s.events.find(e=>e.type==='activity').quietReleased,true);
 s.now=at('22T10:00:00');M.flushQueue(s);
 assert.equal(s.pushes.length,1);
});

test('批量重复回调不触发旧互动Push',()=>{
 const s=M.createState(at('22T10:00:00'));
 const event={id:'retry-like',type:'like',object:M.OBJECTS.wheel,actor:{id:'a',name:'小明'}};
 M.receiveBatch(s,[event]);
 assert.equal(s.pushes.length,0);
 s.mode='background';
 M.receiveBatch(s,[event]);
 assert.equal(s.pushes.length,0);
 assert.equal(s.events.length,1);
 assert.equal(s.messages.length,1);
});

test('内容失效停止提醒后，新互动另建消息并正常判断Push',()=>{
 const s=M.createState(at('22T10:00:00'));
 const first=add(s,'like',{id:'first-like',actor:{id:'a',name:'旧互动'}});
 M.invalidateTarget(s,first.id);
 first.targetAvailable=true;
 s.mode='background';s.now=at('22T10:05:00');
 const next=add(s,'like',{actor:{id:'b',name:'新互动'}});
 assert.notEqual(next.id,first.id);
 assert.equal(s.pushes.length,1);
 assert.equal(s.pushes[0].messageId,next.id);
 assert.deepEqual(s.pushes[0].eventIds,[s.events.find(e=>e.actor.id==='b').id]);
 assert.equal(M.unread(first),true);
 assert.equal(s.events.find(e=>e.actor.id==='b').handled,true);
});

test('互动取消后保留历史记录，未发送的Push不再包含该互动',()=>{
 const s=M.createState(at('22T10:00:00'));
 add(s,'like',{actor:{id:'a',name:'小明'}});
 add(s,'like',{actor:{id:'b',name:'小红'}});
 M.cancelInteraction(s,s.events.find(e=>e.actor.id==='a').id);
 s.mode='background';s.now=at('22T10:05:00');
 add(s,'like',{actor:{id:'c',name:'天天'}});
 const p=s.pushes.at(-1);
 assert.ok(p);
 assert.deepEqual(p.eventIds,s.events.filter(e=>['b','c'].includes(e.actor.id)).map(e=>e.id));
 assert.equal(s.messages.length,1);
 assert.equal(s.events.find(e=>e.actor.id==='a').cancelled,true);

 const only=M.createState(at('22T10:00:00'));
 add(only,'like',{actor:{id:'d',name:'小宇'}});
 M.cancelInteraction(only,only.events.at(-1).id);
 only.mode='background';M.flushQueue(only);
 assert.equal(only.pushes.length,0);
});

test('审核重新提交后保留原因但不可重复提交，再次不通过生成新通知',()=>{
 const s=M.createState(at('22T10:00:00'));
 const first=add(s,'review',{object:M.OBJECTS.wheel});
 M.resubmit(s,M.OBJECTS.wheel.id);
 assert.equal(first.reviewStatus,'reviewing');
 s.mode='background';M.flushQueue(s);
 assert.equal(s.pushes.length,0);
 const again=add(s,'review',{object:M.OBJECTS.wheel});
 assert.notEqual(again.id,first.id);
 assert.equal(s.pushes.length,1);
 assert.equal(s.pushes[0].messageId,again.id);
});

test('消息中心展示已读统计，入选消息合集名称可点击',()=>{
 const s=M.createState();
 const m=M.receive(s,{type:'selected',object:M.OBJECTS.wheel,silent:true,actor:{id:'a',name:'小宇'}});
 M.view(s,m.id);
 const html=renderCenter({state:s,category:'all',items:M.list(s),selected:m.id});
 assert.match(html,/class="list-stats">已读 1／共 1</);
 assert.match(html,/inline-honor-link" data-action="target">创意游乐园</);
 M.invalidateTarget(s,m.id);
 const kept=renderCenter({state:s,category:'all',items:M.list(s),selected:m.id});
 assert.match(kept,/class="list-stats">已读 1／共 1</);
 const empty=renderCenter({state:M.createState(),category:'all',items:[],selected:null});
 assert.doesNotMatch(empty,/list-stats/);
});
