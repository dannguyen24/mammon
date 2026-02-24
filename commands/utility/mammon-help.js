import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('mammon-help')
		.setDescription('Lists all available Mammon bot commands'),

	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setColor(0xB2C197)
			.setTitle('Mammon — Command Guide')
			.setDescription('Your competitive LeetCode tracking companion. Here\'s everything I can do:')
			.addFields(
				{
					name: '👤 Account',
					value: [
						'`/link <username>` — Connect your LeetCode profile',
						'`/untrack` — Unlink your account & stop tracking',
					].join('\n'),
				},
				{
					name: '📈 Stats',
					value: [
						'`/stats [@user]` — View LeetCode stats (yours or another member)',
						'`/leaderboard` — Server rankings by problems solved',
					].join('\n'),
				},
				{
					name: '🏘️ Community',
					value: [
						'`/daily` — Today\'s LeetCode Daily Challenge',
					].join('\n'),
				},
				{
					name: '⚙️ Server Setup',
					value: [
						'`/setchannel` — Set the channel for automated announcements',
					].join('\n'),
				},
				{
					name: '🤖 Automated Features',
					value: [
						'**Victory Announcements** — New solves posted in the log channel',
						'**Daily Recap (9 AM)** — Yesterday\'s top grinders',
						'**Streak Alerts (8 PM)** — Nudge for users at risk of losing streaks',
					].join('\n'),
				},
			)
			.setFooter({ text: 'Mammon • /mammon-help' })
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
