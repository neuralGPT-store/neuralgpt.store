const track = document.querySelector('.products-track');
if(track){
  const products = Array.from({length:30}).map((_,i)=>({
    name:'Producto '+(i+1),
    img:'/assets/wallpapers/product-bg.webp'
  }));
  track.innerHTML = products.map(p=>\
    <div class="product-card">
      <img src="\" style="width:100%;height:120px;object-fit:cover">
      <div>\</div>
    </div>\).join('');
}
