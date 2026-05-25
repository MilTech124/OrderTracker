const mongoose = require('mongoose');

let connected = false;

async function connectDB() {
  if (connected || mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Brak MONGODB_URI w .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  connected = true;
  console.log('MongoDB połączone');
}

module.exports = connectDB;
