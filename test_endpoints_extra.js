async function run() {
  console.log("Triggering database seeding...");
  const seedRes = await fetch("http://localhost:3000/api/debug/seed");
  console.log("Seed Status:", seedRes.status);
  
  console.log("\nTriggering Netlify nightly job test API...");
  const jobRes = await fetch("http://localhost:3000/api/debug/test-nightly");
  console.log("Job Response Status:", jobRes.status);
  const result = await jobRes.json();
  console.log("Job Output:", JSON.stringify(result, null, 2));
}

run().catch(console.error);
