/* Provider catalog and UI enhancements
   - Lightweight standalone renderer for providers.json to avoid coupling to server state
   - Favorites support, filters, provider view wiring and commissionTier display
*/
(function(){
  'use strict'
  const API = '/data/providers-data.json'
  const provFavKey = 'ngs:provfavs'

  async function loadProviders(){
    try{ const r = await fetch(API, {cache:'no-cache'}); if(!r.ok) return []; return await r.json() }catch(e){ return [] }
  }

  function loadFavs(){ try{ return JSON.parse(localStorage.getItem(provFavKey) || '{}') }catch(e){ return {} } }
  function saveFavs(f){ try{ localStorage.setItem(provFavKey, JSON.stringify(f)) }catch(e){} }
  function isFav(id){ const f = loadFavs(); return !!f[id] }
  function toggleFav(id){ const f = loadFavs(); if(f[id]) delete f[id]; else f[id] = Date.now(); saveFavs(f); renderFavStates() }

  function humanTier(t){ const map = { STANDARD:'STANDARD (12%)', PRO:'PRO (15%)', PREMIUM:'PREMIUM (20%)' }; return map[t]|| (t||'STANDARD (12%)') }

  function cardForProvider(p){
    const a = document.createElement('article'); a.className='card product-card rgb-border fade-in';
    const safeLogo = (/^(javascript:)/i.test(String(p.logo||'').trim())) ? '/assets/img/provider-default.png' : (p.logo||'/assets/img/provider-default.png')
    a.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${escapeHtml(safeLogo)}" alt="${escapeHtml(p.name)}" style="width:84px;height:84px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,0.03)">
        <div style="flex:1">
          <h3>${escapeHtml(p.name)}</h3>
          <div class="subtle">${escapeHtml(p.category)}</div>
          <div class="muted" style="font-size:13px;margin-top:6px">${escapeHtml((p.description||'').slice(0,160))}${(p.description||'').length>160? '…':''}</div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
            <a class="btn" href="/providers-view.html?provider=${encodeURIComponent((p.name||'').replace(/\s+/g,'-'))}">Ficha</a>
            <a class="btn btn-primary" href="${( (/^(javascript:|data:)/i.test(String(p.externalStoreURL||p.officialWebsite||'#').trim())) ? '#' : escapeHtml(p.externalStoreURL||p.officialWebsite||'#') )}" target="_blank" rel="noopener noreferrer">Visitar tienda oficial</a>
            <button class="btn prov-fav" data-prov="${escapeHtml(p.id)}">${isFav(p.id)?'💖':'♡'}</button>
          </div>
        </div>
      </div>
      <div style="margin-top:8px;font-size:13px" class="muted">Comisión: ${humanTier(p.commissionTier)}</div>
    `
    a.dataset.providerId = p.id
    return a
  }

  function renderFavStates(){ document.querySelectorAll('.prov-fav').forEach(btn=>{ const id = btn.dataset.prov; btn.textContent = isFav(id)?'💖':'♡' }) }

  function fakeStatsFor(p){ return { products: Math.floor(Math.random()*120), rating:(Math.round((Math.random()*2+3)*10)/10), reviews: Math.floor(Math.random()*1200) } }

  // escape helper (same signature as main.js escapeHtml)
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

  async function enhance(){
    const providers = await loadProviders()
    // populate filters (include sector and country)
    const catSel = document.getElementById('filter-category')
    const typeSel = document.getElementById('filter-type')
    const sectorSel = document.getElementById('filter-sector')
    const countrySel = document.getElementById('filter-country')
    if(catSel){ const cats = Array.from(new Set((providers||[]).map(p=>p.category||'Otros'))).sort(); cats.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; catSel.appendChild(o) }) }
    if(typeSel){ const types = Array.from(new Set((providers||[]).map(p=>p.type||'general'))).sort(); types.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; typeSel.appendChild(o) }) }
    if(sectorSel){ const sectors = Array.from(new Set((providers||[]).map(p=>p.sector||''))).filter(Boolean).sort(); sectors.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; sectorSel.appendChild(o) }) }
    if(countrySel){ const countries = Array.from(new Set((providers||[]).map(p=>p.country||''))).filter(Boolean).sort(); countries.forEach(cn=>{ const o=document.createElement('option'); o.value=cn; o.textContent=cn; countrySel.appendChild(o) }) }

    const grid = document.getElementById('providers-grid') || document.getElementById('providers-list')
    if(grid){ grid.innerHTML=''; providers.forEach(p=> grid.appendChild(cardForProvider(p))) }

    // featured
    const feat = document.getElementById('providers-featured')
    if(feat){ feat.innerHTML=''; providers.slice(0,6).forEach(p=> feat.appendChild(cardForProvider(p))) }

    // events
    document.addEventListener('click', (e)=>{
      const b = e.target.closest('.prov-fav')
      if(b){ toggleFav(b.dataset.prov); renderFavStates(); }
    })


    const clear = document.getElementById('clear-filters')
    if(clear) clear.addEventListener('click', ()=>{
      if(document.getElementById('filter-category')) document.getElementById('filter-category').value='all';
      if(document.getElementById('filter-price')) document.getElementById('filter-price').value='all';
      if(document.getElementById('filter-type')) document.getElementById('filter-type').value='all';
      if(document.getElementById('filter-sector')) document.getElementById('filter-sector').value='all';
      if(document.getElementById('filter-country')) document.getElementById('filter-country').value='all';
      filterProviders()
    })

    ['filter-category','filter-price','filter-type','filter-sector','filter-country'].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener('change', filterProviders) })

    // wire provider registration (if present)
    const provSubmit = document.getElementById('prov-submit')
    if(provSubmit) provSubmit.addEventListener('click', ()=>{ const msg=document.getElementById('prov-msg'); if(msg) msg.textContent = 'Solicitud simulada enviada. Revisaremos y contactaremos.'; document.getElementById('provider-form')?.reset() })
    const provForm = document.getElementById('provider-form')
    if(provForm) provForm.addEventListener('submit', function(e){ e.preventDefault(); const msg=document.getElementById('prov-msg'); if(msg) msg.textContent = 'Solicitud simulada enviada. Revisaremos y contactaremos.'; try{ this.reset() }catch(e){} })

    // provider view linking: if on providers-view.html - populate details
    if(location.pathname.endsWith('providers-view.html')){
      const params = new URLSearchParams(location.search); const providerParam = params.get('provider')
      if(providerParam){
        const name = providerParam.replace(/[-_]/g,' ')
        const p = providers.find(x=> (x.name||'').toLowerCase().replace(/\s+/g,'-') === providerParam.toLowerCase()) || providers.find(x=> (x.id||'')===providerParam)
        if(p){
          const pn = document.getElementById('prov-name'); if(pn) pn.textContent = p.name
          const pd = document.getElementById('prov-desc'); if(pd) pd.textContent = p.description
          const pv = document.getElementById('prov-visit'); if(pv){ const href = p.externalStoreURL || p.officialWebsite || '#'; pv.href = (/^(javascript:|data:)/i.test(String(href||'').trim())) ? '#' : href; pv.target = '_blank'; pv.rel = 'noopener noreferrer' }
          const stats = document.getElementById('provider-stats'); if(stats){ const s=fakeStatsFor(p); stats.innerHTML = `Productos: ${s.products} • Rating: ${s.rating} • Opiniones: ${s.reviews}` }
          // provider products list (by vendorName matching)
          const prodList = document.getElementById('provider-products')
          if(prodList && window.__PRODUCTS__){ prodList.innerHTML=''; const prods = window.__PRODUCTS__.filter(pr=> (pr.vendorName||'').toLowerCase() === (p.name||'').toLowerCase()); if(prods.length===0) prodList.innerHTML='<div class="muted">No hay productos publicados.</div>' ; else prods.forEach(pr=>{ const card=document.createElement('article'); card.className='product-card card'; card.innerHTML = `<h4>${escapeHtml(pr.title||pr.name)}</h4><div class="muted">${escapeHtml(pr.category||'')}</div><div style="margin-top:6px"><a class="btn" href="/product.html?id=${encodeURIComponent(pr.id)}">Ver</a></div>`; prodList.appendChild(card) }) }
        }
      }
    }
  }

  function filterProviders(){
    const cat = document.getElementById('filter-category')?.value || 'all'
    const type = document.getElementById('filter-type')?.value || 'all'
    const sector = document.getElementById('filter-sector')?.value || 'all'
    const country = document.getElementById('filter-country')?.value || 'all'
    const price = document.getElementById('filter-price')?.value || 'all'
    loadProviders().then(all=>{
      let out = all.slice()
      if(cat && cat !== 'all') out = out.filter(p=> (p.category||'') === cat)
      if(type && type !== 'all') out = out.filter(p=> (p.type||'') === type)
      if(sector && sector !== 'all') out = out.filter(p=> (p.sector||'') === sector)
      if(country && country !== 'all') out = out.filter(p=> (p.country||'') === country)
      if(price && price !== 'all'){
        if(price==='0-50') out = out.filter(p=> p.minPrice && p.minPrice <= 50)
        if(price==='50-200') out = out.filter(p=> p.minPrice && p.minPrice>50 && p.minPrice<=200)
        if(price==='200-') out = out.filter(p=> p.minPrice && p.minPrice>200)
      }
      const grid = document.getElementById('providers-grid') || document.getElementById('providers-list')
      if(grid){ grid.innerHTML=''; out.forEach(p=> grid.appendChild(cardForProvider(p))) }
      renderFavStates()
    })
  }

  // init
  document.addEventListener('DOMContentLoaded', ()=>{ enhance() })

})();
