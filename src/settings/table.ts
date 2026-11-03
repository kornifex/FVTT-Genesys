/** @file The table of the system's world and client settings, from which they are registered and applied to `CONFIG.genesys.settings`. */

import { isPoolModificationValue } from '@/effects/PoolModifications';
import { loadSkills } from '@/settings/skills';

type DataField = foundry.data.fields.DataField.Any;

/** The value Foundry gives the system for a setting stored by the given field. */
type Value<T extends DataField> = foundry.data.fields.DataField.InitializedTypeFor<T>;

/** Turns a localization key into its text in the user's language. */
type Localize = (key: string) => string;

/**
 * A world or client setting shown in the settings menu.
 * @template T The field Foundry stores the value with.
 * @template F The field of `CONFIG.genesys.settings` the system reads the setting from.
 * @template C The type of that field.
 */
type Setting<T extends DataField, F extends string, C> = {
	scope: 'world' | 'client';
	/**
	 * The DataField Foundry cleans and validates the value with, refusing to store one it doesn't validate. It is built
	 * for each registration, since Foundry names the field after its setting.
	 */
	type(localize: Localize): T;
	default: Value<T>;
	/** Localization key of the name. */
	name: string;
	/** Localization key of the hint. */
	hint: string;
	/**
	 * Some of the system reads the setting once, as it starts or as a window opens, so Foundry asks for a reload when the
	 * value changes. Unless `readLive`, the new value waits for that reload.
	 */
	requiresReload?: boolean;
	/** With `requiresReload`, the rest of the system reads the value live, so a new value is applied at once too. */
	readLive?: boolean;
	/**
	 * The field of `CONFIG.genesys.settings` the system reads the setting from, and its value for the setting's value
	 * when it isn't that value.
	 */
	field?: { name: F; read?(value: Value<T>): C };
	/** What applying the value does besides writing `field`. */
	effect?(value: Value<T>, config: C): unknown;
	/** Applied on 'setup' instead of 'ready', for a setting the user interface needs before it first renders. */
	onSetup?: boolean;
};

/** Any entry of the table, whatever its types. */
export type AnySetting = Setting<DataField, string, unknown>;

function setting<T extends DataField, F extends string = never, C = Value<T>>(definition: Setting<T, F, C>) {
	return definition;
}

/** Default skills compendium to use if the setting is misconfigured. */
const DEFAULT_SKILLS_COMPENDIUM = 'genesys.crb-skills';

/** The default difficulty modifications to use if the setting is misconfigured. */
const DEFAULT_DIFFICULTY = 'DD';

/** A text the user types in, which may be empty. */
const textField = () => new foundry.data.fields.StringField({ required: true });

const switchField = () => new foundry.data.fields.BooleanField();

/**
 * A count the user types in. Foundry rounds a fractional one; a negative one is refused rather than raised to 0, which
 * the `min` option would do silently.
 */
export const countField = (localize: Localize) =>
	new foundry.data.fields.NumberField({
		required: true,
		nullable: false,
		integer: true,
		initial: 0,
		validate: (value: unknown) => typeof value === 'number' && value >= 0,
		validationError: localize('Genesys.Settings.CountError'),
	});

/**
 * The world and client settings, by the key Foundry stores each one under. A key must never change, or worlds and
 * clients lose the value they stored; a field of `CONFIG.genesys.settings` can be named for what the system does with it.
 */
