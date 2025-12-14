async function loadJSON(p){ const r=await fetch(p); return r.json(); }

function renderCards(el, items, cls){
  el.innerHTML='';
  items.forEach(i=>{
    const d=document.createElement('div');
    d.className=cls;
    d.innerHTML=\
      <a href='\' target='_blank'>
        <img src='\' alt='\'/>
        <h4>\</h4>
        \
      </a>\;
    el.appendChild(d);
  });
}

(async()=>{
  const providers=await loadJSON('/data/providers.json');
  const sponsors=await loadJSON('/data/sponsors.json');
  const products=await loadJSON('/data/products.json');

  const pEl=document.querySelector('#providers .sec-grid');
  const sEl=document.querySelector('#sponsors .sp-grid');
  const prEl=document.querySelector('#home .home-products');

  if(pEl) renderCards(pEl, providers, 'sec-card');
  if(sEl) renderCards(sEl, sponsors, 'sp-card');
  if(prEl){
    let idx=0;
    setInterval(()=>{
      const slice=[...products].sort(()=>0.5-Math.random()).slice(0,10);
      renderCards(prEl, slice, 'product-card');
    }, 3500);
  }
})();
