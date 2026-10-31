const { ensureAIAvailable } = require('./ai/aiService');

function analyzeSkills() {
  ensureAIAvailable();
  throw new Error('AI provider interface is not configured');
}

module.exports = { analyzeSkills };
