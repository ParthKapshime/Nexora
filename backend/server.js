require('dotenv').config();
const { loadEnv } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { createApp } = require('./app');

async function start() {
  const env = loadEnv();
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');
  await connectDatabase(env.MONGODB_URI);
  const app = createApp(env);
  const server = app.listen(env.PORT, () => process.stdout.write(`Nexora API listening on port ${env.PORT}\n`));

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stdout.write(`Received ${signal}; shutting down\n`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    process.stderr.write(`Nexora API startup failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { start };
