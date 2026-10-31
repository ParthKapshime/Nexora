const { z } = require('zod');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const empty = z.object({});
const idParams = z.object({ id: objectId });
const resourceData = z.object({}).passthrough().refine((value) => Object.keys(value).length > 0, 'Data must not be empty');
function requestSchema({ body = empty, params = empty, query = empty }) {
  return z.object({ body, params, query });
}
module.exports = { z, objectId, empty, idParams, resourceData, requestSchema };
