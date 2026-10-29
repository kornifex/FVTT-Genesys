import { GenesysActorDirectory } from '@/sidebar/GenesysActorDirectory';
import { GenesysCompendium } from '@/sidebar/GenesysCompendium';
import { GenesysItemDirectory } from '@/sidebar/GenesysItemDirectory';

// The compendium types whose windows the sheets' drop areas highlight a drag from.
const PATCHED_COMPENDIUM_TYPES = ['Actor', 'Item'];

/**
 * Show the actor and item compendiums with {@link GenesysCompendium}, so that the sheets' drop areas highlight when
 * something is dragged from one.
 */
function patchCompendiums() {
	// Foundry hardcodes the class of a compendium's window, so each pack's window is replaced by ours, once. The compendium
	// directory renders right after a compendium is created, which patches the new ones too.
	const patched = new Set<string>();
	Hooks.on('renderCompendiumDirectory', () => {
		for (const pack of game.packs.values()) {
			if (patched.has(pack.metadata.id)) {
				continue;
			}

			patched.add(pack.metadata.id);
			if (PATCHED_COMPENDIUM_TYPES.includes(pack.metadata.type)) {
				pack.apps.shift();
				pack.apps.push(new GenesysCompendium({ collection: pack }));
			}
		}
	});
}

export function register() {
	CONFIG.ui.actors = GenesysActorDirectory;
	CONFIG.ui.items = GenesysItemDirectory;

	patchCompendiums();
}
