const Habit = require("../models/habit");

function iso(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

function normalizeToUTCStart(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDaysISO(isoDateStr, delta) {
  const d = new Date(isoDateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function isTargetDayForHabit(habit, dow) {
  const freq = habit.frequency;

  if (freq === "daily") return true;
  if (freq === "weekly") return true;

  // custom
  const days = Array.isArray(habit.schedule?.daysOfWeek) ? habit.schedule.daysOfWeek : [];
  return days.length ? days.includes(dow) : true;
}

function completionOnDayISO(habit, dateIso) {
  const comps = Array.isArray(habit.completions) ? habit.completions : [];
  return comps.find((c) => iso(c.date) === dateIso) || null;
}

function weekStartISO(dateIso) {
  const d = new Date(dateIso + "T12:00:00Z");
  const dow = d.getUTCDay(); 
  const diff = (dow + 6) % 7; 
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function weekEndISO(dateIso) {
  const start = weekStartISO(dateIso);
  return addDaysISO(start, 6);
}

function hasCompletionInWeek(habit, anyDateIsoInWeek) {
  const start = weekStartISO(anyDateIsoInWeek);
  const end = weekEndISO(anyDateIsoInWeek);

  const comps = Array.isArray(habit.completions) ? habit.completions : [];
  for (const c of comps) {
    const d = iso(c.date);
    if (d >= start && d <= end) {
      if (c.completed !== false && (Number(c.value ?? 1) > 0)) return true;
    }
  }
  return false;
}
exports.getOverview = async (req, res, next) => {
  try {
    const days = clampInt(req.query.days || "7", 1, 90);
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const habits = await Habit.find({ user: userId, status: "active" })
      .select("name frequency schedule completions")
      .lean();

    const totalHabits = habits.length;

    const now = new Date();
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(iso(d));
    }

    const byDay = dates.map((dateIso) => {
      const d = new Date(dateIso + "T12:00:00Z");
      const dow = d.getUTCDay();

      let total = 0;
      let done = 0;

      for (const h of habits) {
        if (!isTargetDayForHabit(h, dow)) continue;
        total++;

        if (h.frequency === "weekly") {
          if (hasCompletionInWeek(h, dateIso)) done++;
          continue;
        }

        const c = completionOnDayISO(h, dateIso);
        if (c && c.completed !== false && (Number(c.value ?? 1) > 0)) done++;
      }

      const rate = total === 0 ? 0 : done / total;
      return { date: dateIso, done, total, rate };
    });

    const totalCheckins = byDay.reduce((s, x) => s + x.done, 0);
    const totalTargets = byDay.reduce((s, x) => s + x.total, 0);
    const completionRate = totalTargets === 0 ? 0 : totalCheckins / totalTargets;

    return res.json({
      overview: {
        totalHabits,
        totalCheckins,
        completionRate,
        byDay,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getCalendar = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const fromStr = String(req.query.from || iso(new Date())).slice(0, 10);
    const toStr = String(req.query.to || fromStr).slice(0, 10);

    const from = normalizeToUTCStart(fromStr + "T00:00:00Z");
    const to = normalizeToUTCStart(toStr + "T00:00:00Z");

    if (to < from) {
      return res.status(400).json({ message: "`to` must be >= `from`" });
    }

    const dates = [];
    let cur = fromStr;
    while (cur <= toStr) {
      dates.push(cur);
      cur = addDaysISO(cur, 1);
    }

    const habits = await Habit.find({ user: userId, status: "active" })
      .select("name color frequency schedule completions")
      .lean();

    const items = habits.map((h) => {
      const cells = dates.map((dateIso) => {
        const d = new Date(dateIso + "T12:00:00Z");
        const dow = d.getUTCDay();

        const isTargetDay = isTargetDayForHabit(h, dow);

        let completed = false;

        if (h.frequency === "weekly") {
          completed = hasCompletionInWeek(h, dateIso);
        } else {
          const c = completionOnDayISO(h, dateIso);
          completed = !!(c && c.completed !== false && (Number(c.value ?? 1) > 0));
        }

        return {
          date: dateIso,
          isTargetDay,
          completed,
          value: completed ? 1 : 0,
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

    res.json({ from: fromStr, to: toStr, dates, habits: items });
  } catch (err) {
    next(err);
  }
};