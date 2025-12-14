(() => {
  try { document.title = 'neuralGPT.store'; } catch(e){}

  // Eliminar textos/banner basura
  const killRx = /(operativo\s+por\s+ia|marketplace\s+operativo\s+por\s+ia)/i;
  document.querySelectorAll('h1,h2,h3,h4,p,div,section,header').forEach(n=>{
    if (killRx.test((n.textContent||'').trim())) n.style.display='none';
  });

  // Dejar SOLO un input de búsqueda (globalSearch)
  const searches = Array.from(document.querySelectorAll('input[type="search"], input[type="text"]'));
  let kept = searches.find(s=>s.id==='globalSearch') || searches[0];
  if (kept) kept.id = 'globalSearch';
  searches.forEach(s=>{
    if (s !== kept) {
      s.style.display='none';
      s.setAttribute('aria-hidden','true');
    }
  });
})();
