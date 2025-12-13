/* Modern marketplace renderer and global search
   - Loads /data/product-data.json and /data/category-data.json with fallbacks
   - Renders homepage, marketplace, product and category pages
   - Provides global autocomplete search using local JSON
*/
(function(){
  'use strict'
	const state = { products: [], categories: [], providers: [], filtered: [], categoryObjects: [] }
	const CACHE_TTL = 1000 * 60 * 60 * 6 // 6 hours
	const CACHE_KEYS = { catalog: 'ngs:catalog', cats: 'ngs:cats', providers: 'ngs:providers' }

  // Helpers
  const fmtPrice = p => (p===0||p===null||p===undefined) ? 'Contact' : (typeof p === 'number' ? `$${p.toLocaleString()}` : p)
  const qs = () => Object.fromEntries(new URLSearchParams(location.search))
  const el = id => document.getElementById(id)

	/* Minimal escape + URL/img sanitizers (used to harden dynamic HTML insertion) */
	function _escape(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
	function safeHref(u){ try{ if(!u) return '#'; const s=String(u).trim(); if(/^(javascript:|data:)/i.test(s)) return '#'; return _escape(s); }catch(e){return '#'} }
	function safeImgSrc(u){ try{ if(!u) return '/assets/img/vision-pro.svg'; const s=String(u).trim(); if(/^(javascript:)/i.test(s)) return '/assets/img/vision-pro.svg'; return _escape(s); }catch(e){ return '/assets/img/vision-pro.svg' } }

	/* Lightweight client-side observability (local-only)
	   - Records events: page_view, click_cta, submit_vendor_form
	   - Stores in localStorage under `ngs:metrics` with rotation and age trimming
	   - No external reporting. Provides a disabled hook for future export.
	*/
	(function metricsCollector(){
		const METRICS_KEY = 'ngs:metrics'
		const MAX_ENTRIES = 500
		const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

		function load(){ try{ const raw = localStorage.getItem(METRICS_KEY); if(!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; }catch(e){ return [] } }
		function save(arr){ try{ localStorage.setItem(METRICS_KEY, JSON.stringify(arr)); }catch(e){} }
		function prune(arr){ const now = Date.now(); let out = arr.filter(e=> !e.ts || (now - e.ts) < MAX_AGE_MS); if(out.length > MAX_ENTRIES) out = out.slice(out.length - MAX_ENTRIES); return out }

		function record(type, payload){ try{
			const entry = { ts: Date.now(), type: String(type), payload: payload || {} }
			const arr = load(); arr.push(entry)
			const pruned = prune(arr)
			save(pruned)
			// keep a small in-memory pointer for quick dev inspection
			window.__NGS_METRICS = window.__NGS_METRICS || []
			window.__NGS_METRICS.push(entry)
			if(window.__NGS_METRICS.length > 200) window.__NGS_METRICS.shift()
		}catch(e){}
		}

		// Expose safe API; export disabled by default
		window.NGS_METRICS = {
			record,
			get: ()=> load(),
			clear: ()=>{ try{ localStorage.removeItem(METRICS_KEY); window.__NGS_METRICS = []; }catch(e){} },
			exportIfEnabled: ()=>{ // placeholder hook for server-side export (disabled by default)
				if(window.__NGS_EXPORT_ENABLED) return load(); return { enabled:false }
			}
		}

		// Automatic listeners
		// - page_view (recorded on DOMContentLoaded/init)
		// - click_cta (on anchors/buttons with class btn-primary or data-track)
		// - submit_vendor_form (on provider form submit or prov-submit click)
		document.addEventListener('click', function(e){ try{
			const t = e.target.closest && e.target.closest('a,button') ? e.target.closest('a,button') : e.target
			if(!t) return
			const isCTA = (t.matches && (t.matches('.btn-primary') || t.hasAttribute('data-track') || t.getAttribute('role')==='button'))
			if(isCTA){
				record('click_cta', { tag: t.tagName, text: (t.innerText||t.textContent||'').trim().slice(0,200), href: (t.getAttribute && t.getAttribute('href')) || null, id: t.id || null, classes: t.className || '' })
			}
			// provider submit button quick hook
			if(t.id === 'prov-submit' || t.id === 'prov-submit-btn' || t.getAttribute('data-prov-submit') === '1'){
				record('submit_vendor_form', { source: 'providers_page', id: t.id })
			}
		}catch(e){} }, true)

		// record submit events for vendor onboarding forms (heuristic)
		document.addEventListener('submit', function(e){ try{
			const f = e.target
			if(!(f && f.querySelector)) return
			const hasCompany = !!f.querySelector('input[name="company"], input#prov-name, form#provider-form')
			if(hasCompany){ record('submit_vendor_form', { action: f.getAttribute('action') || null, id: f.id || null }) }
		}catch(err){} }, true)

		// record page view when script loads (init also calls record on DOM ready)
		try{ record('page_view', { path: location.pathname, search: location.search, title: document.title }) }catch(e){}
	})()

	// Commission helpers
	function commissionRateForTier(tier){
		if(!tier) return 12
		const t = String(tier).toUpperCase()
		if(t === 'PREMIUM') return 20
		if(t === 'PRO') return 15
		return 12 // STANDARD
	}

	function calculateCommission(tier, price){
		const rate = commissionRateForTier(tier)
		const p = (typeof price === 'number' && !isNaN(price)) ? price : 0
		return Math.round((rate/100) * p * 100) / 100 // round to cents
	}

	function isAdmin(){
		// Simulated admin check (always true per requirements). Replace with real auth in backend.
		return true
	}

	function maskIBAN(iban){ if(!iban) return '' ; const s = String(iban).replace(/\s+/g,''); if(s.length<=6) return 'IBAN hidden'; return s.slice(0,2) + ' ' + '••••••••••' + ' ' + s.slice(-4) }

	// Fetch with simple localStorage cache and TTL
	async function fetchWithCache(url, cacheKey, fallback){
		try{
			const raw = localStorage.getItem(cacheKey)
			if(raw){
				const parsed = JSON.parse(raw)
				if(parsed && parsed.ts && (Date.now() - parsed.ts) < CACHE_TTL && parsed.payload) return parsed.payload
			}
		}catch(e){ /* ignore parse */ }
		try{
			const r = await fetch(url, {cache:'no-cache'})
			if(!r.ok) throw new Error('not found')
			const json = await r.json()
			try{ localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload: json })) }catch(e){}
			return json
		}catch(e){
			return (typeof fallback !== 'undefined') ? fallback : []
		}
	}

  async function init(){
	const embeddedProducts = (window.__PRODUCTS__ && Array.isArray(window.__PRODUCTS__)) ? window.__PRODUCTS__ : null
	const embeddedCats = (window.__CATEGORIES__ && Array.isArray(window.__CATEGORIES__)) ? window.__CATEGORIES__ : null

	// load and normalize data (prefer full product-catalog.json, fallback to product-data.json)
	const rawCatalog = await fetchWithCache('/data/product-catalog.json', CACHE_KEYS.catalog, null)
	const rawProducts = embeddedProducts || rawCatalog || await fetchWithCache('/data/product-data.json', CACHE_KEYS.catalog, embeddedProducts || [])
	state.products = normalizeProducts(rawProducts)

	// load categories and providers (optional assets)
	const rawCats = embeddedCats || await fetchWithCache('/data/category-data.json', CACHE_KEYS.cats, null) || await fetchWithCache('/data/categories.json', CACHE_KEYS.cats, null)
	state.providers = await fetchWithCache('/data/providers-data.json', CACHE_KEYS.providers, [])
	state.categories = normalizeCategories(rawCats, state.products)

	// small slug helper and keep richer category objects available for rendering
	function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') }
    state.categoryObjects = Array.isArray(rawCats) ? rawCats.map(c=> {
    	if(typeof c === 'string') return { id: slugify(c), name: c, icon: '', description: '', image: '' }
    	return { id: c.id || slugify(c.name||''), name: c.name || String(c), icon: c.icon || '', description: c.description || '', image: c.image || '' }
    }) : []

	// try to load image manifest for optimized assets (optional)
	try{
		state.imgManifest = await fetchWithCache('/assets/img/optimized/manifest.json', 'ngs:imgmanifest', {})
	}catch(e){ state.imgManifest = {} }

	state.filtered = state.products.slice()

		bindGlobalSearch()
		routeRender()
		enhanceSite()
		// UI: header scroll behavior
		window.addEventListener('scroll', ()=>{
			const hdr = document.querySelector('.site-header')
			if(!hdr) return
			if(window.scrollY > 18) hdr.classList.add('scrolled')
			else hdr.classList.remove('scrolled')
		})
		// load favorites
		loadFavorites()
  }

/* ==========================
	 Continuous passive security watcher (client-side, no external reporting)
	 - Detect suspicious URL params and reflect-like patterns
	 - Monitor forms for flood/spam behavior (session-local)
	 - Sanitize externals (ensure rel on anchors) and remove dangerous image onerror/onload attrs
	 - MutationObserver to detect injected scripts or suspicious HTML insertions
	 - All findings are kept in-memory at `window.__SECURITY_EVENTS` and logged only in dev
	 ========================== */
(function securityWatch(){
	try{
		window.__SECURITY_EVENTS = window.__SECURITY_EVENTS || []
		const isDev = (function(){ try{ const h = location.hostname; if(h==='localhost' || h==='127.0.0.1') return true; if(location.search.indexOf('ngs_debug=1')!==-1) return true; return false }catch(e){return false} })()
		function record(tag, data){ const ev = { ts: Date.now(), tag, data }; window.__SECURITY_EVENTS.push(ev); if(isDev){ try{ console.groupCollapsed('[SECURITY][EVENT] %s', tag); console.warn(ev); console.groupEnd(); }catch(e){} } }

		// simple param scanner
		function scanParams(){ try{
			const params = new URLSearchParams(location.search);
			for(const [k,v] of params.entries()){
				if(!v) continue;
				const low = v.toLowerCase();
				if(low.length>200 || /<\/?script|javascript:|onerror=|onload=|eval\(|document\.cookie|window\.location/.test(low)){
					record('suspicious_param', { key:k, value: (v.length>200? v.slice(0,200)+'...': v) })
				}
			}
		}catch(e){}}

		// enforce rel on external anchors and block javascript: hrefs
		function hardenAnchors(){ try{
			const anchors = document.querySelectorAll('a[href]');
			anchors.forEach(a=>{
				try{
					const href = a.getAttribute('href')||'';
					if(/^(javascript:|data:)/i.test(href.trim())){ a.setAttribute('href','#'); record('blocked_href_scheme',{href}) }
					// if external origin, ensure rel noopener noreferrer
					try{ const url = new URL(href, location.href); if(url.origin !== location.origin){ const rel = (a.getAttribute('rel')||''); if(!/noopener/i.test(rel) || !/noreferrer/i.test(rel)){ a.setAttribute('rel', (rel + ' noopener noreferrer').trim()); record('enforced_rel',{href}) } } }catch(e){}
				}catch(e){}
			})
		}catch(e){}
		// remove dangerous inline attributes for images and elements (keep onclick to avoid breaking nav)
		function removeDangerAttrs(){ try{
			const blacklist = ['onerror','onload','onmouseenter','onmouseleave','onmouseover','onfocus','onblur']
			blacklist.forEach(attr=>{
				document.querySelectorAll('['+attr+']').forEach(el=>{ el.removeAttribute(attr); record('removed_attr',{attr,tag:el.tagName}) })
			})
		}catch(e){}
		// Mutation observer for injected script tags or suspicious HTML insertions
		function watchMutations(){ try{
			const mo = new MutationObserver(muts=>{
				muts.forEach(m=>{
					if(m.addedNodes && m.addedNodes.length){ m.addedNodes.forEach(n=>{
						try{
							if(n.nodeType===1){ // element
								const html = n.innerHTML || '';
								if(/<script\b|onerror=|javascript:/.test(html.toLowerCase())){ record('mutation_suspicious', { html: html.slice(0,200) }) }
							}else if(n.nodeType===3){ const txt = n.nodeValue || ''; if(/<script\b/.test(txt.toLowerCase())) record('mutation_text_suspicious',{text:txt.slice(0,200)}) }
						}catch(e){}
					}) }
				})
			})
			mo.observe(document.documentElement || document.body, { childList:true, subtree:true, characterData:true })
			window.__SECURITY_MO = mo
		}catch(e){}

		// form flood/spam detector (session-local counters)
		function monitorForms(){ try{
			const THRESHOLD_COUNT = 6; const WINDOW_MS = 10*1000
			function getKey(fid){ return 'ngs:form:'+fid+':s' }
			document.querySelectorAll('form').forEach((f,i)=>{
				const fid = f.id || f.name || ('form-'+i)
				f.addEventListener('submit', (ev)=>{
					try{
						const key = getKey(fid); const raw = sessionStorage.getItem(key)||'[]'; const arr = JSON.parse(raw||'[]'); const now = Date.now(); arr.push(now); const windowed = arr.filter(t=> now - t < WINDOW_MS); sessionStorage.setItem(key, JSON.stringify(windowed)); if(windowed.length>=THRESHOLD_COUNT){ record('form_flood',{form:fid,count:windowed.length}); }
						// detect repeated identical values for typical fields (email/message)
						try{ const values = Array.from(new FormData(f)).map(([k,v])=>String(v).trim()).join('|'); const hashKey = key+':last'; const last = sessionStorage.getItem(hashKey)||''; if(last && last === values){ record('form_repeat',{form:fid}) } sessionStorage.setItem(hashKey, values) }catch(e){}
					}catch(e){}
				})
			})
		}catch(e){}

		// scan for reflected params in DOM (simple heuristic)
		function scanReflections(){ try{
			const params = new URLSearchParams(location.search); for(const [k,v] of params.entries()){ if(!v) continue; if(/<|>|script|javascript:|onerror=/i.test(v)){
				// if raw value appears in page text, flag potential reflection
				try{ const body = document.body && document.body.innerText || ''; if(body.indexOf(v) !== -1) record('possible_reflection',{key:k, snippet: v.slice(0,200)}) }catch(e){}
			}} }catch(e){}
		}

		// initial run
		scanParams(); hardenAnchors(); removeDangerAttrs(); watchMutations(); monitorForms(); scanReflections();

		// periodic lightweight checks
		setInterval(()=>{ try{ hardenAnchors(); removeDangerAttrs(); scanParams() }catch(e){} }, 15*1000)

		// robots.txt quick check (passive)
		try{ fetch('/robots.txt',{cache:'no-cache'}).then(r=>r.text()).then(t=>{ if(t && /Disallow:\s*\/\s*/.test(t)){ record('robots_disallow_all',{snippet: t.split('\n').slice(0,6).join('\n')}) } }) }catch(e){}

	}catch(e){/* fail silently */}
})()

  /* Data normalization helpers - ensure safe defaults and schema shape */
  function normalizeProducts(list){
    if(!Array.isArray(list)) return []
    return list.map(p=>({
			id: String(p.id||p.slug||'').trim(),
			title: String(p.title||p.name||p.id||'Untitled Product'),
			name: String(p.title||p.name||p.id||'Untitled Product'),
			// products store category as id (e.g., 'robotics') - keep as-is
			category: String(p.category||p.cat||'uncategorized'),
			type: String(p.type||'service'),
			price: (typeof p.price === 'number') ? p.price : (p.price && !isNaN(Number(p.price)) ? Number(p.price) : null),
			short_description: String(p.short_description||p.description||''),
			long_description: String(p.long_description||p.description||''),
			images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : ['/assets/img/vision-pro.svg']),
			// convenience single-image + alt text
			image: (Array.isArray(p.images) && p.images.length) ? p.images[0] : (p.images ? (Array.isArray(p.images)?p.images[0]:p.images) : '/assets/img/vision-pro.svg'),
			imageAlt: p.imageAlt || p.title || p.name || 'Producto',
			vendorName: p.vendorName || p.vendor || '',
			vendorLink: p.vendorLink || p.vendorLink || p.vendor || '',
			tags: Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []),
			rating: (typeof p.rating === 'number') ? p.rating : 0,
			specs: Array.isArray(p.specs) ? p.specs : (p.specs ? [p.specs] : []),
			stock: (typeof p.stock === 'number') ? p.stock : (p.stock ? Number(p.stock) : null)
    }))
  }

/* Performance helpers: lazy-load non-critical images, preload hero images and fonts,
	 and apply image-set backgrounds dynamically for known wallpaper classes.
	 - Runs on DOMContentLoaded and is conservative (no destructive rewrites).
*/
(function perfEnhance(){
	try{
		document.addEventListener('DOMContentLoaded', function(){
			try{
				// Lazy-load non-hero images
				document.querySelectorAll('img').forEach(function(img){
					if(img.closest && img.closest('.hero')){
						// preload hero image to improve LCP
						const src = img.currentSrc || img.getAttribute('src')
						if(src){
							try{ if(!document.querySelector('link[rel="preload"][href="'+src+'"]')){
								const l = document.createElement('link'); l.rel='preload'; l.as='image'; l.href = src; document.head.appendChild(l)
							}}catch(e){}
						}
						return
					}
					if(!img.hasAttribute('loading')) img.setAttribute('loading','lazy')
				})

				// Ensure primary font preload exists (conservative; idempotent)
				try{
					const orbit = 'https://fonts.gstatic.com/s/orbitron/v35/yMJRMIlzdpvBhQQL_Qq7dy1biN15.woff2'
					if(!document.querySelector('link[rel="preload"][href="'+orbit+'"]')){
						const lf = document.createElement('link'); lf.rel='preload'; lf.as='font'; lf.href = orbit; lf.type='font/woff2'; lf.crossOrigin='anonymous'; document.head.appendChild(lf)
					}
				}catch(e){}

				// Attempt to set CSS image-set for known .bg-* wallpaper classes.
				// This favors AVIF/WebP variants if present while leaving existing
				// fallback rules intact.
				try{
					const map = { home: 'home-hero', marketplace: 'marketplace-bg', product: 'product-bg', providers: 'providers-bg', 'vendor-register': 'vendor-register-bg', security: 'security-bg', quantum: 'quantum-bg', blog: 'blog-bg', sponsors: 'sponsors-bg' }
					Object.keys(map).forEach(function(k){
						const sel = '.bg-'+k
						document.querySelectorAll(sel).forEach(function(el){
							try{
								const base = '/assets/wallpapers/' + map[k]
								const avif = base + '.avif'
								const webp = base + '.webp'
								const jpg = base + '.jpg'
								el.style.backgroundImage = "image-set(url('"+avif+"') type('image/avif') 1x, url('"+webp+"') type('image/webp') 1x, url('"+jpg+"') type('image/jpeg') 1x)"
								el.style.backgroundSize = el.style.backgroundSize || 'cover'
								el.style.backgroundPosition = el.style.backgroundPosition || 'center'
							}catch(e){}
						})
					})
				}catch(e){}

			}catch(e){/* perf enhancement quietly fails */}
		})
	}catch(e){}
})()

/* Product rotator and click-to-read description (desktop-only)
	 - Shows a rotating featured product set in element with id `featured-products`
	 - If product data not present, picks from state.products when available
*/
(function productRotator(){
	try{
		function createCard(p){
			const a = document.createElement('article'); a.className = 'card product-card featured-card';
			const img = document.createElement('img'); img.src = safeImgSrc(p.image||'/assets/img/vision-pro.svg'); img.alt = _escape(p.imageAlt||p.title||'Producto'); img.loading = 'lazy'; img.style.width='100%'; img.style.height='auto'; img.style.borderRadius='8px';
			const h = document.createElement('h3'); h.textContent = p.title || p.name || 'Producto';
			const d = document.createElement('div'); d.className='product-meta'; d.textContent = p.short_description || p.long_description || '';
			const btn = document.createElement('button'); btn.className='btn btn-primary'; btn.textContent='Ver detalle'; btn.setAttribute('type','button');
			btn.addEventListener('click', ()=> showProductDetail(p));
			a.appendChild(img); a.appendChild(h); a.appendChild(d); a.appendChild(btn);
			return a
		}

		function showProductDetail(p){
			// simple modal
			let modal = document.getElementById('ngs-product-modal');
			if(!modal){ modal = document.createElement('div'); modal.id='ngs-product-modal'; modal.className='quick-view-modal'; modal.style.padding='28px'; modal.innerHTML = '<div class="quick-view-card"><button id="ngs-close-modal" class="btn-ghost" style="float:right">Cerrar</button><div id="ngs-product-detail"></div></div>' ; document.body.appendChild(modal); document.getElementById('ngs-close-modal').addEventListener('click', ()=> { modal.remove() }) }
			const detail = document.getElementById('ngs-product-detail'); if(detail){ detail.innerHTML = `<h2>${_escape(p.title||p.name)}</h2><p class="muted">${_escape(p.vendorName||'')}</p><p>${_escape(p.long_description||p.short_description||'Sin descripción disponible.')}</p><p class="product-meta">Precio: ${fmtPrice(p.price)}</p>` }
		}

		function rotate(){
			const container = document.getElementById('featured-products');
			if(!container) return;
			const list = (window.__PRODUCTS__ && Array.isArray(window.__PRODUCTS__)) ? window.__PRODUCTS__ : (window.__INITIAL_PRODUCTS__ || (window.NGS && window.NGS.products) || window.__NGS_PRODUCTS || null);
			const source = Array.isArray(list) && list.length ? list : (window.__NGS_METRICS && window.__NGS_METRICS.products) || (window.__NGS_PRODUCTS_STATIC || [])
			const pool = (state && state.products && state.products.length) ? state.products : (Array.isArray(source)? source : [])
			if(!pool.length) return;
			container.innerHTML = '';
			// pick 4 at random
			const picks = [];
			while(picks.length < 4 && picks.length < pool.length){ const p = pool[Math.floor(Math.random()*pool.length)]; if(!picks.includes(p)) picks.push(p) }
			picks.forEach(p=> container.appendChild(createCard(p)) )
		}

		// rotate every 6s
		document.addEventListener('DOMContentLoaded', ()=>{ rotate(); setInterval(rotate, 6000) })
	}catch(e){/* silent */}
})()

    if(Array.isArray(raw)) return raw.map(c=>({ name: String(c.name||c), slug: String(c.slug || (c.name||'').toLowerCase().replace(/\s+/g,'-')) }))
    // fallback: derive from products
    const set = Array.from(new Set((products||[]).map(p=>p.category).filter(Boolean)))
    return set.map(name=>({ name, slug: name.toLowerCase().replace(/\s+/g,'-') }))
  }

	/* Site enhancements: contact injection, provider handlers, providers renderer */
	const CONTACT_EMAIL = 'wilfre@neuralgpt.store'

	function enhanceSite(){
		// inject contact email into footers if not present (site-footer and generic footers)
		document.querySelectorAll('footer .wrap, footer .container, .site-footer .wrap').forEach(wrap=>{
			if(!wrap.querySelector('.contact-email')){
				const d = document.createElement('div')
				d.className = 'contact-email muted'
				d.style.marginTop = '8px'
				d.innerHTML = `Contacto: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`
				wrap.appendChild(d)
			}
		})

		// replace anchors that point to #contact with mailto
		document.querySelectorAll('a[href$="#contact"]').forEach(a=>{ if(!a.dataset.contactified){ a.href = `mailto:${CONTACT_EMAIL}`; a.dataset.contactified = '1' } })

		// run providers render on pages that need it
		if(location.pathname.endsWith('providers.html')) renderProviders()
		// populate provider view and attach forms if page uses them
		if(location.pathname.endsWith('providers-view.html')) renderProvidersView()

		// Accessibility: make clickable elements with inline onclick (location.href) keyboard accessible
		try{
			document.querySelectorAll('[onclick]').forEach(function(node){
				try{
					const script = (node.getAttribute('onclick')||'').trim();
					const m = script.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i)
					if(m && m[1]){
						const url = m[1]
						if(!node.hasAttribute('role')) node.setAttribute('role','link')
						if(!node.hasAttribute('tabindex')) node.setAttribute('tabindex','0')
						node.style.cursor = node.style.cursor || 'pointer'
						node.addEventListener('keydown', function(ev){ if(ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); try{ location.href = url }catch(e){} } })
					}
				}catch(e){}
			})
		}catch(e){}

		// Simulated/static forms: intercept forms that post to '#' or have no actionable server
		try{
			document.querySelectorAll('form').forEach(function(f){
				try{
					const act = (f.getAttribute('action')||'').trim();
					if(act === '#' || act === ''){
						// attach polite submit handler and accessible feedback
						if(!f.__ngs_simulated){
							f.__ngs_simulated = true
							f.addEventListener('submit', function(ev){
								ev.preventDefault();
								const msgId = (f.id ? f.id + '-msg' : null)
								let msgEl = msgId ? document.getElementById(msgId) : null
								if(!msgEl){ msgEl = document.createElement('div'); msgEl.className='muted'; msgEl.setAttribute('role','status'); msgEl.setAttribute('aria-live','polite'); msgEl.style.marginTop='12px'; f.parentNode && f.parentNode.insertBefore(msgEl, f.nextSibling) }
								msgEl.textContent = 'Solicitud recibida (simulada). Nos pondremos en contacto pronto.'
								try{ window.NGS_METRICS && window.NGS_METRICS.record && window.NGS_METRICS.record('form_submit_simulated', { id: f.id || null }) }catch(e){}
								try{ f.reset && f.reset() }catch(e){}
							})
						}
					}
				}catch(e){}
			})
		}catch(e){}
	}

	function renderProviders(){
			const elp = document.getElementById('providers-list')
			if(elp){ elp.innerHTML = ''
				const providers = state.providers || []
				providers.forEach(p=>{
					const c = document.createElement('article'); c.className='card product-card'
					// show provider name and count of products from catalog
					const count = state.products.filter(x=> (x.vendorName||'').toLowerCase() === (p.name||'').toLowerCase()).length
					const tier = p.commissionTier || 'STANDARD'
					const prices = state.products.filter(x=> (x.vendorName||'').toLowerCase() === (p.name||'').toLowerCase()).map(x=> x.price).filter(v=> typeof v === 'number')
					const samplePrice = prices.length ? Math.round((prices.reduce((a,b)=>a+b,0)/prices.length)*100)/100 : 100
					const commissionAmount = calculateCommission(tier, samplePrice)
					c.innerHTML = `<h3>${escapeHtml(p.name)}</h3><p class="subtle">${escapeHtml(p.description||'')}</p><div class="subtle">Productos: ${count}</div><div class="muted">Comisión: ${escapeHtml(tier)} — ${commissionRateForTier(tier)}% · Ej: ${fmtPrice(commissionAmount)} sobre ${fmtPrice(samplePrice)}</div><p style="margin-top:8px"><a class="btn" href="/providers-view.html?provider=${encodeURIComponent((p.name||'').replace(/\s+/g,'-'))}">Ver</a> <a class="btn btn-primary" href="${escapeHtml(p.url||'#')}" target="_blank">Visitar</a></p>`
					elp.appendChild(c)
				})
			}

			// provider registration form (simulated)
			const provSubmit = el('prov-submit')
			if(provSubmit){ provSubmit.addEventListener('click', ()=>{
				const msg = el('prov-msg'); if(msg) msg.textContent = 'Formulario simulado: su solicitud ha sido recibida. Nos pondremos en contacto pronto.'
				const form = el('provider-form'); if(form) form.reset()
			}) }
	}

	function renderProvidersView(){
			const params = qs()
			// if provider param present, show provider profile as before
			if(params.provider){
				const name = params.provider.replace(/[-_]/g,' ')
				const pn = el('prov-name'); if(pn) pn.textContent = name
				const pd = el('prov-desc'); if(pd) pd.textContent = 'Perfil y servicios de '+name

				// show admin-only payout and commission details when available
				try{
					const providerKey = params.provider.toLowerCase()
					const providerObj = (state.providers||[]).find(p=> (p.id && p.id.toLowerCase()===providerKey) || ((p.name||'').replace(/\s+/g,'-').toLowerCase()===providerKey) || ((p.name||'').toLowerCase()===providerKey) )
					if(providerObj){
						const statsEl = el('provider-stats')
						if(statsEl){
							const tier = providerObj.commissionTier || 'STANDARD'
							const prices = state.products.filter(x=> (x.vendorName||'').toLowerCase() === (providerObj.name||'').toLowerCase()).map(x=> x.price).filter(v=> typeof v === 'number')
							const samplePrice = prices.length ? Math.round((prices.reduce((a,b)=>a+b,0)/prices.length)*100)/100 : 100
							const commissionAmount = calculateCommission(tier, samplePrice)
							let out = `Comisión: ${escapeHtml(tier)} — ${commissionRateForTier(tier)}% · Ej: ${fmtPrice(commissionAmount)} sobre ${fmtPrice(samplePrice)}`
							if(isAdmin()){
								const p = providerObj.payoutInfo || {}
								out += `<div style="margin-top:8px" class="muted"><strong>Payout:</strong> ${escapeHtml(p.bankName||'')} • ${escapeHtml(p.paymentMethod||'')} • ${escapeHtml(p.billingEmail||'')}</div>`
								if(p.iban){ out += `<div class="muted">IBAN: ${escapeHtml(maskIBAN(p.iban))} <span class="subtle">(IBAN redacted)</span></div>` }
							}
							statsEl.innerHTML = out
						}
					}
				} catch(e){/* ignore */}
			}

			// If category param present, list providers that declare this category (state.providers can contain categories[])
			const byCatEl = el('providers-by-category')
			if(byCatEl){
				const catParam = params.category || params.cat || null
				byCatEl.innerHTML = ''
				const providers = state.providers || []
				const filtered = catParam ? providers.filter(p=> Array.isArray(p.categories) ? p.categories.includes(catParam) : (p.category === catParam)) : providers
				if(filtered.length === 0){ byCatEl.innerHTML = '<div class="muted">No hay proveedores en esta categoría.</div>' }
				else filtered.forEach(p=>{
					const c = document.createElement('article'); c.className='card product-card'
					const count = state.products.filter(x=> (x.vendorName||'').toLowerCase() === (p.name||'').toLowerCase()).length
					const tier = p.commissionTier || 'STANDARD'
					const prices = state.products.filter(x=> (x.vendorName||'').toLowerCase() === (p.name||'').toLowerCase()).map(x=> x.price).filter(v=> typeof v === 'number')
					const samplePrice = prices.length ? Math.round((prices.reduce((a,b)=>a+b,0)/prices.length)*100)/100 : 100
					const commissionAmount = calculateCommission(tier, samplePrice)
					c.innerHTML = `<h3>${escapeHtml(p.name)}</h3><p class="subtle">${escapeHtml(p.description||'')}</p><div class="subtle">Productos: ${count}</div><div class="muted">Comisión: ${escapeHtml(tier)} — ${commissionRateForTier(tier)}% · Ej: ${fmtPrice(commissionAmount)} sobre ${fmtPrice(samplePrice)}</div><p style="margin-top:8px"><a class="btn" href="/providers-view.html?provider=${encodeURIComponent((p.name||'').replace(/\s+/g,'-'))}">Ver</a> <a class="btn btn-primary" href="${escapeHtml(p.url||'#')}" target="_blank">Visitar</a></p>`
					byCatEl.appendChild(c)
				})
			}

			// list products by provider if requested
			const provProductsEl = el('provider-products')
			if(provProductsEl){
				provProductsEl.innerHTML = ''
				const providerParam = params.provider ? params.provider.replace(/[-_]/g,' ').toLowerCase() : null
				const providerName = providerParam ? providerParam : null
				const products = state.products.filter(p=> providerName ? (p.vendorName||'').toLowerCase().replace(/\s+/g,'-') === providerParam : [])
				if(products.length === 0 && params.provider){ provProductsEl.innerHTML = '<div class="muted">No se encontraron productos de este proveedor.</div>' }
				else products.forEach(prod=> provProductsEl.appendChild(makeCard(prod)))
			}

			// attach provider profile forms if present
			const pvForm = el('prov-form'); if(pvForm){ pvForm.addEventListener('submit', e=>{ e.preventDefault(); alert('Solicitud enviada.'); }) }
			const demoForm = el('demo-form'); if(demoForm){ demoForm.addEventListener('submit', e=>{ e.preventDefault(); alert('Demo solicitada. Un representante se pondrá en contacto.'); }) }
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
	function appendInBatches(container, items, makeFn, batchSize = 20){
		let i = 0
		function nextBatch(){
			const frag = document.createDocumentFragment()
			for(let k=0;k<batchSize && i<items.length;k++,i++){
				frag.appendChild(makeFn(items[i]))
			}
			container.appendChild(frag)
			if(i<items.length) requestAnimationFrame(nextBatch)
		}
		nextBatch()
	}

	function renderHome(){
	// categories preview
	const ctn = el('home-categories')
	if(ctn){ ctn.innerHTML = '';
		// use categoryObjects when available to display icons and accurate counts
		const previewCats = (state.categoryObjects && state.categoryObjects.length) ? state.categoryObjects.slice(0,6) : state.categories.slice(0,6).map(n=>({ id: String(n).toLowerCase().replace(/\s+/g,'-'), name: String(n), icon: '' }))
		previewCats.forEach(cat=>{
			const name = cat.name || String(cat)
			const cid = cat.id || (name||'').toLowerCase().replace(/\s+/g,'-')
			const a=document.createElement('a'); a.className='card product-card'; a.href=`/category.html?category=${encodeURIComponent(cid)}`; a.setAttribute('data-slug', cid);
			a.innerHTML=`<h3>${escapeHtml(cat.icon ? (cat.icon + ' ' + name) : name)}</h3><p class="product-meta">Ver productos · ${state.products.filter(p=>p.category===cid).length} disponibles</p>`; ctn.appendChild(a)
		})
	}

		// featured
		const f = el('featured-products'); if(f){ f.innerHTML=''; const featured = state.products.filter(p=> (p.tags||[]).includes('featured')).slice(0,8); appendInBatches(f, featured, makeCard, 6) }

		// trends
		const t = el('trends-preview'); if(t){ t.innerHTML=''; const trends = state.products.slice().sort((a,b)=> (b.rating||0)-(a.rating||0)).slice(0,6); appendInBatches(t, trends, makeCard, 6) }

		// helper: simple matching by category, tags or name
		function matchesKeywords(p, keywords){
			if(!p) return false
			const txt = ((p.name||'') + ' ' + (p.category||'') + ' ' + (p.tags||[]).join(' ')).toLowerCase()
			return keywords.some(k => txt.indexOf(k.toLowerCase()) !== -1)
		}

		// dynamic homepage sections
		const tech = el('tech-2025'); if(tech){ tech.innerHTML=''; const techList = state.products.filter(p=> (p.tags||[]).includes('highlight') || (p.rating||0)>=4.5 || matchesKeywords(p,['ia','edge','accelerator','quantum','inference','neural'])).slice(0,8); appendInBatches(tech, techList, makeCard, 6) }
		const boards = el('boards-top'); if(boards){ boards.innerHTML=''; const boardsList = state.products.filter(p=> matchesKeywords(p,['placa','board','devboard','development','stm32','arduino','raspberry','nucleo']) || (p.category||'').toLowerCase().indexOf('placas')!==-1).slice(0,8); appendInBatches(boards, boardsList, makeCard, 6) }
		const robotics = el('robotics-advanced'); if(robotics){ robotics.innerHTML=''; const roboList = state.products.filter(p=> matchesKeywords(p,['robot','robotics','lidar','actuator','servo','slam']) || (p.category||'').toLowerCase().indexOf('robótica')!==-1).slice(0,8); appendInBatches(robotics, roboList, makeCard, 6) }
		const printing = el('printing-3d'); if(printing){ printing.innerHTML=''; const printList = state.products.filter(p=> matchesKeywords(p,['3d','impresión','printer','filament','resina','fdm']) || (p.category||'').toLowerCase().indexOf('impresión')!==-1).slice(0,8); appendInBatches(printing, printList, makeCard, 6) }
		const cyber = el('cyberfaces'); if(cyber){ cyber.innerHTML=''; const cyberList = state.products.filter(p=> matchesKeywords(p,['cyberface','biomec','biomech','prosthetic','cyber']) || (p.category||'').toLowerCase().indexOf('biomec')!==-1).slice(0,8); appendInBatches(cyber, cyberList, makeCard, 6) }

		// Home: featured providers preview (integración global)
		const homeProviders = el('home-providers')
		if(homeProviders){ homeProviders.innerHTML = ''; const provs = (state.providers||[]).slice(0,6); provs.forEach(p=>{ const a = document.createElement('article'); a.className='card product-card'; const tier = p.commissionTier || 'STANDARD'; const prices = state.products.filter(x=> (x.vendorName||'').toLowerCase() === (p.name||'').toLowerCase()).map(x=> x.price).filter(v=> typeof v === 'number'); const samplePrice = prices.length ? Math.round((prices.reduce((A,B)=>A+B,0)/prices.length)*100)/100 : 100; const commissionAmount = calculateCommission(tier, samplePrice); a.innerHTML = `<h4>${escapeHtml(p.name)}</h4><div class="muted">${escapeHtml(p.category)}</div><p class="subtle">${escapeHtml((p.description||'').slice(0,120))}</p><div class="muted">Comisión: ${escapeHtml(tier)} · ${commissionRateForTier(tier)}% · Ej: ${fmtPrice(commissionAmount)}</div><div style="margin-top:8px"><a class="btn" href="/providers-view.html?provider=${encodeURIComponent((p.name||'').replace(/\s+/g,'-'))}">Ver</a> <a class="btn btn-primary" href="${escapeHtml(p.externalStoreURL||p.officialWebsite||'#')}" target="_blank">Visitar</a></div>`; homeProviders.appendChild(a) }) }
  }

  function renderMarketplace(){
 	// filters
 	const fl = document.querySelector('.filter-list'); if(fl){
 		fl.innerHTML=''
 		const all=document.createElement('button'); all.className='chip active'; all.dataset.filter='all'; all.textContent='Todos'; fl.appendChild(all);
 		const cats = (state.categoryObjects && state.categoryObjects.length) ? state.categoryObjects : (state.categories || []).map(n=>({ id: (String(n||'').toLowerCase().replace(/\s+/g,'-')), name: String(n), icon: '' }))
		cats.forEach(c=>{ const name = c.name || String(c); const b=document.createElement('button'); b.className='chip'; b.dataset.filter=name; b.setAttribute('role','button'); b.setAttribute('aria-pressed','false'); b.textContent = (c.icon ? (c.icon + ' ') : '') + name; fl.appendChild(b) })
 		fl.addEventListener('click', onFilterClick)
 	}

	// extra controls
	const fx = document.querySelector('.filters'); if(fx){ fx.innerHTML=''; const sel=document.createElement('select'); sel.id='type-filter'; sel.setAttribute('aria-label','Filtrar por tipo'); sel.innerHTML='<option value="any">Tipo</option><option value="hardware">Hardware</option><option value="ia">IA</option><option value="service">Servicio</option>'; fx.appendChild(sel); sel.addEventListener('change', applyFilters); const price=document.createElement('select'); price.id='price-filter'; price.setAttribute('aria-label','Filtrar por precio'); price.innerHTML='<option value="any">Precio</option><option value="under500">≤ $500</option><option value="500-2k">$500–$2k</option><option value="2k+">$2k+</option>'; fx.appendChild(price); price.addEventListener('change', applyFilters)

		// tags multi-select
		const tagsWrap = document.createElement('div'); tagsWrap.id = 'tags-filter'; tagsWrap.setAttribute('role','group'); tagsWrap.setAttribute('aria-label','Filtrar por etiquetas');
		const tags = Array.from(new Set(state.products.flatMap(p=> p.tags || []))).slice(0,40)
		tags.forEach(t=>{ const c = document.createElement('button'); c.className='chip'; c.textContent = t; c.dataset.tag = t; c.setAttribute('aria-pressed','false'); c.addEventListener('click', ()=>{ c.classList.toggle('selected'); c.setAttribute('aria-pressed', String(c.classList.contains('selected'))); applyFilters() }); tagsWrap.appendChild(c) })
		fx.appendChild(tagsWrap)

	}

		const grid = el('market-grid'); if(grid){ grid.innerHTML=''; appendInBatches(grid, state.filtered, makeCard, 12) }

		renderSpecialSections()
  }

  function renderProduct(){
		const params = qs(); const id = params.id
		if(!id) return
		const product = state.products.find(p=> p.id === id)
		const title = el('p-title'); if(title) title.textContent = product ? product.title || product.name : id
		// gallery
	 	const gallery = el('p-gallery'); if(gallery){ gallery.innerHTML = ''; if(product && product.images && product.images.length){ product.images.forEach(src=>{ const f = document.createElement('figure'); f.innerHTML = `<img src="${safeImgSrc(src)}" alt="${escapeHtml(product.title||product.name)}" class="card-img">`; gallery.appendChild(f) }) } else { gallery.innerHTML = '<img src="/assets/img/vision-pro.svg" class="card-img">' } }
		const desc = el('p-desc'); if(desc) desc.textContent = product ? product.short_description : 'Sin descripción'
		const longDesc = el('p-long-desc'); if(longDesc) longDesc.innerHTML = product ? escapeHtml(product.long_description) : ''
		const price = el('p-price'); if(price) price.textContent = product ? fmtPrice(product.price) : ''
		const vendor = el('p-vendor'); if(vendor && product){ vendor.innerHTML = product.vendorLink ? `<a href="${safeHref(product.vendorLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(product.vendorName||product.vendor)}</a>` : escapeHtml(product.vendorName||'') }
		const stock = el('p-stock'); if(stock) stock.textContent = (product && (product.stock!==null && product.stock!==undefined)) ? (product.stock>0 ? `${product.stock} en stock` : 'Agotado') : ''
		const specs = el('p-details'); if(specs){ specs.innerHTML = product ? `<ul>${(product.specs||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ul>` : '<div class="muted">Detalles no disponibles</div>' }

		// recommended
		const rec = el('recommended-products'); if(rec){ rec.innerHTML=''; const list = state.products.filter(p=> p.category === (product && product.category) && p.id !== id).slice(0,4); appendInBatches(rec, list, makeCard, 4) }

		// Emit product JSON-LD for SEO (surgical, local-only)
		try{
			if(product){
				const schema = {
					"@context": "https://schema.org",
					"@type": "Product",
					"name": product.title || product.name,
					"description": product.short_description || product.long_description || '',
					"sku": product.id || undefined,
					"image": product.image ? (location.origin + product.image) : (location.origin + '/assets/img/vision-pro.svg'),
					"brand": { "@type": "Organization", "name": "neuralgpt.store" },
					"offers": { "@type": "Offer", "price": product.price || null, "priceCurrency": "USD", "availability": (product.stock>0? "https://schema.org/InStock":"https://schema.org/OutOfStock") }
				}
				const elSchema = document.getElementById('product-schema')
				if(elSchema) elSchema.textContent = JSON.stringify(schema)
			}
		}catch(e){}
  }

	function updateQueryParam(key, value){
		const url = new URL(location.href)
		if(value === null || value === '' || value === 'any') url.searchParams.delete(key)
		else url.searchParams.set(key, String(value))
		// when filters change, reset page
		if(key !== 'page') url.searchParams.delete('page')
		history.replaceState({}, '', url)
	}

	function buildPagination(container, totalItems, pageSize, currentPage){
		if(!container) return
		container.innerHTML = ''
		const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
		if(totalPages <= 1) return
		const addBtn = (p, label)=>{
			const b = document.createElement('button'); b.className='page-btn'+(p===currentPage? ' active':''); b.textContent = label || String(p)
			b.addEventListener('click', ()=>{ updateQueryParam('page', p); renderCategory() })
			container.appendChild(b)
		}
		const prev = document.createElement('button'); prev.className='page-btn'; prev.textContent='◀'; prev.disabled = currentPage<=1; prev.addEventListener('click', ()=>{ updateQueryParam('page', Math.max(1,currentPage-1)); renderCategory() }); container.appendChild(prev)
		const start = Math.max(1, currentPage-2); const end = Math.min(totalPages, currentPage+2)
		if(start>1){ addBtn(1,'1'); if(start>2){ const dots=document.createElement('span'); dots.className='muted'; dots.textContent='…'; container.appendChild(dots) } }
		for(let p=start;p<=end;p++) addBtn(p)
		if(end<totalPages){ if(end<totalPages-1){ const dots=document.createElement('span'); dots.className='muted'; dots.textContent='…'; container.appendChild(dots) } addBtn(totalPages,String(totalPages)) }
		const next = document.createElement('button'); next.className='page-btn'; next.textContent='▶'; next.disabled = currentPage>=totalPages; next.addEventListener('click', ()=>{ updateQueryParam('page', Math.min(totalPages,currentPage+1)); renderCategory() }); container.appendChild(next)
	}

	function renderCategory(){
		const params = new URLSearchParams(location.search)
		const cat = params.get('category') || params.get('cat') || ''
		const page = parseInt(params.get('page')||'1',10) || 1
		const pageSize = 12

		const grid = el('category-grid'); if(!grid) return

		// Resolve category object
		const catObj = (state.categoryObjects||[]).find(c=> (c.id||'').toLowerCase() === (cat||'').toLowerCase()) || { id: cat, name: cat || 'Categoría', icon:'', image: '/assets/img/category-default.svg' }
		const _ct = el('category-title'); if(_ct) _ct.textContent = catObj.name || cat
		const _cd = el('category-description'); if(_cd) _cd.textContent = catObj.description || `${state.products.filter(p=> (p.category||'').toLowerCase() === (cat||'').toLowerCase()).length} productos disponibles`
		if(el('category-image')) el('category-image').src = catObj.image || `/assets/img/category-${catObj.id||'default'}.svg`

		// Sidebar categories
		const sidebar = el('sidebar-cats')
		if(sidebar){ sidebar.innerHTML = ''
			(state.categoryObjects||[]).forEach(c=>{
				const a = document.createElement('a'); a.href = `/category.html?category=${encodeURIComponent(c.id)}`; a.textContent = c.name || c.id; if((c.id||'').toLowerCase() === (cat||'').toLowerCase()) a.classList.add('active'); sidebar.appendChild(a)
			})
		}

		// wire filters (persist via query params)
		const priceFilter = el('cat-price-filter'); if(priceFilter){ priceFilter.value = params.get('price')||'any'; priceFilter.onchange = ()=>{ updateQueryParam('price', priceFilter.value); renderCategory() } }
		const typeFilter = el('cat-type-filter'); if(typeFilter){ typeFilter.value = params.get('type')||'any'; typeFilter.onchange = ()=>{ updateQueryParam('type', typeFilter.value); renderCategory() } }

		// base list by category
		let list = state.products.filter(p=> (p.category||'').toLowerCase() === (cat||'').toLowerCase())

		// apply filters
		const price = params.get('price') || 'any'
		const type = params.get('type') || 'any'
		if(type && type !== 'any') list = list.filter(p=> (p.type||'').toLowerCase() === type.toLowerCase())
		if(price !== 'any'){
			if(price === 'under500') list = list.filter(p=> p.price && p.price <= 500)
			if(price === '500-2k') list = list.filter(p=> p.price && p.price > 500 && p.price <= 2000)
			if(price === '2k+') list = list.filter(p=> p.price && p.price > 2000)
		}

		// pagination
		const total = list.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const currentPage = Math.min(Math.max(1, page), totalPages)
		const start = (currentPage - 1) * pageSize
		const pageItems = list.slice(start, start + pageSize)

		grid.innerHTML = ''
		if(pageItems.length === 0){ grid.innerHTML = '<div class="muted">No hay productos en esta categoría.</div>' }
		else appendInBatches(grid, pageItems, makeCard, 12)

		// pagination controls
		buildPagination(el('category-pagination'), total, pageSize, currentPage)
	}

  function renderSecurity(){ /* placeholder: static content exists in HTML; enhance if needed */ }
  function renderQuantum(){ /* static HTML page - kept visual */ }
  function renderBlog(){ /* static cards present in HTML */ }
  function renderTrends(){ /* static cards present in HTML */ }

  /* UI helpers */
  function makeCard(p){
		const a = document.createElement('article')
		a.className = 'product-card card fade-in'
		a.setAttribute('role','article')
		a.setAttribute('aria-label', `${p.name} — ${p.short_description || ''}`)
		const imgSrc = p.image || (p.images && p.images[0]) || '/assets/img/vision-pro.svg'
		const imgAlt = p.imageAlt || p.title || p.name || 'Producto'
		// if optimized manifest exists for this image, prefer AVIF/WebP via <picture>
		let pictureHtml = `<img class="card-img" loading="lazy" src="${safeImgSrc(imgSrc)}" alt="${escapeHtml(imgAlt)}">`
		try{
			if(state && state.imgManifest){
				const rel = String(imgSrc).replace(/^\/?assets\/img\//,'')
				const entry = state.imgManifest[rel]
				if(entry && (entry.avif || entry.webp)){
					pictureHtml = `<picture>`

					if(entry.avif) pictureHtml += `<source srcset="${safeImgSrc(entry.avif)}" type="image/avif">`
					if(entry.webp) pictureHtml += `<source srcset="${safeImgSrc(entry.webp)}" type="image/webp">`
					pictureHtml += `<img class="card-img" loading="lazy" src="${safeImgSrc(imgSrc)}" alt="${escapeHtml(imgAlt)}">` + `</picture>`
				}
			}
		}catch(e){ /* ignore manifest errors */ }
		a.innerHTML = `
				<figure style="margin:0">${pictureHtml}</figure>
			<h3>${escapeHtml(p.name)}</h3>
			<div class="product-meta">${escapeHtml(p.category)} • ${fmtPrice(p.price)}</div>
			<p class="subtle">${escapeHtml(p.short_description||'')}</p>
			<div style="margin-top:12px"><a class="btn btn-primary" href="/product.html?id=${encodeURIComponent(p.id)}">Ver</a></div>
		`
		a.dataset.tags = (p.tags||[]).join(' ')
		a.dataset.category = p.category || ''
		// micro-interaction: subtle breathing animation class toggled on hover via CSS
		return a
  }

	// Favorites support (localStorage)
	function loadFavorites(){
		try{ const raw = localStorage.getItem('ngs:favs'); window.__FAVS__ = raw ? JSON.parse(raw) : {} }catch(e){ window.__FAVS__ = {} }
	}
	function saveFavorites(){ try{ localStorage.setItem('ngs:favs', JSON.stringify(window.__FAVS__||{})) }catch(e){} }
	function isFavorite(id){ return !!(window.__FAVS__ && window.__FAVS__[id]) }
	function toggleFavorite(id){ if(!window.__FAVS__) window.__FAVS__ = {}; if(window.__FAVS__[id]) delete window.__FAVS__[id]; else window.__FAVS__[id] = Date.now(); saveFavorites(); document.querySelectorAll(`[data-prod-fav="${id}"]`).forEach(el=> el.classList.toggle('fav-active', isFavorite(id))) }

	// Quick view modal
	function openQuickView(product){
		// create modal container
		let modal = document.getElementById('ngs-quickview')
		if(modal) modal.remove()
		modal = document.createElement('div'); modal.id='ngs-quickview'; modal.className='quick-view-modal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true')
		const c = document.createElement('div'); c.className='quick-view-card'
		c.innerHTML = `
			<div style="display:flex;gap:18px;align-items:flex-start">
				<div style="flex:1;max-width:420px"><img src="${safeImgSrc((product.images && product.images[0])||'/assets/img/vision-pro.svg')}" style="width:100%;border-radius:8px" alt="${escapeHtml(product.name)}"></div>
				<div style="flex:1.6">
					<h2>${escapeHtml(product.name)}</h2>
					<div class="muted">${escapeHtml(product.category)} • ${fmtPrice(product.price)}</div>
					<p class="subtle">${escapeHtml(product.short_description||'')}</p>
					<div style="margin-top:12px">${product.specs && product.specs.length ? '<strong>Specs</strong><ul>'+product.specs.map(s=>`<li>${escapeHtml(s)}</li>`).join('')+'</ul>':''}</div>
					<div style="margin-top:12px;display:flex;gap:8px"><a class="btn btn-primary" href="/product.html?id=${encodeURIComponent(product.id)}">Ficha completa</a><a class="btn" href="${safeHref(product.vendorLink||'#')}" target="_blank" rel="noopener noreferrer">Visitar proveedor</a><button class="btn" id="ngs-quick-fav">${isFavorite(product.id)?'💖 Favorito':'♡ Favorito'}</button></div>
				</div>
			</div>
		`
		modal.appendChild(c)
		document.body.appendChild(modal)
		// events
		modal.addEventListener('click', (e)=>{ if(e.target === modal) modal.remove() })
		document.getElementById('ngs-quick-fav')?.addEventListener('click', ()=>{ toggleFavorite(product.id); document.getElementById('ngs-quick-fav').textContent = isFavorite(product.id)?'💖 Favorito':'♡ Favorito' })
	}

	// update makeCard to include quick view and favorites
	;(function patchMakeCard(){
		const original = makeCard
		makeCard = function(p){
			const node = original(p)
			// quick view button
			const controls = document.createElement('div'); controls.style.marginTop = '10px'; controls.style.display='flex'; controls.style.gap='8px'
			const q = document.createElement('button'); q.className='btn'; q.textContent='Quick View'; q.addEventListener('click', ()=> openQuickView(p))
			const fav = document.createElement('button'); fav.className='btn'; fav.dataset.prodFav = p.id; fav.setAttribute('data-prod-fav', p.id); fav.textContent = isFavorite(p.id)?'💖':'♡'; fav.addEventListener('click', ()=>{ toggleFavorite(p.id); fav.textContent = isFavorite(p.id)?'💖':'♡' })
			controls.appendChild(q); controls.appendChild(fav)
			node.appendChild(controls)
			return node
		}
	})()

  function renderSpecialSections(){ const fp = el('featured-products'); if(fp){ fp.innerHTML=''; state.products.filter(p=> (p.tags||[]).includes('featured')).slice(0,8).forEach(p=> fp.appendChild(makeCard(p))) } }

  function onFilterClick(e){ const btn = e.target.closest('button'); if(!btn) return; const parent = btn.parentElement; parent.querySelectorAll('button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); applyFilters() }

  function applyFilters(){
		const q = (el('mp-search') && el('mp-search').value.trim().toLowerCase()) || (el('global-search') && el('global-search').value.trim().toLowerCase()) || ''
		// categories: allow multi-select chips (selected class) or fallback to single active
		const catChips = Array.from(document.querySelectorAll('.filter-list .chip.selected'))
		const cats = catChips.length ? catChips.map(c=> c.dataset.filter) : (()=>{ const active = document.querySelector('.filter-list button.active'); return active ? [active.dataset.filter] : ['all'] })()
	const type = (el('type-filter') && el('type-filter').value) || 'any'
	const price = (el('price-filter') && el('price-filter').value) || 'any'
	// tags multi-select
	const selectedTags = Array.from(document.querySelectorAll('#tags-filter .chip.selected')).map(b=> b.dataset.tag)

	let res = state.products.slice()
		// categories filtering (multi)
		if(cats && !(cats.length===1 && cats[0]==='all')){
			res = res.filter(p=> cats.includes(p.category) || cats.includes((p.category||'').toLowerCase()) || cats.includes((p.category||'').toString()) )
		}
	if(q) res = res.filter(p=> (p.name||'').toLowerCase().includes(q) || (p.short_description||'').toLowerCase().includes(q) || (p.tags||[]).join(' ').toLowerCase().includes(q))
	// tags filter: all selected tags must be present
	if(selectedTags && selectedTags.length){ res = res.filter(p=> selectedTags.every(t=> (p.tags||[]).includes(t))) }
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

	input.setAttribute('role','search')
	input.setAttribute('aria-label','Buscar productos y proveedores')
	input.setAttribute('aria-autocomplete','list')

		let list = document.getElementById('search-suggestions')
		if(!list){
			list = document.createElement('div');
			list.className='search-suggestions card'
			list.setAttribute('role','listbox')
			list.style.position='absolute'; list.style.zIndex='180'; list.style.display='none'; list.style.maxHeight='320px'; list.style.overflow='auto'; list.id = 'search-suggestions'
			input.parentElement.style.position='relative'; input.parentElement.appendChild(list)
		} else {
			// ensure container is positioned correctly
			input.parentElement.style.position = input.parentElement.style.position || 'relative'
			list.style.display = 'none'
		}

	let timer, index = -1, items = []

	input.addEventListener('input', (ev)=>{
	  clearTimeout(timer); timer = setTimeout(()=>{
		const q = input.value.trim().toLowerCase()
		if(!q){ list.style.display='none'; index=-1; return }
		const prodMatches = state.products.filter(p=> (p.name||'').toLowerCase().includes(q) || (p.tags||[]).join(' ').toLowerCase().includes(q)).slice(0,6)
		const provMatches = (state.providers||[]).filter(p=> (p.name||'').toLowerCase().includes(q)).slice(0,4)
		const catMatches = (state.categoryObjects||[]).filter(c=> (c.name||'').toLowerCase().includes(q)).slice(0,4)
		items = prodMatches
		list.innerHTML=''
		prodMatches.forEach((p,i)=>{
		  const it = document.createElement('div'); it.className='search-suggestion-item'; it.style.padding='10px'; it.style.cursor='pointer'; it.setAttribute('role','option'); it.setAttribute('aria-selected','false')
		  it.innerHTML = `<strong>${escapeHtml(p.name)}</strong><div class="subtle" style="font-size:12px">Producto • ${escapeHtml(p.category)} • ${fmtPrice(p.price)}</div>`
		  it.addEventListener('click', ()=>{ location.href = `/product.html?id=${encodeURIComponent(p.id)}` })
		  list.appendChild(it)
		})
		provMatches.forEach(p=>{
		  const it = document.createElement('div'); it.className='search-suggestion-item'; it.style.padding='8px'; it.style.cursor='pointer'; it.setAttribute('role','option'); it.setAttribute('aria-selected','false')
		  it.innerHTML = `<strong>${escapeHtml(p.name)}</strong><div class="subtle" style="font-size:12px">Proveedor</div>`
		  it.addEventListener('click', ()=>{ location.href = `/providers-view.html?provider=${encodeURIComponent((p.name||'').replace(/\s+/g,'-'))}` })
		  list.appendChild(it)
		})
		catMatches.forEach(c=>{
		  const it = document.createElement('div'); it.className='search-suggestion-item'; it.style.padding='8px'; it.style.cursor='pointer'; it.setAttribute('role','option'); it.setAttribute('aria-selected','false')
		  it.innerHTML = `<strong>${escapeHtml(c.name)}</strong><div class="subtle" style="font-size:12px">Categoría</div>`
		  it.addEventListener('click', ()=>{ location.href = `/category.html?category=${encodeURIComponent(c.id)}` })
		  list.appendChild(it)
		})
		list.style.display = items.length ? 'block' : 'none'
		index = -1
	  },80)
	})

	// keyboard navigation
	input.addEventListener('keydown', (e)=>{
	  if(list.style.display === 'none') return
	  if(e.key === 'ArrowDown'){ e.preventDefault(); index = Math.min(items.length-1, index+1); updateActive() }
	  if(e.key === 'ArrowUp'){ e.preventDefault(); index = Math.max(0, index-1); updateActive() }
	  if(e.key === 'Enter'){ if(index>=0 && items[index]){ location.href = `/product.html?id=${encodeURIComponent(items[index].id)}` } }
	})

	function updateActive(){ const opts = list.querySelectorAll('[role="option"]'); opts.forEach((o,i)=>{ o.setAttribute('aria-selected', i===index ? 'true' : 'false'); o.style.background = i===index ? 'linear-gradient(90deg, rgba(0,200,255,0.06), rgba(124,77,255,0.04))' : 'transparent' }) }

	document.addEventListener('click', (e)=>{ if(!list.contains(e.target) && e.target !== input) list.style.display='none' })
  }

  /* small util */
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

  document.addEventListener('DOMContentLoaded', init)

  // Expose applyFilters to window for inline handlers if needed
  window.NGS = { applyFilters }

	/*
		Lightweight automatic language switcher
		- Detects browser language via navigator.language / navigator.languages
		- Supports 'es' (do nothing) and 'en' (apply English replacements)
		- Operates only on visible text nodes in document.body
		- Never modifies or touches the brand string 'neuralgpt.store'
		- No external libraries; minimal, safe replacements
	*/
	(function autoLang(){
		function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
		function shouldSkipNode(node){
			if(!node || !node.parentElement) return true
			const parent = node.parentElement
			if(parent.closest('script,style,meta,head')) return true
			const v = node.nodeValue || ''
			if(!v.trim()) return true
			if(v.indexOf('neuralgpt.store') !== -1) return true
			// skip if inside element with class 'brand' to protect markup
			if(node.parentElement.closest('.brand, .footer-brand')) return true
			return false
		}

		function applyReplacements(map){
			const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
			const nodes = []
			let n
			while(n = walker.nextNode()) nodes.push(n)
			nodes.forEach(tn => {
				try{
					if(shouldSkipNode(tn)) return
					let txt = tn.nodeValue
					Object.keys(map).forEach(k => {
						const v = map[k]
						const re = new RegExp(escapeRegex(k), 'g')
						txt = txt.replace(re, v)
					})
					if(txt !== tn.nodeValue) tn.nodeValue = txt
				}catch(e){ /* ignore individual node errors */ }
			})
		}

		document.addEventListener('DOMContentLoaded', ()=>{
			try{
				const lang = (navigator.languages && navigator.languages[0]) || navigator.language || 'en'
				const base = String(lang).split('-')[0].toLowerCase()
				if(base === 'es') return // site default is Spanish; do nothing

				// Only support English fallback for now
				if(base !== 'en') return

				// Minimal, conservative Spanish -> English map (visible UI only)
				const REPLACEMENTS = {
					'Inicio': 'Home',
					'Proveedores': 'Providers',
					'Proveedor': 'Provider',
					'Precios': 'Pricing',
					'Contacto': 'Contact',
					'Onboarding de Proveedores': 'Vendor Onboarding',
					'Onboarding': 'Onboarding',
					'Solicitar incorporación como proveedor verificado': 'Apply as a verified vendor',
					'Solicitar incorporación': 'Apply to join',
					'Ver Precios y Planes': 'View Pricing & Plans',
					'Términos de Servicio': 'Terms of Service',
					'Privacidad': 'Privacy',
					'Comisión': 'Commission',
					'Productos': 'Products',
					'Visitar': 'Visit',
					'Ver': 'View',
					'Formulario simulado: su solicitud ha sido recibida. Nos pondremos en contacto pronto.': 'Form simulated: your request has been received. We will contact you shortly.',
					'Solicite incorporarse como proveedor verificado': 'Apply to join as a verified vendor',
					'Qué es neuralgpt.store': 'What is neuralgpt.store',
					'Marketplace operativo por IA': 'AI-powered marketplace',
					'Registrar proveedor': 'Register provider',
					'Hub de Proveedores': 'Provider Hub',
					'Beneficios para Proveedores': 'Benefits for Providers'
				}

				applyReplacements(REPLACEMENTS)

				// Also update placeholders and button values conservatively (avoid brand)
				try{
					const placeholders = {
						'Nombre de la empresa': 'Company name',
						'Sitio web': 'Website',
						'Correo de contacto': 'Contact email',
						'Categoría de producto': 'Product category',
						'País': 'Country',
						'Email': 'Email',
						'Buscar productos, proveedores, tecnología...': 'Search products, providers, technology...'
					}
					Object.keys(placeholders).forEach(k=>{
						const v = placeholders[k]
						document.querySelectorAll('input,textarea,select').forEach(elm=>{
							if(!elm) return
							if(elm.placeholder && elm.placeholder.indexOf(k)!==-1 && elm.placeholder.indexOf('neuralgpt.store')===-1) elm.placeholder = elm.placeholder.replace(k, v)
							if(elm.value && elm.value.indexOf(k)!==-1 && elm.value.indexOf('neuralgpt.store')===-1) elm.value = elm.value.replace(k, v)
						})
					})
				}catch(e){/* ignore */}

			}catch(e){ console.warn('lang switcher failed', e) }
		})
	})()

})();
