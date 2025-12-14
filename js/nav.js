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
const q=document.getElementById('globalSearch');
if(q){
  q.addEventListener('input',()=>{
    const v=q.value.toLowerCase();
    document.querySelectorAll('.product-card,.sec-card,.sp-card').forEach(c=>{
      c.style.display = c.textContent.toLowerCase().includes(v) ? '' : 'none';
    });
  });
}
