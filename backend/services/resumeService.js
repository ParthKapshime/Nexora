const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const { ApiError } = require('../utils/apiError');

function resumeDirectory(configuredDirectory = process.env.UPLOAD_DIR) {
  return path.resolve(configuredDirectory || path.join(__dirname, '..', 'uploads'));
}

const storage = multer.diskStorage({
  destination(req, _file, callback) {
    const fs = require('node:fs');
    const directory = resumeDirectory(req.app.locals.env.UPLOAD_DIR);
    fs.mkdir(directory, { recursive: true }, (error) => callback(error, directory));
  },
  filename(_req, _file, callback) { callback(null, `${randomUUID()}.pdf`); }
});

const resumeUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (file.mimetype !== 'application/pdf' || path.extname(file.originalname).toLowerCase() !== '.pdf') {
      return callback(new ApiError(400, 'Only PDF resumes are accepted'));
    }
    callback(null, true);
  }
});

module.exports = { resumeUpload, resumeDirectory };
