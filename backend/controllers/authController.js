const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { ApiError } = require('../utils/apiError');

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    profile: user.profile,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function issueToken(user, secret) {
  if (!secret) throw new ApiError(503, 'Authentication is not configured');
  return jwt.sign({}, secret, { subject: user.id, algorithm: 'HS256', expiresIn: '1h' });
}

async function register(req, res) {
  const { email, password } = req.validated.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await User.create({ email, passwordHash });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, 'An account with this email already exists');
    throw error;
  }
  const token = issueToken(user, req.app.locals.env.JWT_SECRET);
  res.status(201).json({ user: publicUser(user), token, tokenType: 'Bearer', expiresIn: 3600 });
}

async function login(req, res) {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, 'Invalid email or password');
  const token = issueToken(user, req.app.locals.env.JWT_SECRET);
  res.json({ user: publicUser(user), token, tokenType: 'Bearer', expiresIn: 3600 });
}

module.exports = { register, login, publicUser };
