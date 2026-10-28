import { describe, expect, it, vi } from 'vitest';

// The Default Difficulty reads pool modifications, whose module loads the dice types that extend
// `foundry.dice.terms.Die` and the Dice So Nice! registration that listens to `Hooks`; both are Foundry globals.
vi.hoisted(() => {
	Object.assign(globalThis, {
		foundry: { dice: { terms: { Die: class {} } } },
		Hooks: { once: () => {}, on: () => {} },
	});
});

import { configDefaults, SETTINGS, settingEntries } from '@/settings/table';

describe('SETTINGS', () => {
	it('keeps the keys worlds and clients stored their values under', () => {
		expect(settingEntries().map(([key, entry]) => `${entry.scope}.${key}`)).toEqual([
			'world.skillsCompendium',
			'world.defaultDifficulty',
			'world.skillForInjuries',
			'world.skillForRepairingVehicleHits',
			'world.currency',
			'world.careerSkillRanks',
			'world.uncoupleSkills',
			'world.showDamageOnFailure',
			'world.useSuperCharacteristics',
			'world.ignoreTalentPyramid',
			'world.talentTierVersions',
			'world.style',
			'client.useMagicalGirlSymbols',
			'client.dicePoolCollapseModificationsDetails',
			'client.dicePoolAutoApplyModifications',
			'client.dicePoolChanceToSucceedByPermutation',
			'client.dicePoolApproximation',
		]);
	});

	it('gives each field of CONFIG.genesys.settings to one setting', () => {
		const fields = settingEntries().flatMap(([, entry]) => (entry.field ? [entry.field.name] : []));
		expect(new Set(fields).size).toBe(fields.length);
	});
});

describe('configDefaults', () => {
	it("holds each setting's default under its field", () => {
		expect(configDefaults()).toEqual({
			skillsCompendium: 'genesys.crb-skills',
			defaultDifficulty: 'DD',
			skillForHealingInjury: 'Resilience',
			skillForRepairingHit: 'Mechanics',
			currencyName: 'Money',
			freeCareerSkillRanks: 4,
			uncoupleSkillsFromCharacteristics: false,
			showAttackDetailsOnFailure: false,
			useSuperCharacteristics: false,
			ignoreTalentPyramid: false,
			talentTierVersions: false,
			useMagicalGirlSymbols: false,
			startWithCollapsedPoolModifications: false,
			autoApplyPoolModifications: false,
			showChanceToSucceedFromPermutations: false,
			showChanceToSucceedFromSimulations: { enabled: false, amountOfRolls: 0 },
		});
	});
});

describe('normalize', () => {
	it('falls back to the default Skills Compendium when the setting is emptied', () => {
		expect(SETTINGS.skillsCompendium.field?.normalize('')).toBe('genesys.crb-skills');
		expect(SETTINGS.skillsCompendium.field?.normalize(undefined)).toBe('genesys.crb-skills');
		expect(SETTINGS.skillsCompendium.field?.normalize('world.skills')).toBe('world.skills');
	});

	it('falls back to the default difficulty when the value is no pool modification', () => {
		expect(SETTINGS.defaultDifficulty.field?.normalize('DDD')).toBe('DDD');
		expect(SETTINGS.defaultDifficulty.field?.normalize('not a pool')).toBe('DD');
		// An empty difficulty is a valid pool modification: checks then start with no difficulty dice.
		expect(SETTINGS.defaultDifficulty.field?.normalize(undefined)).toBe('');
	});

	it('turns a typed-in number of career skill ranks into a count', () => {
		expect(SETTINGS.careerSkillRanks.field?.normalize(-3.7)).toBe(3);
		expect(SETTINGS.careerSkillRanks.field?.normalize(undefined)).toBe(0);
	});

	it('turns the chance to succeed by simulation on with a number of rolls', () => {
		expect(SETTINGS.dicePoolApproximation.field?.normalize(250.5)).toEqual({ enabled: true, amountOfRolls: 250 });
		expect(SETTINGS.dicePoolApproximation.field?.normalize(0)).toEqual({ enabled: false, amountOfRolls: 0 });
		expect(SETTINGS.dicePoolApproximation.field?.normalize(undefined)).toEqual({ enabled: false, amountOfRolls: 0 });
	});

	it('reads an unreadable text or switch as empty or off', () => {
		expect(SETTINGS.currency.field?.normalize(undefined)).toBe('');
		expect(SETTINGS.uncoupleSkills.field?.normalize(undefined)).toBe(false);
		expect(SETTINGS.uncoupleSkills.field?.normalize(true)).toBe(true);
	});
});
