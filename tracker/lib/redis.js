/**
 * Upstash Redis via REST API -- no SDK needed, works in Vercel Edge/Node.
 * Env vars required: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

async function redisCmd(...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const res = await fetch(`${url}/${args.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  return json.result;
}

/**
 * Store today's snapshot for all clients.
 * Key format: iggyplug:counts:YYYY-MM-DD
 * Value: JSON array of { username, count, error }
 */
async function saveSnapshot(date, results) {
  const key = `iggyplug:counts:${date}`;
  await redisCmd("SET", key, JSON.stringify(results));
  // Keep 90 days of history
  await redisCmd("EXPIRE", key, 60 * 60 * 24 * 90);
}

/**
 * Get snapshot for a specific date.
 */
async function getSnapshot(date) {
  const key = `iggyplug:counts:${date}`;
  const raw = await redisCmd("GET", key);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Get yesterday's date string (YYYY-MM-DD) in US/Eastern.
 */
function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/**
 * Get today's date string (YYYY-MM-DD).
 */
function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

module.exports = { saveSnapshot, getSnapshot, getTodayStr, getYesterdayStr };
