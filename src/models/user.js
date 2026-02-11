const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true , select: false },
    plan: { type: String, enum: ["free", "premium"], default: "free" },
    timezone: { type: String, default: 'UTC' },
    avatarUrl: { type: String, default: '' },
    role: { type: String, default: 'user' },
    game: { xp: { type: Number, default: 0 }, coins: { type: Number, default: 0 }, badges: [{ type: String }], multiplier: { type: Number, default: 1 }},
    billing: { cards: [{ brand: String, last4: String, expMonth: Number, expYear: Number, createdAt: { type: Date, default: Date.now } }] }
}, { timestamps: true });

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);