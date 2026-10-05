# Turning on online leaderboards

The game ships with all the leaderboard code. It only needs somewhere to store scores. A free Supabase project is enough, and setup takes about 5 minutes.

1. **Create a project** at <https://supabase.com>. The free tier is fine, and you can pick any name and password.
2. **Create the table.** In the project, open **SQL Editor → New query**, paste the contents of [`tools/leaderboard.sql`](tools/leaderboard.sql) and click **Run**.
3. **Copy your keys.** Go to **Project Settings → API** and copy:
   - the **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - the **anon public** key (a long string). It's designed to be public, so it's safe to put in the website.
4. **Paste them into `leaderboard.json`** in this repo:
   ```json
   { "url": "https://abcd1234.supabase.co", "anonKey": "eyJhbGciOi..." }
   ```
5. **Commit and push.** The site redeploys, and the **🌍 Leaderboards** button starts showing live scores.

## How it works

- Scores are posted at the end of **Daily Challenge**, **Weekly Event** and **Live Event** runs, but only if the player has set a name on the Leaderboards screen.
- **Boards:**
  - Each day has its own board (`daily-YYYY-MM-DD`).
  - Each week has its own board (`week-N`).
  - Each live event in `events.json` has its own board (`live-<id>`).
- **Score** is calculated as bosses × 10,000 + realms reached × 2,500 + kills × 2 + level × 25.
- **Database rules:**
  - Anyone can read scores and add scores within sane limits.
  - Nobody can edit or delete scores.
  - Moderate the table from the Supabase dashboard if needed.

> This is casual-game security: a determined player can post a fake score. If that becomes a problem, the next step is a Supabase Edge Function that checks runs before saving them.

To turn leaderboards off again, blank out `url` in `leaderboard.json`.
