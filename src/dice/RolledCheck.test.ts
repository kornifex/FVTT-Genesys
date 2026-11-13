import { describe, expect, it } from 'vitest';

import { type CheckFlag, rolledCheck } from '@/dice/RolledCheck';
import { castingStrain } from '@/item/SpellCasting';

const curse: CheckFlag = { actor: 'Actor.mage', purpose: { kind: 'spell', spellName: 'Curse', isAttack: false } };

describe('rolledCheck', () => {
	it('reads the check the querier rolled for the actor from its message', () => {
		expect(rolledCheck({ authorId: 'player', hasRoll: true, check: curse }, 'player', 'Actor.mage')).toEqual(curse);
	});

	it("refuses a message of another user, whose check the querier didn't roll", () => {
		expect(rolledCheck({ authorId: 'gm', hasRoll: true, check: curse }, 'player', 'Actor.mage')).toBeUndefined();
	});

	it('refuses a message of a check of another actor', () => {
		expect(rolledCheck({ authorId: 'player', hasRoll: true, check: curse }, 'player', 'Actor.ada')).toBeUndefined();
	});

	it('refuses a message that records no check', () => {
		expect(rolledCheck({ authorId: 'player', hasRoll: true, check: undefined }, 'player', 'Actor.mage')).toBeUndefined();
	});

	it('refuses a message the Acting GM has not', () => {
		expect(rolledCheck(undefined, 'player', 'Actor.mage')).toBeUndefined();
	});

	it('refuses a message that holds no roll, as one created from the console', () => {
		expect(rolledCheck({ authorId: 'player', hasRoll: false, check: curse }, 'player', 'Actor.mage')).toBeUndefined();
	});

	it.each([
		['an unknown kind', { kind: 'heal' }],
		['an attack without a weapon', { kind: 'attack' }],
		['a spell without its attack', { kind: 'spell', spellName: 'Curse' }],
		['no object', 'spell'],
		['nothing', null],
	])('refuses a message whose purpose is malformed: %s', (_case, purpose) => {
		const check = { actor: 'Actor.mage', purpose };
		expect(rolledCheck({ authorId: 'player', hasRoll: true, check }, 'player', 'Actor.mage')).toBeUndefined();
	});

	it('refuses a message whose actor is not a uuid string', () => {
		const check = { actor: 42, purpose: curse.purpose };
		expect(rolledCheck({ authorId: 'player', hasRoll: true, check }, 'player', 'Actor.mage')).toBeUndefined();
	});

	it("ignores a strain the message records: the caster suffers the spell's 2 strain", () => {
		const forged = { ...curse, strain: 40 };
		const check = rolledCheck({ authorId: 'player', hasRoll: true, check: forged }, 'player', 'Actor.mage');

		expect(check).toStrictEqual(curse);
		expect(check && castingStrain(check.purpose)).toBe(2);
	});
});
