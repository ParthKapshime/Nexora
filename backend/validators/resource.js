const { z, objectId, resourceData, requestSchema } = require('./common');
module.exports = {
  createResource: requestSchema({ body: z.object({ data: resourceData }).strict() }),
  updateResource: requestSchema({ body: z.object({ data: resourceData }).strict(), params: z.object({ id: objectId }) }),
  resourceId: requestSchema({ params: z.object({ id: objectId }) })
};
