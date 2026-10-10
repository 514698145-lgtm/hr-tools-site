const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function contributionRateRows({d,p,bases,range,extra=false}){
 const present=k=>d[k]!==undefined&&d[k]!==null&&String(d[k]).trim()!=='';
 const edit=(key,unit='%',fallback=p.values[key])=>`<label class="rate-control"><input type="number" inputmode="decimal" step="0.01" data-rate-field="${key}" data-auto-value="${esc(fallback??'')}" aria-label="${esc(key)}" value="${esc(present(key)?d[key]:fallback??'')}" placeholder="${fallback??'待补充'}"><span>${unit}</span></label><small data-rate-status="${key}">${present(key)?'手动':fallback!==undefined?'自动':'待补充'}</small><small class="error-text" data-rate-error="${key}"></small>`;
 const zero='<span class="rate-zero">0%</span>';
 const base=k=>{const b=bases[k];return edit(k+'Base','元',b.min!==undefined&&b.max!==undefined&&b.wage!==undefined?Math.min(b.max,Math.max(b.min,b.wage)):undefined);};
 const rows=[
 ['养老保险',edit('pensionP'),edit('pensionC'),'pension'],
 ['医疗保险',edit('medicalP'),edit('medicalC'),'medical'],
 [d.city==='北京'?'大额医疗互助':'医疗附加',zero,edit('medicalExtraC'),'medical'],
 ['生育保险',zero,edit('birthC'),'medical'],
 ['失业保险',edit('unemploymentP'),edit('unemploymentC'),'unemployment'],
 ['工伤保险',zero,edit('injuryRate'),'injury'],
 ['住房公积金',edit('fundRate'),['广州','深圳'].includes(d.city)?edit('fundCompanyRate','%',present('fundRate')?d.fundRate:undefined):edit('fundRate'),'fund']
 ];
 if(d.city==='上海')rows.push(['补充公积金',edit('supplementRate'),edit('supplementRate'),'fund']);
 const selected=rows.filter(r=>extra?['医疗附加','大额医疗互助','补充公积金'].includes(r[0]):!['医疗附加','大额医疗互助','补充公积金'].includes(r[0]));
 let html=selected.map(([name,personal,company,k])=>`<tr><th scope="row">${name}</th><td>${personal}</td><td>${company}</td><td>${/待|缺/.test(range(k))?`<span class="rate-policy-gap">${esc(range(k))}</span>`:esc(range(k))}</td><td>${base(k)}</td></tr>`).join('');
 if(!extra)return html;
 html+=`<tr><th scope="row">固定附加费 / 月</th><td>${edit('fixedP','元')}</td><td>${edit('fixedC','元')}</td><td colspan="2">月额，不乘基数</td></tr>`;
 for(const [name,a,b] of [['其他社保费用','otherSocialP','otherSocialC'],['其他公积金','otherFundP','otherFundC']])html+=`<tr class="rate-extra"><th scope="row">${name}</th><td>${edit(a,'元')}</td><td>${edit(b,'元')}</td><td colspan="2">选填，仅填尚未计入的月额</td></tr>`;
 const rounding=present('fundRounding')?d.fundRounding:p.values.fundRounding;
 html+=`<tr><th scope="row">公积金取整</th><td colspan="4"><select data-rate-field="fundRounding" data-auto-value="${esc(p.values.fundRounding??'')}" aria-label="公积金取整规则"><option value="">待确认</option><option value="0" ${String(rounding)==='0'?'selected':''}>个人、公司各四舍五入至元</option><option value="2" ${String(rounding)==='2'?'selected':''}>个人、公司各四舍五入至分</option></select><small data-rate-status="fundRounding"></small></td></tr>`;
 return html;
}
