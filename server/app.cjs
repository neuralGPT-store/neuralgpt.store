const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// Irene modules
const IreneRouter = require('../core/modules/irene/irene-api.cjs');
const { IreneAgent } = require('../core/modules/irene/irene-master.cjs');
const { IreneAutonomy } = require('../core/modules/irene/autonomy/autonomy-engine.cjs');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// STATIC PAGES (FINAL WORKING VERSION)
const pagesPath = path.join(__dirname, '..', 'core', 'pages');
app.use(express.static(pagesPath));

// API
app.use('/irene', IreneRouter);

// Health check
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.listen(PORT, () => {
  console.log('NeuralGPT.store running on port ' + PORT);
});
