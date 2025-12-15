// --- KILL MOTION ---
(function(){
  let id = window.setInterval(()=>{}, 9999);
  for(let i=0;i<=id;i++) window.clearInterval(i);

  let t = window.setTimeout(()=>{}, 9999);
  for(let i=0;i<=t;i++) window.clearTimeout(i);

  window.requestAnimationFrame = function(){};
})();
