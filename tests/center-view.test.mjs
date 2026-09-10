import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as M from '../model.mjs';
import {renderCenter,visibleEventIds} from '../center-view.mjs';

function render(type,object=M.OBJECTS.wheel,extras={}){
 const state=M.createState();
 const message=M.receive(state,{type,object,silent:true,actor:{id:'a',name:'小宇'},...extras});
 return {state,message,html:renderCenter({state,category:'all',items:M.list(state),selected:message.id})};
}
const article=html=>html.match(/<article[\s\S]*?<\/article>/)[0];
const meta=html=>article(html).split('<div class="mail-body">')[0];

test('original approved adaptation is preserved byte for byte',()=>{
 const css=readFileSync(new URL('../center.css',import.meta.url));
 assert.equal(createHash('sha256').update(css).digest('hex'),'ec0913fb34f85f84b82dbd8ebef2134563cf6927d702ef99ee8560c7dd58c887');
});
test('work and model interaction thumbnails stay in the source row',()=>{
 for(const [type,object,label] of [['favorite',M.OBJECTS.bridge,'造型'],['like',M.OBJECTS.wheel,'作品'],['praise',M.OBJECTS.remix,'作品'],['expert_comment',M.OBJECTS.wheel,'作品']]){
  const {html}=render(type,object,{text:'你的作品真有创意！'});
  assert.match(meta(html),new RegExp(`class="meta-row"[\\s\\S]*class="model-thumb meta-model-thumb" data-label="${label}"`));
  assert.equal((article(html).match(/data-object=/g)||[]).length,1);
  assert.match(meta(html),new RegExp(`data-object="${object.id}"`));
 }
});
test('follow-build keeps original model above body and works in the original gallery',()=>{
 const {html}=render('follow_build',M.OBJECTS.bridge,{work:{id:'child-work',name:'蓝色小城',icon:'🌁'}});
 assert.match(meta(html),/data-label="原造型"[\s\S]*data-object="bridge"/);
 assert.match(article(html),/class="followup-gallery"><div class="gallery-scroll">[\s\S]*class="work-img"[\s\S]*data-object="child-work" data-context="work"/);
 assert.equal((article(html).match(/class="avatar-strip"/g)||[]).length,0);
});
test('admission and new-model batches use the retained attachment area',()=>{
 for(const type of ['admission','model_batch']){
  const {html}=render(type,M.OBJECTS.castle);
  assert.match(article(html),/class="media-block batch"><div class="attachments">/);
  assert.equal((article(html).match(/class="attach-card"/g)||[]).length,type==='admission'?1:3);
 }
});
test('review keeps its work in the retained single-media area',()=>{
 const {html}=render('review');
 assert.match(article(html),/class="media-block simple"><div class="work-card"><div class="attach-card"/);
 assert.match(article(html),/data-action="target" >去修改/);
});
test('praise shows a summary and unique users beside the retained object thumbnail',()=>{
 const {state,message}=render('praise',M.OBJECTS.wheel,{text:'第一个夸赞'});
 M.receive(state,{type:'praise',object:M.OBJECTS.wheel,silent:true,actor:{id:'b',name:'可可'},text:'第二个夸赞'});
 M.receive(state,{type:'praise',object:M.OBJECTS.wheel,silent:true,actor:{id:'a',name:'小宇'},text:'第三个夸赞'});
 const html=renderCenter({state,category:'all',items:M.list(state),selected:message.id});
 assert.match(article(html),/有2个人夸了夸你的作品/);
 assert.match(article(html),/小宇和其他1位用户夸了夸你的作品/);
 assert.match(article(html),/class="avatar-strip"/);
 assert.equal((article(html).match(/class="avatar-card"/g)||[]).length,2);
 assert.doesNotMatch(article(html),/第一个夸赞|第二个夸赞|第三个夸赞|center-feedback-row|has-feedback/);
 assert.equal((article(html).match(/class="model-thumb meta-model-thumb"/g)||[]).length,1);
});
test('praise reading follows visible users across repeated events and pagination',()=>{
 const {state,message}=render('praise',M.OBJECTS.wheel,{text:'用户a的夸赞'});
 for(let i=0;i<60;i++)M.receive(state,{type:'praise',object:M.OBJECTS.wheel,silent:true,actor:{id:'a',name:'小宇'},text:`第${i}条`});
 M.view(state,message.id,visibleEventIds(state,message,50));
 assert.equal(M.unread(message),false);
 for(let i=0;i<51;i++)M.receive(state,{type:'praise',object:M.OBJECTS.wheel,silent:true,actor:{id:`user${i}`,name:`用户${i}`},text:'新的夸赞'});
 M.view(state,message.id,visibleEventIds(state,message,50));
 assert.equal(M.unread(message),true);
 M.view(state,message.id,visibleEventIds(state,message,100));
 assert.equal(M.unread(message),false);
});
test('expert comments continue to display their concrete text',()=>{
 const {html}=render('expert_comment',M.OBJECTS.wheel,{text:'试试加高底座，看看会有什么变化。'});
 assert.match(article(html),/试试加高底座，看看会有什么变化。/);
 assert.match(article(html),/class="center-feedback-row"/);
});
test('message controls retain state-driven read and navigation actions',()=>{
 const {state,message}=render('review');
 M.view(state,message.id);
 const html=renderCenter({state,category:'system',items:M.list(state,'system'),selected:message.id});
 assert.match(html,/class="game-btn disabled" data-action="read-all" disabled/);
 assert.match(html,/class="game-btn green" data-action="confirm-read" >/);
 assert.match(html,/class="delete-mail" data-action="confirm-single"/);
 assert.match(html,/class="nav-item active"[^>]*data-category="system"/);
});
