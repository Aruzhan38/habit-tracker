const Habit = require("../models/habit");

function isDoneCheckin(c) {
  return c?.completed === true || c?.value === true || c?.value === 1;
}

function toISODate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function getPeriodRange(type) {
  const now = new Date();

  if (type === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return { start, end };
}

function inRange(dateStr, start, end) {
  const d = new Date(dateStr + "T00:00:00");
  return d >= start && d < end;
}

function countDoneInRange(checkins, start, end) {
  let total = 0;
  let done = 0;

  for (const c of checkins) {
    if (!c?.date) continue;
    if (!inRange(c.date, start, end)) continue;
    total++;
    if (isDoneCheckin(c)) done++;
  }

  return { total, done };
}

exports.overview = async (req, res) => {
  const { habitId } = req.params;

  const habit = await Habit.findById(habitId).select("name checkins reminders user");
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  const checkins = Array.isArray(habit.checkins) ? habit.checkins : [];

  const totalAll = checkins.length;
  const doneAll = checkins.filter(isDoneCheckin).length;
  const scoreAll = totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100);

  const { start: mStart, end: mEnd } = getPeriodRange("month");
  const { total: totalMonth, done: doneMonth } = countDoneInRange(checkins, mStart, mEnd);
  const scoreMonth = totalMonth === 0 ? 0 : Math.round((doneMonth / totalMonth) * 100);

  const { start: yStart, end: yEnd } = getPeriodRange("year");
  const { total: totalYear, done: doneYear } = countDoneInRange(checkins, yStart, yEnd);
  const scoreYear = totalYear === 0 ? 0 : Math.round((doneYear / totalYear) * 100);

  res.json({
    habitId: habit._id,
    habitName: habit.name,
    scoreAll,
    totalAll,
    doneAll,

    scoreMonth,
    totalMonth,
    doneMonth,

    scoreYear,
    totalYear,
    doneYear
  });
};

exports.calendar = async (req, res) => {
  const { habitId } = req.params;

  const habit = await Habit.findById(habitId).select("checkins");
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  const map = {};
  const checkins = Array.isArray(habit.checkins) ? habit.checkins : [];

  for (const c of checkins) {
    if (!c?.date) continue;
    map[c.date] = isDoneCheckin(c) ? 1 : 0;
  }

  res.json({ habitId, days: map });
};

exports.history = async (req, res) => {
  const { habitId } = req.params;

  const habit = await Habit.findById(habitId).select("checkins");
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  const checkins = Array.isArray(habit.checkins) ? habit.checkins : [];
  const byMonth = {};

  for (const c of checkins) {
    if (!c?.date) continue;
    const month = c.date.slice(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { month, done: 0, total: 0 };

    byMonth[month].total++;
    if (isDoneCheckin(c)) byMonth[month].done++;
  }

  const items = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  res.json({ habitId, items });
};

exports.streaks = async (req, res) => {
  const { habitId } = req.params;

  const habit = await Habit.findById(habitId).select("checkins");
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  const checkins = (habit.checkins || [])
    .filter(c => c?.date && isDoneCheckin(c))
    .map(c => c.date)
    .sort(); 

  const set = new Set(checkins);

  let best = 0;
  let current = 0;

  for (const d of checkins) {
    const prev = new Date(d + "T00:00:00");
    prev.setDate(prev.getDate() - 1);
    const prevIso = toISODate(prev);

    if (!set.has(prevIso)) {
      let len = 1;
      let cur = new Date(d + "T00:00:00");

      while (true) {
        cur.setDate(cur.getDate() + 1);
        const curIso = toISODate(cur);
        if (!set.has(curIso)) break;
        len++;
      }

      if (len > best) best = len;
    }
  }

  const today = new Date();
  const todayIso = toISODate(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yIso = toISODate(yesterday);

  let startIso = null;
  if (set.has(todayIso)) startIso = todayIso;
  else if (set.has(yIso)) startIso = yIso;

  if (startIso) {
    let cur = new Date(startIso + "T00:00:00");
    while (true) {
      const curIso = toISODate(cur);
      if (!set.has(curIso)) break;
      current++;
      cur.setDate(cur.getDate() - 1);
    }
  }

  res.json({ habitId, best, current });
};

exports.trend = async (req, res) => {
  const { habitId } = req.params;
  const days = Math.max(1, Math.min(parseInt(req.query.days || "30", 10), 365));

  const habit = await Habit.findById(habitId).select("checkins");
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  const checkins = Array.isArray(habit.checkins) ? habit.checkins : [];
  const map = {};
  for (const c of checkins) {
    if (!c?.date) continue;
    map[c.date] = isDoneCheckin(c) ? 1 : 0;
  }

  const points = [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = toISODate(d);
    points.push({ date: iso, done: map[iso] ?? 0 });
  }

  res.json({ habitId, days, points });
};