/**
 * @file Tests for adding and removing a character's Archetype.
 */

import { describe, expect, it } from 'vitest';
import type { GenesysActor } from '@/actor/GenesysActor';
import type { GenesysItem } from '@/item/GenesysItem';
import {
	archetypeActorUpdate,
	ArchetypeGrants,
	ArchetypeHolder,
	canGrant,
	canRemoveArchetype,
	grantedItemRows,
	grantedNonSkills,
	grantedSkillRankUpdates,
	heldNonSkillsGrantedBy,
	removeArchetype,
} from '@/actor/data/character/Archetype';
import { EntryType } from '@/actor/data/character/ExperienceJournal';

function archetypeGrants(): ArchetypeGrants {
	return {
		characteristics: { brawn: 3, agility: 2, intellect: 1, cunning: 2, willpower: 4, presence: 2 },
		woundThreshold: 10,
		strainThreshold: 8,
		startingXP: 110,
		grantedItems: [
			{ name: 'Athletics', type: 'skill' },
			{ name: 'Tough', type: 'ability' },
			{ name: 'Grit', type: 'talent' },
		],
		nonCareerSkillChoices: 0,
		chosenSkillIds: [],
	};
}

function character(): ArchetypeHolder {
	return {
		characteristics: { brawn: 0, agility: 0, intellect: 0, cunning: 0, willpower: 0, presence: 0 },
		wounds: { max: 0 },
		strain: { max: 0 },
		experienceJournal: { entries: [] },
	};
}

describe('archetypeActorUpdate', () => {
	it('adds the characteristics, thresholds and Starting XP of the Archetype: each threshold is its base plus Brawn or Willpower (CRB p. 35, 45)', () => {
		const holder = character();
		holder.experienceJournal.entries = [{ amount: 5, type: EntryType.Award }];

		expect(archetypeActorUpdate(holder, archetypeGrants(), 1)).toEqual({
			'system.characteristics.brawn': 3,
			'system.characteristics.agility': 2,
			'system.characteristics.intellect': 1,
			'system.characteristics.cunning': 2,
			'system.characteristics.willpower': 4,
			'system.characteristics.presence': 2,
			'system.wounds.max': 13,
			'system.strain.max': 12,
			'system.experienceJournal.entries': [
				{ amount: 110, type: EntryType.Starting },
				{ amount: 5, type: EntryType.Award },
			],
		});
	});

	it('gives a laborer Brawn 3, Willpower 1, a wound threshold of 15, a strain threshold of 9 and 100 Starting XP (CRB p. 37)', () => {
		const laborer: ArchetypeGrants = {
			characteristics: { brawn: 3, agility: 2, intellect: 2, cunning: 2, willpower: 1, presence: 2 },
			woundThreshold: 12,
			strainThreshold: 8,
			startingXP: 100,
			grantedItems: [],
			nonCareerSkillChoices: 0,
			chosenSkillIds: [],
		};

		expect(archetypeActorUpdate(character(), laborer, 1)).toMatchObject({
			'system.characteristics.brawn': 3,
			'system.characteristics.willpower': 1,
			'system.wounds.max': 15,
			'system.strain.max': 9,
			'system.experienceJournal.entries': [{ amount: 100, type: EntryType.Starting }],
		});
	});

	it('removes the characteristics, thresholds and Starting XP of the Archetype', () => {
		const holder: ArchetypeHolder = {
			characteristics: { brawn: 4, agility: 2, intellect: 1, cunning: 3, willpower: 4, presence: 2 },
			wounds: { max: 14 },
			strain: { max: 12 },
			experienceJournal: { entries: [{ amount: 110, type: EntryType.Starting }] },
		};

		expect(archetypeActorUpdate(holder, archetypeGrants(), -1)).toEqual({
			'system.characteristics.brawn': 1,
			'system.characteristics.agility': 0,
			'system.characteristics.intellect': 0,
			'system.characteristics.cunning': 1,
			'system.characteristics.willpower': 0,
			'system.characteristics.presence': 0,
			'system.wounds.max': 1,
			'system.strain.max': 0,
			'system.experienceJournal.entries': [],
		});
	});

	it('leaves the character untouched', () => {
		const holder = character();
		archetypeActorUpdate(holder, archetypeGrants(), 1);

		expect(holder).toEqual(character());
	});
});

