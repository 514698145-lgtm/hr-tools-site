import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {createGameApi} from './game-api.mjs';
const id=()=>randomBytes(16).toString('hex'),stamp=()=>new Date().toISOString();
const digest=s=>createHash('sha256').update(String(s)).digest('hex');
const categories=['使用问题','功能建议','数据纠错'],statuses=['待查看','处理中','已解决','暂不支持'];
const nicknameStarts=['灵感满格','元气在线','认真摸鱼','准点下班','快乐排班','从容开工','机智补位','温柔协作','表格达人','咖啡续航','闪光点子','淡定通关'];
function anonymousName(publicId,used){
 const start=randomBytes(1)[0]%nicknameStarts.length;
 for(let i=0;i<nicknameStarts.length;i++){
  const name=nicknameStarts[(start+i)%nicknameStarts.length]+'HR·'+publicId;
  if(!used.has(name))return name;
 }
 let name;do{name='HR同学·'+randomBytes(5).toString('hex').toUpperCase();}while(used.has(name));return name;
}
export async function createFeedbackApi({directory=path.resolve('.local'),password=process.env.HR_ADMIN_PASSWORD,publicOrigin=process.env.HR_PUBLIC_ORIGIN}={}){
 await mkdir(directory,{recursive:true});
 if(!password){const file=path.join(directory,'admin-password.txt');try{password=(await readFile(file,'utf8')).trim();}catch(e){if(e.code!=='ENOENT')throw e;password=randomBytes(24).toString('base64url');await writeFile(file,password,{mode:0o600,flag:'wx'});}console.log('本地留言管理密码保存在 '+file+'；请勿提交或分享此文件。');}
 const file=path.join(directory,'feedback.json');let db={version:2,items:[],users:[],events:[]};
 try{const old=JSON.parse(await readFile(file,'utf8'));db=Array.isArray(old)?{version:2,items:old.map(x=>({...x,author:null,category:'使用问题',status:'待查看',likes:[],reports:[],replies:x.replies.map(r=>({...r,id:id(),author:null,role:'admin',hidden:false,reports:[]}))})),users:[],events:[]}:old;if(db.version!==2||!['items','users','events'].every(k=>Array.isArray(db[k])))throw Error('留言数据格式错误');}catch(e){if(e.code!=='ENOENT')throw e;}
 const sessions=new Map(),limits=new Map();let queue=Promise.resolve();
 const save=fn=>{const task=queue.then(async()=>{const next=structuredClone(db),result=fn(next);await writeFile(file+'.tmp',JSON.stringify(next,null,2),{mode:0o600});await rename(file+'.tmp',file);db=next;return result;});queue=task.catch(()=>{});return task;};
 // Upgrade only the shared legacy default; keep identity credentials, history and chosen names.
 if(db.users.some(u=>u.nameKind!=='custom'&&(!u.name||u.name==='认真工作的HR')))await save(next=>{
  const used=new Set(next.users.map(u=>u.name));
  for(const u of next.users)if(u.nameKind!=='custom'&&(!u.name||u.name==='认真工作的HR')){u.name=anonymousName(u.publicId,used);u.nameKind='generated';used.add(u.name);}
 });
 const send=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
 const limited=(key,max)=>{const now=Date.now();for(const [k,v]of limits)if(now-v.start>300000)limits.delete(k);const l=limits.get(key)||{start:now,count:0};l.count++;limits.set(key,l);return l.count>max;};
 const text=(value,max=1000)=>{if(typeof value!=='string'||value.trim().length<2||value.trim().length>max)throw Error('内容需为2—'+max+'个字符');return value.trim();};
 const person=uid=>{const u=db.users.find(u=>u.id===uid);return u?{id:u.publicId,name:u.name}:{id:'',name:'早期匿名用户'};};
 const visibleEvents=uid=>db.events.filter(e=>e.user===uid&&db.items.some(x=>x.id===e.item&&!x.hidden&&(!e.reply||x.replies.some(r=>r.id===e.reply&&!r.hidden))));
 const itemView=(x,user,admin=false)=>({id:x.id,tool:x.tool,message:x.message,category:x.category,status:x.status,createdAt:x.createdAt,author:person(x.author),mine:!!user&&x.author===user.id,likeCount:x.likes.length,liked:!!user&&x.likes.includes(user.id),...(admin?{hidden:x.hidden,reportCount:x.reports.length}:{}),replies:x.replies.filter(r=>admin||!r.hidden).map(r=>({id:r.id,message:r.message,createdAt:r.createdAt,role:r.role,author:r.role==='admin'?{id:'',name:'官方回复'}:person(r.author),replyTo:r.replyTo||null,...(admin?{hidden:r.hidden,reportCount:r.reports.length}:{})}))});
 const notify=(next,item,actor,kind,reply=null)=>{
  const recipients=new Set([item.author,...item.replies.filter(r=>!r.hidden).map(r=>r.author)].filter(u=>u&&u!==actor));
  for(const user of recipients){next.events.push({id:id(),user,item:item.id,reply,kind,createdAt:stamp(),read:false});const mine=next.events.filter(e=>e.user===user);if(mine.length>100){const expired=new Set(mine.slice(0,-100).map(e=>e.id));next.events=next.events.filter(e=>!expired.has(e.id));}}
 };
 const game=await createGameApi({directory,person});
 return async(req,res,url,validTools)=>{
  if(!url.pathname.startsWith('/api/'))return false;
  const origin=(typeof publicOrigin==='function'?publicOrigin(req):publicOrigin)||'http://'+req.headers.host,secure=origin.startsWith('https:')?'; Secure':'';
  const cookie=(name,value,age)=>`${name}=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${age}${secure}`;
  if(!['GET','POST'].includes(req.method)){send(res,405,{error:'不支持的请求方式'});return true;}
  if(req.method==='POST'&&req.headers.origin!==origin){send(res,403,{error:'请求来源不匹配'});return true;}
  try{
   let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192){send(res,413,{error:'内容过长'});return true;}}try{body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw Error();}catch{throw Error('请求格式无效');}}
   for(const [k,v]of sessions)if(v<Date.now())sessions.delete(k);
   const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')));
   const session=cookies.hr_admin,admin=sessions.has(session),user=db.users.find(u=>u.tokenHash===digest(cookies.hr_anon||''));
   const requireUser=()=>{if(!user)throw Error('请先建立匿名身份，再提交');};
   const throttle=(action,max)=>{if(limited(action+':ip:'+(req.trialClientIp||req.socket.remoteAddress),max*4)||limited(action+':user:'+user?.id,max))throw Error('操作太频繁，请5分钟后再试');};
   if(await game({req,res,url,body,user,admin,send,requireUser,throttle}))return true;
   if(url.pathname==='/api/admin/login'&&req.method==='POST'){
    if(limited('login:'+(req.trialClientIp||req.socket.remoteAddress),10)){send(res,429,{error:'尝试次数过多，请5分钟后再试'});return true;}
    if(!timingSafeEqual(Buffer.from(digest(body.password)),Buffer.from(digest(password)))){send(res,401,{error:'密码不正确'});return true;}
    const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*3600000);send(res,200,{ok:true},{'Set-Cookie':cookie('hr_admin',token,28800)});return true;
   }
   if(url.pathname==='/api/admin/logout'&&req.method==='POST'){sessions.delete(session);send(res,200,{ok:true},{'Set-Cookie':cookie('hr_admin','',0)});return true;}
   if(url.pathname==='/api/identity'&&req.method==='POST'){
    if(user){if(body.name!==undefined){const name=text(body.name,18);if(/官方|管理员|客服/.test(name))throw Error('昵称不能包含官方身份称呼');throttle('rename',10);await save(next=>{if(next.users.some(u=>u.id!==user.id&&u.name===name))throw Error('这个昵称已被使用，换一个试试');const target=next.users.find(u=>u.id===user.id);target.name=name;target.nameKind='custom';});game.identityChanged();}send(res,200,{identity:person(user.id)});return true;}
    if(limited('identity:'+(req.trialClientIp||req.socket.remoteAddress),20)){send(res,429,{error:'创建身份太频繁，请稍后再试'});return true;}
    const token=randomBytes(32).toString('base64url');const result=await save(next=>{if(next.users.length>=50000)throw Error('服务容量已满，请联系管理员');let publicId;do{publicId=randomBytes(4).toString('hex').toUpperCase();}while(next.users.some(u=>u.publicId===publicId));const u={id:id(),publicId,name:anonymousName(publicId,new Set(next.users.map(u=>u.name))),nameKind:'generated',tokenHash:digest(token),createdAt:stamp()};next.users.push(u);return u;});send(res,201,{identity:{id:result.publicId,name:result.name}},{'Set-Cookie':cookie('hr_anon',token,31536000)});return true;
   }
   if(url.pathname==='/api/me'&&req.method==='GET'){
    if(url.searchParams.get('summary')==='1'){send(res,200,{unread:user?visibleEvents(user.id).filter(e=>!e.read).length:0});return true;}
    const events=user?visibleEvents(user.id):[],notified=new Set(events.map(e=>e.item));
    const recent=user?db.items.filter(x=>!x.hidden&&(x.author===user.id||x.replies.some(r=>!r.hidden&&r.author===user.id))).slice(-100):[];
    const myItems=user?db.items.filter(x=>!x.hidden&&(notified.has(x.id)||recent.includes(x))).reverse():[];
    send(res,200,{identity:user?person(user.id):null,unread:events.filter(e=>!e.read).length,notifications:events.slice().reverse().map(({user,...e})=>e),items:myItems.map(x=>itemView(x,user))});return true;
   }
   if(url.pathname==='/api/notifications/read'&&req.method==='POST'){requireUser();if(!Array.isArray(body.ids)||body.ids.length>100)throw Error('提醒列表无效');await save(next=>{next.events.filter(e=>e.user===user.id&&body.ids.includes(e.id)).forEach(e=>e.read=true);});send(res,200,{ok:true});return true;}
   if(url.pathname==='/api/admin/feedback'){
    if(!admin){send(res,401,{error:'请先登录管理员'});return true;}
    if(req.method==='GET'){send(res,200,{items:db.items.slice().reverse().map(x=>itemView(x,user,true))});return true;}
    await save(next=>{const item=next.items.find(x=>x.id===body.id);if(!item)throw Error('留言不存在');
     if(body.action==='reply'){if(item.replies.length>=200)throw Error('评论已达200条');if(body.replyTo&&!item.replies.some(r=>r.id===body.replyTo&&!r.hidden))throw Error('回复对象不存在');const reply={id:id(),author:null,role:'admin',message:text(body.message),createdAt:stamp(),hidden:false,reports:[],replyTo:body.replyTo||null};item.replies.push(reply);notify(next,item,null,'官方回复',reply.id);}
     else if(body.action==='status'){if(!statuses.includes(body.status))throw Error('处理状态无效');if(item.status!==body.status){item.status=body.status;notify(next,item,null,'状态更新：'+body.status);}}
     else if(['hide','restore'].includes(body.action)){const target=body.replyId?item.replies.find(r=>r.id===body.replyId):item;if(!target)throw Error('评论不存在');target.hidden=body.action==='hide';}
     else if(body.action==='dismissReports'){const target=body.replyId?item.replies.find(r=>r.id===body.replyId):item;if(!target)throw Error('评论不存在');target.reports=[];}
     else throw Error('操作无效');
    });send(res,200,{ok:true});return true;
   }
   if(url.pathname==='/api/feedback'){
    const tool=req.method==='GET'?url.searchParams.get('tool'):body.tool;if(!validTools.includes(tool))throw Error('工具不存在');
    if(req.method==='GET'){send(res,200,{items:db.items.filter(x=>x.tool===tool&&!x.hidden).slice(-100).reverse().map(x=>itemView(x,user))});return true;}
    requireUser();throttle('post',5);const message=text(body.message),category=body.category||'使用问题';if(!categories.includes(category))throw Error('反馈分类无效');
    const added=await save(next=>{if(next.items.length>=10000)throw Error('留言容量已满，请管理员归档');const x={id:id(),author:user.id,tool,message,category,status:'待查看',createdAt:stamp(),hidden:false,replies:[],likes:[],reports:[]};next.items.push(x);return x;});send(res,201,{item:itemView(added,user)});return true;
   }
   if(['/api/feedback/comment','/api/feedback/like','/api/feedback/report'].includes(url.pathname)&&req.method==='POST'){
    requireUser();const action=url.pathname.split('/').at(-1);throttle(action,action==='comment'?20:30);
    await save(next=>{const x=next.items.find(x=>x.id===body.id&&!x.hidden);if(!x)throw Error('留言不存在或已隐藏');
     if(action==='like'){if(typeof body.liked!=='boolean')throw Error('点赞状态无效');x.likes=x.likes.filter(u=>u!==user.id);if(body.liked)x.likes.push(user.id);}
     if(action==='comment'){if(x.replies.length>=200)throw Error('评论已达200条');if(body.replyTo&&!x.replies.some(r=>r.id===body.replyTo&&!r.hidden))throw Error('回复对象不存在');const r={id:id(),author:user.id,role:'user',message:text(body.message),createdAt:stamp(),hidden:false,reports:[],replyTo:body.replyTo||null};x.replies.push(r);notify(next,x,user.id,'新评论',r.id);}
     if(action==='report'){const target=body.replyId?x.replies.find(r=>r.id===body.replyId&&!r.hidden):x;if(!target)throw Error('评论不存在');if(!target.reports.some(r=>r.user===user.id))target.reports.push({user:user.id,createdAt:stamp()});}
    });send(res,200,{ok:true});return true;
   }
   send(res,404,{error:'接口不存在'});
  }catch(e){const message=/ENOSPC|EACCES|ENOENT/.test(e.message)?'保存失败，请稍后重试':e.message;send(res,/太频繁/.test(message)?429:400,{error:message});}
  return true;
 };
}
