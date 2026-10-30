import type { Stored } from '@/data/Stored';
import type { SkillDataModel } from '@/item/data/SkillDataModel';
import type { GenesysItem } from '@/item/GenesysItem';
import { configDefaults } from '@/settings/table';

/**
 * The system's entry in `CONFIG`, as `CONFIG.genesys`.
 */
export const GENESYS_CONFIG = {
	// The settings start at their defaults, until the 'setup' and 'ready' hooks apply their stored values.
	settings: configDefaults(),

	/**
	 * The skills of the Skills Compendium, loaded again when the setting or the compendium changes.
	 */
	skills: [] as Stored<GenesysItem<SkillDataModel>>[],
};

/**
 * Called during 'init' hook to initialize the Genesys config data.
 */
export function register() {
	CONFIG.genesys = GENESYS_CONFIG;
}
