import type { SkillDataModel } from '@/item/data/SkillDataModel';
import type { GenesysItem } from '@/item/GenesysItem';
import { configDefaults } from '@/settings/table';

export const GENESYS_CONFIG = {
	// The settings start at their defaults, until the 'setup' and 'ready' hooks apply their stored values.
	settings: configDefaults(),

	/** Miscellaneous **/
	skills: [] as GenesysItem<SkillDataModel>[],
};

/**
 * Called during 'init' hook to initialize the Genesys config data.
 */
export function register() {
	CONFIG.genesys = GENESYS_CONFIG;
}
