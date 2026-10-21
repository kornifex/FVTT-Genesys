/**
 * FVTT-Genesys
 * Unofficial implementation of the Genesys RPG for Foundry
 *
 * @file Tests for Advancement: spending XP and undoing it from the Experience Journal.
 */

import { describe, expect, it } from 'vitest';
import {
	AdvancementCharacter,
	AdvancementResult,
	AdvancementTalent,
	awardXP,
	buyDroppedTalent,
	buySkillRank,
	buyTalentRank,
	canReplaceCareer,
	isAllowed,
	raiseCharacteristic,
	undoEntry,
	withoutStartingXP,
	withStartingXP,
} from '@/actor/data/character/Advancement';
import { isInCharacterCreation } from '@/actor/data/character/CharacterCreation';
import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';
import { Characteristic } from '@/data/Characteristics';

function talent(id: string, tier: number, rank = 1, ranked: 'yes' | 'no' = 'yes'): AdvancementTalent {
	return { id, name: id, ranked, tier, rank, effectiveTier: Math.min(5, tier + rank - 1), effectiveNextTier: Math.min(5, tier + rank) };
}

/**
 * A character fresh from their Archetype, with 100 Starting XP, unless told otherwise.
 */
function character(overrides: Partial<AdvancementCharacter> = {}): AdvancementCharacter {
	return {
		entries: [{ amount: 100, type: EntryType.Starting }],
		characteristics: { brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 },
		woundThreshold: 12,
		strainThreshold: 12,
		skills: [
			{ id: 'athletics', name: 'Athletics', rank: 0, career: true },
			{ id: 'cool', name: 'Cool', rank: 1, career: false },
		],
		talents: [],
		houseRules: { ignoreTalentPyramid: false, talentTierVersions: false },
		...overrides,
	};
}

const AWARD: Entry = { amount: 20, type: EntryType.Award, data: { reason: 'Session' } };

function plan(result: AdvancementResult) {
	if (!('plan' in result)) {
		throw new Error(`Refused: ${JSON.stringify(result.refusal)}`);
	}
	return result.plan;
}

function refusal(result: AdvancementResult) {
	if (!('refusal' in result)) {
		throw new Error('Allowed');
	}
	return result.refusal;
}

function newEntries(result: AdvancementResult) {
	return plan(result).actorUpdate['system.experienceJournal.entries'] as Entry[];
}

describe('raiseCharacteristic', () => {
	it('raises a characteristic for 10 XP per new value', () => {
		const result = raiseCharacteristic(character(), Characteristic.Agility);

		expect(plan(result)).toEqual({
			actorUpdate: {
				'system.characteristics.agility': 3,
				'system.experienceJournal.entries': [
					{ amount: 100, type: EntryType.Starting },
					{ amount: -30, type: EntryType.Characteristic, data: { characteristic: 'agility', rank: 3 } },
				],
			},
			itemCreates: [],
			itemUpdates: [],
			itemDeletes: [],
		});
	});

	it('raises the wound threshold with Brawn and the strain threshold with Willpower', () => {
		expect(plan(raiseCharacteristic(character(), Characteristic.Brawn)).actorUpdate['system.wounds.max']).toBe(13);
		expect(plan(raiseCharacteristic(character(), Characteristic.Willpower)).actorUpdate['system.strain.max']).toBe(13);
		expect(plan(raiseCharacteristic(character(), Characteristic.Agility)).actorUpdate).not.toHaveProperty('system.wounds.max');
	});

	it('is only allowed during Character Creation, even with XP left', () => {
		expect(isAllowed(raiseCharacteristic(character({ entries: [{ amount: 100, type: EntryType.Starting }, AWARD] }), Characteristic.Agility))).toBe(false);
	});

	it('is refused at 5, or without enough XP', () => {
		expect(isAllowed(raiseCharacteristic(character({ characteristics: { brawn: 5, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 } }), Characteristic.Brawn))).toBe(false);
		expect(isAllowed(raiseCharacteristic(character({ entries: [{ amount: 29, type: EntryType.Starting }] }), Characteristic.Agility))).toBe(false);
		expect(isAllowed(raiseCharacteristic(character({ entries: [{ amount: 30, type: EntryType.Starting }] }), Characteristic.Agility))).toBe(true);
	});
});

