# Mammon — LeetCode Discord Bot

A Discord bot that tracks LeetCode progress, celebrates problem-solving wins, and fosters friendly competition within your Discord community.

## Features

✨ **Track LeetCode Profiles** — Link your LeetCode account to your Discord profile  
🏆 **Daily Leaderboards** — Compete with friends; see who solved the most problems yesterday  
🔥 **Victory Announcements** — Get notified when server members solve new problems  
⏰ **Streak Nudges** — 8 PM daily reminder if your active streak is at risk  
📊 **Stats & Profiles** — View detailed LeetCode stats, difficulty breakdowns, and current streaks  
🎯 **Daily Problems** — Get the LeetCode problem of the day with difficulty and category

---

## Demo

Watch a quick demo of Mammon in action:

[![Mammon Demo](https://img.shields.io/badge/Watch-Demo%20Video-blue?style=for-the-badge)](https://www.loom.com/share/d2d106d7a12546b5b0de9e6c7529d981)

---

## Quick Start
# Quick Invite

[**Invite Mammon to your server**](https://discord.com/oauth2/authorize?client_id=1463814056287928466&permissions=2147502080&integration_type=0&scope=bot)

Or manually:

### Adding the Bot to Your Server

1. **Invite the bot:**
   - Visit the [Discord Developer Portal](https://discord.com/developers/applications)
   - Copy the OAuth2 invite URL or ask the bot owner for a direct invite link
   - Select your server and authorize

2. **Set up the log channel:**
   ```
   /setchannel #leetcode-feed
   ```
   This is where victory announcements, daily recaps, and streak nudges will be posted.

3. **Link your LeetCode account:**
   ```
   /link [your_leetcode_username]
   ```

4. **You're ready!** The bot will start tracking your submissions.

---

## Commands

| Command | Description |
|---------|-------------|
| `/link <username>` | Link your LeetCode account to your Discord profile |
| `/stats` | View your LeetCode stats (total solved, streak, difficulty breakdown) |
| `/leaderboard` | See who in the server has solved the most problems |
| `/daily` | Get today's LeetCode problem of the day |
| `/untrack` | Remove your account from tracking |
| `/list` | List all linked LeetCode accounts in the server |
| `/setchannel <channel>` | Set the channel for bot announcements (admin only) |
| `/mammon-help` | View all available commands |

---

## Automated Features

### Victory Announcements (Every 5 minutes)
When you solve a new LeetCode problem, the bot announces it in the log channel with:
- Your LeetCode profile picture
- Problem name and difficulty
- Your total solve count
- Programming language used

### Daily Recap (9 AM)
A leaderboard of the top problem-solvers from yesterday, with medal rankings.

### Streak Nudge (8 PM)
If you have an active streak and haven't solved a problem yet today, you'll get a nudge to keep it alive.

---

## Data Privacy & Disclaimer

### What Data We Collect

The bot stores the following information in a local SQLite database:

- **Discord ID** — Your Discord snowflake ID (permanent identifier)
- **LeetCode Username** — Your LeetCode profile username (entered by you)
- **Guild ID** — The Discord server you're in
- **Solved Problems** — Metadata about problems you've solved (title, slug, timestamp, difficulty)
- **Stats Cache** — Your total problems solved, current streak (cached from LeetCode)

### What We Do **NOT** Store

❌ Your Discord display name or avatar  
❌ Your LeetCode password or authentication tokens  
❌ Your email address  
❌ Personal information beyond username  
❌ Problem submissions or code  

### Data Retrieval

- **LeetCode Data:** Retrieved via the official [LeetCode GraphQL API](https://leetcode.com/graphql) (public, no authentication required)
- **Discord Data:** Limited to interaction metadata (user ID, guild ID)

### Data Deletion

To remove your data from the bot:
```
/untrack
```

This removes your linked account and stops all tracking. Historical solved problems remain in the database.

### Third-Party Services

- **LeetCode API** — We query public LeetCode data. See [LeetCode's Privacy Policy](https://leetcode.com/privacy/)
- **Railway** — The bot is hosted on Railway. See [Railway's Privacy Policy](https://railway.app/legal/privacy)

### Self-Hosting

If you're concerned about data privacy, you can **self-host** this bot:
1. Fork the repository
2. Deploy to your own server (Railway, Oracle Cloud, etc.)
3. Your data stays under your control
4. See [DOCUMENTATION_README.md](./DOCUMENTATION_README.md) for setup instructions

### Disclaimer

**This bot is provided as-is.** By using it:
- You acknowledge that solution submission data is cached and may persist in backups
- You consent to your LeetCode username and solved problem metadata being stored locally
- The bot owner is not liable for data loss or misuse
- For questions about data retention, email dannguyen2412005@gmail.com

---

## For Developers

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/dannguyen24/mammon.git
   cd mammon
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `config.json` (or use environment variables):
   ```json
   {
     "token": "YOUR_BOT_TOKEN",
     "clientId": "YOUR_CLIENT_ID"
   }
   ```

4. Register commands:
   ```bash
   node deploy-commands.js
   ```

5. Start the bot:
   ```bash
   node index.js
   ```

### Architecture

- **Commands** — Modular slash command handlers in `commands/`
- **Services** — Background polling, scheduling, and API integrations in `services/`
- **Database** — SQLite schema and query layer in `database/`
- **Docs** — Full technical documentation in `docs/`

See [DOCUMENTATION_README.md](./DOCUMENTATION_README.md) for detailed technical information.

### Deployment

The bot is deployed to **Railway** with automatic redeployment on git push. See [docs/2-project-architecture.md](./docs/2-project-architecture.md) for deployment details.

---

## Support & Contributing

- **Found a bug?** Open an issue on GitHub
- **Have a feature request?** Let me know!
- **Want to contribute?** Fork and submit a pull request

---

## License

This project is open source. Feel free to fork, modify, and self-host your own version.

---

**Made with ❤️ for competitive coders everywhere.**
