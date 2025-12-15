(() => {
  const valid = new Set(['home','marketplace','products','providers','sponsors','security','contact','blog','legal']);
  const fix=()=>{
    const h=(location.hash||'#home').replace('#','');
    if(!valid.has(h)){ location.hash='#home'; }
  };
  window.addEventListener('hashchange', fix);
  fix();
})();
