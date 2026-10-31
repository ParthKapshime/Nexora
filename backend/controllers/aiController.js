const { ensureAIAvailable } = require('../services/ai/aiService');

function unavailable(_req, _res, next) {
  try { ensureAIAvailable(); } catch (error) { next(error); }
}

module.exports = { unavailable };
