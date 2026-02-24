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

// Migration: Add new columns for polling & tracking (safe to run multiple times)
try { db.exec(`ALTER TABLE users ADD COLUMN last_submission_timestamp INTEGER DEFAULT 0`); } catch { /* column already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN total_solved INTEGER DEFAULT 0`); } catch { /* column already exists */ }
try { db.exec(`ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0`); } catch { /* column already exists */ }

// Guild settings table — stores the log channel for announcements per guild
db.exec(`
	CREATE TABLE IF NOT EXISTS guild_settings (
		guild_id TEXT PRIMARY KEY,
		log_channel_id TEXT,
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP
	);
`);

// Track individual solved problems for daily recap & deduplication
db.exec(`
	CREATE TABLE IF NOT EXISTS solved_problems (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		discord_id TEXT NOT NULL,
		guild_id TEXT NOT NULL,
		problem_title TEXT NOT NULL,
		problem_slug TEXT NOT NULL,
		difficulty TEXT,
		solved_at INTEGER NOT NULL,
		UNIQUE(discord_id, guild_id, problem_slug)
	);

	CREATE INDEX IF NOT EXISTS idx_solved_guild 
	ON solved_problems(guild_id);

	CREATE INDEX IF NOT EXISTS idx_solved_timestamp 
	ON solved_problems(solved_at);
`);

console.log('[Database] Initialized successfully');

export default db;
