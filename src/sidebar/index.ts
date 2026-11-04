import { GenesysActorDirectory } from '@/sidebar/GenesysActorDirectory';
import { GenesysCompendium } from '@/sidebar/GenesysCompendium';
import { GenesysItemDirectory } from '@/sidebar/GenesysItemDirectory';

// The compendium types whose windows the sheets' drop areas highlight a drag from.
const GENESYS_COMPENDIUM_TYPES = ['Actor', 'Item'];

/**
 * Show the actor and item compendiums with {@link GenesysCompendium}, so that the sheets' drop areas highlight when
 * something is dragged from one.
 */
function setCompendiumWindowClass() {
	// Foundry creates a pack's window from the pack's `applicationClass` once the pack is in `game.packs`: at the UI's
	// initialization for the world's packs, and right after it is added for a pack created during the session, with no
	// hook in between. So each pack gets the class as it is added; a module changing it afterwards, at `setup`, wins.
	const packs = game.packs;
	const set = packs.set.bind(packs);
	packs.set = (key, pack) => {
		if (GENESYS_COMPENDIUM_TYPES.includes(pack.metadata.type)) {
			pack.applicationClass = GenesysCompendium;
		}

		return set(key, pack);
	};
}

/**
 * Register the system's actor and item directories, and its compendium windows.
 */
export function register() {
	// The types take the core classes, whose generic constructors no subclass of a fixed instantiation matches.
	CONFIG.ui.actors = GenesysActorDirectory as typeof foundry.applications.sidebar.tabs.ActorDirectory;
	CONFIG.ui.items = GenesysItemDirectory as typeof foundry.applications.sidebar.tabs.ItemDirectory;

	setCompendiumWindowClass();
}
