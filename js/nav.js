document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]'); if(!a)return;
  const id=a.getAttribute('href').slice(1);
  const s=document.getElementById(id); if(!s)return;
  e.preventDefault(); s.scrollIntoView({behavior:'smooth'});
});
const q=document.getElementById('globalSearch');
if(q){
  q.addEventListener('input',()=>{
    const v=q.value.toLowerCase();
    document.querySelectorAll('.product-card,.provider-card,.sponsor-card')
      .forEach(c=>c.style.display=c.textContent.toLowerCase().includes(v)?'':'none');
  });
}
