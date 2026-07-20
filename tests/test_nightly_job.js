const handler = require('./netlify/functions/nightly-update').default;

async function run() {
  console.log("Triggering Netlify Nightly Update Scheduled Function locally...");
  
  // Set environment variables for Next.js resolution if needed
  process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/expiration-tracker";
  
  const result = await handler();
  console.log("Job Result:", JSON.stringify(result, null, 2));
}

run().catch(console.error);
