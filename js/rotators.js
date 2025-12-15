(() => {
  const rot=(sel, n=10, t=3500)=>{
    const els=[...document.querySelectorAll(sel)];
    if(els.length<=n) return;
    let i=0;
    els.forEach((e,idx)=>e.style.display= idx<n?'':'none');
    setInterval(()=>{
      els[i].style.display='none';
      els[(i+n)%els.length].style.display='';
      i=(i+1)%els.length;
    },t);
  };
  rot('.product-card',10,3200);
  rot('.sponsor-card',10,4200);
})();
