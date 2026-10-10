const button=document.querySelector('#copy-service-email'),status=document.querySelector('#service-contact-status');
button?.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(button.dataset.email);status.textContent='邮箱已复制，可粘贴到邮件应用。';}
 catch{status.textContent='未能自动复制，请长按或选中上方邮箱复制。';}
});
