const http = require('http');

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, cookies: res.headers['set-cookie'] || [] }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  // Login as manager
  const loginBody = JSON.stringify({ email: 'manager1@example.com', password: 'Password123' });
  const login = await req({
    hostname: 'localhost', port: 3000, path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
  }, loginBody);
  const cookie = login.cookies.map(c => c.split(';')[0]).join('; ');

  // Load current config
  const cfgRes = await req({ hostname: 'localhost', port: 3000, path: '/api/settings/notifications', method: 'GET', headers: { Cookie: cookie } });
  const cfg = JSON.parse(cfgRes.body);

  // Update recipients to ONLY the real gmail address
  const putBody = JSON.stringify({
    digestFrequency: cfg.digestFrequency,
    recipients: ['toluwanimioderinde@gmail.com'],   // Only real address
    alertThresholdDays: cfg.alertThresholdDays,
    enabledUrgencyColors: cfg.enabledUrgencyColors,
  });

  const put = await req({
    hostname: 'localhost', port: 3000, path: '/api/settings/notifications',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(putBody), Cookie: cookie }
  }, putBody);
  console.log('Config updated:', put.status, JSON.parse(put.body).recipients);

  // Now trigger test email
  const test = await req({
    hostname: 'localhost', port: 3000, path: '/api/settings/notifications/test',
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Length': '0' }
  });
  const result = JSON.parse(test.body);
  console.log('\n=== Test Email Result ===');
  console.log(JSON.stringify(result, null, 2));

  if (result.id) console.log('\n✅ Email sent! Resend ID:', result.id, '— check your inbox');
  else if (result.error) console.log('\n❌ Error:', result.error);
  else console.log('\n⚠️ Unknown state');
}

main().catch(console.error);
