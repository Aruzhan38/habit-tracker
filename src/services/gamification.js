const User = require("../models/user");

async function addReward(userId, { xp = 0, coins = 0 } = {}) {
  const user = await User.findById(userId);
  if (!user) return null;

  const mult = user.plan === "premium" ? (user.game?.multiplier || 1.25) : 1;

  user.game = user.game || {};
  user.game.xp = Math.round((user.game.xp || 0) + xp * mult);
  user.game.coins = Math.round((user.game.coins || 0) + coins * mult);

  await user.save();
  return user;
}

async function grantBadge(userId, badge) {
  const user = await User.findById(userId);
  if (!user) return null;

  user.game = user.game || {};
  user.game.badges = user.game.badges || [];

  if (!user.game.badges.includes(badge)) {
    user.game.badges.push(badge);
    await user.save();
  }
  return user;
}

module.exports = { addReward, grantBadge };