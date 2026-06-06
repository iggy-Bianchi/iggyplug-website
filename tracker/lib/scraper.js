const { ProxyAgent, fetch: undiciFetch } = require("undici");

const PROXIES = [
  "38.154.203.95:5863:hanflorw:b6wywpi2qksy",
  "198.105.121.200:6462:hanflorw:b6wywpi2qksy",
  "64.137.96.74:6641:hanflorw:b6wywpi2qksy",
  "209.127.138.10:5784:hanflorw:b6wywpi2qksy",
  "38.154.185.97:6370:hanflorw:b6wywpi2qksy",
  "84.247.60.125:6095:hanflorw:b6wywpi2qksy",
  "142.111.67.146:5611:hanflorw:b6wywpi2qksy",
  "191.96.254.138:6185:hanflorw:b6wywpi2qksy",
  "31.58.9.4:6077:hanflorw:b6wywpi2qksy",
  "104.239.107.47:5699:hanflorw:b6wywpi2qksy",
];

function getRandomProxy() {
  return PROXIES[Math.floor(Math.random() * PROXIES.length)];
}

async function getFollowerCount(username) {
  const proxyStr = getRandomProxy();
  const [host, port, user, pass] = proxyStr.split(":");
  const proxyUrl = `http://${user}:${pass}@${host}:${port}`;
  const dispatcher = new ProxyAgent(proxyUrl);

  try {
    const url = `https://www.instagram.com/${username}/`;
    const res = await undiciFetch(url, {
      dispatcher,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
    });

    if (!res.ok) {
      return { username, count: null, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
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

async function scrapeAll(clients) {
  const results = [];
  for (const username of clients) {
    const result = await getFollowerCount(username);
    results.push(result);
    await new Promise((r) => setTimeout(r, 3000));
  }
  return results;
}

module.exports = { getFollowerCount, scrapeAll };
