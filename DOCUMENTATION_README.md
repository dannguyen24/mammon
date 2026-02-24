# Discord Bot Documentation - Mammon (LeetCode Tracker)

## � For End Users

**New to the bot?** Start with [README.md](./README.md) for:
- Quick start guide
- Command reference  
- Data privacy & disclaimer
- Invite link

## 📚 Documentation Structure

This technical documentation is organized into the following sections:

### Core Concepts
1. **[Discord.js Fundamentals](./docs/1-discord-js-fundamentals.md)** - Learn what discord.js is and its core concepts
2. **[Project Architecture](./docs/2-project-architecture.md)** - Understand the overall structure and flow of the application

### Implementation Guides
3. **[Command System](./docs/3-command-system.md)** - How to create and understand Discord slash commands
4. **[Command Registration](./docs/4-command-registration.md)** - How commands are registered with Discord's API
5. **[Bot Connection](./docs/5-bot-connection.md)** - How the bot authenticates and connects to Discord servers

### Data & Integration
6. **[GraphQL Integration](./docs/6-graphql-integration.md)** - How the bot fetches LeetCode data using GraphQL
7. **[Database System](./docs/7-database-system.md)** - How user data is stored and managed locally

### Automation
8. **[Polling & Scheduling System](./docs/8-polling-system.md)** - Automated activity monitoring, victory announcements, daily recaps, and streak alerts

---

## 🚀 Quick Start

### Running Locally
```bash
# Install dependencies
npm install

# Deploy slash commands to Discord (globally)
node deploy-commands.js

# Start the bot
node index.js
```

### Deploying to Production (Railway)
The bot is configured for easy deployment to Railway:

1. Push code to GitHub
2. Connect GitHub repo to Railway project
3. Set environment variables in Railway dashboard:
   ```
   TOKEN=your_bot_token
   CLIENT_ID=your_client_id
   ```
4. Railway auto-deploys on push to main

See [README.md](./README.md) for user-facing documentation and quick start guide.

### File Structure
```
mammon/
├── index.js                 # Main bot entry point (starts poller & scheduler)
├── deploy-commands.js       # Global command registration script
├── config-loader.js         # Config management (JSON locally + env vars in prod)
├── config.json              # Bot credentials (local dev, in .gitignore)
├── commands/                # All slash commands
│   ├── leetcode/           # LeetCode-specific commands
│   │   ├── link.js         # Link Discord to LeetCode account
│   │   ├── stats.js        # View LeetCode stats
│   │   ├── leaderboard.js  # Server rankings by problems solved
│   │   ├── daily.js        # Today's LeetCode Daily Challenge
│   │   └── untrack.js      # Unlink account & stop tracking
│   └── utility/            # General utility commands
│       ├── ping.js         # Health check
│       ├── user.js         # User info
│       ├── mammon-help.js  # Categorized command guide
│       └── setchannel.js   # Set log channel for announcements
├── services/
│   ├── leetcode.js         # GraphQL API calls to LeetCode
│   └── poller.js           # Activity monitor, daily recap & streak alerts
├── database/
│   ├── init.js             # Database schema setup (3 tables)
│   └── queries.js          # Database query functions
└── node_modules/           # Dependencies
```

---

## 🔑 Key Features

### Milestone 1 — Profile Linking & Basic Commands
- **Slash Commands**: Modern Discord command system with slash (`/`) interface
- **LeetCode Integration**: Fetch real-time LeetCode profile data via GraphQL API
- **User Linking**: Map Discord users to their LeetCode accounts
- **Statistics Tracking**: Display solving stats, streaks, and rankings

### Milestone 2 — The "Hustle" Feed (Automated Updates)
- **Activity Monitor**: Polls LeetCode every 5 minutes for new submissions
- **Victory Announcements**: Auto-posts when a user solves a new problem (with difficulty, link, and total count)
- **Daily Recap (9 AM)**: Posts yesterday's "Top Grinders" with medal rankings
- **Streak Alerts (8 PM)**: Warns users whose streaks are at risk

### Milestone 3 — Social & Competitive Dynamics
- **Leaderboard**: `/leaderboard` ranks all server members by problems solved with live data
- **Daily Challenge**: `/daily` shows today's LeetCode problem with difficulty, tags, and acceptance rate

### Extra
- **Help Command**: `/mammon-help` lists all commands in categorized groups
- **Untrack Command**: `/untrack` lets users unlink and stop monitoring
- **Log Channel**: `/setchannel` designates where automated posts go
- **Local Database**: SQLite with 3 tables for users, guild settings, and solved problems

---

## 📖 How to Use This Documentation

**New to the bot?** Start with:
1. [Project Architecture](./docs/2-project-architecture.md) for an overview
2. [Discord.js Fundamentals](./docs/1-discord-js-fundamentals.md) to understand the framework

**Need to add a command?** Read:
1. [Command System](./docs/3-command-system.md) to learn the structure
2. [Command Registration](./docs/4-command-registration.md) to deploy it

**Working with LeetCode data?** See:
1. [GraphQL Integration](./docs/6-graphql-integration.md) for API details

**Want to understand the automated systems?** See:
1. [Polling & Scheduling System](./docs/8-polling-system.md) for the activity monitor, recaps, and streak alerts
2. [Database System](./docs/7-database-system.md) to store user data

---

## 🤖 Bot Commands Reference

### Utility Commands
- `/ping` - Check if bot is responsive

### LeetCode Commands
- `/link <username>` - Link your Discord account to a LeetCode profile
- `/stats [username]` - View your or someone's LeetCode statistics

---

## 🔗 External Resources

- [Discord.js Documentation](https://discord.js.org)
- [Discord Developer Portal](https://discord.com/developers)
- [LeetCode API Docs](https://leetcode.com/graphql)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

**Last Updated**: February 2026
