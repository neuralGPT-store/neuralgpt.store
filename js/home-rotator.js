(()=>{
  const mount = (sel, items)=>{
    const el=document.querySelector(sel); if(!el) return;
    el.innerHTML='';
    items.slice(0,10).forEach(p=>{
      const c=document.createElement('div');
      c.className='product-card';
      c.innerHTML=\
        <img src="\" alt="\" loading="lazy">
        <h3>\</h3>
        <small>\</small>
      \;
      el.appendChild(c);
    });
  };
  const tick=()=>{
    if(!window.CATALOG) return;
    const arr=[...(window.CATALOG.products||[])];
    arr.sort(()=>Math.random()-0.5);
    mount('#home-products', arr);
  };
  setInterval(tick, 4000);
  document.addEventListener('DOMContentLoaded', tick);
})();
