const { ApiError } = require('../utils/apiError');
const aiService = require('../services/ai/huggingFace');

function unavailable(_req, _res, next) {
  next(new ApiError(503, 'AI functionality is currently unavailable'));
}

async function chatCompletion(req, res) {
  const { HF_TOKEN, HF_MODEL } = req.app.locals.env;
  const completion = await aiService.completeChat({ token: HF_TOKEN, model: HF_MODEL }, req.validated.body);
  res.json(completion);
}

module.exports = { unavailable, chatCompletion };
