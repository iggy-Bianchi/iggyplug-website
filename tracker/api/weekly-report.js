/**
 * api/weekly-report.js
 *
 * Vercel cron endpoint -- fires every Monday at 9am ET (14:00 UTC).
 * For each client in clients.js it:
 *   1. Pulls the last 7 daily snapshots from Redis
 *   2. Builds a clean HTML email showing their follower trend
 *   3. Sends it to Bradley + Tyler only -- Tyler forwards to the client
 *
 * Manual trigger (for testing):
 *   GET /api/weekly-report?secret=YOUR_CRON_SECRET
 */

const { CLIENTS, TYLER_EMAIL, BRADLEY_EMAIL } = require("../lib/clients");

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const RESEND_KEY  = process.env.RESEND_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const FROM_EMAIL  = "IggyPlug <onboarding@resend.dev>";

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getPastDates(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Key format matches cron.js: iggyplug:counts:YYYY-MM-DD
// Each snapshot is an array of { username, count, error }
async function redisGet(date) {
  const key = `iggyplug:counts:${date}`;
  const res = await fetch(
    `${REDIS_URL}/${["GET", key].map(encodeURIComponent).join("/")}`,
    { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } }
  );
  const json = await res.json();
  if (!json.result) return null;
  try { return JSON.parse(json.result); } catch { return null; }
}

function arrow(n) {
  if (n > 0) return `<span style="color:#1D9E75;">&#9650; +${n}</span>`;
  if (n < 0) return `<span style="color:#D85A30;">&#9660; ${n}</span>`;
  return `<span style="color:#888888;">&#8212; 0</span>`;
}

function buildEmail(clientName, handle, rows) {
  const totalChange = rows.reduce((s, r) => s + r.change, 0);
  const latestFollowers = rows.length ? rows[rows.length - 1].followers : 0;
  const changeSign = totalChange >= 0 ? "+" : "";

  const tableRows = rows.map(r => `
    <tr>
      <td style="padding:8px 12px; font-size:13px; color:#555; border-bottom:1px solid #f0f0f0;">${r.date}</td>
      <td style="padding:8px 12px; font-size:13px; text-align:right; font-variant-numeric:tabular-nums; border-bottom:1px solid #f0f0f0;">${r.followers.toLocaleString()}</td>
      <td style="padding:8px 12px; font-size:13px; text-align:right; border-bottom:1px solid #f0f0f0;">${arrow(r.change)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0f0f0f;padding:28px 32px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;">IggyPlug Growth Report</p>
            <p style="margin:6px 0 0;font-size:22px;font-weight:600;color:#ffffff;">@${handle}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#aaaaaa;">7-day summary</p>
          </td>
        </tr>

        <!-- Summary cards -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;padding-right:8px;">
                  <div style="background:#f8f8f8;border-radius:8px;padding:16px 20px;">
                    <p style="margin:0;font-size:11px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">Total followers</p>
                    <p style="margin:6px 0 0;font-size:26px;font-weight:600;color:#111;">${latestFollowers.toLocaleString()}</p>
                  </div>
                </td>
                <td style="width:50%;padding-left:8px;">
                  <div style="background:#f8f8f8;border-radius:8px;padding:16px 20px;">
                    <p style="margin:0;font-size:11px;color:#888;letter-spacing:0.06em;text-transform:uppercase;">7-day change</p>
                    <p style="margin:6px 0 0;font-size:26px;font-weight:600;color:${totalChange >= 0 ? '#1D9E75' : '#D85A30'};">${changeSign}${totalChange}</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Daily breakdown table -->
        <tr>
          <td style="padding:20px 32px 8px;">
            <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#888;">Daily breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f8f8f8;">
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;text-align:left;color:#888;letter-spacing:0.05em;text-transform:uppercase;">Date</th>
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;text-align:right;color:#888;letter-spacing:0.05em;text-transform:uppercase;">Followers</th>
                  <th style="padding:8px 12px;font-size:11px;font-weight:600;text-align:right;color:#888;letter-spacing:0.05em;text-transform:uppercase;">Change</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px 32px;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
              This report is sent every Monday by IggyPlug. Data is pulled nightly at 12am.
              Questions? Reply to this email or reach out at <a href="mailto:iggy@iggyplug.com" style="color:#888;">iggy@iggyplug.com</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to, cc, subject, html) {
  const RESEND_KEY_DECODED = Buffer.from(RESEND_KEY, "base64").toString("utf8");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY_DECODED}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, cc, subject, html }),
  });
  return res.ok;
}

module.exports = async function handler(req, res) {
  if (req.query.secret !== CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const dates = getPastDates(7);
  const results = { sent: [], skipped: [], errors: [] };

  // Pre-fetch all 7 snapshots once to avoid redundant Redis calls
  const snapshots = {};
  for (const date of dates) {
    snapshots[date] = await redisGet(date);
  }

  for (const client of CLIENTS) {
    const { handle, clientName } = client;

    const rows = [];
    let prevCount = null;

    for (const date of dates) {
      const snap = snapshots[date];
      if (!snap) continue;
      // cron.js saves { username, count, error }
      const account = snap.find(r => r.username === handle);
      if (!account || account.error) continue;

      const followers = account.count || 0;
      const change = prevCount !== null ? followers - prevCount : 0;
      prevCount = followers;

      rows.push({ date, followers, change });
    }

    if (!rows.length) {
      results.skipped.push({ handle, reason: "no data in Redis for last 7 days" });
      continue;
    }

    const subject = `IggyPlug weekly report — @${handle} (last 7 days)`;
    const html = buildEmail(clientName, handle, rows);

    try {
      const ok = await sendEmail(
        [BRADLEY_EMAIL, TYLER_EMAIL],
        [],
        subject,
        html
      );
      if (ok) {
        results.sent.push(handle);
      } else {
        results.errors.push({ handle, reason: "Resend returned non-200" });
      }
    } catch (err) {
      results.errors.push({ handle, reason: err.message });
    }

    await new Promise(r => setTimeout(r, 200));
  }

  return res.status(200).json({
    date: getTodayStr(),
    sent: results.sent.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
    details: results,
  });
};
