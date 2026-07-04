const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        resolve({ status: res.statusCode, body: data, cookies });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: Login
  const loginBody = JSON.stringify({ email: 'storehand1@example.com', password: 'Password123' });
  const loginRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
  }, loginBody);

  console.log('Login status:', loginRes.status);
  
  const cookieHeader = loginRes.cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Got cookie:', cookieHeader ? 'yes' : 'no');

  // Step 2: POST a batch
  const batchBody = JSON.stringify({
    batchNumber: 'TEST-VERIFY-001',
    productDetails: { name: 'Test Cheese', SKU: 'TEST-001', category: 'Dairy', unit: 'kg', defaultShelfLifeDays: 30 },
    quantity: 50,
    location: 'Warehouse A',
    purchaseDate: '2026-07-01',
    manufactureDate: '2026-07-01',
    expiryDate: '2026-07-31'
  });

  const batchRes = await request({
    hostname: 'localhost', port: 3000, path: '/api/batches',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(batchBody),
      'Cookie': cookieHeader
    }
  }, batchBody);

  console.log('\nBatch POST status:', batchRes.status);
  const parsed = JSON.parse(batchRes.body);
  if (batchRes.status === 200 || batchRes.status === 201) {
    console.log('✓ Success! Batch created:', parsed.batchNumber || parsed._id);
  } else {
    console.log('✗ Error:', parsed.error || batchRes.body);
  }
}

main().catch(console.error);
