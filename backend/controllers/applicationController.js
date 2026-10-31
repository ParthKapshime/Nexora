const { Application } = require('../models/Application');
const { ApiError } = require('../utils/apiError');

async function list(req, res) {
  const filter = { user: req.user.id };
  if (req.validated.query.status) filter.status = req.validated.query.status;
  const limit = req.validated.query.limit ?? 50;
  const page = req.validated.query.page ?? 1;
  const [items, total] = await Promise.all([
    Application.find(filter).sort({ appliedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Application.countDocuments(filter)
  ]);
  res.json({ items, page, limit, total });
}

async function create(req, res) {
  const item = await Application.create({ ...req.validated.body, user: req.user.id });
  res.status(201).json({ item });
}

async function get(req, res) {
  const item = await Application.findOne({ _id: req.validated.params.id, user: req.user.id }).lean();
  if (!item) throw new ApiError(404, 'Application not found');
  res.json({ item });
}

async function update(req, res) {
  const item = await Application.findOneAndUpdate(
    { _id: req.validated.params.id, user: req.user.id }, { $set: req.validated.body },
    { new: true, runValidators: true, lean: true }
  );
  if (!item) throw new ApiError(404, 'Application not found');
  res.json({ item });
}

async function remove(req, res) {
  const result = await Application.deleteOne({ _id: req.validated.params.id, user: req.user.id });
  if (!result.deletedCount) throw new ApiError(404, 'Application not found');
  res.status(204).end();
}

module.exports = { list, create, get, update, remove };
