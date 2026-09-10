// One deterministic domain model drives the center, simulated Push, and home reminders.
export const MINUTE=60_000, HOUR=60*MINUTE, DAY=24*HOUR;
export const VERSION='2026-09-10';
export const INTERACTIONS=['like','favorite','share','follow_build','praise','expert_comment','follow'];
export const PERSONAL=['admission','honor','selected'];
export const TYPES={
 like:['点赞','👍'],favorite:['收藏','⭐'],share:['分享','🔁'],follow_build:['跟拼','🧱'],praise:['夸一夸','🏆'],expert_comment:['共创达人评论','💬'],follow:['新增粉丝','👥'],
 admission:['造型正式入库','🎁'],honor:['个人荣誉','🏅'],selected:['作品入选','✨'],review:['作品审核结果','📝'],activity:['活动招募','🎯'],collection:['作品集上线','🖼️'],model_batch:['造型库上新','🆕'],course:['课程上新','📚'],feature:['功能更新','🔧'],marketing:['官方活动','🎈']
};
export const allowedKinds=type=>({like:['work','remix'],favorite:['model','work','remix'],share:['model','work','remix'],follow_build:['model'],admission:['model'],praise:['work','remix'],expert_comment:['work','remix'],follow:['profile'],honor:['profile'],selected:['work','remix'],review:['work','remix']}[type]||['model','work','remix']);
export const OBJECTS={
 castle:{id:'castle',name:'水晶城堡',kind:'model',icon:'🏰'}, bridge:{id:'bridge',name:'三角桥',kind:'model',icon:'🌉'}, tower:{id:'tower',name:'天空塔',kind:'model',icon:'🏗️'},
 wheel:{id:'wheel',name:'夏日摩天轮',kind:'work',icon:'🎡'}, rocket:{id:'rocket',name:'星际火箭',kind:'work',icon:'🚀'}, remix:{id:'remix',name:'蓝色小城',kind:'remix',icon:'🌁',modelId:'bridge'}, self:{id:'self',name:'我的主页',kind:'profile',icon:'😊'}
};
export const localDate=t=>new Date(t+8*HOUR).toISOString().slice(0,10);
export function sendingHours(t){const h=new Date(t+8*HOUR).getUTCHours();return h>=7&&h<21;}
export function createState(now=Date.parse('2026-09-10T10:00:00+08:00')){return {version:VERSION,now,seq:0,account:'self',messages:[],events:[],rounds:{},pushes:[],queue:[],lastPush:null,notifications:true,loggedIn:true,mode:'foreground'};}
export const isInteraction=m=>INTERACTIONS.includes(m.type);
export const valid=(s,m)=>!m.deleted&&!m.offline&&s.now<m.expiresAt;
export const unread=m=>m.events.some(id=>!m.readIds.includes(id));
export function list(s,category='all'){return s.messages.filter(m=>valid(s,m)&&(category==='all'||m.category===category)).sort((a,b)=>Number(unread(b))-Number(unread(a))||b.latestAt-a.latestAt||b.order-a.order);}
export const stats=(s,c='all')=>{const items=list(s,c);return {total:items.length,unread:items.filter(unread).length,read:items.filter(m=>!unread(m)).length};};
export const findMessage=(s,id)=>s.messages.find(m=>m.id===id);
export const details=(s,m)=>m.events.map(id=>s.events.find(e=>e.id===id)).filter(Boolean);
export const users=(s,m)=>[...new Map(details(s,m).map(e=>[e.actor.id,e.actor])).values()];
export const objectLabel=m=>({model:'造型',work:'作品',remix:'跟拼作品',profile:'主页'}[m.object.kind]||'作品');
export function title(s,m){
 const n=users(s,m).length,obj=objectLabel(m),person=n===1?'有人':`有${n}个人`;
 if(m.type==='like')return `${person}赞了你的${obj}`;
 if(m.type==='favorite')return `${person}收藏了你的${obj}`;
 if(m.type==='share')return `${person}分享了你的${obj}`;
 if(m.type==='follow_build')return `${person}跟拼了你的造型`;
 if(m.type==='praise')return `${person}夸了夸你的${obj}`;
 if(m.type==='expert_comment')return `共创达人评论了你的${obj}`;
 if(m.type==='follow')return `${person}关注了你！`;
 return m.title||({admission:'恭喜！你的造型入选官方造型库啦！',honor:'恭喜你获得共创达人荣誉！',selected:'你的作品入选优秀作品集啦！',review:'作品需要调整一下',activity:'新一期活动招募开始啦！',collection:'新一期优秀作品集上线啦！',model_batch:'造型库上新造型啦！',course:'新课程上线啦！',feature:'造型库功能更新啦！',marketing:'创意拼搭活动开始啦！'}[m.type]);
}
export function body(s,m){
 if(m.text)return m.text;
 if(isInteraction(m)){
  const u=users(s,m),who=u.length>1?`${u[0].name}和其他${u.length-1}位用户`:u[0]?.name||'小伙伴';
  if(m.type==='follow')return `${who}关注了你，恭喜你收获新粉丝！`;
  if(m.type==='expert_comment')return `共创达人${who}评论了你的${objectLabel(m)}「${m.object.name}」：`;
  return `${who}${{like:'点赞了',favorite:'收藏了',share:'分享了',follow_build:'跟拼了',praise:'夸了夸'}[m.type]}你的${objectLabel(m)}「${m.object.name}」。`;
 }
 return {admission:`你的「${m.object.name}」入选官方造型库。更多小伙伴可以跟着你的创意一起拼搭啦！`,honor:'你获得了共创达人荣誉！感谢你的精彩创作，去个人主页看看你的荣誉标识吧。',selected:`你的作品「${m.object.name}」入选本期优秀作品集，快来看看你的精彩创作吧！`,review:`你的作品「${m.object.name}」需要调整。请上传主体清晰的作品封面，修改后可以重新提交审核。`,activity:'来参加创意拼搭活动吧！查看本期活动主题、参与方式和活动时间。',collection:'一起来看看小伙伴们的精彩创作，寻找你的下一份拼搭灵感吧！',model_batch:'本批上新3个造型：水晶城堡、三角桥、天空塔。一起来寻找新的拼搭灵感！',course:'学习新的拼搭技巧，探索稳定结构的奥秘。',feature:'造型库新增主题筛选，帮助你更快找到想拼的造型。',marketing:'本期创意活动已开启，查看活动内容和参与方式。'}[m.type];
}
export function target(m,context='main'){
 if(context==='image')return `${objectLabel(m)}详情`;
 if(m.type==='review')return '作品修改';
 if(m.type==='admission')return context==='main'?'个人主页 · 入库造型':'造型详情';
 if(m.type==='honor')return '个人主页 · 荣誉';
 if(m.type==='selected')return '本期作品集 · 我的入选作品';
 if(m.type==='follow_build')return '原造型 · 跟拼作品列表';
 if(m.type==='expert_comment')return `${objectLabel(m)}详情 · 达人评论`;
 return {activity:'活动主页',collection:'本期作品集',model_batch:'造型库 · 上新',course:'课程介绍',feature:'造型库 · 主题筛选',marketing:'活动主页',follow:'用户个人主页'}[m.type]||`${objectLabel(m)}详情`;
}
export function round(s,type){const r=s.rounds[type];return r&&s.now<r.start+2*HOUR?{...r,remaining:2-r.used,ends:r.start+2*HOUR}:{used:0,remaining:2,start:null,ends:null};}
function pushEligible(s){return s.loggedIn&&s.notifications&&s.mode==='background'&&sendingHours(s.now)&&(s.lastPush===null||s.now-s.lastPush>=MINUTE);}
function eventMessage(s,e){return s.messages.find(m=>m.id===e.messageId);}
function pending(s,e){const m=eventMessage(s,e);return !e.handled&&!e.viewed&&m&&valid(s,m)&&m.targetAvailable;}
function recordPush(s,m,events){
 const latest=events.at(-1),n=new Set(events.map(e=>e.actor.id)).size;
 const push={id:`push-${++s.seq}`,messageId:m.id,type:m.type,at:s.now,eventIds:events.map(e=>e.id),latestEventId:latest.id,title:isInteraction(m)?(n>1?`${latest.actor.name}等${n}位小伙伴`:`${latest.actor.name}`)+({like:'赞了',favorite:'收藏了',share:'分享了',follow_build:'跟拼了',praise:'夸了夸',expert_comment:'评论了',follow:'关注了'}[m.type])+(m.type==='follow'?'你':`你的${objectLabel(m)}「${m.object.name}」`):title(s,m)};
 events.forEach(e=>e.handled=true);s.pushes.push(push);s.lastPush=s.now;return push;
}
export function flushQueue(s){
 s.queue=s.queue.filter(id=>{const e=s.events.find(e=>e.id===id);return e&&pending(s,e);});
 if(!pushEligible(s))return null;
 s.queue.sort((a,b)=>{const x=s.events.find(e=>e.id===a),y=s.events.find(e=>e.id===b);const priority=e=>(e.type==='review'||PERSONAL.includes(e.type))?0:1;return priority(x)-priority(y)||x.at-y.at;});
 const id=s.queue.shift();if(!id)return null;const e=s.events.find(e=>e.id===id);return recordPush(s,eventMessage(s,e),[e]);
}
export function receive(s,input){
 const type=input.type;if(!TYPES[type])throw Error('Unknown message type');
 if(!allowedKinds(type).includes((input.object||OBJECTS.wheel).kind))return null;
 if(input.recipient&&input.recipient!==s.account)return null;
 if(input.approved===false||input.formal===false||input.valid===false)return null;
 if(input.id&&s.events.some(e=>e.id===input.id))return eventMessage(s,s.events.find(e=>e.id===input.id));
 const object={...(input.object||OBJECTS.wheel)},at=input.at??s.now,actor=input.actor||{id:'official',name:'Zometool官方',color:'#4ea5df'};
 const prior=s.events.find(e=>e.type===type&&e.object.id===object.id&&e.actor.id===actor.id&&((['like','favorite'].includes(type)&&localDate(e.at)===localDate(at))||type==='follow_build'));
 if(prior&&['like','favorite'].includes(type))return eventMessage(s,prior);
 if(prior&&type==='follow_build'&&(!input.work||details(s,eventMessage(s,prior)).some(e=>e.work?.id===input.work.id)))return eventMessage(s,prior);
 const interaction=INTERACTIONS.includes(type),aggregate=interaction&&type!=='expert_comment';
 let m=aggregate?s.messages.findLast(m=>valid(s,m)&&m.type===type&&m.object.id===object.id&&at>=m.createdAt&&at-m.createdAt<HOUR):null;
 if(prior&&type==='follow_build'&&valid(s,eventMessage(s,prior)))m=eventMessage(s,prior);
 const e={...input,id:input.id||`event-${++s.seq}`,type,at,object,actor,handled:!!prior,viewed:false};
 if(!m){
  m={id:`message-${++s.seq}`,order:s.seq,type,object,category:interaction?'feedback':'system',source:interaction?(object.kind==='model'||object.kind==='remix'?'造型库':'作品圈'):'Zometool官方',createdAt:at,latestAt:at,expiresAt:Math.min(at+90*DAY,input.expiresAt??Infinity),events:[],readIds:[],popup:PERSONAL.includes(type)||(input.popup===true&&!interaction&&type!=='review'),popupState:'pending',popupStart:input.popupStart??at,popupEnd:input.popupEnd??(input.expiresAt??at+90*DAY),targetAvailable:true,title:interaction?undefined:input.title,text:interaction?undefined:input.text};
  s.messages.push(m);
 }
 e.messageId=m.id;m.events.push(e.id);m.latestAt=Math.max(m.latestAt,at);s.events.push(e);
 if(input.silent)return m;
 if(interaction){
  flushQueue(s);const r=round(s,type);
  if(!prior&&pushEligible(s)&&r.remaining>0){
   const pendingEvents=s.events.filter(x=>x.type===type&&x.object.id===object.id&&pending(s,x)&&x.id!==e.id);pendingEvents.push(e);
   recordPush(s,m,pendingEvents);s.rounds[type]={start:r.start??s.now,used:r.used+1};
  }
 }else if(input.push!==false){s.queue.push(e.id);flushQueue(s);}
 return m;
}
export function view(s,id,eventIds){
 const m=findMessage(s,id);if(!m||!valid(s,m))return false;
 const ids=eventIds||m.events;
 m.readIds=[...new Set([...m.readIds,...ids.filter(id=>m.events.includes(id))])];
 s.events.filter(e=>ids.includes(e.id)).forEach(e=>{e.viewed=true;e.handled=true;});
 if(isInteraction(m))delete s.rounds[m.type];m.popupState='completed';return true;
}
export function readAll(s,category){list(s,category).forEach(m=>{m.readIds=[...m.events];m.popupState='completed';});}
export function remove(s,id){const m=findMessage(s,id);if(!m)return;m.deleted=true;m.popupState='completed';details(s,m).forEach(e=>e.handled=true);}
export function removeRead(s,category){list(s,category).filter(m=>!unread(m)).forEach(m=>remove(s,m.id));}
export function advance(s,ms){s.now+=ms;flushQueue(s);}
export function homePopup(s,launch){
 if(launch.screened||!s.loggedIn)return null;
 launch.screened=true;
 const candidates=list(s).filter(m=>m.popup&&m.popupState==='pending'&&m.targetAvailable&&s.now>=m.popupStart&&s.now<m.popupEnd);
 candidates.sort((a,b)=>Number(PERSONAL.includes(b.type))-Number(PERSONAL.includes(a.type))||b.latestAt-a.latestAt||b.order-a.order);
 const m=candidates[0];if(m){launch.shown=m.id;m.popupState='shown';m.popupDevice=launch.device;}return m||null;
}
export function closePopup(s,id){const m=findMessage(s,id);if(m)m.popupState='completed';}
export function formatTime(t,now){
 const diff=Math.max(0,now-t),date=localDate(t),today=localDate(now),d=new Date(t+8*HOUR),n=new Date(now+8*HOUR),hhmm=d.toISOString().slice(11,16);
 if(diff<MINUTE)return '刚刚';if(diff<HOUR)return `${Math.floor(diff/MINUTE)}分钟前`;
 if(date===today)return `今天 ${hhmm}`;if(date===localDate(now-DAY))return `昨天 ${hhmm}`;
 const start=Date.parse(today+'T00:00:00+08:00')-((n.getUTCDay()+6)%7)*DAY,day='日一二三四五六'[d.getUTCDay()];
 if(t>=start)return `周${day} ${hhmm}`;if(t>=start-7*DAY)return `上周${day}`;
 return d.getUTCFullYear()===n.getUTCFullYear()?date.slice(5).replace('-','/'):date.replaceAll('-','/');
}
export function seeded(){
 const s=createState(),now=s.now;let count=0;
 const add=(type,object,minutes=0,extra={})=>receive(s,{id:`seed-${++count}`,type,object,at:now-minutes*MINUTE,silent:true,...extra});
 const people=[{id:'a',name:'小宇',color:'#f28b69'},{id:'b',name:'可可',color:'#8374e1'},{id:'c',name:'天天',color:'#619dd4'}];
 add('collection',OBJECTS.wheel,1,{popup:true});add('activity',OBJECTS.wheel,4,{popup:true});
 add('review',OBJECTS.rocket,8);add('admission',OBJECTS.castle,3);
 add('honor',OBJECTS.self,90);add('selected',OBJECTS.wheel,120);
 for(const [i,type] of ['like','favorite','share','praise'].entries())for(const object of [OBJECTS.wheel,OBJECTS.remix])people.forEach((actor,j)=>add(type,object,40-i*5-j,{actor,text:type==='praise'?['这件作品太有创意了！','颜色搭配真好看！','这个结构很稳，太棒啦！'][j]:undefined}));
 add('praise',OBJECTS.wheel,21,{actor:people[0],text:'我也想试试这个造型！'});
 for(const type of ['favorite','share','follow_build'])people.forEach((actor,j)=>add(type,OBJECTS.bridge,50-j,{actor,work:type==='follow_build'?{id:`work-${j}`,name:['蓝色小城','小石头的作品','摩天轮练习'][j],icon:['🌁','🏗️','🎡'][j]}:undefined}));
 for(const object of [OBJECTS.wheel,OBJECTS.remix])add('expert_comment',object,100,{actor:{id:'expert',name:'橙子',color:'#e8a34d'},text:'结构很稳定！试试加高底座，看看会有什么变化。'});
 people.forEach(actor=>add('follow',OBJECTS.self,80,{actor}));
 for(const type of ['model_batch','course','feature','marketing']){const m=add(type,OBJECTS.castle,180+count);view(s,m.id);}
 s.events.forEach(e=>e.handled=true);s.seq+=100;return s;
}
