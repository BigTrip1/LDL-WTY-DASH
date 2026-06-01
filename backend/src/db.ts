import mongoose from 'mongoose';

export async function connectMongo() {
  // Default URI is IPv4-pinned. Node 18+ resolves 'localhost' to IPv6 (::1)
  // first via dns.lookup(verbatim: true), but the Windows MongoDB service
  // binds only to 127.0.0.1 - so 'localhost' produces ECONNREFUSED ::1:27017.
  // Pinning the URI to 127.0.0.1 bypasses DNS resolution and is also faster.
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const db = process.env.MONGO_DB || 'wty';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: db });
  console.log(`[wty] Mongo connected: ${uri}/${db}`);
}
