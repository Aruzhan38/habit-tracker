const mongoose = require("mongoose");
const Habit = require("../models/habit");
const { enumerateDaysInclusive, normalizeToUTCStart } = require("../utils/date.util");

function assertObjectId(id, name) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error(`Invalid ${name}`);
    err.status = 400;
    throw err;
  }
}

function computeStreaks(daysList, completedSet) {
  let currentStreak = 0;
  let bestStreak = 0;
  let run = 0;

  for (const day of daysList) {
    const key = normalizeToUTCStart(day).getTime();
    if (completedSet.has(key)) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  for (let i = daysList.length - 1; i >= 0; i--) {
    const key = normalizeToUTCStart(daysList[i]).getTime();
    if (completedSet.has(key)) currentStreak += 1;
    else break;
  }

  return { currentStreak, bestStreak };
}

async function getOwnedHabitOrThrow(habitId, userId, select = "") {
  const habit = await Habit.findOne({ _id: habitId, user: userId }).select(select);
  if (!habit) {
    const err = new Error("Habit not found");
    err.status = 404;
    throw err;
  }
  return habit;
}

async function getHabitStats({ habitId, userId, from, to, fromStr, toStr }) {
  assertObjectId(habitId, "habitId");
  const habit = await getOwnedHabitOrThrow(habitId, userId, "completions");

  const days = enumerateDaysInclusive(from, to);

  const completedSet = new Set();
  let totalCompletions = 0;

  for (const c of habit.completions || []) {
    if (!c.completed) continue;

    const day = normalizeToUTCStart(new Date(c.date));
    const key = day.getTime();

    if (key < normalizeToUTCStart(from).getTime()) continue;
    if (key > normalizeToUTCStart(to).getTime()) continue;

    if (!completedSet.has(key)) {
      completedSet.add(key);
      totalCompletions += 1;
    }
  }

  const completionRate = days.length === 0 ? 0 : Number((totalCompletions / days.length).toFixed(2));
  const { currentStreak, bestStreak } = computeStreaks(days, completedSet);

  return {
    habitId,
    range: { from: fromStr, to: toStr },
    completionRate,
    currentStreak,
    bestStreak,
    totalCompletions,
  };
}

async function getOverviewStats({ userId, from, to, fromStr, toStr }) {
  const habits = await Habit.find({ user: userId }).select("completions");

  const days = enumerateDaysInclusive(from, to);
  const dayCount = days.length;

  let totalCompletions = 0;
  let habitsCount = habits.length;

  for (const h of habits) {
    const set = new Set();
    for (const c of h.completions || []) {
      if (!c.completed) continue;
      const key = normalizeToUTCStart(new Date(c.date)).getTime();
      if (key < normalizeToUTCStart(from).getTime()) continue;
      if (key > normalizeToUTCStart(to).getTime()) continue;
      set.add(key);
    }
    totalCompletions += set.size;
  }

  const denom = dayCount * habitsCount;
  const completionRate = denom === 0 ? 0 : Number((totalCompletions / denom).toFixed(2));

  return {
    range: { from: fromStr, to: toStr },
    habitsCount,
    totalCompletions,
    completionRate,
  };
}

module.exports = { getHabitStats, getOverviewStats };