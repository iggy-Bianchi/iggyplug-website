/**
 * API route to fetch stored snapshots for a given date.
 * Route: /api/data?date=YYYY-MM-DD&secret=YOUR_SECRET
 */

const { getSnapshot, getTodayStr } = require("../lib/redis");

module.exports = async function handler(req, res) {
  const { date, secret } = req.query;

  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const targetDate = date || getTodayStr();
  const snapshot = await getSnapshot(targetDate);

  if (!snapshot) {
    return res.status(404).json({ error: `No data found for ${targetDate}` });
  }

  return res.status(200).json({ date: targetDate, results: snapshot });
};
