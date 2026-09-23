import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';

const add=(s,type,extra={})=>M.receive(s,{push:true,type,object:M.OBJECTS.wheel,actor:{id:'official',name:'Zometool官方'},...extra});
const personal=(s,extra={})=>M.receive(s,{push:true,type:'honor',object:M.OBJECTS.self,actor:{id:'official',name:'Zometool官方'},...extra});
const show=(s,launch)=>{const m=M.homePopup(s,launch);if(m)M.suspendPopup(s,launch);return m;};

test('官方通知默认累计1次：只展示一次，换设备与重启都不再弹',()=>{
 const s=M.createState(),m=add(s,'activity',{popup:true});
 assert.equal(m.popupTotalLimit,1);
 assert.equal(M.homePopup(s,{device:'A'}).id,m.id);
 M.suspendPopup(s,{device:'A'});
 assert.equal(M.homePopup(s,{device:'A'}),null);
 assert.equal(M.homePopup(s,{device:'B'}),null);
 assert.equal(M.unread(m),true);
});

test('累计展示次数弹满即停',()=>{
 const s=M.createState(),m=add(s,'activity',{popup:true,popupTotalLimit:3});
 for(let i=0;i<3;i++)assert.equal(show(s,{device:'A'}).id,m.id,'第'+(i+1)+'次');
 assert.equal(m.shownTotal,3);
 assert.equal(M.homePopup(s,{device:'A'}),null);
 assert.equal(M.unread(m),true);
});

test('每日展示次数按北京时间自然日重置',()=>{
 const s=M.createState(Date.parse('2026-09-10T09:00:00+08:00')),m=add(s,'activity',{popup:true,popupDailyLimit:1,popupTotalLimit:null});
 assert.equal(show(s,{device:'A'}).id,m.id);
 assert.equal(M.homePopup(s,{device:'A'}),null);
 M.advance(s,12*M.HOUR);
 assert.equal(M.homePopup(s,{device:'A'}),null,'当日仍受限');
 M.advance(s,12*M.HOUR);
 assert.equal(show(s,{device:'A'}).id,m.id,'次日重新可展示');
 assert.equal(m.shownDayCount,1);
});

test('两个次数开关都不开时表示该限制不生效',()=>{
 const s=M.createState(),m=add(s,'activity',{popup:true,popupTotalLimit:null,popupDailyLimit:null});
 for(let i=0;i<5;i++)assert.equal(show(s,{device:'A'}).id,m.id,'第'+(i+1)+'次');
 assert.equal(m.shownTotal,5);
});

test('官方通知按运营优先级排序，未配置时回落类型顺序',()=>{
 const s=M.createState();
 const course=add(s,'course',{popup:true,id:'course'});
 const activity=add(s,'activity',{popup:true,id:'activity'});
 assert.equal(M.homePopup(s,{device:'A'}).id,activity.id,'未配置优先级时活动招募在前');
 M.suspendPopup(s,{device:'A'});
 const t=M.createState();
 add(t,'course',{popup:true,id:'course',popupPriority:1});
 add(t,'activity',{popup:true,id:'activity',popupPriority:2});
 assert.equal(M.homePopup(t,{device:'A'}).id,'message-1','数字小者优先，课程上新压过活动招募');
});

test('一次启动最多展示1条官方通知，其余等待下次启动',()=>{
 const s=M.createState(),launch={device:'A'};
 const a=add(s,'activity',{popup:true});
 const b=add(s,'course',{popup:true});
 assert.equal(M.homePopup(s,launch).id,a.id);
 M.closePopup(s,a.id,launch);
 assert.equal(M.homePopup(s,launch),null,'同一次启动不再展示第二条官方通知');
 assert.equal(M.homePopup(s,{device:'A'}).id,b.id);
});

test('覆盖标签：不命中不展示，命中后可展示，退出标签停止弹窗与待发Push',()=>{
 const s=M.createState(),m=add(s,'activity',{popup:true,popupTags:['未报名'],popupTotalLimit:5});
 assert.equal(M.homePopup(s,{device:'A'}),null,'不命中标签不展示');
 s.viewerTags=['未报名'];
 assert.equal(show(s,{device:'A'}).id,m.id);
 s.viewerTags=[];
 s.mode='background';M.flushQueue(s);
 assert.equal(M.homePopup(s,{device:'A'}),null,'退出标签后不再弹');
 assert.equal(M.unread(m),true,'消息保留可回看');
 s.viewerTags=['未报名'];
 assert.equal(M.list(s).filter(x=>x.id===m.id).length,1,'同一通知不重复生成消息');
});

test('弹窗展示后停止该条尚未发送的Push，已发出的Push不受影响',()=>{
 const s=M.createState();const m=add(s,'activity',{popup:true,popupTotalLimit:5});
 assert.equal(s.queue.length,1);
 assert.equal(M.homePopup(s,{device:'A'}).id,m.id);
 assert.equal(s.queue.length,0);
 const t=M.createState();t.mode='background';t.notifications=true;
 const q=add(t,'activity',{popup:true,popupTotalLimit:5});
 M.advance(t,M.MINUTE);
 assert.equal(t.pushes.length,1,'已发出的Push不撤回');
 assert.equal(q.popupState,'pending');
});

test('调小累计上限后立即生效，调大后继续按新上限判断',()=>{
 const s=M.createState(),m=add(s,'activity',{popup:true,popupTotalLimit:5});
 assert.equal(show(s,{device:'A'}).id,m.id);
 m.popupTotalLimit=1;
 assert.equal(M.homePopup(s,{device:'A'}),null,'调小后立即停止');
 m.popupTotalLimit=2;
 assert.equal(show(s,{device:'A'}).id,m.id,'调大后继续展示');
});

test('个人成果不参与弹窗配置，仍只展示一次',()=>{
 const s=M.createState(),m=personal(s);
 assert.equal(m.popupTotalLimit,null);
 assert.equal(m.popupPriority,null);
 assert.equal(M.homePopup(s,{device:'A'}).id,m.id);
 M.suspendPopup(s,{device:'A'});
 assert.equal(M.homePopup(s,{device:'A'}),null);
 assert.equal(M.homePopup(s,{device:'B'}),null);
});
