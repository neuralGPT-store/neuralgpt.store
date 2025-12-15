(()=>{
  const grid=document.getElementById('marketplace-grid');
  if(!grid) return;
  const obs=new MutationObserver(()=>{
    if(!grid.children.length){
      grid.innerHTML='<div class="card">No hay resultados con esos filtros.</div>';
    }
  });
  obs.observe(grid,{childList:true});
})();
