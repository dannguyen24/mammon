import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getDailyProblem } from '../../services/leetcode.js';

export default {
	data: new SlashCommandBuilder()
		.setName('daily')
		.setDescription('Show today\'s LeetCode Daily Challenge'),

	async execute(interaction) {
		await interaction.deferReply();

		try {
			const problem = await getDailyProblem();

			if (!problem) {
				const embed = new EmbedBuilder()
					.setColor(0xFF0000)
					.setTitle('Error')
					.setDescription('Couldn\'t fetch today\'s daily challenge. Try again later.')
					.setTimestamp();

				return await interaction.editReply({ embeds: [embed] });
			}

			// Color-code by difficulty
			const diffColors = { Easy: 0x00B8A3, Medium: 0xFFC01E, Hard: 0xFF375F };
			const diffEmojis = { Easy: '🌱', Medium: '🌲', Hard: '⛰️' };

			const embed = new EmbedBuilder()
				.setColor(diffColors[problem.difficulty] || 0xFFA116)
				.setTitle(`📅 Daily Challenge — ${problem.date}`)
				.addFields(
					{
						name: 'Problem',
						value: `**[${problem.title}](${problem.link})**`,
					},
					{
						name: 'Difficulty',
						value: `${diffEmojis[problem.difficulty] || '❓'} ${problem.difficulty}`,
						inline: true,
					},
					{
						name: 'Acceptance Rate',
						value: `${problem.acceptanceRate.toFixed(1)}%`,
						inline: true,
					},
				);

			// Show topic tags if available
			if (problem.tags && problem.tags.length > 0) {
				embed.addFields({
					name: 'Topics',
					value: problem.tags.map(t => `\`${t}\``).join(', '),
				});
			}

			embed
				.setFooter({ text: 'Good luck! 🍀' })
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error('[Daily] Error:', error);

			const embed = new EmbedBuilder()
				.setColor(0xFF0000)
				.setTitle('Error')
				.setDescription('Failed to fetch the daily challenge. Please try again later.')
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		}
	},
};
