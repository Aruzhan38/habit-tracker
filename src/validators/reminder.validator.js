function validateCreateReminder(req, res, next) {
  const { time, daysOfWeek = [], enabled = true, note = "" } = req.body;

  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ message: "time must be in HH:mm format" });
  }

  if (!Array.isArray(daysOfWeek) || !daysOfWeek.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    return res.status(400).json({ message: "daysOfWeek must be array of integers 0..6" });
  }

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be boolean" });
  }

  if (typeof note !== "string") {
    return res.status(400).json({ message: "note must be string" });
  }

  return next();
}

module.exports = { validateCreateReminder };