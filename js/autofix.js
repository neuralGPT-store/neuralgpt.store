(() => {
  document.querySelectorAll('a[href^=\"#\"]').forEach(a=>{
    const id=a.getAttribute('href').slice(1);
    if(id && !document.getElementById(id)){
      a.setAttribute('aria-disabled','true');
      a.addEventListener('click',e=>e.preventDefault());
    }
  });
})();
