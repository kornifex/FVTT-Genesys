import { NAMESPACE as SETTINGS_NAMESPACE } from '@/settings';
import {
	KEY_CAREER_SKILL_RANKS,
	KEY_DEFAULT_DIFFICULTY,
	KEY_IGNORE_TALENT_PYRAMID,
	KEY_TALENT_TIER_VERSIONS,
	KEY_MONEY_NAME,
	KEY_SHOW_DAMAGE_ON_FAILURE,
	KEY_SKILLS_COMPENDIUM,
	KEY_SKILL_FOR_INJURIES,
	KEY_SKILL_FOR_REPAIRING_VEHICLE_HITS,
	KEY_STYLE,
	KEY_SUPER_CHARACTERISTICS,
	KEY_UNCOUPLE_SKILLS_FROM_CHARACTERISTICS,
	loadSkills,
} from '@/settings/campaign';
import {
	KEY_AUTO_APPLY_POOL_MODIFICATIONS,
	KEY_CHANCE_TO_SUCCEED_BY_PERMUTATION,
	KEY_CHANCE_TO_SUCCEED_BY_SIMULATION,
	KEY_COLLAPSE_POOL_MODIFICATIONS,
	KEY_USE_MAGICAL_GIRL_SYMBOLS,
} from '@/settings/user';
import { SkillDataModel } from '@/item/data/SkillDataModel';
import { GenesysItem } from '@/item/GenesysItem';

/**
 * Default skills compendium to use if the setting is misconfigured.
 */
export const DEFAULT_SKILLS_COMPENDIUM = 'genesys.crb-skills';

/**
 * The default difficulty modifications to use if the setting is misconfigured.
 */
export const DEFAULT_DIFFICULTY = 'DD';

export const GENESYS_CONFIG = {
	settings: {
		/** World Settings **/

		// Default skills compendium to use if the setting is misconfigured.
		skillsCompendium: DEFAULT_SKILLS_COMPENDIUM,

		// Default dice pool modifications that should be added to the dice pool when doing a check.
		defaultDifficulty: DEFAULT_DIFFICULTY,

		// The name of the skill to use for healing Critical Injuries.
		skillForHealingInjury: 'Resilience',

		// The name of the skill to use for repairing Critical Hits.
		skillForRepairingHit: 'Mechanics',

		// Name of the currency used for the setting.
		currencyName: 'Money',

		// Number of free skill ranks characters gain from careers.
		freeCareerSkillRanks: 4,

		// Whether to allow use of the Uncoupling Skills from Characteristics alternate rule.
		uncoupleSkillsFromCharacteristics: false,

		// Whether to show Damage, Critical, and Qualities on attack roll chat cards even when the roll was a failure.
		showAttackDetailsOnFailure: false,

		// Whether to use the optional rule for super-characteristics.
		useSuperCharacteristics: false,

		// Whether characters can purchase talents without respecting the talent pyramid.
		ignoreTalentPyramid: false,

		// Whether each tier of a ranked talent is a separate item, bought as a rank at that item's tier in any order.
		talentTierVersions: false,

		/** User Settings **/

		// Whether to use the Magical Girl symbols where possible in the system.
		useMagicalGirlSymbols: false,

		// Wheter to collapse the 'Pool Modifications' section when a dice prompt renders.
		startWithCollapsedPoolModifications: false,

		// Wheter to automatically apply all the pool modifications shown on the dice prompt.
		autoApplyPoolModifications: false,

		// Wheter to show the chance to succeed of a dice pool by constructing permutations.
		showChanceToSucceedFromPermutations: false,

		showChanceToSucceedFromSimulations: {
			// Wheter to show the chance to succeed of a dice pool by performing simulations.
			enabled: false,

			// Number of simulated rolls to do to calculate the dice pool success chance.
			amountOfRolls: 0,
		},
	},

	/** Miscellaneous **/
	skills: [] as GenesysItem<SkillDataModel>[],
};

/**
 * Called during 'init' hook to initialize the Genesys config data.
 */
export function register() {
	CONFIG.genesys = GENESYS_CONFIG;
}

/**
 * Apply the current value of a setting, as its onChange does when the value changes.
 */
function applySetting<S>(key: string) {
	void game.settings.settings.get<S>(`${SETTINGS_NAMESPACE}.${key}`)?.onChange?.(game.settings.get<S>(SETTINGS_NAMESPACE, key));
}

/**
 * Called on 'setup' to apply the settings that must take effect before the user interface first renders.
 */
export function setup() {
	applySetting<string>(KEY_STYLE);
}

/**
 * Called on 'ready' to initialize the values of the Genesys CONFIG with the settings established in init.
 */
export function ready() {
	/** World Settings **/
	void loadSkills(game.settings.get<string>(SETTINGS_NAMESPACE, KEY_SKILLS_COMPENDIUM));
	applySetting<string>(KEY_DEFAULT_DIFFICULTY);
	applySetting<string>(KEY_SKILL_FOR_INJURIES);
	applySetting<string>(KEY_SKILL_FOR_REPAIRING_VEHICLE_HITS);
	applySetting<string>(KEY_MONEY_NAME);
	applySetting<number>(KEY_CAREER_SKILL_RANKS);
	applySetting<boolean>(KEY_UNCOUPLE_SKILLS_FROM_CHARACTERISTICS);
	applySetting<boolean>(KEY_SHOW_DAMAGE_ON_FAILURE);
	applySetting<boolean>(KEY_SUPER_CHARACTERISTICS);
	applySetting<boolean>(KEY_IGNORE_TALENT_PYRAMID);
	applySetting<boolean>(KEY_TALENT_TIER_VERSIONS);

	/** User Settings **/
	CONFIG.genesys.settings.useMagicalGirlSymbols = game.settings.get<boolean>(SETTINGS_NAMESPACE, KEY_USE_MAGICAL_GIRL_SYMBOLS) ?? false;
	applySetting<boolean>(KEY_COLLAPSE_POOL_MODIFICATIONS);
	applySetting<boolean>(KEY_AUTO_APPLY_POOL_MODIFICATIONS);
	CONFIG.genesys.settings.showChanceToSucceedFromPermutations =
		game.settings.get<boolean>(SETTINGS_NAMESPACE, KEY_CHANCE_TO_SUCCEED_BY_PERMUTATION) ?? false;
	applySetting<number>(KEY_CHANCE_TO_SUCCEED_BY_SIMULATION);
}
