// Ultratech UI interactions for NeuralGPT.Store
(function(){
	const data = {
		marketplace:[
			{id:1,title:'Vision Pro v3',type:'model',badge:'Certified',desc:'Multi-modal vision model with realtime inference.'},
			{id:2,title:'AgentOps',type:'agent',badge:'New',desc:'Autonomous orchestration agent for workflows.'},
			{id:3,title:'ChatGlue',type:'integration',badge:'Featured',desc:'Connector for chat + CRM systems.'},
			{id:4,title:'EdgeSmall',type:'model',badge:'Edge',desc:'Tiny model optimized for ARM.'}
		],
		trends:[
			{id:'agi',title:'AGI',desc:'Progress and benchmarks towards general intelligence.'},
			{id:'cloudai',title:'Cloud AI',desc:'On-demand large-scale model serving.'},
			{id:'edge',title:'Edge Compute',desc:'AI moving to billions of devices.'},
			{id:'security',title:'AI Security',desc:'New practices for model & data protection.'}
		]
	}

	/* Utilities */
	const $ = s => document.querySelector(s)
	const $$ = s => Array.from(document.querySelectorAll(s))

	/* Nav toggle for mobile */
	const navToggle = document.querySelector('.nav-toggle')
	if(navToggle){
		navToggle.addEventListener('click', e=>{
			const list = document.getElementById('nav-list')
			const expanded = navToggle.getAttribute('aria-expanded')==='true'
			navToggle.setAttribute('aria-expanded', String(!expanded))
			list.style.display = expanded? 'none':'flex'
		})
	}

	/* Render marketplace cards */
	function renderMarket(list){
		const el = document.getElementById('market-cards') || document.getElementById('market-grid')
		if(!el) return
		el.innerHTML = ''
		list.forEach(it=>{
			const card = document.createElement('article')
			card.className='card reveal'
			card.tabIndex=0
			card.innerHTML = `<h3>${it.title} <span class="badge">${it.badge}</span></h3><p class="muted">${it.desc}</p><div class="meta">Type: ${it.type}</div><a class="card-link" href="#">Demo</a>`
			el.appendChild(card)
		})
		setTimeout(()=>{document.querySelectorAll('.reveal').forEach((n,i)=>setTimeout(()=>n.classList.add('visible'),i*80))},50)
	}

	/* Filters */
	const chips = document.querySelectorAll('.chip')
	chips.forEach(c=>c.addEventListener('click',e=>{
		chips.forEach(x=>x.classList.remove('active'))
		e.currentTarget.classList.add('active')
		const f = e.currentTarget.dataset.filter
		const list = f==='all'? data.marketplace : data.marketplace.filter(m=>m.type===f)
		renderMarket(list)
	}))

	const search = document.getElementById('mp-search')
	if(search){search.addEventListener('input', e=>{
		const q = e.target.value.toLowerCase()
		const list = data.marketplace.filter(m=>m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q))
		renderMarket(list)
	})}

	/* Trends */
	function renderTrends(){
		const el = document.getElementById('trends-preview') || document.getElementById('trends-grid')
		if(!el) return
		el.innerHTML = ''
		data.trends.forEach(t=>{
			const card = document.createElement('article')
			card.className='card reveal'
			card.innerHTML = `<h4>${t.title}</h4><p class="muted">${t.desc}</p>`
			el.appendChild(card)
		})
		setTimeout(()=>{document.querySelectorAll('.reveal').forEach((n,i)=>setTimeout(()=>n.classList.add('visible'),i*60))},50)
	}

	/* Console simulation */
	const consoleForm = document.getElementById('console-form')
	const consoleOutput = document.getElementById('console-output')
	if(consoleForm && consoleOutput){
		consoleForm.addEventListener('submit', e=>{
			e.preventDefault(); const input = document.getElementById('console-input'); const val = input.value.trim(); if(!val) return
			appendConsole(`> ${val}`)
			input.value=''
			// simulate result
			setTimeout(()=>appendConsole(`OK — simulated result for "${val}" (duration 0.3s)`),400)
		})
	}
	function appendConsole(text){
		const p = document.createElement('div'); p.textContent = text; consoleOutput.appendChild(p); consoleOutput.scrollTop = consoleOutput.scrollHeight
	}

	/* Scroll reveal on load and intersection */
	document.addEventListener('DOMContentLoaded', ()=>{
		renderMarket(data.marketplace)
		renderTrends()
		const obs = new IntersectionObserver((entries)=>{
			entries.forEach(ent=>{ if(ent.isIntersecting) ent.target.classList.add('visible') })
		},{threshold:0.12})
		document.querySelectorAll('.reveal').forEach(el=>obs.observe(el))
	})

	/* Keyboard navigation enhancements */
	document.addEventListener('keyup', (e)=>{
		if(e.key==='/' && document.activeElement.tagName!=='INPUT'){
			const s = document.getElementById('mp-search'); if(s){s.focus(); e.preventDefault()}
		}
	})

})();
