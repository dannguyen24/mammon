// Require the necessary discord.js classes
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import config from './config.json' with { type: 'json' };
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { token } = config;

console.log('Bot is starting...');
// Create a new client instance, representing the connection to your bot..
// GatewayIntentBits specify what type the events the bot will receive, Guilds intent will provide server information..
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

console.log(`Client created. token is ${token}`);
// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Load command files
client.commands = new Collection(); 

// construct path to the commands directory
const foldersPath = path.join(__dirname, 'commands');
// read the path to the directory and retuns an array of all the folder names it contains
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
    // read all the files in the commands directory that ends with .js
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
        // dynamically import the command file
		const command = await import(`file://${filePath}`);
		const cmd = command.default || command;
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in cmd && 'execute' in cmd) {
			client.commands.set(cmd.data.name, cmd);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return; 
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
});

// Log in to Discord with your bot's token
client.login(token);