/**
 * Sends the daily IggyPlug follower report via Resend.
 * Env vars required: RESEND_API_KEY, REPORT_EMAIL_TO, REPORT_EMAIL_FROM
 * RESEND_API_KEY is stored base64-encoded to prevent Vercel auto-redaction.
 */

function formatCount(n) {
  if (n === null || n === undefined) return "N/A";
  return n.toLocaleString("en-US");
}

function formatDelta(delta) {
  if (delta === null || delta === undefined) return "--";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("en-US")}`;
}

function getDeltaColor(delta) {
  if (delta === null || delta === undefined) return "#888888";
  if (delta > 0) return "#22c55e";
  if (delta < 0) return "#ef4444";
  return "#888888";
}

function buildEmailHTML(date, results, previousResults) {
  const prevMap = {};
  if (previousResults) {
    for (const r of previousResults) {
      prevMap[r.username] = r.count;
    }
  }

  const rows = results
    .map((r) => {
      const prev = prevMap[r.username] ?? null;
      const delta = r.count !== null && prev !== null ? r.count - prev : null;
      const deltaColor = getDeltaColor(delta);

      return `
      <tr style="border-bottom: 1px solid #1e1e1e;">
        <td style="padding: 10px 12px; font-family: monospace; color: #e2e8f0;">
          <a href="https://instagram.com/${r.username}" style="color: #a78bfa; text-decoration: none;">@${r.username}</a>
        </td>
        <td style="padding: 10px 12px; text-align: right; color: #e2e8f0; font-weight: 600;">
          ${r.error ? `<span style="color:#ef4444;">Error</span>` : formatCount(r.count)}
        </td>
        <td style="padding: 10px 12px; text-align: right; color: ${deltaColor}; font-weight: 600;">
          ${r.error ? "--" : formatDelta(delta)}
        </td>
      </tr>`;
    })
    .join("");

  const successCount = results.filter((r) => r.count !== null).length;
  const totalGain = results.reduce((sum, r) => {
    const prev = prevMap[r.username] ?? null;
    const delta = r.count !== null && prev !== null ? r.count - prev : 0;
    return sum + delta;
  }, 0);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <div style="margin-bottom:24px;">
      <h1 style="margin:0 0 4px;color:#a78bfa;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
        IggyPlug Daily Report
      </h1>
      <p style="margin:0;color:#6b7280;font-size:14px;">${date} -- ${successCount}/${results.length} accounts tracked</p>
    </div>

    <div style="background:#111;border:1px solid #1e1e1e;border-radius:8px;padding:16px;margin-bottom:24px;display:flex;gap:32px;">
      <div>
        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total Accounts</p>
        <p style="margin:0;color:#e2e8f0;font-size:28px;font-weight:700;">${results.length}</p>
      </div>
      <div>
        <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Net Followers Today</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:${getDeltaColor(totalGain)}">${formatDelta(totalGain)}</p>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;background:#111;border:1px solid #1e1e1e;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#1a1a1a;">
          <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Account</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Followers</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Change</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <p style="margin:24px 0 0;color:#374151;font-size:12px;text-align:center;">
      IggyPlug -- iggyplug.com -- Sent automatically at midnight daily
    </p>
  </div>
</body>
</html>`;
}

async function sendReport(date, results, previousResults) {
  const html = buildEmailHTML(date, results, previousResults);
  const RESEND_KEY = re_LFfhZD5i_CzLkrTigNTVLBPkJGMqxTK9n;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.REPORT_EMAIL_FROM || "onboarding@resend.dev",
      to: process.env.REPORT_EMAIL_TO,
      subject: `IggyPlug Daily Report -- ${date}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }

  return await res.json();
}

module.exports = { sendReport };
