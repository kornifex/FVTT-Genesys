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

	const enrichedMessage = await TextEditor.enrichHTML(
		/*html*/ `
	<h3 style="font-family: 'Bebas Neue', sans-serif">Genesys Alpha ${game.system.version}</h3>
	<p>
		Hello! Thank you for giving the Genesys system a try! Please note that this system is currently in an alpha state; it is ready for some early playtesting and experimentation, but there are many features that are yet unimplemented and may be bugs!
	</p>
	<div style="text-align: center">@symbol[satfhd]</div>
	<h4 style="font-family: 'Bebas Neue', sans-serif">Bug Fixes & Updates</h4>
	<ul style="margin-top: 0">
      <li>The system is now maintained at <a href="https://github.com/kornifex/FVTT-Genesys">kornifex/FVTT-Genesys</a>.</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/1824caef9f1a93d8d0b3acf8ca9f0cb9129db452">[FIX]</a>: Count every term of a repeated die in roll results, so a hand-typed formula such as <code>2da + 1da</code> keeps the symbols of the second term</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/ae497293602c9aa602ee8d3fcb9453e622a4134f">[FEATURE]</a>: Add a "Style" world setting, with a Realms of Terrinoth color variant chosen by the GM for every user</li>
      <li><a href="https://github.com/kornifex/FVTT-Genesys/commit/dc0df416da4304262cb39b721fd9315b98eb0773">[STYLING]</a>: Use only FontAwesome Free icons: a few sheet icons change (injuries, inventory, weapons, careers)</li>
	</ul>
	<div style="text-align: center">@dice[apbdcs]</div>
	<h4 style="font-family: 'Bebas Neue', sans-serif">Useful Links</h4>
	<ul style="margin-top: 0">
		<li><a href="https://github.com/kornifex/FVTT-Genesys/wiki">Project Documentation</a></li>
		<li><a href="https://github.com/kornifex/FVTT-Genesys">Project Source Code</a></li>
		<li><a href="https://github.com/kornifex/FVTT-Genesys/issues">Report Bugs &amp; Suggest Features</a></li>
		<li><a href="https://github.com/kornifex/FVTT-Genesys/blob/main/LICENSE">Licensed under the MIT License</a></li>
	</ul>
	`,
		{ async: true },
	);

	await ChatMessage.create({
		user: game.user.id,
		content: enrichedMessage,
		style: CONST.CHAT_MESSAGE_STYLES.OTHER,
	});

	await game.settings.set(NAMESPACE, KEY_ALPHA_VERSION, game.system.version);
}
