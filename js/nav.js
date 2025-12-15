document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');
  if(!a) return;
  const id=a.getAttribute('href').slice(1);
  const el=document.getElementById(id);
  if(el){
    e.preventDefault();
    window.scrollTo({
      top: el.offsetTop - 64,
      behavior:'smooth'
    });
  }
});
