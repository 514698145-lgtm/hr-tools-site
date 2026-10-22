import {readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {createGame,applyAction,VERSION} from '../public/assets/relax-engine.js';
export const gameDay=(time=Date.now())=>new Date(time+8*3600000).toISOString().slice(0,10);
export async function createGameApi({directory,person,now=Date.now}) {
 const file=path.join(directory,'game.json');let db={version:1,runs:[]},queue=Promise.resolve();
 try{db=JSON.parse(await readFile(file,'utf8'));if(db.version!==1||!Array.isArray(db.runs))throw Error('游戏存储格式错误');}catch(e){if(e.code!=='ENOENT')throw e;}
 const streams=new Map();
 const save=fn=>{const task=queue.then(async()=>{const next=structuredClone(db),result=fn(next);await writeFile(file+'.tmp',JSON.stringify(next),{mode:0o600});await rename(file+'.tmp',file);db=next;return result;});queue=task.catch(()=>{});return task;};
 const publicRun=r=>({id:r.id,day:r.day,state:r.state,seq:r.seq,finished:r.finished,ranked:!!r.ranked,version:VERSION});
 function leaderboard(user) {
  const day=gameDay(now()),best=new Map();
  for(const r of db.runs){if(r.day!==day||!r.ranked||r.revoked)continue;const old=best.get(r.user);if(!old||r.state.score>old.state.score||(r.state.score===old.state.score&&r.finishedAt<old.finishedAt))best.set(r.user,r);}
  const rows=[...best.values()].sort((a,b)=>b.state.score-a.state.score||a.finishedAt-b.finishedAt||a.id.localeCompare(b.id));
  let rank=0,last=-1;const ranked=rows.map((r,i)=>{if(r.state.score!==last)rank=i+1;last=r.state.score;return {rank,score:r.state.score,person:person(r.user),mine:r.user===user?.id};});
  const mine=ranked.find(x=>x.mine)||null;
  return {day,items:ranked.slice(0,20),total:rows.length,mine,gap:mine&&rows.length>=20?Math.max(0,rows[19].state.score-mine.score):null,updatedAt:new Date(now()).toISOString()};
 }
 function broadcast(){for(const res of streams.keys())res.write('event: change\ndata: {}\n\n');}
 const handle=async({req,res,url,body,user,admin,send,requireUser,throttle})=>{
  const route=url.pathname;
  if(!route.startsWith('/api/game/')&&route!=='/api/admin/game')return false;
  if(route==='/api/game/board'&&req.method==='GET'){send(res,200,leaderboard(user));return true;}
  if(route==='/api/game/events'&&req.method==='GET'){
   const ip=req.socket.remoteAddress;if(streams.size>=200||[...streams.values()].filter(x=>x===ip).length>=10){send(res,429,{error:'连接过多，请稍后重试'});return true;}
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('event: change\ndata: {}\n\n');streams.set(res,ip);
   let day=gameDay(now());const timer=setInterval(()=>{if(gameDay(now())!==day){day=gameDay(now());res.write('event: change\ndata: {}\n\n');}else res.write(': heartbeat\n\n');},15000);timer.unref();res.on('close',()=>{clearInterval(timer);streams.delete(res);});return true;
  }
  if(route==='/api/admin/game'){
   if(!admin){send(res,401,{error:'请先登录管理员'});return true;}
   if(req.method==='GET'){send(res,200,{items:db.runs.filter(r=>r.finished).slice(-200).reverse().map(r=>({id:r.id,day:r.day,person:person(r.user),score:r.state.score,moves:r.state.moves,ranked:r.ranked,revoked:!!r.revoked,finishedAt:r.finishedAt}))});return true;}
   if(!['revoke','restore'].includes(body.action))throw Error('操作无效');
   await save(next=>{const r=next.runs.find(r=>r.id===body.id&&r.finished);if(!r)throw Error('成绩不存在');r.revoked=body.action==='revoke';});broadcast();send(res,200,{ok:true});return true;
  }
  requireUser();
  if(route==='/api/game/current'&&req.method==='GET') {const r=db.runs.findLast(r=>r.user===user.id&&!r.finished);send(res,200,{run:r?publicRun(r):null});return true;}
  if(req.method!=='POST'){send(res,405,{error:'不支持的请求方式'});return true;}
  if(route==='/api/game/start'){
   throttle('game-start',40);
   const run=await save(next=>{
    const existing=next.runs.findLast(r=>r.user===user.id&&!r.finished);if(existing)return existing;
    const cutoff=gameDay(now()-7*86400000);next.runs=next.runs.filter(r=>r.day>=cutoff);if(next.runs.length>=10000)throw Error('游戏服务容量已满，请稍后再试');
    const seed=randomBytes(4).readUInt32LE();const r={id:randomBytes(16).toString('hex'),user:user.id,day:gameDay(now()),seed,state:createGame(seed),seq:0,finished:false,createdAt:now()};next.runs.push(r);return r;
   });send(res,201,{run:publicRun(run)});return true;
  }
  if(route==='/api/game/sync'){
   throttle('game-sync',600);
   if(!Number.isInteger(body.seq)||body.seq<0||!Array.isArray(body.actions)||body.actions.length>60||typeof body.finish!=='boolean')throw Error('对局提交格式无效');
   const fingerprint=createHash('sha256').update(JSON.stringify({seq:body.seq,actions:body.actions,finish:body.finish})).digest('hex');
   const run=await save(next=>{
    const r=next.runs.find(r=>r.id===body.id&&r.user===user.id);if(!r)throw Error('找不到你的对局');
    if(r.lastRequest===fingerprint)return r;
    if(r.finished)throw Error('这局已经结算');if(r.seq!==body.seq)throw Error('对局已在其他页面更新，请刷新继续');
    let s=r.state;for(const a of body.actions)s=applyAction(s,a);
    r.state=s;r.seq+=body.actions.length;r.lastRequest=fingerprint;
    if(body.finish||s.over){r.finished=true;r.finishedAt=now();r.ranked=r.day===gameDay(now())&&s.moves>0;}
    return r;
   });if(run.finished)broadcast();send(res,200,{run:publicRun(run),board:run.finished?leaderboard(user):undefined});return true;
  }
  send(res,404,{error:'游戏接口不存在'});return true;
 };
 return Object.assign(handle,{identityChanged:broadcast});
}
