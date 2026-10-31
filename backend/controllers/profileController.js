const { User } = require('../models/User');
const { ApiError } = require('../utils/apiError');
const { publicUser } = require('./authController');

async function getProfile(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ profile: publicUser(user).profile });
}

async function updateProfile(req, res) {
  const profileUpdates = Object.fromEntries(Object.entries(req.validated.body).map(([key, value]) => [`profile.${key}`, value]));
  const user = await User.findByIdAndUpdate(req.user.id, { $set: profileUpdates }, {
    new: true, runValidators: true
  });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ profile: publicUser(user).profile });
}

module.exports = { getProfile, updateProfile };
