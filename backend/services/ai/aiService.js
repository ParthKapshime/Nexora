const { ApiError } = require('../../utils/apiError');

function isAIAvailable(env = process.env) {
  return Boolean(env.HF_TOKEN);
}

function ensureAIAvailable(env = process.env) {
  if (!isAIAvailable(env)) throw new ApiError(503, 'Hugging Face AI is not configured');
}

module.exports = { isAIAvailable, ensureAIAvailable };
