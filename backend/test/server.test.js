const test = require('node:test');
const assert = require('node:assert/strict');
const { createShutdownHandler } = require('../server');

test('graceful shutdown closes the HTTP server and database once', async () => {
  const events = [];
  const server = { close(callback) { events.push('server-close'); queueMicrotask(callback); } };
  const shutdown = createShutdownHandler({
    server,
    disconnect: async () => { events.push('database-disconnect'); },
    exit: (code) => events.push(`exit-${code}`),
    write: (message) => events.push(message.trim())
  });

  shutdown('SIGTERM');
  shutdown('SIGINT');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ['Received SIGTERM; shutting down', 'server-close', 'database-disconnect', 'exit-0']);
});

test('graceful shutdown exits unsuccessfully if database disconnect fails', async () => {
  const events = [];
  const server = { close(callback) { queueMicrotask(callback); } };
  const shutdown = createShutdownHandler({
    server,
    disconnect: async () => { throw new Error('synthetic disconnect failure'); },
    exit: (code) => events.push(code),
    write: () => {}
  });

  shutdown('SIGINT');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, [1]);
});
