import { REST, Routes } from 'discord.js';
import { token, clientId } from './config-loader.js';

const rest = new REST().setToken(token);
const guildId = process.argv[2];

if (!guildId) {
    console.error('Usage: node cleanup-guild-commands.js <guildId>');
    process.exit(1);
}

(async () => {
    try {
        console.log('Deleting guild-specific commands...');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        console.log('✅ Deleted all guild commands. Global commands remain.');
    } catch (error) {
        console.error(error);
    }
})();
