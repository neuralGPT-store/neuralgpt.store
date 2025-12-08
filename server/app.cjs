const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// Default safe-mode: avoid external paid APIs unless explicitly enabled
if (!process.env.DISABLE_EXTERNAL_APIS) process.env.DISABLE_EXTERNAL_APIS = 'true';

// Irene modules
const IreneRouter = require('../core/modules/irene/irene-api.cjs');
const { IreneAgent } = require('../core/modules/irene/irene-master.cjs');
const { IreneAutonomy } = require('../core/modules/irene/autonomy/autonomy-engine.cjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Serve core static files (pages, modules, assets) under /core
const corePath = path.join(__dirname, '..', 'core');
app.use('/core', express.static(corePath));

// Also serve assets at /assets for legacy references
app.use('/assets', express.static(path.join(corePath, 'assets')));

// Convenience: serve pages root so visiting / serves the home fragment
const pagesPath = path.join(corePath, 'pages');
// Serve pages as root-level static files (legacy links expect /home.html etc.)
app.use('/', express.static(pagesPath));

// Also serve pages under /pages for scripts that reference /pages/*
app.use('/pages', express.static(pagesPath));

// Root fallback: if no static file matched, return the home fragment
app.get('/', (req, res) => {
  res.sendFile(path.join(pagesPath, 'home.html'));
});

// API
app.use('/irene', IreneRouter);

// Backward-compatible aliases and mock endpoints
// NOTE: Stripe session endpoint removed to comply with repository policy.
// app.post('/create-stripe-session', (req, res) => {
//   // Minimal mock response for checkout flow
//   const session = { id: 'sess_test_123', url: '/core/pages/checkout.html' };
//   res.json(session);
// });

// Alias: some clients call /irene/chat — proxy to IreneCore.respond via router
const { IreneCore } = require('../core/modules/irene/irene-core.cjs');
app.post('/irene/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await IreneCore.respond(message);
    res.json({ response });
  } catch (e) {
    res.status(500).json({ response: 'Irene chat error' });
  }
});

// Autonomy scan endpoint used by scripts (e.g., irene_autonomy_report.ps1)
app.post('/irene/autonomy-scan', async (req, res) => {
  try {
    const { urls } = req.body;
    if (!IreneAutonomy || !IreneAutonomy.scanForSuppliers) {
      return res.status(500).json({ error: 'Autonomy engine not available' });
    }
    const result = await IreneAutonomy.scanForSuppliers(Array.isArray(urls) ? urls : []);
    res.json({ result });
  } catch (e) {
    console.error('Autonomy scan failed', e);
    res.status(500).json({ error: 'Autonomy scan failed' });
  }
});

// Health check
app.get('/ping', (req, res) => res.send('pong'));

app.listen(PORT, () => {
  console.log('NeuralGPT.store running on port ' + PORT);
});
