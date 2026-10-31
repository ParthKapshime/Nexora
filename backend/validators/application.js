const { z, objectId, empty, requestSchema } = require('./common');

const status = z.enum(['Applied', 'Screening', 'Interview', 'Offer', 'Rejected']);
const fields = {
  company: z.string().trim().min(1).max(160), jobTitle: z.string().trim().min(1).max(160),
  appliedAt: z.coerce.date(), status: status.default('Applied'),
  nextAction: z.string().trim().max(500).optional(), followUpAt: z.coerce.date().optional(),
  notes: z.string().trim().max(4000).optional()
};
const createBody = z.object(fields).strict();
const updateBody = z.object({ ...fields, status }).partial().strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
const query = z.object({ status: status.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
module.exports = {
  createApplication: requestSchema({ body: createBody }),
  updateApplication: requestSchema({ body: updateBody, params: z.object({ id: objectId }) }),
  applicationId: requestSchema({ params: z.object({ id: objectId }) }),
  listApplications: requestSchema({ params: empty, query })
};
