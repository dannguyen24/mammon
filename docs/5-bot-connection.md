# Bot Connection - How Your Bot Authenticates and Connects to Discord

## Overview

The bot connection process is how your bot:
1. **Authenticates** to Discord using a token
2. **Establishes a WebSocket** connection
3. **Listens for events** from Discord
4. **Stays connected** and responsive

---

## The Connection Flow

```
┌─────────────────────────────────────────┐
│ You run: node index.js                   │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Create Discord Client                    │
│ new Client({ intents: [...] })           │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Load all commands into memory            │
│ Read commands/ folder, store in          │
│ client.commands Collection               │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Register event listeners                 │
│ client.once(ClientReady, ...)            │
│ client.on(InteractionCreate, ...)        │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ LOGIN TO DISCORD                         │
│ client.login(token)                      │
│ ← This is where connection happens!      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ Discord validates token                  │
│ Returns: bot identity & permissions      │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ WebSocket connection established         │
│ Bot receives events from Discord         │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ ClientReady event fires                  │
│ console.log('Ready! Logged in as...')    │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│ BOT IS ONLINE AND READY                  │
│ Waiting for interactions...              │
└─────────────────────────────────────────┘
```

---

## Step 1: Create the Discord Client

```javascript
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds] 
});
```

### What's a Client?

The **Client** is your bot's connection object. It represents:
- Your bot's identity
- Its connection status
- Event handlers
- The command collection

### What are Intents?

**Intents** tell Discord which events your bot wants to receive.

```javascript
// This bot only cares about guild (server) events
intents: [GatewayIntentBits.Guilds]

// Could also receive messages
intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent]
```

**Why?** Discord saves bandwidth by only sending relevant events.

---

## Step 2: Load Everything Before Connecting

```javascript
// Load all commands
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    // ... load commands into client.commands
}

// Register event handlers
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    // ... handle interactions
});
```

**Important**: Register all handlers BEFORE logging in!

---

## Step 3: Authentication with Token

```javascript
import config from './config.json' with { type: 'json' };

const { token } = config;

// This is where the connection actually happens
client.login(token);
```

### What's a Token?

A **token** is a secret password that authenticates your bot to Discord.

**In config.json**:
```json
{
    "token": "YOUR_BOT_TOKEN_HERE"
}
```
⚠️ **Never put your actual token in examples or documentation!**

### Token Security ⚠️

**NEVER commit tokens to GitHub!**

- ❌ Add token to version control
- ❌ Share token in public
- ❌ Push config.json to GitHub

**Protected in Mammon**:
```
# In .gitignore
config.json   # Contains token
.env          # If using env vars
```

**If leaked immediately**:
1. Go to Discord Developer Portal
2. Regenerate bot token
3. Update config.json
4. Restart bot

---

## The Login Process

### What Happens When You Call `client.login(token)`

```
1. Send token to Discord
   └→ Discord API server

2. Discord validates token
   ├─ Is token valid?
   ├─ Does it belong to a bot?
   └─ What permissions?

3. Return bot information
   ├─ Bot ID
   ├─ Username
   ├─ Avatar
   └─ List of servers bot is in

4. Establish WebSocket
   └→ Persistent connection for real-time events

5. Subscribe to events
   ├─ Based on intents specified
   └─ Discord starts sending events

6. Fire ClientReady event
   └→ Your code: client.once(Events.ClientReady, ...)
```

---

## Step 4: Listen for ClientReady

```javascript
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
```

### What is ClientReady?

**ClientReady** is an event fired when:
- ✅ Bot successfully authenticated
- ✅ WebSocket connection established
- ✅ Bot is online and ready to respond

### Using Once vs On

```javascript
// Use .once() - fires only ONE time
client.once(Events.ClientReady, (readyClient) => {
    console.log('Bot logged in!');  // Only prints on startup
});

// Use .on() - fires every time the event happens
client.on(Events.InteractionCreate, (interaction) => {
    // Runs every time user uses a command
});
```

---

## Complete Connection Code (index.js)

```javascript
// 1. Import modules
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import config from './config.json' with { type: 'json' };
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract credentials
const { token } = config;

// 2. Create client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

console.log('Bot is starting...');

// 3. Create commands collection
client.commands = new Collection();

// 4. Load command files
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath)
        .filter((file) => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(`file://${filePath}`);
        const cmd = command.default || command;
        
        if ('data' in cmd && 'execute' in cmd) {
            client.commands.set(cmd.data.name, cmd);
        }
    }
}

