/**
 * Config loader — supports both config.json (local dev) and environment variables (Replit).
 * 
 * On Replit, set these in the Secrets tab:
 *   TOKEN     → your bot token
 *   CLIENT_ID → your bot's client ID
 *   GUILD_ID  → your server's guild ID
 */
import { createRequire } from 'node:module';

let config = {};

// Try loading config.json first (local development)
try {
	const require = createRequire(import.meta.url);
	config = require('./config.json');
} catch {
	// config.json not found — fall back to environment variables (Replit)
}

export const token = process.env.TOKEN || config.token;
export const clientId = process.env.CLIENT_ID || config.clientId;
export const guildId = process.env.GUILD_ID || config.guildId;

if (!token) {
	console.error('[Config] No token found! Set TOKEN in environment variables or create config.json');
	process.exit(1);
}

export default { token, clientId, guildId };
