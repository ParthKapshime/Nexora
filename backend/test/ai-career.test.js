const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../app');
const { User } = require('../models/User');
const { UserResource } = require('../models/UserResource');
const huggingFace = require('../services/ai/huggingFace');

const secret = 'test-only-secret-with-at-least-32-characters';
const userId = '507f1f77bcf86cd799439011';
const otherUserId = '507f191e810c19729de860ea';
const sessionId = '507f1f77bcf86cd799439012';
const token = jwt.sign({}, secret, { subject: userId, algorithm: 'HS256', expiresIn: 300 });
const env = {
  NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000',
  JWT_SECRET: secret, HF_TOKEN: 'test-hf-token', HF_MODEL: 'test/model'
};
const app = createApp(env);

const profile = {
  fullName: 'Test User',
  targetRole: 'UX designer',
  yearsOfExperience: 2,
  education: [{ degree: 'B.Des', field: 'Design', institution: 'Example Institute' }],
  resume: { originalName: 'resume.pdf', uploadedAt: new Date('2026-10-01T00:00:00.000Z') }
};
const skills = [
  { _id: 'skill-1', data: { name: 'User research', category: 'Design', level: 'Practicing' } },
  { _id: 'skill-2', data: { name: 'Figma', category: 'Tools', level: 'Intermediate' } }
];

function mockUser(profileData = profile) {
  const original = User.findById;
  User.findById = () => ({
    select: async () => ({ id: userId, _id: userId, email: 'test@example.invalid', profile: profileData })
  });
  return () => { User.findById = original; };
}

function mockSkills(items = skills) {
  const original = UserResource.find;
  UserResource.find = (filter) => ({
    filter,
    sort() { return this; },
    lean: async () => items
  });
  return () => { UserResource.find = original; };
}

function mockProvider(content) {
  const original = huggingFace.completeChat;
  const calls = [];
  huggingFace.completeChat = async (config, input) => {
    calls.push({ config, input });
    const value = typeof content === 'function' ? content(calls.length) : content;
    return { choices: [{ message: { content: typeof value === 'string' ? value : JSON.stringify(value) } }] };
  };
  return { calls, restore() { huggingFace.completeChat = original; } };
}

function withMocks({ userProfile = profile, skillItems = skills, provider, update } = {}) {
  const restores = [mockUser(userProfile), mockSkills(skillItems)];
  if (provider) restores.push(provider.restore);
  let restoreUpdate;
  if (update) {
    const original = User.findByIdAndUpdate;
    User.findByIdAndUpdate = update;
    restoreUpdate = () => { User.findByIdAndUpdate = original; };
    restores.push(restoreUpdate);
  }
  return () => restores.forEach((restore) => restore());
}

const analysisFixture = {
  readinessScore: 68,
  summary: 'You have a solid research foundation for UX design and need more end-to-end product work.',
  categories: [{ name: 'Design', score: 70, skills: ['User research', 'Figma'] }],
  strengths: [{ skill: 'User research', evidence: 'Directly relevant to UX discovery work.' }],
  gaps: [{ skill: 'Prototyping', priority: 'high', recommendation: 'Practice a complete interactive prototype.' }],
  nextSteps: ['Build one case study from research to prototype.']
};

test('skill analysis returns a readiness estimate and stores it on the profile', async () => {
  const provider = mockProvider(analysisFixture);
  let savedUpdate;
  const restore = withMocks({
    provider,
    update: async (_id, update) => { savedUpdate = update; return {}; }
  });
  try {
    const response = await request(app).post('/api/ai/analyze-skills')
      .set('Authorization', `Bearer ${token}`).send({}).expect(200);
    assert.equal(response.body.analysis.readinessScore, 68);
    assert.equal(response.body.readiness.score, 68);
    assert.equal(response.body.readiness.targetRole, 'UX designer');
    assert.equal(savedUpdate.$set['profile.readiness'].score, 68);
    assert.equal(provider.calls.length, 1);
    assert.equal(provider.calls[0].config.token, 'test-hf-token');
    const prompt = provider.calls[0].input.messages.map((message) => message.content).join('\n');
    assert.match(prompt, /UX designer/);
    assert.match(prompt, /User research/);
    assert.doesNotMatch(prompt, /test@example\.invalid/);
    assert.doesNotMatch(prompt, /resume\.pdf/);
  } finally { restore(); }
});

