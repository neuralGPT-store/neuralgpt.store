(async()=>{
  const q=document.getElementById('q');
  if(!q) return;
  const [products,providers,sponsors]=await Promise.all([
    fetch('/data/products.json').then(r=>r.json()),
    fetch('/data/providers.json').then(r=>r.json()),
    fetch('/data/sponsors.json').then(r=>r.json())
  ]);
  const all=[...products,...providers,...sponsors].map(x=>({
    name:(x.name||'').toLowerCase(),
    el:x
  }));
  q.addEventListener('input',()=>{
    const v=q.value.toLowerCase();
    document.querySelectorAll('.product-card,.sec-card,.sp-card').forEach(c=>c.style.display='');
    if(!v) return;
    document.querySelectorAll('.product-card,.sec-card,.sp-card').forEach(c=>{
      const t=c.textContent.toLowerCase();
      if(!t.includes(v)) c.style.display='none';
    });
  });
})();
