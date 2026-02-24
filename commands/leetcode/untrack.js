import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getUser, unlinkUser } from '../../database/queries.js';

export default {
	data: new SlashCommandBuilder()
		.setName('untrack')
		.setDescription('Unlink your LeetCode account and stop tracking your stats'),

	async execute(interaction) {
		const discordId = interaction.user.id;
		const guildId = interaction.guild.id;

		// Check if the user is actually tracked
		const existingUser = getUser(discordId, guildId);

		if (!existingUser) {
			const embed = new EmbedBuilder()
				.setColor(0xFFA500)
				.setTitle('Not Tracked')
				.setDescription('You don\'t have a linked LeetCode account in this server.\n\nUse `/link <username>` to get started.')
				.setTimestamp();

			return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		}

		// Remove the user from the database
		const removed = unlinkUser(discordId, guildId);

		if (removed) {
			const embed = new EmbedBuilder()
				.setColor(0x00FF00)
				.setTitle('Successfully Untracked')
				.setDescription(
					`Your LeetCode account (**${existingUser.leetcode_username}**) has been unlinked.\n\n` +
					'Your stats will no longer be monitored in this server.\n' +
					'Use `/link <username>` anytime to reconnect.'
				)
				.setTimestamp();

			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		} else {
			const embed = new EmbedBuilder()
				.setColor(0xFF0000)
				.setTitle('Error')
				.setDescription('Something went wrong while unlinking. Please try again.')
				.setTimestamp();

			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		}
	},
};
