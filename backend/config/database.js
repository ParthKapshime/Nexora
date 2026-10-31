const mongoose = require('mongoose');

async function connectDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI is required to start the API server');
  const parsed = new URL(uri);
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error('MONGODB_URI must use MongoDB protocol');
  }
  if (parsed.pathname && parsed.pathname !== '/' && parsed.pathname.slice(1) !== 'Nexora') {
    throw new Error('MONGODB_URI must target the Nexora database');
  }
  parsed.pathname = '/Nexora';
  await mongoose.connect(parsed.toString(), { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
