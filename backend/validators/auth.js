const { z } = require('zod');
const authInput = z.object({
  email: z.string().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes')
}).strict();
const authSchema = z.object({ body: authInput, params: z.object({}), query: z.object({}) });
module.exports = { authSchema };
