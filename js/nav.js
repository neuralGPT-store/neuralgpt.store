document.querySelectorAll('[data-section]').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.section-scroll')
      .forEach(s=>s.style.display='none');
    const t=document.getElementById(b.dataset.section);
    if(t) t.style.display='block';
  });
});
