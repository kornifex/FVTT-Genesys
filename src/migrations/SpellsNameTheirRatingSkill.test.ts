/** @file Tests for the migration that moves the skill an Additional Effect's qualities count from the effects to the spell. */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { spellsNameTheirRatingSkill, withSpellRatingSkill } from '@/migrations/11-spells-name-their-rating-skill';
import { ItemSource } from '@/migrations/ItemMigration';

type QualitySource = { name: string; ratingSource: string; rating: number; ratingSkill?: string };

// A quality as 0.7.1 stores it, naming the skill its rating counts.
const quality = (name: string, ratingSource: string, ratingSkill = 'Knowledge'): QualitySource => ({
	name,
	ratingSource,
	rating: 1,
	ratingSkill,
});

const copy = (name: string, ...qualities: QualitySource[]) => ({ id: name.toLowerCase(), name, qualities });

describe('withSpellRatingSkill', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("gives a spell the skill its copies' qualities rated by the caster's ranks all counted", () => {
		const source = {
			additionalEffects: [
				copy('Blast', quality('Blast', 'skillRanks', 'Knowledge (Lore)')),
				// An unrated quality kept the skill a new quality had, which it never counted.
				copy('Impact', quality('Knockdown', 'unrated')),
				copy('Stun', quality('Disorient', 'skillRanks', ' Knowledge (Lore) ')),
			],
		};
		withSpellRatingSkill(source);
		expect(source).toMatchObject({ ratingSkill: 'Knowledge (Lore)' });
	});

	it('gives Knowledge to a spell whose copies counted different skills, and logs the skill each effect counted', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const source = {
			additionalEffects: [
				copy('Blast', quality('Blast', 'skillRanks', 'Knowledge (Lore)')),
				copy('Stun', quality('Disorient', 'skillRanks', 'Knowledge (Forbidden)')),
			],
		};
		withSpellRatingSkill(source);

		expect(source).toMatchObject({ ratingSkill: 'Knowledge' });
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0].join(' ')).toContain('Blast: Knowledge (Lore), Stun: Knowledge (Forbidden)');
	});

	it("gives Knowledge to a spell whose copies' qualities none counted the caster's ranks, without a log", () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const source = { additionalEffects: [copy('Impact', quality('Knockdown', 'unrated', 'Athletics'))] };
		withSpellRatingSkill(source);

		expect(source).toMatchObject({ ratingSkill: 'Knowledge' });
		expect(warn).not.toHaveBeenCalled();
	});

	it('leaves a spell that names its skill, or whose copies name none, as it is: a spell saved since, a partial update', () => {
		const named = { ratingSkill: 'Arcana', additionalEffects: [copy('Blast', quality('Blast', 'skillRanks', 'Knowledge (Lore)'))] };
		const saved = { additionalEffects: [{ id: 'blast', name: 'Blast', qualities: [{ name: 'Blast', ratingSource: 'skillRanks' }] }] };
		const partial = {};
		withSpellRatingSkill(named);
		withSpellRatingSkill(saved);
		withSpellRatingSkill(partial);

		expect(named.ratingSkill).toBe('Arcana');
		expect(saved).not.toHaveProperty('ratingSkill');
		expect(partial).toEqual({});
	});
});

describe('spellsNameTheirRatingSkill', () => {
	const item = (type: string, system: Record<string, unknown>): ItemSource => ({ _id: 'i1', name: 'Item', type, system, effects: [] });

	it("writes down the spell's skill, and drops the skill its copies' qualities named", () => {
		const spell = item('spell', {
			additionalEffects: [copy('Blast', quality('Blast', 'skillRanks', 'Knowledge (Lore)'), quality('Knockdown', 'unrated'))],
		});

		expect(spellsNameTheirRatingSkill(spell)).toEqual({
			update: {
				'system.ratingSkill': 'Knowledge (Lore)',
				'system.additionalEffects': [
					{
						id: 'blast',
						name: 'Blast',
						qualities: [
							{ name: 'Blast', ratingSource: 'skillRanks', rating: 1 },
							{ name: 'Knockdown', ratingSource: 'unrated', rating: 1 },
						],
					},
				],
			},
		});
	});

	it('writes down the skill a spell loaded already has, as Foundry migrated it, and leaves the source as it was', () => {
		const system = { ratingSkill: 'Knowledge (Forbidden)', additionalEffects: [] };
		const spell = item('spell', system);

		expect(spellsNameTheirRatingSkill(spell)).toEqual({
			update: { 'system.ratingSkill': 'Knowledge (Forbidden)', 'system.additionalEffects': [] },
		});
		expect(spellsNameTheirRatingSkill(item('spell', {}))?.update).toMatchObject({ 'system.ratingSkill': 'Knowledge' });
		expect(system).toEqual({ ratingSkill: 'Knowledge (Forbidden)', additionalEffects: [] });
	});

	it("drops the skill an Additional Effect item's qualities named", () => {
		const effect = item('additionalEffect', { qualities: [quality('Blast', 'skillRanks', 'Knowledge (Lore)')] });

		expect(spellsNameTheirRatingSkill(effect)).toEqual({
			update: { 'system.qualities': [{ name: 'Blast', ratingSource: 'skillRanks', rating: 1 }] },
		});
	});

	it('leaves an Additional Effect without qualities and the other items alone', () => {
		expect(spellsNameTheirRatingSkill(item('additionalEffect', { qualities: [] }))).toBeUndefined();
		expect(spellsNameTheirRatingSkill(item('weapon', { qualities: [quality('Blast', 'skillRanks')] }))).toBeUndefined();
	});
});
