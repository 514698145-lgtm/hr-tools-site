import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {fileURLToPath} from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
export function visibleText(html) {
  return html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
export function publicAddress(ip) {
  if (isIP(ip) === 6) {
    // Conservative: public global unicast only, excluding mapped/transition addresses.
    return /^[23][0-9a-f]{3}:/i.test(ip) && !/^200[12]:/i.test(ip);
  }
  if (isIP(ip) !== 4) return false;
  const [a,b] = ip.split('.').map(Number);
  return !(a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) ||
    (a===172&&b>=16&&b<=31) || (a===192&&(b===168||b===0)) || (a===100&&b>=64&&b<=127) || (a===198&&(b===18||b===19)));
}
async function safeUrl(raw) {
  const u = new URL(raw);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || (u.port && !['80','443'].includes(u.port))) throw Error('blocked-url');
  const records = await lookup(u.hostname, {all:true});
  if (!records.length || records.some(r=>!publicAddress(r.address))) throw Error('blocked-private-address');
  return u;
}
export function relevantLinks(html, base) {
  const found = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = visibleText(m[2]);
    if (!/社保|社会保险|缴费|基数|公积金|养老|医保|医疗保险|生育|工伤|失业|工资|个税|个人所得税|劳动|合同|补偿|通知|政策/.test(title)) continue;
    try {
      const u = new URL(m[1].replace(/&amp;/g,'&'),base); u.hash='';
      if (['https:','http:'].includes(u.protocol) && !u.username && !u.password) found.set(u.href,{url:u.href,title:title.slice(0,180)});
    } catch {}
  }
  return [...found.values()].sort((a,b)=>a.url.localeCompare(b.url));
}
export async function fetchSource(source) {
  const signal = AbortSignal.timeout(15000);
  let url = source.url;
  for(let i=0;i<5;i++) {
    await safeUrl(url);
    const response = await fetch(url,{signal,redirect:'manual',headers:{'User-Agent':'HRToolkit-PolicyWatch/1.0 (+https://www.hrtoolkit.cn)',Accept:'text/html,application/pdf,text/plain;q=0.8,*/*;q=0.5'}});
    if ([301,302,303,307,308].includes(response.status)) {
      await response.body?.cancel();
      const next = response.headers.get('location'); if (!next) throw Error('redirect-without-location');
      url = new URL(next,url).href; continue;
    }
    if (!response.ok) {await response.body?.cancel(); throw Error('http-'+response.status);}
    if(Number(response.headers.get('content-length'))>4*1024*1024) {await response.body?.cancel();throw Error('body-too-large');}
    const chunks=[]; let bytes=0;
    for await(const chunk of response.body){ bytes+=chunk.length; if(bytes>4*1024*1024)throw Error('body-too-large'); chunks.push(chunk); }
    const data=Buffer.concat(chunks),type=response.headers.get('content-type')||'';
    if(type.includes('pdf') || data.subarray(0,5).toString()==='%PDF-') return {digest:hash(data),finalUrl:url,kind:'pdf',links:[],bytes};
    if(!/html|text|json|xml/.test(type)) throw Error('unsupported-content-type');
    const head=data.subarray(0,2000).toString('ascii');
    const charset=(type+' '+head).match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]||'utf-8';
    const html=new TextDecoder(charset).decode(data),text=visibleText(html);
    if(text.length<100 || /captcha|验证码|访问验证|安全验证|访问过于频繁|网站防火墙|Access Denied|Just a moment/i.test(text.slice(0,2000)))throw Error('challenge-or-empty-page');
    return {digest:hash(text),finalUrl:url,kind:'text',links:source.discovery?relevantLinks(html,url):[],bytes};
  }
  throw Error('too-many-redirects');
}

