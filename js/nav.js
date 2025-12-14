(function(){
  const sections=[...document.querySelectorAll('section')];
  const show=id=>{
    sections.forEach(s=>s.classList.remove('active'));
    const el=document.getElementById(id);
    (el||sections[0])?.classList.add('active');
    history.replaceState(null,'','#'+id);
  };
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^=\"#\"]');
    if(!a) return;
    e.preventDefault();
    const id=a.getAttribute('href').replace('#','');
    show(id);
  });
  const h=location.hash.replace('#','');
  show(h||'home');
})();
