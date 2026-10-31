const { UserResource } = require('../models/UserResource');
const { ApiError } = require('../utils/apiError');

function controllerFor(kind) {
  return {
    async list(req, res) {
      const items = await UserResource.find({ user: req.user.id, kind }).sort({ createdAt: -1 }).lean();
      res.json({ items });
    },
    async create(req, res) {
      const item = await UserResource.create({ user: req.user.id, kind, data: req.validated.body.data });
      res.status(201).json({ item });
    },
    async update(req, res) {
      const item = await UserResource.findOneAndUpdate(
        { _id: req.validated.params.id, user: req.user.id, kind },
        { $set: { data: req.validated.body.data } }, { new: true, runValidators: true, lean: true }
      );
      if (!item) throw new ApiError(404, 'Resource not found');
      res.json({ item });
    },
    async remove(req, res) {
      const result = await UserResource.deleteOne({ _id: req.validated.params.id, user: req.user.id, kind });
      if (!result.deletedCount) throw new ApiError(404, 'Resource not found');
      res.status(204).end();
    }
  };
}

module.exports = { controllerFor };
