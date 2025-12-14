const products=[...Array(30)].map((_,i)=>({name:'Producto '+(i+1),img:'/assets/products/p'+((i%10)+1)+'.webp'}));
const sponsors=[...Array(30)].map((_,i)=>({name:'Sponsor '+(i+1),img:'/assets/sponsors/s'+((i%10)+1)+'.webp'}));

function render(grid,data,start){
  grid.innerHTML='';
  data.slice(start,start+10).forEach(d=>{
    const c=document.createElement('div');
    c.className='rotator-card';
    c.innerHTML=<img src=""><span></span>;
    grid.appendChild(c);
  });
}

let pi=0, si=0;
const pg=document.getElementById('productsGrid');
const sg=document.getElementById('sponsorsGrid');
if(pg&&sg){
  render(pg,products,pi); render(sg,sponsors,si);
  setInterval(()=>{ pi=(pi+10)%products.length; render(pg,products,pi); },6000);
  setInterval(()=>{ si=(si+10)%sponsors.length; render(sg,sponsors,si); },7000);
}
