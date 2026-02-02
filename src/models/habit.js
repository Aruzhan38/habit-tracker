const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: { type: String, required: true },
    description: { type: String },

    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },

    goal: {
      type: {
        type: String,
        enum: ['count', 'boolean'],
        required: true,
      },
      target: { type: Number },
      unit: { type: String },
    },

    schedule: {
      daysOfWeek: [{ type: Number }], 
    },

    startDate: { type: Date, required: true },
    color: { type: String },

    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Habit', habitSchema);