import test from 'node:test';
import assert from 'node:assert/strict';
import {EDITION,AXES,QUESTIONS,TYPES,SCENES,scoreAnswers,restoreDraft,funDetails} from '../public/assets/personality-engine.js';
import {personalityTool,tools} from '../public/assets/tool-catalog.js';
import {workspaceView} from '../public/assets/workspace-view.js';

test('48 original items keep dimensions and wording directions balanced in each chapter',()=>{
 assert.equal(QUESTIONS.length,48);assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,48);
 assert.equal(new Set(QUESTIONS.map(q=>q.text)).size,48);
 for(const axis of AXES){const items=QUESTIONS.filter(q=>q.axis===axis.id);assert.equal(items.length,12);assert.equal(items.filter(q=>q.direction===1).length,6);assert.equal(items.filter(q=>q.direction===-1).length,6);}
 for(let chapter=0;chapter<4;chapter++)for(const axis of AXES)assert.equal(QUESTIONS.slice(chapter*12,chapter*12+12).filter(q=>q.axis===axis.id).length,3);
});
test('all sixteen direction combinations score correctly including reverse-keyed answers',()=>{
 assert.equal(Object.keys(TYPES).length,16);
 for(const code of Object.keys(TYPES)){
  const answers=Object.fromEntries(QUESTIONS.map(q=>{const index=AXES.findIndex(a=>a.id===q.axis);return[q.id,(code[index]===AXES[index].left?2:-2)*q.direction];}));
  const r=scoreAnswers(answers);assert.equal(r.code,code);assert.equal(r.name,TYPES[code].name);
  for(const axis of r.axes){assert.equal(axis.leftPercent+axis.rightPercent,100);assert.equal(Math.max(axis.leftPercent,axis.rightPercent),100);assert.equal(axis.close,false);}
  assert.equal(funDetails(r).length,4);
 }
});
test('uniform agreement and neutral answers do not fabricate a type or a percentile',()=>{
 for(const value of [-2,0,2]){const result=scoreAnswers(Object.fromEntries(QUESTIONS.map(q=>[q.id,value])));assert.equal(result.code,'XXXX');assert.equal(result.name,'多面探索家');assert.ok(result.axes.every(a=>a.close&&a.leftPercent===50));}
});
test('missing, string, non-finite, fractional and out-of-range answers are rejected',()=>{
 const good=Object.fromEntries(QUESTIONS.map(q=>[q.id,0]));
 for(const value of [undefined,null,'1',NaN,Infinity,0.5,3,-3])assert.throws(()=>scoreAnswers({...good,q1:value}));
 const missing={...good};delete missing.q48;assert.throws(()=>scoreAnswers(missing));
});
test('scene choices are optional and never affect scores',()=>{
 assert.equal(SCENES.length,3);const answers=Object.fromEntries(QUESTIONS.map(q=>[q.id,q.direction]));
 assert.deepEqual(scoreAnswers(answers),scoreAnswers({...answers,scene1:2,scene2:-200}));
});
test('corrupt or old progress is rejected and partially valid progress can resume safely',()=>{
 assert.equal(restoreDraft(null),null);assert.equal(restoreDraft({edition:'old',answers:{}}),null);
 const r=restoreDraft({edition:EDITION,answers:{q1:2,q2:'1',q3:8,q4:0,unknown:1},page:999,finished:true,scenes:{0:2,1:99,2:'1'}});
 assert.deepEqual(r.answers,{q1:2,q4:0});assert.deepEqual(r.scenes,{0:2});assert.equal(r.page,7);assert.equal(r.finished,false);
});
test('catalog and workspace treat the test as a quiz without a batch calculation promise',()=>{
 assert.equal(tools.filter(t=>t.id==='mbti').length,1);assert.equal(personalityTool.kind,'quiz');
 const markup=workspaceView({favorites:['mbti'],recent:['mbti'],records:[{id:'demo',at:'2026-10-18T12:00:00Z',type:'single',toolId:'mbti',title:'性格探索',result:{value:'ENFP',unit:''}}]},tools,r=>r.value);
 assert.match(markup,/MBTI趣味测试/);assert.match(markup,/趣味测试/);assert.match(markup,/tools\/mbti\/\?record=demo/);assert.doesNotMatch(markup,/支持批量/);
});
