// One deterministic domain model drives the center, simulated Push, and home reminders.
export const MINUTE=60_000, HOUR=60*MINUTE, DAY=24*HOUR;
export const VERSION='2026-09-20-review-sync';
export const GROWTH_STAR_TITLE_TEMPLATE='太棒了！你是【年份】【月份】的Zometool成长之星！';
export const INTERACTIONS=['like','favorite','share','follow_build','praise','expert_comment','follow'];
export const PERSONAL=['admission','honor','growth_star','selected'];
export const TYPES={
 like:['点赞','👍'],favorite:['收藏','⭐'],share:['分享','🔁'],follow_build:['跟拼','🧱'],praise:['夸一夸','🏆'],expert_comment:['共创达人评论','💬'],follow:['新增粉丝','👥'],
 admission:['造型正式入库','🎁'],honor:['共创达人','🏅'],growth_star:['成长之星','🌟'],selected:['作品入选','✨'],review:['作品审核结果','📝'],activity:['活动招募','🎯'],collection:['作品集上线','🖼️'],model_batch:['造型库上新','🆕'],course:['课程上新','📚'],feature:['功能更新','🔧'],marketing:['官方活动','🎈']
};
export const allowedKinds=type=>({like:['work','remix'],favorite:['model','work','remix'],share:['model','work','remix'],follow_build:['model'],admission:['model'],praise:['work','remix'],expert_comment:['work','remix'],follow:['profile'],honor:['profile'],growth_star:['profile'],selected:['work','remix'],review:['work','remix']}[type]||['model','work','remix']);
export const OBJECTS={
 castle:{id:'castle',name:'水晶城堡',kind:'model',icon:'🏰'}, bridge:{id:'bridge',name:'三角桥',kind:'model',icon:'🌉'}, tower:{id:'tower',name:'天空塔',kind:'model',icon:'🏗️'},
 wheel:{id:'wheel',name:'夏日摩天轮',kind:'work',icon:'🎡'}, rocket:{id:'rocket',name:'星际火箭',kind:'work',icon:'🚀'}, remix:{id:'remix',name:'蓝色小城',kind:'remix',icon:'🌁',modelId:'bridge'}, self:{id:'self',name:'我的主页',kind:'profile',icon:'😊'}
};
export const localDate=t=>new Date(t+8*HOUR).toISOString().slice(0,10);
export function sendingHours(t){const h=new Date(t+8*HOUR).getUTCHours();return h>=7&&h<21;}
export function createState(now=Date.parse('2026-09-10T10:00:00+08:00')){return {version:VERSION,now,seq:0,account:'self',messages:[],events:[],rounds:{},ordinaryRound:null,firstFollow:null,pushes:[],queue:[],lastPush:null,notifications:true,loggedIn:true,mode:'foreground'};}
export const isInteraction=m=>INTERACTIONS.includes(m.type);
export const valid=(s,m)=>!m.deleted&&!m.offline&&s.now<m.expiresAt;
export const unread=m=>m.events.some(id=>!m.readIds.includes(id));
export function list(s,category='all'){return s.messages.filter(m=>valid(s,m)&&s.now>=(m.publishedAt??m.createdAt)&&(category==='all'||m.category===category)).sort((a,b)=>Number(unread(b))-Number(unread(a))||b.latestAt-a.latestAt||b.order-a.order);}
export const stats=(s,c='all')=>{const items=list(s,c);return {total:items.length,unread:items.filter(m=>unread(m)&&m.targetAvailable).length,read:items.filter(m=>!unread(m)).length};};
export const findMessage=(s,id)=>s.messages.find(m=>m.id===id);
export const details=(s,m)=>m.events.map(id=>s.events.find(e=>e.id===id)).filter(Boolean);
export const users=(s,m)=>[...new Map(details(s,m).map(e=>[e.actor.id,e.actor])).values()];
export const objectLabel=m=>({model:'造型',work:'作品',remix:'跟拼作品',profile:'主页'}[m.object.kind]||'作品');
export function title(s,m){
 if(m.popupKind==='first_follow')return '你的创意，第一次有人跟着拼啦！';
 if(m.type==='growth_star'){
  const [year,month]=localDate(m.createdAt).split('-');
  return GROWTH_STAR_TITLE_TEMPLATE.replace('【年份】',`${year}年`).replace('【月份】',`${Number(month)}月`);
 }
 const n=users(s,m).length,obj=objectLabel(m),person=n===1?'有人':`有${n}个人`;
 if(m.type==='like')return `${person}赞了你的${obj}`;
 if(m.type==='favorite')return `${person}收藏了你的${obj}`;
 if(m.type==='share')return `${person}分享了你的${obj}`;
 if(m.type==='follow_build')return `${person}跟拼了你的造型`;
 if(m.type==='praise')return `${person}夸了夸你的${obj}`;
 if(m.type==='expert_comment')return `共创达人评论了你的${obj}`;
 if(m.type==='follow')return `${person}关注了你！`;
 return m.title||({admission:'恭喜！你的造型入选官方造型库啦！',honor:'恭喜你成为共创达人！',selected:'你的作品入选主题合集啦！',review:'作品需要调整一下',activity:'新一期活动招募开始啦！',collection:'新一期优秀作品集上线啦！',model_batch:'造型库上新造型啦！',course:'新课程上线啦！',feature:'造型库功能更新啦！',marketing:'创意拼搭活动开始啦！'}[m.type]);
}
export function body(s,m){
 if(m.popupKind==='first_follow'){const e=details(s,m)[0];return `${e.actor.name}跟着你的「${m.object.name}」拼出了新作品。`;}
 if(m.text)return m.text;
 if(isInteraction(m)){
  const u=users(s,m),who=u.length>1?`${u[0].name}和其他${u.length-1}位用户`:u[0]?.name||'小伙伴';
  if(m.type==='follow')return `${who}关注了你，恭喜你收获新粉丝！`;
  if(m.type==='expert_comment')return `共创达人${who}评论了你的${objectLabel(m)}「${m.object.name}」：`;
  return `${who}${{like:'点赞了',favorite:'收藏了',share:'分享了',follow_build:'跟拼了',praise:'夸了夸'}[m.type]}你的${objectLabel(m)}「${m.object.name}」。`;
 }
 return {admission:`你的「${m.object.name}」入选官方造型库。更多小伙伴可以跟着你的创意一起拼搭啦！`,honor:'感谢你分享精彩创意！共创达人身份标识已点亮，去个人主页看看吧。',growth_star:'每一次动手，都藏着新的发现。你的拼搭故事登上本月成长之星，快来看看属于你的展示页！',selected:`你的作品「${m.object.name}」入选「创意游乐园」主题合集，快来看看你的精彩创作吧！`,review:`你的作品「${m.object.name}」需要调整。请上传主体清晰的作品封面，修改后可以重新提交审核。`,activity:'来参加创意拼搭活动吧！查看本期活动主题、参与方式和活动时间。',collection:'一起来看看小伙伴们的精彩创作，寻找你的下一份拼搭灵感吧！',model_batch:'本批上新3个造型：水晶城堡、三角桥、天空塔。一起来寻找新的拼搭灵感！',course:'学习新的拼搭技巧，探索稳定结构的奥秘。',feature:'造型库新增主题筛选，帮助你更快找到想拼的造型。',marketing:'本期创意活动已开启，查看活动内容和参与方式。'}[m.type];
}
export function target(m,context='main'){
 if(context==='image')return `${objectLabel(m)}详情`;
 if(m.type==='review')return '作品修改';
 if(m.type==='admission')return ['main','popup'].includes(context)?'个人主页 · 入库造型':'造型详情';
 if(m.type==='honor')return '个人主页 · 共创达人';
 if(m.type==='growth_star')return '成长之星 · 本期展示';
 if(m.type==='selected')return '主题合集 · 创意游乐园';
 if(m.type==='follow_build')return '原造型 · 跟拼作品列表';
 if(m.type==='expert_comment')return `${objectLabel(m)}详情 · 达人评论`;
 return {activity:'活动主页',collection:'本期作品集',model_batch:'造型库 · 上新',course:'课程介绍',feature:'造型库 · 主题筛选',marketing:'活动主页',follow:'用户个人主页'}[m.type]||`${objectLabel(m)}详情`;
}
// Ordinary notifications share one account-wide allowance. Personal results bypass it.
export function round(s){const r=s.ordinaryRound;return r&&s.now<r.start+2*HOUR?{...r,remaining:2-r.used,ends:r.start+2*HOUR}:{used:0,remaining:2,start:null,ends:null};}
export const personal=m=>PERSONAL.includes(m.type);
export const official=m=>!personal(m)&&!isInteraction(m)&&m.type!=='review';
export const deliveryActive=(s,m)=>!official(m)||(s.now>=(m.publishedAt??m.createdAt)&&s.now<(m.deliveryExpiresAt??Infinity));
export const personalPush=e=>personal(e)||e.specialPush==='first_follow';
const pushGate=s=>s.loggedIn&&s.notifications&&s.mode==='background'&&sendingHours(s.now);
const firstFollow=e=>e.specialPush==='first_follow'||e.popupKind==='first_follow';
const priority=e=>official(e)?0:personal(e)?1:firstFollow(e)?2:e.type==='expert_comment'?3:e.type==='review'?5:4;
const typePriority=e=>{
 if(personal(e))return {honor:0,growth_star:0,selected:1,admission:2}[e.type];
 if(firstFollow(e))return 0;
 if(!isInteraction(e))return ['activity','model_batch','collection','feature','course','marketing','review'].indexOf(e.type);
 const kind={model:0,work:1,remix:2,profile:0}[e.object.kind];
 return e.type==='expert_comment'?kind:['follow_build','praise','follow','favorite','like','share'].indexOf(e.type)*3+kind;
};
// The same channel ordering applies before time is used as a tie-breaker.
export const compareNotifications=(a,b)=>priority(a)-priority(b)||typePriority(a)-typePriority(b)||(b.at??b.latestAt)-(a.at??a.latestAt)||(b.order??0)-(a.order??0)||String(b.id).localeCompare(String(a.id));
function pushEligible(s,e){const m=eventMessage(s,e);return pushGate(s)&&m&&deliveryActive(s,m)&&(personalPush(e)||(round(s).remaining>0&&(s.lastPush===null||s.now-s.lastPush>=MINUTE)));}
function eventMessage(s,e){return s.messages.find(m=>m.id===e.messageId);}
function pending(s,e){const m=eventMessage(s,e);return !e.handled&&!e.viewed&&m&&valid(s,m)&&m.targetAvailable&&(!official(m)||s.now<(m.deliveryExpiresAt??Infinity));}
function recordPush(s,m,events){
 events=[...events].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 const latest=events.at(-1),n=new Set(events.map(e=>e.actor.id)).size;
 const push={id:`push-${++s.seq}`,messageId:m.id,type:m.type,at:s.now,eventIds:events.map(e=>e.id),latestEventId:latest.id,title:isInteraction(m)?(n>1?`${latest.actor.name}等${n}位小伙伴`:`${latest.actor.name}`)+({like:'赞了',favorite:'收藏了',share:'分享了',follow_build:'跟拼了',praise:'夸了夸',expert_comment:'评论了',follow:'关注了'}[m.type])+(m.type==='follow'?'你':`你的${objectLabel(m)}「${m.object.name}」`):title(s,m)};
 push.specialPush=latest.specialPush||null;
 if(latest.specialPush==='first_follow'){
  push.title='你的创意，第一次有人跟着拼啦！';
  push.body=`${latest.actor.name}跟拼了你的造型「${m.object.name}」。去看看TA的作品吧！`;
  if(s.firstFollow)s.firstFollow.locked=true;
 }else push.body=m.type==='follow'&&n>1?'来看看，哪些新朋友关注了你。':pushGuide(m.type);
 if(!personalPush(latest)){const r=round(s);s.ordinaryRound={start:r.start??s.now,used:r.used+1};}
 events.forEach(e=>e.handled=true);s.pushes.push(push);if(!personalPush(latest))s.lastPush=s.now;return push;
}
export function clickPush(s,id){if(!s.pushes.some(p=>p.id===id))return false;s.ordinaryRound=null;s.mode='foreground';return true;}
function releaseAt(t){const hour=new Date(t+8*HOUR).getUTCHours();return Date.parse(localDate(t+(hour>=21?DAY:0))+'T07:00:00+08:00');}
export function flushQueue(s,incoming=null){
 s.queue=s.queue.filter(id=>{const e=s.events.find(e=>e.id===id);return e&&pending(s,e);});
 if(!pushGate(s))return null;
 // All overdue quiet-period items share one catch-up opportunity, not one per day/type.
 const quiet=s.events.filter(e=>e.quietUntil&&e.quietUntil<=s.now&&!e.quietReleased);
 let sent=null;
 if(quiet.length){
  const candidates=quiet.filter(e=>pending(s,e)).sort(compareNotifications);
  const e=candidates.find(e=>pushEligible(s,e));if(!e&&candidates.length)return null;
  if(e)sent=recordPush(s,eventMessage(s,e),[e]);
  quiet.forEach(e=>{e.quietReleased=true;e.handled=true;});
  s.queue=s.queue.filter(id=>!quiet.some(e=>e.id===id));
  if(sent)return sent;
 }
 const candidates=s.queue.map(id=>s.events.find(e=>e.id===id)).filter(e=>pending(s,e)&&!e.quietUntil);
 if(incoming&&pending(s,incoming)&&!incoming.quietUntil){
  // A new interaction can trigger an eligible older interaction of higher priority.
  // Merely advancing the clock still does not send an ordinary interaction.
  candidates.push(...s.events.filter(e=>isInteraction(e)&&pending(s,e)&&!e.quietUntil));
 }
 candidates.sort(compareNotifications);
 for(const e of candidates){
  const m=eventMessage(s,e);if(!pending(s,e)||!pushEligible(s,e))continue;
  const events=isInteraction(m)&&!personalPush(e)?s.events.filter(x=>x.messageId===m.id&&!personalPush(x)&&pending(s,x)&&(!x.quietUntil||x.quietReleased)):[e];
  sent=recordPush(s,m,events);s.queue=s.queue.filter(id=>!events.some(x=>x.id===id));
  // The interval gate blocks another ordinary Push, but not exempt personal results.
 }
 return sent;
}
export function seedHistoricalFollow(s){s.firstFollow={historical:true,locked:true};}
function isFirstFollowCandidate(s,e){
 const first=s.firstFollow;
 return e.type==='follow_build'&&!!e.work&&e.actor.id!==s.account&&!first?.historical&&!first?.locked&&
  (!first||e.at<first.at);
}
function registerFirstFollow(s,m,e){
 if(!isFirstFollowCandidate(s,e))return;
 const first=s.firstFollow;
 if(first){const previous=s.events.find(x=>x.id===first.eventId);if(previous)delete previous.specialPush;const old=findMessage(s,first.messageId);if(old){old.popup=false;old.popupPersistent=false;delete old.popupKind;delete old.firstFollowEventId;}}
 s.firstFollow={messageId:m.id,eventId:e.id,at:e.at,locked:false};
 m.popup=true;m.popupPersistent=true;m.popupKind='first_follow';m.popupState='pending';m.firstFollowEventId=e.id;
 e.specialPush='first_follow';
}
export function targetValid(s,m){return !m.deleted&&!m.offline&&m.targetAvailable&&(m.popupPersistent||valid(s,m));}
export function popupValid(s,m){return targetValid(s,m)&&deliveryActive(s,m)&&(m.popupPersistent||(s.now>=m.popupStart&&s.now<m.popupEnd));}
export function receive(s,input){
 const type=input.type;if(!TYPES[type])throw Error('Unknown message type');
 if(!allowedKinds(type).includes((input.object||OBJECTS.wheel).kind))return null;
 if(input.recipient&&input.recipient!==s.account)return null;
 if((type==='review'?input.approved===true:input.approved===false)||input.formal===false||input.valid===false)return null;
 if(input.id&&s.events.some(e=>e.id===input.id))return eventMessage(s,s.events.find(e=>e.id===input.id));
 const object={...(input.object||OBJECTS.wheel)},at=input.at??s.now,actor=input.actor||{id:'official',name:'Zometool官方',color:'#4ea5df'};
 const prior=s.events.find(e=>e.type===type&&e.object.id===object.id&&e.actor.id===actor.id);
 if(prior&&['like','favorite','follow','follow_build'].includes(type))return eventMessage(s,prior);
 const e={...input,id:input.id||`event-${++s.seq}`,type,at,object,actor,handled:false,viewed:false};
 const interaction=INTERACTIONS.includes(type),aggregate=interaction&&type!=='expert_comment'&&!isFirstFollowCandidate(s,e);
 let m=aggregate?s.messages.findLast(m=>valid(s,m)&&unread(m)&&m.popupKind!=='first_follow'&&m.type===type&&m.object.id===object.id&&at>=m.createdAt&&at-m.createdAt<HOUR):null;
 if(!m){
  const publishedAt=input.publishedAt??at,deliveryExpiresAt=input.deliveryExpiresAt??input.expiresAt??at+90*DAY;
  m={id:`message-${++s.seq}`,order:s.seq,type,object,category:interaction?'feedback':'system',source:interaction?(object.kind==='model'||object.kind==='remix'?'造型库':'作品圈'):'Zometool官方',createdAt:at,latestAt:at,expiresAt:at+90*DAY,publishedAt,deliveryExpiresAt,events:[],readIds:[],popup:PERSONAL.includes(type)||(input.popup===true&&!interaction&&type!=='review'),popupState:'pending',popupStart:Math.max(publishedAt,input.popupStart??at),popupEnd:Math.min(deliveryExpiresAt,input.popupEnd??deliveryExpiresAt),popupPersistent:PERSONAL.includes(type),targetAvailable:true,title:interaction?undefined:input.title,text:interaction?undefined:input.text};
  s.messages.push(m);
 }
 e.messageId=m.id;m.events.push(e.id);m.latestAt=Math.max(m.latestAt,at);s.events.push(e);
 registerFirstFollow(s,m,e);
 if(input.silent)return m;
 if(input.push!==false){
  if(!sendingHours(s.now)){e.quietUntil=releaseAt(s.now);}
  else if(!interaction||personalPush(e))s.queue.push(e.id);
  flushQueue(s,interaction?e:null);
 }
 return m;
}
export function view(s,id){
 const m=findMessage(s,id);if(!m||(!valid(s,m)&&!popupValid(s,m)))return false;
 const ids=m.events;
 m.readIds=[...new Set([...m.readIds,...ids.filter(id=>m.events.includes(id))])];
 s.events.filter(e=>ids.includes(e.id)).forEach(e=>{e.viewed=true;e.handled=true;});
 completeReminder(s,m);return true;
}
// Sort feedback from the same received batch before choosing the first celebration.
export function receiveBatch(s,inputs){
 const mode=s.mode;s.mode='foreground';
 const messages=[...inputs].sort((a,b)=>(a.at??s.now)-(b.at??s.now)||String(a.id||'').localeCompare(String(b.id||''))).map(input=>receive(s,input));
 s.mode=mode;flushQueue(s);return messages;
}
export function pushDestination(s,p){
 const m=findMessage(s,p.messageId),events=p.eventIds.map(id=>s.events.find(e=>e.id===id)).filter(Boolean);
 if(m?.type==='follow'&&new Set(events.map(e=>e.actor.id)).size>1)return {kind:'message',messageId:m.id};
 return {kind:'target',messageId:m?.id,actor:m?.type==='follow'?events.at(-1)?.actor:null,commentId:m?.type==='praise'?p.latestEventId:null};
}
function completeReminder(s,m){m.popupState='completed';if(m.popupKind==='first_follow'&&s.firstFollow)s.firstFollow.locked=true;}
export function readAll(s,category){list(s,category).forEach(m=>{m.readIds=[...m.events];completeReminder(s,m);});}
export function remove(s,id){const m=findMessage(s,id);if(!m)return;m.deleted=true;completeReminder(s,m);details(s,m).forEach(e=>e.handled=true);}
export function removeRead(s,category){list(s,category).filter(m=>!unread(m)).forEach(m=>remove(s,m.id));}
export function advance(s,ms){s.now+=ms;flushQueue(s);}
// Leaving the home screen does not dismiss an unhandled reminder.
export function suspendPopup(s,launch){
 for(const m of s.messages)if(m.popupState==='shown'&&m.popupDevice===launch.device)m.popupState='pending';
 launch.shown=null;
}
export function homePopup(s,launch){
 if(!s.loggedIn)return null;
 const active=findMessage(s,launch.shown);
 if(active?.popupState==='shown'&&popupValid(s,active))return null;
 launch.shown=null;
 launch.screened=true;
 const candidates=s.messages.filter(m=>m.popup&&m.popupState==='pending'&&popupValid(s,m)&&s.now>=m.popupStart&&(m.popupPersistent||s.now<m.popupEnd));
 // One official popup per launch comes first; then continue all personal reminders.
 const m=candidates.filter(m=>m.popupPersistent||!launch.officialChecked).sort(compareNotifications)[0];
 if(m&&!m.popupPersistent)launch.officialChecked=true;
 if(m){launch.shown=m.id;launch.specialChain=!!m.popupPersistent;m.popupState='shown';m.popupDevice=launch.device;if(m.popupKind==='first_follow')s.firstFollow.locked=true;}
 return m||null;
}
export function closePopup(s,id){const m=findMessage(s,id);if(m)completeReminder(s,m);}
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
 add('honor',OBJECTS.self,90);add('growth_star',OBJECTS.self,100);add('selected',OBJECTS.wheel,120);
 for(const [i,type] of ['like','favorite','share','praise'].entries())for(const object of [OBJECTS.wheel,OBJECTS.remix])people.forEach((actor,j)=>add(type,object,40-i*5-j,{actor,text:type==='praise'?['这件作品太有创意了！','颜色搭配真好看！','这个结构很稳，太棒啦！'][j]:undefined}));
 add('praise',OBJECTS.wheel,21,{actor:people[0],text:'我也想试试这个造型！'});
 for(const type of ['favorite','share','follow_build'])people.forEach((actor,j)=>add(type,OBJECTS.bridge,50-j,{actor,work:type==='follow_build'?{id:`work-${j}`,name:['蓝色小城','小石头的作品','摩天轮练习'][j],icon:['🌁','🏗️','🎡'][j]}:undefined}));
 for(const object of [OBJECTS.wheel,OBJECTS.remix])add('expert_comment',object,100,{actor:{id:'expert',name:'橙子',color:'#e8a34d'},text:'结构很稳定！试试加高底座，看看会有什么变化。'});
 people.forEach(actor=>add('follow',OBJECTS.self,80,{actor}));
 for(const type of ['model_batch','course','feature','marketing']){const m=add(type,OBJECTS.castle,180+count);view(s,m.id);}
 s.events.forEach(e=>e.handled=true);s.seq+=100;return s;
}

export const PUSH_GUIDES={"like": "来看看，是谁喜欢你的创意。", "favorite": "点开看看，谁把它加入了收藏。", "share": "你的灵感正在传递，来看看谁分享了它。", "follow_build": "快来看看，小伙伴跟着你拼出了什么。", "praise": "来收下这份鼓励，看看谁在夸你。", "expert_comment": "点开读读，达人给你留了什么建议。", "follow": "去认识一下，刚刚关注你的新朋友。", "admission": "去造型库看看，更多小伙伴可以跟着你拼啦。", "honor": "到个人主页，看看你的共创达人标识。", "growth_star": "来看看，属于你的成长之星故事。", "selected": "去合集逛逛，看看你的作品和大家的创意。", "review": "点开查看调整建议，改好后就能重新提交。", "model_batch": "挑一款喜欢的新造型，开始下一次拼搭吧。", "feature": "来试试新功能，看看创作能多方便。", "course": "来学一招，下次拼搭就能用上。", "activity": "点开看看玩法，一起来参加吧。", "collection": "逛逛这期作品集，找找下一件想拼的作品。", "marketing": "点开了解活动详情，挑选感兴趣的内容。"};
export function pushGuide(type){return PUSH_GUIDES[type]||"打开查看详情。";}
