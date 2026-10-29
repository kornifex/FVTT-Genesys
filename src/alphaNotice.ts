/** @file The Alpha notice: the welcome message a GM reads in the chat when the system runs a new version. */

import { NAMESPACE } from '@/settings';
import { KEY_ALPHA_VERSION, NEW_WORLD_ALPHA_VERSION } from '@/settings/alpha';

/**
 * The version of the last Alpha notice the world showed.
 */
export function lastAlphaVersion() {
	return game.settings.get<string>(NAMESPACE, KEY_ALPHA_VERSION) ?? NEW_WORLD_ALPHA_VERSION;
}

/**
 * Show the GM the Alpha notice of the running version, once: showing it records the version as the last one noticed.
 */
export async function ready(lastAlpha: string) {
	if (!game.user.isGM) {
		return;
	}

	if (!foundry.utils.isNewerVersion(game.system.version, lastAlpha)) {
		return;
	}

	const message = await renderTemplate('systems/genesys/templates/chat/alpha-notice.hbs', { version: game.system.version });
	const enrichedMessage = await TextEditor.enrichHTML(message, { async: true });

	await ChatMessage.create({
		user: game.user.id,
		content: enrichedMessage,
		style: CONST.CHAT_MESSAGE_STYLES.OTHER,
	});

	await game.settings.set(NAMESPACE, KEY_ALPHA_VERSION, game.system.version);
}