describe('granted items', () => {
	const held = [
		{ id: 'athletics', name: 'Athletics', type: 'skill', system: { rank: 1 } },
		{ id: 'brawl', name: 'Brawl', type: 'skill', system: { rank: 2 } },
		{ id: 'tough', name: 'Tough', type: 'ability', system: {} },
		{ id: 'grit', name: 'Grit', type: 'talent', system: {} },
		{ id: 'rope', name: 'Rope', type: 'equipment', system: {} },
	];

	it('embeds everything but skills: its abilities and talents (CRB p. 35)', () => {
		expect(grantedNonSkills(archetypeGrants().grantedItems).map((i) => i.name)).toEqual(['Tough', 'Grit']);
	});

	it('grants a skill it already grants once more, for one more rank (RoT p. 63)', () => {
		expect(canGrant(archetypeGrants().grantedItems, { type: 'skill', name: 'Athletics' })).toBe(true);
		expect(canGrant(archetypeGrants().grantedItems, { type: 'skill', name: 'Brawl' })).toBe(true);
	});

	it('refuses an item of another type it already grants under the same type and exact name', () => {
		expect(canGrant(archetypeGrants().grantedItems, { type: 'talent', name: 'Grit' })).toBe(false);
		expect(canGrant(archetypeGrants().grantedItems, { type: 'talent', name: 'grit' })).toBe(true);
		expect(canGrant(archetypeGrants().grantedItems, { type: 'ability', name: 'Grit' })).toBe(true);
	});

	it('lists each granted skill once, with the number of ranks it grants, whatever the case of its name', () => {
		const grantedItems = [...archetypeGrants().grantedItems, { name: 'athletics', type: 'skill' }];

		expect(grantedItemRows(grantedItems)).toEqual([
			{ item: grantedItems[0], index: 3, count: 2 },
			{ item: grantedItems[1], index: 1, count: 1 },
			{ item: grantedItems[2], index: 2, count: 1 },
		]);
	});

	describe('with flagged granted items', () => {
		const granted = (name: string, type: string, actorId = 'hero') => ({
			name,
			type,
			system: {},
			flags: { genesys: { archetypeGrant: actorId } },
		});

		it('leaves out an item added by hand under the name of a granted item, of the same type or another', () => {
			const items = [
				granted('Tough', 'ability'),
				granted('Grit', 'talent'),
				{ name: 'Tough', type: 'ability', system: {} },
				{ name: 'Grit', type: 'equipment', system: {} },
			];

			expect(heldNonSkillsGrantedBy(items, archetypeGrants().grantedItems, 'hero')).toEqual([items[0], items[1]]);
		});

		it('keeps a granted item that was renamed', () => {
			const items = [granted('Tougher', 'ability'), granted('Grit', 'talent')];

			expect(heldNonSkillsGrantedBy(items, archetypeGrants().grantedItems, 'hero')).toEqual(items);
		});

		it('leaves out a copy of an item granted to another character', () => {
			const items = [granted('Tough', 'ability'), granted('Grit', 'talent'), granted('Tough', 'ability', 'sidekick')];

			expect(heldNonSkillsGrantedBy(items, archetypeGrants().grantedItems, 'hero')).toEqual([items[0], items[1]]);
		});
	});

	describe('without flagged granted items', () => {
		it('finds one held item per grant, of the same type and name', () => {
			const items = [
				{ name: 'Tough', type: 'equipment', system: {} },
				{ name: 'Tough', type: 'ability', system: {} },
				{ name: 'Tough', type: 'ability', system: {} },
				{ name: 'Grit', type: 'talent', system: {} },
			];

			expect(heldNonSkillsGrantedBy(items, archetypeGrants().grantedItems, 'hero')).toEqual([items[1], items[3]]);
		});

		it('finds the items of a character granted under another id, as a duplicated character holds them', () => {
			const items = [
				{ name: 'Tough', type: 'ability', system: {}, flags: { genesys: { archetypeGrant: 'original' } } },
				{ name: 'Grit', type: 'talent', system: {}, flags: { genesys: { archetypeGrant: 'original' } } },
			];

			expect(heldNonSkillsGrantedBy(items, archetypeGrants().grantedItems, 'copy')).toEqual(items);
		});
	});

	it('gives or takes a rank of each granted skill, before any XP is spent (CRB p. 36-39)', () => {
		expect(grantedSkillRankUpdates(held, archetypeGrants().grantedItems, [], 1)).toEqual([
			{ skill: held[0], update: { 'system.rank': 2 } },
		]);
		expect(grantedSkillRankUpdates(held, archetypeGrants().grantedItems, [], -1)).toEqual([
			{ skill: held[0], update: { 'system.rank': 0 } },
		]);
	});

	it('gives or takes a rank per grant of a skill the Archetype grants twice, as the Deep Elf does (RoT p. 63)', () => {
		const twice = [...archetypeGrants().grantedItems, { name: 'Athletics', type: 'skill' }];

		expect(grantedSkillRankUpdates(held, twice, [], 1)).toEqual([{ skill: held[0], update: { 'system.rank': 3 } }]);
		expect(grantedSkillRankUpdates([{ ...held[0], system: { rank: 2 } }], twice, [], -1)).toEqual([
			{ skill: { ...held[0], system: { rank: 2 } }, update: { 'system.rank': 0 } },
		]);
	});

	it('gives a rank of a granted skill the character names with another case', () => {
		expect(grantedSkillRankUpdates(held, [{ name: 'brawl', type: 'skill' }], [], 1)).toEqual([
			{ skill: held[1], update: { 'system.rank': 3 } },
		]);
	});

	it('gives or takes a rank of each skill chosen for the Archetype, as the Human gives two (RoT p. 61)', () => {
		expect(grantedSkillRankUpdates(held, [], ['brawl'], 1)).toEqual([{ skill: held[1], update: { 'system.rank': 3 } }]);
		expect(grantedSkillRankUpdates(held, [], ['brawl'], -1)).toEqual([{ skill: held[1], update: { 'system.rank': 1 } }]);
	});

	it('never takes a rank below 0, as when the Free Rank was already taken back by hand', () => {
		const lowered = [
			{ ...held[0], system: { rank: 1 } },
			{ ...held[1], system: { rank: 0 } },
		];
		const twice = [...archetypeGrants().grantedItems, { name: 'Athletics', type: 'skill' }];

		expect(grantedSkillRankUpdates(lowered, twice, ['brawl'], -1)).toEqual([
			{ skill: lowered[0], update: { 'system.rank': 0 } },
			{ skill: lowered[1], update: { 'system.rank': 0 } },
		]);
	});

	it('gives a skill both granted and chosen a rank for each, and ignores a chosen id the character no longer holds', () => {
		expect(grantedSkillRankUpdates(held, archetypeGrants().grantedItems, ['athletics', 'gone'], 1)).toEqual([
			{ skill: held[0], update: { 'system.rank': 3 } },
		]);
	});
});

