import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { linkUser, getUser, updateLastSubmissionTimestamp } from '../../database/queries.js';
import { getUserProfile, getRecentSubmissions } from '../../services/leetcode.js';

export default {
	data: new SlashCommandBuilder()
		.setName('link')
		.setDescription('Link your Discord account to your LeetCode profile')
		.addStringOption(option =>
			option
				.setName('username')
				.setDescription('Your LeetCode username')
				.setRequired(true)
		),

	async execute(interaction) {
		const username = interaction.options.getString('username');
		const discordId = interaction.user.id;
		const guildId = interaction.guild.id;

		// Defer reply since LeetCode API might take a moment
		await interaction.deferReply();

		try {
			// Check if user already has a linked account
			const existingUser = getUser(discordId, guildId);

			// Validate that the LeetCode username exists
			const profile = await getUserProfile(username);
			
			if (!profile) {
				const errorEmbed = new EmbedBuilder()
					.setColor(0xFF0000)
					.setTitle('User Not Found')
					.setDescription(`Could not find a LeetCode user with username **${username}**.\n\nPlease check the spelling and try again.`)
					.setTimestamp();

				return await interaction.editReply({ embeds: [errorEmbed] });
			}

			// Link the user
			linkUser(discordId, guildId, username);

			// Build success embed
			const embed = new EmbedBuilder()
				.setColor(0x00FF00)
				.setTitle('LeetCode Profile Linked!')
				.setThumbnail(profile.avatar || 'https://leetcode.com/static/images/LeetCode_logo.png')
				.addFields(
					{ name: 'LeetCode Username', value: profile.username, inline: true },
					{ name: 'Global Ranking', value: profile.ranking ? `#${profile.ranking.toLocaleString()}` : 'Unranked', inline: true },
					{ name: 'Problems Solved', value: `${profile.stats.total}`, inline: true },
				)
				.setTimestamp();

			if (existingUser) {
				embed.setFooter({ text: `Updated from: ${existingUser.leetcode_username}` });
			}

			// Set the initial submission timestamp so the poller doesn't announce old problems
			try {
				const recent = await getRecentSubmissions(username, 1);
				if (recent && recent.length > 0) {
					updateLastSubmissionTimestamp(discordId, guildId, Number.parseInt(recent[0].timestamp));
				}
			} catch { /* non-critical */ }

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('[Link Command] Error:', error);

			const errorEmbed = new EmbedBuilder()
				.setColor(0xFF0000)
				.setTitle('Error')
				.setDescription('Failed to link your LeetCode profile. Please try again later.')
				.setTimestamp();

			await interaction.editReply({ embeds: [errorEmbed] });
		}
	},
};
