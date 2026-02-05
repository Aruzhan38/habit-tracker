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

exports.archiveHabit = async (req, res) => {
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.habitId, user: req.user.id },
    { status: 'archived' },
    { new: true }
  );

  res.json({ habit });
};

exports.unarchiveHabit = async (req, res) => {
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.habitId, user: req.user.id },
    { status: 'active' },
    { new: true }
  );

  res.json({ habit });
};










// POST /habits/:habitId/checkins
exports.addCheckIn = async (req, res) => {
  try {
    const { habitId } = req.params;
    const { date, value, note } = req.body;
    const habit = await Habit.findOneAndUpdate(
      { _id: habitId, user: req.user.id },
      { 
        $push: { 
          completions: { date: new Date(date), value, note } 
        } 
      },
      { new: true }
    );

    if (!habit) return res.status(404).json({ message: "habit not found" });
    res.status(201).json(habit.completions[habit.completions.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /habits/:habitId/checkins?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getCheckIns = async (req, res) => {
  try {
    const { habitId } = req.params;
    const { from, to } = req.query;

    const habit = await Habit.findOne({ _id: habitId, user: req.user.id });
    if (!habit) return res.status(404).json({ message: "habit not found" });
    const filtered = habit.completions.filter(c => {
      const d = new Date(c.date);
      return d >= new Date(from) && d <= new Date(to);
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /habits/:habitId/checkins/:checkInId
exports.deleteCheckIn = async (req, res) => {
  try {
    const { habitId, checkInId } = req.params;
    const habit = await Habit.findOneAndUpdate(
      { _id: habitId, user: req.user.id },
      { $pull: { completions: { _id: checkInId } } },
      { new: true }
    );
    if (!habit) return res.status(404).json({ message: "habit not found" });
    res.json({ message: "Check-in removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /habits/:habitId/checkins/:date
exports.upsertCheckInByDate = async (req, res) => {
  try {
    const { habitId, date } = req.params;
    const { value, note } = req.body;
    const targetDate = new Date(date);
    let habit = await Habit.findOneAndUpdate(
      { 
        _id: habitId, 
        user: req.user.id, 
        "completions.date": targetDate 
      },
      { 
        $set: { 
          "completions.$.value": value, 
          "completions.$.note": note 
        } 
      },
      { new: true }
    );

    if (!habit) {
      habit = await Habit.findOneAndUpdate(
        { _id: habitId, user: req.user.id },
        { 
          $push: { 
            completions: { date: targetDate, value, note } 
          } 
        },
        { new: true }
      );
    }
    if (!habit) return res.status(404).json({ message: "habit not found" });
    res.json(habit.completions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /habits/:habitId/checkins/:date
exports.deleteCheckInByDate = async (req, res) => {
  try {
    const { habitId, date } = req.params;
    const targetDate = new Date(date);
    const habit = await Habit.findOneAndUpdate(
      { _id: habitId, user: req.user.id },
      { $pull: { completions: { date: targetDate } } },
      { new: true }
    );
    if (!habit) return res.status(404).json({ message: "habit not found" });
    res.json({ message: "Check-in unmarked for this date" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};