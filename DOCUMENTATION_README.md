# Discord Bot Documentation - Mammon (LeetCode Tracker)

## 📚 Documentation Structure

This documentation is organized into the following sections:

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

---

## 🚀 Quick Start

### Running the Bot
```bash
# Install dependencies
npm install

# Deploy slash commands to Discord
node deploy-commands.js

# Start the bot
node index.js
```

### File Structure
```
mammon/
├── index.js                 # Main bot entry point
├── deploy-commands.js       # Command registration script
├── config.json              # Bot credentials
├── commands/                # All slash commands
│   ├── leetcode/           # LeetCode-specific commands
│   │   ├── link.js         # Link Discord to LeetCode account
│   │   └── stats.js        # View LeetCode stats
│   └── utility/            # General utility commands
│       ├── ping.js         # Health check
│       └── user.js         # User info
├── services/
│   └── leetcode.js         # GraphQL API calls to LeetCode
├── database/
│   ├── init.js             # Database schema setup
│   └── queries.js          # Database query functions
└── node_modules/           # Dependencies
```

---

## 🔑 Key Features

- **Slash Commands**: Modern Discord command system with slash (`/`) interface
- **LeetCode Integration**: Fetch real-time LeetCode profile data via GraphQL API
- **User Linking**: Map Discord users to their LeetCode accounts
- **Statistics Tracking**: Display solving stats, streaks, and rankings
- **Local Database**: SQLite database for persistent user data

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
