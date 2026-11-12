import { describe, expect, it, vi } from 'vitest';

// Foundry's fields, reduced to their kind and the options they are built with. Their validation is reduced to the
// validator a setting gives its field: Foundry's own rules (types, blanks, choices) are left to the e2e scenarios.
vi.hoisted(() => {
	class DataField {
		constructor(readonly options: { validate?: (value: unknown) => boolean } = {}) {}
		validate(value: unknown) {
			return this.options.validate?.(value) === false ? { invalidValue: value } : undefined;
		}
	}
	const field = (kind: string) =>
		class extends DataField {
			kind = kind;
		};
	vi.stubGlobal('foundry', {
		data: { fields: { BooleanField: field('boolean'), NumberField: field('number'), StringField: field('string') } },
	});
});

import { configDefaults, configValue, storedOrDefault, SETTINGS, settingEntries, type SettingKey } from '@/settings/table';

const localize = (key: string) => `localized ${key}`;
const fieldOf = (key: SettingKey) =>
	SETTINGS[key].type(localize) as unknown as { kind: string; options: object; validate(value: unknown): unknown };

describe('SETTINGS', () => {
	it('keeps the keys worlds and clients stored their values under', () => {
		expect(settingEntries().map(([key, entry]) => `${entry.scope}.${key}`)).toEqual([
			'world.skillsCompendium',
			'world.defaultDifficulty',
			'world.skillForInjuries',
			'world.skillForRepairingVehicleHits',
			'world.criticalInjuryTable',
			'world.currency',
			'world.careerSkillRanks',
			'world.uncoupleSkills',
			'world.showDamageOnFailure',
			'world.useSuperCharacteristics',
			'world.ignoreTalentPyramid',
			'world.talentTierVersions',
			'world.style',
			'client.dicePoolCollapseModificationsDetails',
			'client.dicePoolAutoApplyModifications',
			'client.dicePoolChanceToSucceedByPermutation',
			'client.dicePoolApproximation',
		]);
	});

	it('asks for a reload for the settings some of the system reads once, and applies those the rest reads live at once', () => {
		const reloaded = settingEntries().flatMap(([key, entry]) =>
			entry.requiresReload ? [`${key}${entry.readLive ? ' (live)' : ''}`] : [],
		);
		expect(reloaded).toEqual(['ignoreTalentPyramid (live)', 'dicePoolChanceToSucceedByPermutation']);
	});

	it('gives each field of CONFIG.genesys.settings to one setting', () => {
		const fields = settingEntries().flatMap(([, entry]) => (entry.field ? [entry.field.name] : []));
		expect(new Set(fields).size).toBe(fields.length);
	});
});

