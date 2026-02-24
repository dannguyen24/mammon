/**
 * Main bot file: Connects to Discord and loads all commands.
 * 
 * We need:
 * - Client: Bot's connection to Discord
 * - Collection: Store and organize commands by name
 * - Events: Listen to Discord events (ready, interactions, etc.)
 * - GatewayIntentBits: Define which events bot receives
 * - MessageFlags: Control message visibility (e.g., ephemeral = only visible to user)
 */
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import config from './config.json' with { type: 'json' };
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


/**==========================SETUP DIRECTORY AND CLIENT==========================*/

const __filename = fileURLToPath(import.meta.url);//current file's filepath
const __dirname = path.dirname(__filename); //directory of the current file
const { token } = config;

console.log('Bot is starting...');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Event listener for when the bot is ready and connected to Discord.
client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

/**==========================ADD COMMANDS TO CLIENT==========================*/

//Collection to store commands, allowing us to easily retrieve and execute them based on user interactions.
client.commands = new Collection(); 

/**
 * Dynamically read command files from the 'commands' directory, 
 * import them, and store them in the client's command collection.
 * 
 * Example: 
 * foldersPath = '/path/to/mammon/commands'
 * commandFolders = ['leetcode', 'utility']
 */
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath); 

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder); //Example: '/path/to/mammon/commands/leetcode'
   
	// read all the files in the commands directory that ends with .js
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
	// add commands to the client's command collection
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
        // dynamically import the command file
		const command = await import(`file://${filePath}`);
		// Result: command = { default: { data: ..., execute: ... } }
			
		const cmd = command.default || command;
		// set (command name, command module) in the client's command collection
		if ('data' in cmd && 'execute' in cmd) {
			client.commands.set(cmd.data.name, cmd);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
/**==========================INTERACTION HANDLING==========================*/

/**
 * https://discordjs.guide/legacy/interactive-components/interactions
 * When a user interacts with the bot (e.g., using a slash command), this event listener is triggered.
 * It checks if the interaction is a chat input command, retrieves the corresponding command module, and executes it.
 * If any errors occur during execution, it sends an ephemeral error message back to the user.
*/
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return; // Only handle slash commands
	// Use the same client instance on the interaction to look up the command by name.
	const command = interaction.client.commands.get(interaction.commandName); // Retrieve the command module based on the command name from the interaction
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		// Execute the command's logic, passing in the interaction object.
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