describe('buySkillRank', () => {
	it('costs 5 XP per new rank for a career skill, 5 more otherwise', () => {
		expect(newEntries(buySkillRank(character(), 'athletics')).at(-1)).toEqual({ amount: -5, type: EntryType.Skill, data: { name: 'Athletics', id: 'athletics', rank: 1 } });
		expect(newEntries(buySkillRank(character(), 'cool')).at(-1)).toEqual({ amount: -15, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 2 } });
		expect(plan(buySkillRank(character(), 'cool')).itemUpdates).toEqual([{ _id: 'cool', 'system.rank': 2 }]);
	});

	it('caps bought ranks at 2 during Character Creation, at 5 afterwards', () => {
		const atTwo = { skills: [{ id: 'cool', name: 'Cool', rank: 2, career: true }] };

		expect(isAllowed(buySkillRank(character(atTwo), 'cool'))).toBe(false);
		expect(isAllowed(buySkillRank(character({ ...atTwo, entries: [{ amount: 100, type: EntryType.Starting }, AWARD] }), 'cool'))).toBe(true);
		expect(isAllowed(buySkillRank(character({ skills: [{ id: 'cool', name: 'Cool', rank: 5, career: true }], entries: [{ amount: 100, type: EntryType.Starting }, AWARD] }), 'cool'))).toBe(false);
	});

	it('is refused without enough XP, or for a skill the character lacks', () => {
		expect(isAllowed(buySkillRank(character({ entries: [{ amount: 14, type: EntryType.Starting }] }), 'cool'))).toBe(false);
		expect(isAllowed(buySkillRank(character(), 'stealth'))).toBe(false);
	});
});

describe('buyTalentRank', () => {
	// Two tier 1 talents allow one talent at tier 2.
	const talents = [talent('grit', 1), talent('toughened', 1), talent('parry', 1)];

	it('buys the next rank at the next tier, for 5 XP per tier', () => {
		const result = buyTalentRank(character({ talents }), 'grit');

		expect(plan(result).itemUpdates).toEqual([{ _id: 'grit', 'system.rank': 2 }]);
		expect(newEntries(result).at(-1)).toEqual({ amount: -10, type: EntryType.TalentRank, data: { name: 'grit', id: 'grit', tier: 2, rank: 2 } });
	});

	it("is refused for a talent that isn't ranked", () => {
		expect(refusal(buyTalentRank(character({ talents: [talent('grit', 1, 1, 'no')] }), 'grit'))).toEqual({ key: 'Genesys.Notifications.TalentNotRanked', data: { talentName: 'grit' } });
	});

	it('is refused when the Talent Pyramid has no room at the tier, unless the house rule ignores it', () => {
		const lonely = [talent('grit', 1)];

		expect(refusal(buyTalentRank(character({ talents: lonely }), 'grit'))).toEqual({ key: 'Genesys.Notifications.CannotPurchaseTalentTier', data: { tier: 2, lowerTier: 1, minimum: 2 } });
		expect(isAllowed(buyTalentRank(character({ talents: lonely, houseRules: { ignoreTalentPyramid: true, talentTierVersions: false } }), 'grit'))).toBe(true);
	});

	it('is refused without enough XP', () => {
		expect(refusal(buyTalentRank(character({ talents, entries: [{ amount: 9, type: EntryType.Starting }] }), 'grit'))).toEqual({
			key: 'Genesys.Notifications.CannotAffordRankedTalent',
			data: { name: 'grit', newRank: 2, cost: 10 },
		});
	});

	it('with Talent Tier Versions, buys the rank at the tier of the dropped version, and only that way', () => {
		const tierVersions = { talents, houseRules: { ignoreTalentPyramid: true, talentTierVersions: true } };

		expect(refusal(buyTalentRank(character(tierVersions), 'grit'))).toBeUndefined();
		expect(newEntries(buyTalentRank(character(tierVersions), 'grit', 3)).at(-1)).toEqual({ amount: -15, type: EntryType.TalentRank, data: { name: 'grit', id: 'grit', tier: 3, rank: 2 } });
	});
});

