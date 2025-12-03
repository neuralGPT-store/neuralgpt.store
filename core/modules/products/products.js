async function loadProducts() {
  const res = await fetch('/modules/products/products.json');
  const data = await res.json();
  const container = document.getElementById('product-list');

  data.forEach(p => {
    const item = document.createElement('div');
    item.innerHTML = \
      <h3>\</h3>
      <p>Price: €\</p>
      <button onclick="addToCart(\, '\', \)">Add to cart</button>
    \;
    container.appendChild(item);
  });
}
loadProducts();

function addToCart(id, name, price) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.push({ id, name, price });
  localStorage.setItem('cart', JSON.stringify(cart));
  alert('Added to cart');
}
