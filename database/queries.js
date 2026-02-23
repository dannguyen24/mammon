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

export default {
	linkUser,
	getUser,
	getGuildUsers,
	unlinkUser,
};
