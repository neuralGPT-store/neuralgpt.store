(()=>{
  const rank = s => ({diamond:4,platinum:3,gold:2,silver:1}[s.tier]||0);
  const mount = (sel, items)=>{
    const el=document.querySelector(sel); if(!el) return;
    el.innerHTML='';
    items.slice(0,10).forEach(s=>{
      const c=document.createElement('div');
      c.className='sponsor-card';
      c.innerHTML=\
        <img src="\" alt="\">
      \;
      el.appendChild(c);
    });
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const arr=(window.CATALOG?.sponsors||[]).slice().sort((a,b)=>rank(b)-rank(a));
    mount('#home-sponsors', arr);
  });
})();
