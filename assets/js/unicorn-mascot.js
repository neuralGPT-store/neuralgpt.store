// unicorn-mascot.js — micro mascot, client-side only
(function(){
  function loadCSS(href){
    if(document.querySelector('link[href="'+href+'"]')) return;
    var l = document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l);
  }

  function createMascot(){
    if(document.getElementById('unicorn-mascot')) return;
    loadCSS('/assets/css/unicorn-mascot.css');
    var c = document.createElement('div'); c.id='unicorn-mascot'; c.setAttribute('aria-hidden','true');
    // trail
    var trail = document.createElement('div'); trail.className='unicorn-trail'; c.appendChild(trail);
    // mascot SVG (simple, small, colorful)
    var masc = document.createElement('div'); masc.className='mascot'; masc.innerHTML = '\n<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n  <g fill="none" stroke-linecap="round" stroke-linejoin="round">\n    <path d="M10 46c4-6 14-10 24-10s20 4 24 10" fill="#fff" stroke="#ffdfff" stroke-width="2" opacity="0.06"/>\n    <path d="M20 28c2-6 8-10 14-10s12 4 14 10" fill="#fff" stroke="#ffe6f5" stroke-width="1" opacity="0.08"/>\n    <circle cx="42" cy="30" r="10" fill="#fff" stroke="#f6ecff" stroke-width="1" opacity="0.06"/>\n    <path d="M18 36c0-8 6-14 14-14s14 6 14 14" fill="#fff" stroke="#ffdeec" stroke-width="1" opacity="0.06"/>\n    <path d="M24 22c0-3 3-6 6-6s6 3 6 6" stroke="#ff8ccf" stroke-width="2" fill="#fff"/>\n    <path d="M34 16c0-2 2-4 4-4" stroke="#ffd1ff" stroke-width="2"/>\n    <path d="M18 28c4-2 10-3 12 2" stroke="#8be3ff" stroke-width="2"/>\n    <path d="M40 34c4 0 6 3 6 6" stroke="#a28bff" stroke-width="2"/>\n    <path d="M26 38c0 4-2 6-2 8" stroke="#ffb3d6" stroke-width="2"/>\n    <path d="M30 26 L36 20 L34 28" stroke="#ff66b2" stroke-width="2" fill="#ffCCE6" opacity="0.9"/>\n    <circle cx="44" cy="28" r="1.6" fill="#0b1420"/>\n  </g>\n</svg>\n';
    c.appendChild(masc);
    document.body.appendChild(c);

    // small behavior
    var runTimeout = null;
    c.addEventListener('mouseenter', function(){
      // 45% chance to run, otherwise flip
      if(Math.random() < 0.45){
        c.classList.add('run');
        c.querySelector('.unicorn-trail').classList.add('animate');
        clearTimeout(runTimeout);
        runTimeout = setTimeout(function(){ c.classList.remove('run'); c.querySelector('.unicorn-trail').classList.remove('animate'); }, 1000 + Math.floor(Math.random()*1000));
      } else {
        // flip direction briefly
        c.classList.add('flip');
        setTimeout(function(){ c.classList.remove('flip'); }, 900 + Math.floor(Math.random()*600));
      }
    });

    // occasional gentle float variation
    setInterval(function(){ if(c && c.classList) c.classList.toggle('float'); }, 6000 + Math.floor(Math.random()*4000));
    // ensure trail resets occasionally
    setInterval(function(){ var t = c.querySelector('.unicorn-trail'); if(t){ t.classList.remove('animate'); void t.offsetWidth; t.classList.add('animate'); } }, 4200 + Math.floor(Math.random()*3000));
    // ensure mascot does not block important page interactions
    c.style.pointerEvents = 'none';
    trail.style.pointerEvents = 'none';

    // emotion pulse on pricing and vendor-onboarding pages
    try{
      var p = (location.pathname||'').toLowerCase();
      if(p.indexOf('pricing')!==-1 || p.indexOf('vendor-onboarding')!==-1){
        c.classList.add('emote');
        setTimeout(function(){ c.classList.remove('emote'); }, 1000);
      }
    }catch(e){}
  }

  // insert on DOM ready
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createMascot); else createMascot();
})();
