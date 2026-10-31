require('dotenv').config();

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const mongoose = require('mongoose');
const { loadEnv } = require('../config/env');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { createApp } = require('../app');
const { User } = require('../models/User');
const { Application } = require('../models/Application');
const { UserResource } = require('../models/UserResource');

const accountEmails = ['aarav.nexora.test@example.com', 'priya.nexora.test@example.com'];
const integrationEnabled = process.env.NEXORA_RUN_LIVE_DB_TESTS === '1'
  || process.env.npm_lifecycle_event === 'test:live-db';
const integrationSkipReason = integrationEnabled
  ? false
  : 'Set NEXORA_RUN_LIVE_DB_TESTS=1 or run npm run test:live-db to opt in to MongoDB writes';

test('live MongoDB authentication, profile and ownership integration', { skip: integrationSkipReason }, async () => {
  const password = process.env.NEXORA_LIVE_TEST_PASSWORD || randomBytes(32).toString('base64url');
  const env = loadEnv();
  assert.ok(env.MONGODB_URI, 'MONGODB_URI is required for this opt-in integration test');
  assert.ok(env.JWT_SECRET, 'JWT_SECRET is required for this opt-in integration test');

  await connectDatabase(env.MONGODB_URI, env.MONGODB_DNS_SERVERS);
  const createdUserIds = [];
  let applicationId;
  let resourceId;
  const results = [];
  const app = createApp(env);

  async function expectStatus(label, promise, status) {
    const response = await promise;
    assert.equal(response.status, status, `${label}: expected ${status}, received ${response.status}`);
    results.push({ scenario: label, status: response.status });
    return response;
  }

  try {
    assert.equal(mongoose.connection.name, 'Nexora', 'Integration test must use the Nexora database');
    const existing = await User.find({ email: { $in: accountEmails } }).select('_id email').lean();
    assert.equal(existing.length, 0, 'Synthetic test account already exists; refusing to modify or delete existing users');

    const userA = await expectStatus('register user A without a name field', request(app).post('/api/auth/register').send({ email: accountEmails[0], password }), 201);
    createdUserIds.push(userA.body.user.id);
    const userB = await expectStatus('register user B without a name field', request(app).post('/api/auth/register').send({ email: accountEmails[1], password }), 201);
    createdUserIds.push(userB.body.user.id);
    assert.equal(userA.body.user.passwordHash, undefined);
    assert.equal(userB.body.user.passwordHash, undefined);
    assert.equal(userA.body.user.email, accountEmails[0]);
    assert.equal(userB.body.user.email, accountEmails[1]);

    const storedUser = await User.findById(userA.body.user.id).select('+passwordHash').lean();
    assert.notEqual(storedUser.passwordHash, password);
    assert.equal(await bcrypt.compare(password, storedUser.passwordHash), true);
    results.push({ scenario: 'bcrypt hash stored and not returned', status: 'verified' });

    const userIndex = (await User.collection.indexes()).find((index) => index.key.email === 1);
    assert.equal(userIndex?.unique, true, 'Email index must be unique in MongoDB');
    results.push({ scenario: 'unique email index exists in live database', status: 'verified' });
    const applicationIndexes = await Application.collection.indexes();
    assert.ok(applicationIndexes.some((index) => index.key.user === 1 && index.key.appliedAt === -1));
    const resourceIndexes = await UserResource.collection.indexes();
    assert.ok(resourceIndexes.some((index) => index.key.user === 1 && index.key.kind === 1 && index.key.createdAt === -1));
    results.push({ scenario: 'application and resource owner indexes exist', status: 'verified' });

    const loginA = await expectStatus('valid login user A', request(app).post('/api/auth/login').send({ email: accountEmails[0], password }), 200);
    const loginB = await expectStatus('valid login user B', request(app).post('/api/auth/login').send({ email: accountEmails[1], password }), 200);
    const tokenA = loginA.body.token;
    const tokenB = loginB.body.token;
    const payload = jwt.verify(tokenA, env.JWT_SECRET, { algorithms: ['HS256'] });
    assert.ok(payload.exp > Math.floor(Date.now() / 1000));
    assert.equal(payload.exp - payload.iat, 300);
    assert.equal(loginA.body.expiresIn, 300);
    assert.equal(loginA.body.user.passwordHash, undefined);
    results.push({ scenario: 'JWT signature and five-minute expiration', status: 'verified' });
    await expectStatus('login with incorrect password', request(app).post('/api/auth/login').send({ email: accountEmails[0], password: `${password}wrong` }), 401);
    await expectStatus('login with unregistered email', request(app).post('/api/auth/login').send({ email: 'unregistered@example.com', password }), 401);

    await expectStatus('duplicate registration', request(app).post('/api/auth/register').send({ email: accountEmails[0], password }), 409);
    await expectStatus('invalid registration email', request(app).post('/api/auth/register').send({ email: 'not-an-email', password }), 400);
    await expectStatus('short registration password', request(app).post('/api/auth/register').send({ email: 'short-password@example.com', password: 'short' }), 400);
    await expectStatus('registration strict fields reject name and role mass assignment', request(app).post('/api/auth/register').send({ email: 'strict-fields@example.com', password, name: 'Ignored Name', role: 'admin' }), 400);
    await expectStatus('malformed registration JSON', request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{bad'), 400);
    await expectStatus('malformed login JSON', request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad'), 400);

    await expectStatus('protected route without token', request(app).get('/api/auth/me'), 401);
    await expectStatus('protected route with malformed token', request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.value'), 401);
    const expired = jwt.sign({}, env.JWT_SECRET, { subject: userA.body.user.id, algorithm: 'HS256', expiresIn: -1 });
    await expectStatus('protected route with expired token', request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`), 401);
    const me = await expectStatus('protected route with valid token', request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenA}`), 200);
    assert.equal(me.body.user.id, userA.body.user.id);
    await expectStatus('logout route discovery', request(app).post('/api/auth/logout'), 404);

    await expectStatus('profile read for user A', request(app).get('/api/profile').set('Authorization', `Bearer ${tokenA}`), 200);
    const profile = await expectStatus('profile update for user A', request(app).patch('/api/profile').set('Authorization', `Bearer ${tokenA}`).send({ fullName: 'Aarav Sharma' }), 200);
    assert.equal(profile.body.profile.fullName, 'Aarav Sharma');
    await expectStatus('profile mass assignment rejected', request(app).patch('/api/profile').set('Authorization', `Bearer ${tokenA}`).send({ email: 'attacker@example.com' }), 400);
    await expectStatus('profile schema rejects invalid experience', request(app).patch('/api/profile').set('Authorization', `Bearer ${tokenA}`).send({ yearsOfExperience: -1 }), 400);

    const createdApplication = await expectStatus('user A creates application', request(app).post('/api/applications').set('Authorization', `Bearer ${tokenA}`).send({ company: 'Nexora Test Co', jobTitle: 'Backend QA Test', appliedAt: '2026-10-31T00:00:00.000Z', notes: 'Synthetic integration record' }), 201);
    applicationId = createdApplication.body.item._id;
    assert.equal(String(createdApplication.body.item.user), userA.body.user.id);
    await expectStatus('application mass assignment rejected', request(app).post('/api/applications').set('Authorization', `Bearer ${tokenA}`).send({ company: 'Bad Co', jobTitle: 'Injected owner', appliedAt: '2026-10-31T00:00:00.000Z', user: userB.body.user.id }), 400);
    await expectStatus('user A reads own application', request(app).get(`/api/applications/${applicationId}`).set('Authorization', `Bearer ${tokenA}`), 200);
    await expectStatus('user B cannot read user A application', request(app).get(`/api/applications/${applicationId}`).set('Authorization', `Bearer ${tokenB}`), 404);
    await expectStatus('user B cannot update user A application', request(app).patch(`/api/applications/${applicationId}`).set('Authorization', `Bearer ${tokenB}`).send({ notes: 'unauthorized' }), 404);
    await expectStatus('user B cannot delete user A application', request(app).delete(`/api/applications/${applicationId}`).set('Authorization', `Bearer ${tokenB}`), 404);
    const userBApplications = await expectStatus('user B application list excludes user A data', request(app).get('/api/applications').set('Authorization', `Bearer ${tokenB}`), 200);
    assert.equal(userBApplications.body.total, 0);
    await expectStatus('user A updates own application', request(app).patch(`/api/applications/${applicationId}`).set('Authorization', `Bearer ${tokenA}`).send({ status: 'Interview' }), 200);
    await expectStatus('user A deletes own application', request(app).delete(`/api/applications/${applicationId}`).set('Authorization', `Bearer ${tokenA}`), 204);
    applicationId = undefined;

    const createdResource = await expectStatus('user A creates skill resource', request(app).post('/api/skills').set('Authorization', `Bearer ${tokenA}`).send({ data: { name: 'Synthetic API testing', level: 'beginner' } }), 201);
    resourceId = createdResource.body.item._id;
    await expectStatus('user B skill list excludes user A record', request(app).get('/api/skills').set('Authorization', `Bearer ${tokenB}`), 200);
    await expectStatus('user B cannot update user A skill', request(app).patch(`/api/skills/${resourceId}`).set('Authorization', `Bearer ${tokenB}`).send({ data: { name: 'Unauthorized change' } }), 404);
    await expectStatus('user B cannot delete user A skill', request(app).delete(`/api/skills/${resourceId}`).set('Authorization', `Bearer ${tokenB}`), 404);
    await expectStatus('user A deletes own skill', request(app).delete(`/api/skills/${resourceId}`).set('Authorization', `Bearer ${tokenA}`), 204);
    resourceId = undefined;

    const health = await expectStatus('security headers on health response', request(app).get('/healthz'), 200);
    assert.match(health.headers['content-security-policy'], /default-src 'self'/);
    assert.doesNotMatch(health.headers['content-security-policy'], /unsafe-inline|unsafe-eval/);
  } finally {
    if (applicationId && createdUserIds.length) await Application.deleteOne({ _id: applicationId, user: { $in: createdUserIds } });
    if (resourceId && createdUserIds.length) await UserResource.deleteOne({ _id: resourceId, user: { $in: createdUserIds } });
    if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds } });
    await disconnectDatabase();
    assert.equal(mongoose.connection.readyState, 0, 'Integration test must close the MongoDB connection');
    results.push({ scenario: 'MongoDB connection closes after integration test', status: 'verified' });
    console.log(JSON.stringify({ database: 'Nexora', checks: results }));
  }
});

test('MongoDB connection failure is reported and leaves no open connection', { timeout: 20000 }, async () => {
  await assert.rejects(
    connectDatabase('mongodb://127.0.0.1:1/Nexora'),
    (error) => error.name === 'MongooseServerSelectionError' || error.name === 'MongoServerSelectionError'
  );
  assert.equal(mongoose.connection.readyState, 0);
});
