import {EDITION,AXES,CHAPTERS,QUESTIONS,SCENES,scoreAnswers,funDetails,restoreDraft} from './personality-engine.js';
const root=document.querySelector('#personality-app');
const KEY='hr-personality-draft',WORKSPACE='hr-workspace-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank=()=>({edition:EDITION,answers:{},scenes:{},page:0,finished:false});
let draft=blank(),storageOK=true,currentResult=null,currentScenes={},saved=false;
try{draft=restoreDraft(JSON.parse(localStorage.getItem(KEY)))||blank();}catch{storageOK=false;}
const count=()=>Object.keys(draft.answers).length;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(draft));storageOK=true;}catch{storageOK=false;}const note=document.querySelector('#personality-storage');if(note)note.textContent=storageOK?'进度仅在本机保留，随时回来继续。':'当前无法保存进度；请保持此页面打开，关闭后可能需要重新作答。';}
function focusHeading(){root.querySelector('[data-focus]')?.focus();}
function actions(){root.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>{
 const action=el.dataset.action;
 if(action==='start')startNew();
 if(action==='resume')draft.finished?showResult(scoreAnswers(draft.answers),draft.scenes):showPage();
 if(action==='back'){draft.page=Math.max(0,draft.page-1);persist();showPage();}
 if(action==='next')nextPage();
 if(action==='skip')afterScene();
 if(action==='save')saveResult(el);
 if(action==='card')downloadCard(el);
 if(action==='copy')copyResult();
 if(action==='edit'){draft.finished=false;draft.page=0;persist();showPage();}
});}
function showIntro(){
 root.innerHTML=`<section class="personality-welcome"><div class="personality-welcome-copy"><span class="personality-kicker">MEET YOUR EVERYDAY SELF</span><h2 data-focus tabindex="-1">工作有很多角色，<br>你是哪一种<span>有趣的自己？</span></h2><p>从茶水间聊到周末出逃，顺着第一感觉，走一趟小小的性格探索。</p><div class="personality-facts"><span>48 道情境题</span><span>4 个主题章节</span><span>3 个趣味彩蛋</span></div><div class="personality-start-actions">${count()?`<button class="button primary" data-action="resume">${draft.finished?'查看上次结果':`继续探索 · 已答 ${count()} / 48 题`}</button><button class="button" data-action="start">重新开始</button>`:'<button class="button primary" data-action="start">出发，认识一下自己 →</button>'}</div><p class="personality-small">预计 6—8 分钟 · 免费查看完整结果 · 无需填写姓名</p></div><div class="personality-poster" aria-hidden="true"><div class="personality-orbit"></div><span class="personality-stamp">HELLO, YOU</span><div class="personality-letter-grid"><span>E <small>or I</small></span><span>N <small>or S</small></span><span>F <small>or T</small></span><span>P <small>or J</small></span></div><p>没有标准答案<br>每一种偏好，都有自己的光</p><i class="personality-star">✦</i></div></section><div class="personality-chapters">${CHAPTERS.map(c=>`<div><small>CHAPTER ${c.mark}</small><strong>${c.name}</strong></div>`).join('')}</div><p class="personality-how">按你平时的自然习惯回答，不必选“更像理想员工”的答案。这里没有好坏，也不需要表现完美。</p>`;
 actions();
}
function startNew(){
 if(count()&&!confirm('开始新一轮探索？这会替换本页的答题进度，已保存到工作台的结果仍保留。'))return;
 draft=blank();saved=false;persist();showPage();
}
function showPage(){
 const chapter=CHAPTERS[Math.floor(draft.page/2)],start=draft.page*6;
 root.innerHTML=`<section class="personality-play"><header class="personality-play-head"><div><span class="personality-kicker">CHAPTER ${chapter.mark} / 04</span><h2 tabindex="-1" data-focus>${chapter.name}</h2><p>${chapter.line}</p></div><span class="personality-page-count">${draft.page+1}<small> / 8 组</small></span></header><div class="personality-progress-meta"><span id="personality-progress-text">已答 ${count()} / 48</span><span>选你自然会做的那一个</span></div><progress id="personality-progress" value="${count()}" max="48" aria-label="答题进度"></progress><form id="personality-form" novalidate>${QUESTIONS.slice(start,start+6).map((q,i)=>`<fieldset class="personality-question" id="${q.id}"><legend><span>${String(start+i+1).padStart(2,'0')}</span>${esc(q.text)}</legend><div class="personality-options">${[[2,'很符合'],[1,'比较符合'],[0,'说不准'],[-1,'不太符合'],[-2,'很不符合']].map(([value,label])=>`<label><input type="radio" name="${q.id}" value="${value}" aria-label="${label}" ${draft.answers[q.id]===value?'checked':''} required><span>${({比较符合:"较符合",不太符合:"较不符",很不符合:"很不符"})[label]||label}</span></label>`).join('')}</div></fieldset>`).join('')}</form><p class="personality-error" id="personality-error" role="alert"></p><div class="personality-page-actions"><button class="button" data-action="back" ${draft.page===0?'disabled':''}>← 上一组</button><button class="button primary" data-action="next">${draft.page===7?'揭晓我的性格卡 ✦':'下一组 →'}</button></div><p class="personality-small" id="personality-storage">${storageOK?'进度仅在本机保留，随时回来继续。':'当前无法保存进度；请保持此页面打开，关闭后可能需要重新作答。'}</p></section>`;
 root.querySelector('form').onsubmit=e=>e.preventDefault();
 root.querySelector('form').onchange=e=>{
  if(!QUESTIONS.some(q=>q.id===e.target.name))return;
  draft.answers[e.target.name]=Number(e.target.value);persist();
  document.querySelector('#personality-progress-text').textContent=`已答 ${count()} / 48`;
  document.querySelector('#personality-progress').value=count();
  e.target.closest('fieldset').classList.remove('personality-unanswered');
  document.querySelector('#personality-error').textContent='';
 };
 actions();focusHeading();
}
function nextPage(){
 const missing=QUESTIONS.slice(draft.page*6,draft.page*6+6).find(q=>!(q.id in draft.answers));
 if(missing){document.querySelector('#personality-error').textContent='这一组还有题目没选，按第一感觉回答就好。';const field=document.getElementById(missing.id);field.classList.add('personality-unanswered');field.querySelector('input').focus();return;}
 if(draft.page===7){draft.finished=true;persist();saved=false;showResult(scoreAnswers(draft.answers),draft.scenes);return;}
 if(draft.page%2===1){showScene(Math.floor(draft.page/2));return;}
 draft.page++;persist();showPage();
}
function showScene(i){
 const scene=SCENES[i];
 root.innerHTML=`<section class="personality-scene"><span class="personality-kicker">A LITTLE INTERMISSION · 彩蛋 ${i+1} / 3</span><span class="personality-scene-symbol" aria-hidden="true">${['☀','✦','↗'][i]}</span><h2 data-focus tabindex="-1">${scene.title}</h2><p>${scene.story}</p><div class="personality-scene-choices">${scene.choices.map(([title,line],n)=>`<button type="button" data-scene="${n}"><strong>${title}</strong><span>${line}</span><i aria-hidden="true">→</i></button>`).join('')}</div><p class="personality-small">选一张，留在最后的趣味卡里。彩蛋不计分。</p><button class="button ghost" data-action="skip">跳过彩蛋，继续答题 →</button></section>`;
 root.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{draft.scenes[i]=Number(b.dataset.scene);afterScene();});actions();focusHeading();
}
function afterScene(){draft.page++;persist();showPage();}
function sceneCards(scenes){return SCENES.flatMap((scene,i)=>Number.isInteger(scenes[i])&&scene.choices[scenes[i]]?[scene.choices[scenes[i]]]:[]);}
function showResult(result,scenes={},fromRecord=false){
 currentResult=result;currentScenes=scenes;
 const extras=sceneCards(scenes);
 root.innerHTML=`<section class="personality-result"><div class="personality-result-top"><div class="personality-result-card" data-family="${result.code.includes('NT')?'NT':result.code[1]==='S'?result.code[3]==='J'?'SJ':'SP':'NF'}"><span class="personality-kicker">YOUR EVERYDAY PERSONALITY</span><div class="personality-code" aria-label="本次性格倾向 ${esc(result.code)}">${esc(result.code)}</div><h2 data-focus tabindex="-1">${esc(result.name)}</h2><p>${esc(result.line)}</p><span class="personality-result-date">${fromRecord?'工作台里保存的一次探索':'本次探索完成'} · 每一种偏好都值得被看见</span><i aria-hidden="true">✦</i></div><div class="personality-dimensions"><span class="personality-kicker">FOUR LITTLE WINDOWS</span><h3>你的四扇小窗</h3>${result.axes.map(a=>`<div class="personality-dimension"><div><strong>${esc(a.title)}</strong><small>${a.letter==='X'?'本次平衡':a.close?'两边接近':'本次偏好'}</small></div><div class="personality-dimension-labels"><span>${a.left} ${esc(a.leftLabel)} ${a.leftPercent}%</span><span>${a.rightPercent}% ${esc(a.rightLabel)} ${a.right}</span></div><div class="personality-meter" role="img" aria-label="${esc(a.title)}：${esc(a.leftLabel)} ${a.leftPercent}%，${esc(a.rightLabel)} ${a.rightPercent}%"><span style="width:${a.leftPercent}%"></span></div></div>`).join('')}<p class="personality-small">这是本次回答的倾向值，不是准确率或人群排名。接近平衡时，两边表现都可能出现；X 表示本次刚好平衡。</p></div></div><div class="personality-result-intro"><h3>把性格，翻译成日常</h3><p>${esc(result.detail)}</p></div><div class="personality-fun-grid">${funDetails(result).map(([label,text],i)=>`<div><span class="personality-fun-mark">${['↟','◎','“','↗'][i]}</span><small>${label}</small><p>${esc(text)}</p></div>`).join('')}</div>${extras.length?`<section class="personality-souvenirs"><h3>这一路，你带回的小彩蛋</h3><div>${extras.map(([title,line])=>`<article><span aria-hidden="true">✧</span><strong>${esc(title)}</strong><p>${esc(line)}</p></article>`).join('')}</div></section>`:''}<div class="personality-result-actions"><button class="button primary" data-action="card">保存趣味卡片 ↓</button><button class="button" data-action="save" ${saved||fromRecord?'disabled':''}>${saved||fromRecord?'已保存在工作台':'保存到我的工作台'}</button><button class="button" data-action="copy">复制分享文案</button><button class="button ghost" data-action="start">重新探索</button>${!fromRecord?'<button class="button ghost" data-action="edit">修改我的回答</button>':''}</div><p id="personality-result-status" class="personality-small" role="status"></p><p class="personality-small">卡片只包含性格倾向和趣味描述，不包含你的逐题答案。结果仅供自我探索与娱乐，不用于招聘、绩效或心理诊断。</p></section>`;
 actions();focusHeading();
}
function saveResult(button){
 try{
  let state;try{state=JSON.parse(localStorage.getItem(WORKSPACE)||'null');}catch{}
  state=state&&typeof state==='object'&&!Array.isArray(state)?state:{};
  if(!Array.isArray(state.records))state.records=[];
  const result={label:'本次性格倾向',value:currentResult.code,unit:'',lines:currentResult.axes.map(a=>({label:`${a.title} · ${a.leftLabel} / ${a.rightLabel}`,value:`${a.leftPercent} / ${a.rightPercent}`,unit:'%'})),input:{},version:EDITION};
  state.records.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),type:'single',toolId:'mbti',title:`性格探索 · ${currentResult.code} ${currentResult.name}`,result,personality:{code:currentResult.code,axes:currentResult.axes.map(a=>({id:a.id,sum:a.sum})),scenes:{...currentScenes}}});
  localStorage.setItem(WORKSPACE,JSON.stringify(state));saved=true;button.disabled=true;button.textContent='已保存在工作台';
  document.querySelector('#personality-result-status').innerHTML='已保存到当前浏览器的<a href="/workspace/">我的工作台 →</a>';
 }catch{document.querySelector('#personality-result-status').textContent='本机存储不可用或已满，可以先下载趣味卡片。';}
}
async function copyResult(){
 const text=`我的职场趣味性格卡：${currentResult.code} · ${currentResult.name}。${currentResult.line}\n你会是什么样的自己？https://www.hrtoolkit.cn/tools/mbti/\n自编趣味问卷，非官方MBTI测评。`;
 const status=document.querySelector('#personality-result-status');
 try{await navigator.clipboard.writeText(text);status.textContent='分享文案已复制，发给朋友一起探索吧。';}
 catch{status.innerHTML=`<label>可手动复制分享文案<textarea readonly rows="4">${esc(text)}</textarea></label>`;}
}
async function downloadCard(button){
 button.disabled=true;const status=document.querySelector('#personality-result-status');
 try{
  await document.fonts.load('500 54px "HR Workspace Sans"');await document.fonts.load('400 30px "HR Workspace Sans"');
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('无法生成卡片');
  const text=(s,x,y,size=30,color='#34434c',weight=400)=>{ctx.fillStyle=color;ctx.font=`${weight} ${size}px "HR Workspace Sans", sans-serif`;ctx.fillText(s,x,y);};
  const wrap=(s,x,y,maxWidth,size=30,color='#596269')=>{let line='';for(const c of s){ctx.font=`400 ${size}px "HR Workspace Sans", sans-serif`;if(ctx.measureText(line+c).width>maxWidth){text(line,x,y,size,color);line=c;y+=size*1.65;}else line+=c;}if(line)text(line,x,y,size,color);return y+size*1.65;};
  ctx.fillStyle='#faf8f2';ctx.fillRect(0,0,1080,1440);ctx.fillStyle='#eae3ce';ctx.fillRect(0,0,1080,14);
  text('HR 工作站 / 我的趣味性格卡',76,98,28,'#8b7444');
  text(currentResult.code,70,280,144,'#34434c',500);text(currentResult.name,76,375,60,'#34434c',500);
  wrap(currentResult.line,76,452,920,32);
  funDetails(currentResult).forEach(([label,line],i)=>{const y=620+i*138;text(label,76,y,25,'#8b7444',500);wrap(line,76,y+47,928,32,'#34434c');});
  const extras=sceneCards(currentScenes);if(extras.length)text('我的小彩蛋：'+extras.map(x=>x[0]).join(' · '),76,1210,25,'#736a59');
  text('每一种偏好，都有自己的光。',76,1293,29,'#8b7444');text('www.hrtoolkit.cn/tools/mbti/',76,1354,27,'#34434c');
  text('自编趣味问卷 · 非官方MBTI测评 · 不代表能力或招聘适配度',76,1402,21,'#83827b');
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('卡片生成失败');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`性格趣味卡-${currentResult.code}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  status.textContent='卡片已生成；手机若未开始下载，可在浏览器下载列表查看。';
 }catch{status.textContent='卡片暂时无法生成，可先复制分享文案或保存到工作台。';}finally{button.disabled=false;}
}
function openSaved(){
 const id=new URLSearchParams(location.search).get('record');if(!id)return false;
 try{
  const state=JSON.parse(localStorage.getItem(WORKSPACE)||'null');
  const record=state?.records?.find(r=>r.id===id&&r.toolId==='mbti');const stored=record?.personality;
  if(!stored||!Array.isArray(stored.axes)||stored.axes.length!==4)throw Error();
  const answers={};
  // Reconstruct a score-equivalent set of responses from the saved sums, not raw answers.
  AXES.forEach(axis=>{const sum=stored.axes.find(a=>a.id===axis.id)?.sum;if(!Number.isInteger(sum)||Math.abs(sum)>24)throw Error();let remaining=Math.abs(sum);QUESTIONS.filter(q=>q.axis===axis.id).forEach(q=>{const value=Math.min(2,remaining)*Math.sign(sum);answers[q.id]=value*q.direction;remaining-=Math.abs(value);});});
  const result=scoreAnswers(answers);if(result.code!==stored.code)throw Error();
  const cleanScenes=restoreDraft({edition:EDITION,answers:{},scenes:stored.scenes})?.scenes||{};
  showResult(result,cleanScenes,true);return true;
 }catch{showIntro();const p=document.createElement('p');p.className='personality-small';p.textContent='这条本机记录暂时无法读取，可以开始一次新的探索。';root.prepend(p);return true;}
}
if(root){if(!openSaved())showIntro();}
