// Marketplace renderer: fetch products.json, render grids, filters, search, lazy-load and animations
(function(){
	'use strict'
	const state = {
		products: [],
		filtered: [],
		categories: []
	}

	function fmtPrice(p){ if(!p || p===0) return 'Contact'; return typeof p==='number'? `$${p.toLocaleString()}`: p }

	function calcDiscount(p, oldp){ if(!oldp||oldp<=p) return null; const pct = Math.round((1 - (p/oldp))*100); return `-${pct}%` }

	function safeText(n,t){ n.textContent = t }

	// Lazyload + reveal observers
	const imgObserver = new IntersectionObserver((entries)=>{
		entries.forEach(e=>{
			if(e.isIntersecting){
				const img = e.target; img.src = img.dataset.src; img.removeAttribute('data-src'); imgObserver.unobserve(img)
			}
		})
	},{rootMargin:'200px'})

	const revealObserver = new IntersectionObserver((entries)=>{
		entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); revealObserver.unobserve(e.target) } })
	},{threshold:0.08})

	function createCard(p){
		const card = document.createElement('article'); card.className = 'card reveal rgb-shadow'
		card.tabIndex = 0

		const media = document.createElement('div'); media.className='card-media'
		const img = document.createElement('img'); img.alt = p.name; img.className='card-img';
		// lazy-load via data-src
		img.dataset.src = p.image || '/assets/img/placeholder.svg'
		img.loading = 'lazy'
		media.appendChild(img)
		card.appendChild(media)

		const h3 = document.createElement('h3'); safeText(h3,p.name)
		const desc = document.createElement('p'); desc.className='muted'; safeText(desc,p.short_description)
		const meta = document.createElement('div'); meta.className='meta'; safeText(meta, `${p.category} • ${fmtPrice(p.price)}`)

		const priceWrap = document.createElement('div'); priceWrap.className='price-wrap'
		const price = document.createElement('div'); price.className='price'; safeText(price, fmtPrice(p.price))
		priceWrap.appendChild(price)
		if(p.old_price && p.old_price>p.price){ const old = document.createElement('div'); old.className='old-price'; safeText(old, fmtPrice(p.old_price)); priceWrap.appendChild(old) }

		// badges
		const badges = document.createElement('div'); badges.className='badges'
		if(Array.isArray(p.tags)){
			if(p.tags.includes('new')){ const b = document.createElement('span'); b.className='badge badge-new'; b.textContent='Nuevo'; badges.appendChild(b) }
			if(p.tags.includes('top-seller')||p.tags.includes('top-seller')){ const b = document.createElement('span'); b.className='badge badge-top'; b.textContent='Top Seller'; badges.appendChild(b) }
		}
		const disc = calcDiscount(p.price,p.old_price)
		if(disc){ const b = document.createElement('span'); b.className='badge badge-disc'; b.textContent = disc; badges.appendChild(b) }

		const actions = document.createElement('div'); actions.className='card-actions'
		const btn = document.createElement('a'); btn.href = `/marketplace.html#p${p.id}`; btn.className='btn btn-primary'; btn.textContent='Ver'
		actions.appendChild(btn)

		// rating
		const rating = document.createElement('div'); rating.className='rating'
		const stars = Math.round(p.rating||0)
		rating.textContent = '★'.repeat(stars) + '☆'.repeat(5-stars) + ` ${p.rating||0} (${p.reviews_count||0})`

		card.appendChild(badges)
		card.appendChild(h3); card.appendChild(desc); card.appendChild(meta); card.appendChild(priceWrap); card.appendChild(rating); card.appendChild(actions)

		// attach observers
		revealObserver.observe(card)
		imgObserver.observe(img)

		// hover animation
		card.addEventListener('mouseenter', ()=> card.classList.add('hover'))
		card.addEventListener('mouseleave', ()=> card.classList.remove('hover'))

		return card
	}

	function renderGrid(list, container){
		container.innerHTML = ''
		const frag = document.createDocumentFragment()
		list.forEach(p=>{ frag.appendChild(createCard(p)) })
		container.appendChild(frag)
	}

	function buildFilters(categories){
		const filterToolbar = document.querySelector('.filter-list')
		if(!filterToolbar) return
		filterToolbar.innerHTML = ''
		const allBtn = document.createElement('button'); allBtn.className='chip active'; allBtn.dataset.filter='all'; allBtn.textContent='Todos'
		filterToolbar.appendChild(allBtn)
		categories.forEach(cat=>{ const b=document.createElement('button'); b.className='chip'; b.dataset.filter=cat; b.textContent=cat; filterToolbar.appendChild(b) })
		filterToolbar.addEventListener('click', (e)=>{
			const btn = e.target.closest('button'); if(!btn) return
			Array.from(filterToolbar.querySelectorAll('button')).forEach(x=>x.classList.remove('active'))
			btn.classList.add('active')
			applyFilters()
		})
	}

	function applyFilters(){
		const q1 = (document.getElementById('mp-search') && document.getElementById('mp-search').value.trim().toLowerCase()) || (document.getElementById('global-search') && document.getElementById('global-search').value.trim().toLowerCase()) || ''
		const activeChip = document.querySelector('.filter-list button.active')
		const cat = activeChip && activeChip.dataset.filter
		const priceSel = document.getElementById('price-filter') ? document.getElementById('price-filter').value : 'any'
		const ratingSel = document.getElementById('rating-filter') ? Number(document.getElementById('rating-filter').value) : 0

		let res = state.products.slice()
		if(cat && cat!=='all') res = res.filter(p=>p.category === cat)
		if(q1) res = res.filter(p=> (p.name||'').toLowerCase().includes(q1) || (p.short_description||'').toLowerCase().includes(q1) || (p.tags||[]).join(' ').toLowerCase().includes(q1) )
		if(priceSel!=='any'){
			if(priceSel==='under500') res = res.filter(p=>p.price && p.price>0 && p.price<=500)
			if(priceSel==='500-2k') res = res.filter(p=>p.price && p.price>500 && p.price<=2000)
			if(priceSel==='2k+') res = res.filter(p=>p.price && p.price>2000)
		}
		if(ratingSel>0) res = res.filter(p=> (p.rating||0) >= ratingSel)

		state.filtered = res
		const el = document.getElementById('market-cards') || document.getElementById('market-grid')
		if(el) renderGrid(res, el)
	}

	function setupExtraControls(){
		const filters = document.querySelector('.filters')
		if(!filters) return
		// price select
		if(!document.getElementById('price-filter')){
			const sel = document.createElement('select'); sel.id='price-filter'; sel.className='chip'; sel.innerHTML = `<option value="any">Precio</option><option value="under500">≤ $500</option><option value="500-2k">$500–$2k</option><option value="2k+">$2k+</option>`
			filters.appendChild(sel)
			sel.addEventListener('change', applyFilters)
		}
		if(!document.getElementById('rating-filter')){
			const sel = document.createElement('select'); sel.id='rating-filter'; sel.className='chip'; sel.innerHTML = `<option value="0">Rating</option><option value="4">≥ 4★</option><option value="4.5">≥ 4.5★</option><option value="5">5★</option>`
			filters.appendChild(sel)
			sel.addEventListener('change', applyFilters)
		}
	}

	function renderCarousels(){
		// populate any .product-row with 6 items for category
		const rows = Array.from(document.querySelectorAll('.product-row'))
		rows.forEach(row=>{
			const slug = row.dataset.products || ''
			const cat = mapSlugToCategory(slug)
			const list = state.products.filter(p=> p.category === cat).slice(0,6)
			// render horizontal scroll
			row.innerHTML = ''
			const sc = document.createElement('div'); sc.className='carousel'
			list.forEach(p=>{
				const c = createCard(p); c.classList.add('carousel-item'); sc.appendChild(c)
			})
			row.appendChild(sc)
			// update Ver más link
			const foot = row.parentElement.querySelector('.section-foot a')
			if(foot) foot.href = `/marketplace.html?category=${encodeURIComponent(cat)}`
		})
	}

	function mapSlugToCategory(slug){
		slug = (slug||'').toLowerCase()
		if(!slug) return ''
		// try direct match
		const found = state.categories.find(c=> c.toLowerCase() === slug || c.toLowerCase().includes(slug) || slug.includes(c.toLowerCase().split(' ')[0]))
		return found || state.categories.find(c=>c.toLowerCase().includes(slug)) || state.categories[0]
	}

	// initialise
	function init(){
		fetch('/data/products.json').then(r=>r.json()).then(arr=>{
			state.products = arr
			state.categories = Array.from(new Set(arr.map(p=>p.category))).filter(Boolean)
			// if marketplace page has filter-list, build filters
			buildFilters(state.categories)
			setupExtraControls()
			// initial render
			state.filtered = state.products.slice()
			const el = document.getElementById('market-cards') || document.getElementById('market-grid')
			if(el) renderGrid(state.filtered, el)
			// trends
			const trendsEl = document.getElementById('trends-preview')
			if(trendsEl){ const top = state.products.slice().sort((a,b)=> (b.rating||0)-(a.rating||0)).slice(0,4); top.forEach(t=>{ const c=createCard(t); trendsEl.appendChild(c) }) }
			// carousels on home
			renderCarousels()

			// wire search inputs
			const mpSearch = document.getElementById('mp-search'); if(mpSearch){ mpSearch.addEventListener('input', debounce(applyFilters,180)) }
			const gSearch = document.getElementById('global-search'); if(gSearch){ gSearch.addEventListener('input', debounce(applyFilters,180)) }

			// handle query params (category)
			const params = new URLSearchParams(window.location.search)
			const qcat = params.get('category')
			if(qcat){ const btn = document.querySelector(`.filter-list button[data-filter="${qcat}"]`); if(btn){ btn.click() } else { // set filter manually
					document.querySelectorAll('.filter-list button').forEach(x=>x.classList.remove('active'))
					const gen = document.createElement('button'); gen.className='chip active'; gen.dataset.filter=qcat; gen.textContent=qcat; document.querySelector('.filter-list').prepend(gen); applyFilters()
			}}

		}).catch(err=>{ console.error('Failed to load products.json', err); const el = document.getElementById('market-cards'); if(el) el.innerHTML = '<div class="muted">No products available</div>' })
	}

	// simple debounce
	function debounce(fn, wait){ let t; return function(...a){ clearTimeout(t); t = setTimeout(()=>fn.apply(this,a), wait) } }

	document.addEventListener('DOMContentLoaded', init)

})();
