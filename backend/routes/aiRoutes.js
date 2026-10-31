const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  chatCompletionSchema,
  skillAnalysisSchema,
  roadmapGenerationSchema,
  projectRecommendationSchema,
  interviewStartSchema,
  interviewAnswerSchema
} = require('../validators/ai');
const asyncHandler = require('../utils/asyncHandler');
const {
  chatCompletion,
  analyzeSkills,
  generateRoadmap,
  recommendProjects,
  startInterview,
  answerInterview
} = require('../controllers/aiController');
const router = express.Router();
router.use(requireAuth);
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'AI request limit reached. Try again later.' } });
router.use(aiLimiter);
router.get('/', (_req, res) => res.json({
  provider: 'Hugging Face Inference Providers',
  model: 'Qwen/Qwen3.8-27B:novita',
  chatCompletions: '/api/ai/chat/completions',
  method: 'POST',
  authentication: 'Bearer token required',
  features: {
    skillAnalysis: '/api/ai/analyze-skills',
    roadmapGeneration: '/api/ai/roadmap/generate',
    projectRecommendations: '/api/ai/projects/recommend',
    interviewStart: '/api/ai/interviews/start',
    interviewAnswer: '/api/ai/interviews/:id/answer'
  }
}));
router.post('/chat/completions', validate(chatCompletionSchema), asyncHandler(chatCompletion));
router.post('/analyze-skills', validate(skillAnalysisSchema), asyncHandler(analyzeSkills));
router.post('/roadmap/generate', validate(roadmapGenerationSchema), asyncHandler(generateRoadmap));
router.post('/projects/recommend', validate(projectRecommendationSchema), asyncHandler(recommendProjects));
router.post('/interviews/start', validate(interviewStartSchema), asyncHandler(startInterview));
router.post('/interviews/:id/answer', validate(interviewAnswerSchema), asyncHandler(answerInterview));
module.exports = router;
