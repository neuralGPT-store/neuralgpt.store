(() => {
  // Onboarding 1ª visita
  if(!localStorage.getItem('onboarded')){
    const tips = [
      'Empieza aquí',
      'Filtra por proveedor',
      'Busca cualquier cosa arriba'
    ];
    document.querySelectorAll('.top-tabs a').forEach((a,i)=>{
      a.classList.add('tip'); a.setAttribute('data-tip', tips[i%tips.length]);
    });
    localStorage.setItem('onboarded','1');
  }
  // SPA polish
  const secs=[...document.querySelectorAll('.section')];
  const show=id=>{
    secs.forEach(s=>{
      s.classList.remove('show'); s.classList.add('hide');
      if(s.id===id){ s.classList.remove('hide'); s.classList.add('show'); }
    });
  };
  window.addEventListener('hashchange', ()=> show(location.hash.replace('#','')||'home'));
})();
