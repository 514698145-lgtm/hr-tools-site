import {regions} from './city-policies.js';
export const provinces={'北京市':['北京'],'上海市':['上海'],'天津市':['天津'],'江苏省':regions.江苏,'浙江省':regions.浙江,'河北省':regions.河北,'广东省':regions['大湾区内地']};
const provinceOf=city=>Object.keys(provinces).find(p=>provinces[p].includes(city));
export function mountCityPicker(form){
 const city=form.elements.city;if(!city)return null;
 const initial=city.value,original=city.closest('.field');
 const box=document.createElement('fieldset');box.className='city-picker';
 box.innerHTML='<legend>参保地区</legend><label class="field" for="city-search"><span class="field-label">搜索城市或省份</span><input id="city-search" type="search" autocomplete="off" placeholder="如：苏州、江苏、广州" aria-controls="city-search-results"></label><div id="city-search-results" class="city-search-results" aria-live="polite"></div><div class="city-picker-selects"><label class="field" for="insurance-province"><span class="field-label">省份 / 直辖市</span><select id="insurance-province"><option value="">请选择省份</option></select></label></div>';
 original.before(box);box.querySelector('.city-picker-selects').append(original);
 const province=box.querySelector('#insurance-province'),search=box.querySelector('#city-search'),results=box.querySelector('#city-search-results');
 for(const p of Object.keys(provinces))province.add(new Option(p,p));
 function options(p,chosen=''){city.replaceChildren(new Option(p?'请选择城市':'请先选择省份',''));for(const name of provinces[p]||[])city.add(new Option(name,name));city.value=chosen;}
 function setCity(name){province.value=provinceOf(name)||'';options(province.value,name);search.value='';results.replaceChildren();}
 function changed(){city.dispatchEvent(new Event('input',{bubbles:true}));city.dispatchEvent(new Event('change',{bubbles:true}));}
 province.addEventListener('change',()=>{const names=provinces[province.value]||[];options(province.value,names.length===1?names[0]:'');search.value='';results.replaceChildren();changed();});
 city.addEventListener('change',()=>{search.value='';results.replaceChildren();});
 search.addEventListener('input',e=>{e.stopPropagation();results.replaceChildren();const query=search.value.trim();if(!query)return;
  const matches=Object.entries(provinces).flatMap(([p,names])=>names.filter(n=>(p+' '+n+'市').includes(query)).map(n=>[p,n]));
  if(!matches.length){results.textContent='没有找到已收录的城市，请换个关键词或使用下方省市筛选。';return;}
  for(const [p,n] of matches){const button=document.createElement('button');button.type='button';button.className='city-search-option';button.textContent=p+' · '+n;button.addEventListener('click',()=>{setCity(n);changed();city.focus();});results.append(button);}
 });
 search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();results.querySelector('button')?.click();}if(e.key==='Escape'){search.value='';results.replaceChildren();}});
 setCity(initial);
 return {setCity,reset:()=>setCity(initial)};
}
