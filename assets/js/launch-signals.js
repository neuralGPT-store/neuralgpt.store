// launch-signals.js — client-side only, localStorage-based traction counters
(function(){
  var KEY = 'launch_signals_v1';
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}') }catch(e){ return {} } }
  function write(obj){ try{ localStorage.setItem(KEY, JSON.stringify(obj||{})) }catch(e){} }

  function initCounters(){
    var s = read();
    s.page_views = s.page_views || {};
    s.cta_clicks = s.cta_clicks || 0;
    s.form_submits = s.form_submits || 0;
    write(s);
    return s;
  }

  function incPageView(path){ var s = read(); s.page_views = s.page_views || {}; s.page_views[path] = (s.page_views[path]||0)+1; write(s); }
  function incCta(){ var s = read(); s.cta_clicks = (s.cta_clicks||0)+1; write(s); }
  function incForm(){ var s = read(); s.form_submits = (s.form_submits||0)+1; write(s); }

  function attachCTAs(){
    // target elements: data-cta OR .btn anchors/buttons
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-cta], a.btn, button.btn'));
    nodes.forEach(function(n){
      if(n.__launchSignals) return; n.__launchSignals = true;
      n.addEventListener('click', function(){ try{ incCta(); }catch(e){} }, {passive:true});
    });
  }

  function attachForms(){
    var forms = Array.prototype.slice.call(document.querySelectorAll('form'));
    forms.forEach(function(f){
      if(f.__launchSignals) return; f.__launchSignals = true;
      f.addEventListener('submit', function(){ try{ incForm(); }catch(e){} }, {passive:true});
    });
  }

  function renderAdminPanel(){
    try{
      if(!window.LAUNCH_SIGNALS_ADMIN) return;
      var data = read();
      var totalViews = Object.keys(data.page_views||{}).reduce(function(acc,k){ return acc + (data.page_views[k]||0) },0);
      var cta = data.cta_clicks||0; var forms = data.form_submits||0;
      var panel = document.createElement('div'); panel.id='launch-signals-admin';
      panel.style.position='fixed'; panel.style.right='18px'; panel.style.top='18px'; panel.style.zIndex=99999;
      panel.style.background='rgba(10,12,22,0.92)'; panel.style.color='#fff'; panel.style.padding='12px 14px'; panel.style.borderRadius='8px'; panel.style.fontSize='13px'; panel.style.boxShadow='0 8px 30px rgba(0,0,0,0.6)';
      panel.innerHTML = '<strong>Live traction detected</strong><div style="margin-top:8px">Views: '+totalViews+' | CTAs: '+cta+' | Leads: '+forms+'</div>';
      document.body.appendChild(panel);
    }catch(e){}
  }

  document.addEventListener('DOMContentLoaded', function(){
    initCounters();
    try{ incPageView(location.pathname||location.href); }catch(e){}
    attachCTAs(); attachForms(); renderAdminPanel();
    // observe for dynamically added CTAs/forms
    var obs = new MutationObserver(function(){ attachCTAs(); attachForms(); });
    obs.observe(document.body, {childList:true, subtree:true});
    // expose API
    window.LaunchSignals = { read: read, write: write, incPageView: incPageView, incCta: incCta, incForm: incForm };
  });
})();
