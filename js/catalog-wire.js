(async()=>{
  const prov = await fetch('./data/providers-data.json').then(r=>r.json());
  const spon = await fetch('./data/sponsors-data.json').then(r=>r.json());

  const norm=s=>String(s||'').toLowerCase();
  const allowed = new Set();

  const products=[];
  (prov.providers||prov||[]).forEach(p=>{
    const link=p.url||p.link||p.website;
    (p.products||[]).forEach(x=>{
      const c=norm(x.category||p.category);
      if(allowed.has(c)){
        products.push({
          id: x.id||crypto.randomUUID(),
          title: x.title||x.name,
          brand: p.name,
          category: c,
          price: x.price||null,
          image: x.image, // imagen ORIGINAL del proveedor
          url: link
        });
      }
    });
  });

  window.CATALOG = { providers: prov.providers||prov, sponsors: spon.sponsors||spon, products };

  // Render Home + Marketplace
  window.renderGrid(products, '#home-products');
  window.renderGrid(products, '#marketplace-grid');
})();
