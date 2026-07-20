const loginDataCorrect = JSON.stringify({
  email: 'storehand1@example.com',
  password: 'Password123'
});

async function run() {
  console.log("Starting Node.js Auth Verification Tests...");

  // Test 1: Access protected
  console.log("\n[Test 1] Accessing /api/products without credentials...");
  let res = await fetch("http://localhost:3000/api/products");
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  // Test 2: Invalid login
  console.log("\n[Test 2] Logging in with invalid credentials...");
  res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "storehand1@example.com", password: "wrong" })
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  // Test 3: Correct login
  console.log("\n[Test 3] Logging in with correct credentials...");
  res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: loginDataCorrect
  });
  console.log("Status:", res.status);
  const body = await res.json();
  console.log("Body:", JSON.stringify(body));
  
  // Get cookie
  const cookieHeader = res.headers.get("set-cookie");
  console.log("Set-Cookie Header:", cookieHeader);
  if (!cookieHeader) {
    console.error("No cookie returned!");
    return;
  }

  const cookie = cookieHeader.split(";")[0];

  // Test 4: Me endpoint
  console.log("\n[Test 4] Accessing /api/auth/me with session cookie...");
  res = await fetch("http://localhost:3000/api/auth/me", {
    headers: { "Cookie": cookie }
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.json());

  // Test 5: Logout
  console.log("\n[Test 5] Logging out...");
  res = await fetch("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { "Cookie": cookie }
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.json());
  
  const clearedCookieHeader = res.headers.get("set-cookie");
  const clearedCookie = clearedCookieHeader ? clearedCookieHeader.split(";")[0] : "";

  // Test 6: Verify cleared
  console.log("\n[Test 6] Verifying session cleared (calling /api/auth/me)...");
  res = await fetch("http://localhost:3000/api/auth/me", {
    headers: { "Cookie": clearedCookie }
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

run().catch(console.error);
