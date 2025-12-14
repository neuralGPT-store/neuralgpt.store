const cards=[...document.querySelectorAll('.pf-card')];
let i=0; setInterval(()=>{
  cards.forEach(c=>c.style.opacity=.35);
  cards[i%cards.length].style.opacity=1;
  i++;
},2600);
