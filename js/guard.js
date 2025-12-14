window.addEventListener('error',e=>{
  console.warn('UI error:', e.message);
});
(async()=>{
  const links=[...document.querySelectorAll('a[href^=\"/\"]')].map(a=>a.getAttribute('href'));
  for(const l of links){
    try{ await fetch(l,{method:'HEAD'}); }
    catch{ console.warn('Broken link:', l); }
  }
})();
