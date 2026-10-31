const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().optional()
});

function loadEnv(source = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const error = new Error('Invalid environment configuration');
    error.details = parsed.error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));
    throw error;
  }
  if (parsed.data.NODE_ENV === 'production') {
    const missing = ['MONGODB_URI', 'JWT_SECRET', 'CORS_ORIGINS'].filter((key) => !source[key]);
    if (missing.length) {
      const error = new Error('Invalid environment configuration');
      error.details = missing.map((key) => ({ path: key, message: 'Required in production' }));
      throw error;
    }
    if (parsed.data.JWT_SECRET.length < 32) {
      const error = new Error('Invalid environment configuration');
      error.details = [{ path: 'JWT_SECRET', message: 'Must contain at least 32 characters' }];
      throw error;
    }
  }
  return parsed.data;
}

module.exports = { loadEnv };
