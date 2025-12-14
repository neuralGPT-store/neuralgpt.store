const ads = document.querySelectorAll('.ad');
let idx = 0;
setInterval(() => {
  ads[idx].classList.remove('active');
  idx = (idx + 1) % ads.length;
  ads[idx].classList.add('active');
}, 3000);
