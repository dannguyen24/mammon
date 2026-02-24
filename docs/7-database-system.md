# Database System - Local Data Storage

## What is the Database?

The **database** is a local SQLite file that stores mappings between Discord users and their LeetCode accounts, guild-specific settings, and a history of solved problems for tracking and deduplication.

```
┌─────────────────────────────────────────┐
│ users: Discord → LeetCode mapping        │
│ guild_settings: Log channel per guild    │
│ solved_problems: Problem solve history   │
└─────────────────────────────────────────┘
```

### Why SQLite?

| Feature | SQLite |
|---------|--------|
| **Storage** | Single file (`leetcode_tracker.db`) |
| **Setup** | Zero configuration needed |
| **Embedded** | Runs in your Node.js process |
| **Perfect for** | Small data needs like this |

---

## Database Schema

The database has three tables: `users`, `guild_settings`, and `solved_problems`

### Table 1: `users`

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    leetcode_username TEXT NOT NULL,
    linked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_submission_timestamp INTEGER DEFAULT 0,
    total_solved INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    UNIQUE(discord_id, guild_id)
);
```

| Field | Type | Purpose |
|-------|------|---------|
| `id` | INTEGER | Unique row identifier |
| `discord_id` | TEXT | Discord user's ID |
| `guild_id` | TEXT | Server/guild ID |
| `leetcode_username` | TEXT | LeetCode username |
| `linked_at` | TEXT | When account was linked |
| `last_submission_timestamp` | INTEGER | Unix timestamp of last checked submission (for polling) |
| `total_solved` | INTEGER | Cached total problems solved |
| `current_streak` | INTEGER | Cached current streak |

### Table 2: `guild_settings`

```sql
CREATE TABLE guild_settings (
    guild_id TEXT PRIMARY KEY,
    log_channel_id TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

| Field | Type | Purpose |
|-------|------|---------|
| `guild_id` | TEXT | Server/guild ID |
| `log_channel_id` | TEXT | Channel where automated posts go |
| `updated_at` | TEXT | When setting was last changed |

### Table 3: `solved_problems`

```sql
CREATE TABLE solved_problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    problem_title TEXT NOT NULL,
    problem_slug TEXT NOT NULL,
    difficulty TEXT,
    solved_at INTEGER NOT NULL,
    UNIQUE(discord_id, guild_id, problem_slug)
);
```

| Field | Type | Purpose |
|-------|------|---------|
| `discord_id` | TEXT | Discord user's ID |
| `guild_id` | TEXT | Server/guild ID |
| `problem_title` | TEXT | Problem name (e.g., "Two Sum") |
| `problem_slug` | TEXT | URL-friendly name (e.g., "two-sum") |
| `difficulty` | TEXT | Easy, Medium, or Hard |
| `solved_at` | INTEGER | Unix timestamp when solved |

### Example Data

```
users:
id | discord_id     | guild_id       | leetcode_username | last_submission_timestamp | total_solved
---|----------------|----------------|-------------------|--------------------------|-------------
1  | 123456789      | 987654321      | john_doe          | 1708598400                | 150
2  | 111111111      | 987654321      | jane_smith        | 1708512000                | 85

guild_settings:
guild_id       | log_channel_id | updated_at
---------------|----------------|--------------------
987654321      | 111222333444   | 2026-02-23 12:00:00

solved_problems:
id | discord_id  | guild_id   | problem_title | problem_slug | difficulty | solved_at
---|-------------|------------|---------------|--------------|------------|----------
1  | 123456789   | 987654321  | Two Sum       | two-sum      | Easy       | 1708598400
2  | 123456789   | 987654321  | Add Two Nums  | add-two-nums | Medium     | 1708512000
```

---

## Database Files in Mammon

### File: `database/init.js`

**Purpose**: Initialize database on startup

```javascript
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../leetcode_tracker.db');

export function initializeDatabase() {
    // Create new database or open existing
    const db = new Database(dbPath);
    
    // Create users table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discordId TEXT NOT NULL,
            guildId TEXT NOT NULL,
            username TEXT NOT NULL,
            linkedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(discordId, guildId)
        )
    `);
    
    console.log('Database initialized');
    return db;
}
```

**What it does**:
1. Creates `leetcode_tracker.db` if it doesn't exist
2. Creates `users` table if it doesn't exist
3. Called on bot startup

### File: `database/queries.js`

**Purpose**: Helper functions to query the database

```javascript
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../leetcode_tracker.db');
const db = new Database(dbPath);

// Insert/Update: Link a user
export function linkUser(discordId, guildId, username) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO users (discordId, guildId, username)
        VALUES (?, ?, ?)
    `);
    stmt.run(discordId, guildId, username);
}

// Select: Get a user's linked account
export function getUser(discordId, guildId) {
    const stmt = db.prepare(`
        SELECT * FROM users
        WHERE discordId = ? AND guildId = ?
    `);
    return stmt.get(discordId, guildId);
}

// Delete: Unlink a user
export function unlinkUser(discordId, guildId) {
    const stmt = db.prepare(`
        DELETE FROM users
        WHERE discordId = ? AND guildId = ?
    `);
    stmt.run(discordId, guildId);
}

// Select: Get all users in a guild
export function getGuildUsers(guildId) {
    const stmt = db.prepare(`
        SELECT * FROM users WHERE guildId = ?
    `);
    return stmt.all(guildId);
}
```

