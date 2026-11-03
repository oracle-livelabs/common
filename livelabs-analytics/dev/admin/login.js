window.LiveLabsLoading.ready();
document.querySelector('#login').addEventListener('submit',async event=>{
  const endLoading=window.LiveLabsLoading.begin('Signing in…');
  event.preventDefault();const form=event.target,button=form.querySelector('button'),status=document.querySelector('#status');button.disabled=true;status.textContent='Signing in…';
  try {const credentials=Object.fromEntries(new FormData(form));credentials.remember=form.elements.remember.checked;const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});const data=await response.json();if(!response.ok)throw new Error(data.error);form.reset();const allowed=new Set(['/admin/dashboard-management','/admin/data-merge','/admin/governance','/admin/user-settings']);const requested=new URLSearchParams(location.search).get('next')||location.pathname;location.replace(allowed.has(requested)?requested:'/admin/dashboard-management');}
  catch(error){status.textContent=error.message;endLoading();}finally{button.disabled=false;}
});
