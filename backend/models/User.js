const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  fullName: { type: String, trim: true, maxlength: 120 },
  targetRole: { type: String, trim: true, maxlength: 120 },
  yearsOfExperience: { type: Number, min: 0, max: 80 },
  education: [{ institution: { type: String, trim: true, maxlength: 160 }, degree: { type: String, trim: true, maxlength: 120 }, field: { type: String, trim: true, maxlength: 120 }, graduationYear: { type: Number, min: 1950, max: 2100 } }],
  resume: {
    originalName: { type: String, maxlength: 255 },
    storedName: { type: String, select: false },
    size: { type: Number },
    uploadedAt: { type: Date },
    pageCount: { type: Number, min: 0 },
    parseStatus: { type: String, enum: ['processed', 'no_text'] },
    parsedAt: { type: Date },
    text: { type: String, maxlength: 50000, select: false }
  },
  readiness: {
    score: { type: Number, min: 0, max: 100 },
    summary: { type: String, maxlength: 1600 },
    targetRole: { type: String, maxlength: 120 },
    updatedAt: { type: Date }
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  profile: { type: profileSchema, default: () => ({}) }
}, { timestamps: true, strict: 'throw' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = { User };
