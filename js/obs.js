(function(){
  const k='ngpt_obs';
  const get=()=>JSON.parse(localStorage.getItem(k)||'{}');
  const put=o=>localStorage.setItem(k,JSON.stringify(o));
  const inc=(n)=>{const o=get();o[n]=(o[n]||0)+1;put(o);}
  inc('page_view');
  document.addEventListener('click',e=>{
    if(e.target.closest('button, a')) inc('click_cta');
  });
  document.addEventListener('submit',()=>inc('submit'));
  window.ngptObs={dump:()=>get()};
})();
