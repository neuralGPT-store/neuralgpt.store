(async()=>{
  const load=async(u)=> (await fetch(u)).json();
  const state={providers:[], products:[]};

  // Coloca aquí TUS feeds reales cuando los tengas
  const feeds = [
    // '/data/providers.json',
    // '/data/products.json'
  ];

  for(const f of feeds){
    const d = await load(f);
    if(d.providers) state.providers.push(...d.providers);
    if(d.products) state.products.push(...d.products);
  }

  window.CATALOG = state;
})();
