const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true, trim: true, maxlength: 160 },
  jobTitle: { type: String, required: true, trim: true, maxlength: 160 },
  appliedAt: { type: Date, required: true },
  status: { type: String, enum: ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
  nextAction: { type: String, trim: true, maxlength: 500 },
  followUpAt: { type: Date },
  notes: { type: String, trim: true, maxlength: 4000 }
}, { timestamps: true, strict: 'throw' });

applicationSchema.index({ user: 1, appliedAt: -1 });
const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);
module.exports = { Application };
