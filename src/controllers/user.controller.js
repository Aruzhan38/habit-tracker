const User = require('../models/user');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        timezone: user.timezone,
        avatarUrl: user.avatarUrl,
        plan: user.plan,                
        isPremium: user.plan === "premium",
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const allowed = ['username', 'email', 'timezone'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'Profile updated',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        timezone: user.timezone,
        avatarUrl: user.avatarUrl,
        plan: user.plan,
        isPremium: user.plan === "premium",
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ message: `${field} already in use` });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { avatarUrl },
    { new: true }
  ).select('-password');

  res.json({
    message: 'Avatar updated',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      timezone: user.timezone,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      isPremium: user.plan === "premium",
    }
  });
};

exports.upgradePlan = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });

  const cards = user.billing?.cards || [];
  if (cards.length === 0) {
    return res.status(400).json({
      code: "BILLING_REQUIRED",
      message: "Add a payment card to upgrade",
    });
  }

  user.plan = "premium";
  await user.save();

  res.json({
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      timezone: user.timezone,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      isPremium: true,
      billing: { cards: cards.map(c => ({ _id: c._id, brand: c.brand, last4: c.last4 })) },
    },
  });
};

exports.downgradePlan = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });

  user.plan = "free";
  await user.save();

  res.json({
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      timezone: user.timezone,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      isPremium: false,
      billing: { cards: (user.billing?.cards || []).map(c => ({ _id: c._id, brand: c.brand, last4: c.last4 })) },
    },
  });
};

exports.addCard = async (req, res) => {
  try {
    const { number, expMonth, expYear } = req.body;

    if (!number || number.length < 12) {
      return res.status(400).json({ message: "Invalid card number" });
    }

    const last4 = number.slice(-4);

    const user = await User.findById(req.user.id);

    user.billing = user.billing || { cards: [] };

    user.billing.cards.push({
      brand: "VISA",
      last4,
      expMonth,
      expYear
    });

    await user.save();

    res.json({
      message: "Card added",
      cards: user.billing.cards
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};