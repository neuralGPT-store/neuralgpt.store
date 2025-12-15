(() => {
  const f=document.getElementById('contactForm');
  if(!f) return;
  f.addEventListener('submit',e=>{
    e.preventDefault();
    document.getElementById('contactOK').style.display='block';
    f.reset();
  });
})();
