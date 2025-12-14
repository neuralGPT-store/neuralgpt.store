const ads=[...document.querySelectorAll('.ad')];
let i=0; setInterval(()=>{
  ads.forEach(a=>a.style.opacity=.2);
  ads[i%ads.length].style.opacity=1;
  i++;
},2500);
