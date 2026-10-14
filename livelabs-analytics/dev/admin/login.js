window.LiveLabsLoading.ready();
document.querySelector('#login').addEventListener('submit',async event=>{
  const endLoading=window.LiveLabsLoading.begin('Signing in…');
  event.preventDefault();const form=event.target,button=form.querySelector('button'),status=document.querySelector('#status');button.disabled=true;status.textContent='Signing in…';
  try {const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const data=await response.json();if(!response.ok)throw new Error(data.error);form.reset();location.replace('/admin-panel-login');}
  catch(error){status.textContent=error.message;endLoading();}finally{button.disabled=false;}
});
