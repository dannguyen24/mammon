import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { setLogChannel, getLogChannel } from '../../database/queries.js';

export default {
	data: new SlashCommandBuilder()
		.setName('setchannel')
		.setDescription('Set the channel for automated announcements (victory posts, recaps, streak alerts)')
		.addChannelOption(option =>
			option
				.setName('channel')
				.setDescription('The text channel to use (defaults to current channel)')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(false)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

	async execute(interaction) {
		const guildId = interaction.guild.id;
		const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

		// Save the log channel to the database
		setLogChannel(guildId, targetChannel.id);

		const embed = new EmbedBuilder()
			.setColor(0x00FF00)
			.setTitle('📢 Log Channel Set')
			.setDescription(
				`Automated announcements will now be posted in <#${targetChannel.id}>.\n\n` +
				'This includes:\n' +
				'• 🔥 Victory announcements (new problem solves)\n' +
				'• 📊 Daily recap (yesterday\'s top grinders)\n' +
				'• 🔔 Streak protection alerts'
			)
			.setTimestamp();

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	},
};
