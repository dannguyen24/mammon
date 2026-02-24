import db from './init.js';

/**
 * Link a Discord user to a LeetCode username
 * @param {string} discordId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @param {string} leetcodeUsername - LeetCode username
 * @returns {object} The inserted/updated user record
 */
export function linkUser(discordId, guildId, leetcodeUsername) {
	const stmt = db.prepare(`
		INSERT INTO users (discord_id, guild_id, leetcode_username, linked_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(discord_id, guild_id) 
		DO UPDATE SET leetcode_username = excluded.leetcode_username, linked_at = CURRENT_TIMESTAMP
	`);
	
	stmt.run(discordId, guildId, leetcodeUsername);
	return getUser(discordId, guildId);
}

/**
 * Get a user by Discord ID and Guild ID
 * @param {string} discordId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {object|null} User record or null if not found
 */
export function getUser(discordId, guildId) {
	const stmt = db.prepare(`
		SELECT * FROM users 
		WHERE discord_id = ? AND guild_id = ?
	`);
	return stmt.get(discordId, guildId) || null;
}

/**
 * Get all users in a guild
 * @param {string} guildId - Discord guild ID
 * @returns {array} Array of user records
 */
export function getGuildUsers(guildId) {
	const stmt = db.prepare(`
		SELECT * FROM users 
		WHERE guild_id = ?
		ORDER BY linked_at DESC
	`);
	return stmt.all(guildId);
}

/**
 * Unlink a user from LeetCode
 * @param {string} discordId - Discord user ID
 * @param {string} guildId - Discord guild ID
 * @returns {boolean} True if user was deleted, false if not found
 */
export function unlinkUser(discordId, guildId) {
	const stmt = db.prepare(`
		DELETE FROM users 
		WHERE discord_id = ? AND guild_id = ?
	`);
	const result = stmt.run(discordId, guildId);
	return result.changes > 0;
}

// ========== Guild Settings ==========

/**
 * Set the log channel for a guild (used for victory announcements & recaps)
 */
export function setLogChannel(guildId, channelId) {
	const stmt = db.prepare(`
		INSERT INTO guild_settings (guild_id, log_channel_id, updated_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(guild_id)
		DO UPDATE SET log_channel_id = excluded.log_channel_id, updated_at = CURRENT_TIMESTAMP
	`);
	stmt.run(guildId, channelId);
}

/**
 * Get the log channel ID for a guild
 */
export function getLogChannel(guildId) {
	const stmt = db.prepare(`SELECT log_channel_id FROM guild_settings WHERE guild_id = ?`);
	const row = stmt.get(guildId);
	return row ? row.log_channel_id : null;
}

// ========== Polling & Tracking ==========

/**
 * Get all tracked users across all guilds (for the poller)
 */
export function getAllTrackedUsers() {
	const stmt = db.prepare(`SELECT * FROM users`);
	return stmt.all();
}

/**
 * Update a user's cached stats (called by poller after fetching profile)
 */
export function updateUserStats(discordId, guildId, totalSolved, streak, lastTimestamp) {
	const stmt = db.prepare(`
		UPDATE users 
		SET total_solved = ?, current_streak = ?, last_submission_timestamp = ?
		WHERE discord_id = ? AND guild_id = ?
	`);
	stmt.run(totalSolved, streak, lastTimestamp, discordId, guildId);
}

/**
 * Update only the last submission timestamp (baseline without full stats)
 */
export function updateLastSubmissionTimestamp(discordId, guildId, timestamp) {
	const stmt = db.prepare(`
		UPDATE users SET last_submission_timestamp = ?
		WHERE discord_id = ? AND guild_id = ?
	`);
	stmt.run(timestamp, discordId, guildId);
}

/**
 * Save a solved problem. Returns true if newly inserted, false if duplicate.
 */
export function saveSolvedProblem(discordId, guildId, title, slug, difficulty, solvedAt) {
	const stmt = db.prepare(`
		INSERT OR IGNORE INTO solved_problems (discord_id, guild_id, problem_title, problem_slug, difficulty, solved_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`);
	const result = stmt.run(discordId, guildId, title, slug, difficulty, solvedAt);
	return result.changes > 0;
}

/**
 * Get yesterday's top solvers in a guild (for daily recap)
 */
export function getYesterdaySolvers(guildId) {
	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
	const startOfYesterday = startOfToday - 86400;

	const stmt = db.prepare(`
		SELECT discord_id, COUNT(*) as count 
		FROM solved_problems 
		WHERE guild_id = ? AND solved_at >= ? AND solved_at < ?
		GROUP BY discord_id
		ORDER BY count DESC
		LIMIT 10
	`);
	return stmt.all(guildId, startOfYesterday, startOfToday);
}

/**
 * Check how many problems a user solved today (for streak nudge)
 */
export function getTodaySolveCount(discordId, guildId) {
	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

	const stmt = db.prepare(`
		SELECT COUNT(*) as count 
		FROM solved_problems 
		WHERE discord_id = ? AND guild_id = ? AND solved_at >= ?
	`);
	const row = stmt.get(discordId, guildId, startOfToday);
	return row ? row.count : 0;
}

export default {
	linkUser,
	getUser,
	getGuildUsers,
	unlinkUser,
	setLogChannel,
	getLogChannel,
	getAllTrackedUsers,
	updateUserStats,
	updateLastSubmissionTimestamp,
	saveSolvedProblem,
	getYesterdaySolvers,
	getTodaySolveCount,
};
