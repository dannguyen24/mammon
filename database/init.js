import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database in the project root
const dbPath = path.join(__dirname, '..', 'leetcode_tracker.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		discord_id TEXT NOT NULL,
		guild_id TEXT NOT NULL,
		leetcode_username TEXT NOT NULL,
		linked_at TEXT DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(discord_id, guild_id)
	);

	CREATE INDEX IF NOT EXISTS idx_users_discord_guild 
	ON users(discord_id, guild_id);

	CREATE INDEX IF NOT EXISTS idx_users_guild 
	ON users(guild_id);
`);

console.log('[Database] Initialized successfully');

export default db;
