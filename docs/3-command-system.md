# Command System - How to Create and Structure Commands

## What is a Slash Command?

A **slash command** is a modern Discord command that appears when users type `/`. They provide:
- **Auto-completion** - Discord shows suggestions
- **Type safety** - Input validation before execution
- **Cleaner interface** - No prefix needed (like `!` or `.`)

**Example**: `/link john_doe` or `/stats`

---

## Anatomy of a Command

Every command file follows this structure:

```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
    // PART 1: DEFINE the command structure
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('What this command does'),
    
    // PART 2: EXECUTE when the command is used
    async execute(interaction) {
        // Your code here
        await interaction.reply('Response');
    }
};
```

---

## Part 1: Defining Commands with SlashCommandBuilder

The `data` property uses `SlashCommandBuilder` to define:
- Command name
- Description
- Parameters (options)
- Required/optional fields

### Basic Command (No Parameters)

**File**: `commands/utility/ping.js`
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

**In Discord**: `/ping` → Bot replies with `Pong!`

---

### Command with Required String Parameter

**File**: `commands/leetcode/link.js`
```javascript
import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord to LeetCode')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('Your LeetCode username')
                .setRequired(true)  // User MUST provide this
        ),
    
    async execute(interaction) {
        // Get the username the user provided
        const username = interaction.options.getString('username');
        await interaction.reply(`Linking to LeetCode user: ${username}`);
    }
};
```

**In Discord**: `/link john_doe` → Bot processes `john_doe`

---

### Command with Optional Parameters

```javascript
data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View LeetCode stats')
    .addStringOption(option =>
        option
            .setName('username')
            .setDescription('LeetCode username (default: your linked account)')
            .setRequired(false)  // User CAN skip this
    ),

async execute(interaction) {
    const username = interaction.options.getString('username') || 'default_user';
    await interaction.reply(`Stats for: ${username}`);
}
```

---

### Command with Different Input Types

```javascript
data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('Example with multiple option types')
    // String option
    .addStringOption(option =>
        option
            .setName('text')
            .setDescription('Some text')
            .setRequired(true)
    )
    // User option (select a Discord user)
    .addUserOption(option =>
        option
            .setName('target')
            .setDescription('Select a user')
            .setRequired(false)
    )
    // Integer option
    .addIntegerOption(option =>
        option
            .setName('number')
            .setDescription('A number')
            .setRequired(false)
    ),

async execute(interaction) {
    const text = interaction.options.getString('text');
    const user = interaction.options.getUser('target');
    const number = interaction.options.getInteger('number');
    
    console.log(text, user, number);
}
```

---

## Part 2: Executing Commands

The `execute` function runs when a user invokes the command.

### Simple Reply

```javascript
async execute(interaction) {
    await interaction.reply('Hello!');
}
```

---

### Deferred Reply (For Long Operations)

Use `deferReply()` when your command takes time (API calls, database queries, etc.).

```javascript
async execute(interaction) {
    // Show "Bot is thinking..." to the user
    await interaction.deferReply();
    
    // Do slow work (up to 15 minutes!)
    const data = await slowGraphQLQuery();
    
    // Send the result
    await interaction.editReply(`Got data: ${data}`);
}
```

**Without deferral**: If it takes >3 seconds, Discord shows "The application did not respond"

---

### Reply with Embeds (Pretty Messages)

```javascript
import { EmbedBuilder } from 'discord.js';

async execute(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)           // Green color
        .setTitle('LeetCode Stats')
        .setDescription('Your profile info')
        .setThumbnail('avatar_url')
        .addFields(
            { name: 'Problems Solved', value: '150', inline: true },
            { name: 'Ranking', value: '5000', inline: true },
            { name: 'Streak', value: '7 days', inline: false }
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}
```

**Result**: A nicely formatted card with colors, fields, and thumbnails

---

### Error Handling

```javascript
async execute(interaction) {
    try {
        // risky code
        const result = await someApiCall();
        await interaction.reply(`Success: ${result}`);
    } catch (error) {
        console.error(error);
        
        // Send error message
        if (interaction.replied || interaction.deferred) {
            // If we already responded, follow up
            await interaction.followUp('An error occurred!');
        } else {
            // If we haven't responded, reply
            await interaction.reply('An error occurred!');
        }
    }
}
```

---

## Getting Information from Interactions

### Access User Information

```javascript
async execute(interaction) {
    const userId = interaction.user.id;           // Discord ID
    const username = interaction.user.username;   // Username
    const userTag = interaction.user.tag;         // Username#0000
    const avatar = interaction.user.avatarURL();  // Avatar image URL
    
    console.log(`${userTag} used this command`);
}
```

### Access Server Information

```javascript
async execute(interaction) {
    const guildId = interaction.guild.id;         // Server ID
    const guildName = interaction.guild.name;     // Server name
    
    console.log(`Command used in server: ${guildName}`);
}
```

### Get Command Options

