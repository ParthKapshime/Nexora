const { ApiError } = require('../utils/apiError');
const { User } = require('../models/User');
const { UserResource } = require('../models/UserResource');
const huggingFace = require('../services/ai/huggingFace');
const aiFeatures = require('../services/ai/aiFeatures');

function plainProfile(profile) {
  if (!profile) return {};
  return typeof profile.toObject === 'function' ? profile.toObject() : profile;
}

function normalizeSkill(item) {
  const data = item?.data && typeof item.data === 'object' ? item.data : {};
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) return null;
  return {
    name: name.slice(0, 100),
    category: typeof data.category === 'string' ? data.category.trim().slice(0, 80) : '',
    level: typeof data.level === 'string' ? data.level.trim().slice(0, 80) : ''
  };
}

async function loadCareerContext(req) {
  let profile = plainProfile(req.user?.profile);
  if (profile?.resume?.parseStatus === 'processed') {
    const user = await User.findById(req.user.id).select('+profile.resume.text');
    if (user?.profile) profile = plainProfile(user.profile);
  }
  const skillDocs = await UserResource.find({ user: req.user.id, kind: 'skill' }).sort({ createdAt: -1 }).lean();
  const skills = (Array.isArray(skillDocs) ? skillDocs : []).map(normalizeSkill).filter(Boolean).slice(0, 60);
  return { profile, skills };
}

function targetRoleFor(profile, override) {
  const role = (override || profile.targetRole || '').trim();
  if (!role) throw new ApiError(400, 'Set a target role in your profile before using AI career features');
  return role.slice(0, 120);
}

function requireSkills(skills) {
  if (!skills.length) throw new ApiError(400, 'Add at least one skill before using this AI career feature');
}

function educationSummary(profile) {
  if (!Array.isArray(profile.education)) return [];
  return profile.education
    .map((entry) => [entry.degree, entry.field, entry.institution].filter((value) => typeof value === 'string' && value.trim()).join(', '))
    .filter(Boolean)
    .slice(0, 5);
}

function careerContext(profile, skills, targetRole) {
  const resumeText = typeof profile.resume?.text === 'string' ? profile.resume.text.trim() : '';
  return {
    targetRole,
    yearsOfExperience: typeof profile.yearsOfExperience === 'number' ? profile.yearsOfExperience : null,
    education: educationSummary(profile),
    resumeUploaded: Boolean(profile.resume?.uploadedAt || profile.resume?.originalName),
    ...(resumeText ? { resumeText: resumeText.slice(0, 12000) } : {}),
    skills
  };
}

async function chatCompletion(req, res) {
  const { HF_TOKEN, HF_MODEL } = req.app.locals.env;
  const completion = await huggingFace.completeChat({ token: HF_TOKEN, model: HF_MODEL }, req.validated.body);
  res.json(completion);
}

async function analyzeSkills(req, res) {
  const { profile, skills } = await loadCareerContext(req);
  const targetRole = targetRoleFor(profile);
  requireSkills(skills);
  const analysis = await aiFeatures.analyzeSkills(req.app.locals.env, careerContext(profile, skills, targetRole));
  const readiness = {
    score: analysis.readinessScore,
    summary: analysis.summary,
    targetRole,
    updatedAt: new Date()
  };
  await User.findByIdAndUpdate(req.user.id, { $set: { 'profile.readiness': readiness } }, { runValidators: true });
  res.json({ analysis, readiness: { ...readiness, updatedAt: readiness.updatedAt.toISOString() } });
}

async function generateRoadmap(req, res) {
  const { profile, skills } = await loadCareerContext(req);
  const targetRole = targetRoleFor(profile);
  requireSkills(skills);
  const { weeks, hoursPerWeek } = req.validated.body;
  const roadmap = await aiFeatures.generateRoadmap(
    req.app.locals.env,
    { ...careerContext(profile, skills, targetRole), weeks, hoursPerWeek }
  );
  res.json({ roadmap });
}

async function recommendProjects(req, res) {
  const { profile, skills } = await loadCareerContext(req);
  const targetRole = targetRoleFor(profile);
  requireSkills(skills);
  const { count } = req.validated.body;
  const recommendations = await aiFeatures.recommendProjects(
    req.app.locals.env,
    { ...careerContext(profile, skills, targetRole), count }
  );
  res.json(recommendations);
}

async function startInterview(req, res) {
  const { profile, skills } = await loadCareerContext(req);
  const { type, difficulty, targetRole: requestedRole, questionCount } = req.validated.body;
  const targetRole = targetRoleFor(profile, requestedRole);
  const generated = await aiFeatures.generateInterviewQuestions(
    req.app.locals.env,
    { ...careerContext(profile, skills, targetRole), type, difficulty, questionCount }
  );
  const data = {
    title: generated.title,
    type,
    difficulty,
    targetRole,
    status: 'active',
    questions: generated.questions.slice(0, questionCount),
    answers: [],
    startedAt: new Date()
  };
  const item = await UserResource.create({ user: req.user.id, kind: 'interview', data });
  res.status(201).json({ session: { _id: item._id, ...data } });
}

async function answerInterview(req, res) {
  const { id } = req.validated.params;
  const { questionIndex, answer } = req.validated.body;
  const session = await UserResource.findOne({ _id: id, user: req.user.id, kind: 'interview' }).lean();
  if (!session) throw new ApiError(404, 'Interview session not found');
  const data = session.data && typeof session.data === 'object' ? session.data : {};
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const question = questions[questionIndex]?.question;
  if (typeof question !== 'string' || !question.trim()) throw new ApiError(400, 'Question index is out of range');
  const answers = Array.isArray(data.answers) ? data.answers : [];
  if (answers.some((entry) => entry.questionIndex === questionIndex)) {
    throw new ApiError(409, 'This interview question has already been answered');
  }
  const evaluation = await aiFeatures.evaluateInterviewAnswer(req.app.locals.env, {
    targetRole: data.targetRole || 'the target role',
    type: data.type || 'Behavioral',
    difficulty: data.difficulty || 'Intermediate',
    question,
    answer
  });
  const nextAnswers = [...answers, { questionIndex, question, answer, ...evaluation, answeredAt: new Date() }];
  const scores = nextAnswers.map((entry) => entry.score).filter((value) => typeof value === 'number');
  const averageScore = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
  const complete = nextAnswers.length >= questions.length;
  const nextData = {
    ...data,
    answers: nextAnswers,
    averageScore,
    status: complete ? 'completed' : 'active',
    ...(complete ? { completedAt: new Date() } : {})
  };
  await UserResource.findOneAndUpdate(
    { _id: id, user: req.user.id, kind: 'interview' },
    { $set: { data: nextData } },
    { runValidators: true }
  );
  res.json({
    evaluation,
    progress: { answered: nextAnswers.length, total: questions.length, averageScore, status: nextData.status },
    session: { _id: session._id, ...nextData }
  });
}

module.exports = {
  chatCompletion,
  analyzeSkills,
  generateRoadmap,
  recommendProjects,
  startInterview,
  answerInterview
};
