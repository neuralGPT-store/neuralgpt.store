(()=>{
  const pick=(arr,n)=>arr.length<=n?arr:arr.slice().sort(()=>Math.random()-0.5).slice(0,n);
  const mount=(sel,items)=>{
    const el=document.querySelector(sel); if(!el) return;
    el.innerHTML='';
    items.forEach(p=>{
      const d=document.createElement('div');
      d.className='product-card';
      d.innerHTML=\<img src="\" alt="\" loading="lazy"><h3>\</h3><small>\</small>\;
      el.appendChild(d);
    });
  };
  const run=()=>{
    if(!window.CATALOG) return;
    mount('#home-products', pick(window.CATALOG.products||[],10));
  };
  document.addEventListener('DOMContentLoaded', run);
})();
