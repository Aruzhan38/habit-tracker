const Habit = require("../models/habit");

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, isNaN(n) ? min : n));
}

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

function isTargetDayForHabit(habit, dayOfWeek) {
  const freq = habit.frequency;

  if (freq === "daily") return true;

  const days = habit.schedule?.daysOfWeek || [];
  return days.length ? days.includes(dayOfWeek) : true;
}

function completionOnDate(habit, dateIso) {
  const comps = Array.isArray(habit.completions) ? habit.completions : [];
  return comps.find((c) => iso(new Date(c.date)) === dateIso) || null;
}

function calcStreakForHabit(habit) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 365);

  const doneSet = new Set(
    (habit.completions || [])
      .filter((c) => c && (c.completed !== false) && ((c.value ?? 1) > 0))
      .map((c) => iso(new Date(c.date)))
  );

  let current = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayIso = iso(d);
    const dow = d.getDay();

    if (!isTargetDayForHabit(habit, dow)) continue;

    if (doneSet.has(dayIso)) current++;
    else break;
  }

  let best = 0;
  let run = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayIso = iso(d);
    const dow = d.getDay();

    if (!isTargetDayForHabit(habit, dow)) continue;

    if (doneSet.has(dayIso)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  return { current, best };
}

exports.getOverview = async (req, res, next) => {
  try {
    const days = clampInt(parseInt(req.query.days || "7", 10), 1, 90);
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const habits = await Habit.find({ user: userId, status: "active" }).select(
      "name frequency schedule completions"
    );

    const totalHabits = habits.length;

    const now = new Date();
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(iso(d));
    }

    const byDay = dates.map((dateIso) => {
      const d = new Date(dateIso + "T12:00:00");
      const dow = d.getDay();

      let total = 0;
      let done = 0;

      for (const h of habits) {
        if (!isTargetDayForHabit(h, dow)) continue;
        total++;

        const c = completionOnDate(h, dateIso);
        if (c && (c.completed !== false) && ((c.value ?? 1) > 0)) done++;
      }

      const rate = total === 0 ? 0 : done / total;

      return { date: dateIso, done, total, rate };
    });

    const totalCheckins = byDay.reduce((s, x) => s + x.done, 0);
    const totalTargets = byDay.reduce((s, x) => s + x.total, 0);
    const completionRate = totalTargets === 0 ? 0 : totalCheckins / totalTargets;

    let bestStreak = 0;
    let currentStreak = 0;
    for (const h of habits) {
      const s = calcStreakForHabit(h);
      bestStreak = Math.max(bestStreak, s.best);
      currentStreak = Math.max(currentStreak, s.current);
    }

    return res.json({
      overview: {
        totalHabits,
        totalCheckins,
        completionRate, 
        bestStreak,
        currentStreak,
        byDay, 
      },
    });
  } catch (err) {
    next(err);
  }
};