/**
 * @file Tests for adding and removing a character's Archetype.
 */

import { describe, expect, it } from 'vitest';
import type { GenesysActor } from '@/actor/GenesysActor';
import type { CharacterDataModel } from '@/actor/data/CharacterDataModel';
import type { ArchetypeDataModel } from '@/item/data/ArchetypeDataModel';
import type { GenesysItem } from '@/item/GenesysItem';
import {
	applyArchetype,
	archetypeActorUpdate,
	ArchetypeGrants,
	ArchetypeHolder,
	canRemoveArchetype,
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
	it('adds the characteristics, thresholds and Starting XP of the Archetype', () => {
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
		{ name: 'Athletics', type: 'skill', system: { rank: 1 } },
		{ name: 'Brawl', type: 'skill', system: { rank: 2 } },
		{ name: 'Tough', type: 'ability', system: {} },
		{ name: 'Grit', type: 'talent', system: {} },
		{ name: 'Rope', type: 'equipment', system: {} },
	];

	it('embeds everything but skills', () => {
		expect(grantedNonSkills(archetypeGrants().grantedItems).map((i) => i.name)).toEqual(['Tough', 'Grit']);
	});

	it('finds the non-skills of the character granted by the Archetype', () => {
		expect(heldNonSkillsGrantedBy(held, archetypeGrants().grantedItems).map((i) => i.name)).toEqual(['Tough', 'Grit']);
	});

	it('gives or takes a rank of each granted skill', () => {
		expect(grantedSkillRankUpdates(held, archetypeGrants().grantedItems, 1)).toEqual([
			{ skill: held[0], update: { 'system.rank': 2 } },
		]);
		expect(grantedSkillRankUpdates(held, archetypeGrants().grantedItems, -1)).toEqual([
			{ skill: held[0], update: { 'system.rank': 0 } },
		]);
	});

	it('gives a rank of a granted skill the character names with another case', () => {
		expect(grantedSkillRankUpdates(held, [{ name: 'brawl', type: 'skill' }], 1)).toEqual([
			{ skill: held[1], update: { 'system.rank': 3 } },
		]);
	});
});

/**
 * A character actor that records the document operations made on it and its items.
 */
function fakeActor(entries: { amount: number; type: EntryType }[] = []) {
	const operations: string[] = [];
	const item = (name: string, type: string, system: object = {}) => ({
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
	const items = [item('Athletics', 'skill', { rank: 1 }), item('Brawl', 'skill', { rank: 0 }), item('Tough', 'ability')];

	const actor = {
		systemData: { ...character(), experienceJournal: { entries } },
		items: { contents: items },
		createEmbeddedDocuments: async (_type: string, data: { name: string }[]) => {
			operations.push(`create ${data.map((d) => d.name).join(', ')}`);
		},
		update: async (changes: Record<string, unknown>) => {
			operations.push(`update actor ${JSON.stringify(changes['system.experienceJournal.entries'])}`);
		},
	} as unknown as GenesysActor<CharacterDataModel>;

	const archetype = { systemData: archetypeGrants(), ...item('Brute', 'archetype') } as unknown as GenesysItem<ArchetypeDataModel>;

	return { actor, archetype, operations };
}

describe('applyArchetype', () => {
	it('embeds the granted items, ranks up the granted skills, then updates the character', async () => {
		const { actor, archetype, operations } = fakeActor();
		await applyArchetype(actor, archetype);

		expect(operations).toEqual([
			'create Tough, Grit',
			'update Athletics {"system.rank":2}',
			'update actor [{"amount":110,"type":"Starting"}]',
		]);
	});
});

describe('removeArchetype', () => {
	it('deletes the granted items, ranks down the granted skills, updates the character, then deletes the Archetype', async () => {
		const { actor, archetype, operations } = fakeActor([{ amount: 110, type: EntryType.Starting }]);
		await removeArchetype(actor, archetype);

		expect(operations).toEqual(['delete Tough', 'update Athletics {"system.rank":0}', 'update actor []', 'delete Brute']);
	});
});

describe('canRemoveArchetype', () => {
	it('only allows it while the Experience Journal holds no more than the Starting XP', () => {
		expect(canRemoveArchetype(fakeActor([{ amount: 110, type: EntryType.Starting }]).actor)).toBe(true);
		expect(
			canRemoveArchetype(
				fakeActor([
					{ amount: 110, type: EntryType.Starting },
					{ amount: 5, type: EntryType.Award },
				]).actor,
			),
		).toBe(false);
	});
});
