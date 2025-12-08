// Stripe integration disabled repository-wide per policy.
// This file intentionally does not perform network requests or expose keys.
function payStripe() {
  // Inform the user and provide instructions for a payment link instead.
  try {
    alert('Stripe payments are disabled in this build. To accept payments, create a Stripe Payment Link in your Stripe dashboard and paste it into the site markup.');
  } catch (e) {
    // noop
  }
}
