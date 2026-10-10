const dock=document.querySelector('.contact-dock'),dialog=document.querySelector('#contact-dialog');
if(dock&&dialog){
 document.body.classList.add('has-contact-dock');
 const paths={chat:'M4 4h16v12H9l-5 4V4z M8 8h8 M8 12h5',phone:'M7 3H4v3c0 8 6 14 14 14h3v-4l-5-2-2 3c-3-1-6-4-7-7l3-2-3-5z',feedback:'M4 4h16v13H8l-4 3V4z M8 8h8 M8 12h5',top:'M5 5h14 M12 20V9 M7 14l5-5 5 5'};
 dock.querySelectorAll('[data-contact-icon]').forEach(el=>el.innerHTML=`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[el.dataset.contactIcon]}"></path></svg>`);
 const toggle=dock.querySelector('.contact-mobile-toggle');let opener;
 function collapse(){dock.classList.remove('expanded');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','打开联系与帮助');}
 toggle.onclick=()=>{const open=!dock.classList.contains('expanded');dock.classList.toggle('expanded',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'收起联系与帮助':'打开联系与帮助');};
 dock.querySelectorAll('[data-contact-open]').forEach(button=>button.onclick=()=>{
  opener=button;const wechat=button.dataset.contactOpen==='wechat';
  document.querySelector('#contact-title').textContent=wechat?'微信咨询':'电话联系';
  document.querySelector('#contact-wechat').hidden=!wechat;document.querySelector('#contact-phone').hidden=wechat;
  document.querySelector('#contact-status').textContent='';dialog.showModal();document.querySelector('#contact-close').focus();
 });
 document.querySelectorAll('[data-open-service-contact]').forEach(link=>link.onclick=event=>{
  event.preventDefault();
  dock.querySelector('[data-contact-open="wechat"]').click();
  opener=link;
 });
 document.querySelector('#contact-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
 dialog.addEventListener('close',()=>opener?.focus());
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&dock.classList.contains('expanded')&&!dialog.open){collapse();toggle.focus();}});
 document.addEventListener('click',event=>{if(!dock.contains(event.target)&&!dialog.open)collapse();});
 document.querySelector('#contact-copy').onclick=async()=>{const status=document.querySelector('#contact-status');try{await navigator.clipboard.writeText(document.querySelector('#contact-copy').dataset.phone);status.textContent='号码已复制';}catch{status.textContent='请选中上方号码复制';}};
 const feedback=document.querySelector('#tool-feedback');if(feedback){const link=document.querySelector('#contact-feedback');link.href='#tool-feedback';link.onclick=()=>{collapse();feedback.querySelector('textarea')?.focus({preventScroll:true});};}
 document.querySelector('#contact-top').onclick=()=>{collapse();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});};
}
