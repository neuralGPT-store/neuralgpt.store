/* cleanup-ui.js - borra textos/banners basura, arregla duplicados, deja la home usable */
(function(){
  try { document.title = 'neuralGPT.store'; } catch(e){}

  // Eliminar cualquier elemento que contenga "operativo por IA" o el header gigante con ese copy
  const killPhrases = [/operativo\s+por\s+ia/i, /marketplace\s+operativo/i];
  const nodes = Array.from(document.querySelectorAll('h1,h2,h3,div,section,header,span'));
  nodes.forEach(n=>{
    const t = (n.textContent || '').trim();
    if(!t) return;
    if(killPhrases.some(rx=>rx.test(t))){
      // no borres el DOM entero si es contenedor grande: mejor ocultar
      n.style.display = 'none';
    }
  });

  // Mantener SOLO un input de búsqueda (globalSearch)
  const searches = Array.from(document.querySelectorAll('input[type="search"], input[id*="search" i]'));
  let kept = null;
  searches.forEach(s=>{
    if(s.id === 'globalSearch' && !kept){ kept = s; return; }
  });
  if(!kept && searches.length){
    kept = searches[0];
    kept.id = 'globalSearch';
  }
  searches.forEach(s=>{
    if(s !== kept){
      s.style.display = 'none';
      s.setAttribute('aria-hidden','true');
    }
  });

})();