export const SETTINGS = {
	/** The Skills Compendium to use for default skill data. */
	skillsCompendium: setting({
		scope: 'world',
		type: textField,
		default: DEFAULT_SKILLS_COMPENDIUM,
		name: 'Genesys.Settings.SkillsCompendium',
		hint: 'Genesys.Settings.SkillsCompendiumHint',
		field: {
			name: 'skillsCompendium',
			// We always want a Skills Compendium, so fall back to the default one if the setting is ever emptied.
			read: (value): string => value || DEFAULT_SKILLS_COMPENDIUM,
		},
		effect: loadSkills,
	}),

	/** Default dice pool modifications that should be added to the dice pool when doing a check. */
	defaultDifficulty: setting({
		scope: 'world',
		type: (localize) =>
			new foundry.data.fields.StringField({
				required: true,
				validate: (value: unknown) => typeof value === 'string' && isPoolModificationValue(value),
				validationError: localize('Genesys.Settings.DefaultDifficultyError'),
			}),
		default: DEFAULT_DIFFICULTY,
		name: 'Genesys.Settings.DefaultDifficulty',
		hint: 'Genesys.Settings.DefaultDifficultyHint',
		field: { name: 'defaultDifficulty' },
	}),

	/** The name of the skill to use for healing Critical Injuries. */
	skillForInjuries: setting({
		scope: 'world',
		type: textField,
		default: 'Resilience',
		name: 'Genesys.Settings.SkillForInjuries',
		hint: 'Genesys.Settings.SkillForInjuriesHint',
		field: { name: 'skillForHealingInjury' },
	}),

	/** The name of the skill to use for repairing Critical Hits. */
	skillForRepairingVehicleHits: setting({
		scope: 'world',
		type: textField,
		default: 'Mechanics',
		name: 'Genesys.Settings.SkillForRepairingVehicleHits',
		hint: 'Genesys.Settings.SkillForRepairingVehicleHitsHint',
		field: { name: 'skillForRepairingHit' },
	}),

	/** Name of the currency used for the setting. */
	currency: setting({
		scope: 'world',
		type: textField,
		default: 'Money',
		name: 'Genesys.Settings.Money',
		hint: 'Genesys.Settings.MoneyHint',
		field: { name: 'currencyName' },
	}),

	/** Number of free skill ranks characters gain from careers. */
	careerSkillRanks: setting({
		scope: 'world',
		type: countField,
		default: 4,
		name: 'Genesys.Settings.CareerSkillRanks',
		hint: 'Genesys.Settings.CareerSkillRanksHint',
		field: { name: 'freeCareerSkillRanks' },
	}),

	/** Whether to allow use of the Uncoupling Skills from Characteristics alternate rule. */
	uncoupleSkills: setting({
		scope: 'world',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.UncoupleSkillsAlternateRule',
		hint: 'Genesys.Settings.UncoupleSkillsAlternateRuleHint',
		field: { name: 'uncoupleSkillsFromCharacteristics' },
	}),

	/** Whether to show Damage and Critical on attack roll chat cards even when the roll was a failure; Qualities always show. */
	showDamageOnFailure: setting({
		scope: 'world',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.ShowDamageOnFailure',
		hint: 'Genesys.Settings.ShowDamageOnFailureHint',
		field: { name: 'showAttackDetailsOnFailure' },
	}),

	/** Whether to use the optional rule for super-characteristics. */
	useSuperCharacteristics: setting({
		scope: 'world',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.SuperCharacteristics',
		hint: 'Genesys.Settings.SuperCharacteristicsHint',
		field: { name: 'useSuperCharacteristics' },
	}),

	/** Whether characters can purchase talents without respecting the talent pyramid. */
	ignoreTalentPyramid: setting({
		scope: 'world',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.IgnoreTalentPyramid',
		hint: 'Genesys.Settings.IgnoreTalentPyramidHint',
		// The Talents tab reads it as it opens, to show the pyramid's summary; the purchase checks read it live.
		requiresReload: true,
		readLive: true,
		field: { name: 'ignoreTalentPyramid' },
	}),

	/** Whether each tier of a ranked talent is a separate item, bought as a rank at that item's tier in any order. */
	talentTierVersions: setting({
		scope: 'world',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.TalentTierVersions',
		hint: 'Genesys.Settings.TalentTierVersionsHint',
		field: { name: 'talentTierVersions' },
	}),

	/** The Style of the system's colors, chosen by the GM for every user. */
	style: setting({
		scope: 'world',
		// The settings menu localizes the labels of the choices.
		type: () =>
			new foundry.data.fields.StringField({
				required: true,
				choices: { genesys: 'Genesys.Settings.StyleGenesys', terrinoth: 'Genesys.Settings.StyleTerrinoth' },
			}),
		default: 'genesys',
		name: 'Genesys.Settings.Style',
		hint: 'Genesys.Settings.StyleHint',
		effect: (value) => {
			// The theme stylesheet overrides the Palette of the document root that carries this attribute.
			document.documentElement.dataset.genesysStyle = value;
		},
		onSetup: true,
	}),

	/** Whether to use the Magical Girl symbols where possible in the system. */
	useMagicalGirlSymbols: setting({
		scope: 'client',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.UseMagicalGirlSymbols',
		hint: 'Genesys.Settings.UseMagicalGirlSymbolsHint',
		requiresReload: true,
		field: { name: 'useMagicalGirlSymbols' },
	}),

	/** Whether to collapse the 'Pool Modifications' section when a dice prompt renders. */
	dicePoolCollapseModificationsDetails: setting({
		scope: 'client',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.DicePoolCollapseModifications',
		hint: 'Genesys.Settings.DicePoolCollapseModificationsHint',
		field: { name: 'startWithCollapsedPoolModifications' },
	}),

	/** Whether to automatically apply all the pool modifications shown on the dice prompt. */
	dicePoolAutoApplyModifications: setting({
		scope: 'client',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.DicePoolAutoApplyModifications',
		hint: 'Genesys.Settings.DicePoolAutoApplyModificationsHint',
		field: { name: 'autoApplyPoolModifications' },
	}),

	/** Whether to show the chance to succeed of a dice pool by constructing its permutations on a Web Worker. */
	dicePoolChanceToSucceedByPermutation: setting({
		scope: 'client',
		type: switchField,
		default: false,
		name: 'Genesys.Settings.DicePoolChanceToSucceedByPermutation',
		hint: 'Genesys.Settings.DicePoolChanceToSucceedByPermutationHint',
		requiresReload: true,
		field: { name: 'showChanceToSucceedFromPermutations' },
	}),

	/** Number of simulated rolls to do to calculate the dice pool success chance. A value of 0 disables the feature. */
	dicePoolApproximation: setting({
		scope: 'client',
		type: countField,
		default: 0,
		name: 'Genesys.Settings.DicePoolChanceToSucceedBySimulation',
		hint: 'Genesys.Settings.DicePoolChanceToSucceedBySimulationHint',
		field: {
			name: 'showChanceToSucceedFromSimulations',
			read: (amountOfRolls): { enabled: boolean; amountOfRolls: number } => ({ enabled: amountOfRolls > 0, amountOfRolls }),
		},
	}),
};