/**
 * A character actor that records the document operations made on it and its items.
 */
function fakeActor(entries: { amount: number; type: EntryType }[] = [], chosenSkillIds: string[] = []) {
	const operations: string[] = [];
	const item = (name: string, type: string, system: object = {}) => ({
		id: name.toLowerCase(),
		name,
		type,
		system,
		update: async (changes: object) => {
			operations.push(`update ${name} ${JSON.stringify(changes)}`);
		},
		delete: async () => {
			operations.push(`delete ${name}`);
		},
	});
	const items = [item('Athletics', 'skill', { rank: 1 }), item('Brawl', 'skill', { rank: 1 }), item('Tough', 'ability')];

	const actor = {
		id: 'hero',
		system: { ...character(), experienceJournal: { entries } },
		items: { contents: items },
		update: async (changes: Record<string, unknown>) => {
			operations.push(`update actor ${JSON.stringify(changes['system.experienceJournal.entries'])}`);
		},
	} as unknown as GenesysActor<'character'>;

	const archetype = item('Brute', 'archetype', { ...archetypeGrants(), chosenSkillIds }) as unknown as GenesysItem<'archetype'>;

	return { actor, archetype, operations };
}

describe('removeArchetype', () => {
	it('deletes the granted items, ranks down the granted skills, updates the character, then deletes the Archetype', async () => {
		const { actor, archetype, operations } = fakeActor([{ amount: 110, type: EntryType.Starting }]);
		await removeArchetype(actor, archetype);

		expect(operations).toEqual(['delete Tough', 'update Athletics {"system.rank":0}', 'update actor []', 'delete Brute']);
	});

	it('takes back the rank of each skill chosen for the Archetype', async () => {
		const { actor, archetype, operations } = fakeActor([{ amount: 110, type: EntryType.Starting }], ['brawl']);
		await removeArchetype(actor, archetype);

		expect(operations).toEqual([
			'delete Tough',
			'update Athletics {"system.rank":0}',
			'update Brawl {"system.rank":0}',
			'update actor []',
			'delete Brute',
		]);
	});
});

describe('canRemoveArchetype', () => {
	it('only allows it while the Experience Journal holds no more than the Starting XP', () => {
		expect(canRemoveArchetype({ experienceJournal: { entries: [{ amount: 110, type: EntryType.Starting }] } })).toBe(true);
		expect(
			canRemoveArchetype({
				experienceJournal: {
					entries: [
						{ amount: 110, type: EntryType.Starting },
						{ amount: 5, type: EntryType.Award },
					],
				},
			}),
		).toBe(false);
	});
});
