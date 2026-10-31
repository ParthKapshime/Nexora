const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { chatCompletionSchema } = require('../validators/ai');
const asyncHandler = require('../utils/asyncHandler');
const { unavailable, chatCompletion } = require('../controllers/aiController');
const router = express.Router();
router.use(requireAuth);
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'AI request limit reached. Try again later.' } });
router.get('/', (_req, res) => res.json({
  provider: 'Hugging Face Inference Providers',
  model: 'Qwen/Qwen3.8-27B:novita',
  chatCompletions: '/api/ai/chat/completions',
  method: 'POST',
  authentication: 'Bearer token required'
}));
router.post('/chat/completions', aiLimiter, validate(chatCompletionSchema), asyncHandler(chatCompletion));
router.post('/analyze-skills', unavailable);
router.post('/roadmap/generate', unavailable);
router.post('/projects/recommend', unavailable);
router.post('/interviews/start', unavailable);
router.post('/interviews/:id/answer', unavailable);
module.exports = router;
