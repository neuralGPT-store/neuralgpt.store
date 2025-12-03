import products from './product-data.json' assert { type: 'json' };

export function renderProducts(container) {
  container.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'ng-card';
    card.innerHTML = 
      <h3></h3>
      <p></p>
      <span class='badge'></span>
      <div class='price'> €</div>
    ;
    container.appendChild(card);
  });
}

