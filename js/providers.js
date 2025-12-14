const buttons = document.querySelectorAll('.pv-filters button');
const cards = document.querySelectorAll('.pv-card');
buttons.forEach(b=>{
  b.addEventListener('click',()=>{
    const f=b.dataset.filter;
    cards.forEach(c=>{
      c.style.display = (f==='all'||c.classList.contains(f)) ? 'flex' : 'none';
    });
  });
});
