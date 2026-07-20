import mongoose from 'mongoose';
import dns from 'dns';

// Only set custom DNS servers in non-serverless local node environments
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_EXECUTION_ENV || process.env.VERCEL);
if (!isServerless) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Ignore if environment overrides DNS configuration
  }
}

// Global cached connection state for Next.js hot-reloads and serverless invocation re-use
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is missing. Please configure MONGODB_URI in your Netlify Site Configuration environment variables.');
  }

  if (!isServerless) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // Ignore if environment overrides DNS configuration
    }
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
