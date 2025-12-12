// Unicorn Autopilot - client-side only
(function(){
  function safeText(el){ return el?String(el.textContent||el.value||'').trim():'' }
  // small loader for internal AI modules
  function loadModule(src){
    return new Promise(function(resolve){
      if(window.UnicornAI && window.UnicornAI._loadedModules && window.UnicornAI._loadedModules[src]) return resolve();
      var s = document.createElement('script'); s.src = src; s.defer = true; s.onload = function(){ window.UnicornAI = window.UnicornAI || {}; window.UnicornAI._loadedModules = window.UnicornAI._loadedModules || {}; window.UnicornAI._loadedModules[src]=true; resolve(); };
      s.onerror = function(){ resolve(); };
      document.head.appendChild(s);
    });
  }
  function toast(msg, opts){
    opts = opts || {};
    var d = document.createElement('div');
    d.className = 'unicorn-toast';
    d.setAttribute('role','status');
    d.style.position = 'fixed';
    d.style.right = '18px';
    d.style.bottom = (18 + (opts.offset||0)) + 'px';
    d.style.background = 'rgba(20,20,20,0.9)';
    d.style.color = '#fff';
    d.style.padding = '10px 14px';
    d.style.borderRadius = '8px';
    d.style.zIndex = 99999;
    d.style.fontSize = '13px';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function(){ d.style.transition = 'opacity 300ms'; d.style.opacity = '0'; setTimeout(function(){ d.remove() },300) }, opts.duration||2200);
  }

  function saveLead(lead){
    try{
      var key = 'unicorn_leads_v1';
      var arr = JSON.parse(localStorage.getItem(key)||'[]');
      arr.push(lead);
      localStorage.setItem(key, JSON.stringify(arr));
      return true;
    }catch(e){ return false }
  }

  function attachCTAs(){
    var ctas = document.querySelectorAll('a.btn, a.btn-primary, button.btn');
    ctas.forEach(function(btn){
      if(btn.__unicorn) return; btn.__unicorn = true;
      btn.addEventListener('click', function(e){
        var txt = safeText(btn);
        // analyze intent if engine available
        var intent = (window.UnicornAI && window.UnicornAI.intentEngine) ? window.UnicornAI.intentEngine.analyze(txt, location.pathname) : {role:'cliente', score:0};
        var mem = (window.UnicornAI && window.UnicornAI.memoryEngine) ? window.UnicornAI.memoryEngine.update({lastCTA: txt, lastRole: intent.role, lastIntentAt: new Date().toISOString()}) : {};
        // human-like delay and two-phase messaging
        toast('Entiendo lo que buscas...', {duration:700});
        var lead = {type:'cta-click', text: txt, page: location.pathname, timestamp: new Date().toISOString(), intent:intent};
        saveLead(lead);
        var delay = 400 + Math.floor(Math.random()*800);
        setTimeout(function(){
          var msgs = {
            cliente: ['Lead priorizado para contacto humano','Hemos marcado este lead como cliente potencial'],
            proveedor: ['Lead guardado para onboarding','Proveedor priorizado para revisión manual'],
            sponsor: ['Solicitud de sponsorship priorizada','Contacto de sponsor añadido a la cola'],
            inversor: ['Interés de inversor registrado','Equipo comercial contactará pronto']
          };
          var choices = msgs[intent.role] || ['Lead priorizado para contacto humano'];
          var msg = choices[Math.floor(Math.random()*choices.length)];
          toast(msg);
          // show smart CTA banner when confident
          if(intent.score >= 1) showSmartCTA(intent.role);
        }, delay);
      });
    });
  }

  function enhanceContactForm(){
    var form = document.querySelector('#deal-form form') || document.querySelector('form[action="#"]') || document.querySelector('form');
    if(!form) return;
    form.id = form.id || 'unicorn-deal-form';
    if(!document.querySelector('#unicorn-lead-type')){
      var sel = form.querySelector('select[name="interest"]');
      if(sel){
        // ensure Partner option present
        if(!sel.querySelector('option[value="partner"]')){
          var opt = document.createElement('option'); opt.value='partner'; opt.textContent='Partner'; sel.appendChild(opt);
        }
        sel.id = 'unicorn-lead-type';
      }
    }

    if(form.__unicorn) return; form.__unicorn = true;
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var d = new FormData(form);
      var textForIntent = (d.get('message')||d.get('company')||d.get('interest')||'') + ' ' + (location.pathname||'');
      var intent = (window.UnicornAI && window.UnicornAI.intentEngine) ? window.UnicornAI.intentEngine.analyze(textForIntent, location.pathname) : {role:'cliente', score:0};
      var lead = {
        type: 'contact-form',
        company: d.get('company')||d.get('name')||'',
        email: d.get('email')||'',
        leadType: d.get('interest')||d.get('leadType')||'',
        message: d.get('message')||'',
        pageOrigin: location.pathname,
        timestamp: new Date().toISOString(),
        intent: intent
      };
      saveLead(lead);
      if(window.UnicornAI && window.UnicornAI.memoryEngine) window.UnicornAI.memoryEngine.update({role: intent.role, lastQuestion: lead.message, lastCTA: lead.leadType});
      // two-phase human-like response
      toast('Entiendo lo que buscas...', {duration:700});
      var delay = 500 + Math.floor(Math.random()*700);
      setTimeout(function(){
        var varMsgs = {
          cliente: ['Gracias — su interés como cliente está registrado.','Hemos priorizado su solicitud de cliente.'],
          proveedor: ['Gracias — su solicitud de proveedor ha sido guardada.','Onboarding para proveedores: lo contactaremos.'],
          sponsor: ['Gracias — hemos registrado su interés como sponsor.','Propuesta de sponsorship en revisión.'],
          inversor: ['Interés de inversión registrado.','Equipo de negocio recibirá su petición.']
        };
        var choices = varMsgs[intent.role] || ['Lead priorizado para contacto humano'];
        var msg = choices[Math.floor(Math.random()*choices.length)];
        toast(msg);
        var confidenceCTA = intent.score >= 1;
        if(confidenceCTA) showSmartCTA(intent.role);
        var confirmed = document.createElement('div'); confirmed.className='unicorn-confirm muted'; confirmed.textContent='Proceso asistido por IA — su solicitud está priorizada.';
        form.parentNode.insertBefore(confirmed, form.nextSibling);
      }, delay);
    });
  }

  function injectBanners(){
    try{
      var hero = document.querySelector('.hero-card') || document.querySelector('.hero') || document.querySelector('main');
      if(!hero) return;
      if(hero.__unicorn) return; hero.__unicorn = true;
      var b = document.createElement('div'); b.className='unicorn-banner muted'; b.style.marginTop='12px'; b.style.fontWeight='600'; b.textContent='Proceso asistido por IA — Onboarding prioritario activo.';
      hero.appendChild(b);
    }catch(e){}
  }

  function showSmartCTA(role){
    try{
      var existing = document.querySelector('.unicorn-smart-cta'); if(existing) existing.remove();
      var c = document.createElement('div'); c.className='unicorn-smart-cta';
      c.style.position='fixed'; c.style.left='18px'; c.style.bottom='18px'; c.style.zIndex=99998; c.style.background='rgba(6,18,43,0.96)'; c.style.color='#fff'; c.style.padding='12px 14px'; c.style.borderRadius='10px'; c.style.boxShadow='0 6px 24px rgba(0,0,0,0.6)';
      var label = {cliente:'Explore precios o contacte al equipo',proveedor:'Comience el onboarding como proveedor',sponsor:'Solicite más información sobre sponsorship',inversor:'Contacte al equipo de inversiones'}[role] || 'Start commercial discussion';
      var href = {cliente:'/pricing.html',proveedor:'/vendor-onboarding.html',sponsor:'/sponsors.html',inversor:'/contact.html'}[role] || '/contact.html';
      c.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Proceso asistido — recomendado</div><div style="margin-bottom:8px">'+label+'</div><div><a class="btn btn-primary" href="'+href+'">'+(role==='proveedor'?'Request onboarding':'Start commercial discussion')+'</a> <a class="btn" href="/contact.html">Contact</a></div>';
      document.body.appendChild(c);
      setTimeout(function(){ c.style.transition='opacity 400ms'; c.style.opacity='0'; setTimeout(function(){ c.remove() },400) }, 8000 + Math.floor(Math.random()*6000));
    }catch(e){}
  }

  document.addEventListener('DOMContentLoaded', function(){
    // load internal AI modules before initializing behaviors
    Promise.all([
      loadModule('/assets/js/ai/intent-engine.js'),
      loadModule('/assets/js/ai/memory-engine.js')
    ]).then(function(){
      attachCTAs();
      enhanceContactForm();
      injectBanners();
      // also observe DOM for dynamic content
      var obs = new MutationObserver(function(){ attachCTAs(); });
      obs.observe(document.body, {childList:true, subtree:true});
    }).catch(function(){
      // fallback: still initialize
      attachCTAs();
      enhanceContactForm();
      injectBanners();
    });
  });
})();
