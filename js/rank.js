(()=>{
  const score = p => {
    let s = 0;
    if(p.sponsorTier) s += ({gold:30,platinum:40,diamond:50}[p.sponsorTier]||10);
    if(p.rating) s += Math.min(20, p.rating*4);
    if(p.stock !== false) s += 10;
    if(p.price) s += Math.max(0, 20 - p.price/50);
    return s;
  };
  window.rankProducts = arr => arr.slice().sort((a,b)=>score(b)-score(a));
})();
