const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { profileBody } = require('../validators/profile');
const { requestSchema } = require('../validators/common');
const asyncHandler = require('../utils/asyncHandler');
const { getProfile, updateProfile } = require('../controllers/profileController');
const { resumeUpload } = require('../services/resumeService');
const { upload, remove } = require('../controllers/resumeController');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Resume upload limit reached. Try again later.' } });
router.use(requireAuth);
router.get('/', asyncHandler(getProfile));
router.patch('/', validate(requestSchema({ body: profileBody })), asyncHandler(updateProfile));
router.post('/resume', uploadLimiter, resumeUpload.single('resume'), upload);
router.delete('/resume', asyncHandler(remove));
module.exports = router;
