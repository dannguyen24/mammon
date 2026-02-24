import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('mammon-help')
		.setDescription('Lists all available Mammon bot commands'),

	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setColor(0xB2C197)
			.setTitle('Commands List')
			.addFields(
				{
					name: 'Account',
					value: [
						'`/link <username>` — Connect your LeetCode profile\n',
						'`/untrack` — Unlink your account & stop tracking',
					].join(' '),
				},
				{
					name: 'Stats',
					value: [
						'`/stats [@user]` — View LeetCode stats (yours or another member)\n',
						'`/leaderboard` — Server rankings by problems solved',
					].join(' '),
				},
				{
					name: 'Community',
					value: [
						'`/daily` — Today\'s LeetCode Daily Challenge',
					].join(' '),
				},
				{
					name: 'Server Setup',
					value: [
						'`/setchannel` — Set the channel for automated announcements',
					].join(' '),
				},
				// {
				// 	name: 'Automated Features',
				// 	value: [
				// 		'**Victory Announcements** — New solves posted in the log channel',
				// 		'**Daily Recap (9 AM)** — Yesterday\'s top grinders',
				// 		'**Streak Alerts (8 PM)** — Nudge for users at risk of losing streaks',
				// 	].join(' '),
				// },
			)
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
