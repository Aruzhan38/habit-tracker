const { parseISODateOnly } = require("../utils/date.util");

function validateStatsRange(req, res, next) {
  const from = parseISODateOnly(req.query.from);
  const to = parseISODateOnly(req.query.to);

  if (!from || !to) {
    return res.status(400).json({ message: "from and to are required in YYYY-MM-DD format" });
  }
  if (from.getTime() > to.getTime()) {
    return res.status(400).json({ message: "from must be <= to" });
  }

  req.statsRange = { from, to };
  return next();
}

module.exports = { validateStatsRange };