const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../core/assets')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../core/pages/home.html'));
});

app.listen(PORT, () => {
  console.log('NeuralGPT.store running on port ' + PORT);
});
