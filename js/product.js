const track = document.querySelector('.pd-track');
document.querySelector('.pd-nav.next')?.addEventListener('click', () => {
  track.scrollBy({ left: 300, behavior: 'smooth' });
});
document.querySelector('.pd-nav.prev')?.addEventListener('click', () => {
  track.scrollBy({ left: -300, behavior: 'smooth' });
});
