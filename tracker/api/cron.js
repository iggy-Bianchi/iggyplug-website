/**
 * Vercel Cron Function -- runs daily at midnight UTC
 * Route: /api/cron
 *
 * Triggers: scrape all IG accounts, save to Redis, send email report.
 */

const { CLIENTS } = require("../lib/clients");
const { scrapeAll } = require("../lib/scraper");
const { saveSnapshot, getSnapshot, getTodayStr, getYesterdayStr } = require("../lib/redis");
const { sendReport } = require("../lib/email");

module.exports = async function handler(req, res) {
  // Protect the endpoint -- Vercel sends this header for cron jobs
  // Also allow a manual trigger via secret key for testing
  const authHeader = req.headers["authorization"];
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManual = req.query.secret === process.env.CRON_SECRET;

  if (!isVercelCron && !isManual) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  console.log(`[IggyPlug] Starting daily scrape for ${today}`);

  try {
    // Scrape all accounts
    const results = await scrapeAll(CLIENTS);
    console.log(`[IggyPlug] Scraped ${results.length} accounts`);

    // Save today's snapshot
    await saveSnapshot(today, results);

    // Get yesterday's data for delta calculation
    const previousResults = await getSnapshot(yesterday);

    // Send email report
    await sendReport(today, results, previousResults);

    console.log(`[IggyPlug] Report sent for ${today}`);

    return res.status(200).json({
      success: true,
      date: today,
      accounts: results.length,
      results,
    });
  } catch (err) {
    console.error("[IggyPlug] Cron error:", err);
    return res.status(500).json({ error: err.message });
  }
};
