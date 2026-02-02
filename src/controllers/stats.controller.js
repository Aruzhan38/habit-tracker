const statsService = require("../services/stats.service");

async function getHabitStats(req, res, next) {
  try {
    const { from, to } = req.statsRange;

    const data = await statsService.getHabitStats({
      habitId: req.params.habitId,
      userId: req.user.id,
      from,
      to,
      fromStr: req.query.from,
      toStr: req.query.to,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getOverview(req, res, next) {
  try {
    const { from, to } = req.statsRange;

    const data = await statsService.getOverviewStats({
      userId: req.user.id,
      from,
      to,
      fromStr: req.query.from,
      toStr: req.query.to,
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getHabitStats, getOverview };