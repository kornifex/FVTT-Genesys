/**
 * @file Tests for the drops an adversary's skills, talents and abilities receive, and for its talent ranks.
 */

import { describe, expect, it } from 'vitest';

import { Adversary, decideAdversaryDrop, talentRankChange } from '@/actor/data/AdversaryItems';

function adversary(type: string, owned: Partial<Omit<Adversary, 'type'>> = {}): Adversary {
	return { type, skills: [], talents: [], abilities: [], ...owned };
}

describe('decideAdversaryDrop', () => {
	it('creates a new skill on a rival at rank 1, as rivals have skills like PCs (CRB p. 132, 134)', () => {
		expect(decideAdversaryDrop(adversary('rival'), { type: 'skill', name: 'Melee' })).toEqual({ action: 'create', rank: 1 });
	});

	it('raises the rank of a skill a rival owns, whatever the case of its name', () => {
		const rival = adversary('rival', { skills: [{ id: 'melee', name: 'melee', system: { rank: 2 } }] });

		expect(decideAdversaryDrop(rival, { type: 'skill', name: 'Melee' })).toEqual({
			action: 'update',
			update: { _id: 'melee', system: { rank: 3 } },
		});
	});

	it("creates a new skill on a minion at the rank it has, since minions have no skills of their own and roll at the group's rank (CRB p. 132, 134)", () => {
		expect(decideAdversaryDrop(adversary('minion'), { type: 'skill', name: 'Melee' })).toEqual({ action: 'create' });
	});

	it('refuses a skill a minion owns, as a minion has no ranks to raise (CRB p. 132)', () => {
		const minion = adversary('minion', { skills: [{ id: 'melee', name: 'Melee', system: { rank: 0 } }] });

		expect(decideAdversaryDrop(minion, { type: 'skill', name: 'Melee' })).toEqual({ action: 'refuse' });
	});

	it('creates a new talent at the rank it has, with no tier to check, as adversaries ignore the tier system (CRB p. 203)', () => {
		expect(decideAdversaryDrop(adversary('nemesis'), { type: 'talent', name: 'Grit' })).toEqual({ action: 'create' });
	});

	it('raises the rank of a ranked talent the adversary owns (CRB p. 72)', () => {
		const nemesis = adversary('nemesis', { talents: [{ id: 'grit', name: 'Grit', system: { ranked: 'yes', rank: 1 } }] });

		expect(decideAdversaryDrop(nemesis, { type: 'talent', name: 'Grit' })).toEqual({
			action: 'update',
			update: { _id: 'grit', system: { rank: 2 } },
		});
	});

	it('refuses a non-ranked talent the adversary owns, which is bought only once, and says why (CRB p. 72)', () => {
		const rival = adversary('rival', { talents: [{ id: 'swift', name: 'Swift', system: { ranked: 'no', rank: 1 } }] });

		expect(decideAdversaryDrop(rival, { type: 'talent', name: 'Swift' })).toEqual({
			action: 'refuse',
			refusal: { key: 'Genesys.Notifications.TalentNotRanked', data: { talentName: 'Swift' } },
		});
	});

	it("doesn't match a talent with a skill of the same name", () => {
		const rival = adversary('rival', { skills: [{ id: 'melee', name: 'Melee', system: { rank: 2 } }] });

		expect(decideAdversaryDrop(rival, { type: 'talent', name: 'Melee' })).toEqual({ action: 'create' });
	});

	it('creates a new ability', () => {
		expect(decideAdversaryDrop(adversary('nemesis'), { type: 'ability', name: 'Flyer' })).toEqual({ action: 'create' });
	});

	it('refuses an ability the adversary owns', () => {
		const nemesis = adversary('nemesis', { abilities: [{ name: 'Flyer' }] });

		expect(decideAdversaryDrop(nemesis, { type: 'ability', name: 'Flyer' })).toEqual({ action: 'refuse' });
	});

	it('creates a Critical Injury, even one the adversary already has', () => {
		expect(decideAdversaryDrop(adversary('rival'), { type: 'injury', name: 'Bruised' })).toEqual({ action: 'create' });
	});

	it("refuses an item of a type that isn't a skill, talent, ability or Critical Injury", () => {
		expect(decideAdversaryDrop(adversary('rival'), { type: 'career', name: 'Soldier' })).toEqual({ action: 'refuse' });
	});
});

describe('talentRankChange', () => {
	it('raises the rank of a ranked talent (CRB p. 72)', () => {
		const grit = { id: 'grit', name: 'Grit', system: { ranked: 'yes' as const, rank: 2 } };

		expect(talentRankChange(grit, 1)).toEqual({ action: 'update', update: { _id: 'grit', system: { rank: 3 } } });
	});

	it('lowers the rank of a ranked talent', () => {
		const grit = { id: 'grit', name: 'Grit', system: { ranked: 'yes' as const, rank: 2 } };

		expect(talentRankChange(grit, -1)).toEqual({ action: 'update', update: { _id: 'grit', system: { rank: 1 } } });
	});

	it('deletes a ranked talent lowered to rank 0', () => {
		const grit = { id: 'grit', name: 'Grit', system: { ranked: 'yes' as const, rank: 1 } };

		expect(talentRankChange(grit, -1)).toEqual({ action: 'delete', id: 'grit' });
	});

	it.each([1, -1] as const)('refuses to change the rank of a non-ranked talent by %i, and says why (CRB p. 72)', (step) => {
		const swift = { id: 'swift', name: 'Swift', system: { ranked: 'no' as const, rank: 1 } };

		expect(talentRankChange(swift, step)).toEqual({
			action: 'refuse',
			refusal: { key: 'Genesys.Notifications.TalentNotRanked', data: { talentName: 'Swift' } },
		});
	});
});
