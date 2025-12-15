(()=>{
  const tierScore = s => ({diamond:4,platinum:3,gold:2,silver:1}[s.tier]||0);
  const mount = (sel, items)=>{
    const el=document.querySelector(sel); if(!el) return;
    el.innerHTML='';
    items.slice(0,10).forEach(s=>{
      const c=document.createElement('div');
      c.className='sponsor-card';
      c.innerHTML=\
        <a href="\" target="_blank" rel="noopener">
          <img src="\" alt="\" loading="lazy">
        </a>
      \;
      el.appendChild(c);
    });
  };
  const tick=()=>{
    if(!window.CATALOG || !window.CATALOG.sponsors) return;
    const arr=[...window.CATALOG.sponsors].sort((a,b)=>tierScore(b)-tierScore(a));
    mount('#home-sponsors', arr);
  };
  setInterval(tick, 5000);
  document.addEventListener('DOMContentLoaded', tick);
})();
