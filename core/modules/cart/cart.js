function loadCart() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const container = document.getElementById('cart-items');
  let total = 0;

  container.innerHTML = '';
  cart.forEach((item, index) => {
    total += item.price;
    const div = document.createElement('div');
    div.innerHTML = \
      <p>\ - €\</p>
      <button onclick="removeItem(\)">Remove</button>
    \;
    container.appendChild(div);
  });

  document.getElementById('total').innerText = 'Total: €' + total.toFixed(2);
}
function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
}
loadCart();