/** The key Foundry stores a setting of the table under. */
export type SettingKey = keyof typeof SETTINGS;

type FieldOf<S> = S extends Setting<DataField, infer F, unknown> ? F : never;
type ConfigOf<S> = S extends Setting<DataField, string, infer C> ? C : never;

/** The values of the settings the system reads, from `CONFIG.genesys.settings`. */
type ConfigSettings = { [K in SettingKey as FieldOf<(typeof SETTINGS)[K]>]: ConfigOf<(typeof SETTINGS)[K]> };

/** The table's entries, in the order the settings menu lists them. */
export function settingEntries() {
	return Object.entries(SETTINGS) as [SettingKey, AnySetting][];
}

/**
 * The value the system reads for a stored value. Foundry validates a value before storing it, but only cleans it when
 * reading it, so a value it refuses, which a version that didn't validate it could store, reads as the default.
 */
export function readable(entry: AnySetting, stored: unknown): unknown {
	// The text of a refusal is never shown here.
	return entry.type((key) => key).validate(stored) ? entry.default : stored;
}

/**
 * The value of a setting's field in `CONFIG.genesys.settings`, for a value the system reads.
 */
export function configValue(entry: AnySetting, value: unknown): unknown {
	return entry.field?.read ? entry.field.read(value) : value;
}

/**
 * The value of `CONFIG.genesys.settings` before the settings apply: each field holds its setting's default.
 */
export function configDefaults(): ConfigSettings {
	return Object.fromEntries(
		settingEntries().flatMap(([, entry]) => (entry.field ? [[entry.field.name, configValue(entry, entry.default)]] : [])),
	) as ConfigSettings;
}
