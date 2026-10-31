const { ApiError } = require('../../utils/apiError');

function isAIAvailable() {
  return false;
}

function ensureAIAvailable() {
  if (!isAIAvailable()) throw new ApiError(503, 'AI functionality is currently unavailable');
}

module.exports = { isAIAvailable, ensureAIAvailable };
