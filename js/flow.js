(()=>{
  document.addEventListener('click',e=>{
    const c=e.target.closest('.product-card');
    if(c){ location.hash='#marketplace'; }
  });
})();
