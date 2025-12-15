(()=>{
  const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const match=(p,q)=> norm(p.title+' '+p.brand+' '+p.desc).includes(q);

  window.searchCatalog=(q,filters={})=>{
    q=norm(q||'');
    let r = (window.CATALOG?.products||[]);
    if(q) r = r.filter(p=>match(p,q));
    if(filters.category) r = r.filter(p=>p.category===filters.category);
    if(filters.min) r = r.filter(p=>p.price>=filters.min);
    if(filters.max) r = r.filter(p=>p.price<=filters.max);
    return r;
  };
})();
