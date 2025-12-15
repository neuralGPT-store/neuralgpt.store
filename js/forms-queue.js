(() => {
  document.querySelectorAll('form').forEach(f=>{
    f.addEventListener('submit', e=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f).entries());
      localStorage.setItem('queue:forms', JSON.stringify([...(JSON.parse(localStorage.getItem('queue:forms')||'[]')), {ts:Date.now(), data}]));
      f.reset();
      alert('Enviado ✔');
    });
  });
})();
