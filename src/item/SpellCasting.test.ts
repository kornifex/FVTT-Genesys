import { describe, expect, it } from 'vitest';
import {
	addedDifficulty,
	canCheckEffect,
	castingDifficulty,
	castingSkillName,
	initiallyCheckedEffects,
	spellCast,
} from '@/item/SpellCasting';
import type { SpellQuality } from '@/item/data/Spells';

const skill = (name: string, rank: number) => ({ name, system: { rank } });

describe('castingSkillName', () => {
	it("casts with the spell's skill the character has the most ranks in (CRB p. 211)", () => {
		expect(castingSkillName([skill('Arcana', 1), skill('Divine', 3)], ['Arcana', 'Divine'])).toBe('Divine');
	});

	it("casts with the first of the spell's skills between two of the same rank", () => {
		expect(castingSkillName([skill('Divine', 2), skill('Arcana', 2)], ['Arcana', 'Divine'])).toBe('Arcana');
	});

	it("names the skill as the character owns it, whatever the case of the spell's", () => {
		expect(castingSkillName([skill('Arcana', 1)], ['arcana'])).toBe('Arcana');
	});

	it("refuses a character without a rank in any of the spell's skills, even one they own at rank 0 (CRB p. 210)", () => {
		expect(castingSkillName([skill('Arcana', 0), skill('Primal', 2)], ['Arcana', 'Divine'])).toBeUndefined();
	});
});

// Curse at Average with Enervate (+1, checked by default) and Additional Target (+2) (CRB p. 217).
const ENERVATE = { id: 'enervate', difficulty: 1, startsChecked: true };
const ADDITIONAL_TARGET = { id: 'target', difficulty: 2, startsChecked: false };
const CURSE_EFFECTS = [ENERVATE, ADDITIONAL_TARGET];
const AVERAGE = 2;

describe('addedDifficulty', () => {
	it('adds the difficulty of each checked effect, an effect held twice counting twice (CRB p. 215)', () => {
		const range = { id: 'range-1', difficulty: 1, startsChecked: false };
		const effects = [...CURSE_EFFECTS, range, { ...range, id: 'range-2' }];
		expect(addedDifficulty(effects, ['target', 'range-1', 'range-2'])).toBe(4);
	});
});

describe('initiallyCheckedEffects', () => {
	it('checks the effects that start checked', () => {
		expect(initiallyCheckedEffects(AVERAGE, CURSE_EFFECTS)).toEqual(['enervate']);
	});

	it('leaves unchecked an effect starting checked that would take the difficulty beyond Formidable (CRB p. 215)', () => {
		const effects = [
			{ id: 'a', difficulty: 2, startsChecked: true },
			{ id: 'b', difficulty: 2, startsChecked: true },
			{ id: 'c', difficulty: 1, startsChecked: true },
		];
		expect(initiallyCheckedEffects(AVERAGE, effects)).toEqual(['a', 'c']);
	});
});

describe('canCheckEffect', () => {
	it('lets an effect be checked up to Formidable (CRB p. 215)', () => {
		expect(canCheckEffect(AVERAGE, CURSE_EFFECTS, ['enervate'], ADDITIONAL_TARGET)).toBe(true);
	});

	it('refuses an effect that would take the difficulty beyond Formidable (CRB p. 215)', () => {
		expect(canCheckEffect(3, CURSE_EFFECTS, ['enervate'], ADDITIONAL_TARGET)).toBe(false);
	});

	it('lets a checked effect always be unchecked', () => {
		expect(canCheckEffect(5, CURSE_EFFECTS, ['target'], ADDITIONAL_TARGET)).toBe(true);
	});
});

describe('castingDifficulty', () => {
	it('raises the spell’s difficulty by its checked effects: Curse with Enervate is Hard (CRB p. 217)', () => {
		expect(castingDifficulty(AVERAGE, CURSE_EFFECTS, ['enervate'])).toBe(3);
	});

	it('is Formidable with Additional Target checked too', () => {
		expect(castingDifficulty(AVERAGE, CURSE_EFFECTS, ['enervate', 'target'])).toBe(5);
	});

	it('never goes beyond Formidable, even for a spell edited past it (CRB p. 215)', () => {
		expect(castingDifficulty(4, CURSE_EFFECTS, ['enervate', 'target'])).toBe(5);
	});
});

const quality = (name: string, ratingSource: SpellQuality['ratingSource'], rating = 1): SpellQuality => ({
	name,
	description: `<p>${name}</p>`,
	activation: 'active',
	advantageCost: 2,
	ratingSource,
	rating,
	ratingSkill: 'Knowledge',
});

describe('spellCast', () => {
	const effects = [
		{ id: 'blast', name: 'Blast', qualities: [quality('Blast', 'skillRanks')] },
		{ id: 'impact', name: 'Impact', qualities: [quality('Knockdown', 'unrated')] },
		{ id: 'fire', name: 'Fire', qualities: [quality('Burn', 'fixed', 2)] },
	];

	it('lists the checked effects in the spell’s order, with the 2 strain casting costs (CRB p. 210)', () => {
		expect(spellCast(effects, ['fire', 'impact'], () => 0)).toEqual({
			effects: [
				{ name: 'Impact', qualities: [{ name: 'Knockdown', description: '<p>Knockdown</p>', isRated: false, rating: 0 }] },
				{ name: 'Fire', qualities: [{ name: 'Burn', description: '<p>Burn</p>', isRated: true, rating: 2 }] },
			],
			strain: 2,
		});
	});

	it("rates a quality by the caster's ranks in Knowledge, as Table III.2–5 does (CRB p. 215)", () => {
		const ranks: Record<string, number> = { Knowledge: 3 };
		expect(spellCast(effects, ['blast'], (name) => ranks[name] ?? 0).effects[0].qualities[0]).toMatchObject({
			name: 'Blast',
			isRated: true,
			rating: 3,
		});
	});
});
