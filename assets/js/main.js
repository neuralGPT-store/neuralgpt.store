// Ultratech UI interactions for NeuralGPT.Store
(function(){
	'use strict'
	const data = {
		marketplace:[
			{id:1,title:'Vision Pro v3',category:'Components',price:'$9,900',desc:'Multi-modal vision module.'},
			{id:2,title:'AgentArm 2.1',category:'Robotics',price:'$14,500',desc:'Adaptive manipulator for assembly.'},
			{id:3,title:'EdgeAccel X',category:'Components',price:'$4,200',desc:'Edge AI accelerator (FPGA).'},
			{id:4,title:'SLAM LiDAR S2',category:'Components',price:'$6,300',desc:'High-precision LiDAR sensor.'},
			{id:5,title:'CloudServe A',category:'Cloud',price:'Contact',desc:'Managed model serving for enterprises.'},
			{id:6,title:'SecureGate',category:'Security',price:'Contact',desc:'Model governance and auditing.'}
		],
		trends:[
			{id:'agi',title:'AGI',desc:'Progress towards general intelligence.'},
			{id:'cloud',title:'Cloud AI',desc:'Scalable on-demand serving.'},
			{id:'edge',title:'Edge Compute',desc:'AI at the edge with ultra-low latency.'},
			{id:'security',title:'AI Security',desc:'Best practices in 2025.'}
		]
	}

	function safeText(node, text){ node.textContent = text }

	function createCard(item){
		const card = document.createElement('article')
		card.className = 'card'
		const h3 = document.createElement('h3'); safeText(h3, item.title)
		const p = document.createElement('p'); p.className='muted'; safeText(p, item.desc)
		const meta = document.createElement('div'); meta.className='meta'; safeText(meta, item.category + ' • ' + item.price)
		const btn = document.createElement('a'); btn.className='card-link'; btn.href='#'; safeText(btn, 'View')
		card.appendChild(h3); card.appendChild(p); card.appendChild(meta); card.appendChild(btn)
		return card
	}

	function renderMarket(list){
		const el = document.getElementById('market-cards')
		if(!el) return
		el.innerHTML = ''
		list.forEach(it=>{ el.appendChild(createCard(it)) })
	}

	function renderTrends(){
		const el = document.getElementById('trends-preview') || document.getElementById('trends-grid')
		if(!el) return
		el.innerHTML = ''
		data.trends.forEach(t=>{
			const card = document.createElement('article'); card.className='card'
			const h4 = document.createElement('h4'); safeText(h4,t.title)
			const p = document.createElement('p'); p.className='muted'; safeText(p,t.desc)
			card.appendChild(h4); card.appendChild(p); el.appendChild(card)
		})
	}

	function initFilters(){
		const chips = Array.from(document.querySelectorAll('.chip'))
		chips.forEach(c=>{
			c.addEventListener('click', function(){
				chips.forEach(x=>x.classList.remove('active'))
				this.classList.add('active')
				const filter = this.dataset.filter
				const list = (filter==='all' || !filter) ? data.marketplace : data.marketplace.filter(m=>m.category===filter)
				renderMarket(list)
			})
		})
		const search = document.getElementById('mp-search')
		if(search){
			search.addEventListener('input', function(){
				const q = this.value.trim().toLowerCase()
				const list = data.marketplace.filter(m=>m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
				renderMarket(list)
			})
			// basic sanitization: remove script-like characters
			search.addEventListener('paste', e=>{ e.clipboardData && (e.clipboardData = null) })
		}
	}

	document.addEventListener('DOMContentLoaded', ()=>{
		renderMarket(data.marketplace)
		renderTrends()
		initFilters()
	})

})();
