/**
 * @file Tests for Advancement: spending XP and undoing it from the Experience Journal.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { GenesysActor } from '@/actor/GenesysActor';
import {
	advancementCharacter,
	AdvancementCharacter,
	AdvancementResult,
	AdvancementTalent,
	availableXP,
	awardXP,
	buyDroppedTalent,
	buySkillRank,
	buyTalentRank,
	canReplaceCareer,
	isAllowed,
	itemsRemovedByUndo,
	raiseCharacteristic,
	thresholdUpdates,
	totalXP,
	undoEntry,
	withoutStartingXP,
	withStartingXP,
} from '@/actor/data/character/Advancement';
import { isInCharacterCreation } from '@/actor/data/character/CharacterCreation';
import { Entry, EntryType } from '@/actor/data/character/ExperienceJournal';
import { Characteristic, CharacteristicsContainer } from '@/data/Characteristics';

function talent(id: string, tier: number, rank = 1, ranked: 'yes' | 'no' = 'yes'): AdvancementTalent {
	return { id, name: id, ranked, tier, rank };
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
	it('raises a characteristic for ten times its new rating in XP (CRB p. 30, 44)', () => {
		const result = raiseCharacteristic(character(), Characteristic.Agility);

		expect(plan(result)).toEqual({
			actorUpdate: {
				'system.characteristics.agility': 3,
				'system.experienceJournal.entries': [
					{ amount: 100, type: EntryType.Starting },
					{ amount: -30, type: EntryType.Characteristic, data: { characteristic: Characteristic.Agility, rank: 3 } },
				],
			},
			itemCreates: [],
			itemUpdates: [],
			itemDeletes: [],
		});
	});

	it('raises the characteristic one rating at a time: Brawn 3 to 5 costs 40, then 50 XP (CRB p. 44)', () => {
		const atThree = character({ characteristics: { brawn: 3, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 } });
		const raised = raiseCharacteristic(atThree, Characteristic.Brawn);
		const toFour = newEntries(raised);
		const toFive = newEntries(
			raiseCharacteristic(
				character({ entries: toFour, characteristics: { ...atThree.characteristics, brawn: 4 } }),
				Characteristic.Brawn,
			),
		);

		expect(toFive.slice(1).map((entry) => entry.amount)).toEqual([-40, -50]);
		expect(plan(raised).actorUpdate['system.characteristics.brawn']).toBe(4);
	});

	it('raises the wound threshold with Brawn and the strain threshold with Willpower (CRB p. 31, 45)', () => {
		expect(plan(raiseCharacteristic(character(), Characteristic.Brawn)).actorUpdate['system.wounds.max']).toBe(13);
		expect(plan(raiseCharacteristic(character(), Characteristic.Willpower)).actorUpdate['system.strain.max']).toBe(13);
		expect(plan(raiseCharacteristic(character(), Characteristic.Agility)).actorUpdate).not.toHaveProperty('system.wounds.max');
	});

	it('is only allowed during Character Creation, even with XP left (CRB p. 30, 44), so no later Brawn or Willpower raise reaches a threshold (CRB p. 31, 45)', () => {
		const afterCreation = character({ entries: [{ amount: 100, type: EntryType.Starting }, AWARD] });

		for (const characteristic of [Characteristic.Agility, Characteristic.Brawn, Characteristic.Willpower]) {
			expect(isAllowed(raiseCharacteristic(afterCreation, characteristic))).toBe(false);
		}
	});

	it('is refused at 5, or without enough XP (CRB p. 30, 44)', () => {
		expect(
			isAllowed(
				raiseCharacteristic(
					character({ characteristics: { brawn: 5, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 } }),
					Characteristic.Brawn,
				),
			),
		).toBe(false);
		expect(
			isAllowed(raiseCharacteristic(character({ entries: [{ amount: 29, type: EntryType.Starting }] }), Characteristic.Agility)),
		).toBe(false);
		expect(
			isAllowed(raiseCharacteristic(character({ entries: [{ amount: 30, type: EntryType.Starting }] }), Characteristic.Agility)),
		).toBe(true);
	});
});

describe('buySkillRank', () => {
	it('costs five times the new rank in XP for a career skill, 5 more otherwise (CRB p. 30, 40, 44)', () => {
		expect(newEntries(buySkillRank(character(), 'athletics')).at(-1)).toEqual({
			amount: -5,
			type: EntryType.Skill,
			data: { name: 'Athletics', id: 'athletics', rank: 1 },
		});
		expect(newEntries(buySkillRank(character(), 'cool')).at(-1)).toEqual({
			amount: -15,
			type: EntryType.Skill,
			data: { name: 'Cool', id: 'cool', rank: 2 },
		});
		expect(plan(buySkillRank(character(), 'cool')).itemUpdates).toEqual([{ _id: 'cool', 'system.rank': 2 }]);
	});

	it('buys a career skill to rank 2 for 15 XP, a non-career skill for 25 XP, one rank at a time (CRB p. 44)', () => {
		const costs = (skill: { id: string; name: string; rank: number; career: boolean }) => {
			const toOne = newEntries(buySkillRank(character({ skills: [skill] }), skill.id));
			const toTwo = newEntries(buySkillRank(character({ entries: toOne, skills: [{ ...skill, rank: 1 }] }), skill.id));
			return toTwo.slice(1).map((entry) => entry.amount);
		};

		expect(costs({ id: 'athletics', name: 'Athletics', rank: 0, career: true })).toEqual([-5, -10]);
		expect(costs({ id: 'stealth', name: 'Stealth', rank: 0, career: false })).toEqual([-10, -15]);
	});

	it('caps bought ranks at 2 during Character Creation, at 5 afterwards (CRB p. 30, 44)', () => {
		const atTwo = { skills: [{ id: 'cool', name: 'Cool', rank: 2, career: true }] };

		expect(isAllowed(buySkillRank(character(atTwo), 'cool'))).toBe(false);
		expect(isAllowed(buySkillRank(character({ ...atTwo, entries: [{ amount: 100, type: EntryType.Starting }, AWARD] }), 'cool'))).toBe(
			true,
		);
		expect(
			isAllowed(
				buySkillRank(
					character({
						skills: [{ id: 'cool', name: 'Cool', rank: 5, career: true }],
						entries: [{ amount: 100, type: EntryType.Starting }, AWARD],
					}),
					'cool',
				),
			),
		).toBe(false);
	});

	it('is refused without enough XP, or for a skill the character lacks', () => {
		expect(isAllowed(buySkillRank(character({ entries: [{ amount: 14, type: EntryType.Starting }] }), 'cool'))).toBe(false);
		expect(isAllowed(buySkillRank(character(), 'stealth'))).toBe(false);
	});
});

describe('buyTalentRank', () => {
	// Two tier 1 talents allow one talent at tier 2.
	const talents = [talent('grit', 1), talent('toughened', 1), talent('parry', 1)];

	it('buys the next rank of a ranked talent at the next tier, for 5 XP per tier (CRB p. 71-72)', () => {
		const result = buyTalentRank(character({ talents }), 'grit');

		expect(plan(result).itemUpdates).toEqual([{ _id: 'grit', 'system.rank': 2 }]);
		expect(newEntries(result).at(-1)).toEqual({
			amount: -10,
			type: EntryType.TalentRank,
			data: { name: 'grit', id: 'grit', tier: 2, rank: 2 },
		});
	});

	it('buys the next rank of a talent at tier 5 at tier 5, for 25 XP (CRB p. 71-72)', () => {
		// Six tier 1 talents, five tier 2, four tier 3 and three tier 4 leave room for a second rank at tier 5.
		const pyramid = [6, 5, 4, 3].flatMap((count, index) =>
			Array.from({ length: count }, (_, n) => talent(`t${index + 1}-${n}`, index + 1)),
		);
		const talents = [...pyramid, talent('hero', 5)];

		expect(
			newEntries(buyTalentRank(character({ talents, entries: [{ amount: 200, type: EntryType.Starting }] }), 'hero')).at(-1),
		).toEqual({
			amount: -25,
			type: EntryType.TalentRank,
			data: { name: 'hero', id: 'hero', tier: 5, rank: 2 },
		});
	});

	it("is refused for a talent that isn't ranked, which is bought only once (CRB p. 72)", () => {
		expect(refusal(buyTalentRank(character({ talents: [talent('grit', 1, 1, 'no')] }), 'grit'))).toEqual({
			key: 'Genesys.Notifications.TalentNotRanked',
			data: { talentName: 'grit' },
		});
	});

	it('is refused when the Talent Pyramid has no room at the tier, unless the house rule ignores it (CRB p. 72)', () => {
		const lonely = [talent('grit', 1)];

		expect(refusal(buyTalentRank(character({ talents: lonely }), 'grit'))).toEqual({
			key: 'Genesys.Notifications.CannotPurchaseTalentTier',
			data: { tier: 2, lowerTier: 1, minimum: 2 },
		});
		expect(
			isAllowed(
				buyTalentRank(character({ talents: lonely, houseRules: { ignoreTalentPyramid: true, talentTierVersions: false } }), 'grit'),
			),
		).toBe(true);
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
		expect(newEntries(buyTalentRank(character(tierVersions), 'grit', 3)).at(-1)).toEqual({
			amount: -15,
			type: EntryType.TalentRank,
			data: { name: 'grit', id: 'grit', tier: 3, rank: 2 },
		});
	});
});

describe('buyDroppedTalent', () => {
	const dropped = { name: 'Dodge', tier: 1, source: { name: 'Dodge', type: 'talent', system: { tier: 1 } } };

	it('creates a new talent with the given id, for five times its tier in XP (CRB p. 30, 44)', () => {
		const result = buyDroppedTalent(character(), dropped, 'newId');

		expect(plan(result).itemCreates).toEqual([{ ...dropped.source, _id: 'newId' }]);
		expect(newEntries(result).at(-1)).toEqual({
			amount: -5,
			type: EntryType.NewTalent,
			data: { name: 'Dodge', id: 'newId', tier: 1, rank: 1 },
		});
	});

	it('costs 25 XP for a tier 5 talent (CRB p. 44)', () => {
		const anyTier = character({ houseRules: { ignoreTalentPyramid: true, talentTierVersions: false } });

		expect(newEntries(buyDroppedTalent(anyTier, { ...dropped, tier: 5 }, 'newId')).at(-1)?.amount).toBe(-25);
	});

	it('is refused when the Talent Pyramid has no room, or without enough XP (CRB p. 72)', () => {
		expect(refusal(buyDroppedTalent(character(), { ...dropped, tier: 2 }, 'newId'))?.key).toBe(
			'Genesys.Notifications.CannotPurchaseTalentTier',
		);
		expect(refusal(buyDroppedTalent(character({ entries: [{ amount: 4, type: EntryType.Starting }] }), dropped, 'newId'))).toEqual({
			key: 'Genesys.Notifications.CannotAffordTalent',
			data: { name: 'Dodge', cost: 5 },
		});
	});

	it('buys a rank of the ranked talent of the same name when the character has it (CRB p. 72)', () => {
		const held = [talent('Dodge', 1), talent('grit', 1), talent('parry', 1)];
		const result = buyDroppedTalent(character({ talents: held }), dropped, 'newId');

		expect(plan(result).itemCreates).toEqual([]);
		expect(plan(result).itemUpdates).toEqual([{ _id: 'Dodge', 'system.rank': 2 }]);
		expect(newEntries(result).at(-1)).toMatchObject({ type: EntryType.TalentRank, data: { tier: 2 } });
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
	it('lowers the characteristic, and the threshold it raised (CRB p. 31, 45)', () => {
		const entries: Entry[] = [
			{ amount: 100, type: EntryType.Starting },
			{ amount: -30, type: EntryType.Characteristic, data: { characteristic: Characteristic.Brawn, rank: 3 } },
		];
		const result = undoEntry(character({ entries, woundThreshold: 13 }), 1);

		expect(plan(result).actorUpdate).toEqual({
			'system.characteristics.brawn': 2,
			'system.wounds.max': 12,
			'system.experienceJournal.entries': [{ amount: 100, type: EntryType.Starting }],
		});
	});

	it('refuses to undo a characteristic or skill rank that a later rank builds on', () => {
		const characteristics: Entry[] = [
			{ amount: -30, type: EntryType.Characteristic, data: { characteristic: Characteristic.Agility, rank: 3 } },
			{ amount: -40, type: EntryType.Characteristic, data: { characteristic: Characteristic.Agility, rank: 4 } },
		];
		const skills: Entry[] = [
			{ amount: -10, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 1 } },
			{ amount: -15, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 2 } },
		];

		expect(refusal(undoEntry(character({ entries: characteristics }), 0))?.key).toBe(
			'Genesys.Notifications.CannotDeleteCharacteristic',
		);
		expect(isAllowed(undoEntry(character({ entries: characteristics }), 1))).toBe(true);
		expect(refusal(undoEntry(character({ entries: skills }), 0))).toEqual({
			key: 'Genesys.Notifications.CannotDeleteSkill',
			data: skills[0].data,
		});
	});

	it('lowers the skill rank, never below 0', () => {
		const entries: Entry[] = [{ amount: -10, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 1 } }];

		expect(plan(undoEntry(character({ entries }), 0)).itemUpdates).toEqual([{ _id: 'cool', 'system.rank': 0 }]);
		expect(
			plan(undoEntry(character({ entries, skills: [{ id: 'cool', name: 'Cool', rank: 0, career: false }] }), 0)).itemUpdates,
		).toEqual([{ _id: 'cool', 'system.rank': 0 }]);
	});

	it('deletes a new talent, and lowers the rank of a talent', () => {
		const newTalent: Entry[] = [{ amount: -5, type: EntryType.NewTalent, data: { name: 'grit', id: 'grit', tier: 1, rank: 1 } }];
		const talentRank: Entry[] = [{ amount: -10, type: EntryType.TalentRank, data: { name: 'grit', id: 'grit', tier: 2, rank: 2 } }];

		expect(plan(undoEntry(character({ entries: newTalent, talents: [talent('grit', 1)] }), 0)).itemDeletes).toEqual(['grit']);
		expect(
			plan(undoEntry(character({ entries: talentRank, talents: [talent('grit', 1, 2), talent('parry', 1)] }), 0)).itemUpdates,
		).toEqual([{ _id: 'grit', 'system.rank': 1 }]);
	});

	it("refuses to undo a talent entry that isn't the talent's latest rank", () => {
		const entries: Entry[] = [{ amount: -5, type: EntryType.NewTalent, data: { name: 'grit', id: 'grit', tier: 1, rank: 1 } }];

		expect(refusal(undoEntry(character({ entries, talents: [talent('grit', 1, 2), talent('parry', 1)] }), 0))?.key).toBe(
			'Genesys.Notifications.CannotDeleteExistingTalent',
		);
	});

	it('refuses to undo a talent the Talent Pyramid rests on, unless the house rule ignores it', () => {
		const entries: Entry[] = [{ amount: -5, type: EntryType.NewTalent, data: { name: 'grit', id: 'grit', tier: 1, rank: 1 } }];
		const talents = [talent('grit', 1), talent('parry', 1), talent('dodge', 2)];

		expect(refusal(undoEntry(character({ entries, talents }), 0))).toEqual({
			key: 'Genesys.Notifications.CannotDeleteInvalidTalentPyramid',
			data: { rank: 1 },
		});
		expect(
			isAllowed(undoEntry(character({ entries, talents, houseRules: { ignoreTalentPyramid: true, talentTierVersions: false } }), 0)),
		).toBe(true);
	});

	it('only removes the entry when what it bought is gone', () => {
		const entries: Entry[] = [{ amount: -10, type: EntryType.Skill, data: { name: 'Stealth', id: 'stealth', rank: 1 } }];

		expect(plan(undoEntry(character({ entries }), 0))).toEqual({
			actorUpdate: { 'system.experienceJournal.entries': [] },
			itemCreates: [],
			itemUpdates: [],
			itemDeletes: [],
		});
	});

	it('returns the character to Character Creation when the only Award is undone', () => {
		const entries = newEntries(undoEntry(character({ entries: [{ amount: 100, type: EntryType.Starting }, AWARD] }), 1));

		expect(isInCharacterCreation(entries)).toBe(true);
	});

	it('keeps the skill ranks bought above 2 after the only Award when it is undone, and caps only new purchases at 2', () => {
		const entries: Entry[] = [
			{ amount: 100, type: EntryType.Starting },
			AWARD,
			{ amount: -15, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 3 } },
		];
		const skills = [
			{ id: 'athletics', name: 'Athletics', rank: 2, career: true },
			{ id: 'cool', name: 'Cool', rank: 3, career: true },
		];
		const undone = plan(undoEntry(character({ entries, skills }), 1));
		const backInCreation = character({ entries: newEntries({ plan: undone }), skills });

		expect(undone.itemUpdates).toEqual([]);
		expect(isInCharacterCreation(backInCreation.entries)).toBe(true);
		expect(isAllowed(buySkillRank(backInCreation, 'cool'))).toBe(false);
		expect(isAllowed(buySkillRank(backInCreation, 'athletics'))).toBe(false);
	});

	it('refuses an entry that does not exist', () => {
		expect(refusal(undoEntry(character(), 3))).toBeUndefined();
	});
});

describe('itemsRemovedByUndo', () => {
	const newTalent: Entry = { amount: -5, type: EntryType.NewTalent, data: { name: 'Grit', id: 'grit', tier: 1, rank: 1 } };

	it('names the talent that undoing its purchase deletes', () => {
		const grit = { ...talent('grit', 1), name: 'Grit' };

		expect(itemsRemovedByUndo(character({ entries: [newTalent], talents: [grit] }), 0)).toEqual(['Grit']);
	});

	it("removes nothing when the undo only lowers a rank: a characteristic's, a skill's or a talent's", () => {
		const entries: Entry[] = [
			{ amount: -30, type: EntryType.Characteristic, data: { characteristic: Characteristic.Brawn, rank: 3 } },
			{ amount: -10, type: EntryType.Skill, data: { name: 'Cool', id: 'cool', rank: 1 } },
			{ amount: -10, type: EntryType.TalentRank, data: { name: 'Grit', id: 'grit', tier: 2, rank: 2 } },
		];
		const grit = talent('grit', 1, 2);
		const parry = talent('parry', 1);

		expect([0, 1, 2].map((index) => itemsRemovedByUndo(character({ entries, talents: [grit, parry] }), index))).toEqual([[], [], []]);
	});

	it('removes nothing when the undo is refused, or the talent is already gone', () => {
		const later: Entry = { amount: -10, type: EntryType.TalentRank, data: { name: 'Grit', id: 'grit', tier: 2, rank: 2 } };

		expect(itemsRemovedByUndo(character({ entries: [newTalent, later], talents: [talent('grit', 1, 2)] }), 0)).toEqual([]);
		expect(itemsRemovedByUndo(character({ entries: [newTalent] }), 0)).toEqual([]);
	});
});

describe('advancementCharacter', () => {
	beforeAll(() => {
		vi.stubGlobal('CONFIG', { genesys: { settings: { ignoreTalentPyramid: false, talentTierVersions: false } } });
	});

	afterAll(() => {
		vi.unstubAllGlobals();
	});

	/**
	 * A character actor whose base Brawn is `brawn`, shown with `effectBonus` more from an Active Effect.
	 */
	function actor(brawn: number, effectBonus: number, entries: Entry[] = [{ amount: 200, type: EntryType.Starting }]) {
		const base: CharacteristicsContainer = { brawn, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 };
		return {
			system: {
				experienceJournal: { entries },
				characteristics: { ...base, brawn: brawn + effectBonus },
				_source: { characteristics: base, wounds: { max: 12 }, strain: { max: 12 } },
			},
			items: [],
		} as unknown as GenesysActor<'character'>;
	}

	it('raises a characteristic from its base rating, without its Active Effects (CRB p. 44)', () => {
		for (const [brawn, effectBonus, cost] of [
			[2, 1, 30],
			[3, 1, 40],
			[4, 1, 50],
			[2, 0, 30],
		]) {
			const raised = plan(raiseCharacteristic(advancementCharacter(actor(brawn, effectBonus)), Characteristic.Brawn));

			expect(raised.actorUpdate['system.characteristics.brawn']).toBe(brawn + 1);
			expect(newEntries({ plan: raised }).at(-1)?.amount).toBe(-cost);
		}
	});

	it('refuses to raise a base rating of 5, even with an Active Effect on it (CRB p. 44)', () => {
		expect(isAllowed(raiseCharacteristic(advancementCharacter(actor(5, 1)), Characteristic.Brawn))).toBe(false);
	});

	it('puts the base rating back when the raise is undone, with an Active Effect on it (CRB p. 44)', () => {
		const entries = newEntries(raiseCharacteristic(advancementCharacter(actor(2, 1)), Characteristic.Brawn));

		expect(plan(undoEntry(advancementCharacter(actor(3, 1, entries)), 1)).actorUpdate['system.characteristics.brawn']).toBe(2);
	});

	it('puts back one less than the rank an older entry stored with an Active Effect, one too high per effect point', () => {
		// Before raises were made from the base rating, Brawn 2 + 1 raised once was recorded as rank 4 for a base of 3.
		const entries: Entry[] = [
			{ amount: 200, type: EntryType.Starting },
			{ amount: -40, type: EntryType.Characteristic, data: { characteristic: Characteristic.Brawn, rank: 4 } },
		];

		expect(plan(undoEntry(advancementCharacter(actor(3, 1, entries)), 1)).actorUpdate['system.characteristics.brawn']).toBe(3);
	});
});

