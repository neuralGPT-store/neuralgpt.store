const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const host = 'localhost';
  const port = process.env.PORT || 3000;

  try {
    console.log('Checking /ping');
    console.log(await request({ hostname: host, port, path: '/ping', method: 'GET' }));

    console.log('Checking /core/pages/home.html');
    const home = await request({ hostname: host, port, path: '/core/pages/home.html', method: 'GET' });
    console.log('home status', home.statusCode);

    console.log('POST /irene/ask');
    const ask = await request({
      hostname: host,
      port,
      path: '/irene/ask',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ message: 'hello' }));
    console.log('irene/ask', ask.statusCode, ask.body);

    // Stripe session check removed by policy (no payment APIs in static build).

    console.log('POST /irene/autonomy-scan (sample)');
    const scan = await request({
      hostname: host,
      port,
      path: '/irene/autonomy-scan',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ urls: ['http://' + host + ':' + port + '/core/pages/home.html'] }));
    console.log('autonomy-scan', scan.statusCode, scan.body);

    console.log('Smoke tests completed');
  } catch (e) {
    console.error('Smoke test failed', e);
    process.exit(2);
  }
})();
