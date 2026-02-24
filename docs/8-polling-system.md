# Polling & Scheduling System - Automated Monitoring

## Overview

The polling system is the engine behind Mammon's automated features. It runs in the background — no user commands needed — and handles three jobs:

| System | Schedule | What It Does |
|--------|----------|-------------|
| **Activity Monitor** | Every 5 minutes | Checks for new LeetCode submissions, posts victory announcements |
| **Daily Recap** | 9 AM | Posts "Top Grinders of Yesterday" with medal rankings |
| **Streak Nudge** | 8 PM | Warns users whose active streaks are at risk |

All three systems are defined in `services/poller.js` and started from `index.js` when the bot connects to Discord.

---

## How It's Started

When the bot is ready, `index.js` calls both functions:

```javascript
import { startPoller, startScheduler } from './services/poller.js';

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    startPoller(readyClient);    // Victory announcements every 5 min
    startScheduler(readyClient); // Daily recap (9 AM) & streak nudge (8 PM)
});
```

---

## System 1: Activity Monitor (Victory Announcements)

### The Problem

LeetCode doesn't send webhooks. There's no way for LeetCode to tell our bot "hey, someone solved a problem." So we **poll** — check periodically.

### The Solution

Every 5 minutes, the bot:

```
1. Get all tracked users from the database
   └→ getAllTrackedUsers()

2. Group users by LeetCode username
   └→ One API call per unique username (deduplication)

3. For each username, fetch recent submissions
   └→ getRecentSubmissions(username, 10)

4. Compare timestamps against what we've seen before
   └→ user.last_submission_timestamp

5. If new "Accepted" submissions found:
   a) Save to solved_problems table (deduplication)
   b) Get problem difficulty
   c) Post victory announcement in log channel
   d) Update user's cached stats
```

### First Poll (Baseline)

When a user is first tracked (either via `/link` or the first time the poller sees them), the bot sets their `last_submission_timestamp` to their most recent submission. This prevents announcing old problems they already solved.

### Victory Announcement

When a new solve is detected, the bot posts an embed like:

```
🔥 @User just crushed a Medium problem: Two Sum!
Total Solved: 142

Language: javascript
```

