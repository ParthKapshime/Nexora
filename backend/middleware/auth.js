const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { ApiError } = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) throw new ApiError(401, 'Authentication required');
  const secret = req.app.locals.env.JWT_SECRET;
  if (!secret) throw new ApiError(503, 'Authentication is not configured');
  let payload;
  try {
    payload = jwt.verify(header.slice(7), secret, { algorithms: ['HS256'] });
  } catch {
    throw new ApiError(401, 'Invalid or expired authentication token');
  }
  const user = await User.findById(payload.sub).select('_id email');
  if (!user) throw new ApiError(401, 'Invalid or expired authentication token');
  req.user = user;
  next();
});

module.exports = { requireAuth };
