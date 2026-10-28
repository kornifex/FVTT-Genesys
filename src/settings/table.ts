/** @file The table of the system's world and client settings, from which they are registered and applied to `CONFIG.genesys.settings`. */

import { isPoolModificationValue } from '@/effects/PoolModifications';
import { loadSkills } from '@/settings/skills';

type SettingType = StringConstructor | NumberConstructor | BooleanConstructor;

/** The value Foundry stores for a setting of the given type. */
type StoredValue<T extends SettingType> = ReturnType<T>;

/**
 * A world or client setting shown in the settings menu.
 * @template T The type of the stored value.
 * @template F The field of `CONFIG.genesys.settings` the system reads the setting from.
 * @template C The type of that field.
 */
type Setting<T extends SettingType, F extends string, C> = {
	scope: 'world' | 'client';
	type: T;
	default: StoredValue<T>;
	/** Localization key of the name. */
	name: string;
	/** Localization key of the hint. */
	hint: string;
	/** Localization keys of the choices' labels, by stored value. */
	choices?: Record<string, string>;
	/** The system reads these settings once, as it starts, so a new value waits for the reload Foundry asks for. */
	requiresReload?: boolean;
	field?: F;
	/** The value of `field` for a stored value, which can be `undefined` when Foundry can't read it. */
	normalize?(value: StoredValue<T> | undefined): C;
	/** What applying the value does besides writing `field`. */
	effect?(value: StoredValue<T> | undefined, normalized: C): unknown;
	/** Applied on 'setup' instead of 'ready', for a setting the user interface needs before it first renders. */
	onSetup?: boolean;
};

/** Any entry of the table, whatever its types. */
export type AnySetting = Setting<SettingType, string, unknown>;

function setting<T extends SettingType, F extends string = never, C = never>(definition: Setting<T, F, C>) {
	return definition;
}

/** Default skills compendium to use if the setting is misconfigured. */
const DEFAULT_SKILLS_COMPENDIUM = 'genesys.crb-skills';

/** The default difficulty modifications to use if the setting is misconfigured. */
const DEFAULT_DIFFICULTY = 'DD';

const asString = (value: string | undefined): string => value ?? '';
const asBoolean = (value: boolean | undefined): boolean => value ?? false;
/** A typed-in count can be negative or fractional. */
const asCount = (value: number | undefined): number => Math.floor(Math.abs(value ?? 0));

/**
 * The world and client settings, by the key Foundry stores each one under. A key must never change, or worlds and
 * clients lose the value they stored; a field of `CONFIG.genesys.settings` can be named for what the system does with it.
 */
