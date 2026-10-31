const { z } = require('zod');
const { ApiError } = require('../../utils/apiError');
const huggingFace = require('./huggingFace');
const prompts = require('./prompts');

const roundedScore = z.number().finite().min(0).max(100).transform((value) => Math.round(value));

const skillAnalysisSchema = z.object({
  readinessScore: roundedScore,
  summary: z.string().trim().min(1).max(1600),
  categories: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    score: roundedScore,
    skills: z.array(z.string().trim().min(1).max(100)).max(20)
  })).min(1).max(6),
  strengths: z.array(z.object({
    skill: z.string().trim().min(1).max(100),
    evidence: z.string().trim().min(1).max(500)
  })).max(8),
  gaps: z.array(z.object({
    skill: z.string().trim().min(1).max(100),
    priority: z.enum(['high', 'medium', 'low']),
    recommendation: z.string().trim().min(1).max(500)
  })).max(8),
  nextSteps: z.array(z.string().trim().min(1).max(500)).min(1).max(6)
});

const roadmapSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1000),
  weeks: z.array(z.object({
    week: z.number().int().min(1).max(52),
    focus: z.string().trim().min(1).max(200),
    tasks: z.array(z.object({
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().min(1).max(800),
      resource: z.string().trim().min(1).max(300)
    })).min(1).max(6)
  })).min(1).max(12)
});

const projectRecommendationsSchema = z.object({
  projects: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1200),
    technologies: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    skillsDeveloped: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
    firstSteps: z.array(z.string().trim().min(1).max(400)).max(6)
  })).min(1).max(6)
});

const interviewQuestionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  questions: z.array(z.object({
    question: z.string().trim().min(1).max(600),
    focus: z.string().trim().min(1).max(300)
  })).min(3).max(8)
});

const interviewEvaluationSchema = z.object({
  score: roundedScore,
  verdict: z.string().trim().min(1).max(800),
  strengths: z.array(z.string().trim().min(1).max(400)).max(8),
  improvements: z.array(z.string().trim().min(1).max(400)).max(8),
  suggestedAnswer: z.string().trim().min(1).max(4000)
});

function completionText(completion) {
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('\n');
  }
  return '';
}

function parseJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

async function runStructured(env, { messages, schema, temperature = 0.5, maxTokens = 1800 }) {
  const requestMessages = [...messages];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const completion = await huggingFace.completeChat(
      { token: env.HF_TOKEN, model: env.HF_MODEL },
      {
        messages: requestMessages,
        max_tokens: maxTokens,
        temperature: attempt === 0 ? temperature : 0
      }
    );
    const parsed = parseJsonObject(completionText(completion));
    if (parsed !== undefined) {
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
    }
    if (attempt === 0) {
      requestMessages.push({
        role: 'user',
        content: 'Your previous response was not valid JSON for the required shape. Return only one valid JSON object matching the requested fields, with no markdown or extra text.'
      });
    }
  }
  throw new ApiError(502, 'Hugging Face returned an unreadable AI response');
}

function analyzeSkills(env, context) {
  return runStructured(env, {
    messages: prompts.skillAnalysisMessages(context),
    schema: skillAnalysisSchema,
    temperature: 0.35,
    maxTokens: 1800
  });
}

function generateRoadmap(env, context) {
  return runStructured(env, {
    messages: prompts.roadmapMessages(context),
    schema: roadmapSchema,
    temperature: 0.55,
    maxTokens: 2000
  });
}

function recommendProjects(env, context) {
  return runStructured(env, {
    messages: prompts.projectMessages(context),
    schema: projectRecommendationsSchema,
    temperature: 0.65,
    maxTokens: 1800
  });
}

function generateInterviewQuestions(env, context) {
  return runStructured(env, {
    messages: prompts.interviewQuestionMessages(context),
    schema: interviewQuestionSchema,
    temperature: 0.65,
    maxTokens: 1400
  });
}

function evaluateInterviewAnswer(env, context) {
  return runStructured(env, {
    messages: prompts.interviewEvaluationMessages(context),
    schema: interviewEvaluationSchema,
    temperature: 0.3,
    maxTokens: 1600
  });
}

module.exports = {
  completionText,
  parseJsonObject,
  analyzeSkills,
  generateRoadmap,
  recommendProjects,
  generateInterviewQuestions,
  evaluateInterviewAnswer
};
