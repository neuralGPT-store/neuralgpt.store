/* Modern marketplace renderer and global search
   - Loads /data/product-data.json and /data/category-data.json with fallbacks
   - Renders homepage, marketplace, product and category pages
   - Provides global autocomplete search using local JSON
*/
(function(){
  'use strict'
  const state = { products: [], categories: [], filtered: [] }

  // Helpers
  const fmtPrice = p => (p===0||p===null||p===undefined) ? 'Contact' : (typeof p === 'number' ? `$${p.toLocaleString()}` : p)
  const qs = () => Object.fromEntries(new URLSearchParams(location.search))
  const el = id => document.getElementById(id)

  // Fetch data with graceful fallback to embedded globals
  async function loadJSON(url, fallback){
	try{
	  const r = await fetch(url, {cache:'no-cache'})
	  if(!r.ok) throw new Error('not found')
	  return await r.json()
	}catch(e){
	  return (typeof fallback !== 'undefined') ? fallback : []
	}
  }

  async function init(){
	const embeddedProducts = (window.__PRODUCTS__ && Array.isArray(window.__PRODUCTS__)) ? window.__PRODUCTS__ : null
	const embeddedCats = (window.__CATEGORIES__ && Array.isArray(window.__CATEGORIES__)) ? window.__CATEGORIES__ : null

	state.products = embeddedProducts || await loadJSON('/data/product-data.json', embeddedProducts || [])
	const rawCats = embeddedCats || await loadJSON('/data/category-data.json', null)
	state.categories = rawCats ? (Array.isArray(rawCats) ? (rawCats.map(c=> c.name || c)) : []) : Array.from(new Set(state.products.map(p=>p.category))).filter(Boolean)

	state.filtered = state.products.slice()

	bindGlobalSearch()
	routeRender()
  }

  // Routing: decide which render to run based on pathname
  function routeRender(){
	const path = location.pathname.split('/').pop() || 'index.html'
	if(path === 'index.html' || path === '' ) renderHome()
	if(path === 'marketplace.html') renderMarketplace()
	if(path === 'product.html') renderProduct()
	if(path === 'category.html') renderCategory()
	if(path === 'security.html') renderSecurity()
	if(path === 'quantum.html') renderQuantum()
	if(path === 'blog.html') renderBlog()
	if(path === 'trends.html') renderTrends()
  }

  /* Renderers */
  function renderHome(){
	// categories preview
	const ctn = el('home-categories')
	if(ctn){ ctn.innerHTML = ''; state.categories.slice(0,6).forEach(cat=>{ const a=document.createElement('a'); a.className='card product-card'; a.href=`/category.html?category=${encodeURIComponent(cat)}`; a.innerHTML=`<h3>${cat}</h3><p class="product-meta">Ver productos · ${state.products.filter(p=>p.category===cat).length} disponibles</p>`; ctn.appendChild(a) }) }

	// featured
	const f = el('featured-products'); if(f){ f.innerHTML=''; state.products.filter(p=> (p.tags||[]).includes('featured')).slice(0,8).forEach(p=> f.appendChild(makeCard(p))) }

	// trends
	const t = el('trends-preview'); if(t){ t.innerHTML=''; state.products.slice().sort((a,b)=> (b.rating||0)-(a.rating||0)).slice(0,6).forEach(p=> t.appendChild(makeCard(p))) }
  }

  function renderMarketplace(){
	// filters
	const fl = document.querySelector('.filter-list'); if(fl){ fl.innerHTML=''; const all=document.createElement('button'); all.className='chip active'; all.dataset.filter='all'; all.textContent='Todos'; fl.appendChild(all); state.categories.forEach(c=>{ const b=document.createElement('button'); b.className='chip'; b.dataset.filter=c; b.textContent=c; fl.appendChild(b) }); fl.addEventListener('click', onFilterClick) }

	// extra controls
	const fx = document.querySelector('.filters'); if(fx){ fx.innerHTML=''; const sel=document.createElement('select'); sel.id='type-filter'; sel.innerHTML='<option value="any">Tipo</option><option value="hardware">Hardware</option><option value="ia">IA</option><option value="service">Servicio</option>'; fx.appendChild(sel); sel.addEventListener('change', applyFilters); const price=document.createElement('select'); price.id='price-filter'; price.innerHTML='<option value="any">Precio</option><option value="under500">≤ $500</option><option value="500-2k">$500–$2k</option><option value="2k+">$2k+</option>'; fx.appendChild(price); price.addEventListener('change', applyFilters) }

	const grid = el('market-grid'); if(grid){ grid.innerHTML=''; state.filtered.forEach(p=> grid.appendChild(makeCard(p))) }

	renderSpecialSections()
  }

  function renderProduct(){
	const params = qs(); const id = params.id
	if(!id) return
	const product = state.products.find(p=> p.id === id)
	const title = el('p-title'); if(title) title.textContent = product ? product.name : id
	const img = el('p-image'); if(img) img.src = product && product.image ? product.image : '/assets/img/vision-pro.svg'
	const desc = el('p-desc'); if(desc) desc.textContent = product ? product.short_description : 'Sin descripción'
	const price = el('p-price'); if(price) price.textContent = product ? fmtPrice(product.price) : ''
	const specs = el('p-details'); if(specs){ specs.innerHTML = product ? `<ul>${(product.specs||[]).map(s=>`<li>${s}</li>`).join('')}</ul>` : '<div class="muted">Detalles no disponibles</div>' }

	// recommended
	const rec = el('recommended-products'); if(rec){ rec.innerHTML=''; const list = state.products.filter(p=> p.category === (product && product.category) && p.id !== id).slice(0,4); list.forEach(p=> rec.appendChild(makeCard(p))) }
  }

  function renderCategory(){
	const params = new URLSearchParams(location.search); const cat = params.get('category') || params.get('cat') || ''
	const grid = el('category-grid'); if(!grid) return
	const list = state.products.filter(p=> (p.category||'').toLowerCase() === (cat||'').toLowerCase())
	grid.innerHTML=''
	if(list.length === 0){ grid.innerHTML = '<div class="muted">No hay productos en esta categoría.</div>'; return }
	list.forEach(p=> grid.appendChild(makeCard(p)))
  }

  function renderSecurity(){ /* placeholder: static content exists in HTML; enhance if needed */ }
  function renderQuantum(){ /* static HTML page - kept visual */ }
  function renderBlog(){ /* static cards present in HTML */ }
  function renderTrends(){ /* static cards present in HTML */ }

  /* UI helpers */
  function makeCard(p){
	const a = document.createElement('article'); a.className = 'product-card card fade-in'
	a.innerHTML = `<img class="card-img" loading="lazy" src="${p.image||'/assets/img/vision-pro.svg'}" alt="${escapeHtml(p.name)}"><h3>${escapeHtml(p.name)}</h3><div class="product-meta">${escapeHtml(p.category)} • ${fmtPrice(p.price)}</div><p class="subtle">${escapeHtml(p.short_description||'')}</p><div style="margin-top:12px"><a class="btn btn-primary" href="/product.html?id=${encodeURIComponent(p.id)}">Ver</a></div>`
	return a
  }

  function renderSpecialSections(){ const fp = el('featured-products'); if(fp){ fp.innerHTML=''; state.products.filter(p=> (p.tags||[]).includes('featured')).slice(0,8).forEach(p=> fp.appendChild(makeCard(p))) } }

  function onFilterClick(e){ const btn = e.target.closest('button'); if(!btn) return; const parent = btn.parentElement; parent.querySelectorAll('button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); applyFilters() }

  function applyFilters(){
	const q = (el('mp-search') && el('mp-search').value.trim().toLowerCase()) || (el('global-search') && el('global-search').value.trim().toLowerCase()) || ''
	const active = document.querySelector('.filter-list button.active'); const cat = active ? active.dataset.filter : 'all'
	const type = (el('type-filter') && el('type-filter').value) || 'any'
	const price = (el('price-filter') && el('price-filter').value) || 'any'

	let res = state.products.slice()
	if(cat && cat !== 'all') res = res.filter(p=> p.category === cat)
	if(q) res = res.filter(p=> (p.name||'').toLowerCase().includes(q) || (p.short_description||'').toLowerCase().includes(q) || (p.tags||[]).join(' ').toLowerCase().includes(q))
	if(type && type !== 'any') res = res.filter(p=> (p.type||'').toLowerCase() === type.toLowerCase())
	if(price !== 'any'){
	  if(price==='under500') res = res.filter(p=>p.price && p.price<=500)
	  if(price==='500-2k') res = res.filter(p=>p.price && p.price>500 && p.price<=2000)
	  if(price==='2k+') res = res.filter(p=>p.price && p.price>2000)
	}

	state.filtered = res
	const grid = el('market-grid') || el('market-cards')
	if(grid){ grid.innerHTML=''; res.forEach(p=> grid.appendChild(makeCard(p))) }
  }

  /* Global search + autocomplete based on local JSON */
  function bindGlobalSearch(){
	const input = el('global-search') || el('mp-search')
	if(!input) return
	const list = document.createElement('div'); list.className='search-suggestions card'; list.style.position='absolute'; list.style.zIndex='80'; list.style.display='none'; list.style.maxHeight='320px'; list.style.overflow='auto'
	input.parentElement.style.position='relative'; input.parentElement.appendChild(list)

	let timer
	input.addEventListener('input', (ev)=>{
	  clearTimeout(timer); timer = setTimeout(()=>{
		const q = input.value.trim().toLowerCase()
		if(!q){ list.style.display='none'; return }
		const candidates = state.products.filter(p=> (p.name||'').toLowerCase().includes(q) || (p.tags||[]).join(' ').toLowerCase().includes(q)).slice(0,8)
		list.innerHTML=''
		candidates.forEach(p=>{ const it = document.createElement('div'); it.className='search-suggestion-item'; it.style.padding='10px'; it.style.cursor='pointer'; it.innerHTML = `<strong>${escapeHtml(p.name)}</strong><div class="subtle" style="font-size:12px">${escapeHtml(p.category)} • ${fmtPrice(p.price)}</div>`; it.addEventListener('click', ()=>{ location.href = `/product.html?id=${encodeURIComponent(p.id)}` }); list.appendChild(it) })
		list.style.display = candidates.length ? 'block' : 'none'
	  },120)
	})

	document.addEventListener('click', (e)=>{ if(!list.contains(e.target) && e.target !== input) list.style.display='none' })
  }

  /* small util */
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

  document.addEventListener('DOMContentLoaded', init)

  // Expose applyFilters to window for inline handlers if needed
  window.NGS = { applyFilters }

})();
