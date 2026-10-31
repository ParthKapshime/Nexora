const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');

const app = createApp({
  NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000',
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters', UPLOAD_DIR: undefined
});

test('GET /healthz responds without database access and sets security headers', async () => {
  const response = await request(app).get('/healthz').expect(200);
  assert.deepEqual(response.body, { status: 'ok' });
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-request-id']?.length, 36);
});

test('GET /readyz reports unavailable database without exposing internals', async () => {
  const response = await request(app).get('/readyz').expect(503);
  assert.deepEqual(response.body, { status: 'not_ready', database: 'disconnected' });
});

test('authentication rejects missing fields and malformed input', async () => {
  await request(app).post('/api/auth/register').send({}).expect(400);
  await request(app).post('/api/auth/login').send({ email: 'bad-email', password: 'short' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: 'valid@example.com', password: '🙂'.repeat(25) }).expect(400);
});

test('private routes reject unauthenticated requests', async () => {
  await request(app).get('/api/auth/me').expect(401);
  await request(app).get('/api/profile').expect(401);
  await request(app).get('/api/applications').expect(401);
  await request(app).post('/api/ai/analyze-skills').send({}).expect(401);
});

test('CORS rejects origins outside the configured allowlist', async () => {
  const response = await request(app).get('/healthz').set('Origin', 'https://example.invalid').expect(403);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.equal(response.body.error, 'Origin is not allowed');
});

test('OpenAPI spec is served and includes concrete route declarations', async () => {
  const response = await request(app).get('/openapi.json').expect(200);
  assert.equal(response.body.openapi, '3.0.3');
  assert.ok(response.body.paths['/api/applications/{id}']);
  assert.ok(response.body.paths['/api/ai/analyze-skills']);
});

test('Swagger UI is served while API security headers remain enabled', async () => {
  const response = await request(app).get('/api-docs/').expect(200);
  assert.match(response.headers['content-type'], /text\/html/);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
});

test('production mode enables HSTS and clickjacking protection', async () => {
  const productionApp = createApp({ NODE_ENV: 'production', PORT: 5000, CORS_ORIGINS: 'https://app.example.invalid', JWT_SECRET: 'production-test-secret-with-32-characters', MONGODB_URI: 'mongodb://localhost/Nexora' });
  const response = await request(productionApp).get('/healthz').expect(200);
  assert.match(response.headers['strict-transport-security'], /max-age=/);
  assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
});

test('unknown endpoints return safe 404 responses with request IDs', async () => {
  const response = await request(app).get('/does-not-exist').expect(404);
  assert.equal(response.body.error, 'Route not found');
  assert.ok(response.body.requestId);
  assert.equal(JSON.stringify(response.body).includes('stack'), false);
});

test('malformed JSON returns 400 without leaking parser details', async () => {
  const response = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad').expect(400);
  assert.equal(response.body.error, 'Invalid JSON body');
  assert.equal(response.body.requestId.length, 36);
  assert.equal(JSON.stringify(response.body).includes('SyntaxError'), false);
});

test('authentication rate limiter returns 429 after the configured threshold', async () => {
  const isolatedApp = createApp({ NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000', JWT_SECRET: 'another-test-secret-with-32-or-more-characters' });
  let limitedResponse;
  for (let attempt = 0; attempt < 12 && !limitedResponse; attempt += 1) {
    const response = await request(isolatedApp).post('/api/auth/login').send({});
    if (response.status === 429) limitedResponse = response;
    else assert.equal(response.status, 400);
  }
  assert.ok(limitedResponse, 'limiter should reject requests after its configured threshold');
  assert.match(limitedResponse.body.error, /Too many authentication attempts/);
});
