import { describe, expect, it } from 'vitest';

import { type CheckFlag, rolledCheck } from '@/dice/RolledCheck';

const curse: CheckFlag = { actor: 'Actor.mage', purpose: { kind: 'spell', spellName: 'Curse', isAttack: false }, strain: 2 };

describe('rolledCheck', () => {
	it("reads the check the querier rolled for the actor from its message, the spell's strain with it", () => {
		expect(rolledCheck({ authorId: 'player', check: curse }, 'player', 'Actor.mage')).toEqual(curse);
	});

	it("refuses a message of another user, whose check the querier didn't roll", () => {
		expect(rolledCheck({ authorId: 'gm', check: curse }, 'player', 'Actor.mage')).toBeUndefined();
	});

	it('refuses a message of a check of another actor', () => {
		expect(rolledCheck({ authorId: 'player', check: curse }, 'player', 'Actor.ada')).toBeUndefined();
	});

	it('refuses a message that records no check', () => {
		expect(rolledCheck({ authorId: 'player', check: undefined }, 'player', 'Actor.mage')).toBeUndefined();
	});

	it('refuses a message the Acting GM has not', () => {
		expect(rolledCheck(undefined, 'player', 'Actor.mage')).toBeUndefined();
	});
});
