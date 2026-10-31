const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../app');
const { User } = require('../models/User');
const { Application } = require('../models/Application');
const { UserResource } = require('../models/UserResource');

const secret = 'test-only-secret-with-at-least-32-characters';
const userId = '507f1f77bcf86cd799439011';
const otherUserId = '507f191e810c19729de860ea';
const token = jwt.sign({}, secret, { subject: userId, algorithm: 'HS256', expiresIn: '1h' });
const app = createApp({ NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000', JWT_SECRET: secret });

function mockAuthUser() {
  const original = User.findById;
  const doc = { id: userId, _id: userId, email: 'test@example.invalid', profile: { fullName: 'Test User' }, createdAt: new Date(), updatedAt: new Date() };
  User.findById = (id) => ({
    select: async () => ({ id, _id: id, email: 'test@example.invalid' }),
    then(resolve, reject) { return Promise.resolve(doc).then(resolve, reject); }
  });
  return () => { User.findById = original; };
}

test('registration hashes password and never returns the hash', async () => {
  const originalExists = User.exists;
  const originalCreate = User.create;
  let saved;
  User.exists = async () => false;
  User.create = async (input) => {
    saved = input;
    return { id: userId, email: input.email, profile: {}, createdAt: new Date(), updatedAt: new Date() };
  };
  try {
    const response = await request(app).post('/api/auth/register')
      .send({ email: 'TEST@example.invalid', password: 'a-long-test-password' }).expect(201);
    assert.equal(saved.email, 'test@example.invalid');
    assert.notEqual(saved.passwordHash, 'a-long-test-password');
    assert.equal(response.body.user.passwordHash, undefined);
    assert.equal(response.body.user.email, 'test@example.invalid');
    assert.equal(response.body.tokenType, 'Bearer');
  } finally {
    User.exists = originalExists;
    User.create = originalCreate;
  }
});

test('profile get returns only the authenticated user’s profile', async () => {
  const restoreUser = mockAuthUser();
  try {
    const response = await request(app).get('/api/profile').set('Authorization', `Bearer ${token}`).expect(200);
    assert.deepEqual(response.body.profile, { fullName: 'Test User' });
  } finally { restoreUser(); }
});

test('profile update uses only whitelisted dotted profile fields', async () => {
  const restoreUser = mockAuthUser();
  const originalUpdate = User.findByIdAndUpdate;
  let filter;
  let update;
  User.findByIdAndUpdate = async (id, change) => {
    filter = id;
    update = change;
    return { id: userId, email: 'test@example.invalid', profile: { fullName: 'New Name' } };
  };
  try {
    const response = await request(app).patch('/api/profile').set('Authorization', `Bearer ${token}`).send({ fullName: 'New Name' }).expect(200);
    assert.equal(filter, userId);
    assert.deepEqual(update, { $set: { 'profile.fullName': 'New Name' } });
    assert.deepEqual(response.body.profile, { fullName: 'New Name' });
  } finally {
    restoreUser();
    User.findByIdAndUpdate = originalUpdate;
  }
});

test('current-account route returns identity without secrets', async () => {
  const restoreUser = mockAuthUser();
  try {
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    assert.deepEqual(response.body, { user: { id: userId, email: 'test@example.invalid' } });
  } finally { restoreUser(); }
});

test('application list query is constrained to authenticated owner', async () => {
  const restoreUser = mockAuthUser();
  const originalFind = Application.find;
  const originalCount = Application.countDocuments;
  let findFilter;
  let countFilter;
  Application.find = (filter) => {
    findFilter = filter;
    return { sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => [] };
  };
  Application.countDocuments = async (filter) => { countFilter = filter; return 0; };
  try {
    await request(app).get('/api/applications').set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(String(findFilter.user), userId);
    assert.equal(String(countFilter.user), userId);
  } finally {
    restoreUser();
    Application.find = originalFind;
    Application.countDocuments = originalCount;
  }
});

test('application lookup never returns another user’s record', async () => {
  const restoreUser = mockAuthUser();
  const originalFindOne = Application.findOne;
  let filter;
  Application.findOne = (query) => {
    filter = query;
    return { lean: async () => null };
  };
  try {
    const response = await request(app).get('/api/applications/507f1f77bcf86cd799439012')
      .set('Authorization', `Bearer ${token}`).expect(404);
    assert.equal(filter.user, userId);
    assert.equal(response.body.error, 'Application not found');
    assert.notEqual(filter.user, otherUserId);
  } finally {
    restoreUser();
    Application.findOne = originalFindOne;
  }
});

test('application creation assigns the authenticated user as owner', async () => {
  const restoreUser = mockAuthUser();
  const originalCreate = Application.create;
  let saved;
  Application.create = async (input) => { saved = input; return { ...input, id: '507f1f77bcf86cd799439012' }; };
  try {
    const response = await request(app).post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'Example Co', jobTitle: 'Engineer', appliedAt: '2026-10-31', user: otherUserId })
      .expect(400);
    assert.equal(response.body.error, 'Request validation failed');
    assert.equal(saved, undefined);
    const created = await request(app).post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'Example Co', jobTitle: 'Engineer', appliedAt: '2026-10-31' })
      .expect(201);
    assert.equal(String(saved.user), userId);
    assert.equal(created.body.item.user, userId);
  } finally {
    restoreUser();
    Application.create = originalCreate;
  }
});

