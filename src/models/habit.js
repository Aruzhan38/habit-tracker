const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr) =>
          arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: "daysOfWeek must be integers 0..6",
      },
    },
    enabled: { type: Boolean, default: true },
    note: { type: String, default: "" },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const completionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true, 
    },
    value: { type: Number },
    note: { type: String, default: "" },
    completed: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: { type: String, required: true },
    description: { type: String },

    frequency: {
      type: String,
      enum: ["daily", "weekly","custom"],
      default: "daily",
    },

    goal: {
      type: {
        type: String,
        enum: ["count", "boolean"],
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
      enum: ["active", "archived"],
      default: "active",
    },

    isPrivate: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    pinHash: { type: String, default: "" },

    reminders: {
      type: [reminderSchema],
      default: [],
    },

    completions: {
      type: [completionSchema],
      default: [],
    },

    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Habit", habitSchema);