// 5. Register event handlers BEFORE login
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        // ... error handling
    }
});

// 6. LOGIN - Connects to Discord
client.login(token);
```

---

## Connection Status Checking

### Check if Bot is Ready

```javascript
client.once(Events.ClientReady, (readyClient) => {
    // At this point, client.isReady() === true
    if (readyClient.isReady()) {
        console.log('Bot is fully ready');
    }
});
```

### Wait for Ready in Code

```javascript
import { ChannelType } from 'discord.js';

// Wait for bot to be ready before doing something
await client.ready;

// Now safe to access guild/channel data
const guild = client.guilds.cache.get(guildId);
```

---

## Intents Explained

### Common Intents

| Intent | Events | Use For |
|--------|--------|---------|
| `Guilds` | Guild/channel create, update, delete | **Always needed** |
| `GuildMembers` | Member join, update, remove | Tracking users |
| `DirectMessages` | DMs received | Private messages |
| `MessageContent` | Full message text | Text-based commands |
| `GuildMessages` | Message events | Reading/responding to messages |
| `GuildBans` | User bans | Moderation |
| `GuildEmojis` | Emoji changes | Emoji management |

**Mammon uses**:
```javascript
intents: [GatewayIntentBits.Guilds]
```

Because it only needs slash commands (which need Guilds intent).

### Privilege Intents

Some intents require special approval:

```javascript
// These need special bot settings enabled
intents: [
    GatewayIntentBits.MessageContent,  // ← Must enable in Developer Portal
    GatewayIntentBits.GuildMembers     // ← Must enable in Developer Portal
]
```

**How to enable**:
1. Go to Discord Developer Portal
2. Select your bot application
3. Go to "Bot" section
4. Under "Intents", toggle on required intents

---

## Connection Events

### ClientReady
Fired when bot successfully connects.

```javascript
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
```

### ClientError
Fired when there's a connection error.

```javascript
client.on('error', error => {
    console.error('Discord client error:', error);
});
```

### WebSocketError
WebSocket connection error.

```javascript
client.on('websocketError', error => {
    console.error('WebSocket error:', error);
});
```

### Disconnect
Connection was lost.

```javascript
client.on('disconnect', () => {
    console.log('Bot disconnected');
});
```

---

## Troubleshooting Connection Issues

### Problem: "Invalid token"

**Cause**: Token is incorrect or expired

**Fix**:
```bash
# Check config.json has correct token
cat config.json

# If needed, regenerate token in Discord Developer Portal
# Then update config.json
```

---

### Problem: "Bot won't stay online"

**Cause**: Process exits after client.login()

**In index.js**, ensure you DON'T have:
```javascript
// ❌ Wrong - imports after login
client.login(token);
import something from './file.js';  // This will crash
```

**Correct**:
```javascript
// ✅ All imports at top
import { Client } from 'discord.js';
import config from './config.json' with { type: 'json' };

// Then everything else
const client = new Client(...);
// ... setup ...

// Login at the END
client.login(token);
```

---

### Problem: "Missing intents error"

**Cause**: Trying to access data that intent doesn't cover

```javascript
// ❌ This fails if MessageContent intent not enabled
client.on(Events.MessageCreate, msg => {
    console.log(msg.content);  // Might be undefined
});
```

**Fix**: Add the required intent
```javascript
intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent  // ← Add this
]
```

---

## Running the Bot

### Start the bot:
```bash
node index.js
```

### Expected output:
```
Bot is starting...
Client created. token is MTQ2MzgxNDA1NjI4NzkyODQ2Ng...
Ready! Logged in as Mammon#4321
```

### Keep it running:
- Use a process manager (pm2, forever, etc.)
- Or host on a server (AWS, Heroku, DigitalOcean, etc.)

```bash
# Using PM2
pm2 start index.js --name "discord-bot"
pm2 logs discord-bot
```

---

## Summary

| Step | What Happens | Code |
|------|--------------|------|
| 1 | Create client | `new Client({ intents: [...] })` |
| 2 | Load commands | Loop through files, store in `client.commands` |
| 3 | Register handlers | `client.once()` and `client.on()` |
| 4 | Authenticate | `client.login(token)` |
| 5 | Ready | ClientReady event fires |
| 6 | Online | Bot waits for interactions |

---

## Next Steps

- **Want to understand events better?** → [Discord.js Fundamentals](./1-discord-js-fundamentals.md)
- **Need to add commands?** → [Command System](./3-command-system.md)
- **Having connection issues?** → See Troubleshooting section above
