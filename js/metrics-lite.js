(() => {
  const log=(e)=>{ 
    const k='metrics'; 
    const a=JSON.parse(localStorage.getItem(k)||'[]'); 
    a.push({t:Date.now(), e}); 
    localStorage.setItem(k, JSON.stringify(a.slice(-200))); 
  };
  document.addEventListener('click', ev=>{
    const a=ev.target.closest('a'); if(a) log({type:'click', href:a.getAttribute('href')});
  });
  log({type:'page_view', hash:location.hash||'#home'});
})();