describe('Starting XP', () => {
	it('is the first entry of the Experience Journal', () => {
		expect(withStartingXP([AWARD], 110)).toEqual([{ amount: 110, type: EntryType.Starting }, AWARD]);
		expect(withoutStartingXP([{ amount: 110, type: EntryType.Starting }, AWARD])).toEqual([AWARD]);
	});

	it('left unspent at the end of Character Creation, is spent along with the XP earned in play (CRB p. 30, 44)', () => {
		const entries: Entry[] = [
			{ amount: 100, type: EntryType.Starting },
			{ amount: -30, type: EntryType.Characteristic, data: { characteristic: Characteristic.Agility, rank: 3 } },
			AWARD,
		];

		expect(availableXP(entries)).toBe(90);
	});
});

describe('totalXP', () => {
	it('adds up the XP the character gained, leaving out the XP spent', () => {
		const entries: Entry[] = [
			{ amount: 100, type: EntryType.Starting },
			{ amount: -30, type: EntryType.Characteristic, data: { characteristic: Characteristic.Agility, rank: 3 } },
			AWARD,
		];

		expect(totalXP(entries)).toBe(120);
		expect(totalXP([])).toBe(0);
	});
});

describe('thresholdUpdates', () => {
	it('moves the wound threshold with Brawn and the strain threshold with Willpower (CRB p. 31, 45)', () => {
		expect(thresholdUpdates({ wounds: 12, strain: 10 }, { brawn: 1 })).toEqual({ 'system.wounds.max': 13 });
		expect(thresholdUpdates({ wounds: 12, strain: 10 }, { willpower: -1 })).toEqual({ 'system.strain.max': 9 });
		expect(thresholdUpdates({ wounds: 12, strain: 10 }, { brawn: 2, willpower: 3, agility: 1 })).toEqual({
			'system.wounds.max': 14,
			'system.strain.max': 13,
		});
	});

	it('leaves the thresholds out when neither Brawn nor Willpower changes', () => {
		expect(thresholdUpdates({ wounds: 12, strain: 10 }, { agility: 1 })).toEqual({});
	});
});

describe('canReplaceCareer', () => {
	it('allows replacing the Career until a skill rank is bought', () => {
		expect(canReplaceCareer([{ type: EntryType.Starting }, { type: EntryType.Characteristic }])).toBe(true);
		expect(canReplaceCareer([{ type: EntryType.Starting }, { type: EntryType.Skill }])).toBe(false);
	});
});