---

## How the Database is Used

### Example 1: User Links Account

**Flow**: User runs `/link john_doe`

```javascript
// In commands/leetcode/link.js
import { linkUser } from '../../database/queries.js';

async execute(interaction) {
    const username = 'john_doe';
    const discordId = interaction.user.id;  // e.g., '123456789'
    const guildId = interaction.guild.id;   // e.g., '987654321'
    
    // Store in database
    linkUser(discordId, guildId, username);
    
    // Now the database has:
    // discordId: 123456789
    // guildId: 987654321
    // username: john_doe
}
```

**Database after**:
```
discordId      | guildId    | username
123456789      | 987654321  | john_doe
```

> **Why only `discord_id`?** The database intentionally stores only the Discord snowflake ID — not the username or avatar. Discord usernames and avatars can change at any time, so storing them would lead to stale data. When displaying a user, the bot uses the `<@discord_id>` mention syntax (which Discord auto-resolves to the current display name) or calls `client.users.fetch(discordId)` to get current info on demand.

---

### Example 2: User Views Stats

**Flow**: User runs `/stats`

```javascript
// In commands/leetcode/stats.js
import { getUser } from '../../database/queries.js';
import { getUserProfile } from '../../services/leetcode.js';

async execute(interaction) {
    const discordId = interaction.user.id;   // '123456789'
    const guildId = interaction.guild.id;    // '987654321'
    
    // Get from database
    const linkedUser = getUser(discordId, guildId);
    
    if (!linkedUser) {
        return 'You haven\'t linked an account yet!';
    }
    
    // Now linkedUser = {
    //     discordId: '123456789',
    //     guildId: '987654321',
    //     username: 'john_doe',
    //     linkedAt: '2024-02-23 12:00:00'
    // }
    
    // Use the username to fetch LeetCode data
    const profile = await getUserProfile(linkedUser.username);
    
    // Display stats
}
```

---

## Database Operations

### CRUD Operations

**C**reate / **R**ead / **U**pdate / **D**elete

#### Create/Update: linkUser()

```javascript
linkUser(discordId, guildId, username);
```

- Creates new row if doesn't exist
- Updates if already exists (INSERT OR REPLACE)

**SQL**:
```sql
INSERT OR REPLACE INTO users (discordId, guildId, username)
VALUES (?, ?, ?)
```

#### Read: getUser()

```javascript
const user = getUser(discordId, guildId);
// Returns: { discordId, guildId, username, linkedAt }
// Returns: null if not found
```

**SQL**:
```sql
SELECT * FROM users
WHERE discordId = ? AND guildId = ?
```

#### Read All: getGuildUsers()

```javascript
const users = getGuildUsers(guildId);
// Returns: Array of all users in guild
```

**SQL**:
```sql
SELECT * FROM users WHERE guildId = ?
```

#### Delete: unlinkUser()

```javascript
unlinkUser(discordId, guildId);
```

**SQL**:
```sql
DELETE FROM users
WHERE discordId = ? AND guildId = ?
```

---

## SQL Basics for Commands

### INSERT

Add new data:
```sql
INSERT INTO users (discordId, guildId, username)
VALUES ('123456789', '987654321', 'john_doe')
```

### SELECT

Read data:
```sql
-- Get specific user
SELECT * FROM users WHERE discordId = '123456789'

-- Get all users
SELECT * FROM users

-- Count users
SELECT COUNT(*) FROM users
```

### UPDATE

Modify data:
```sql
UPDATE users SET username = 'new_username'
WHERE discordId = '123456789'
```

### DELETE

Remove data:
```sql
DELETE FROM users WHERE discordId = '123456789'
```

---

## Using better-sqlite3

Mammon uses the `better-sqlite3` library for database operations.

### Key Methods

```javascript
import Database from 'better-sqlite3';

const db = new Database('filename.db');

// Prepare a statement (reusable)
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');

// Get single row
const row = stmt.get(123);

// Get all rows
const rows = stmt.all();

// Execute without returning
stmt.run(value1, value2);

// Insert and get ID
const result = stmt.run(...);
console.log(result.lastInsertRowid);
```

---

## Example: Create a New Query

Let's say you want to add the ability to get all users in a server.

### Step 1: Add to `database/queries.js`

```javascript
// Get all users in a specific guild
export function getGuildUsers(guildId) {
    const stmt = db.prepare(`
        SELECT * FROM users
        WHERE guildId = ?
    `);
    return stmt.all(guildId);
}
```

### Step 2: Use in a Command

