document.addEventListener('DOMContentLoaded',()=>{
  const links=document.querySelectorAll('nav a');
  const sections=document.querySelectorAll('.section');
  const show=id=>{
    sections.forEach(s=>s.classList.remove('active'));
    const t=document.querySelector(id);
    if(t) t.classList.add('active');
  };
  links.forEach(l=>{
    l.onclick=e=>{
      e.preventDefault();
      show(l.getAttribute('href'));
    };
  });
  show(location.hash||'#home');
});
