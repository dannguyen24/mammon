import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUser } from '../../database/queries.js';
import { getUserProfile } from '../../services/leetcode.js';

export default {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Display LeetCode stats for a user')
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('The Discord user to check (defaults to yourself)')
				.setRequired(false)
		),

	async execute(interaction) {
		const targetUser = interaction.options.getUser('user') || interaction.user;
		const discordId = targetUser.id;
		const guildId = interaction.guild.id;

		// Defer reply since LeetCode API might take a moment
		await interaction.deferReply();

		try {
			// Get linked LeetCode username from database
			const linkedUser = getUser(discordId, guildId);

			if (!linkedUser) {
				const notLinkedEmbed = new EmbedBuilder()
					.setColor(0xFFA500)
					.setTitle('Not Linked')
					.setDescription(
						targetUser.id === interaction.user.id
							? 'You haven\'t linked your LeetCode account yet!\n\nUse `/link <username>` to get started.'
							: `**${targetUser.username}** hasn't linked their LeetCode account yet.`
					)
					.setTimestamp();

				return await interaction.editReply({ embeds: [notLinkedEmbed] });
			}

			// Fetch live stats from LeetCode
			const profile = await getUserProfile(linkedUser.leetcode_username);

			if (!profile) {
				const errorEmbed = new EmbedBuilder()
					.setColor(0xFF0000)
					.setTitle('Profile Not Found')
					.setDescription(`The linked LeetCode account **${linkedUser.leetcode_username}** could not be found.\n\nThe account may have been deleted or renamed. Use \`/link\` to update.`)
					.setTimestamp();

				return await interaction.editReply({ embeds: [errorEmbed] });
			}

			// Build stats embed with color-coded difficulty breakdown
			const statsEmbed = new EmbedBuilder()
				.setColor(0xFFA116) // LeetCode orange
				.setAuthor({
					name: targetUser.username,
					iconURL: targetUser.displayAvatarURL(),
				})
				.setTitle(`${profile.username}'s LeetCode Stats`)
				.setURL(`https://leetcode.com/${profile.username}`)
				.setThumbnail(profile.avatar || 'https://leetcode.com/static/images/LeetCode_logo.png')
				.addFields(
					{
						name: '📊 Problems Solved',
						value: [
							`**Total:** ${profile.stats.total}`,
							`🟢 Easy: ${profile.stats.easy}`,
							`🟡 Medium: ${profile.stats.medium}`,
							`🔴 Hard: ${profile.stats.hard}`,
						].join('\n'),
						inline: true,
					},
					{
						name: '🏆 Ranking',
						value: profile.ranking ? `#${profile.ranking.toLocaleString()}` : 'Unranked',
						inline: true,
					},
					{
						name: '🔥 Streak',
						value: `${profile.currentStreak} days`,
						inline: true,
					},
				)
				.setFooter({ text: 'LeetCode Tracker' })
				.setTimestamp();

			await interaction.editReply({ embeds: [statsEmbed] });
		} catch (error) {
			console.error('[Stats Command] Error:', error);

			const errorEmbed = new EmbedBuilder()
				.setColor(0xFF0000)
				.setTitle('Error')
				.setDescription('Failed to fetch LeetCode stats. Please try again later.')
				.setTimestamp();

			await interaction.editReply({ embeds: [errorEmbed] });
		}
	},
};
