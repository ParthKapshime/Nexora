const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authSchema } = require('../validators/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many authentication attempts. Try again later.' } });
router.post('/register', authLimiter, validate(authSchema), asyncHandler(register));
router.post('/login', authLimiter, validate(authSchema), asyncHandler(login));
router.get('/me', requireAuth, (req, res) => res.json({ user: { id: req.user.id, email: req.user.email } }));
module.exports = router;