test('skill analysis includes extracted resume text when available', async () => {
  const provider = mockProvider(analysisFixture);
  const resumeProfile = {
    ...profile,
    resume: {
      originalName: 'resume.pdf',
      uploadedAt: new Date('2026-10-01T00:00:00.000Z'),
      parseStatus: 'processed',
      pageCount: 1,
      text: 'Led a usability study and built an interactive Figma prototype for a mobile onboarding flow.'
    }
  };
  const restore = withMocks({
    userProfile: resumeProfile,
    provider,
    update: async () => ({})
  });
  try {
    await request(app).post('/api/ai/analyze-skills')
      .set('Authorization', `Bearer ${token}`).send({}).expect(200);
    const prompt = provider.calls[0].input.messages.map((message) => message.content).join('\n');
    assert.match(prompt, /usability study/);
    assert.match(prompt, /interactive Figma prototype/);
    assert.doesNotMatch(prompt, /test@example\.invalid/);
    assert.doesNotMatch(prompt, /resume\.pdf/);
  } finally { restore(); }
});

test('roadmap generation returns weekly milestones for the saved profile', async () => {
  const provider = mockProvider({
    title: 'UX portfolio roadmap',
    summary: 'A focused plan for end-to-end UX work.',
    weeks: [{
      week: 1,
      focus: 'Discovery practice',
      tasks: [{ title: 'Run a small study', description: 'Practice research synthesis.', resource: 'Local design community' }]
    }]
  });
  const restore = withMocks({ provider });
  try {
    const response = await request(app).post('/api/ai/roadmap/generate')
      .set('Authorization', `Bearer ${token}`).send({ weeks: 3, hoursPerWeek: 6 }).expect(200);
    assert.equal(response.body.roadmap.weeks[0].tasks[0].title, 'Run a small study');
    const prompt = provider.calls[0].input.messages.map((message) => message.content).join('\n');
    assert.match(prompt, /3-week/);
    assert.match(prompt, /6 study hours/);
  } finally { restore(); }
});

test('project recommendations return saved-profile-based portfolio ideas', async () => {
  const provider = mockProvider({
    projects: [{
      title: 'Research-to-prototype case study',
      description: 'Design and document a complete product flow.',
      technologies: ['Figma'],
      difficulty: 'Intermediate',
      skillsDeveloped: ['Prototyping', 'User research'],
      firstSteps: ['Choose a small workflow to improve.']
    }]
  });
  const restore = withMocks({ provider });
  try {
    const response = await request(app).post('/api/ai/projects/recommend')
      .set('Authorization', `Bearer ${token}`).send({ count: 2 }).expect(200);
    assert.equal(response.body.projects.length, 1);
    assert.equal(response.body.projects[0].difficulty, 'Intermediate');
    assert.match(provider.calls[0].input.messages.map((message) => message.content).join('\n'), /exactly 2 portfolio projects/);
  } finally { restore(); }
});

test('starting a mock interview generates questions and stores an owner-scoped session', async () => {
  const provider = mockProvider({
    title: 'UX behavioral practice',
    questions: [
      { question: 'Tell me about a research project.', focus: 'Communication' },
      { question: 'How do you handle feedback?', focus: 'Collaboration' },
      { question: 'Describe a design trade-off.', focus: 'Judgement' }
    ]
  });
  const originalCreate = UserResource.create;
  let saved;
  UserResource.create = async (input) => { saved = input; return { _id: sessionId, ...input }; };
  const restore = withMocks({ provider });
  try {
    const response = await request(app).post('/api/ai/interviews/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'Behavioral', difficulty: 'Intermediate', questionCount: 3 })
      .expect(201);
    assert.equal(response.body.session.questions.length, 3);
    assert.equal(saved.kind, 'interview');
    assert.equal(String(saved.user), userId);
    assert.equal(saved.data.status, 'active');
    assert.equal(saved.data.targetRole, 'UX designer');
  } finally {
    restore();
    UserResource.create = originalCreate;
  }
});

test('answering an interview question returns feedback and records progress', async () => {
  const provider = mockProvider({
    score: 78,
    verdict: 'A clear answer with a useful example.',
    strengths: ['Specific example'],
    improvements: ['Add the measurable outcome'],
    suggestedAnswer: 'A stronger answer would describe the result.'
  });
  const originalFindOne = UserResource.findOne;
  const originalUpdate = UserResource.findOneAndUpdate;
  let answerFilter;
  let answerUpdate;
  UserResource.findOne = (filter) => {
    assert.equal(String(filter.user), userId);
    return {
      lean: async () => ({
        _id: sessionId,
        data: {
          title: 'UX behavioral practice',
          type: 'Behavioral',
          difficulty: 'Intermediate',
          targetRole: 'UX designer',
          status: 'active',
          questions: [{ question: 'Tell me about a research project.', focus: 'Communication' }, { question: 'How do you handle feedback?', focus: 'Collaboration' }],
          answers: []
        }
      })
    };
  };
  UserResource.findOneAndUpdate = async (filter, update) => { answerFilter = filter; answerUpdate = update; return {}; };
  const restore = withMocks({ provider });
  try {
    const response = await request(app).post(`/api/ai/interviews/${sessionId}/answer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questionIndex: 0, answer: 'I ran a small usability study and synthesized the findings.' })
      .expect(200);
    assert.equal(response.body.evaluation.score, 78);
    assert.deepEqual(response.body.progress, { answered: 1, total: 2, averageScore: 78, status: 'active' });
    assert.equal(String(answerFilter.user), userId);
    assert.equal(answerUpdate.$set.data.answers.length, 1);
    assert.equal(answerUpdate.$set.data.answers[0].score, 78);
    const prompt = provider.calls[0].input.messages.map((message) => message.content).join('\n');
    assert.match(prompt, /usability study/);
    assert.match(prompt, /UX designer/);
  } finally {
    restore();
    UserResource.findOne = originalFindOne;
    UserResource.findOneAndUpdate = originalUpdate;
  }
});

test('interview answers are owner-scoped and cannot be answered twice', async () => {
  const originalFindOne = UserResource.findOne;
  const provider = mockProvider({ score: 10 });
  const restore = withMocks({ provider });
  try {
    UserResource.findOne = (filter) => ({ lean: async () => { assert.equal(String(filter.user), userId); return null; } });
    await request(app).post(`/api/ai/interviews/${sessionId}/answer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questionIndex: 0, answer: 'An answer' })
      .expect(404);
    assert.equal(provider.calls.length, 0);

    UserResource.findOne = () => ({
      lean: async () => ({
        _id: sessionId,
        data: { questions: [{ question: 'Question one' }], answers: [{ questionIndex: 0, score: 70 }] }
      })
    });
    const duplicate = await request(app).post(`/api/ai/interviews/${sessionId}/answer`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questionIndex: 0, answer: 'Another answer' })
      .expect(409);
    assert.equal(duplicate.body.error, 'This interview question has already been answered');
    assert.equal(provider.calls.length, 0);
  } finally {
    restore();
    UserResource.findOne = originalFindOne;
  }
});