```javascript
// String
const username = interaction.options.getString('username');

// User (Discord member)
const user = interaction.options.getUser('target');

// Integer
const count = interaction.options.getInteger('number');

// Boolean
const flag = interaction.options.getBoolean('enabled');

// With default values
const username = interaction.options.getString('username') || 'default';
```

---

## Real-World Example: `/link` Command

**File**: `commands/leetcode/link.js`

```javascript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { linkUser, getUser } from '../../database/queries.js';
import { getUserProfile } from '../../services/leetcode.js';

export default {
    // Define the command
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Discord account to your LeetCode profile')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('Your LeetCode username')
                .setRequired(true)
        ),

    // Execute when user runs /link <username>
    async execute(interaction) {
        const username = interaction.options.getString('username');
        const discordId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Defer reply because we'll make API calls
        await interaction.deferReply();

        try {
            // Check if user already linked
            const existingUser = getUser(discordId, guildId);
            if (existingUser) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF9900)
                    .setTitle('Already Linked')
                    .setDescription(`You're already linked to **${existingUser.username}**`);
                
                return await interaction.editReply({ embeds: [embed] });
            }

            // Validate LeetCode username by fetching profile
            const profile = await getUserProfile(username);
            
            if (!profile) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('User Not Found')
                    .setDescription(`LeetCode user **${username}** not found`);
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Store the link in database
            linkUser(discordId, guildId, username);

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('LeetCode Profile Linked!')
                .setThumbnail(profile.avatar)
                .addFields(
                    { name: 'Username', value: profile.username, inline: true },
                    { name: 'Ranking', value: `${profile.ranking}`, inline: true },
                    { name: 'Problems Solved', value: `${profile.totalSolved}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while linking your account.');
        }
    }
};
```

**What happens**:
1. User types `/link john_doe`
2. Command runs, gets the username
3. Defers reply (shows thinking emoji ⏳)
4. Calls LeetCode API to validate username
5. If valid, stores link in database
6. Responds with profile card
7. If error, responds with error card

---

## Command File Organization

### Keep Related Commands Together

```
commands/
├── leetcode/          # All LeetCode commands
│   ├── link.js         # /link <username>
│   ├── stats.js        # /stats [@user]
│   ├── leaderboard.js  # /leaderboard
│   ├── daily.js        # /daily
│   └── untrack.js      # /untrack
│
└── utility/           # General bot commands
    ├── ping.js         # /ping
    ├── user.js         # /user
    ├── mammon-help.js  # /mammon-help
    └── setchannel.js   # /setchannel
```

### Import Shared Functions

```javascript
// Instead of repeating code, import helpers
import { linkUser, getUser } from '../../database/queries.js';
import { getUserProfile, getRecentSubmissions } from '../../services/leetcode.js';
```

---

## Common Patterns

### Pattern 1: Get Data & Display

```javascript
async execute(interaction) {
    await interaction.deferReply();
    
    // Get data
    const data = await fetchData();
    
    // Format it
    const embed = createEmbed(data);
    
    // Send it
    await interaction.editReply({ embeds: [embed] });
}
```

### Pattern 2: Store User Preference

```javascript
async execute(interaction) {
    const userId = interaction.user.id;
    const setting = interaction.options.getString('setting');
    
    // Store in database
    saveUserSetting(userId, setting);
    
    await interaction.reply(`Setting saved: ${setting}`);
}
```

### Pattern 3: Confirm Before Action

```javascript
async execute(interaction) {
    const action = interaction.options.getString('action');
    
    if (action === 'delete') {
        await interaction.reply({
            content: 'Are you sure? React with ✅ to confirm',
            components: [row]  // with buttons
        });
    }
}
```

---

## SlashCommandBuilder Options Reference

### Option Types Available

```javascript
// String input
.addStringOption(o => o.setName('text').setRequired(true))

// Integer input
.addIntegerOption(o => o.setName('num').setRequired(true))

// Decimal number
.addNumberOption(o => o.setName('decimal').setRequired(true))

// True/False
.addBooleanOption(o => o.setName('flag').setRequired(true))

// Select a Discord user
.addUserOption(o => o.setName('user').setRequired(true))

// Select a channel
.addChannelOption(o => o.setName('channel').setRequired(true))

// Select a role
.addRoleOption(o => o.setName('role').setRequired(true))
```

### To Get These Options in Execute

```javascript
const string = interaction.options.getString('name');
const number = interaction.options.getInteger('name');
const decimal = interaction.options.getNumber('name');
const bool = interaction.options.getBoolean('name');
const user = interaction.options.getUser('name');
const channel = interaction.options.getChannel('name');
const role = interaction.options.getRole('name');
```

---

## Next Steps

- **Ready to register commands?** → [Command Registration](./4-command-registration.md)
- **Want to call APIs?** → [GraphQL Integration](./6-graphql-integration.md)
- **Need database access?** → [Database System](./7-database-system.md)
- **Understand the automation?** → [Polling & Scheduling System](./8-polling-system.md)
