const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/applicationController');
const schemas = require('../validators/application');

const router = express.Router();
router.use(requireAuth);
router.get('/', validate(schemas.listApplications), asyncHandler(controller.list));
router.post('/', validate(schemas.createApplication), asyncHandler(controller.create));
router.get('/:id', validate(schemas.applicationId), asyncHandler(controller.get));
router.patch('/:id', validate(schemas.updateApplication), asyncHandler(controller.update));
router.delete('/:id', validate(schemas.applicationId), asyncHandler(controller.remove));
module.exports = router;
