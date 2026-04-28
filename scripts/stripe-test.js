const Stripe = require('stripe');
require('dotenv').config(); const stripe = Stripe(process.env.STRIPE_SECRET_KEY); async function test() { try { const balance = await stripe.balance.retrieve(); console.log('✓ Stripe conectado:', balance.available[0]?.currency || 'EUR'); console.log(' Balance disponible:', balance.available[0]?.amount || 0, 'centavos'); console.log(' Modo:', process.env.STRIPE_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'); } catch(e) { console.error('✗ Error Stripe:', e.message); process.exit(1); }
} test();
