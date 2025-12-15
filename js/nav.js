document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]'); if(!a) return;
  const id=a.getAttribute('href').slice(1);
  const s=document.getElementById(id);
  if(s){ e.preventDefault(); s.scrollIntoView({behavior:'smooth'}); }
});
