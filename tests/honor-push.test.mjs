import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';
import {honorBanner} from '../honor-visual.mjs';
test('growth star title includes the result year and month across message and Push',()=>{
 const s=M.createState();s.mode='background';
 const star=M.receive(s,{type:'growth_star',object:M.OBJECTS.self});
 const expected='太棒了！你是2026年9月的Zometool成长之星！';
 assert.equal(M.GROWTH_STAR_TITLE_TEMPLATE,'太棒了！你是【年份】【月份】的Zometool成长之星！');
 assert.equal(M.title(s,star),expected);
 assert.equal(s.pushes[0].title,expected);
 M.advance(s,120*M.DAY);
 assert.equal(M.title(s,star),expected);
});
test('creator and growth star honors have distinct visual and destination',()=>{
 const s=M.createState();const creator=M.receive(s,{type:'honor',object:M.OBJECTS.self});const star=M.receive(s,{type:'growth_star',object:M.OBJECTS.self});
 assert.notEqual(M.title(s,creator),M.title(s,star));assert.match(M.target(star),/成长之星/);assert.match(M.target(creator),/共创达人/);
 assert.match(honorBanner(creator),/maker-banner/);assert.match(honorBanner(star),/star-photo/);assert.equal(M.homePopup(s,{}).id,star.id);
});
test('each message type has its own short opening prompt',()=>{
 const types=Object.keys(M.TYPES);assert.equal(new Set(types.map(M.pushGuide)).size,types.length);
 for(const type of types){const s=M.createState();s.mode='background';const object=Object.values(M.OBJECTS).find(o=>M.allowedKinds(type).includes(o.kind));M.receive(s,{type,object,actor:{id:'one',name:'小宇'}});assert.equal(s.pushes.length,1);assert.equal(s.pushes[0].body,M.pushGuide(type));assert.ok(s.pushes[0].body.length<=32);}
});
