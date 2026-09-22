import {honorBanner} from './honor-visual.mjs?v=20260923-review2';
import * as M from './model.mjs?v=20260923-review2';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const interactive='role="button" tabindex="0"';
const color=actor=>/^#[0-9a-f]{3,8}$/i.test(actor.color||'')?actor.color:'#72a8d2';
const artBackground='linear-gradient(135deg,#83b9f0,#daeefe)';
const icon=(object,imageFail)=>imageFail?'🧩':esc(object.icon);
const previewAttrs=(object,context='object')=>`${interactive} data-action="preview" data-object="${esc(object.id)}" data-context="${context}" aria-label="预览${esc(object.name)}"`;

export function visibleEventIds(state,message,limit=50){
 if(M.isInteraction(message)&&!['follow_build','expert_comment'].includes(message.type)){
  const visibleUsers=new Set(M.users(state,message).slice(0,limit).map(actor=>actor.id));
  return M.details(state,message).filter(event=>visibleUsers.has(event.actor.id)).map(event=>event.id);
 }
 return message.events.slice(0,limit);
}

function workCard(object,imageFail,context='object',imageClass='attach-card'){
 return `<div class="work-card"><div class="${imageClass}" style="background:${artBackground}" ${previewAttrs(object,context)}>${icon(object,imageFail)}</div><div class="work-name">${imageFail?'默认图 · ':''}${esc(object.name)}</div></div>`;
}
function person(actor){
 return `<div class="avatar-card" ${interactive} data-action="person" data-name="${esc(actor.name)}" aria-label="${esc(actor.name)}的个人主页"><div class="avatar-face" style="background:${color(actor)}">${esc(actor.name.slice(0,1))}</div><div class="avatar-name">${esc(actor.name)}</div></div>`;
}
function detail(s,m,{detailLimit,networkFail,imageFail}){
 if(!m)return '<div class="empty"><i>💌</i><p>暂无消息</p></div>';
 if(networkFail)return '<div class="empty"><i>☁️</i><p>加载遇到问题，点此重试</p><button class="game-btn blue" data-action="retry">重试</button></div>';
 const events=M.details(s,m),people=M.users(s,m),time=t=>M.formatTime(t,s.now);
 const showThumb=M.isInteraction(m)&&m.type!=='follow';
 const metaLabel=m.type==='follow_build'?'原造型':m.object.kind==='model'?'造型':'作品';
 const thumb=showThumb?`<div class="model-thumb meta-model-thumb" data-label="${metaLabel}" style="background:${artBackground}" ${previewAttrs(m.object)}>${icon(m.object,imageFail)}</div>`:'';
 let contents='';
 if(m.type==='expert_comment'){
  contents=`<div class="center-feedback" aria-label="具体评论内容">${events.slice(0,detailLimit).map(e=>`<div class="center-feedback-row">${person(e.actor)}<div class="center-feedback-copy"><div class="center-feedback-person"><b>共创达人${esc(e.actor.name)}</b><time>${time(e.at)}</time></div><p>${esc(e.text||'')}</p></div></div>`).join('')}${events.length>detailLimit?`<button class="more" data-action="more-detail">加载更多（剩余 ${events.length-detailLimit} 条）</button>`:''}</div>`;
 }else if(m.type==='follow_build'){
  const visible=events.filter(e=>e.work).slice(0,detailLimit),groups=[...new Map(visible.map(e=>[e.actor.id,e.actor])).values()];
  // 跟拼消息详情只展示各位跟拼者的作品，不再展示跟拼者的头像和昵称。
  contents=`<div class="followup-gallery"><div class="gallery-scroll">${groups.map(actor=>`<div class="follow-user-group"><div class="follow-user-works">${visible.filter(e=>e.actor.id===actor.id).map(e=>workCard({...e.work,name:e.work.name||`${e.actor.name}的作品`},imageFail,'work','work-img')).join('')}</div></div>`).join('')}${events.length>detailLimit?`<button class="more" data-action="more-detail">加载更多（剩余 ${events.length-detailLimit} 件）</button>`:''}</div></div>`;
 }else if(M.isInteraction(m)){
  contents=`<div class="avatar-strip"><div class="gallery-scroll">${people.slice(0,detailLimit).map(person).join('')}${people.length>detailLimit?`<button class="more" data-action="more-detail">加载更多（剩余 ${people.length-detailLimit} 人）</button>`:''}</div></div>`;
 }else if(m.type==='model_batch'||m.type==='admission'){
  const objects=m.type==='admission'?[m.object]:['castle','bridge','tower'].map(id=>M.OBJECTS[id]);
  contents=`<div class="media-block batch"><div class="attachments">${objects.map(o=>workCard(o,imageFail)).join('')}</div></div>`;
 }else if(['review','selected'].includes(m.type)){
  contents=`<div class="media-block simple">${workCard(m.object,imageFail)}</div>`;
 }else if(['honor','growth_star'].includes(m.type)){
  contents=`<div class="center-honor-visual" role="button" tabindex="0" data-action="target">${honorBanner(m)}</div>`;
 }else if(['activity','collection','course','feature','marketing'].includes(m.type)){
  contents=`<div class="activity-banner" ${interactive} data-action="target" aria-label="查看${esc(M.title(s,m))}" style="background:linear-gradient(135deg,#5D8CFF,#BFE8FF 55%,#FFE5A8)"><div class="banner-copy"><div class="banner-label">${esc(M.TYPES[m.type][0])}</div><b>${esc(M.title(s,m))}</b><span>${esc(M.body(s,m))}</span></div><div class="banner-icon">${M.TYPES[m.type][1]}</div></div>`;
 }
 const action=m.type==='follow'?'':`<button class="goto-mail" data-action="target" ${m.targetAvailable?'':'disabled'}>${m.targetAvailable?(m.popupKind==='first_follow'?'看看跟拼作品':m.type==='review'?(m.reviewStatus==='reviewing'?'查看审核进度':'去修改'):m.type==='honor'?'查看我的身份':m.type==='growth_star'?'看看我的成长故事':'去看看'):'内容已下架'}</button>`;
 const bodyText=esc(M.body(s,m));
 const bodyHtml=['honor','growth_star'].includes(m.type)?bodyText.replace(m.type==='honor'?'共创达人':'成长之星',`<button class="inline-honor-link" data-action="target">${m.type==='honor'?'共创达人':'成长之星'}</button>`):m.type==='selected'?bodyText.replace(M.COLLECTION_NAME,`<button class="inline-honor-link" data-action="target">${M.COLLECTION_NAME}</button>`):bodyText;
 return `<div class="detail-head"><h2 class="detail-title">${esc(M.title(s,m))}</h2><div class="detail-time">${time(m.latestAt)}</div></div><div class="meta-row"><span>来自：${esc(m.source)}</span>${thumb}</div><div class="mail-body">${bodyHtml}</div>${contents}<div class="detail-actions">${action}<button class="delete-mail" data-action="confirm-single">删除消息</button></div>`;
}

