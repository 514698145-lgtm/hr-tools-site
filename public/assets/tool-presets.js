import {cityOptions} from './city-policies.js';

// Only city/month are accepted from a link. Never import salaries or policy overrides.
export function cityEntryPreset(search,toolId){
 if(toolId!=='five-insurances-housing-fund')return null;
 const p=new URLSearchParams(search);
 if(p.has('record')||!cityOptions.some(([city])=>city===p.get('city')))return null;
 const month=p.get('month');
 if(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return null;
 return {city:p.get('city'),...(month?{month}:{})};
}

export function exampleInput(examples,id,tool){
 const example=examples.find(x=>x.id===id);
 if(!example||!example.input||typeof example.input!=='object'||Array.isArray(example.input))throw Error('示例数据不可用');
 const input={};
 for(const [key,value]of Object.entries(example.input)){
  const field=tool.fields.find(f=>f.key===key);
  if(!field||!['string','number'].includes(typeof value)||String(value).length>120||(typeof value==='number'&&!Number.isFinite(value)))throw Error('示例字段无效');
  if(field.type==='select'&&!field.options.some(([v])=>String(v)===String(value)))throw Error('示例选项无效');
  input[key]=value;
 }
 return input;
}
