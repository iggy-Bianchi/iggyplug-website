/**
 * Scrapes the public follower count for an Instagram username.
 * Uses Instagram's public page HTML -- no API key needed for public accounts.
 */
async function getFollowerCount(username) {
  try {
    const url = `https://www.instagram.com/${username}/`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
      },
    });

    if (!res.ok) {
      return { username, count: null, error: `HTTP ${res.status}` };
    }

    const html = await res.text();

    // Try multiple patterns Instagram has used over time
    const patterns = [
      /"edge_followed_by":\{"count":(\d+)\}/,
      /"followers":\{"count":(\d+)\}/,
      /,"followers_count":(\d+),/,
      /"follower_count":(\d+)/,
      /content="([\d,]+) Followers/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ""), 10);
        return { username, count, error: null };
      }
    }

    return { username, count: null, error: "Pattern not found" };
  } catch (err) {
    return { username, count: null, error: err.message };
  }
}

/**
 * Scrape all clients with a small delay between requests to avoid rate limiting.
 */
async function scrapeAll(clients) {
  const results = [];
  for (const username of clients) {
    const result = await getFollowerCount(username);
    results.push(result);
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1200));
  }
  return results;
}

module.exports = { getFollowerCount, scrapeAll };
