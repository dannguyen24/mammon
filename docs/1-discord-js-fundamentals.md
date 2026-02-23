# Discord.js Fundamentals

## What is Discord.js?

**Discord.js** is a powerful JavaScript/Node.js library that allows you to interact with the Discord API. It abstracts away the complexity of Discord's REST API and WebSocket connections, providing a clean, event-driven interface to build Discord bots.

### Key Functions

| Function | Purpose |
|----------|---------|
| **Create a Bot Client** | Establish a connection to Discord |
| **Listen to Events** | Respond to user interactions, messages, member joins, etc. |
| **Send Messages** | Respond to commands and create embeds |
| **Manage Slash Commands** | Register and handle modern Discord commands |
| **Handle Interactions** | Process button clicks, select menus, modals, etc. |

---

## Core Concepts

### 1. **Client** - Your Bot's Connection
The `Client` is the main object representing your bot's connection to Discord.

```javascript
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds] 
});
```

- **Intents**: Specify what events your bot receives (guilds, messages, members, etc.)
- **More intents = More data** = Slightly more bandwidth

### 2. **Events** - Reactive Programming
Listen to Discord events and execute code when they occur.

```javascript
// Bot is ready and logged in
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// User created a slash command interaction
client.on(Events.InteractionCreate, async (interaction) => {
    // Handle the interaction
});
```

**Common Events**:
- `ClientReady` - Bot successfully logged in
- `InteractionCreate` - User used a slash command or interacted with buttons
- `GuildCreate` - Bot joined a new server
- `MessageCreate` - Someone sent a message (requires MessageContent intent)

### 3. **Interactions** - Modern Command Interface
Slash commands create `Interaction` objects when users trigger them.

```javascript
client.on(Events.InteractionCreate, async (interaction) => {
    // Check if it's a slash command
    if (!interaction.isChatInputCommand()) return;
    
    // Get the command from the commands collection
    const command = interaction.client.commands.get(interaction.commandName);
    
    // Execute it
    await command.execute(interaction);
});
```

### 4. **Slash Commands** - Modern Discord Commands
Slash commands are the modern way users interact with bots. They appear when you type `/` in Discord.

```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
    // Define the command structure
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    
    // Execute when command is used
    async execute(interaction) {
        await interaction.reply('Pong!');
    }
};
```

**Parts**:
- **data**: Defines name, description, and options (parameters)
- **execute**: Function that runs when the command is called

### 5. **Collections** - Organized Command Storage
A `Collection` is a Map-like object for storing commands by name.

```javascript
import { Collection } from 'discord.js';

// Create a collection for commands
client.commands = new Collection();

// Store a command
client.commands.set(cmd.data.name, cmd);

// Retrieve a command
const command = client.commands.get('ping');
```

### 6. **Embeds** - Pretty Message Formatting
Create beautiful formatted messages using `EmbedBuilder`.

```javascript
import { EmbedBuilder } from 'discord.js';

const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('Success!')
    .setDescription('Your LeetCode account has been linked.')
    .addFields(
        { name: 'Username', value: 'john_doe', inline: true },
        { name: 'Ranking', value: '5000', inline: true }
    )
    .setTimestamp();

await interaction.reply({ embeds: [embed] });
```

---

## How It All Works Together

### Complete Flow Diagram

```
1. User Types '/ping' in Discord
          ↓
2. Discord sends InteractionCreate event to bot
          ↓
3. Client listens and fires Events.InteractionCreate
          ↓
4. Bot checks if it's a slash command
          ↓
5. Bot retrieves 'ping' command from Collection
          ↓
6. Bot calls command.execute(interaction)
          ↓
7. Command replies with 'Pong!'
          ↓
8. Discord shows 'Pong!' to the user
```

---

## What are Intents? (Simple Explanation)

**Think of intents like a mailbox filter:**

Imagine getting tons of mail every day. You say: **"Only put certain things in my mailbox"**

```
Your preferences:
✅ Birthday cards
✅ Package deliveries
❌ Junk mail
❌ Bills
```

Your bot works the same way. Discord sends THOUSANDS of events every second:
- "Someone sent a message"
- "Someone joined the server"
- "Someone reacted to a message"
- ... and many more

**Intents tell Discord**: *"I only care about THESE events. Don't waste data sending me the rest."*

**Why?** More intents = More data = More bandwidth used. So only ask for what you need!

---

## Important Intents to Know

| Intent | What It Offers | Use When |
|--------|-------|---------|
| `Guilds` | Server create/update/delete, channel info | **Always needed** for slash commands |
| `GuildMembers` | Member join/leave events | Tracking user joins/leaves |
| `MessageContent` | Read message text content | Prefix commands, message analysis |
| `DirectMessages` | DM received events | Handle private messages |

### In Mammon's Code
```javascript
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
```

**What this means**:
- ✅ Bot gets guild (server) events → Slash commands work
- ❌ Bot doesn't get message events → Saves bandwidth
- ❌ Bot doesn't track member joins → Not needed

**Real-world analogy**: Mammon only subscribed to "server stuff" because it only uses slash commands. It doesn't need to know about messages or members, so we don't ask Discord to send that data.

---

## Example: Simple Command Lifecycle

### Step 1: Define Command (`commands/utility/ping.js`)
```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    
    async execute(interaction) {
        await interaction.reply('Pong!');
    }
};
```

### Step 2: Load Command (`index.js`)
```javascript
const command = await import(`file://${filePath}`);
const cmd = command.default || command;
client.commands.set(cmd.data.name, cmd);
```

### Step 3: Register with Discord (`deploy-commands.js`)
```javascript
const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { 
    body: commands 
});
```

### Step 4: Handle Interaction (`index.js`)
```javascript
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    await command.execute(interaction);
});
```

---

## Discord.js Methods You'll Use Often

```javascript
// Replying to interactions
await interaction.reply('Hello!');
await interaction.deferReply();  // For long operations
await interaction.editReply('Updated!');
await interaction.followUp('Additional message');

// Creating embeds
const embed = new EmbedBuilder().setTitle('Title');

// Getting options from slash commands
const username = interaction.options.getString('username');
const userId = interaction.options.getUser('user');

// Accessing user/guild info
interaction.user.id       // Discord user ID
interaction.guild.id      // Server ID
interaction.user.tag      // Username#0000
interaction.user.avatar   // Avatar URL
```

---

## Common Patterns

### Deferring Replies (For Long Operations)
```javascript
async execute(interaction) {
    await interaction.deferReply();  // Show "Bot is thinking..."
    
    const data = await slowApiCall();  // Can take up to 15 minutes
    
    await interaction.editReply(`Data: ${data}`);
}
```

### Reply with Embeds
```javascript
const embed = new EmbedBuilder()
    .setColor(0x0000FF)
    .setTitle('Profile')
    .setThumbnail(profileImage);

await interaction.reply({ embeds: [embed] });
```

### Error Handling
```javascript
try {
    await command.execute(interaction);
} catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Error!', flags: MessageFlags.Ephemeral });
    } else {
        await interaction.reply({ content: 'Error!', flags: MessageFlags.Ephemeral });
    }
}
```

---

## Next Steps

- Read [Project Architecture](./2-project-architecture.md) to see how all pieces fit together
- Check [Command System](./3-command-system.md) to understand the full command structure
- Visit the [Discord.js docs](https://discord.js.org) for detailed API reference
