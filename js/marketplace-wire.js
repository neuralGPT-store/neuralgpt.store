(() => {
  const grid = document.getElementById('marketplaceGrid');
  if(!grid) return;

  const provider = localStorage.getItem('marketplaceProvider');
  const qInput = document.getElementById('globalSearch');

  function apply(){
    const q = (qInput && qInput.value || '').toLowerCase();
    grid.querySelectorAll('[data-provider],[data-name]').forEach(card=>{
      let ok = true;
      if(provider && card.dataset.provider !== provider) ok = false;
      if(q && !(card.dataset.name||'').toLowerCase().includes(q)) ok = false;
      card.style.display = ok ? '' : 'none';
    });
  }

  if(qInput){
    qInput.addEventListener('input', apply);
    qInput.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ location.hash='#marketplace'; apply(); }
    });
  }

  apply();
})();
