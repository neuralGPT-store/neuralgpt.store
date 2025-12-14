document.querySelectorAll('.stripe-test').forEach(btn=>{
  btn.addEventListener('click',()=>{
    alert('Stripe TEST MODE activo. No se realiza ningún cobro.');
  });
});
