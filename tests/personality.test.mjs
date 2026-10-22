import test from 'node:test';
import assert from 'node:assert/strict';
import {EDITION,AXES,QUESTIONS,TYPES,SCENES,scoreAnswers,restoreDraft,restoreResult,funDetails} from '../public/assets/personality-engine.js';
import {personalityTool,tools} from '../public/assets/tool-catalog.js';
import {workspaceView} from '../public/assets/workspace-view.js';

test('32 original items keep dimensions and wording directions balanced in each chapter',()=>{
 assert.equal(QUESTIONS.length,32);assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,32);
 assert.equal(new Set(QUESTIONS.map(q=>q.text)).size,32);
 for(const axis of AXES){const items=QUESTIONS.filter(q=>q.axis===axis.id);assert.equal(items.length,8);assert.equal(items.filter(q=>q.direction===1).length,4);assert.equal(items.filter(q=>q.direction===-1).length,4);}
 for(let chapter=0;chapter<4;chapter++)for(const axis of AXES)assert.equal(QUESTIONS.slice(chapter*8,chapter*8+8).filter(q=>q.axis===axis.id).length,2);
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
 const missing={...good};delete missing[QUESTIONS.at(-1).id];assert.throws(()=>scoreAnswers(missing));
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

test('earlier progress keeps answers for retained questions and resumes at the first gap',()=>{
 const old={edition:'hr-personality-1',answers:Object.fromEntries(Array.from({length:18},(_,i)=>['q'+(i+1),1])),page:3,scenes:{0:1},finished:false};
 const restored=restoreDraft(old);
 assert.equal(Object.keys(restored.answers).length,14);assert.equal(restored.page,3);
 assert.equal(restored.answers.q9,undefined);assert.equal(restored.answers.q13,1);assert.deepEqual(restored.scenes,{0:1});
 const complete=restoreDraft({...old,answers:Object.fromEntries(Array.from({length:48},(_,i)=>['q'+(i+1),0])),finished:true});
 assert.equal(complete.finished,true);assert.equal(Object.keys(complete.answers).length,32);
});

test('saved results retain the original scale after shortening the questionnaire',()=>{
 for(const [edition,max]of [['hr-personality-1',24],[EDITION,16]]){
  const record={result:{version:edition},personality:{code:'ESTJ',axes:AXES.map(a=>({id:a.id,sum:max}))}};
  const result=restoreResult(record);assert.equal(result.code,'ESTJ');assert.ok(result.axes.every(a=>a.leftPercent===100));
  const halfway=structuredClone(record);halfway.personality.axes.forEach(a=>a.sum=max/2);
  assert.ok(restoreResult(halfway).axes.every(a=>a.leftPercent===75));
  assert.throws(()=>restoreResult({...record,result:{version:'unknown'}}));
  const corrupt=structuredClone(record);corrupt.personality.axes[0].sum=max+1;assert.throws(()=>restoreResult(corrupt));
 }
});
