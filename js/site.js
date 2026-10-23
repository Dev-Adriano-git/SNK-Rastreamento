const WHATSAPP='5511999999999'; // troque pelo número da empresa (com 55 + DDD)
f.onsubmit=e=>{e.preventDefault();const t=`Olá! Sou ${n.value}. Quero rastrear: ${v.value}. ${m.value}`;open('https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(t),'_blank')};
