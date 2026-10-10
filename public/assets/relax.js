import {ensureFeedbackIdentity} from './feedback.js';
import {createGame,applyAction,fits,getPiece,fullLines,LABELS} from './relax-engine.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='hr-relax-v1';let run=null,pending=null,selected=0,paused=true,busy=false,sound=false,cursor=0,stream=null,connected=false,offline=false;
let saved;try{saved=JSON.parse(localStorage.getItem(KEY));}catch{}
const status=t=>$('#game-status').textContent=t;
async function api(route,body){const r=await fetch(route,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});let d;try{d=await r.json();}catch{throw Error('游戏服务暂时无法连接');}if(!r.ok)throw Error(d.error||'请求失败');return d;}
function save(){try{localStorage.setItem(KEY,JSON.stringify({run,pending,offline}));}catch{status('浏览器未允许保存；离开前请先结算。');}}
function overlay(title,text,buttons){$('#game-overlay').hidden=false;$('#game-overlay').innerHTML=`<span class="relax-emblem">✦</span><h2>${esc(title)}</h2><p>${text}</p>${buttons}`;}
const btn=(id,text,primary=true)=>`<button class="button ${primary?'primary':''}" id="${id}">${text}</button>`;
function pieceMarkup(p,slot){if(!p)return `<button class="relax-piece" disabled aria-label="${slot===3?'暂存位空着':'已放置'}"><small>${slot===3?'留个余地':'已安排'}</small></button>`;const width=Math.max(...p.cells.map(x=>x[0]))+1,height=Math.max(...p.cells.map(x=>x[1]))+1;return `<button class="relax-piece ${selected===slot?'selected':''}" data-slot="${slot}" aria-label="${slot===3?'暂存 ':''}${LABELS[p.color-1]}，${p.cells.length}格" aria-pressed="${selected===slot}"><span class="relax-shape" style="grid-template-columns:repeat(${width},1fr)">${Array.from({length:width*height},(_,i)=>`<i class="${p.cells.some(([x,y])=>x===i%width&&y===Math.floor(i/width))?'tile-'+p.color:''}"></i>`).join('')}</span><small>${LABELS[p.color-1]}</small></button>`;}
function render(){const s=run?.state||createGame(1);$('#game-score').textContent=run?s.score.toLocaleString('en-US'):'0';$('#game-lines').textContent=run?s.lines:0;$('#game-level').textContent=String(run?s.level:1).padStart(2,'0');$('#game-board').innerHTML=s.board.map((v,i)=>`<button type="button" data-cell="${i}" tabindex="${i===cursor?0:-1}" class="${v?'tile-'+v:''}" aria-label="第${Math.floor(i/8)+1}行第${i%8+1}列，${v?LABELS[v-1]:'空位'}"></button>`).join('');$('#game-rack').innerHTML=s.rack.map((p,i)=>pieceMarkup(p,i)).join('');$('#game-held').innerHTML=pieceMarkup(s.hold,3);$('#game-hold').disabled=!run||paused||busy||s.holdUsed||selected===3||!getPiece(s,selected);$('#game-pause').disabled=!run||run.finished;$('#game-finish').disabled=!run||run.finished||busy;$('#game-combo').textContent=s.combo>1?`连消 × ${s.combo}`:'';$('#game-event').textContent=!run?'每一局，都是新的安排':s.rush?'招聘旺季 · 这组大块比较多':s.nextRush===s.group+1?'下一组：招聘旺季，留一点大空间':`第 ${s.group} 组 · ${offline?'离线练习，不上榜':'慢慢安排，不用赶时间'}`;}
function tip(){const mac=/Mac|iPhone|iPad/.test(navigator.platform),mobile=matchMedia('(pointer:coarse)').matches;const tips=['声音默认关闭，快乐自己知道就好。','先打开工作页面，关键时刻才有地方切。','歇一小会儿，也记得看看远处。',...(mobile?['右上角「回到工具大厅」，这一局先替你留着。']:mac?['工作来消息？⌘ + Tab 切换应用。','⌘ + H 隐藏当前应用，稍后再回来。']:['脚步声靠近？Alt + Tab，切回已打开的工作窗口。','Win + D 显示桌面，再按一次恢复。'])];$('#game-tip-text').textContent=tips[Math.floor(Math.random()*tips.length)];}
function tone(){if(!sound)return;try{const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=650;g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.15);o.start();o.stop(ctx.currentTime+.16);o.onended=()=>ctx.close();}catch{}}
async function board(){try{const d=await api('/api/game/board');$('#board-date').textContent=d.day+' · 北京时间 00:00 换榜';$('#game-ranking').innerHTML=d.items.length?d.items.map(x=>`<li class="${x.mine?'is-me':''}"><span>${x.rank}</span><div>${esc(x.person.name)}${x.mine?' · 我':''}<small>${esc(x.person.id)}</small></div><b>${x.score.toLocaleString('en-US')}</b></li>`).join(''):'<li class="rank-empty">今天还没有上榜成绩<br>第一位整理高手，会是你吗？</li>';$('#game-mine').textContent=d.mine?`今日最佳 ${d.mine.score.toLocaleString('en-US')} 分 · 第 ${d.mine.rank} 名${d.gap?` · 距第20名 ${d.gap} 分`:''}`:'完成一局，留下今天的好成绩。';$('#board-live').textContent=(connected?'● 实时连接':'定时更新')+' · '+new Date(d.updatedAt).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai'});}catch{$('#board-live').textContent='排行榜暂未连接';$('#game-ranking').innerHTML='<li class="rank-empty">连接后展示真实榜单</li>';}}
function listen(){stream=new EventSource('/api/game/events');stream.addEventListener('change',()=>{connected=true;board();});stream.onerror=()=>{connected=false;$('#board-live').textContent='连接恢复中 · 暂用15秒更新';};}
function result(){paused=true;render();tip();overlay('这一局，安排得不错',`<strong style="font:500 36px var(--font-ui);color:#a17b30">${run.state.score.toLocaleString('en-US')}</strong> 分<br>${offline?'离线练习，不进入排行榜':run.ranked?'成绩已核验，今日榜已更新':'本局未计入今日榜（跨日或尚未放置）'}`,btn('game-start','再来一局'));board();}
async function sync(){if(!pending)return;busy=true;render();const sent=pending;try{const d=await api('/api/game/sync',sent);run=d.run;pending=null;save();if(run.finished)result();else{status('已保存 · '+(run.state.lastClear.length?`安排妥了！本步 +${run.state.lastGain} 分`:'继续给待办腾个位置'));render();}}catch(e){paused=true;save();overlay('这一局替你留着',esc(e.message),btn('game-retry','重试保存')+btn('game-recover','恢复服务器进度',false));status('尚未同步的操作保存在当前浏览器，请勿清除网站数据。');}finally{busy=false;render();}}
async function act(action){if(!run||paused||busy||pending||run.finished)return;try{const next=applyAction(run.state,action);if(next.lastClear.length)tone();pending={id:run.id,seq:run.seq,actions:[action],finish:next.over};run.state=next;save();if(!getPiece(next,selected))selected=next.rack.findIndex(Boolean);if(offline){pending=null;run.seq++;run.finished=next.over;save();render();if(next.over)result();return;}render();await sync();}catch(e){status(e.message);}}
async function start(practice=false){if(busy)return;busy=true;try{offline=practice;pending=null;if(practice){run={id:'practice',state:createGame(crypto.getRandomValues(new Uint32Array(1))[0]),seq:0,finished:false};}else{const d={identity:await ensureFeedbackIdentity()};$('#game-identity').textContent=d.identity.name+' · '+d.identity.id+' · 改昵称';run=(await api('/api/game/start',{})).run;}selected=0;paused=false;save();$('#game-overlay').hidden=true;render();tip();status(practice?'离线练习不计榜单；联网后结束本局，再开始上榜对局。':'拖动方块，或点选后放置；方块左上角对准落点。');}catch(e){overlay('暂时连不上游戏服务',esc(e.message),btn('game-start','重试连接')+btn('game-practice','先离线练习',false));}finally{busy=false;render();}}
function pause(){if(!run||run.finished||paused)return;paused=true;save();render();overlay('歇一会儿，进度还在','切屏不扣分，回来慢慢安排。',btn('game-resume','继续这一局'));}
async function finish(){if(!run||run.finished||busy)return;paused=true;overlay('收工，结算这一局？','结算后无法继续这局，可以重新开局挑战。',btn('game-confirm-finish','结算成绩')+btn('game-resume','继续玩',false));}
function preview(x,y){$('#game-board').querySelectorAll('.preview,.invalid,.preview-clear').forEach(el=>el.classList.remove('preview','invalid','preview-clear'));if(!run||paused||busy)return;const p=getPiece(run.state,selected);if(!p)return;const valid=fits(run.state,p,x,y),copy=[...run.state.board];for(const [dx,dy]of p.cells){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<8&&yy>=0&&yy<8){$(`[data-cell="${yy*8+xx}"]`)?.classList.add(valid?'preview':'invalid');if(valid)copy[yy*8+xx]=p.color;}}if(valid)for(const n of fullLines(copy).cells)$(`[data-cell="${n}"]`).classList.add('preview-clear');}
function point(e){const rect=$('#game-board').getBoundingClientRect();if(e.clientX<rect.left||e.clientX>=rect.right||e.clientY<rect.top||e.clientY>=rect.bottom)return null;return [Math.floor((e.clientX-rect.left)/rect.width*8),Math.floor((e.clientY-rect.top)/rect.height*8)];}
let drag=null,suppressClick=false;
document.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-slot]');if(!el||paused||busy)return;selected=Number(el.dataset.slot);drag={x:e.clientX,y:e.clientY,moved:false};render();});
document.addEventListener('pointermove',e=>{if(drag){drag.moved||=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8;if(drag.moved){e.preventDefault();const p=point(e);if(p)preview(...p);}}else if(e.target.closest('#game-board')){const p=point(e);if(p)preview(...p);}},{passive:false});
document.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved){suppressClick=true;setTimeout(()=>suppressClick=false,100);const p=point(e);if(p)act({type:'place',slot:selected,x:p[0],y:p[1]});}});
document.addEventListener('pointercancel',()=>{drag=null;});
$('#relax-app').addEventListener('click',async e=>{const button=e.target.closest('button');if(!button||suppressClick)return;const id=button.id;
 if(button.dataset.slot!==undefined){selected=Number(button.dataset.slot);render();return;}
 if(button.dataset.cell!==undefined){const n=Number(button.dataset.cell);cursor=n;act({type:'place',slot:selected,x:n%8,y:Math.floor(n/8)});return;}
 if(id==='game-start')start();if(id==='game-practice')start(true);
 if(id==='game-resume'&&!pending){paused=false;$('#game-overlay').hidden=true;render();}
 if(id==='game-pause')pause();if(id==='game-finish')finish();
 if(id==='game-confirm-finish'){if(offline){run.finished=true;save();result();}else{pending={id:run.id,seq:run.seq,actions:[],finish:true};save();await sync();}}
 if(id==='game-retry'){await sync();if(!pending&&!run.finished){paused=false;$('#game-overlay').hidden=true;render();}}
 if(id==='game-reload')location.reload();
 if(id==='game-recover'){
  try{const me=await api('/api/me');const d=me.identity?await api('/api/game/current'):{run:null};run=d.run;pending=null;offline=false;paused=true;save();render();if(run)overlay('已恢复服务器进度',`当前 ${run.state.score} 分，可继续这一局。`,btn('game-resume','继续这一局'));else overlay('准备好，再来一局','当前身份没有未完对局。',btn('game-start','开始放松'));}catch(err){status(err.message);}
 }
 if(id==='game-hold')act({type:'hold',slot:selected});
 if(id==='game-sound'){sound=!sound;button.textContent='声音：'+(sound?'开':'关');button.setAttribute('aria-pressed',String(sound));}
 if(id==='game-tip-toggle'){$('#game-tip').hidden=!$('#game-tip').hidden;button.textContent=$('#game-tip').hidden?'显示小贴士':'收起小贴士';}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.target.matches('input,textarea,select')){pause();save();location.href='/';return;}if(e.target.closest('#game-board')&&!paused){const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.key];if(delta){e.preventDefault();cursor=Math.max(0,Math.min(63,cursor+delta));render();$(`[data-cell="${cursor}"]`).focus();preview(cursor%8,Math.floor(cursor/8));}}});
