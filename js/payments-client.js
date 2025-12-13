// payments-client.js
// Frontend helper to initialize Stripe.js and Payment Request (Google Pay)
// NOTE: This file only sets up client-side Stripe usage. A secure server-side
// endpoint is REQUIRED to create Checkout Sessions or PaymentIntents. Do NOT
// place secret keys in frontend code. Set `window.NGS_STRIPE_PUBLISHABLE_KEY`
// at deploy time (env variable injected by hosting) and implement a server
// POST /create-checkout-session endpoint that returns { id: <checkoutSessionId> }.

(function () {
  'use strict';

  const STRIPE_JS = 'https://js.stripe.com/v3/';

  function loadStripeScript() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(window.Stripe);
      const s = document.createElement('script');
      s.src = STRIPE_JS;
      s.async = true;
      s.onload = () => resolve(window.Stripe);
      s.onerror = (e) => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(s);
    });
  }

  async function initStripe(opts = {}) {
    const key = opts.publishableKey || window.NGS_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.info('payments-client: no publishable key provided; payments disabled');
      return null;
    }

    await loadStripeScript();
    const stripe = window.Stripe(key);
    window.__NGS_STRIPE = stripe;

    // Prepare a Payment Request button if the container exists
    try {
      const elements = stripe.elements();
      const paymentRequest = stripe.paymentRequest({
        country: opts.country || 'US',
        currency: opts.currency || 'usd',
        total: { label: opts.label || 'Total', amount: opts.amount || 0 },
        requestPayerName: true,
        requestPayerEmail: true
      });

      paymentRequest.canMakePayment().then((result) => {
        if (result && document.querySelector('#payment-request-button')) {
          const prButton = elements.create('paymentRequestButton', { paymentRequest });
          prButton.mount('#payment-request-button');
        }
      }).catch((err) => console.warn('payments-client: paymentRequest check failed', err));
    } catch (e) {
      console.warn('payments-client: stripe payment request not available', e);
    }

    return stripe;
  }

  // Starts a Stripe Checkout session by calling a server endpoint.
  // serverEndpoint should be implemented server-side and must create the
  // Checkout Session with the secret key; frontend only receives session id.
  async function startCheckout({ productId, quantity = 1, serverEndpoint = '/create-checkout-session' } = {}) {
    if (!window.__NGS_STRIPE) {
      console.error('payments-client: Stripe not initialized. Call initStripe() first.');
      return;
    }
    try {
      const res = await fetch(serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      if (data && data.id) {
        await window.__NGS_STRIPE.redirectToCheckout({ sessionId: data.id });
      } else {
        console.error('payments-client: server did not return a session id', data);
      }
    } catch (err) {
      console.error('payments-client: checkout error', err);
    }
  }

  // Public API
  window.NGSPayments = {
    initStripe,
    startCheckout
  };

  if (typeof console !== 'undefined') console.info('payments-client: initialized (frontend helper)');

})();
