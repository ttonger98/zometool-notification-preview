import {firstFollowPopup} from './follow-visual.mjs?v=20260918-priority3';
import {honorBanner} from './honor-visual.mjs?v=20260918-priority3';
import * as M from './model.mjs?v=20260918-priority3';
import {renderCenter,visibleEventIds} from './center-view.mjs?v=20260918-priority3';
const demoScene=new URLSearchParams(location.search).get('demo');
const KEY='zometool-notification-demo-20260918-priority'+(demoScene?'-'+demoScene:''),LAUNCH=KEY+'-launch';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function load(){try{const data=JSON.parse(localStorage.getItem(KEY));if(data?.version===M.VERSION)return data;}catch{}return M.seeded();}
let state=load(),launch;try{launch=JSON.parse(sessionStorage.getItem(LAUNCH));}catch{}
launch??={device:crypto.randomUUID(),screened:false,shown:null};
let page='home',category='all',selected=null,order=[],layer=null,popupId=launch.shown,settings=false,targetInfo=null,preview=null,confirm=null;
let type='like',objectId='wheel',actorName='',detailLimit=50,listLimit=20,networkFail=false,imageFail=false;
const badge=n=>n?`<span class="badge">${n>99?'99+':n}</span>`:'';
const button=(label,action,cls='',data='')=>`<button class="btn ${cls}" data-action="${action}" ${data}>${label}</button>`;
const time=t=>M.formatTime(t,state.now),message=()=>M.findMessage(state,selected);
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));sessionStorage.setItem(LAUNCH,JSON.stringify(launch));}catch{toast('当前以临时会话保存体验状态');}}
async function mutate(fn){const work=async()=>{state=load();await fn(state);if(page==='home'&&!settings&&!layer&&!preview&&!confirm){const current=M.findMessage(state,popupId||launch.shown);popupId=current?.popupState==='shown'&&M.popupValid(state,current)&&current.popupDevice===launch.device?current.id:M.homePopup(state,launch)?.id||null;}persist();render();};return navigator.locks?navigator.locks.request(KEY,work):work();}
function ordered(){const all=M.list(state,category),ids=new Set(all.map(m=>m.id));const fresh=all.filter(m=>!order.includes(m.id)).map(m=>m.id);order=[...fresh,...order.filter(id=>ids.has(id))];return order.map(id=>M.findMessage(state,id));}
function selectCurrent(s,id){selected=id;detailLimit=50;const m=M.findMessage(s,id);if(m&&!networkFail)M.view(s,id);}
async function center(cat='all'){await mutate(s=>{M.suspendPopup(s,launch);s.mode='foreground';page='center';category=cat;order=M.list(s,cat).map(m=>m.id);listLimit=20;selectCurrent(s,order[0]);settings=false;popupId=null;});}
function header(title,back='home'){return `<header class="header"><h1>${page==='home'?'':`<button class="back" data-action="${back}" aria-label="返回">↩</button>`}${title}</h1><div class="header-actions">${page==='home'?`<button class="bell" data-action="center" aria-label="消息中心">消息 🔔${badge(M.stats(state).unread)}</button>`:''}<span class="build">需求同步版 · 09.18</span><button class="review-button" data-action="settings">体验设置</button></div></header>`;}
function home(){return `${header('ZOMETOOL')}<section class="home"><div class="welcome"><div><h2>今天，也来拼出新发现！</h2><p>创作、分享，收获小伙伴的鼓励。</p></div></div><div class="tiles">${[['🧩','造型库','跟着创意一起拼','library'],['🚀','作品圈','看看大家的精彩创作','works'],['📚','课程','发现更多拼搭方法','courses']].map(([icon,name,sub,key])=>`<button class="tile" data-action="home-target" data-target="${key}"><i>${icon}</i>${name}<small>${sub}</small></button>`).join('')}</div><p class="home-note">首页背景与业务目标页为交互示意。消息中心、重要提醒和状态联动使用本版规则。</p></section>`;}
function art(object,context='object'){return `<button class="art-card" data-action="preview" data-object="${esc(object.id)}" data-context="${context}" aria-label="预览${esc(object.name)}"><span class="art">${imageFail?'🧩':esc(object.icon)}</span><small>${imageFail?'默认图 · ':''}${esc(object.name)}</small></button>`;}
function person(actor){return `<button class="person" data-action="person" data-name="${esc(actor.name)}"><span class="avatar" style="background:${/^#[0-9a-f]{3,8}$/i.test(actor.color||'')?actor.color:'#72a8d2'}">${esc(actor.name.slice(0,1))}</span><span>${esc(actor.name)}</span></button>`;}
function centerHTML(){return renderCenter({state,category,items:ordered(),selected,listLimit,detailLimit,networkFail,imageFail});}
function pushCard(p){return `<button class="push-item" data-action="push" data-id="${p.id}"><small>Zometool · ${time(p.at)}</small><strong>${esc(p.title)}</strong><span class="push-copy">${esc(p.body||M.pushGuide(p.type))}</span></button>`;}
function outside(){return `${header('站外提醒演示','foreground')}<section class="outside"><h2>APP 当前处于后台</h2><p class="hint">这里展示站外 Push 的交互示意，使用体验时钟与示例事件。</p><div class="phone-notifications">${state.pushes.slice(-6).reverse().map(pushCard).join('')||'<div class="empty"><i>🔔</i><p>等待符合条件的新消息</p></div>'}</div>${button('回到 APP 首页','foreground','gold')}</section>`;}
function targetHTML(){
 const m=targetInfo.messageId?M.findMessage(state,targetInfo.messageId):null,objects=targetInfo.objects||[targetInfo.object||m?.object||M.OBJECTS.castle];
 return `${header(targetInfo.label,'back-target')}<section class="target"><div class="target-note">业务目标页 · 跳转示意</div><h2>${esc(targetInfo.name||objects[0]?.name||'精彩创作')}</h2><div class="gallery">${objects.map(o=>art(o)).join('')}</div>${m?.type==='review'?`<p>${esc(M.body(state,m))}</p>${button('选择清晰的封面','choose-cover','secondary')}${button('重新提交审核','submit-review','gold')}`:['expert_comment','praise'].includes(m?.type)?`<h3>${m.type==='praise'?'夸一夸':'达人评论'}</h3><div class="feedback">${M.details(state,m).map(e=>`<div class="feedback-row" id="feedback-${esc(e.id)}" ${e.id===targetInfo.commentId?'tabindex="-1" aria-label="本条通知最新的夸一夸"':''}>${person(e.actor)}<p>${esc(e.text)}</p></div>`).join('')}</div>`:m?.type==='honor'?'<p>共创达人身份已点亮</p>':m?.type==='growth_star'?honorBanner(m):`<p>${esc(targetInfo.description||'这里展示消息对应的内容与入口。点击返回，可继续查看消息。')}</p>`}<p class="hint">正式业务页面沿用 APP 现有流程。本页用于核对消息的点击去向。</p></section>`;
}