test('application rejects malformed IDs before database lookup', async () => {
  const restoreUser = mockAuthUser();
  const originalFindOne = Application.findOne;
  Application.findOne = () => { throw new Error('Database lookup should not run'); };
  try {
    await request(app).get('/api/applications/not-an-id').set('Authorization', `Bearer ${token}`).expect(400);
  } finally {
    restoreUser();
    Application.findOne = originalFindOne;
  }
});

test('application update and delete remain owner-scoped', async () => {
  const restoreUser = mockAuthUser();
  const originalUpdate = Application.findOneAndUpdate;
  const originalDelete = Application.deleteOne;
  let updateFilter;
  let deleteFilter;
  Application.findOneAndUpdate = async (filter, update) => { updateFilter = filter; return { ...update.$set, user: filter.user }; };
  Application.deleteOne = async (filter) => { deleteFilter = filter; return { deletedCount: 1 }; };
  try {
    await request(app).patch('/api/applications/507f1f77bcf86cd799439012')
      .set('Authorization', `Bearer ${token}`).send({ status: 'Interview' }).expect(200);
    await request(app).delete('/api/applications/507f1f77bcf86cd799439012')
      .set('Authorization', `Bearer ${token}`).expect(204);
    assert.equal(updateFilter.user, userId);
    assert.equal(deleteFilter.user, userId);
  } finally {
    restoreUser();
    Application.findOneAndUpdate = originalUpdate;
    Application.deleteOne = originalDelete;
  }
});

test('skills, roadmaps, projects, and interview records are CRUD-scoped to the owner', async () => {
  const restoreUser = mockAuthUser();
  const originals = { find: UserResource.find, create: UserResource.create, update: UserResource.findOneAndUpdate, remove: UserResource.deleteOne };
  const filters = [];
  UserResource.find = (filter) => { filters.push(filter); return { sort() { return this; }, lean: async () => [] }; };
  UserResource.create = async (data) => ({ ...data, id: '507f1f77bcf86cd799439012' });
  UserResource.findOneAndUpdate = async (filter, update) => { filters.push(filter); return { ...update.$set, _id: filter._id, kind: filter.kind }; };
  UserResource.deleteOne = async (filter) => { filters.push(filter); return { deletedCount: 1 }; };
  try {
    for (const resource of ['skills', 'roadmaps', 'projects', 'interviews']) {
      await request(app).get(`/api/${resource}`).set('Authorization', `Bearer ${token}`).expect(200);
      await request(app).post(`/api/${resource}`).set('Authorization', `Bearer ${token}`).send({ data: { title: 'User supplied' } }).expect(201);
      await request(app).patch(`/api/${resource}/507f1f77bcf86cd799439012`).set('Authorization', `Bearer ${token}`).send({ data: { title: 'Updated by user' } }).expect(200);
      await request(app).delete(`/api/${resource}/507f1f77bcf86cd799439012`).set('Authorization', `Bearer ${token}`).expect(204);
    }
    assert.ok(filters.every((filter) => String(filter.user) === userId));
  } finally {
    restoreUser();
    UserResource.find = originals.find;
    UserResource.create = originals.create;
    UserResource.findOneAndUpdate = originals.update;
    UserResource.deleteOne = originals.remove;
  }
});