$('#relax-exit').addEventListener('click',()=>{pause();save();});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else board();});window.addEventListener('pagehide',()=>{save();stream?.close();});window.addEventListener('pageshow',e=>{if(e.persisted)listen();});
if(matchMedia('(max-width:820px)').matches)$('#game-rank-details').open=false;
render();tip();board();listen();setInterval(()=>{if(!connected&&!document.hidden)board();},15000);
async function restore(){
 if(!saved?.run||saved.run.finished)return;
 run=saved.run;pending=saved.pending;offline=!!saved.offline;
 try{
  if(!offline){
   if(pending){await sync();if(pending)return;}
   if(run.finished){result();return;}
   const me=await api('/api/me');const d=me.identity?await api('/api/game/current'):{run:null};
   if(!d.run){run=null;pending=null;save();render();overlay('准备好，再来一局','当前身份没有未完对局。',btn('game-start','开始放松'));return;}
   run=d.run;$('#game-identity').textContent=me.identity.name+' · '+me.identity.id+' · 改昵称';
  }
  paused=true;save();render();overlay('上次的待办，还在这里',`${offline?'离线练习 · ':''}当前 ${run.state.score} 分，接着安排？`,btn('game-resume','继续这一局'));
 }catch{render();overlay('你的进度已保留','连接恢复后可继续原局。',btn('game-reload','重新连接')+btn('game-recover','恢复服务器进度',false));}
}restore();
