function loadSummary() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const div = document.getElementById('summary');
  let total = 0;

  cart.forEach(item => {
    total += item.price;
  });

  div.innerHTML = \<p>Items: \</p><p>Total: €\</p>\;
}
function confirmOrder() {
  alert('Order confirmed! (simulation)');
  localStorage.removeItem('cart');
  window.location.href = '/home.html';
}
loadSummary();
