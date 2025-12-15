(() => {
  const tabs=document.querySelectorAll('.top-tabs a');
  const setActive=()=>{
    const h=location.hash||'#home';
    tabs.forEach(a=>a.classList.toggle('active', a.getAttribute('href')===h));
  };
  window.addEventListener('hashchange', setActive);
  setActive();
})();
