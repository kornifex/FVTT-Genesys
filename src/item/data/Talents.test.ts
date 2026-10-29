/** @file Tests for the tier a talent's ranks are bought at, and for the groups the Talents tab lists talents in. */

import { describe, expect, it } from 'vitest';
import { effectiveNextTier, effectiveTier, talentGroups, TIERS } from '@/item/data/Talents';

describe('effectiveTier (CRB p. 72)', () => {
	it("is the talent's tier at rank 1", () => {
		expect(effectiveTier({ tier: 2, rank: 1 })).toBe(2);
	});

	it('rises one tier per rank after the first, each rank counting at the tier it was bought at', () => {
		expect(effectiveTier({ tier: 1, rank: 3 })).toBe(3);
	});

	it('stays at tier 5 once a ranked talent reaches it', () => {
		expect(effectiveTier({ tier: 3, rank: 4 })).toBe(5);
		expect(effectiveTier({ tier: 5, rank: 2 })).toBe(5);
	});
});

describe('effectiveNextTier (CRB p. 72)', () => {
	it('buys the next rank one tier above the latest one', () => {
		expect(effectiveNextTier({ tier: 1, rank: 1 })).toBe(2);
		expect(effectiveNextTier({ tier: 2, rank: 2 })).toBe(4);
	});

	it('buys every rank after tier 5 at tier 5', () => {
		expect(effectiveNextTier({ tier: 4, rank: 1 })).toBe(5);
		expect(effectiveNextTier({ tier: 5, rank: 3 })).toBe(5);
	});
});

describe('TIERS (CRB p. 71-72)', () => {
	it('lists the tiers from 1 to 5', () => {
		expect(TIERS).toEqual([1, 2, 3, 4, 5]);
	});
});

describe('talentGroups', () => {
	type Entry = { name: string; system: { activation: { type: 'active' | 'passive'; detail: string }; effectiveTier?: number } };
	const entry = (name: string, type: 'active' | 'passive', detail = '', effectiveTier?: number): Entry => ({
		name,
		system: { activation: { type, detail }, effectiveTier },
	});
	const names = (entries: Entry[]) => entries.map((listed) => listed.name);

	it('splits talents into active and passive, by tier then name', () => {
		const groups = talentGroups(
			[
				entry('Toughened', 'passive', '', 2),
				entry('Parry', 'active', '', 1),
				entry('Grit', 'passive', '', 1),
				entry('Dodge', 'active', '', 3),
				entry('Brace', 'active', '', 1),
			],
			'en',
		);

		expect(names(groups.active)).toEqual(['Brace', 'Parry', 'Dodge']);
		expect(names(groups.passive)).toEqual(['Grit', 'Toughened']);
	});

	it('puts the active talents with an activation detail under it, whatever its case, in the order the details first come', () => {
		const groups = talentGroups(
			[
				entry('Quick Strike', 'active', 'Maneuver', 2),
				entry('Parry', 'active', 'Incidental, Out of Turn', 1),
				entry('Brace', 'active', 'maneuver', 1),
				entry('Rapid Reaction', 'active', '', 1),
				entry('Second Wind', 'active', 'Incidental', 2),
			],
			'en',
		);

		expect(names(groups.active)).toEqual(['Rapid Reaction']);
		expect(groups.activeByDetail.map(({ detail, talents }) => ({ detail, talents: names(talents) }))).toEqual([
			{ detail: 'maneuver', talents: ['Brace', 'Quick Strike'] },
			{ detail: 'incidental, out of turn', talents: ['Parry'] },
			{ detail: 'incidental', talents: ['Second Wind'] },
		]);
	});

	it('lists an active talent whose activation detail is only spaces among those with none', () => {
		const groups = talentGroups([entry('Parry', 'active', '  ', 1)], 'en');

		expect(names(groups.active)).toEqual(['Parry']);
		expect(groups.activeByDetail).toEqual([]);
	});

	it("sorts names in the game's language", () => {
		const talents = [entry('Zorn', 'passive', '', 1), entry('Öl', 'passive', '', 1)];

		expect(names(talentGroups(talents, 'de').passive)).toEqual(['Öl', 'Zorn']);
		expect(names(talentGroups(talents, 'sv').passive)).toEqual(['Zorn', 'Öl']);
	});

	it('sorts abilities, which have no tier, by name', () => {
		const groups = talentGroups([entry('Sturdy', 'passive'), entry('Keen Eyes', 'passive')], 'en');

		expect(names(groups.passive)).toEqual(['Keen Eyes', 'Sturdy']);
	});
});
