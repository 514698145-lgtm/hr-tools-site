import {createFeedbackApi} from './feedback-api.mjs';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {isIP} from 'node:net';
import path from 'node:path';
const root=path.resolve('dist'),port=Number(process.env.PORT||4321);
const trialOrigin=process.env.HR_TRIAL_ORIGIN||'',trialPort=Number(process.env.HR_TRIAL_PORT||4322);
if(trialOrigin&&!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(trialOrigin))throw Error('Invalid trial origin');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.zip':'application/zip','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
// Both listeners share one API instance: only one writer owns the local databases.
const feedback=await createFeedbackApi({directory:process.env.FEEDBACK_DATA_DIR||path.resolve('.local'),publicOrigin:req=>req.trialOrigin||process.env.HR_PUBLIC_ORIGIN||'http://'+req.headers.host});
const toolIds=JSON.parse(await readFile(path.resolve('config/tools.json'),'utf8')).map(t=>t.id).concat(['hr-templates','official-sites','contract-reminders','relax','mbti']);
function listener(trial=false){return async(req,res)=>{try{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!/^127\.0\.0\.1(?::[0-9]+)?$|^localhost(?::[0-9]+)?$/.test(req.headers.host||'')){res.writeHead(403);res.end();return;}
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname).replaceAll('\\','/');
 if(trial){
  req.trialOrigin=trialOrigin;
  const ip=req.headers['cf-connecting-ip'];if(typeof ip==='string'&&isIP(ip))req.trialClientIp=ip;
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(/^\/(?:api\/)?admin(?:\/|$)/i.test(pathname)){res.writeHead(404);res.end('Not found');return;}
  // Quick tunnels do not carry SSE. Explicitly select the client's polling fallback.
  if(pathname==='/api/game/events'){res.writeHead(204);res.end();return;}
 }
 if(pathname.split('/').some(part=>part.startsWith('.'))){res.writeHead(404);res.end('Not found');return;}
 if(await feedback(req,res,url,toolIds))return;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 let file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep))throw Error('path');
 let info;try{info=await stat(file);}catch{}if(info?.isDirectory())file=path.join(file,'index.html');
 const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch{let data='Not found';try{data=await readFile(path.join(root,'404.html'));}catch{}res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(data);}};}
http.createServer(listener()).listen(port,'127.0.0.1',()=>console.log(`HR Workspace preview: http://127.0.0.1:${port}`));
if(trialOrigin)http.createServer(listener(true)).listen(trialPort,'127.0.0.1',()=>console.log(`HR Workspace trial: ${trialOrigin}`));
