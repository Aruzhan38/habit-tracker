const Habit = require('../models/habit');

exports.createHabit = async (req, res) => {
  try {
    const habit = await Habit.create({
      ...req.body,
      user: req.user.id,
    });

    res.status(201).json({ habit });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
// GET /habits
exports.getHabits = async (req, res) => {
  try {
    const filter = { user: req.user.id };

    if (req.query.status) {
      filter.status = req.query.status; 
    }

    const habits = await Habit.find(filter).sort({ createdAt: -1 });
    res.json({ habits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /habits/:habitId
exports.getHabitById = async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.habitId,
      user: req.user.id,
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.json({ habit });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PATCH /habits/:habitId
exports.updateHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.habitId, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.json({ habit });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /habits/:habitId
exports.deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.habitId,
      user: req.user.id,
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /habits/:habitId/archive
exports.archiveHabit = async (req, res) => {
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.habitId, user: req.user.id },
    { status: 'archived' },
    { new: true }
  );

  res.json({ habit });
};

// POST /habits/:habitId/unarchive
exports.unarchiveHabit = async (req, res) => {
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.habitId, user: req.user.id },
    { status: 'active' },
    { new: true }
  );

  res.json({ habit });
};