describe('the DataField of each setting', () => {
	it('holds each setting as a text, a switch or a count, as it stored it before', () => {
		expect(Object.fromEntries(settingEntries().map(([key]) => [key, fieldOf(key).kind]))).toEqual({
			skillsCompendium: 'string',
			defaultDifficulty: 'string',
			skillForInjuries: 'string',
			skillForRepairingVehicleHits: 'string',
			criticalInjuryTable: 'string',
			currency: 'string',
			careerSkillRanks: 'number',
			uncoupleSkills: 'boolean',
			showDamageOnFailure: 'boolean',
			useSuperCharacteristics: 'boolean',
			ignoreTalentPyramid: 'boolean',
			talentTierVersions: 'boolean',
			style: 'string',
			dicePoolCollapseModificationsDetails: 'boolean',
			dicePoolAutoApplyModifications: 'boolean',
			dicePoolChanceToSucceedByPermutation: 'boolean',
			dicePoolApproximation: 'number',
		});
	});

	it('requires a text, which may be empty', () => {
		for (const key of [
			'skillsCompendium',
			'defaultDifficulty',
			'skillForInjuries',
			'skillForRepairingVehicleHits',
			'currency',
		] as const) {
			expect(fieldOf(key).options).toMatchObject({ required: true });
			expect(fieldOf(key).options).not.toHaveProperty('blank');
		}
	});

	it("offers the world's Roll Tables by uuid for the Critical Injury table, which may be none", () => {
		vi.stubGlobal('game', { tables: [{ uuid: 'RollTable.crits', name: 'Critical Injuries' }] });
		try {
			const options = fieldOf('criticalInjuryTable').options as { required: boolean; blank: boolean; choices: () => object };

			expect(options).toMatchObject({ required: true, blank: true });
			expect(options.choices()).toEqual({ 'RollTable.crits': 'Critical Injuries' });
		} finally {
			vi.stubGlobal('game', undefined);
		}
	});

	it('requires a whole count, and refuses one below 0 with a localized error', () => {
		for (const key of ['careerSkillRanks', 'dicePoolApproximation'] as const) {
			const field = fieldOf(key);
			expect(field.options).toMatchObject({
				required: true,
				nullable: false,
				integer: true,
				validationError: 'localized Genesys.Settings.CountError',
			});
			expect([-1, 0, 250].map((count) => !field.validate(count))).toEqual([false, true, true]);
		}
	});

	it('refuses a default difficulty that is no pool modification, with a localized error', () => {
		const field = fieldOf('defaultDifficulty');
		expect(field.options).toMatchObject({ validationError: 'localized Genesys.Settings.DefaultDifficultyError' });
		// An empty difficulty is a valid pool modification: checks then start with no difficulty dice.
		expect(['DDD', '', 'not a pool'].map((difficulty) => !field.validate(difficulty))).toEqual([true, true, false]);
	});

	it('offers the Styles as the only choices', () => {
		expect(fieldOf('style').options).toEqual({
			required: true,
			choices: { genesys: 'Genesys.Settings.StyleGenesys', terrinoth: 'Genesys.Settings.StyleTerrinoth' },
		});
	});
});

describe('storedOrDefault', () => {
	it('reads a stored value its field refuses as the default, as a version that did not validate it could store', () => {
		expect(storedOrDefault(SETTINGS.careerSkillRanks, -3)).toBe(4);
		expect(storedOrDefault(SETTINGS.dicePoolApproximation, -100)).toBe(0);
		expect(storedOrDefault(SETTINGS.defaultDifficulty, 'not a pool')).toBe('DD');
	});

	it('reads a stored value its field accepts as it is', () => {
		expect(storedOrDefault(SETTINGS.careerSkillRanks, 6)).toBe(6);
		expect(storedOrDefault(SETTINGS.defaultDifficulty, '')).toBe('');
		expect(storedOrDefault(SETTINGS.currency, 'Credits')).toBe('Credits');
	});
});

describe('configValue', () => {
	it('falls back to the default Skills Compendium when the setting is emptied', () => {
		expect(configValue(SETTINGS.skillsCompendium, '')).toBe('genesys.crb-skills');
		expect(configValue(SETTINGS.skillsCompendium, 'world.skills')).toBe('world.skills');
	});

	it('turns the chance to succeed by simulation on with a number of rolls', () => {
		expect(configValue(SETTINGS.dicePoolApproximation, 250)).toEqual({ enabled: true, amountOfRolls: 250 });
		expect(configValue(SETTINGS.dicePoolApproximation, 0)).toEqual({ enabled: false, amountOfRolls: 0 });
	});

	it('gives the other settings their value as it is', () => {
		expect(configValue(SETTINGS.careerSkillRanks, 6)).toBe(6);
		expect(configValue(SETTINGS.uncoupleSkills, true)).toBe(true);
	});
});

describe('configDefaults', () => {
	it("holds each setting's default under its field", () => {
		expect(configDefaults()).toEqual({
			skillsCompendium: 'genesys.crb-skills',
			defaultDifficulty: 'DD',
			skillForHealingInjury: 'Resilience',
			skillForRepairingHit: 'Mechanics',
			criticalInjuryTable: '',
			currencyName: 'Money',
			freeCareerSkillRanks: 4,
			uncoupleSkillsFromCharacteristics: false,
			showAttackDetailsOnFailure: false,
			useSuperCharacteristics: false,
			ignoreTalentPyramid: false,
			talentTierVersions: false,
			startWithCollapsedPoolModifications: false,
			autoApplyPoolModifications: false,
			showChanceToSucceedFromPermutations: false,
			showChanceToSucceedFromSimulations: { enabled: false, amountOfRolls: 0 },
		});
	});
});
