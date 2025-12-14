const ads = document.querySelectorAll('.ad');
let i = 0;
setInterval(() => {
  ads.forEach(a => a.classList.remove('active'));
  ads[i = (i + 1) % ads.length].classList.add('active');
}, 4000);
