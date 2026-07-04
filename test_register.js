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
  // Try every seeded account to find one that works
  const accounts = [
    { email: 'manager1@example.com', password: 'Password123' },
    { email: 'supervisor1@example.com', password: 'Password123' },
    { email: 'storehand1@example.com', password: 'Password123' },
  ];

  for (const account of accounts) {
    const loginBody = JSON.stringify(account);
    const login = await req({
      hostname: 'localhost', port: 3000, path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
    }, loginBody);

    const loginData = JSON.parse(login.body);
    console.log(`\nLogin ${account.email}: status=${login.status} role=${loginData.user?.role}`);
    const cookie = login.cookies.map(c => c.split(';')[0]).join('; ');

    // Try to POST a new user
    const newUserBody = JSON.stringify({
      name: 'Test User',
      email: `testuser_${Date.now()}@example.com`,
      role: 'store-hand',
      password: 'Password123',
      assignedLocations: [],
    });

    const postRes = await req({
      hostname: 'localhost', port: 3000, path: '/api/settings/users',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(newUserBody), Cookie: cookie }
    }, newUserBody);

    const postData = JSON.parse(postRes.body);
    console.log(`  POST /api/settings/users => ${postRes.status}:`, JSON.stringify(postData));
  }
}

main().catch(console.error);
