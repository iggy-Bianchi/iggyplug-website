/**
 * Scrapes Instagram follower counts via Apify Instagram Scraper actor.
 * Actor: apify/instagram-scraper
 * Cost: ~$2.70 per 1,000 results -- 34 accounts/day is basically free.
 */

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = "apify~instagram-scraper";

async function scrapeAll(clients) {
  // Build profile URLs for all clients
  const urls = clients.map((u) => `https://www.instagram.com/${u}/`);

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

  // Map results back to our format
  const resultMap = {};
  for (const item of items) {
    if (item.username) {
      resultMap[item.username.toLowerCase()] = item.followersCount ?? null;
    }
  }

  return clients.map((username) => {
    const count = resultMap[username.toLowerCase()] ?? null;
    return {
      username,
      count,
      error: count === null ? "Not found in results" : null,
    };
  });
}

module.exports = { scrapeAll };
