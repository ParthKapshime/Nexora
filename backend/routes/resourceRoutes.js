const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { controllerFor } = require('../controllers/resourceController');
const schemas = require('../validators/resource');
const asyncHandler = require('../utils/asyncHandler');

function resourceRouter(kind) {
  const router = express.Router();
  const controller = controllerFor(kind);
  router.use(requireAuth);
  router.get('/', asyncHandler(controller.list));
  router.post('/', validate(schemas.createResource), asyncHandler(controller.create));
  router.patch('/:id', validate(schemas.updateResource), asyncHandler(controller.update));
  router.delete('/:id', validate(schemas.resourceId), asyncHandler(controller.remove));
  return router;
}

module.exports = { resourceRouter };
