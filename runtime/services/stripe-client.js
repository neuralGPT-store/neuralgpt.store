'use strict';

const Stripe = require('stripe');

function createStripeClient(secretKey) {
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

module.exports = {
  createStripeClient
};
