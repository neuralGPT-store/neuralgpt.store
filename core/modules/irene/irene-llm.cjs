require('dotenv').config();
const fetch = require('node-fetch');

async function askIrene(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return 'Missing API key';

  const body = {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }]
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || 'Irene error.';
}

module.exports = { askIrene };
