const fs = require('node:fs/promises');
const path = require('node:path');
const { User } = require('../models/User');
const { ApiError } = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { resumeDirectory } = require('../services/resumeService');

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'A PDF resume is required');
  const file = await fs.open(req.file.path, 'r');
  const header = Buffer.alloc(5);
  await file.read(header, 0, 5, 0);
  await file.close();
  if (header.toString('ascii') !== '%PDF-') {
    await fs.unlink(req.file.path).catch(() => {});
    throw new ApiError(400, 'Uploaded file is not a valid PDF');
  }

  const user = await User.findById(req.user.id).select('+profile.resume.storedName');
  if (!user) {
    await fs.unlink(req.file.path).catch(() => {});
    throw new ApiError(404, 'User not found');
  }
  const oldName = user.profile?.resume?.storedName;
  user.profile.resume = {
    originalName: path.basename(req.file.originalname.replace(/\\/g, '/')).slice(0, 255),
    storedName: req.file.filename,
    size: req.file.size,
    uploadedAt: new Date()
  };
  try {
    await user.save();
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
  if (oldName && /^[a-f\d-]+\.pdf$/i.test(oldName)) {
    await fs.unlink(path.join(resumeDirectory(req.app.locals.env.UPLOAD_DIR), oldName)).catch(() => {});
  }
  res.status(201).json({ resume: { originalName: user.profile.resume.originalName, size: user.profile.resume.size, uploadedAt: user.profile.resume.uploadedAt } });
});

const remove = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+profile.resume.storedName');
  if (!user?.profile?.resume) throw new ApiError(404, 'Resume not found');
  const storedName = user.profile.resume.storedName;
  user.profile.resume = undefined;
  await user.save();
  if (storedName && /^[a-f\d-]+\.pdf$/i.test(storedName)) {
    await fs.unlink(path.join(resumeDirectory(req.app.locals.env.UPLOAD_DIR), storedName)).catch(() => {});
  }
  res.status(204).end();
});

module.exports = { upload, remove };
