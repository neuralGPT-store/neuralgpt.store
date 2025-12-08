// payments-client.js
// Client-side payment helpers (static, no secrets).
// This script will only load external SDKs if corresponding global
// variables are set by the site owner (e.g., PAYPAL_CLIENT_ID).

(function(){
  // Load PayPal Buttons if PAYPAL_CLIENT_ID is provided
  if (window.PAYPAL_CLIENT_ID && window.PAYPAL_CLIENT_ID !== 'YOUR_PAYPAL_CLIENT_ID') {
    const s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(window.PAYPAL_CLIENT_ID) + '&currency=USD';
    s.onload = function(){
      if (typeof paypal !== 'undefined' && document.getElementById('paypal-button-container')) {
        paypal.Buttons({
          createOrder: function(data, actions) {
            return actions.order.create({ purchase_units: [{ amount: { value: (window.PAYPAL_DEFAULT_AMOUNT || '5.00') } }] });
          },
          onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
              alert('Gracias ' + (details?.payer?.name?.given_name || '') + '! Donación recibida.');
            });
          }
        }).render('#paypal-button-container');
      }
    };
    document.head.appendChild(s);
  }

  // Stripe client-only flow: open a Payment Link if provided
  document.addEventListener('click', function(e){
    const t = e.target;
    if (t && t.matches && t.matches('[data-stripe-link]')) {
      const url = t.getAttribute('data-stripe-link') || window.STRIPE_PAYMENT_LINK;
      if (!url) { alert('No Stripe Payment Link configured.'); return; }
      window.open(url, '_blank');
    }
  });

  // Google Pay / PSP link: open if element with data-gpay-link clicked
  document.addEventListener('click', function(e){
    const t = e.target;
    if (t && t.matches && t.matches('[data-gpay-link]')) {
      const url = t.getAttribute('data-gpay-link') || window.GPAY_PAYMENT_LINK;
      if (!url) { alert('No Google Pay / PSP link configured.'); return; }
      window.open(url, '_blank');
    }
  });

})();