function honorPopup(m){const star=m.type==='growth_star';return `<div class="overlay honor-overlay"><section class="dialog honor-dialog ${star?'star-dialog':'maker-dialog'}" role="dialog" aria-modal="true" aria-labelledby="popup-title"><button class="close" data-action="close-popup" aria-label="关闭首页弹窗">×</button><div class="honor-source">Zometool官方</div>${honorBanner(m)}<div class="honor-message"><div><h2 id="popup-title">${esc(M.title(state,m))}</h2><p class="body-copy">${esc(M.body(state,m))}</p></div><button class="btn gold honor-cta" data-action="popup-target">${star?'看看我的成长故事':'查看我的身份'}</button></div></section></div>`;}

function popupHTML(m){if(m.popupKind==='first_follow')return firstFollowPopup(m,state.events.find(e=>e.id===m.firstFollowEventId));if(['honor','growth_star'].includes(m.type))return honorPopup(m);return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="popup-title"><button class="close" data-action="close-popup" aria-label="关闭首页弹窗">×</button><div class="source">Zometool官方</div><div class="art popup-art">${m.type==='admission'?m.object.icon:M.TYPES[m.type][1]}</div><h2 id="popup-title">${m.type==='admission'?'你的造型入库啦！':esc(M.title(state,m))}</h2><p class="body-copy">${esc(M.body(state,m))}</p><div class="dialog-actions">${button('稍后看','close-popup','secondary')}${button(m.type==='admission'?'看看我的造型':m.type==='collection'?'看看作品集':'去看看','popup-target','gold')}</div>${M.valid(state,m)?'<p class="hint">这条消息已为你保存在消息中心</p>':''}</section></div>`;}
const clock=()=>new Date(state.now+8*M.HOUR).toISOString().slice(0,16).replace('T',' ');
function reviewHTML(){const r=M.round(state,type),c=M.stats(state);return `<div class="overlay"><section class="dialog review-panel" role="dialog" aria-modal="true" aria-label="原型体验设置"><button class="close" data-action="close-settings" aria-label="关闭体验设置">×</button><h2>原型体验设置</h2><p class="hint">2026.09.18 需求同步版 · 示例数据。站外 Push、业务跳转和同浏览器双标签页的状态同步用于评审演示。</p><div class="control-row"><span class="pill">北京时间 ${clock()}</span><span class="pill">${state.mode==='foreground'?'APP前台':'APP后台'}</span><span class="pill">未读 ${c.unread} / 全部 ${c.total}</span></div><div class="review-grid"><section class="review-card"><h3>产生一条新消息</h3><label>消息场景<select id="demo-type">${Object.entries(M.TYPES).map(([key,v])=>`<option value="${key}" ${key===type?'selected':''}>${v[0]}</option>`).join('')}</select></label><label>关联内容<select id="demo-object">${Object.entries(M.OBJECTS).filter(([,o])=>M.allowedKinds(type).includes(o.kind)).map(([key,o])=>`<option value="${key}" ${key===objectId?'selected':''}>${o.name} · ${{model:'造型',work:'作品',remix:'跟拼作品',profile:'个人主页'}[o.kind]}</option>`).join('')}</select></label><label>互动用户（留空自动生成新用户）<input id="demo-actor" value="${esc(actorName)}" placeholder="例如：小宇"></label><div class="control-row">${button('生成新消息','generate','gold')}</div><p>个人结果自动进入首页候选；本演示生成的官方通知已开启首页弹窗。</p></section><section class="review-card"><h3>Push 轮次与体验时钟</h3><p>普通Push发送次数：已发送 ${r.used}/2 次，剩余 ${r.remaining} 次${r.ends?`<br>本轮截止：${new Date(r.ends+8*M.HOUR).toISOString().slice(11,16)}`:''}</p><p>入库、荣誉、作品入选及首次被跟拼不计入普通Push次数。点击任意Push后，普通Push已发送次数清零。</p><div class="control-row">${button('+1分钟','advance','secondary','data-minutes="1"')}${button('+5分钟','advance','secondary','data-minutes="5"')}${button('+2小时','advance','secondary','data-minutes="120"')}</div><div class="control-row">${button('下一日07:00','time-seven','secondary')}${button(new Date(state.now+8*M.HOUR).getUTCHours()<21?'今天21:00':'下一日21:00','time-night','secondary')}</div><div class="control-row">${button(state.mode==='foreground'?'切到后台':'回到前台',state.mode==='foreground'?'background':'foreground')}${button(state.notifications?'通知许可：开启':'通知许可：关闭','permission','secondary')}</div><p>普通Push至少间隔1分钟。07:00后最多补发一条，按大顺位、消息类型、时间依次选择。成长之星与共创达人同级。APP在前台或静默时段内不发送Push。</p></section><section class="review-card"><h3>首页与状态联动</h3><p>本次启动：${launch.shown?'正在展示提醒':launch.screened?'已检查首页提醒':'等待首页检查'}。<br>个人成果可依次展示，返回首页继续。首次被跟拼仅一次。</p><div class="control-row">${button('重启APP','restart','gold')}${button('打开消息中心','center')}${button('返回首页','home','secondary')}</div><div class="control-row">${button('双设备演示说明','devices','secondary')}${button('空消息场景','empty','secondary')}${button('恢复示例','reset','secondary')}${button('连续成果与首次跟拼','feedback-demo','gold')}${button('首次被跟拼Push','first-follow-push-demo','gold')}${button('多人粉丝Push','fans-push-demo','secondary')}${button('多人夸一夸Push','praise-push-demo','secondary')}</div><p class="hint">“重启APP”模拟新的进程启动；后台返回沿用当前启动记录。</p></section><section class="review-card"><h3>边界状态</h3><div class="control-row">${button(networkFail?'详情加载：失败':'详情加载：正常','network','secondary')}${button(imageFail?'图片：默认图':'图片：正常','images','secondary')}${button('当前内容下架','unavailable','secondary')}${button('90天后','expire','secondary')}${button('重复回调','duplicate','secondary')}</div><p>失败时保留阅读状态；图片异常展示默认图；普通消息90天过期；成果和首次跟拼待展示记录独立保留，目标失效后停止。</p><h3 style="margin-top:15px">站外 Push 记录（${state.pushes.length}）</h3><div class="push-feed">${state.pushes.slice(-8).reverse().map(pushCard).join('')||'<p>等待新的有效事件</p>'}</div></section></div></section></div>`;}
function otherLayer(){
 if(page==='center'&&preview){const actor=preview.context==='work'?state.events.find(e=>e.work?.id===preview.object.id)?.actor:null;return `<div class="preview-mask show" role="dialog" aria-modal="true" aria-label="图片预览"><div class="preview-close" role="button" tabindex="0" data-action="close-preview" aria-label="关闭图片预览">×</div><div class="preview-panel"><div class="preview-box" style="background:linear-gradient(135deg,#83b9f0,#daeefe)">${esc(preview.object.icon)}</div><div class="preview-caption">${esc(preview.object.name)}</div><div class="preview-user">${actor?`<div class="preview-user-avatar">${esc(actor.name.slice(0,1))}</div><span>${esc(actor.name)}</span>`:''}</div><button class="preview-go" data-action="preview-target">去看看</button></div></div>`;}
 if(page==='center'&&confirm)return `<div class="modal-mask show" role="dialog" aria-modal="true" aria-label="${confirm==='read'?'删除已读':'删除消息'}"><div class="confirm-modal"><h3>${confirm==='read'?'删除已读':'删除消息'}</h3><p>确认后，${confirm==='read'?'当前分类的已读消息':'这条消息'}将从你的消息列表移除。</p><div class="confirm-actions"><button class="game-btn blue" data-action="cancel-confirm">取消</button><button class="game-btn gold" data-action="delete">确定</button></div></div></div>`;
 if(preview){return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="图片预览"><button class="close" data-action="close-preview" aria-label="关闭图片预览">×</button><div class="art preview-art">${preview.object.icon}</div><h2>${esc(preview.object.name)}</h2>${button('去看看','preview-target','gold')}</section></div>`;}
 if(confirm)return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="${confirm==='read'?'删除已读':'删除消息'}"><h2>${confirm==='read'?'删除已读消息？':'删除这条消息？'}</h2><p class="body-copy">确认后，${confirm==='read'?'当前分类的已读消息':'这条消息'}将从你的消息列表移除。</p><div class="dialog-actions">${button('取消','cancel-confirm','secondary')}${button('确定','delete','gold')}</div></section></div>`;
 if(layer)return `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="体验说明"><button class="close" data-action="close-layer" aria-label="关闭说明">×</button><h2>${esc(layer.title)}</h2><p class="body-copy">${esc(layer.text)}</p>${layer.link?'<p class="hint"><a href="./?device=B" target="_blank" rel="noopener">打开第二个体验窗口</a></p>':''}</section></div>`;
 return '';
}
function render(){
 const scroll=$('app').querySelector('.mail-list')?.scrollTop||0,detailScroll=$('app').querySelector('.center-feedback')?.scrollTop||0;
 if(popupId){const m=M.findMessage(state,popupId);if(!m||m.popupState==='completed'||!M.popupValid(state,m))popupId=null;}
 if(page==='center'&&selected&&!M.list(state,category).some(m=>m.id===selected))selected=ordered()[0]?.id||null;
 $('center-style').media=page==='center'?'all':'not all';
 $('app').className=page==='center'?'center-root':'app';
 $('app').innerHTML=page==='home'?home():page==='center'?centerHTML():page==='target'?targetHTML():outside();
 const ml=$('app').querySelector('.mail-list');if(ml){ml.scrollTop=scroll;ml.addEventListener('scroll',()=>{if(ml.scrollTop+ml.clientHeight>=ml.scrollHeight-40&&ordered().length>listLimit){listLimit+=20;render();}},{passive:true});}
 const ds=$('app').querySelector('.center-feedback');if(ds)ds.scrollTop=detailScroll;
 const old=$('layers').querySelector('[role="dialog"]')?.getAttribute('aria-label')||$('layers').querySelector('[role="dialog"]')?.getAttribute('aria-labelledby');
 const m=popupId?M.findMessage(state,popupId):null;
 $('layers').innerHTML=otherLayer()||(settings?reviewHTML():m?popupHTML(m):'');
 const modal=$('layers').querySelector('[role="dialog"]');$('app').inert=!!modal;
 if(modal&&(old!==(modal.getAttribute('aria-label')||modal.getAttribute('aria-labelledby'))))modal.querySelector('button')?.focus();
}
async function goTarget(id,context='main',object,destination={}){
 await mutate(s=>{const m=M.findMessage(s,id);if(m&&(!M.popupValid(s,m))){toast('该内容已下架或结束');popupId=null;return;}if(networkFail){layer={title:'加载遇到问题',text:'请关闭说明后，在体验设置中恢复正常加载并重试。'};return;}if(m)M.view(s,m.id);targetInfo={returnPage:context==='popup'?'home':page,messageId:id,commentId:destination.commentId||(m?.type==='praise'?M.details(s,m).toSorted((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).at(-1)?.id:null),name:destination.actor?.name,label:m?M.target(m,context):'造型详情',object:destination.actor?{id:destination.actor.id,name:destination.actor.name,icon:'😊'}:object||m?.object,objects:m?.type==='model_batch'||m?.type==='admission'&&['main','popup'].includes(context)?s.messages.filter(x=>x.type==='admission'&&(M.valid(s,x)||x.id===m.id)).map(x=>x.object):undefined};if(m?.type==='follow_build'&&['main','popup'].includes(context))targetInfo.objects=M.details(s,m).filter(e=>e.work).map(e=>e.work);if(m?.type==='model_batch')targetInfo.objects=[M.OBJECTS.castle,M.OBJECTS.bridge,M.OBJECTS.tower];page='target';settings=false;popupId=null;preview=null;});
 if(page==='target'&&targetInfo?.commentId)requestAnimationFrame(()=>document.getElementById('feedback-'+targetInfo.commentId)?.scrollIntoView({block:'center'}));
}
function findObject(id){return M.OBJECTS[id]||state.events.find(e=>e.work?.id===id)?.work||targetInfo?.objects?.find(o=>o.id===id)||M.OBJECTS.wheel;}
async function act(action,node){
 if(action==='settings'){settings=true;render();return;}
 if(action==='close-settings'){await mutate(s=>{settings=false;});return;}
 if(action==='center'){await center();return;}
 if(action==='category'){await center(node.dataset.category);return;}
 if(action==='message'){await mutate(s=>{selectCurrent(s,node.dataset.id);});return;}
 if(action==='home'||action==='foreground'){await mutate(s=>{page='home';s.mode='foreground';settings=false;popupId=M.homePopup(s,launch)?.id||null;});return;}
 if(action==='background'){await mutate(s=>{M.suspendPopup(s,launch);popupId=null;page='outside';s.mode='background';settings=false;M.flushQueue(s);});return;}
 if(action==='close-popup'){await mutate(s=>{M.closePopup(s,popupId);popupId=M.homePopup(s,launch)?.id||null;});return;}
 if(action==='popup-target'){await goTarget(popupId,'popup');return;}
 if(action==='target'){await goTarget(selected);return;}
 if(action==='preview'){preview={object:findObject(node.dataset.object),messageId:selected,context:node.dataset.context};render();return;}
 if(action==='close-preview'){preview=null;render();return;}
 if(action==='preview-target'){const p=preview;await goTarget(p.messageId,'image',p.object);if(targetInfo&&p.context==='work')targetInfo.label='跟拼作品详情';if(targetInfo&&p.context==='original')targetInfo.label='造型详情';render();return;}
 if(action==='person'){targetInfo={label:'用户个人主页',name:node.dataset.name,description:'用户头像与昵称对应的个人主页。',object:{id:'self',name:node.dataset.name,icon:'😊'}};page='target';render();return;}
 if(action==='back-target'){if(targetInfo?.returnPage==='home'){await mutate(s=>{page='home';popupId=M.homePopup(s,launch)?.id||null;});}else await center(category);return;}
 if(action==='home-target'){targetInfo={label:{library:'造型库',works:'作品圈',courses:'课程'}[node.dataset.target],objects:node.dataset.target==='works'?[M.OBJECTS.wheel,M.OBJECTS.rocket]:[M.OBJECTS.castle,M.OBJECTS.bridge,M.OBJECTS.tower]};page='target';render();return;}
 if(action==='read-all'){await mutate(s=>M.readAll(s,category));toast('当前分类已全部标记已读');return;}
 if(action==='read-new'||action==='retry'){networkFail=false;await mutate(s=>M.view(s,selected));return;}
 if(action==='confirm-single'||action==='confirm-read'){confirm=action==='confirm-read'?'read':'single';render();return;}
 if(action==='cancel-confirm'){confirm=null;render();return;}
 if(action==='delete'){await mutate(s=>{const ids=ordered().map(m=>m.id),i=ids.indexOf(selected);if(confirm==='read')M.removeRead(s,category);else M.remove(s,selected);confirm=null;const available=new Set(M.list(s,category).map(m=>m.id));selectCurrent(s,ids.slice(i).find(id=>available.has(id))||ids.slice(0,i).reverse().find(id=>available.has(id)));});toast('消息列表已更新');return;}
 if(action==='more-list'){listLimit+=20;render();return;}
 if(action==='more-detail'){detailLimit+=50;await mutate(s=>{const m=M.findMessage(s,selected);if(m)M.view(s,m.id);});return;}
 if(action==='generate'){await mutate(s=>{const actor={id:actorName?'custom-'+actorName:'visitor-'+(++s.seq),name:actorName||'小伙伴'+s.seq,color:['#ec977b','#80b191','#8997d6'][s.seq%3]};let object=M.OBJECTS[objectId];if(!M.allowedKinds(type).includes(object.kind))object=Object.values(M.OBJECTS).find(o=>M.allowedKinds(type).includes(o.kind));const text=type==='praise'?'这件作品太有创意了！':type==='expert_comment'?'结构很稳定，试试加高底座看看吧！':undefined;M.receive(s,{type,object,actor,text,work:type==='follow_build'?{id:'work-'+s.seq,name:`${actor.name}的作品`,icon:'🌁'}:undefined,popup:!M.INTERACTIONS.includes(type)&&type!=='review'});});toast('新消息已进入消息中心');return;}
 if(action==='advance'){await mutate(s=>M.advance(s,Number(node.dataset.minutes)*M.MINUTE));return;}
 if(action==='time-seven'){await mutate(s=>{s.now=Date.parse(M.localDate(s.now+M.DAY)+'T07:00:00+08:00');M.flushQueue(s);});return;}
 if(action==='time-night'){await mutate(s=>{s.now=Date.parse(M.localDate(s.now+(new Date(s.now+8*M.HOUR).getUTCHours()>=21?M.DAY:0))+'T21:00:00+08:00');M.flushQueue(s);});return;}
 if(action==='permission'){await mutate(s=>{s.notifications=!s.notifications;M.flushQueue(s);});return;}
 if(action==='restart'){await mutate(s=>{M.suspendPopup(s,launch);launch={device:launch.device,screened:false,shown:null};s.mode='foreground';page='home';settings=false;popupId=M.homePopup(s,launch)?.id||null;});return;}
 if(action==='reset'||action==='empty'){await mutate(s=>{Object.assign(s,action==='reset'?M.seeded():M.createState());launch={device:launch.device,screened:false,shown:null};page='home';selected=null;order=[];networkFail=false;imageFail=false;popupId=M.homePopup(s,launch)?.id||null;settings=action==='empty';});return;}
 if(['first-follow-push-demo','fans-push-demo','praise-push-demo'].includes(action)){await mutate(s=>{Object.assign(s,M.createState());launch={device:launch.device,screened:false,shown:null};selected=null;order=[];networkFail=false;imageFail=false;popupId=null;page='outside';settings=false;
  if(action==='first-follow-push-demo'){s.mode='background';M.receive(s,{type:'follow_build',object:M.OBJECTS.bridge,actor:{id:'friend-a',name:'小宇'},work:{id:'first-work',name:'蓝色小城',icon:'🌁'}});}
  else {const t=action==='fans-push-demo'?'follow':'praise',o=t==='follow'?M.OBJECTS.self:M.OBJECTS.wheel;s.mode='foreground';['小宇','可可','天天'].forEach((name,i)=>{s.now+=M.MINUTE;if(i===2)s.mode='background';M.receive(s,{type:t,object:o,actor:{id:'friend-'+i,name},text:t==='praise'?['结构很有创意！','颜色搭配真好看！','我也想试试这个造型！'][i]:undefined});});}
 });return;}
 if(action==='feedback-demo'){await mutate(s=>{Object.assign(s,M.createState());const actor={id:'friend-a',name:'小宇',color:'#739ac7'};M.receive(s,{type:'admission',object:M.OBJECTS.bridge,silent:true});M.receive(s,{type:'honor',object:M.OBJECTS.self,silent:true});s.now+=M.MINUTE;M.receive(s,{type:'growth_star',object:M.OBJECTS.self,silent:true});s.now+=M.MINUTE;M.receive(s,{type:'selected',object:M.OBJECTS.wheel,silent:true});M.receive(s,{type:'activity',object:M.OBJECTS.wheel,popup:true,silent:true});M.receive(s,{type:'follow_build',object:M.OBJECTS.bridge,actor,work:{id:'first-work',name:'蓝色小城',icon:'🌁'},silent:true});launch={device:launch.device,screened:false,shown:null};page='home';settings=false;popupId=M.homePopup(s,launch)?.id||null;});return;}
 if(action==='devices'){layer={title:'双设备状态演示',text:'在同一浏览器打开第二个体验窗口。两个窗口共享示例账号的消息状态；查看、删除与关闭首页提醒会同步。每个窗口分别保存当次启动的展示次数。',link:true};settings=false;render();return;}
 if(action==='close-layer'){layer=null;render();return;}
 if(action==='network'){networkFail=!networkFail;render();return;}
 if(action==='images'){imageFail=!imageFail;render();return;}
 if(action==='unavailable'){await mutate(s=>{const m=M.findMessage(s,selected)||M.list(s)[0];if(m)m.targetAvailable=false;});toast('当前内容已设为下架状态');return;}
 if(action==='expire'){await mutate(s=>M.advance(s,90*M.DAY));return;}
 if(action==='duplicate'){await mutate(s=>{const e=s.events.at(-1);if(e)M.receive(s,e);});toast('重复事件沿用原记录');return;}
 if(action==='push'){const pushId=node.dataset.id;const p=state.pushes.find(p=>p.id===pushId);if(!p)return;const destination=M.pushDestination(state,p);await mutate(s=>{M.clickPush(s,pushId);settings=false;popupId=null;});if(destination.kind==='message'){await mutate(s=>{page='center';category='feedback';order=M.list(s,category).map(m=>m.id);listLimit=20;selectCurrent(s,p.messageId);});}else await goTarget(p.messageId,'main',undefined,destination);return;}
 if(action==='choose-cover'){toast('封面选择入口 · 示例操作');return;}
 if(action==='submit-review'){layer={title:'已提交审核',text:'作品进入审核队列。消息中心保留本次调整建议，新的审核结果将形成新的消息。'};render();return;}
}
document.addEventListener('click',e=>{const node=e.target.closest('[data-action]');if(node&&!node.disabled)act(node.dataset.action,node).catch(err=>{console.error(err);toast('操作遇到问题，请重试');});});
document.addEventListener('change',e=>{if(e.target.id==='demo-type'){type=e.target.value;if(!M.allowedKinds(type).includes(M.OBJECTS[objectId].kind))objectId=Object.values(M.OBJECTS).find(o=>M.allowedKinds(type).includes(o.kind)).id;render();}if(e.target.id==='demo-object')objectId=e.target.value;});
document.addEventListener('input',e=>{if(e.target.id==='demo-actor')actorName=e.target.value.trim();});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"][data-action]')){e.preventDefault();e.target.click();return;}const modal=$('layers').querySelector('[role="dialog"]');if(!modal)return;if(e.key==='Escape'){e.preventDefault();const action=preview?'close-preview':confirm?'cancel-confirm':layer?'close-layer':settings?'close-settings':'close-popup';act(action,{});}if(e.key==='Tab'){const focusable=[...modal.querySelectorAll('button,a,input,select,[tabindex="0"]')].filter(n=>!n.disabled);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
function setAppViewport(){
 const viewport=window.visualViewport;
 document.documentElement.style.setProperty('--app-height',`${viewport?viewport.height:window.innerHeight}px`);
 document.documentElement.style.setProperty('--app-width',`${viewport?viewport.width:window.innerWidth}px`);
}
function scheduleViewportRefresh(){[0,120,300,650].forEach(delay=>setTimeout(setAppViewport,delay));}
setAppViewport();
window.addEventListener('resize',scheduleViewportRefresh);
window.addEventListener('orientationchange',scheduleViewportRefresh);
window.visualViewport?.addEventListener('resize',scheduleViewportRefresh);
window.addEventListener('storage',e=>{if(e.key===KEY){state=load();render();}});
await mutate(s=>{M.suspendPopup(s,launch);popupId=null;s.mode='foreground';if(!popupId)popupId=M.homePopup(s,launch)?.id||null;});

if(['first-follow-push','fans-push','praise-push'].includes(demoScene))await act(demoScene+'-demo',{});

if(demoScene==='priority')await act('feedback-demo',{});
if(demoScene==='first-follow-center'){await act('first-follow-push-demo',{});await center('feedback');}
