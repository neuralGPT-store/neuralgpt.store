(() => {
  const debug = location.search.includes('debug');
  const log = (type,payload)=>{
    const k='obs';
    const a=JSON.parse(localStorage.getItem(k)||'[]');
    a.push({t:Date.now(), type, payload});
    localStorage.setItem(k, JSON.stringify(a.slice(-300)));
  };

  window.addEventListener('error', e=>{
    log('js_error', {msg:e.message, src:e.filename, line:e.lineno});
    if(debug){
      const d=document.createElement('div');
      d.style.cssText='position:fixed;bottom:12px;right:12px;z-index:9999;padding:10px 14px;border-radius:12px;background:rgba(0,0,0,.6);border:2px solid #ff004c;color:#00eaff';
      d.textContent='JS error detectado';
      document.body.appendChild(d);
    }
  });

  // Recursos rotos
  document.querySelectorAll('img').forEach(img=>{
    img.addEventListener('error',()=>log('img_404', img.src));
  });
})();
