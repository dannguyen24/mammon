# Command Registration - How Discord Knows About Your Commands

## What is Command Registration?

**Command registration** is the process of telling Discord what slash commands your bot has. Without it, users won't see `/` commands in Discord.

### Two Ways to Register Commands

| Method | When It Takes Effect | Use Case |
|--------|---------------------|----------|
| **Guild Registration** | ~15 seconds | Development (single server) |
| **Global Registration** | ~1 hour | Production (all servers) |

**Note**: Mammon uses **guild registration** (see `guildId` in config.json)

---

## How Discord.js Registers Commands

### Step 1: Collect All Commands

```javascript
// In deploy-commands.js

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Read each folder (leetcode/, utility/)
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath)
        .filter((file) => file.endsWith('.js'));
    
    // Read each .js file in the folder
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(`file://${filePath}`);
        const cmd = command.default || command;
        
        // Extract the command data to JSON
        if ('data' in cmd) {
            commands.push(cmd.data.toJSON());
        }
    }
}
```

**Result**: Array of command definitions
```javascript
commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
        options: []
    },
    {
        name: 'link',
        description: 'Link your Discord to LeetCode',
        options: [...]
    },
    // ... more commands
]
```

---

### Step 2: Send to Discord via REST API

```javascript
const rest = new REST().setToken(token);

try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // Use PUT method to send commands to Discord
    const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
    console.error(error);
}
```

**What this does**:
1. Creates a REST connection to Discord using bot token
2. Sends all commands to Discord's API
3. Discord registers them on the specified guild (server)
4. Commands appear in Discord within ~15 seconds

---

## The Deployment Flow

```
┌─────────────────────────────────────────────────────┐
│ You run: node deploy-commands.js                     │
└────────────────┬────────────────────────────────────┘
                 ↓
    ┌────────────────────────────┐
    │ Read commands/ folder      │
    │ - commands/leetcode/link.js│
    │ - commands/leetcode/stats.js│
    │ - commands/utility/ping.js │
    │ - commands/utility/user.js │
    └────────────┬───────────────┘
                 ↓
    ┌────────────────────────────┐
    │ Extract command definitions│
    │ - ping: "Replies with Pong!"
    │ - link: "Link to LeetCode" │
    │ - stats: "View stats"      │
    │ - user: "Get user info"    │
    └────────────┬───────────────┘
                 ↓
    ┌────────────────────────────┐
    │ Send to Discord API        │
    │ PUT /applications/{id}/... │
    └────────────┬───────────────┘
                 ↓
    ┌────────────────────────────┐
    │ Discord registers commands │
    │ Makes them available       │
    └────────────┬───────────────┘
                 ↓
    ┌────────────────────────────┐
    │ Users see / commands       │
    │ ~15 seconds later          │
    └────────────────────────────┘
```

---

## Guild vs Global Registration

### Guild Registration (Mammon's Approach)

**Endpoint**: `Routes.applicationGuildCommands(clientId, guildId)`

```javascript
const data = await rest.put(
    Routes.applicationGuildCommands('123456789', '987654321'),
    { body: commands }
);
```

**Advantages**:
- ✅ Commands appear immediately (~15 seconds)
- ✅ Perfect for development/testing
- ✅ Can test multiple versions easily

**Disadvantages**:
- ❌ Only works in ONE server (guildId)
- ❌ Used mainly for development

---

### Global Registration

**Endpoint**: `Routes.applicationCommands(clientId)`

```javascript
const data = await rest.put(
    Routes.applicationCommands('123456789'),
    { body: commands }
);
```

**Advantages**:
- ✅ Works in ALL servers your bot is in
- ✅ For production bots

**Disadvantages**:
- ❌ Takes ~1 hour to update
- ❌ Slower feedback loop

---

## Mammon's Registration Setup

### In config.json
```json
{
    "token": "...",
    "clientId": "1463814056287928466",
    "guildId": "1463814879197663244"
}
```

### In deploy-commands.js
```javascript
const { clientId, guildId, token } = config;

