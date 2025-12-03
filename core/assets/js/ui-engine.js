export function applyGlow(cards) {
  cards.forEach(card => {
    card.addEventListener('mousemove', () => {
      card.style.boxShadow = '0 0 25px rgba(255,0,60,0.45), 0 0 25px rgba(255,215,0,0.4)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '0 0 25px rgba(255,215,0,0.25)';
    });
  });
}

export function animateCards() {
  const cards = document.querySelectorAll('.ng-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease-in-out';
      card.style.opacity = '1';
    }, i * 120);
  });
}
