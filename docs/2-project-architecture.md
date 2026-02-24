# Project Architecture - Mammon Bot

## Overview

The Mammon bot is structured as a modular, event-driven Discord bot that fetches LeetCode user data and stores it locally.

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User uses a slash command in Discord                         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ Discord sends InteractionCreate event to bot (via WebSocket)  │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ Bot's Event Handler (index.js) receives the interaction       │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ Bot loads command from Collection and executes it             │
└────────────────────┬─────────────────────────────────────────┘
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
┌──────────────────┐   ┌────────────────────┐
│ Simple Command   │   │ Complex Command    │
│ (e.g., /ping)    │   │ (e.g., /link)      │
│ Direct Reply     │   │ Call Services      │
└──────────────────┘   └────┬───────────────┘
        ↓                    ↓
        │         ┌──────────┴──────────────┐
        │         ↓                         ↓
        │   ┌──────────────┐      ┌─────────────────┐
        │   │ GraphQL API  │      │ Database Quer   │
        │   │ to LeetCode  │      │ (Store User     │
        │   └──────────────┘      │ Mappings)       │
        │         ↓                └─────────────────┘
        │   ┌──────────────┐
        │   │ Get User     │
        │   │ Profile Data │
        │   └──────────────┘
        ↓         ↓
        └────┬────┘
             ↓
    ┌────────────────────┐
    │ Create Embed with  │
    │ formatted response  │
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Reply to Discord   │
    │ with Embed         │
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Discord shows      │
    │ message to user    │
    └────────────────────┘
```

---

## Directory Structure

```
mammon/
│
├── index.js                          # MAIN FILE: Bot entry point
│                                      # - Creates Discord client
│                                      # - Loads all commands
│                                      # - Listens to InteractionCreate events
│                                      # - Starts poller & scheduler on ready
│                                      # - Handles errors
│
├── deploy-commands.js                # DEPLOYMENT: Register commands with Discord
│                                      # - Reads all commands from folders
│                                      # - Sends them to Discord API
│                                      # - Makes `/` commands appear in Discord
│
├── config-loader.js                 # CONFIG MANAGEMENT
│                                      # - Loads config.json locally (dev)
│                                      # - Falls back to env vars (Railway/prod)
│                                      # - Exports: token, clientId
│
├── config.json                       # CREDENTIALS (local dev only, gitignored)
│                                      # - Discord bot token
│                                      # - Client ID
│
├── commands/                         # ALL SLASH COMMAND DEFINITIONS
│   ├── leetcode/                     # LeetCode-specific functionality
│   │   ├── link.js                   # Link Discord → LeetCode account
│   │   ├── stats.js                  # Display LeetCode statistics
│   │   ├── leaderboard.js            # Server rankings by problems solved
│   │   ├── daily.js                  # Today's LeetCode Daily Challenge
│   │   └── untrack.js                # Unlink account & stop tracking
│   │
│   └── utility/                      # General bot commands
│       ├── ping.js                   # Health check (hello bot!)
│       ├── user.js                   # Get user info
│       ├── mammon-help.js            # Categorized command guide
│       └── setchannel.js             # Set log channel for announcements
│
├── services/                         # EXTERNAL API & AUTOMATION
│   ├── leetcode.js                   # LeetCode GraphQL queries & fetching
│   │                                  # - Fetch user profiles
│   │                                  # - Get recent submissions
│   │                                  # - Get daily challenge
│   │                                  # - Get problem difficulty
│   │
│   └── poller.js                     # Automated monitoring & scheduling
│                                      # - Activity monitor (every 5 min)
│                                      # - Victory announcements
│                                      # - Daily recap (9 AM)
│                                      # - Streak nudge (8 PM)
│
├── database/                         # DATA PERSISTENCE (SQLite)
│   ├── init.js                       # Create database tables on startup
│   │                                  # - users table
│   │                                  # - guild_settings table
│   │                                  # - solved_problems table
│   └── queries.js                    # SQL helper functions
│                                      # - User CRUD operations
│                                      # - Guild settings
│                                      # - Polling & tracking queries
│                                      # - Solved problems tracking
│
└── leetcode_tracker.db              # ACTUAL DATABASE FILE
                                      # - Stores Discord ↔ LeetCode mappings
                                      # - Guild settings (log channels)
                                      # - Individual solved problems
```

---

## Key Components Explained

### 1. **index.js** - The Heart of the Bot

**Purpose**: Connect to Discord and handle all interactions

**What it does**:
1. Imports discord.js and configuration
2. Creates a Discord client with required intents
3. Loads all command files from `commands/` folders
4. Stores them in a Collection
5. Listens for `InteractionCreate` events
6. Fetches and executes the appropriate command

```javascript
// Simplified flow in index.js
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Load commands
client.commands = new Collection();
// ... loop through files and add them

