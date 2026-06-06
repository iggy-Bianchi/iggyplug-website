# IggyPlug IG Tracker

Daily Instagram follower tracker for IggyPlug clients. Runs at midnight, scrapes all accounts, saves to Redis, and emails you a report with follower counts and daily deltas.

## Stack

- **Vercel** -- hosting + cron job
- **Upstash Redis** -- stores 90 days of daily snapshots
- **Resend** -- sends the daily email report
- No npm dependencies -- uses native fetch throughout

## Setup

### 1. Create a new GitHub repo and push this code

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/iggyplug-tracker.git
git push -u origin main
```

### 2. Deploy to Vercel

Go to vercel.com, click "Add New Project," import the repo. Vercel will auto-detect it.

### 3. Add Environment Variables in Vercel

In your Vercel project settings under "Environment Variables," add:

| Variable | Value |
|---|---|
| `UPSTASH_REDIS_REST_URL` | From your Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | From your Upstash dashboard |
| `RESEND_API_KEY` | From resend.com |
| `REPORT_EMAIL_TO` | Your email address |
| `REPORT_EMAIL_FROM` | e.g. `IggyPlug <reports@iggyplug.com>` |
| `CRON_SECRET` | Any strong random string you make up |

### 4. Verify Upstash

You can reuse the same Upstash instance from iamdoomsayer.com -- just grab the REST URL and token from the Upstash dashboard. The keys are namespaced under `iggyplug:` so there's no collision.

### 5. Verify the cron is registered

In your Vercel dashboard, go to your project and click the "Cron Jobs" tab. You should see `/api/cron` scheduled at `0 5 * * *` (midnight US Central = 5am UTC).

### 6. Test it manually

Trigger a manual run by hitting:

```
https://your-vercel-domain.vercel.app/api/cron?secret=YOUR_CRON_SECRET
```

You should get a JSON response with all accounts and receive an email.

## Adding/Removing Clients

Edit `lib/clients.js` -- just add or remove usernames from the array and push to GitHub. Vercel will redeploy automatically.

## Viewing Historical Data

```
https://your-vercel-domain.vercel.app/api/data?date=2025-06-01&secret=YOUR_CRON_SECRET
```

Returns the raw JSON snapshot for any date in the last 90 days.

## Cron Schedule

`0 5 * * *` = 5:00 AM UTC = midnight US Central. Adjust in `vercel.json` if needed.

## Notes on Scraping

The scraper fetches public Instagram profile pages and parses follower counts from the HTML. This works for public accounts with no API key needed. Instagram occasionally changes their HTML structure -- if counts come back as errors, the patterns in `lib/scraper.js` may need updating.
