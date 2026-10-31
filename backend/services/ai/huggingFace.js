const OpenAI = require('openai');
const { ApiError } = require('../../utils/apiError');
const { ensureAIAvailable } = require('./aiService');

const ROUTER_URL = 'https://router.huggingface.co/v1';

function createClient(token) {
  ensureAIAvailable({ HF_TOKEN: token });
  return new OpenAI({ baseURL: ROUTER_URL, apiKey: token, timeout: 30000, maxRetries: 0 });
}

function mapProviderError(error) {
  if (error instanceof OpenAI.APIConnectionTimeoutError || error.name === 'APIConnectionTimeoutError') {
    return new ApiError(504, 'Hugging Face request timed out');
  }
  if (error instanceof OpenAI.APIConnectionError || error.code === 'ECONNREFUSED') {
    return new ApiError(503, 'Hugging Face is temporarily unavailable');
  }
  if (error.status === 401 || error.status === 403) {
    return new ApiError(503, 'Hugging Face authentication failed');
  }
  if (error.status === 429) return new ApiError(429, 'Hugging Face rate limit reached');
  return new ApiError(502, 'Hugging Face request failed');
}

async function completeChat({ token, model }, input) {
  const client = createClient(token);
  try {
    return await client.chat.completions.create({
      model,
      messages: input.messages,
      max_tokens: input.max_tokens,
      temperature: input.temperature
    });
  } catch (error) {
    throw mapProviderError(error);
  }
}

module.exports = { ROUTER_URL, createClient, mapProviderError, completeChat };