describe('buyDroppedTalent', () => {
	const dropped = { name: 'Dodge', tier: 1, source: { name: 'Dodge', type: 'talent', system: { tier: 1 } } };

	it('creates a new talent with the given id, for 5 XP per tier', () => {
		const result = buyDroppedTalent(character(), dropped, 'newId');

		expect(plan(result).itemCreates).toEqual([{ ...dropped.source, _id: 'newId' }]);
		expect(newEntries(result).at(-1)).toEqual({ amount: -5, type: EntryType.NewTalent, data: { name: 'Dodge', id: 'newId', tier: 1, rank: 1 } });
	});

	it('is refused when the Talent Pyramid has no room, or without enough XP', () => {
		expect(refusal(buyDroppedTalent(character(), { ...dropped, tier: 2 }, 'newId'))?.key).toBe('Genesys.Notifications.CannotPurchaseTalentTier');
		expect(refusal(buyDroppedTalent(character({ entries: [{ amount: 4, type: EntryType.Starting }] }), dropped, 'newId'))).toEqual({
			key: 'Genesys.Notifications.CannotAffordTalent',
			data: { name: 'Dodge', cost: 5 },
		});
	});

	it('buys a rank of the talent of the same name when the character has it', () => {
		const held = [talent('Dodge', 1), talent('grit', 1), talent('parry', 1)];
		const result = buyDroppedTalent(character({ talents: held }), dropped, 'newId');

		expect(plan(result).itemCreates).toEqual([]);
		expect(plan(result).itemUpdates).toEqual([{ _id: 'Dodge', 'system.rank': 2 }]);
		expect(newEntries(result).at(-1)?.data.tier).toBe(2);
	});
});

describe('awardXP', () => {
	it('adds an Award entry, which ends Character Creation', () => {
		const entries = newEntries(awardXP(character(), 20, 'Session'));

		expect(entries.at(-1)).toEqual(AWARD);
		expect(isInCharacterCreation(entries)).toBe(false);
	});
});

