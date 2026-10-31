/** @file Tests for the planner of the migration that links the talent purchases recorded without a talent id. */

import { describe, expect, it } from 'vitest';

import { ActorChanges, ActorSource } from '@/migrations/ActorMigration';
import { linkTalentPurchases } from '@/migrations/5-link-talent-purchases';

type Entry = { amount: number; type: string; data?: Record<string, unknown> };

function item(_id: string, name: string, type = 'talent') {
	return { _id, name, type, system: {}, effects: [] };
}

function character(entries: Entry[], items: ReturnType<typeof item>[]): ActorSource {
	return { name: 'Hero', type: 'character', system: { experienceJournal: { entries } }, items, effects: [] };
}

// A talent purchase as it was recorded before upstream 0.1.14, without the talent's id.
function unlinkedPurchase(name: string): Entry {
	return { amount: -5, type: 'NewTalent', data: { name, tier: 1, rank: 1 } };
}

// The journal of an actor once a plan is applied, as Foundry would apply it.
function appliedJournal(source: ActorSource, { update = {} }: ActorChanges): ActorSource {
	const entries = update['system.experienceJournal.entries'];
	return entries ? { ...source, system: { ...source.system, experienceJournal: { entries } } } : source;
}

describe('linkTalentPurchases', () => {
	it('links an unlinked purchase to the one talent of its name, the rest of the journal kept', () => {
		const starting = { amount: 100, type: 'Starting' };
		const source = character([starting, unlinkedPurchase('Grit')], [item('grit', 'Grit'), item('steady', 'Steady')]);

		expect(linkTalentPurchases(source)).toEqual({
			update: {
				'system.experienceJournal.entries': [
					starting,
					{ amount: -5, type: 'NewTalent', data: { name: 'Grit', id: 'grit', tier: 1, rank: 1 } },
				],
			},
		});
	});

	it('leaves an unlinked purchase whose name no talent of the character has, or several do', () => {
		const source = character(
			[unlinkedPurchase('Gone'), unlinkedPurchase('Twice')],
			[item('first', 'Twice'), item('second', 'Twice'), item('gone', 'Gone', 'skill')],
		);

		expect(linkTalentPurchases(source)).toBeUndefined();
	});

	it('links only the purchases it can, the others kept as they were', () => {
		const source = character([unlinkedPurchase('Gone'), unlinkedPurchase('Grit')], [item('grit', 'Grit')]);

		expect(linkTalentPurchases(source)?.update?.['system.experienceJournal.entries']).toEqual([
			unlinkedPurchase('Gone'),
			{ amount: -5, type: 'NewTalent', data: { name: 'Grit', id: 'grit', tier: 1, rank: 1 } },
		]);
	});

	it('leaves an unlinked purchase whose talent another purchase holds, as once the talent was deleted and bought again', () => {
		const source = character(
			[unlinkedPurchase('Grit'), { amount: -5, type: 'NewTalent', data: { name: 'Grit', id: 'grit', tier: 1, rank: 1 } }],
			[item('grit', 'Grit')],
		);

		expect(linkTalentPurchases(source)).toBeUndefined();
	});

	it('leaves the unlinked purchases of a name bought more than once, which the one talent of that name tells apart from none', () => {
		const source = character([unlinkedPurchase('Grit'), unlinkedPurchase('Grit')], [item('grit', 'Grit')]);

		expect(linkTalentPurchases(source)).toBeUndefined();
	});

	it('leaves a purchase that holds a talent id, and the entries of the other types', () => {
		const source = character(
			[
				{ amount: -5, type: 'NewTalent', data: { name: 'Grit', id: 'old', tier: 1, rank: 1 } },
				{ amount: -10, type: 'TalentRank', data: { name: 'Grit', id: 'old', tier: 2, rank: 2 } },
				{ amount: -5, type: 'Skill', data: { name: 'Grit', id: 'old', rank: 1 } },
			],
			[item('grit', 'Grit')],
		);

		expect(linkTalentPurchases(source)).toBeUndefined();
	});

	it('makes no update for a character without unlinked purchases, or an actor without a journal', () => {
		expect(linkTalentPurchases(character([{ amount: 100, type: 'Starting' }], [item('grit', 'Grit')]))).toBeUndefined();
		expect(
			linkTalentPurchases({ name: 'Raider', type: 'rival', system: {}, items: [item('grit', 'Grit')], effects: [] }),
		).toBeUndefined();
	});

	it('changes nothing on a second run', () => {
		const source = character([unlinkedPurchase('Grit')], [item('grit', 'Grit')]);

		expect(linkTalentPurchases(appliedJournal(source, linkTalentPurchases(source)!))).toBeUndefined();
	});
});