test('career AI requests require a target role and at least one saved skill', async () => {
  const noRoleProvider = mockProvider(analysisFixture);
  const restoreNoRole = withMocks({ userProfile: { fullName: 'No Role' }, provider: noRoleProvider });
  try {
    const response = await request(app).post('/api/ai/analyze-skills')
      .set('Authorization', `Bearer ${token}`).send({}).expect(400);
    assert.match(response.body.error, /target role/i);
    assert.equal(noRoleProvider.calls.length, 0);
  } finally { restoreNoRole(); }

  const noSkillsProvider = mockProvider(analysisFixture);
  const restoreNoSkills = withMocks({ skillItems: [], provider: noSkillsProvider });
  try {
    const response = await request(app).post('/api/ai/analyze-skills')
      .set('Authorization', `Bearer ${token}`).send({}).expect(400);
    assert.match(response.body.error, /at least one skill/i);
    assert.equal(noSkillsProvider.calls.length, 0);
  } finally { restoreNoSkills(); }
});

test('career AI requests return a controlled 503 when the provider is not configured', async () => {
  const unconfiguredApp = createApp({
    NODE_ENV: 'test', PORT: 5000, CORS_ORIGINS: 'http://localhost:3000', JWT_SECRET: secret
  });
  const restore = withMocks();
  try {
    const response = await request(unconfiguredApp).post('/api/ai/analyze-skills')
      .set('Authorization', `Bearer ${token}`).send({}).expect(503);
    assert.equal(response.body.error, 'Hugging Face AI is not configured');
  } finally { restore(); }
});

test('unreadable provider output is retried once and reported safely', async () => {
  const provider = mockProvider('This is not JSON.');
  const restore = withMocks({ provider });
  try {
    const response = await request(app).post('/api/ai/analyze-skills')
      .set('Authorization', `Bearer ${token}`).send({}).expect(502);
    assert.equal(response.body.error, 'Hugging Face returned an unreadable AI response');
    assert.equal(provider.calls.length, 2);
  } finally { restore(); }
});

test('AI routes are limited to the authenticated user session data', async () => {
  assert.notEqual(userId, otherUserId);
  const provider = mockProvider(analysisFixture);
  let skillsFilter;
  const originalFind = UserResource.find;
  const originalUserFind = User.findById;
  const originalUpdate = User.findByIdAndUpdate;
  User.findById = () => ({ select: async () => ({ id: userId, _id: userId, email: 'test@example.invalid', profile }) });
  User.findByIdAndUpdate = async () => ({});
  UserResource.find = (filter) => {
    skillsFilter = filter;
    return { sort() { return this; }, lean: async () => skills };
  };
  try {
    await request(app).post('/api/ai/analyze-skills')
      .set('Authorization', `Bearer ${token}`).send({}).expect(200);
    assert.equal(String(skillsFilter.user), userId);
    assert.equal(skillsFilter.kind, 'skill');
    assert.notEqual(String(skillsFilter.user), otherUserId);
  } finally {
    provider.restore();
    User.findById = originalUserFind;
    User.findByIdAndUpdate = originalUpdate;
    UserResource.find = originalFind;
  }
});
