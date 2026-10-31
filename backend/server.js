require('dotenv').config();
const { loadEnv } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { createApp } = require('./app');

function createShutdownHandler({ server, disconnect = disconnectDatabase, exit = (code) => process.exit(code), write = (message) => process.stdout.write(message) }) {
  let shuttingDown = false;
  return function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    write(`Received ${signal}; shutting down\n`);
    const timeout = setTimeout(() => exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      clearTimeout(timeout);
      try {
        await disconnect();
        exit(0);
      } catch {
        exit(1);
      }
    });
  };
}

async function start() {
  const env = loadEnv();
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');
  await connectDatabase(env.MONGODB_URI, env.MONGODB_DNS_SERVERS);
  const app = createApp(env);
  const server = app.listen(env.PORT, () => process.stdout.write(`Nexora API listening on port ${env.PORT}\n`));

  const shutdown = createShutdownHandler({ server, disconnect: disconnectDatabase });
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    const errorCode = typeof error.code === 'string' ? ` (${error.code})` : '';
    const detailPaths = Array.isArray(error.details) ? `; ${error.details.map((detail) => `${detail.path}: ${detail.message}`).join(', ')}` : '';
    process.stderr.write(`Nexora API startup failed: ${error.name || 'Error'}${errorCode}${detailPaths}\n`);
    process.exitCode = 1;
  });
}

module.exports = { start, createShutdownHandler };
