const User = require("../models/user");

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

exports.getCards = async (req, res) => {
  const user = await User.findById(req.user.id).select("billing plan");
  res.json({ cards: user?.billing?.cards || [] });
};

exports.addCard = async (req, res) => {
  const { cardNumber, expMonth, expYear, brand } = req.body || {};

  const digits = onlyDigits(cardNumber);
  if (digits.length < 12) {
    return res.status(400).json({ message: "Invalid card number" });
  }

  const last4 = digits.slice(-4);
  const m = Number(expMonth);
  const y = Number(expYear);

  if (!(m >= 1 && m <= 12) || !(y >= 2024 && y <= 2099)) {
    return res.status(400).json({ message: "Invalid expiration date" });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.billing = user.billing || { cards: [] };
  user.billing.cards = user.billing.cards || [];

  user.billing.cards.push({
    brand: String(brand || "VISA").toUpperCase(),
    last4,
    expMonth: m,
    expYear: y,
  });

  await user.save();

  res.json({ message: "Card added", cards: user.billing.cards });
};

exports.deleteCard = async (req, res) => {
  const { cardId } = req.params;

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.billing = user.billing || { cards: [] };
  user.billing.cards = (user.billing.cards || []).filter((c) => String(c._id) !== String(cardId));

  await user.save();
  res.json({ message: "Card removed", cards: user.billing.cards });
};