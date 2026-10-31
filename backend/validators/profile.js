const { z } = require('zod');
const text = (max) => z.string().trim().max(max);
const education = z.object({
  institution: text(160).optional(), degree: text(120).optional(), field: text(120).optional(),
  graduationYear: z.number().int().min(1950).max(2100).optional()
}).strict();
const profileBody = z.object({
  fullName: text(120).optional(), targetRole: text(120).optional(),
  yearsOfExperience: z.number().min(0).max(80).optional(),
  education: z.array(education).max(20).optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one profile field is required');
module.exports = { profileBody };
