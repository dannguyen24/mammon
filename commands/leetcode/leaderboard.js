import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildUsers } from '../../database/queries.js';
import { getUserProfile } from '../../services/leetcode.js';

/** Returns a medal/rank string for leaderboard position */
function getMedal(index) {
	if (index === 0) return '🥇';
	if (index === 1) return '🥈';
	if (index === 2) return '🥉';
	return `**${index + 1}.**`;
}

export default {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Show the top grinders in this server'),

	async execute(interaction) {
		const guildId = interaction.guild.id;

		// Defer reply — fetching profiles for multiple users can take a moment
		await interaction.deferReply();

		try {
			const guildUsers = getGuildUsers(guildId);

			if (guildUsers.length === 0) {
				const embed = new EmbedBuilder()
					.setColor(0xFFA500)
					.setTitle('No Linked Users')
					.setDescription('No one in this server has linked their LeetCode account yet.\n\nUse `/link <username>` to get started!')
					.setTimestamp();

				return await interaction.editReply({ embeds: [embed] });
			}

			// Fetch profiles in parallel for speed (max 15 to avoid rate limits)
			const usersToFetch = guildUsers.slice(0, 15);
			const profileResults = await Promise.allSettled(
				usersToFetch.map(user => getUserProfile(user.leetcode_username))
			);

			// Combine DB data with live profile data
			const leaderboard = [];
			for (let i = 0; i < usersToFetch.length; i++) {
				const user = usersToFetch[i];
				const result = profileResults[i];

				if (result.status === 'fulfilled' && result.value) {
					leaderboard.push({
						discordId: user.discord_id,
						username: result.value.username,
						total: result.value.stats.total,
						easy: result.value.stats.easy,
						medium: result.value.stats.medium,
						hard: result.value.stats.hard,
						streak: result.value.currentStreak,
					});
				}
			}

			if (leaderboard.length === 0) {
				const embed = new EmbedBuilder()
					.setColor(0xFF0000)
					.setTitle('Error')
					.setDescription('Couldn\'t fetch any LeetCode profiles. Please try again later.')
					.setTimestamp();

				return await interaction.editReply({ embeds: [embed] });
			}

			// Sort by total problems solved (descending)
			leaderboard.sort((a, b) => b.total - a.total);

			// Build leaderboard lines (top 10)
			const lines = leaderboard.slice(0, 10).map((entry, i) => {
				const streakBadge = entry.streak > 0 ? ` 🔥${entry.streak}d` : '';
				return `${getMedal(i)} <@${entry.discordId}> — **${entry.total}** solved (${entry.easy}E / ${entry.medium}M / ${entry.hard}H)${streakBadge}`;
			});

			const embed = new EmbedBuilder()
				.setColor(0xFFD700)
				.setTitle(`🏆 ${interaction.guild.name} — LeetCode Leaderboard`)
				.setDescription(lines.join('\n'))
				.setFooter({ text: `${leaderboard.length} tracked member${leaderboard.length === 1 ? '' : 's'} • Stats fetched live` })
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('[Leaderboard] Error:', error);

			const embed = new EmbedBuilder()
				.setColor(0xFF0000)
				.setTitle('Error')
				.setDescription('Failed to fetch leaderboard data. Please try again later.')
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		}
	},
};
