// intent-engine.js
(function(){
  window.UnicornAI = window.UnicornAI || {};
  var keywords = {
    cliente: ['buy','comprar','price','precio','cost','order','purchase','cliente','cliente potencial','customer'],
    proveedor: ['vendor','proveedor','supply','supply chain','distributor','proveedor','fabricante','manufactur','listing','inventory'],
    sponsor: ['sponsor','patrocin','sponsorship','brand','campaña','sponsor proposal','partnership'],
    inversor: ['investor','inversor','funding','fundraise','seed','vc','angel','inversión']
  };

  function tokenize(text){
    return String(text||'').toLowerCase().replace(/[^\w\sáéíóúñ-]/g,' ').split(/\s+/).filter(Boolean);
  }

  function scoreForRole(tokens, role){
    var ks = keywords[role]||[]; var score=0, matches=[];
    ks.forEach(function(k){ if(tokens.indexOf(k)!==-1){ score++; matches.push(k) } });
    return {score:score, matches:matches};
  }

  function analyze(text, page){
    var tokens = tokenize(text + ' ' + (page||''));
    var results = Object.keys(keywords).map(function(role){
      return {role:role, res: scoreForRole(tokens, role)};
    });
    results.sort(function(a,b){ return b.res.score - a.res.score });
    var top = results[0];
    var intent = {role: top.role, score: top.res.score, matches: top.res.matches, analyzedAt: new Date().toISOString(), sourceText: text, page: page};
    try{ localStorage.setItem('unicorn_intent_v1', JSON.stringify(intent)); }catch(e){}
    return intent;
  }

  window.UnicornAI.intentEngine = { analyze: analyze, _keywords: keywords };
})();
