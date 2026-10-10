// Start manually with Node; closing this process stops only its own children.
import {spawn} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {access,writeFile} from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const binary=path.join(root,'.local/tools/cloudflared.exe');
await access(binary);await access(path.join(root,'dist/index.html'));
for(const port of [4321,4322])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',()=>reject(Error(`端口 ${port} 已被占用，请先关闭现有网站预览或试用。`)));s.listen(port,'127.0.0.1',()=>s.close(resolve));});
let server,started=false,closing=false;
const record=message=>appendFileSync(path.join(root,'.local/trial-lifecycle.log'),new Date().toISOString()+' '+message+'\n','utf8');
record('trial started');
process.on('exit',code=>record('trial exited code='+code));
const tunnel=spawn(binary,['tunnel','--url','http://127.0.0.1:4322','--http-host-header','127.0.0.1:4322','--protocol','http2','--no-autoupdate'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
const stop=()=>{if(closing)return;closing=true;server?.kill();tunnel.kill();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('exit',stop);
const timeout=setTimeout(()=>{console.error('连接超时，请检查网络后重试。');stop();},60000);
let log='';
function output(chunk){
 appendFileSync(path.join(root,'.local/trial-connection.log'),chunk);process.stdout.write(chunk);log=(log+chunk.toString()).slice(-20000);
 const url=log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
 if(!url||started)return;
 started=true;clearTimeout(timeout);
 server=spawn(process.execPath,[path.join(root,'scripts/serve.mjs')],{cwd:root,windowsHide:true,env:{...process.env,HR_TRIAL_ORIGIN:url},stdio:'inherit'});
 server.on('error',e=>{console.error(e.message);stop();});server.on('exit',stop);
 writeFile(path.join(root,'.local/试用网址.txt'),url+'\n','utf8').catch(e=>console.error(e.message));
 console.log(`\n试用网址：${url}\n保持此程序运行，电脑需联网且不休眠。按 Ctrl+C 停止。\n网址重启后变化；管理员后台只在 http://127.0.0.1:4321/admin/feedback/ 开放。\n`);
}
tunnel.stdout.on('data',output);tunnel.stderr.on('data',output);
tunnel.on('error',e=>{clearTimeout(timeout);console.error(e.message);stop();});
tunnel.on('exit',(code,signal)=>{record('tunnel exited code='+code+' signal='+signal);if(!closing)process.exitCode=1;clearTimeout(timeout);stop();});
