module.exports = function requirePremium(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const plan = req.user.plan || "free";
  if (plan !== "premium") {
    return res.status(403).json({
      code: "PREMIUM_REQUIRED",
      message: "This feature is available only for Premium users",
      upgradeRequired: true,
    });
  }

  next();
};