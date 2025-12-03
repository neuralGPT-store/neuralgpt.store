const express = require('express');
const router = express.Router();

const { IreneCore } = require('./irene-core.cjs');
const { IreneAgent } = require('./irene-master.cjs');

router.post('/ask', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await IreneCore.respond(message);
    res.json({ response });
  } catch (e) {
    res.json({ response: 'Error in IreneCore.' });
  }
});

router.post('/agent', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await IreneAgent(message);
    res.json({ response });
  } catch (e) {
    res.json({ response: 'Error in IreneAgent.' });
  }
});

module.exports = router;
