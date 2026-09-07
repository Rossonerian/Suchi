// Single responsibility: open and export the MongoDB connection.
import mongoose from 'mongoose';

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('[db] connected to MongoDB');

  mongoose.connection.on('error', (err) => {
    // Driver messages can echo connection details; keep production logs
    // generic and rely on the process-level monitor for diagnostics.
    console.error('[db] connection error');
  });

  return mongoose.connection;
}

export { connectDB };
