const { ZodError } = require('zod');
const { ApiError } = require('../utils/apiError');

function notFound(_req, _res, next) {
  next(new ApiError(404, 'Route not found'));
}

function errorHandler(error, req, res, _next) {
  const status = error instanceof ApiError ? error.status
    : error instanceof ZodError ? 400
      : error.name === 'MulterError' ? (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
        : error.name === 'ValidationError' || error.name === 'CastError' ? 400
          : error.code === 11000 ? 409
        : error.type === 'entity.parse.failed' ? 400
          : error.type === 'entity.too.large' ? 413
        : error.message === 'Only PDF resumes are accepted' ? 400 : 500;
  const expectedApiError = error instanceof ApiError;
  const message = error.type === 'entity.parse.failed' ? 'Invalid JSON body'
    : error.type === 'entity.too.large' || error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE' ? 'Request size limit exceeded'
      : status >= 500 && !expectedApiError ? 'Internal server error' : error.message;
  if (status >= 500 && !expectedApiError) {
    console.error(JSON.stringify({
      level: 'error',
      requestId: req.id,
      method: req.method,
      path: req.path,
      errorName: error.name,
      ...(typeof error.code === 'string' ? { errorCode: error.code } : {})
    }));
  }
  res.status(status).json({ error: message, ...(error.details ? { details: error.details } : {}), requestId: req.id });
}

module.exports = { notFound, errorHandler };
