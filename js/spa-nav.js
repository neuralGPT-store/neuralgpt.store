(() => {
  const sections = Array.from(document.querySelectorAll('.section'));
  function show(id){
    sections.forEach(s=>{
      s.style.display = (s.id === id) ? 'flex' : 'none';
      if (s.id === id) {
        s.style.minHeight = '100vh';
        s.style.width = '100vw';
      }
    });
  }
  // inicial
  show(location.hash.replace('#','') || 'home');
  // clicks
  document.querySelectorAll('a[href^=\"#\"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id = a.getAttribute('href').replace('#','');
      if(document.getElementById(id)){
        e.preventDefault();
        history.pushState({},'', '#'+id);
        show(id);
      }
    });
  });
  // back/forward
  window.addEventListener('popstate', ()=>{
    show(location.hash.replace('#','') || 'home');
  });
})();