// Listen for interactions
client.on(Events.InteractionCreate, async (interaction) => {
    const command = client.commands.get(interaction.commandName);
    await command.execute(interaction);
});

// Connect to Discord
client.login(token);
```

---

### 2. **deploy-commands.js** - Registering Commands

**Purpose**: Tell Discord what slash commands exist

**What it does**:
1. Reads all command files (same as index.js)
2. Extracts the `data.toJSON()` from each
3. Sends them to Discord's API via REST
4. Makes the `/` commands appear in Discord

**When to run**: After creating or modifying commands
```bash
node deploy-commands.js
```

---

### 3. **commands/** - Where Commands Live

Each command is a module with:
- **data**: `SlashCommandBuilder` describing the command
- **execute**: Async function that runs when command is used

#### Structure:
```
commands/
├── leetcode/
│   ├── link.js          → /link <username>
│   ├── stats.js         → /stats [@user]
│   ├── leaderboard.js   → /leaderboard
│   ├── daily.js         → /daily
│   └── untrack.js       → /untrack
└── utility/
    ├── ping.js          → /ping
    ├── user.js          → /user
    ├── mammon-help.js   → /mammon-help
    └── setchannel.js    → /setchannel
```

#### Example Command Template:
```javascript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('example')
        .setDescription('What the command does'),
    
    async execute(interaction) {
        // Your code here
        await interaction.reply('Response');
    }
};
```

---

### 4. **services/leetcode.js** - External API Integration

**Purpose**: Handle all LeetCode API calls

**What it does**:
1. Defines GraphQL queries for LeetCode
2. Fetches user profile data
3. Gets recent submissions
4. Gets today's daily challenge problem
5. Gets problem difficulty by slug
6. Handles API errors gracefully

**How it's used**:
```javascript
import { getUserProfile, getDailyProblem } from '../../services/leetcode.js';

const profile = await getUserProfile('john_doe');
// Returns: { username, realName, ranking, avatar, stats, currentStreak }

const daily = await getDailyProblem();
// Returns: { title, link, difficulty, tags, acceptanceRate }
```

---

### 4b. **services/poller.js** - Automated Monitoring

**Purpose**: Background systems that run on timers (no user interaction needed)

**Three automated systems**:
1. **Activity Monitor** (every 5 min) — Checks each tracked user's recent LeetCode submissions and posts victory announcements in the guild's log channel
2. **Daily Recap** (9 AM) — Posts "🏆 Top Grinders of Yesterday" showing who solved the most problems
3. **Streak Nudge** (8 PM) — Warns users whose active streaks are at risk if they haven't solved anything today

**Started from index.js**:
```javascript
import { startPoller, startScheduler } from './services/poller.js';

client.once(Events.ClientReady, (readyClient) => {
    startPoller(readyClient);
    startScheduler(readyClient);
});
```

---

### 5. **database/** - Local Data Storage

**Purpose**: Store user mappings, guild settings, and solved problem history

**Files**:
- **init.js**: Creates the database schema on first run (3 tables + migrations)
- **queries.js**: Helper functions to query the database

**Tables**:
```
users table:                                    guild_settings table:
┌────────────┬────────────┬────────────┐   ┌───────────┬───────────────┐
│ discordId  │ guildId    │ username   │   │ guild_id  │ log_channel_id│
├────────────┼────────────┼────────────┤   ├───────────┼───────────────┤
│ 123456789  │ 987654321  │ john_doe   │   │ 987654321 │ 111222333     │
│ 111111111  │ 987654321  │ jane_smith │   └───────────┴───────────────┘
└────────────┴────────────┴────────────┘

solved_problems table:
┌────────────┬────────────┬────────────┬────────────┐
│ discord_id │ guild_id   │ problem    │ difficulty │
├────────────┼────────────┼────────────┼────────────┤
│ 123456789  │ 987654321  │ Two Sum    │ Easy       │
│ 123456789  │ 987654321  │ Add Two #s │ Medium     │
└────────────┴────────────┴────────────┴────────────┘
```

**How it's used**:
```javascript
// Store: When user runs /link
linkUser(discordId, guildId, leetcodeUsername);

// Retrieve: When user runs /stats
const user = getUser(discordId, guildId);

// Guild settings: When admin runs /setchannel
setLogChannel(guildId, channelId);

