(() => {
  document.querySelectorAll('.provider-card').forEach(a=>{
    a.addEventListener('click', ()=>{
      const p=a.dataset.provider;
      if(p){ localStorage.setItem('marketplaceProvider', p); }
    });
  });
})();
