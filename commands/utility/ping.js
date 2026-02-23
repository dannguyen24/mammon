import { SlashCommandBuilder } from 'discord.js';

// Define the /ping command
export default {
	// data property defines the command's name and description
	data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
	// execute function runs when the command is invoked
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};