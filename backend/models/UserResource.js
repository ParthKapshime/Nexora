const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['skill', 'roadmap', 'project', 'interview'], required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true, strict: 'throw' });

resourceSchema.index({ user: 1, kind: 1, createdAt: -1 });
const UserResource = mongoose.models.UserResource || mongoose.model('UserResource', resourceSchema);
module.exports = { UserResource };
