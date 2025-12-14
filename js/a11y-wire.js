(() => {
  const report = { deadLinks:[], deadButtons:[], missingTargets:[] };

  // A) Enlaces: evitar 404/anchors rotos
  document.querySelectorAll('a').forEach(a=>{
    const href = a.getAttribute('href')||'';
    if(href.startsWith('#')){
      const id = href.slice(1);
      if(!document.getElementById(id)){
        report.missingTargets.push(href);
        a.addEventListener('click', e=>e.preventDefault());
        a.style.opacity=.6;
      }
    }
  });

  // B) Botones sin acción -> degradar a navegación segura
  document.querySelectorAll('button').forEach(b=>{
    if(!b.onclick && !b.hasAttribute('data-action')){
      report.deadButtons.push(b.textContent.trim());
      b.addEventListener('click', e=>e.preventDefault());
      b.style.opacity=.7;
    }
  });

  // C) Inputs de búsqueda: asegurar handler
  const search = document.getElementById('globalSearch');
  if(search && !search.dataset.wired){
    search.dataset.wired='1';
    search.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        location.hash = '#marketplace';
      }
    });
  }

  // D) Consola limpia y visible
  if (window.console && report) {
    console.info('AUDIT', report);
  }
})();