export const SETTINGS = {
	/** The Skills Compendium to use for default skill data. */
	skillsCompendium: setting({
		scope: 'world',
		type: String,
		default: DEFAULT_SKILLS_COMPENDIUM,
		name: 'Genesys.Settings.SkillsCompendium',
		hint: 'Genesys.Settings.SkillsCompendiumHint',
		field: 'skillsCompendium',
		// We always want a Skills Compendium, so fall back to the default one if the setting is ever emptied.
		normalize: (value): string => value || DEFAULT_SKILLS_COMPENDIUM,
		effect: loadSkills,
	}),

	/** Default dice pool modifications that should be added to the dice pool when doing a check. */
	defaultDifficulty: setting({
		scope: 'world',
		type: String,
		default: DEFAULT_DIFFICULTY,
		name: 'Genesys.Settings.DefaultDifficulty',
		hint: 'Genesys.Settings.DefaultDifficultyHint',
		field: 'defaultDifficulty',
		normalize: (value): string => {
			const difficulty = value ?? '';
			return isPoolModificationValue(difficulty) ? difficulty : DEFAULT_DIFFICULTY;
		},
	}),

	/** The name of the skill to use for healing Critical Injuries. */
	skillForInjuries: setting({
		scope: 'world',
		type: String,
		default: 'Resilience',
		name: 'Genesys.Settings.SkillForInjuries',
		hint: 'Genesys.Settings.SkillForInjuriesHint',
		field: 'skillForHealingInjury',
		normalize: asString,
	}),

	/** The name of the skill to use for repairing Critical Hits. */
	skillForRepairingVehicleHits: setting({
		scope: 'world',
		type: String,
		default: 'Mechanics',
		name: 'Genesys.Settings.SkillForRepairingVehicleHits',
		hint: 'Genesys.Settings.SkillForRepairingVehicleHitsHint',
		field: 'skillForRepairingHit',
		normalize: asString,
	}),

	/** Name of the currency used for the setting. */
	currency: setting({
		scope: 'world',
		type: String,
		default: 'Money',
		name: 'Genesys.Settings.Money',
		hint: 'Genesys.Settings.MoneyHint',
		field: 'currencyName',
		normalize: asString,
	}),

	/** Number of free skill ranks characters gain from careers. */
	careerSkillRanks: setting({
		scope: 'world',
		type: Number,
		default: 4,
		name: 'Genesys.Settings.CareerSkillRanks',
		hint: 'Genesys.Settings.CareerSkillRanksHint',
		field: 'freeCareerSkillRanks',
		normalize: asCount,
	}),

	/** Whether to allow use of the Uncoupling Skills from Characteristics alternate rule. */
	uncoupleSkills: setting({
		scope: 'world',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.UncoupleSkillsAlternateRule',
		hint: 'Genesys.Settings.UncoupleSkillsAlternateRuleHint',
		field: 'uncoupleSkillsFromCharacteristics',
		normalize: asBoolean,
	}),

	/** Whether to show Damage, Critical, and Qualities on attack roll chat cards even when the roll was a failure. */
	showDamageOnFailure: setting({
		scope: 'world',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.ShowDamageOnFailure',
		hint: 'Genesys.Settings.ShowDamageOnFailureHint',
		field: 'showAttackDetailsOnFailure',
		normalize: asBoolean,
	}),

	/** Whether to use the optional rule for super-characteristics. */
	useSuperCharacteristics: setting({
		scope: 'world',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.SuperCharacteristics',
		hint: 'Genesys.Settings.SuperCharacteristicsHint',
		field: 'useSuperCharacteristics',
		normalize: asBoolean,
	}),

	/** Whether characters can purchase talents without respecting the talent pyramid. */
	ignoreTalentPyramid: setting({
		scope: 'world',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.IgnoreTalentPyramid',
		hint: 'Genesys.Settings.IgnoreTalentPyramidHint',
		field: 'ignoreTalentPyramid',
		normalize: asBoolean,
	}),

	/** Whether each tier of a ranked talent is a separate item, bought as a rank at that item's tier in any order. */
	talentTierVersions: setting({
		scope: 'world',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.TalentTierVersions',
		hint: 'Genesys.Settings.TalentTierVersionsHint',
		field: 'talentTierVersions',
		normalize: asBoolean,
	}),

	/** The Style of the system's colors, chosen by the GM for every user. */
	style: setting({
		scope: 'world',
		type: String,
		default: 'genesys',
		name: 'Genesys.Settings.Style',
		hint: 'Genesys.Settings.StyleHint',
		choices: {
			genesys: 'Genesys.Settings.StyleGenesys',
			terrinoth: 'Genesys.Settings.StyleTerrinoth',
		},
		effect: (value) => {
			// The theme stylesheet overrides the Palette of the document root that carries this attribute.
			document.documentElement.dataset.genesysStyle = value ?? 'genesys';
		},
		onSetup: true,
	}),

	/** Whether to use the Magical Girl symbols where possible in the system. */
	useMagicalGirlSymbols: setting({
		scope: 'client',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.UseMagicalGirlSymbols',
		hint: 'Genesys.Settings.UseMagicalGirlSymbolsHint',
		requiresReload: true,
		field: 'useMagicalGirlSymbols',
		normalize: asBoolean,
	}),

	/** Whether to collapse the 'Pool Modifications' section when a dice prompt renders. */
	dicePoolCollapseModificationsDetails: setting({
		scope: 'client',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.DicePoolCollapseModifications',
		hint: 'Genesys.Settings.DicePoolCollapseModificationsHint',
		field: 'startWithCollapsedPoolModifications',
		normalize: asBoolean,
	}),

	/** Whether to automatically apply all the pool modifications shown on the dice prompt. */
	dicePoolAutoApplyModifications: setting({
		scope: 'client',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.DicePoolAutoApplyModifications',
		hint: 'Genesys.Settings.DicePoolAutoApplyModificationsHint',
		field: 'autoApplyPoolModifications',
		normalize: asBoolean,
	}),

	/** Whether to show the chance to succeed of a dice pool by constructing its permutations on a Web Worker. */
	dicePoolChanceToSucceedByPermutation: setting({
		scope: 'client',
		type: Boolean,
		default: false,
		name: 'Genesys.Settings.DicePoolChanceToSucceedByPermutation',
		hint: 'Genesys.Settings.DicePoolChanceToSucceedByPermutationHint',
		requiresReload: true,
		field: 'showChanceToSucceedFromPermutations',
		normalize: asBoolean,
	}),

	/** Number of simulated rolls to do to calculate the dice pool success chance. A value of 0 disables the feature. */
	dicePoolApproximation: setting({
		scope: 'client',
		type: Number,
		default: 0,
		name: 'Genesys.Settings.DicePoolChanceToSucceedBySimulation',
		hint: 'Genesys.Settings.DicePoolChanceToSucceedBySimulationHint',
		field: 'showChanceToSucceedFromSimulations',
		normalize: (value): { enabled: boolean; amountOfRolls: number } => {
			const amountOfRolls = asCount(value);
			return { enabled: amountOfRolls > 0, amountOfRolls };
		},
	}),
};

/** The key Foundry stores a setting of the table under. */
export type SettingKey = keyof typeof SETTINGS;

type FieldOf<S> = S extends Setting<SettingType, infer F, unknown> ? F : never;
type ValueOf<S> = S extends Setting<SettingType, string, infer C> ? C : never;

/** The values of the settings the system reads, from `CONFIG.genesys.settings`. */
type ConfigSettings = { [K in SettingKey as FieldOf<(typeof SETTINGS)[K]>]: ValueOf<(typeof SETTINGS)[K]> };

/** The table's entries, in the order the settings menu lists them. */
export function settingEntries() {
	return Object.entries(SETTINGS) as [SettingKey, AnySetting][];
}

/**
 * The value of `CONFIG.genesys.settings` before the settings apply: each field holds its setting's default.
 */
export function configDefaults(): ConfigSettings {
	return Object.fromEntries(
		settingEntries().flatMap(([, entry]) => (entry.field && entry.normalize ? [[entry.field, entry.normalize(entry.default)]] : [])),
	) as ConfigSettings;
}