export function reduceObservation(previous={}, observation, at) {
  if (observation.error) return {...previous,checkedAt:at,status:'failed',error:observation.error,failures:(previous.failures||0)+1};
  const changed=!!previous.digest && previous.digest!==observation.digest;
  // A pending change survives later unchanged fetches and transient failures.
  const pending=previous.pending||changed;
  return {...observation,checkedAt:at,successAt:at,status:changed?'changed':previous.digest?'unchanged':'baseline',
    previousDigest:changed?previous.digest:previous.previousDigest,changedAt:changed?at:previous.changedAt,
    pending,failures:0};
}
export function policyIssues(records, now=new Date()) {
  const monthOf=date=>{const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).formatToParts(date);return parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;};
  const month=monthOf(now),near=monthOf(new Date(now.getTime()+35*86400000));
  const groups=new Map();
  for(const r of records){ const key=r.city+'|'+(r.plan||'standard'); if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r); }
  const issues=[];
  for(const [key,rows] of groups) {
    const city=rows[0].city,plan=rows[0].plan||'standard';
    const all=plan==='standard'?rows:[...(groups.get(city+'|standard')||[]),...rows];
    const usable=all.filter(r=>r.status!=='转载待复核'), active=usable.filter(r=>r.from<=month&&r.to>=month);
    for(const field of new Set(usable.flatMap(r=>Object.keys(r.values)))){
      const current=active.filter(r=>field in r.values).at(-1);
      if(!current){ issues.push({city,plan,field,status:'no-current-value'});continue; }
      if(current.to<=near && !usable.some(r=>field in r.values&&r.from<=near&&r.to>current.to))issues.push({city,plan,field,status:'expires-soon',until:current.to,source:current.source.url});
    }
    for(const field of ['pensionMin','pensionMax','medicalMin','medicalMax','fundMin','fundMax','fundRounding']) {
      if(!active.some(r=>field in r.values) && !issues.some(i=>i.city===city&&i.plan===plan&&i.field===field))issues.push({city,plan,field,status:'coverage-gap'});
    }
  }
  return issues;
}
async function json(file,fallback){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function atomic(file,value){await writeFile(file+'.tmp',JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(file+'.tmp',file);}

export async function runWatch({manifest,stateDir,fetcher=fetchSource,now=new Date(),concurrency=6}) {
  await mkdir(stateDir,{recursive:true,mode:0o700});
  const state=await json(path.join(stateDir,'state.json'),{schema:1,sources:{}}),at=now.toISOString();
  const reviews=await json(path.join(stateDir,'reviewed.json'),{sources:{}});
  const results=[];let cursor=0;
  await Promise.all(Array.from({length:concurrency},async()=>{
    while(cursor<manifest.sources.length){const source=manifest.sources[cursor++];let observation;
      try{observation=await fetcher(source);}catch(error){observation={error:error.name==='TimeoutError'?'timeout':[error.message,error.cause?.code].filter(Boolean).join(': ').slice(0,140)};}
      const old=state.sources[source.url]||{},row=reduceObservation(old,observation,at);
      // Review acknowledgements are bound to an exact digest and real evidence.
      const ack=reviews.sources[source.url];
      if(ack?.digest===row.digest&&ack?.evidence&&ack?.reviewedAt&&!observation.error){row.pending=false;row.reviewedAt=ack.reviewedAt;}
      state.sources[source.url]=row;
      results.push({...source,...row,newLinks:(observation.links||[]).filter(x=>!(old.links||[]).some(p=>p.url===x.url))});
    }
  }));
  results.sort((a,b)=>a.url.localeCompare(b.url));
  const failures=results.filter(x=>x.status==='failed'),pending=results.filter(x=>x.pending);
  const due=manifest.reviews.filter(r=>r.reviewAfter&&r.reviewAfter<=at.slice(0,10));
  const report={schema:1,checkedAt:at,manifestDigest:hash(JSON.stringify(manifest)),
    summary:{files:manifest.files.length,sources:results.length,cities:manifest.discoveryTasks.length,
      failures:failures.length,changed:results.filter(x=>x.status==='changed').length,pending:pending.length,
      baselines:results.filter(x=>x.status==='baseline').length},
    policyIssues:policyIssues(manifest.policyRecords,now),due,results,
    nextAction:'Review official new notices for every region and content topic. Baseline/unchanged is not proof of policy validity. Never auto-copy extracted numbers.'};
  state.lastRun=at;await atomic(path.join(stateDir,'state.json'),state);
  await atomic(path.join(stateDir,'latest.json'),report);
  await atomic(path.join(stateDir,'run-'+at.replace(/[:.]/g,'-')+'.json'),report);
  const lines=['# 每周来源巡检',at,'',JSON.stringify(report.summary),'',
    '抓取状态不等于政策核验；新通知与适用范围须由每周复核任务检索。',
    `参数缺口/临期项 ${report.policyIssues.length}；到期内容 ${due.length}。`,
    '',...results.filter(x=>x.status==='failed'||x.pending||x.status==='baseline').map(x=>`- ${x.status}${x.pending?' / pending':''}: ${x.url} ${x.error||''} → ${x.files.join(', ')}`)];
  await writeFile(path.join(stateDir,'latest.md'),lines.join('\n')+'\n',{mode:0o600});
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [manifestFile='config/watch-manifest.json',stateDir='.local/policy-watch']=process.argv.slice(2);
  const manifest=JSON.parse(await readFile(manifestFile,'utf8'));
  const report=await runWatch({manifest,stateDir});console.log(JSON.stringify(report.summary));
  if(report.summary.failures)process.exitCode=2;
}
