(()=>{
  const $ = s=>document.querySelector(s);
  window.applyFilters = ()=>{
    const q = (#q?.value||'').toLowerCase();
    const cat = #f-cat?.value;
    const min = Number(#f-min?.value||0);
    const max = Number(#f-max?.value||Infinity);
    const prov = #f-prov?.value;
    let r = (window.CATALOG?.products||[]).filter(p=>{
      if(q && !(p.title+' '+(p.brand||'')).toLowerCase().includes(q)) return false;
      if(cat && p.category!==cat) return false;
      if(p.price!=null && (p.price<min || p.price>max)) return false;
      if(prov && p.brand!==prov) return false;
      return true;
    });
    r = window.rankProducts ? window.rankProducts(r) : r;
    window.renderGrid(r, '#marketplace-grid');
  };
  document.addEventListener('input', e=>{
    if(e.target.matches('#q,#f-cat,#f-min,#f-max,#f-prov')) applyFilters();
  });
})();
