const { z, objectId, requestSchema } = require('./common');

const imageUrl = z.string().url().refine((value) => new URL(value).protocol === 'https:', 'Image URLs must use HTTPS');
const textPart = z.object({ type: z.literal('text'), text: z.string().min(1).max(20000) }).strict();
const imagePart = z.object({
  type: z.literal('image_url'),
  image_url: z.object({ url: imageUrl, detail: z.enum(['auto', 'low', 'high']).optional() }).strict()
}).strict();
const message = z.object({
  role: z.enum(['system', 'developer', 'user', 'assistant']),
  content: z.union([z.string().min(1).max(20000), z.array(z.union([textPart, imagePart])).min(1).max(10)])
}).strict();
const body = z.object({
  messages: z.array(message).min(1).max(20),
  max_tokens: z.number().int().min(1).max(2048).default(512),
  temperature: z.number().min(0).max(2).default(0.7)
}).strict();

const emptyBody = z.object({}).strict();
const targetRole = z.string().trim().min(1).max(120);

const skillAnalysisSchema = requestSchema({ body: emptyBody });

const roadmapGenerationSchema = requestSchema({
  body: z.object({
    weeks: z.number().int().min(2).max(12).default(4),
    hoursPerWeek: z.number().min(1).max(40).default(5)
  }).strict()
});

const projectRecommendationSchema = requestSchema({
  body: z.object({
    count: z.number().int().min(1).max(6).default(3)
  }).strict()
});

const interviewStartSchema = requestSchema({
  body: z.object({
    type: z.enum(['Behavioral', 'Technical', 'Situational']),
    difficulty: z.enum(['Entry', 'Intermediate', 'Advanced']),
    targetRole: targetRole.optional(),
    questionCount: z.number().int().min(3).max(8).default(5)
  }).strict()
});

const interviewAnswerSchema = requestSchema({
  body: z.object({
    questionIndex: z.number().int().min(0),
    answer: z.string().trim().min(1).max(8000)
  }).strict(),
  params: z.object({ id: objectId })
});

module.exports = {
  chatCompletionSchema: requestSchema({ body }),
  skillAnalysisSchema,
  roadmapGenerationSchema,
  projectRecommendationSchema,
  interviewStartSchema,
  interviewAnswerSchema
};
