/**
 * @file Tests for how a talent's data is read: a tier saved above Tier 5 reads as Tier 5.
 */

import { describe, expect, it, vi } from 'vitest';

// The data model extends a Foundry class, whose own migration leaves the source as it is.
vi.hoisted(() => {
	vi.stubGlobal('foundry', { abstract: { DataModel: class {} } });
	Object.assign(globalThis.foundry.abstract.DataModel, { migrateData: (source: object) => source });
});

import { TalentDataModel } from '@/item/data/TalentDataModel';
import { countTalentsPerTier } from '@/actor/data/character/TalentPyramid';
import { buyDroppedTalent } from '@/actor/data/character/Advancement';
import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';

/**
 * A rank 1 talent, as read from a source saved at that tier.
 */
function read(tier: number) {
	return { tier: TalentDataModel.migrateData({ tier }).tier as number, rank: 1 };
}

describe('TalentDataModel.migrateData', () => {
	it('reads a tier saved above Tier 5 as Tier 5, the highest tier (CRB p. 71-72)', () => {
		expect(read(6).tier).toBe(5);
		expect(read(8).tier).toBe(5);
	});

	it('leaves a tier from 1 to 5 as it is (CRB p. 71-72)', () => {
		expect(read(3).tier).toBe(3);
		expect(read(5).tier).toBe(5);
	});

	it('counts a talent saved at tier 6 once at Tier 5 in the Talent Pyramid (CRB p. 72)', () => {
		expect(countTalentsPerTier([read(6)])).toEqual(countTalentsPerTier([{ tier: 5, rank: 1 }]));
	});

	it('buys a talent saved at tier 6 for 25 XP, as a Tier 5 talent (CRB p. 72)', () => {
		const character = {
			entries: [{ amount: 100, type: EntryType.Starting }] as Entry[],
			characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
			woundThreshold: 12,
			strainThreshold: 12,
			skills: [],
			talents: [],
			houseRules: { ignoreTalentPyramid: true, talentTierVersions: false },
		};
		const result = buyDroppedTalent(character, { name: 'Indomitable', tier: read(6).tier, source: {} }, 'newId');

		expect('plan' in result && (result.plan.actorUpdate['system.experienceJournal.entries'] as Entry[]).at(-1)?.amount).toBe(-25);
	});
});
