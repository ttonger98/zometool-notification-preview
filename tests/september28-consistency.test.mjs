import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';
import {renderCenter} from '../center-view.mjs';

test('官方通知关闭不标已读：本次启动不重弹，换设备按账号剩余额度展示',()=>{
 const s=M.createState();
 const m=M.receive(s,{type:'activity',object:M.OBJECTS.wheel,popup:true,popupTotalLimit:2});
 const a={device:'A'};
 assert.equal(M.homePopup(s,a)?.id,m.id);
 M.closePopup(s,m.id,a);
 assert.equal(M.unread(m),true);
 assert.equal(M.homePopup(s,a),null);
 const b={device:'B'};
 assert.equal(M.homePopup(s,b)?.id,m.id);
 M.closePopup(s,m.id,b);
 assert.equal(m.shownTotal,2);
 assert.equal(M.homePopup(s,{device:'C'}),null);
});

test('清理后的成果弹窗可跳转，但不重建消息或未读角标',()=>{
 const s=M.createState();
 const m=M.receive(s,{type:'growth_star',object:M.OBJECTS.self});
 M.advance(s,100*M.DAY);
 assert.equal(M.list(s).length,0);
 assert.equal(M.homePopup(s,{device:'A'})?.id,m.id);
 assert.equal(M.openNotification(s,m.id).read,false);
 assert.equal(M.list(s).length,0);
 assert.equal(M.stats(s).unread,0);
 M.suspendPopup(s,{device:'A'});
 assert.equal(M.homePopup(s,{device:'B'}),null);
});

test('个人成果展示但不关闭即退出，不恢复弹窗或待发Push',()=>{
 const s=M.createState();
 const m=M.receive(s,{type:'honor',object:M.OBJECTS.self});
 const a={device:'A'};
 assert.equal(M.homePopup(s,a)?.id,m.id);
 M.suspendPopup(s,a);
 s.mode='background';
 M.advance(s,2*M.MINUTE);
 assert.equal(s.pushes.length,0);
 assert.equal(M.homePopup(s,{device:'B'}),null);
 assert.equal(M.unread(m),true);
});

test('普通及首次跟拼消息详情都保留作品，不展示详情区头像昵称',()=>{
 for(const historical of [false,true]){
  const s=M.createState();
  if(historical)M.seedHistoricalFollow(s);
  const m=M.receive(s,{type:'follow_build',object:M.OBJECTS.bridge,actor:{id:'friend',name:'小宇'},work:{id:'friend-work',name:'三角桥作品',icon:'🌉'}});
  const html=renderCenter({state:s,category:'feedback',items:[m],selected:m.id});
  assert.match(html,/三角桥作品/);
  assert.doesNotMatch(html,/avatar-card|avatar-face|avatar-name/);
  assert.match(html,/小宇跟/);
 }
});

test('夜间展示官方弹窗后不在次晨补发Push，但下次启动仍可按次数展示',()=>{
 const s=M.createState(Date.parse('2026-09-10T22:00:00+08:00'));
 const m=M.receive(s,{type:'activity',object:M.OBJECTS.wheel,popup:true,push:true,popupTotalLimit:2});
 const a={device:'A'};
 assert.equal(M.homePopup(s,a)?.id,m.id);
 M.suspendPopup(s,a);
 s.mode='background';
 M.advance(s,9*M.HOUR);
 assert.equal(s.pushes.length,0);
 assert.equal(M.unread(m),true);
 s.mode='foreground';
 assert.equal(M.homePopup(s,{device:'B'})?.id,m.id);
 assert.equal(m.shownTotal,2);
});