// Uses GUILD registration (specified server only)
const data = await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
);
```

### How to Use
```bash
# Deploy commands to the guild in config.json
node deploy-commands.js
```

---

## Step-by-Step Deployment

### 1. **Create/Modify a Command**

Create or update any command file in `commands/`:

**New file**: `commands/utility/hello.js`
```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Say hello'),
    
    async execute(interaction) {
        await interaction.reply('Hello!');
    }
};
```

### 2. **Deploy the Command**

```bash
node deploy-commands.js
```

**Output**:
```
Started refreshing 5 application (/) commands.
Successfully reloaded 5 application (/) commands.
```

### 3. **Verify in Discord**

- Go to the Discord server (guildId in config)
- Type `/` in any channel
- You should see `/hello` in the list

### 4. **Start the Bot** (if not already running)

```bash
node index.js
```

### 5. **Test the Command**

- Type `/hello` in Discord
- Press enter
- Bot replies with `Hello!`

---

## Troubleshooting Registration

### Problem: Commands don't appear in Discord

**Check**:
1. Is bot in the server? → Add bot to server using OAuth2 URL
2. Is bot token correct? → Verify in config.json
3. Did you run `deploy-commands.js`? → Run it again
4. Is guildId correct? → Check Discord server settings

**Fix**:
```bash
# Clear and redeploy
node deploy-commands.js

# May take 15-30 seconds to appear
```

---

### Problem: Old commands still showing

**Cause**: Commands were registered but not updated

**Fix**:
```bash
# Redeploy to overwrite
node deploy-commands.js

# If still persists, restart bot
node index.js
```

---

### Problem: "Invalid Form Body" error

**Cause**: Command definition is malformed

**Check**:
- Command name (must be lowercase, alphanumeric, hyphens allowed)
- Description (required, must be 1-100 characters)
- Option names (lowercase, no spaces)

**Example Invalid**:
```javascript
// ❌ Wrong: uppercase letter
.setName('MyCommand')

// ❌ Wrong: special characters
.setName('link!')

// ❌ Wrong: spaces
.setName('link account')
```

**Example Valid**:
```javascript
// ✅ Correct
.setName('link-account')
.setName('linkaccount')
.setName('link_account')
```

---

## How Index.js Uses Registered Commands

Once commands are registered, **index.js** loads them at startup:

```javascript
// index.js loads commands into memory
client.commands = new Collection();

for (const folder of commandFolders) {
    // ... load all command files
    client.commands.set(cmd.data.name, cmd);
}

// When Discord sends an interaction
client.on(Events.InteractionCreate, async (interaction) => {
    const command = client.commands.get(interaction.commandName);
    await command.execute(interaction);
});
```

**Important**: Commands must be:
1. **Defined in files** (`commands/` folder) ← Used by index.js
2. **Registered with Discord** (deploy-commands.js) ← Makes them visible to users

Both steps are needed!

---

## REST API Details

### What is REST?

**REST** = Representational State Transfer

It's how your bot communicates with Discord's servers using HTTP requests.

```javascript
const rest = new REST().setToken(token);
```

### Commands Sent

```javascript
rest.put(endpoint, { body: commands })
```

- **PUT**: Replaces all existing commands with new ones
- **endpoint**: Where to send commands (guild or globally)
- **body**: Array of command objects

### Routes Available

```javascript
// Guild (server-specific)
Routes.applicationGuildCommands(clientId, guildId)

// Global (all servers)
Routes.applicationCommands(clientId)
```

---

## When to Re-Deploy

### Always Deploy When:
- ✅ You create a new command file
- ✅ You modify command name or description
- ✅ You add/modify command options (parameters)
- ✅ You change a command's structure

### Don't Need to Deploy When:
- ❌ You modify command execution logic (the code inside `execute`)
- ❌ You change API calls in services/

Just restart `node index.js` to load the changes.

---

## Example: Adding a New Command

### Step 1: Create the file

**File**: `commands/utility/goodbye.js`
```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('goodbye')
        .setDescription('Say goodbye'),
    
    async execute(interaction) {
        await interaction.reply('Goodbye!');
    }
};
```

### Step 2: Deploy

```bash
node deploy-commands.js
```

Output:
```
Started refreshing 6 application (/) commands.
Successfully reloaded 6 application (/) commands.
```

### Step 3: Verify

- Type `/` in Discord
- See `/goodbye` in the list

### Step 4: Test

- Type `/goodbye`
- Bot replies with `Goodbye!`

---

## Summary

| Process | How | When |
|---------|-----|------|
| **Create** | Write command file in `commands/` | Anytime |
| **Register** | Run `node deploy-commands.js` | After creating/modifying command structure |
| **Load** | Bot runs `index.js` | Bot startup |
| **Execute** | User types `/command` | User triggers command |

---

## Next Steps

- **Want to learn about command execution?** → [Command System](./3-command-system.md)
- **Curious about the bot connection?** → [Bot Connection](./5-bot-connection.md)
- **Need help with API calls?** → [GraphQL Integration](./6-graphql-integration.md)
