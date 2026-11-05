/** @file Tests for the planner of the migration that moves the Initiative Slots' state from flags into system data. */

import { describe, expect, it } from 'vitest';

import { CombatSource, combatSystemData } from '@/migrations/6-combat-system-data';

function combat(flags: Record<string, unknown> | undefined, combatants: CombatSource['combatants'] = []): CombatSource {
	return { flags: flags && { genesys: flags }, combatants };
}

const CLAIMS = { 1: { 'hero0000000000AA:-1': 'ally0000000000AA' }, 2: { 'boss0000000000AA:-1': 'boss0000000000AA' } };
const EXTRA_SLOTS = [{ activationSource: 'hero0000000000AA', initiative: 2.01, startingRound: 1 }];

describe('combatSystemData', () => {
	it('moves the Claims and the Extra Slots into the system data, and deletes their flags', () => {
		expect(combatSystemData(combat({ slotClaims: CLAIMS, extraSlots: EXTRA_SLOTS }))).toEqual({
			system: { claims: CLAIMS, extraSlots: EXTRA_SLOTS },
			deletedFlags: ['slotClaims', 'extraSlots'],
			combatants: [],
		});
	});

	it('moves the flags a combat holds, and only those', () => {
		expect(combatSystemData(combat({ extraSlots: EXTRA_SLOTS }))).toEqual({
			system: { extraSlots: EXTRA_SLOTS },
			deletedFlags: ['extraSlots'],
			combatants: [],
		});
	});

	it('deletes the legacy `claimants` flag without moving its Claims, which no version since 0.4.0 reads', () => {
		expect(combatSystemData(combat({ claimants: { 1: { 0: 'hero0000000000AA' } } }))).toEqual({
			system: {},
			deletedFlags: ['claimants'],
			combatants: [],
		});
	});

	it('moves the Initiative Skill chosen for a combatant, the other combatants left alone', () => {
		const combatants = [
			{ _id: 'hero0000000000AA', flags: { genesys: { initiativeSkill: 'Cool' } } },
			{ _id: 'boss0000000000AA', flags: {} },
			{ _id: 'ally0000000000AA' },
		];

		expect(combatSystemData(combat(undefined, combatants))).toEqual({
			system: {},
			deletedFlags: [],
			combatants: [{ _id: 'hero0000000000AA', initiativeSkill: 'Cool' }],
		});
	});

	it('leaves a combat without these flags alone', () => {
		expect(combatSystemData(combat({ other: true }, [{ _id: 'hero0000000000AA', flags: { genesys: {} } }]))).toBeUndefined();
	});
});
