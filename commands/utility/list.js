import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGuildUsers } from '../../database/queries.js';
export default {
    data: new SlashCommandBuilder().setName('list').setDescription('Lists all linked accounts in server'),
    async execute(interaction) {        
        const guildId = interaction.guild.id;
        // Fetch linked accounts for the guild from the database
        const linkedAccounts = getGuildUsers(guildId);
        const fields = linkedAccounts.length > 0
            ? linkedAccounts.map(user => ({
                name: `<@${user}>`,
                value: `LeetCode: **${user.leetcode_username}**`,
            }))
            : [{ name: 'No linked accounts', value: 'Use `/link <username>` to connect your LeetCode profile!' }];
        const embed = new EmbedBuilder()
            .setColor(0xB2C197)
            .setTitle(`Linked Accounts - ${interaction.guild.name}`)
            .setDescription(`${linkedAccounts.length} account(s) linked`)
            .addFields(...fields)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};