import {icon} from './icons.js';

export function articlePage(articles,query='',page=1,size=12){
 const q=query.trim().toLocaleLowerCase('zh-CN');
 const matched=articles.filter(a=>[a.title,a.description,a.category].join(' ').toLocaleLowerCase('zh-CN').includes(q));
 const pages=Math.max(1,Math.ceil(matched.length/size)),current=Math.min(pages,Math.max(1,Math.floor(Number(page))||1));
 return {items:matched.slice((current-1)*size,current*size),total:matched.length,pages,current};
}

export function mountArticleSearch(root=document){
 const input=root.querySelector('#article-search'),data=root.querySelector('#article-search-data');
 if(!input||!data)return;
 const articles=JSON.parse(data.textContent),list=root.querySelector('#article-list'),pager=root.querySelector('#article-pagination'),count=root.querySelector('#article-count'),empty=root.querySelector('#article-empty');
 const original={list:list.innerHTML,pager:pager.innerHTML,count:count.textContent,empty:empty.textContent};
 const element=(tag,cls,text)=>{const n=root.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const render=(page=1,focus=false)=>{
  const q=input.value.trim();
  if(!q){list.innerHTML=original.list;pager.innerHTML=original.pager;count.textContent=original.count;empty.textContent=original.empty;empty.classList.toggle('hidden',articles.length>0);return;}
  const state=articlePage(articles,q,page);list.replaceChildren();pager.replaceChildren();
  for(const a of state.items){
   const card=element('a','news-card');card.href=a.path;card.dataset.articleCategory=a.category;
   const cover=element('div','news-cover'),label=element('span','',a.category);label.append(root.createElement('br'),root.createTextNode('HR WORK NOTES'));cover.append(label);
   const graphic=element('span','news-cover-icon');graphic.innerHTML=icon('file',38);cover.append(graphic);
   card.append(cover,element('div','news-meta',a.category+' / '+a.publishedAt.slice(0,10)),element('h3','',a.title),element('p','',a.description));list.append(card);
  }
  count.textContent=`找到 ${state.total} 篇${state.pages>1?` · 第 ${state.current} / ${state.pages} 页`:''}`;
  empty.textContent='暂无匹配的文章。';empty.classList.toggle('hidden',state.total>0);
  if(state.pages>1){
   const nav=element('nav','article-pagination');nav.setAttribute('aria-label','搜索结果分页');
   const button=(label,page)=>{const b=element('button','button',label);b.type='button';b.disabled=page<1||page>state.pages;b.onclick=()=>render(page,true);return b;};
   nav.append(button('← 上一页',state.current-1),element('span','',`第 ${state.current} / ${state.pages} 页`),button('下一页 →',state.current+1));pager.append(nav);
  }
  if(focus){input.focus({preventScroll:true});input.scrollIntoView({block:'start',behavior:'smooth'});}
 };
 input.addEventListener('input',()=>render());
}
