/**
 * Scrapes Instagram follower counts via Apify Instagram Scraper actor.
 * Actor: apify/instagram-scraper
 * Cost: ~$2.70 per 1,000 results -- 34 accounts/day is basically free.
 *
 * Accepts EITHER an array of handle strings OR an array of client objects
 * ({ handle, clientName }). Each entry is normalized (strip @, trailing
 * slashes, whitespace) and de-duplicated (case-insensitive) before the
 * profile URLs are built, so a bad shape or an accidental repeat can no
 * longer break the Apify run.
 */
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = "apify~instagram-scraper";

// Pull a clean handle string out of whatever shape we were given.
function toHandle(entry) {
  const raw = typeof entry === "string" ? entry : (entry && entry.handle) || "";
  return String(raw).trim().replace(/^@/, "").replace(/\/+$/, "");
}

async function scrapeAll(clients) {
  // Normalize every entry to a clean handle, drop blanks, and de-duplicate.
  // Instagram handles are case-insensitive, so we dedupe on the lowercased key
  // but keep the original casing for display.
  const handles = [];
  const seen = new Set();
  for (const entry of clients) {
    const handle = toHandle(entry);
    if (!handle) continue;
    const key = handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    handles.push(handle);
  }

  // Build profile URLs for all clients
  const urls = handles.map((h) => `https://www.instagram.com/${h}/`);

  // Start the Apify actor run
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: urls,
        resultsType: "details",
        resultsLimit: 1,
      }),
    }
  );
  if (!runRes.ok) {
    throw new Error(`Apify run failed: ${await runRes.text()}`);
  }
  const { data: run } = await runRes.json();
  const runId = run.id;

  // Poll until the run finishes (max 5 minutes)
  let status = run.status;
  let attempts = 0;
  while (status !== "SUCCEEDED" && status !== "FAILED" && attempts < 60) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const { data } = await statusRes.json();
    status = data.status;
    attempts++;
  }
  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run did not succeed. Status: ${status}`);
  }

  // Fetch results from the dataset
  const datasetRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
  );
  const items = await datasetRes.json();

  // Map results back to our format, keyed by lowercase handle
  const resultMap = {};
  for (const item of items) {
    if (item.username) {
      resultMap[item.username.toLowerCase()] = item.followersCount ?? null;
    }
  }
  return handles.map((handle) => {
    const count = resultMap[handle.toLowerCase()] ?? null;
    return {
      username: handle,
      count,
      error: count === null ? "Not found in results" : null,
    };
  });
}

module.exports = { scrapeAll };
