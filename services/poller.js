/**
 * Polling & Scheduling Service
 * 
 * Handles three automated systems:
 * 1. Activity Monitor (every 5 min) — checks for new LeetCode submissions & announces victories
 * 2. Daily Recap (9 AM) — posts yesterday's top grinders
 * 3. Streak Nudge (8 PM) — warns users whose streaks are at risk
 */
import { EmbedBuilder } from 'discord.js';
import { getRecentSubmissions, getUserProfile, getProblemDifficulty } from './leetcode.js';
import {
	getAllTrackedUsers,
	getGuildUsers,
	getLogChannel,
	updateUserStats,
	updateLastSubmissionTimestamp,
	saveSolvedProblem,
	getYesterdaySolvers,
	getTodaySolveCount,
} from '../database/queries.js';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const REQUEST_DELAY = 2000; // 2s between API calls (rate limiting)

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/** Returns a medal/rank string for leaderboard position */
function getMedal(index) {
	if (index === 0) return '🥇';
	if (index === 1) return '🥈';
	if (index === 2) return '🥉';
	return `**${index + 1}.**`;
}

// ========== Poller: Victory Announcements ==========

/**
 * Start the activity monitor that checks for new LeetCode submissions.
 * Runs every 5 minutes after an initial 15-second warm-up delay.
 */
export function startPoller(client) {
	console.log('[Poller] Activity monitor started (every 5 minutes)');
	// Wait 15s after bot starts before first poll (let everything initialize)
	setTimeout(() => pollAllUsers(client), 15_000);
	setInterval(() => pollAllUsers(client), POLL_INTERVAL);
}

async function pollAllUsers(client) {
	const users = getAllTrackedUsers();
	if (users.length === 0) return;

	console.log(`[Poller] Checking ${users.length} tracked user(s)...`);

	// Group users by LeetCode username to deduplicate API calls
	// (same person in multiple guilds = one API call, processed per guild)
	const usersByUsername = {};
	for (const user of users) {
		if (!usersByUsername[user.leetcode_username]) {
			usersByUsername[user.leetcode_username] = [];
		}
		usersByUsername[user.leetcode_username].push(user);
	}

	for (const [username, entries] of Object.entries(usersByUsername)) {
		try {
			// One API call per unique LeetCode username
			const submissions = await getRecentSubmissions(username, 10);
			
			for (const user of entries) {
				await processUserSubmissions(client, user, submissions);
			}

			await sleep(REQUEST_DELAY);
		} catch (error) {
			console.error(`[Poller] Error checking ${username}:`, error.message);
		}
	}
}

/**
 * Process a user's recent submissions and announce new solves.
 */
async function processUserSubmissions(client, user, submissions) {
	const { discord_id, guild_id, leetcode_username, last_submission_timestamp } = user;

	if (!submissions || submissions.length === 0) return;

	const lastTimestamp = last_submission_timestamp || 0;

	// First poll for this user — just set the baseline, don't announce old submissions
	if (lastTimestamp === 0) {
		const newestTimestamp = Math.max(...submissions.map(s => Number.parseInt(s.timestamp)));
		updateLastSubmissionTimestamp(discord_id, guild_id, newestTimestamp);
		console.log(`[Poller] Set baseline for ${leetcode_username} in guild ${guild_id}`);
		return;
	}

	// Filter for accepted submissions newer than our last check
	const newSolves = submissions.filter(
		sub => sub.statusDisplay === 'Accepted' && Number.parseInt(sub.timestamp) > lastTimestamp
	);

	if (newSolves.length === 0) return;

	// Update the last submission timestamp to the newest one
	const newestTimestamp = Math.max(...submissions.map(s => Number.parseInt(s.timestamp)));
	updateLastSubmissionTimestamp(discord_id, guild_id, newestTimestamp);

	// Check if there's a log channel set for this guild
	const logChannelId = getLogChannel(guild_id);
	if (!logChannelId) return;

	// Fetch profile for total solved count (used in announcement)
	let profile = null;
	try {
		profile = await getUserProfile(leetcode_username);
		if (profile) {
			updateUserStats(discord_id, guild_id, profile.stats.total, profile.currentStreak, newestTimestamp);
		}
	} catch { /* non-critical */ }

	// Announce each new solve
	try {
		const channel = await client.channels.fetch(logChannelId);
		if (!channel) return;

		for (const solve of newSolves) {
			// Try to get problem difficulty for a richer announcement
			let difficulty = null;
			try {
				difficulty = await getProblemDifficulty(solve.titleSlug);
			} catch { /* non-critical */ }

			// Save to solved_problems table (returns false if already recorded)
			const isNew = saveSolvedProblem(
				discord_id, guild_id,
				solve.title, solve.titleSlug,
				difficulty, Number.parseInt(solve.timestamp)
			);

			// Only announce if it's a genuinely new solve (not a re-submission)
			if (!isNew) continue;

			const difficultyTag = difficulty ? ` a **${difficulty}** problem:` : '';
			const totalLine = profile ? `\nTotal Solved: **${profile.stats.total}**` : '';

			const embed = new EmbedBuilder()
				.setColor(getDifficultyColor(difficulty))
				.setThumbnail(profile?.avatar || 'https://leetcode.com/static/images/LeetCode_logo.png')
				.setDescription(
					`🔥 <@${discord_id}> just crushed${difficultyTag} **[${solve.title}](https://leetcode.com/problems/${solve.titleSlug}/)**!${totalLine}`
				)
				.setFooter({ text: `Language: ${solve.lang}` })
				.setTimestamp();

			await channel.send({ embeds: [embed] });
		}
	} catch (error) {
		console.error(`[Poller] Error announcing in guild ${guild_id}:`, error.message);
	}
}

