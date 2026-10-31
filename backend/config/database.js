const mongoose = require('mongoose');
const dns = require('node:dns');
const { isIP } = require('node:net');

async function connectDatabase(uri, dnsServers) {
  if (!uri) throw new Error('MONGODB_URI is required to start the API server');
  if (dnsServers) {
    const servers = dnsServers.split(',').map((server) => server.trim()).filter(Boolean);
    if (!servers.length || servers.some((server) => !isIP(server))) {
      throw new Error('MONGODB_DNS_SERVERS must contain comma-separated DNS server IP addresses');
    }
    dns.setServers(servers);
  }
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
