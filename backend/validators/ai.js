const { z, requestSchema } = require('./common');

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

module.exports = { chatCompletionSchema: requestSchema({ body }) };