```javascript
import { getGuildUsers } from '../../database/queries.js';

async execute(interaction) {
    const guildId = interaction.guild.id;
    
    const allUsers = getGuildUsers(guildId);
    
    // Use the data
    console.log(`Guild has ${allUsers.length} linked users`);
    
    allUsers.forEach(user => {
        console.log(`${user.discordId} → ${user.username}`);
    });
}
```

---

## Database File Management

### Where is the Database?

```
mammon/
├── leetcode_tracker.db      ← Here!
├── leetcode_tracker.db-shm  (temporary)
├── leetcode_tracker.db-wal  (temporary)
└── index.js
```

### File Sizes

- `leetcode_tracker.db`: Usually < 100KB (small)
- `leetcode_tracker.db-shm`: Temporary, deleted when closed
- `leetcode_tracker.db-wal`: Temporary, deleted when closed

### Backup the Database

```bash
# Copy the database file to backup
cp leetcode_tracker.db leetcode_tracker.db.backup

# Or commit to git
git add leetcode_tracker.db
git commit -m "Database backup"
```

### Clear All Data

```bash
# Have Node.js delete all records
db.exec('DELETE FROM users');

# Or manually delete the file
rm leetcode_tracker.db
```

---

## Data Integrity

### UNIQUE Constraint

```sql
UNIQUE(discordId, guildId)
```

This ensures:
- One Discord user can only link ONE LeetCode account per server
- Can't have duplicates
- Prevents accidental overwrites

**Example conflict**:
```javascript
// First link: user 123 → john_doe
linkUser('123', '987654321', 'john_doe');  // ✅ Works

// Try to link same user again
linkUser('123', '987654321', 'jane_smith');  // ✅ Works (updates)

// But same user in different guild works fine
linkUser('123', '111111111', 'jane_smith');  // ✅ Works (different guildId)
```

---

## Database Transactions

For complex operations, use transactions:

```javascript
export function transactionExample() {
    const transaction = db.transaction((discordId, guildId, username) => {
        // Multiple operations as one atomic unit
        const stmt1 = db.prepare('INSERT INTO users VALUES (?, ?, ?)');
        stmt1.run(discordId, guildId, username);
        
        const stmt2 = db.prepare('UPDATE counters SET linked = linked + 1');
        stmt2.run();
        
        // If any fails, all rollback
    });
    
    transaction('123', '987654321', 'john_doe');
}
```

---

## Initialization Process

When bot starts, database is initialized:

```javascript
// In index.js (or separate init file)
import { initializeDatabase } from './database/init.js';

// This runs once at startup
initializeDatabase();

// Later, queries.js opens/uses the database
import { linkUser, getUser } from './database/queries.js';
```

**Flow**:
1. Bot starts
2. Database file created (if needed)
3. `users` table created (if needed)
4. Queries ready to use

---

## Troubleshooting Database Issues

### Problem: "Database is locked"

**Cause**: Multiple processes accessing database simultaneously

**Fix**:
```javascript
// Use WAL mode (Write-Ahead Logging)
db.pragma('journal_mode = WAL');
```

### Problem: "Table already exists"

**Solution**: Using `IF NOT EXISTS` prevents this
```sql
CREATE TABLE IF NOT EXISTS users (...)
```

### Problem: Data doesn't persist

**Cause**: Forgot to call `stmt.run()`
```javascript
// ❌ Wrong - doesn't execute
const stmt = db.prepare('INSERT ...');
// Missing: stmt.run(...)

// ✅ Correct
stmt.run(value1, value2);
```

---

## Summary

| Operation | Function | Purpose |
|-----------|----------|---------|
| **Link** | `linkUser(discordId, guildId, username)` | Store Discord ↔ LeetCode mapping |
| **Get** | `getUser(discordId, guildId)` | Retrieve linked LeetCode username |
| **Get All** | `getGuildUsers(guildId)` | Get all linked users in a server |
| **Unlink** | `unlinkUser(discordId, guildId)` | Remove the link |
| **Set Channel** | `setLogChannel(guildId, channelId)` | Set log channel for announcements |
| **Get Channel** | `getLogChannel(guildId)` | Get the log channel ID |
| **Get All Tracked** | `getAllTrackedUsers()` | Get all users across all guilds (poller) |
| **Update Stats** | `updateUserStats(...)` | Cache total solved + streak |
| **Save Solve** | `saveSolvedProblem(...)` | Record a solved problem |
| **Yesterday** | `getYesterdaySolvers(guildId)` | Top solvers from yesterday (recap) |
| **Today Count** | `getTodaySolveCount(...)` | How many solved today (streak nudge) |

---

## Next Steps

- **Want to create a new command?** → [Command System](./3-command-system.md)
- **Need to fetch data from APIs?** → [GraphQL Integration](./6-graphql-integration.md)
- **Confused about how it all works?** → [Project Architecture](./2-project-architecture.md)
- **How does the poller use the database?** → [Polling & Scheduling System](./8-polling-system.md)
