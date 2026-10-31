const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const { loadEnv } = require('./config/env');
const { spec } = require('./config/openapi');
const { requestId } = require('./middleware/requestId');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { ApiError } = require('./utils/apiError');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const { resourceRouter } = require('./routes/resourceRoutes');
const aiRoutes = require('./routes/aiRoutes');

function createApp(env = loadEnv()) {
  const app = express();
  app.disable('x-powered-by');
  app.locals.env = env;
  const allowedOrigins = new Set(env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean));

  app.use(requestId);
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], scriptSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] } },
    hsts: env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true } : false,
    crossOriginResourcePolicy: { policy: 'same-site' }
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new ApiError(403, 'Origin is not allowed'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600
  }));
  app.use(express.json({ limit: '100kb', strict: true }));
  app.use(mongoSanitize({ replaceWith: '_' }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.get('/readyz', (_req, res) => {
    const ready = require('mongoose').connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', database: ready ? 'connected' : 'disconnected' });
  });
  app.get('/openapi.json', (_req, res) => res.json(spec));
  app.use('/api-docs', (req, res, next) => { res.removeHeader('Content-Security-Policy'); next(); }, swaggerUi.serve, swaggerUi.setup(spec, { explorer: false }));
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/skills', resourceRouter('skill'));
  app.use('/api/roadmaps', resourceRouter('roadmap'));
  app.use('/api/projects', resourceRouter('project'));
  app.use('/api/interviews', resourceRouter('interview'));
  app.use('/api/ai', aiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
