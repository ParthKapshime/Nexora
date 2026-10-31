const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');
const { User } = require('../models/User');
const { errorHandler } = require('../middleware/errorHandler');

const app = createApp({
  NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000',
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters', UPLOAD_DIR: undefined
});

function mockAuthUser() {
  const original = User.findById;
  User.findById = (id) => ({ select: async () => ({ id, _id: id, email: 'test@example.invalid' }) });
  return () => { User.findById = original; };
}

test('GET / returns API entry point links', async () => {
  const response = await request(app).get('/').expect(200);
  assert.equal(response.body.name, 'Nexora API');
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.health, '/healthz');
  assert.equal(response.body.documentation, '/api-docs');
});

test('GET /healthz responds without database access and sets security headers', async () => {
  const response = await request(app).get('/healthz').expect(200);
  assert.deepEqual(response.body, { status: 'ok' });
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.doesNotMatch(response.headers['content-security-policy'], /unsafe-inline|unsafe-eval/);
  assert.match(response.headers['content-security-policy'], /default-src 'self'/);
  assert.equal(response.headers['x-request-id']?.length, 36);
});

test('GET /readyz reports unavailable database without exposing internals', async () => {
  const response = await request(app).get('/readyz').expect(503);
  assert.deepEqual(response.body, { status: 'not_ready', database: 'disconnected' });
});

test('authentication rejects missing fields and malformed input', async () => {
  await request(app).post('/api/auth/register').send({}).expect(400);
  await request(app).post('/api/auth/register').send({ email: 'missing-password@example.com' }).expect(400);
  await request(app).post('/api/auth/register').send({ email: 'extra-field@example.com', password: 'long-enough-password', role: 'admin' }).expect(400);
  await request(app).post('/api/auth/login').send({ password: 'long-enough-password' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: 'valid@example.com' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: 'long-enough-password' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: 'bad-email', password: 'short' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: 'valid@example.com', password: '🙂'.repeat(25) }).expect(400);
});

test('private routes reject unauthenticated requests', async () => {
  await request(app).get('/api/auth/me').expect(401);
  await request(app).get('/api/profile').expect(401);
  await request(app).get('/api/applications').expect(401);
  await request(app).post('/api/ai/analyze-skills').send({}).expect(401);
  await request(app).get('/api/ai').expect(401);
  await request(app).post('/api/ai/chat/completions').send({ messages: [{ role: 'user', content: 'hi' }] }).expect(401);
});

test('AI endpoint discovery and OpenAPI document the chat completion route', async () => {
  const restoreUser = mockAuthUser();
  const token = jwt.sign({}, app.locals.env.JWT_SECRET, { subject: '507f1f77bcf86cd799439011', expiresIn: 300 });
  try {
    const endpoint = await request(app).get('/api/ai').set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(endpoint.body.chatCompletions, '/api/ai/chat/completions');
    assert.equal(endpoint.body.method, 'POST');

    const spec = await request(app).get('/openapi.json').expect(200);
    assert.ok(spec.body.paths['/api/ai/chat/completions']?.post);
  } finally { restoreUser(); }
});

test('chat completion validates HTTPS-only image URLs before provider calls', async () => {
  const restoreUser = mockAuthUser();
  const token = jwt.sign({}, app.locals.env.JWT_SECRET, { subject: '507f1f77bcf86cd799439011', expiresIn: 300 });
  try {
    await request(app).post('/api/ai/chat/completions')
      .set('Authorization', `Bearer ${token}`)
      .send({ messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } }] }] })
      .expect(400);
  } finally { restoreUser(); }
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

test('unexpected errors are safely logged without exposing internal error text', () => {
  const originalError = console.error;
  let logLine;
  let responseStatus;
  let responseBody;
  console.error = (line) => { logLine = line; };
  try {
    errorHandler(new Error('private synthetic credential detail'), {
      id: 'synthetic-request-id', method: 'GET', path: '/synthetic-failure'
    }, {
      status(code) { responseStatus = code; return this; },
      json(body) { responseBody = body; }
    }, () => {});
  } finally { console.error = originalError; }
  assert.equal(responseStatus, 500);
  assert.equal(responseBody.error, 'Internal server error');
  assert.equal(responseBody.requestId, 'synthetic-request-id');
  assert.match(logLine, /synthetic-request-id/);
  assert.match(logLine, /Error/);
  assert.doesNotMatch(logLine, /private synthetic credential detail/);
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