test('resume endpoint rejects non-PDF file types', async () => {
  const restoreUser = mockAuthUser();
  try {
    const response = await request(app).post('/api/profile/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('plain text'), { filename: 'resume.txt', contentType: 'text/plain' })
      .expect(400);
    assert.match(response.body.error, /PDF/);
  } finally {
    restoreUser();
  }
});

test('resume endpoint checks PDF file contents, not only the extension', async () => {
  const uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-upload-test-'));
  const isolatedApp = createApp({ NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000', JWT_SECRET: secret, UPLOAD_DIR: uploadDirectory });
  const restoreUser = mockAuthUser();
  try {
    const response = await request(isolatedApp).post('/api/profile/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('not a PDF'), { filename: 'resume.pdf', contentType: 'application/pdf' })
      .expect(400);
    assert.equal(response.body.error, 'Uploaded file is not a valid PDF');
    assert.deepEqual(await fs.readdir(uploadDirectory), []);
  } finally {
    restoreUser();
    await fs.rmdir(uploadDirectory).catch(() => {});
  }
});

test('valid PDF resume upload stores a private file and returns safe metadata', async () => {
  const uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-upload-test-'));
  const isolatedApp = createApp({ NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000', JWT_SECRET: secret, UPLOAD_DIR: uploadDirectory });
  const originalFindById = User.findById;
  let calls = 0;
  const doc = { id: userId, profile: {}, async save() {} };
  User.findById = () => ({ select: async () => (++calls === 1 ? { id: userId, email: 'test@example.invalid' } : doc) });
  try {
    const response = await request(isolatedApp).post('/api/profile/resume')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('%PDF-1.7\nminimal test document\n%%EOF'), { filename: 'resume.pdf', contentType: 'application/pdf' })
      .expect(201);
    assert.equal(response.body.resume.originalName, 'resume.pdf');
    assert.equal(response.body.resume.size, 36);
    assert.equal(response.body.resume.storedName, undefined);
    const names = await fs.readdir(uploadDirectory);
    assert.equal(names.length, 1);
    assert.match(names[0], /^[a-f\d-]+\.pdf$/i);
  } finally {
    User.findById = originalFindById;
    for (const name of await fs.readdir(uploadDirectory)) await fs.unlink(path.join(uploadDirectory, name));
    await fs.rmdir(uploadDirectory).catch(() => {});
  }
});

test('resume deletion is scoped to the authenticated user and removes stored file', async () => {
  const uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'nexora-upload-test-'));
  const storedName = '123e4567-e89b-12d3-a456-426614174000.pdf';
  await fs.writeFile(path.join(uploadDirectory, storedName), '%PDF-1.7\n%%EOF');
  const isolatedApp = createApp({ NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000', JWT_SECRET: secret, UPLOAD_DIR: uploadDirectory });
  const originalFindById = User.findById;
  let calls = 0;
  const doc = { id: userId, profile: { resume: { storedName } }, async save() { this.profile.resume = undefined; } };
  User.findById = () => ({ select: async () => (++calls === 1 ? { id: userId, email: 'test@example.invalid' } : doc) });
  try {
    await request(isolatedApp).delete('/api/profile/resume').set('Authorization', `Bearer ${token}`).expect(204);
    assert.deepEqual(await fs.readdir(uploadDirectory), []);
  } finally {
    User.findById = originalFindById;
    for (const name of await fs.readdir(uploadDirectory)) await fs.unlink(path.join(uploadDirectory, name));
    await fs.rmdir(uploadDirectory).catch(() => {});
  }
});

test('disabled AI action returns controlled 503 for an authenticated user', async () => {
  const restoreUser = mockAuthUser();
  try {
    const response = await request(app).post('/api/ai/analyze-skills')
      .set('Authorization', `Bearer ${token}`).send({ targetRole: 'ignored' }).expect(503);
    assert.equal(response.body.error, 'AI functionality is currently unavailable');
  } finally {
    restoreUser();
  }
});

test('all AI-dependent endpoints remain unavailable and do not generate output', async () => {
  const restoreUser = mockAuthUser();
  try {
    const actions = [
      ['/api/ai/analyze-skills', {}], ['/api/ai/roadmap/generate', {}], ['/api/ai/projects/recommend', {}],
      ['/api/ai/interviews/start', {}], ['/api/ai/interviews/507f1f77bcf86cd799439012/answer', { answer: 'test' }]
    ];
    for (const [path, body] of actions) {
      const response = await request(app).post(path).set('Authorization', `Bearer ${token}`).send(body).expect(503);
      assert.deepEqual(response.body.error, 'AI functionality is currently unavailable');
    }
  } finally { restoreUser(); }
});
