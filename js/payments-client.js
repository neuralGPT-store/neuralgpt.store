// payments-client.js
// Payments disabled: this site is configured to operate without client-side
// payment SDKs or payment links. All payment integrations are intentionally
// disabled to ensure a free-only deployment (no third-party charging).

/* noop file to avoid loading external payment SDKs (Stripe/PayPal/etc.) */
(function(){
  // Intentionally left blank. If you need to enable payments, implement
  // a secure server-side integration and remove this stub with caution.
  if (typeof console !== 'undefined') console.info('payments-client: payments disabled in this build')
})();