/**
 * Returns an embed color based on LeetCode difficulty.
 */
function getDifficultyColor(difficulty) {
	switch (difficulty) {
		case 'Easy': return 0x00B8A3;
		case 'Medium': return 0xFFC01E;
		case 'Hard': return 0xFF375F;
		default: return 0xFFA116; // LeetCode orange
	}
}

// ========== Daily Recap & Streak Nudge Scheduler ==========

/**
 * Start the scheduler for daily recap (9 AM) and streak nudge (8 PM).
 * Checks every minute if it's time to run.
 */
export function startScheduler(client) {
	console.log('[Scheduler] Daily recap (9 AM) & streak nudge (8 PM) scheduled');

	let lastRecapDate = null;
	let lastNudgeDate = null;

	setInterval(() => {
		const now = new Date();
		const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

		// Daily recap: 9 AM (with a window until noon in case of restart)
		if (now.getHours() >= 9 && now.getHours() < 12 && lastRecapDate !== today) {
			lastRecapDate = today;
			sendDailyRecap(client);
		}

		// Streak nudge: 8 PM (with a window until 11 PM)
		if (now.getHours() >= 20 && now.getHours() < 23 && lastNudgeDate !== today) {
			lastNudgeDate = today;
			sendStreakNudge(client);
		}
	}, 60 * 1000); // Check every minute
}

/**
 * Post yesterday's top grinders in each guild's log channel.
 */
async function sendDailyRecap(client) {
	console.log('[Scheduler] Sending daily recap...');

	for (const [guildId] of client.guilds.cache) {
		try {
			const logChannelId = getLogChannel(guildId);
			if (!logChannelId) continue;

			const topSolvers = getYesterdaySolvers(guildId);
			if (topSolvers.length === 0) continue;

			const channel = await client.channels.fetch(logChannelId);
			if (!channel) continue;

			const lines = topSolvers.map((solver, i) => {
				return `${getMedal(i)} <@${solver.discord_id}> — **${solver.count}** problem${solver.count > 1 ? 's' : ''} solved`;
			});

			const embed = new EmbedBuilder()
				.setColor(0xFFD700)
				.setTitle('📊 Top Grinders of Yesterday')
				.setDescription(lines.join('\n'))
				.setFooter({ text: 'Keep grinding! 💪' })
				.setTimestamp();

			await channel.send({ embeds: [embed] });
		} catch (error) {
			console.error(`[Scheduler] Recap error for guild ${guildId}:`, error.message);
		}
	}
}

/**
 * Nudge users whose streaks are at risk (active streak but no solves today).
 */
async function sendStreakNudge(client) {
	console.log('[Scheduler] Checking streaks...');

	for (const [guildId] of client.guilds.cache) {
		try {
			const logChannelId = getLogChannel(guildId);
			if (!logChannelId) continue;

			const guildUsers = getGuildUsers(guildId);
			if (guildUsers.length === 0) continue;

			const atRisk = [];

			// Group by username to deduplicate API calls
			const checked = new Map();
			for (const user of guildUsers) {
				let profile = checked.get(user.leetcode_username);
				if (!profile) {
					try {
						profile = await getUserProfile(user.leetcode_username);
						checked.set(user.leetcode_username, profile || false);
						await sleep(1000);
					} catch {
						checked.set(user.leetcode_username, false);
						continue;
					}
				}

				if (!profile || profile.currentStreak === 0) continue;

				// Check if they've solved anything today
				const todaySolves = getTodaySolveCount(user.discord_id, guildId);
				if (todaySolves === 0) {
					atRisk.push({ discordId: user.discord_id, streak: profile.currentStreak });
				}
			}

			if (atRisk.length === 0) continue;

			const channel = await client.channels.fetch(logChannelId);
			if (!channel) continue;

			const lines = atRisk.map(u =>
				`⚠️ <@${u.discordId}> — **${u.streak}-day streak** at risk!`
			);

			const embed = new EmbedBuilder()
				.setColor(0xFF6B35)
				.setTitle('🔔 Streak Protection Alert')
				.setDescription(lines.join('\n') + '\n\nSolve a problem today to keep your streak alive!')
				.setTimestamp();

			await channel.send({ embeds: [embed] });
		} catch (error) {
			console.error(`[Scheduler] Streak nudge error for guild ${guildId}:`, error.message);
		}
	}
}
