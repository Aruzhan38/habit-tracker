const Habit = require('../models/habit');

function toISODate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function addDays(dateStr, delta) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

function normalizeDate(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

const { startOfWeek, endOfWeek, isSameDay } = require('date-fns');

exports.getDailyView = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const endDateStr = (req.query.date || toISODate(new Date())).slice(0, 10);
    const days = Math.max(1, Math.min(parseInt(req.query.days || "7", 10), 30));
    const tag = req.query.tag;

    const dates = [];
    for (let i = 0; i < days; i++) {
      dates.unshift(addDays(endDateStr, -i));
    }

    const habits = await Habit.find({
      user: userId,
      status: "active",
      ...(tag && { tags: tag }),
    }).lean();

    const result = habits.map((h) => {
      const completions = h.completions || [];
      
      const cells = dates.map((d) => {
        const currentDay = new Date(d);
        const dayOfWeek = currentDay.getDay();
        const dateISO = d.slice(0, 10);

        let isTargetDay = false;
        let isCompleted = false;

        if (h.frequency === 'daily') {
          isTargetDay = true;
          isCompleted = completions.some(c => 
            new Date(c.date).toISOString().slice(0, 10) === dateISO
          );
        } 
        else if (h.frequency === 'weekly') {
          isTargetDay = true;
          const start = startOfWeek(currentDay, { weekStartsOn: 1 });
          const end = endOfWeek(currentDay, { weekStartsOn: 1 });
          
          isCompleted = completions.some(c => {
            const cDate = new Date(c.date);
            return cDate >= start && cDate <= end;
          });
        } 
        else if (h.frequency === 'custom') {
          isTargetDay = (h.targetDays || []).includes(dayOfWeek);
          isCompleted = completions.some(c => 
            new Date(c.date).toISOString().slice(0, 10) === dateISO
          );
        }

        return {
          date: d,
          isTargetDay,
          completed: isCompleted,
          value: isCompleted ? 1 : 0
        };
      });

      return {
        habitId: h._id,
        name: h.name,
        color: h.color || "#6c63ff",
        frequency: h.frequency,
        cells,
      };
    });

    res.json({ date: endDateStr, dates, habits: result });
  } catch (e) {
    next(e);
  }
};

exports.getCalendarMap = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const from = (req.query.from || toISODate(new Date())).slice(0, 10);
    const to = (req.query.to || from).slice(0, 10);
    const tag = req.query.tag;

    const habits = await Habit.find({
      user: userId,
      status: "active",
      ...(tag && { tags: tag }),
    }).lean();

    const items = habits.map((h) => {
      const map = {};
      (h.completions || []).forEach((c) => {
        const k = (c.date || "").toString().slice(0, 10);
        if (!k) return;
        if (k < from || k > to) return;

        map[k] = {
          completed: !!(c.completed === true || (c.value ?? 0) > 0),
          value: c.value ?? 0,
        };
      });

      return {
        habitId: h._id,
        name: h.name,
        color: h.color || "#6c63ff",
        map,
      };
    });

    res.json({ from, to, items });
  } catch (e) {
    next(e);
  }
};

exports.createHabit = async (req, res) => {
  try {
    if (!Array.isArray(req.body.tags) || req.body.tags.length === 0) {
      return res.status(400).json({ error: "At least one tag is required" });
    }

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
  const { status, tag } = req.query;

  const query = {
    user: req.user.id,
    ...(status && { status }),
    ...(tag && { tags: tag })
  };

  const habits = await Habit
    .find(query)
    .populate("tags");

  res.json(habits);
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



exports.addCheckIn = async (req, res) => {
  try {
    const { habitId } = req.params;
    const { date, value = 1, note } = req.body;

    const day = normalizeDate(date);

    const habit = await Habit.findOneAndUpdate(
      { _id: habitId, user: req.user.id },
      {
        $push: {
          completions: { date: day, value, note },
        },
      },
      { new: true }
    );

    if (!habit) return res.status(404).json({ message: "habit not found" });

    res.status(201).json(habit.completions[habit.completions.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCheckIns = async (req, res) => {
  try {
    const { habitId } = req.params;
    const { from, to } = req.query;

    const habit = await Habit.findOne({ _id: habitId, user: req.user.id }).lean();
    if (!habit) return res.status(404).json({ message: "habit not found" });

    const fromDay = from ? normalizeDate(from) : null;
    const toDay = to ? normalizeDate(to) : null;

    const filtered = (habit.completions || []).filter((c) => {
      const d = normalizeDate(c.date);
      if (fromDay && d < fromDay) return false;
      if (toDay && d > toDay) return false;
      return true;
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

exports.upsertCheckInByDate = async (req, res) => {
  try {
    const { habitId, date } = req.params;
    const { value = 1, note } = req.body;

    const day = normalizeDate(date);

    let habit = await Habit.findOneAndUpdate(
      {
        _id: habitId,
        user: req.user.id,
        "completions.date": day,
      },
      {
        $set: {
          "completions.$.value": value,
          "completions.$.note": note,
        },
      },
      { new: true }
    );

    if (!habit) {
      habit = await Habit.findOneAndUpdate(
        { _id: habitId, user: req.user.id },
        {
          $addToSet: {
            completions: {
              date: day,
              value,
              note,
            },
          },
        },
        { new: true }
      );
    }

    if (!habit) {
      return res.status(404).json({ message: "habit not found" });
    }

    res.json(habit.completions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.deleteCheckInByDate = async (req, res) => {
  try {
    const { habitId, date } = req.params;
    const day = normalizeDate(date);

    const habit = await Habit.findOneAndUpdate(
      { _id: habitId, user: req.user.id },
      { $pull: { completions: { date: day } } },
      { new: true }
    );

    if (!habit) return res.status(404).json({ message: "habit not found" });
    res.json({ message: "Check-in unmarked for this date" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleCheckInByDate = async (req, res) => {
  try {
    const { habitId, date } = req.params;
    const targetDateISO = date.slice(0, 10); 
    
    const habit = await Habit.findOne({ _id: habitId, user: req.user.id });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const existingIdx = habit.completions.findIndex(c => 
      c.date.toISOString().slice(0, 10) === targetDateISO
    );

    if (existingIdx > -1) {
      habit.completions.splice(existingIdx, 1);
    } else {
      habit.completions.push({ 
        date: new Date(targetDateISO + "T00:00:00Z"), 
        value: 1 
      });
    }

    await habit.save();
    res.json({ message: "Toggled successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
