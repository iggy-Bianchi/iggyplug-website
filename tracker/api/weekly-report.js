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
const CRON_SECRET = process.env.CRON_SECRET;
const RESEND_KEY  = process.env.IGGYPLUG_RESEND_KEY;
const FROM_EMAIL  = "IggyPlug <iggy@iggyplug.com>";

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

async function redisGet(date) {
  const key = "iggyplug:counts:" + date;
  const res = await fetch(
    REDIS_URL + "/" + ["GET", key].map(encodeURIComponent).join("/"),
    { headers: { Authorization: "Bearer " + REDIS_TOKEN } }
  );
  const json = await res.json();
  if (!json.result) return null;
  try { return JSON.parse(json.result); } catch (e) { return null; }
}

function arrow(n) {
  if (n > 0) return '<span style="color:#1D9E75;">&#9650; +' + n + '</span>';
  if (n < 0) return '<span style="color:#D85A30;">&#9660; ' + n + '</span>';
  return '<span style="color:#888888;">&#8212; 0</span>';
}

function buildEmail(clientName, handle, rows) {
  const totalChange = rows.reduce(function(s, r) { return s + r.change; }, 0);
  const latestFollowers = rows.length ? rows[rows.length - 1].followers : 0;
  const changeSign = totalChange >= 0 ? "+" : "";

  const tableRows = rows.map(function(r) {
    return '<tr>' +
      '<td style="padding:8px 12px;font-size:13px;color:#555;border-bottom:1px solid #f0f0f0;">' + r.date + '</td>' +
      '<td style="padding:8px 12px;font-size:13px;text-align:right;border-bottom:1px solid #f0f0f0;">' + r.followers.toLocaleString() + '</td>' +
      '<td style="padding:8px 12px;font-size:13px;text-align:right;border-bottom:1px solid #f0f0f0;">' + arrow(r.change) + '</td>' +
      '</tr>';
  }).join("");

  const changeColor = totalChange >= 0 ? "#1D9E75" : "#D85A30";

  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px;">' +
    '<tr><td align="center">' +
    '<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">' +
    '<tr><td style="background:#0f0f0f;padding:28px 32px;">' +
    '<p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;">IggyPlug Growth Report</p>' +
    '<p style="margin:6px 0 0;font-size:22px;font-weight:600;color:#fff;">@' + handle + '</p>' +
    '<p style="margin:4px 0 0;font-size:14px;color:#aaa;">7-day summary</p>' +
    '</td></tr>' +
    '<tr><td style="padding:24px 32px 8px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="width:50%;padding-right:8px;"><div style="background:#f8f8f8;border-radius:8px;padding:16px 20px;">' +
    '<p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;">Total followers</p>' +
    '<p style="margin:6px 0 0;font-size:26px;font-weight:600;color:#111;">' + latestFollowers.toLocaleString() + '</p>' +
    '</div></td>' +
    '<td style="width:50%;padding-left:8px;"><div style="background:#f8f8f8;border-radius:8px;padding:16px 20px;">' +
    '<p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;">7-day change</p>' +
    '<p style="margin:6px 0 0;font-size:26px;font-weight:600;color:' + changeColor + ';">' + changeSign + totalChange + '</p>' +
    '</div></td>' +
    '</tr></table></td></tr>' +
    '<tr><td style="padding:20px 32px 8px;">' +
    '<p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#888;">Daily breakdown</p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">' +
    '<thead><tr style="background:#f8f8f8;">' +
    '<th style="padding:8px 12px;font-size:11px;font-weight:600;text-align:left;color:#888;text-transform:uppercase;">Date</th>' +
    '<th style="padding:8px 12px;font-size:11px;font-weight:600;text-align:right;color:#888;text-transform:uppercase;">Followers</th>' +
    '<th style="padding:8px 12px;font-size:11px;font-weight:600;text-align:right;color:#888;text-transform:uppercase;">Change</th>' +
    '</tr></thead>' +
    '<tbody>' + tableRows + '</tbody>' +
    '</table></td></tr>' +
    '<tr><td style="padding:24px 32px 32px;">' +
    '<p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">This report is sent every Monday by IggyPlug. Questions? Email <a href="mailto:iggy@iggyplug.com" style="color:#888;">iggy@iggyplug.com</a>.</p>' +
    '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + RESEND_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: to, subject: subject, html: html })
  });
  return res.ok;
}

module.exports = async function handler(req, res) {
  if (req.query.secret !== CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const dates = getPastDates(7);
  const results = { sent: [], skipped: [], errors: [] };

  const snapshots = {};
  for (var i = 0; i < dates.length; i++) {
    snapshots[dates[i]] = await redisGet(dates[i]);
  }

  for (var c = 0; c < CLIENTS.length; c++) {
    const client = CLIENTS[c];
    const handle = client.handle;
    const clientName = client.clientName;

    const rows = [];
    var prevCount = null;

    for (var d = 0; d < dates.length; d++) {
      const date = dates[d];
      const snap = snapshots[date];
      if (!snap) continue;
      const account = snap.find(function(r) { return r.username === handle; });
      if (!account || account.error) continue;

      const followers = account.count || 0;
      const change = prevCount !== null ? followers - prevCount : 0;
      prevCount = followers;

      rows.push({ date: date, followers: followers, change: change });
    }

    if (!rows.length) {
      results.skipped.push({ handle: handle, reason: "no data in Redis for last 7 days" });
      continue;
    }

    const subject = "IggyPlug weekly report -- @" + handle + " (last 7 days)";
    const html = buildEmail(clientName, handle, rows);

    try {
      const ok = await sendEmail([BRADLEY_EMAIL, TYLER_EMAIL], subject, html);
      if (ok) {
        results.sent.push(handle);
      } else {
        results.errors.push({ handle: handle, reason: "Resend returned non-200" });
      }
    } catch (err) {
      results.errors.push({ handle: handle, reason: err.message });
    }

    await new Promise(function(r) { setTimeout(r, 200); });
  }

  return res.status(200).json({
    date: getTodayStr(),
    sent: results.sent.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
    details: results
  });
};