// Match the original prototype's DOM so center.css remains the layout authority.
export function renderCenter({state:s,category,items,selected,listLimit=20,detailLimit=50,networkFail=false,imageFail=false}){
 const st=M.stats(s,category),m=M.findMessage(s,selected);
 const tabs=[['all','全部'],['system','系统消息'],['feedback','互动消息']].map(([c,label])=>{
  const unread=M.stats(s,c).unread;
  return `<div class="nav-item ${c===category?'active':''}" ${interactive} data-action="category" data-category="${c}" aria-current="${c===category?'page':'false'}" aria-label="${label}"><span class="tab-label">${label}</span><span class="tab-badge ${unread?'show':''}">${unread>99?'99+':unread||''}</span></div>`;
 }).join('');
 const list=items.slice(0,listLimit).map(m=>`<div class="mail-item ${M.unread(m)?'unread':'read'} ${m.id===selected?'active':''}" ${interactive} data-action="message" data-id="${m.id}" aria-label="${esc(M.title(s,m))}${M.unread(m)?'，未读':'，已读'}" aria-pressed="${m.id===selected}"><div class="mail-icon">${M.TYPES[m.type][1]}</div><div class="mail-text"><h3 title="${esc(M.title(s,m))}">${esc(M.title(s,m))}</h3><p>${M.formatTime(m.latestAt,s.now)}</p></div></div>`).join('');
 const statsLine=st.total?`<div class="list-stats">已读 ${st.read}／共 ${st.total}</div>`:'';
 return `<div class="phone-frame"><div class="phone-screen"><div class="dynamic-island"></div><div class="screen-content"><div class="scene"><div class="top-title"><span class="back" ${interactive} data-action="home" aria-label="返回首页">↩</span><span>消息通知</span></div><div class="nav-line"></div><nav class="nav" aria-label="消息分类">${tabs}</nav><section class="mail-shell"><article class="detail-paper ${m?.type==='expert_comment'?'has-feedback':''}" aria-label="消息详情" data-message-id="${m?.id||''}">${detail(s,m,{detailLimit,networkFail,imageFail})}</article></section><aside class="mail-list-panel">${statsLine}<div class="mail-list">${list||`<div class="empty"><i>💌</i><p>${category==='all'?'还没有消息哦，去创作吧～':'暂无消息'}</p></div>`}${items.length>listLimit?'<button class="more" data-action="more-list">加载更多消息</button>':''}</div><div class="panel-actions"><button class="game-btn ${st.read<st.total?'read-active':'disabled'}" data-action="read-all" ${st.read<st.total?'':'disabled'}>一键已读</button><button class="game-btn green" data-action="confirm-read" ${st.read?'':'disabled'}>删除已读</button></div></aside><div class="center-tools"><button class="review-button" data-action="settings">体验设置</button></div></div></div></div></div>`;
}
