(function(){
	'use strict'
	const API = '/data/sponsors-data.json'
	async function load(){ try{ const r = await fetch(API, { cache: 'no-cache' }); if(!r.ok) return []; return await r.json() }catch(e){ return [] } }

	function makeLogoPath(s){
		// prefer curated core sponsor assets
		const corePath = `/core/assets/img/sponsors/${s.id || s.name || 'unknown'}.svg`
		return s.logo || corePath
	}

	document.addEventListener('DOMContentLoaded', async ()=>{
		const sponsors = await load()
		const grid = document.getElementById('sponsors-grid')
		if(!grid) return
		grid.innerHTML = ''
		    sponsors.forEach((s, i)=>{
			    const a = document.createElement('a')
			    a.className = 'sponsor-card premium-sponsor'
			    // sanitize external href and avoid javascript: or data: schemes
			    const href = s.website || '#'
			    a.href = (/^(javascript:|data:)/i.test(String(href||'').trim())) ? '#' : href
			    a.target = '_blank'
			    a.rel = 'noopener noreferrer'
			    const logo = makeLogoPath(s)
			    // use escaped src to avoid script: payloads in src attribute
			    const safeLogo = (/^(javascript:)/i.test(String(logo||'').trim())) ? '/assets/img/vision-pro.svg' : logo
			    a.innerHTML = `<div class="sponsor-inner"><img src="${escapeHtml(safeLogo)}" alt="${escapeHtml(s.name||'Sponsor')}" loading="lazy"></div>`
			// staggered animation delay
			a.style.animationDelay = `${(i%8)*60}ms`
			grid.appendChild(a)
		})
	})

	function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c)) }

})()