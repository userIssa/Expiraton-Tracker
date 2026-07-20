async function run() {
  console.log("Starting Product & Batch CRUD API Verification Tests...");

  // 1. Login to get authentication cookie
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "storehand1@example.com", password: "Password123" })
  });
  const cookieHeader = loginRes.headers.get("set-cookie");
  if (!cookieHeader) {
    console.error("Login failed!");
    return;
  }
  const cookie = cookieHeader.split(";")[0];
  console.log("Logged in successfully. Session cookie obtained.");

  // Fetch users to find a supervisor ID for escalation testing
  // In a real flow, we query the supervisors list
  // Let's get supervisor's ID by logging in or searching. 
  // Let's seed DB first to make sure we are starting fresh!
  console.log("\n[Prep] Re-seeding database...");
  await fetch("http://localhost:3000/api/debug/seed");

  // Get supervisor info
  // Since we seed default users, let's login as supervisor to get their ID, or call api/auth/me after logging in as supervisor.
  const supervisorLoginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "supervisor1@example.com", password: "Password123" })
  });
  const supervisorInfo = await supervisorLoginRes.json();
  const supervisorId = supervisorInfo.user.id;
  console.log("Obtained Supervisor ID:", supervisorId);

  // 2. Create Product
  console.log("\n[Test 1] Creating a new product...");
  const SKU = "TEST-PROD-" + Date.now();
  const prodRes = await fetch("http://localhost:3000/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({
      name: "Test Yogurt Cup",
      SKU: SKU,
      category: "Dairy",
      unit: "200g Cup",
      defaultShelfLifeDays: 14
    })
  });
  console.log("Product Create Status:", prodRes.status);
  const product = await prodRes.json();
  console.log("Product Created:", JSON.stringify(product));

  // 3. Create Batch
  console.log("\n[Test 2] Registering a new active batch...");
  const today = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(today.getDate() + 5); // 5 days from now (Dairy: orange threshold is 7, red is 3 -> Orange)

  const batchRes = await fetch("http://localhost:3000/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({
      productId: product._id,
      batchNumber: "B-YGT-77",
      quantity: 150,
      location: "Warehouse A",
      purchaseDate: today.toISOString(),
      manufactureDate: today.toISOString(),
      expiryDate: expiryDate.toISOString()
    })
  });
  console.log("Batch Create Status:", batchRes.status);
  const batch = await batchRes.json();
  console.log("Batch Created (Calculated Color should be orange):", batch.batchNumber, "Color:", batch.currentUrgencyColor);

  // 4. Patch Expiry Date and Verify Recalculation
  console.log("\n[Test 3] Modifying batch expiry date to trigger color recalculation...");
  const newExpiryDate = new Date();
  newExpiryDate.setDate(today.getDate() + 2); // 2 days from now (Dairy: red is 3 -> Red)

  const patchRes = await fetch(`http://localhost:3000/api/batches/${batch._id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({
      expiryDate: newExpiryDate.toISOString()
    })
  });
  console.log("Batch Patch Status:", patchRes.status);
  const patchedBatch = await patchRes.json();
  console.log("Updated Batch (Calculated Color should now be red):", patchedBatch.batchNumber, "Color:", patchedBatch.currentUrgencyColor);

  // 5. Clear Batch
  console.log("\n[Test 4] Clearing batch (sold/used/discarded)...");
  const clearRes = await fetch(`http://localhost:3000/api/batches/${batch._id}/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({
      reason: "discarded",
      note: "Too close to expiration, safety hazard."
    })
  });
  console.log("Batch Clear Status:", clearRes.status);
  const clearedBatch = await clearRes.json();
  console.log("Cleared Batch Status:", clearedBatch.status);

  // Verify batch is removed from default active inventory GET /api/batches
  console.log("\n[Test 5] Checking active inventory list (cleared batch should not appear)...");
  const listRes = await fetch("http://localhost:3000/api/batches", {
    headers: { "Cookie": cookie }
  });
  const list = await listRes.json();
  const foundCleared = list.some(b => b._id === batch._id);
  console.log("Cleared batch found in active inventory list?:", foundCleared);

  // 6. Register another batch and Escalate
  console.log("\n[Test 6] Registering second batch to test escalation...");
  const batch2Res = await fetch("http://localhost:3000/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({
      productId: product._id,
      batchNumber: "B-YGT-78",
      quantity: 500, // high quantity
      location: "Warehouse A",
      purchaseDate: today.toISOString(),
      manufactureDate: today.toISOString(),
      expiryDate: expiryDate.toISOString()
    })
  });
  const batch2 = await batch2Res.json();
  console.log("Batch 2 Registered:", batch2.batchNumber);

  console.log("\n[Test 7] Escalating batch 2 to supervisor...");
  const escalateRes = await fetch(`http://localhost:3000/api/batches/${batch2._id}/escalate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({
      assignedTo: supervisorId,
      reason: "Unusually high quantity, cannot sell before expiration."
    })
  });
  console.log("Batch Escalation Status:", escalateRes.status);
  const escalationResult = await escalateRes.json();
  console.log("Escalation Result Status:", escalationResult.batch.status, "Escalation Status:", escalationResult.escalation.status);

  console.log("\nAll Product & Batch CRUD API tests completed successfully!");
}

run().catch(console.error);