// Tracking: When poller detects new solve
saveSolvedProblem(discordId, guildId, title, slug, difficulty, timestamp);
```

---

## Data Flow Examples

### Example 1: User Runs `/ping`

```
1. User: "/"
   └→ (types 'ping')

2. Discord sends: InteractionCreate { commandName: 'ping' }

3. index.js receives →
   Gets command: client.commands.get('ping')

4. Executes command.execute(interaction)
   └→ commands/utility/ping.js runs

5. ping.js replies: "Pong!"

6. Discord shows reply to user
```

### Example 2: User Runs `/link john_doe`

```
1. User types: "/link john_doe"

2. Discord sends: InteractionCreate 
                  { commandName: 'link', options: { username: 'john_doe' } }

3. index.js receives and executes commands/leetcode/link.js

4. link.js:
   a) Defers reply (shows "Bot is thinking...")
   b) Gets username option: 'john_doe'
   c) Gets Discord user ID from interaction
   
   d) Calls: getUserProfile('john_doe')
      └→ services/leetcode.js
         └→ Makes GraphQL request to LeetCode API
         
   e) Gets back user profile data
   
   f) Calls: linkUser(discordId, guildId, 'john_doe')
      └→ database/queries.js
         └→ Inserts into SQLite database
         
   g) Creates formatted PrettyEmbed with profile info
   
   h) Replies to Discord with Embed
   
5. Discord shows pretty profile card to user
```

### Example 3: User Runs `/stats`

```
1. User types: "/stats" (optional: can specify @user)

2. index.js receives and executes commands/leetcode/stats.js

3. stats.js:
   a) Defers reply
   
   b) Optionally gets mentioned username, or uses self
   
   c) Calls: getUser(discordId, guildId)
      └→ Gets user's linked LeetCode username from database
      
   d) Calls: getUserProfile(linkedUsername)
      └→ services/leetcode.js
         └→ GraphQL: Get profile stats
      
   e) Calls: getRecentSubmissions(linkedUsername)
      └→ GraphQL: Get recent solved problems
      
   f) Creates beautiful Embed with:
      - Ranking
      - Problems solved
      - Submission streak
      - Recent submissions list
      
   g) Replies with Embed

4. Discord shows stats card to user
```

---

## Initialization Sequence

When the bot starts (`node index.js`):

```
1. import modules
   └→ discord.js, config, fs, path, poller, etc.

2. Create Discord Client
   └→ new Client({ intents: [GatewayIntentBits.Guilds] })

3. Prepare commands collection
   └→ client.commands = new Collection()

4. Load command folders
   └→ Read commands/ directory
   
5. Load all command files
   └→ For each folder:
      Loop through .js files
      Import each file
      Validate it has 'data' and 'execute'
      Store in client.commands

6. Register command handlers
   └→ client.once(Events.ClientReady, ...)
      client.on(Events.InteractionCreate, ...)

7. Initialize database
   └→ database/init.js runs
      Creates tables if they don't exist
      Runs migrations (new columns)

8. Login to Discord
   └→ client.login(token)
      Connects WebSocket
      Waits for events

9. Ready!
   └→ Logs: "Ready! Logged in as BotName#0000"
      Starts Activity Monitor (every 5 min)
      Starts Scheduler (daily recap & streak nudge)
      Now listening for interactions
```

---

## Environment & Configuration

**config.json** contains:
```json
{
    "token": "your_bot_token_here",
    "clientId": "your_client_id",
    "guildId": "your_server_id"
}
```

**What each does**:
- **token**: Authenticates the bot to Discord (SECRET!)
- **clientId**: Identifies your bot application
- **guildId**: The server where commands appear (during development)

---

## Summary

| File | Purpose | Usage |
|------|---------|-------|
| index.js | Main bot logic, event handling, starts poller | Run: `node index.js` |
| deploy-commands.js | Register commands with Discord | Run after changes: `node deploy-commands.js` |
| commands/ | Slash command definitions (9 commands) | User interaction happens here |
| services/leetcode.js | LeetCode GraphQL queries | Called by commands & poller |
| services/poller.js | Activity monitor, daily recap, streak nudge | Auto-runs on timers |
| database/ | Store users, guild settings, solved problems | Called by commands & poller |
| config.json | Bot credentials | Read by index.js |

---

## Next Steps

- **Want to create a command?** → Read [Command System](./3-command-system.md)
- **Need to understand command registration?** → Read [Command Registration](./4-command-registration.md)
- **Curious about GraphQL?** → Read [GraphQL Integration](./6-graphql-integration.md)
- **How does the automation work?** → Read [Polling & Scheduling System](./8-polling-system.md)
