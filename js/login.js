const ir=u=>location.href=u.role==='admin'?'admin.html':'dashboard.html';
if(sessao.get())ir(sessao.get());
f.onsubmit=async ev=>{ev.preventDefault();e.textContent='';
 try{const j=await api('/auth/login',{method:'POST',body:{email:u.value,senha:s.value}});sessao.set(j);ir(j)}
 catch(x){e.textContent=x.message}};
