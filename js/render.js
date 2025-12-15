(()=>{
  window.renderGrid=(items, sel)=>{
    const el=document.querySelector(sel); if(!el) return;
    el.innerHTML='';
    items.slice(0,60).forEach(p=>{
      const c=document.createElement('div');
      c.className='product-card';
      c.innerHTML=\
        <img src="\" alt="\" loading="lazy">
        <h3>\</h3>
        <p>\</p>
        <strong>\ €</strong>
      \;
      el.appendChild(c);
    });
  };
})();
