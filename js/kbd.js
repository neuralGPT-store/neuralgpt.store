const map = ['#home','#marketplace','#products','#providers','#security','#quantum','#sponsors','#blog','#contact'];
document.addEventListener('keydown',e=>{
  const n = parseInt(e.key,10);
  if(n>=1 && n<=map.length){
    e.preventDefault();
    const el = document.querySelector(map[n-1]);
    document.querySelectorAll('section').forEach(s=>s.classList.remove('active'));
    el?.classList.add('active');
    history.replaceState(null,'',map[n-1]);
  }
});