describe('undoEntry', () => {
	it('lowers the characteristic, and the threshold it raised', () => {
		const entries: Entry[] = [
			{ amount: 100, type: EntryType.Starting },
			{ amount: -30, type: EntryType.Characteristic, data: { characteristic: 'brawn', rank: 3 } },
		];
		const result = undoEntry(character({ entries, woundThreshold: 13 }), 1);

		expect(plan(result).actorUpdate).toEqual({ 'system.characteristics.brawn': 2, 'system.wounds.max': 12, 'system.experienceJournal.entries': [{ amount: 100, type: EntryType.Starting }] });
	});

	it('refuses to undo a characteristic or skill rank that a later rank builds on', () => {
		const characteristics: Entry[] = [
			{ amount: -30, type: EntryType.Characteristic, data: { characteristic: 'agility', rank: 3 } },
			{ amount: -40, type: EntryType.Characteristic, data: { characteristic: 'agility', rank: 4 } },
		];
		const skills: Entry[] = [
			{ amount: -10, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 1 } },
			{ amount: -15, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 2 } },
		];

		expect(refusal(undoEntry(character({ entries: characteristics }), 0))?.key).toBe('Genesys.Notifications.CannotDeleteCharacteristic');
		expect(isAllowed(undoEntry(character({ entries: characteristics }), 1))).toBe(true);
		expect(refusal(undoEntry(character({ entries: skills }), 0))).toEqual({ key: 'Genesys.Notifications.CannotDeleteSkill', data: skills[0].data });
	});

	it('lowers the skill rank, never below 0', () => {
		const entries: Entry[] = [{ amount: -10, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 1 } }];

		expect(plan(undoEntry(character({ entries }), 0)).itemUpdates).toEqual([{ _id: 'cool', 'system.rank': 0 }]);
		expect(plan(undoEntry(character({ entries, skills: [{ id: 'cool', name: 'Cool', rank: 0, career: false }] }), 0)).itemUpdates).toEqual([{ _id: 'cool', 'system.rank': 0 }]);
	});

	it('deletes a new talent, and lowers the rank of a talent', () => {
		const newTalent: Entry[] = [{ amount: -5, type: EntryType.NewTalent, data: { name: 'grit', id: 'grit', tier: 1, rank: 1 } }];
		const talentRank: Entry[] = [{ amount: -10, type: EntryType.TalentRank, data: { name: 'grit', id: 'grit', tier: 2, rank: 2 } }];

		expect(plan(undoEntry(character({ entries: newTalent, talents: [talent('grit', 1)] }), 0)).itemDeletes).toEqual(['grit']);
		expect(plan(undoEntry(character({ entries: talentRank, talents: [talent('grit', 1, 2), talent('parry', 1)] }), 0)).itemUpdates).toEqual([{ _id: 'grit', 'system.rank': 1 }]);
	});

	it("refuses to undo a talent entry that isn't the talent's latest rank", () => {
		const entries: Entry[] = [{ amount: -5, type: EntryType.NewTalent, data: { name: 'grit', id: 'grit', tier: 1, rank: 1 } }];

		expect(refusal(undoEntry(character({ entries, talents: [talent('grit', 1, 2), talent('parry', 1)] }), 0))?.key).toBe('Genesys.Notifications.CannotDeleteExistingTalent');
	});

	it('refuses to undo a talent the Talent Pyramid rests on, unless the house rule ignores it', () => {
		const entries: Entry[] = [{ amount: -5, type: EntryType.NewTalent, data: { name: 'grit', id: 'grit', tier: 1, rank: 1 } }];
		const talents = [talent('grit', 1), talent('parry', 1), talent('dodge', 2)];

		expect(refusal(undoEntry(character({ entries, talents }), 0))).toEqual({ key: 'Genesys.Notifications.CannotDeleteInvalidTalentPyramid', data: { rank: 1 } });
		expect(isAllowed(undoEntry(character({ entries, talents, houseRules: { ignoreTalentPyramid: true, talentTierVersions: false } }), 0))).toBe(true);
	});

	it('only removes the entry when what it bought is gone', () => {
		const entries: Entry[] = [{ amount: -10, type: EntryType.Skill, data: { name: 'Stealth', id: 'stealth', rank: 1 } }];

		expect(plan(undoEntry(character({ entries }), 0))).toEqual({ actorUpdate: { 'system.experienceJournal.entries': [] }, itemCreates: [], itemUpdates: [], itemDeletes: [] });
	});

	it('returns the character to Character Creation when the only Award is undone', () => {
		const entries = newEntries(undoEntry(character({ entries: [{ amount: 100, type: EntryType.Starting }, AWARD] }), 1));

		expect(isInCharacterCreation(entries)).toBe(true);
	});

	it('refuses an entry that does not exist', () => {
		expect(refusal(undoEntry(character(), 3))).toBeUndefined();
	});
});

describe('Starting XP', () => {
	it('is the first entry of the Experience Journal', () => {
		expect(withStartingXP([AWARD], 110)).toEqual([{ amount: 110, type: EntryType.Starting }, AWARD]);
		expect(withoutStartingXP([{ amount: 110, type: EntryType.Starting }, AWARD])).toEqual([AWARD]);
	});
});

describe('canReplaceCareer', () => {
	it('allows replacing the Career until a skill rank is bought', () => {
		expect(canReplaceCareer([{ type: EntryType.Starting }, { type: EntryType.Characteristic }])).toBe(true);
		expect(canReplaceCareer([{ type: EntryType.Starting }, { type: EntryType.Skill }])).toBe(false);
	});
});
