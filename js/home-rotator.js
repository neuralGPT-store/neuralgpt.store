(()=> {
  const wrap=document.querySelector('#home .rotator')||document.body;
  let idx=0, page=10;
  const cards=[...document.querySelectorAll('.product-card')];
  function render(){
    cards.forEach((c,i)=>c.style.display=(i>=idx && i<idx+page)?'':'none');
  }
  function next(){ idx=(idx+page)%cards.length; render(); }
  render(); setInterval(next,6500);
})();
