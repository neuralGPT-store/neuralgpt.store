export function filterByCategory(products, category) {
  if (category === 'all') return products;
  return products.filter(p => p.category === category);
}