The embed is color-coded by difficulty:
- **Easy**: Green (#00B8A3)
- **Medium**: Yellow (#FFC01E)
- **Hard**: Red (#FF375F)

### Rate Limiting

To avoid getting IP-banned by LeetCode:
- **2-second delay** between API calls for different users
- Users are **grouped by LeetCode username** — if the same person is tracked in 3 guilds, only 1 API call is made
- Only the 10 most recent submissions are fetched per user

### Code Flow

```javascript
// Starts the polling loop
export function startPoller(client) {
    setTimeout(() => pollAllUsers(client), 15_000);  // First poll after 15s
    setInterval(() => pollAllUsers(client), 5 * 60 * 1000);  // Then every 5 min
}

// Polls all tracked users
async function pollAllUsers(client) {
    const users = getAllTrackedUsers();
    
    // Group by username for deduplication
    const usersByUsername = {};
    for (const user of users) {
        if (!usersByUsername[user.leetcode_username]) {
            usersByUsername[user.leetcode_username] = [];
        }
        usersByUsername[user.leetcode_username].push(user);
    }
    
    for (const [username, entries] of Object.entries(usersByUsername)) {
        const submissions = await getRecentSubmissions(username, 10);
        
        for (const user of entries) {
            await processUserSubmissions(client, user, submissions);
        }
        
        await sleep(2000);  // Rate limit protection
    }
}
```

---

## System 2: Daily Recap (9 AM)

Every morning, the bot posts a summary of yesterday's activity in each guild's log channel.

### How It Works

```
1. Check every minute if it's between 9 AM and noon
2. For each guild with a log channel set:
   a) Query solved_problems for yesterday's date range
   b) Count problems solved per user
   c) Sort by count (descending)
   d) Post top 10 with medals
```

### Example Output

```
📊 Top Grinders of Yesterday

🥇 @User1 — 5 problems solved
🥈 @User2 — 3 problems solved
🥉 @User3 — 2 problems solved
4. @User4 — 1 problem solved

Keep grinding! 💪
```

### The Query

```javascript
export function getYesterdaySolvers(guildId) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
    const startOfYesterday = startOfToday - 86400;  // 24 hours in seconds

    const stmt = db.prepare(`
        SELECT discord_id, COUNT(*) as count 
        FROM solved_problems 
        WHERE guild_id = ? AND solved_at >= ? AND solved_at < ?
        GROUP BY discord_id
        ORDER BY count DESC
        LIMIT 10
    `);
    return stmt.all(guildId, startOfYesterday, startOfToday);
}
```

---

## System 3: Streak Nudge (8 PM)

In the evening, the bot checks if users with active streaks haven't solved anything today. If so, it posts a warning.

### How It Works

```
1. Check every minute if it's between 8 PM and 11 PM
2. For each guild with a log channel set:
   a) Get all tracked users
   b) Fetch their LeetCode profile (for current streak)
   c) Check if they've solved anything today
   d) If streak > 0 and today's solves = 0, they're "at risk"
   e) Post warning for all at-risk users
```

### Example Output

```
🔔 Streak Protection Alert

⚠️ @User1 — 7-day streak at risk!
⚠️ @User2 — 14-day streak at risk!

Solve a problem today to keep your streak alive!
```

### The Query

```javascript
export function getTodaySolveCount(discordId, guildId) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

    const stmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM solved_problems 
        WHERE discord_id = ? AND guild_id = ? AND solved_at >= ?
    `);
    const row = stmt.get(discordId, guildId, startOfToday);
    return row ? row.count : 0;
}
```

---

## Prerequisite: `/setchannel`

None of the automated systems will post anything until a log channel is set. An admin must run:

```
/setchannel #leetcode-feed
```

This stores the channel ID in the `guild_settings` table. The poller and scheduler check for this channel before posting.

---

## Database Tables Used

The polling system relies on these tables:

| Table | Used For |
|-------|----------|
| `users` | Get tracked users, store `last_submission_timestamp` |
| `guild_settings` | Get `log_channel_id` for each guild |
| `solved_problems` | Deduplicate announcements, daily recap, streak check |

### Key Columns in `users`

| Column | Purpose |
|--------|---------|
| `last_submission_timestamp` | The newest submission timestamp we've seen — anything newer is a "new solve" |
| `total_solved` | Cached total (updated by poller after fetching profile) |
| `current_streak` | Cached streak (updated by poller) |

---

## Scaling Considerations

### The Rate Limit Problem

If the bot grows to 1,000 users, that's 1,000 API calls every 5 minutes. LeetCode may rate-limit or IP-ban.

### Solutions Implemented

1. **Username deduplication** — Same user in multiple guilds = 1 API call
2. **2-second delay** between API calls (staggering)
3. **Only 10 recent submissions** fetched per poll (minimal data)

### Future Improvements (Lazy Polling)

For larger scale, consider:

```javascript
// Only poll users active in Discord in the last 48 hours
const activeUsers = getAllTrackedUsers().filter(user => {
    const lastActive = getLastDiscordActivity(user.discord_id);
    return (Date.now() - lastActive) < 48 * 60 * 60 * 1000;
});
```

---

## Debugging

### Check if the poller is running

Look for these log messages when the bot starts:

```
[Poller] Activity monitor started (every 5 minutes)
[Scheduler] Daily recap (9 AM) & streak nudge (8 PM) scheduled
```

### Check poll results

Every 5 minutes you'll see:

```
[Poller] Checking 3 tracked user(s)...
[Poller] Set baseline for john_doe in guild 987654321
```

### Nothing posting?

Common issues:
1. **No log channel set** — Run `/setchannel` first
2. **No tracked users** — Someone needs to `/link` their account
3. **Baseline not set yet** — First poll only sets the baseline, doesn't announce
4. **User hasn't solved anything new** — Wait for actual new submissions

---

## Architecture Diagram

```
                    ┌─────────────┐
                    │  index.js   │
                    │  (on ready) │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      startPoller()            startScheduler()
              │                         │
    ┌─────────┴─────────┐    ┌─────────┴──────────┐
    │  Every 5 minutes  │    │  Every 1 minute     │
    │                   │    │  check clock         │
    │  pollAllUsers()   │    │                     │
    │    │              │    │  9 AM? → recap      │
    │    ├── fetch subs │    │  8 PM? → nudge      │
    │    ├── compare ts │    └─────────────────────┘
    │    ├── announce   │
    │    └── save to DB │
    └───────────────────┘
```

---

## Next Steps

- **Want to understand the commands?** → [Command System](./3-command-system.md)
- **How does the LeetCode API work?** → [GraphQL Integration](./6-graphql-integration.md)
- **Where is the data stored?** → [Database System](./7-database-system.md)
- **Overall project structure?** → [Project Architecture](./2-project-architecture.md)
