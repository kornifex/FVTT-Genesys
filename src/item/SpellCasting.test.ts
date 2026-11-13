import { describe, expect, it } from 'vitest';
import {
	addedDifficulty,
	castingDifficulty,
	castingSkillName,
	castingStrain,
	difficultyAddedBy,
	initialEffectCounts,
	maxEffectCount,
	spellAttackProfile,
	spellCast,
} from '@/item/SpellCasting';
import type { ContainedAdditionalEffect, SpellQuality } from '@/item/data/Spells';
import { Characteristic } from '@/data/Characteristics';
import { criticalTriggers } from '@/dice/CriticalInjuryRoll';
import { AVERAGE, EASY } from '@/dice/Difficulty';
import { attackDamage } from '@/item/Weapons';

const skill = (name: string, rank: number) => ({ name, system: { rank } });

describe('castingSkillName', () => {
	it("casts with the spell's skill the character has the most ranks in (CRB p. 211)", () => {
		expect(castingSkillName([skill('Arcana', 1), skill('Divine', 3)], ['Arcana', 'Divine'])).toEqual({ ok: true, skill: 'Divine' });
	});

	it("casts with the first of the spell's skills between two of the same rank", () => {
		expect(castingSkillName([skill('Divine', 2), skill('Arcana', 2)], ['Arcana', 'Divine'])).toEqual({ ok: true, skill: 'Arcana' });
	});

	it("names the skill as the character owns it, whatever the case of the spell's", () => {
		expect(castingSkillName([skill('Arcana', 1)], ['arcana'])).toEqual({ ok: true, skill: 'Arcana' });
	});

	it("refuses a character without a rank in any of the spell's skills, even one they own at rank 0 (CRB p. 210)", () => {
		expect(castingSkillName([skill('Arcana', 0), skill('Primal', 2)], ['Arcana', 'Divine'])).toEqual({ ok: false, reason: 'noRank' });
	});

	it('refuses a spell that lists no skill, whatever the character owns', () => {
		expect(castingSkillName([skill('Arcana', 2)], [])).toEqual({ ok: false, reason: 'noSkillListed' });
	});
});

// Curse at Average with Enervate (+1, checked by default) and Additional Target (+2) (CRB p. 217).
const ENERVATE = { id: 'enervate', difficulty: 1, startsChecked: true, repeatable: false };
const ADDITIONAL_TARGET = { id: 'target', difficulty: 2, startsChecked: false, repeatable: false };
const CURSE_EFFECTS = [ENERVATE, ADDITIONAL_TARGET];
// Range, which says it can be added more than once, where an effect is added once unless it says otherwise (CRB p. 215).
const RANGE = { id: 'range', difficulty: 1, startsChecked: false, repeatable: true };

describe('castingStrain', () => {
	it('costs a spell cast 2 strain, and any other check none (CRB p. 210)', () => {
		expect(castingStrain({ kind: 'spell', spellName: 'Curse', isAttack: false })).toBe(2);
		expect(castingStrain({ kind: 'attack', weaponName: 'Sword' })).toBe(0);
		expect(castingStrain({ kind: 'check' })).toBe(0);
	});
});

describe('addedDifficulty', () => {
	it('adds the difficulty of each effect added, an effect held twice counting twice (CRB p. 215)', () => {
		const effects = [...CURSE_EFFECTS, { ...RANGE, id: 'range-1' }, { ...RANGE, id: 'range-2' }];
		expect(addedDifficulty(effects, { target: 1, 'range-1': 1, 'range-2': 1 })).toBe(4);
	});

	it('adds the difficulty of an effect once each time it is added (CRB p. 215)', () => {
		expect(addedDifficulty([...CURSE_EFFECTS, RANGE], { enervate: 1, range: 3 })).toBe(4);
	});

	it('adds nothing for an effect at a count of 0', () => {
		expect(addedDifficulty(CURSE_EFFECTS, { enervate: 0 })).toBe(0);
	});
});

describe('initialEffectCounts', () => {
	it('adds once each effect that starts checked', () => {
		expect(initialEffectCounts(AVERAGE, CURSE_EFFECTS)).toEqual({ enervate: 1 });
	});

	it('adds once an effect that can be added more than once and starts checked', () => {
		expect(initialEffectCounts(AVERAGE, [{ ...RANGE, startsChecked: true }])).toEqual({ range: 1 });
	});

	it('leaves out an effect starting checked that would take the difficulty beyond Formidable (CRB p. 215)', () => {
		const effects = [
			{ id: 'a', difficulty: 2, startsChecked: true, repeatable: false },
			{ id: 'b', difficulty: 2, startsChecked: true, repeatable: false },
			{ id: 'c', difficulty: 1, startsChecked: true, repeatable: false },
		];
		expect(initialEffectCounts(AVERAGE, effects)).toEqual({ a: 1, c: 1 });
	});
});

describe('maxEffectCount', () => {
	it('lets an effect be added once up to Formidable (CRB p. 215)', () => {
		expect(maxEffectCount(AVERAGE, CURSE_EFFECTS, { enervate: 1 }, ADDITIONAL_TARGET)).toBe(1);
	});

	it('refuses an effect that would take the difficulty beyond Formidable (CRB p. 215)', () => {
		expect(maxEffectCount(3, CURSE_EFFECTS, { enervate: 1 }, ADDITIONAL_TARGET)).toBe(0);
	});

	it('keeps an effect added, so that it can always be taken off', () => {
		expect(maxEffectCount(5, CURSE_EFFECTS, { target: 1 }, ADDITIONAL_TARGET)).toBe(1);
	});

	it('adds Range to an Easy spell four times, up to Formidable, and no further (CRB p. 215)', () => {
		expect(maxEffectCount(EASY, [RANGE], {}, RANGE)).toBe(4);
		expect(maxEffectCount(EASY, [RANGE], { range: 4 }, RANGE)).toBe(4);
		expect(castingDifficulty(EASY, [RANGE], { range: 4 })).toBe(5);
	});

	it('shrinks the count of Range by what another effect adds, and gives it back once that effect is taken off', () => {
		const effects = [RANGE, ADDITIONAL_TARGET];
		expect(maxEffectCount(EASY, effects, { range: 1, target: 1 }, RANGE)).toBe(2);
		expect(maxEffectCount(EASY, effects, { range: 1 }, RANGE)).toBe(4);
	});

	it('leaves the room another effect needs as Range is lowered', () => {
		const effects = [RANGE, ADDITIONAL_TARGET];
		expect(maxEffectCount(EASY, effects, { range: 3 }, ADDITIONAL_TARGET)).toBe(0);
		expect(maxEffectCount(EASY, effects, { range: 2 }, ADDITIONAL_TARGET)).toBe(1);
	});

	it('adds an effect with no room left under Formidable not even once, from a spell edited past it', () => {
		expect(maxEffectCount(6, [RANGE], {}, RANGE)).toBe(0);
	});
});

describe('difficultyAddedBy', () => {
	it('adds the effect’s difficulty from a level it fits under Formidable (CRB p. 215)', () => {
		expect(difficultyAddedBy(AVERAGE, ADDITIONAL_TARGET)).toBe(2);
	});

	it('adds only what reaches Formidable, so that unchecking gives back as much (CRB p. 215)', () => {
		expect(difficultyAddedBy(4, ADDITIONAL_TARGET)).toBe(1);
	});

	it('adds nothing from Formidable, as a check never makes the task Impossible: checking then unchecking leaves it Formidable (CRB p. 215)', () => {
		const formidable = 5;
		const added = difficultyAddedBy(formidable, ADDITIONAL_TARGET);
		expect(formidable + added).toBe(5);
		expect(formidable + added - added).toBe(5);
	});

	it('adds nothing from a level beyond Formidable', () => {
		expect(difficultyAddedBy(6, ADDITIONAL_TARGET)).toBe(0);
	});
});

describe('castingDifficulty', () => {
	it('raises the spell’s difficulty by its effects added: Curse with Enervate is Hard (CRB p. 217)', () => {
		expect(castingDifficulty(AVERAGE, CURSE_EFFECTS, { enervate: 1 })).toBe(3);
	});

	it('is Formidable with Additional Target added too', () => {
		expect(castingDifficulty(AVERAGE, CURSE_EFFECTS, { enervate: 1, target: 1 })).toBe(5);
	});

	it('never goes beyond Formidable, even for a spell edited past it (CRB p. 215)', () => {
		expect(castingDifficulty(4, CURSE_EFFECTS, { enervate: 1, target: 1 })).toBe(5);
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
		{ id: 'blast', name: 'Blast', description: '', qualities: [quality('Blast', 'skillRanks')] },
		{ id: 'impact', name: 'Impact', description: '<p>Knocks the target down.</p>', qualities: [quality('Knockdown', 'unrated')] },
		{ id: 'fire', name: 'Fire', description: '', qualities: [quality('Burn', 'fixed', 2)] },
		{ id: 'range', name: 'Range', description: '', qualities: [] },
	];

	it('lists the effects added in the spell’s order, with the 2 strain casting costs (CRB p. 210)', () => {
		expect(spellCast(effects, { fire: 1, impact: 1, blast: 0 }, () => 0)).toEqual({
			effects: [
				{
					name: 'Impact',
					description: '<p>Knocks the target down.</p>',
					count: 1,
					qualities: [{ name: 'Knockdown', description: '<p>Knockdown</p>', isRated: false, rating: 0 }],
				},
				{
					name: 'Fire',
					description: '',
					count: 1,
					qualities: [{ name: 'Burn', description: '<p>Burn</p>', isRated: true, rating: 2 }],
				},
			],
			strain: 2,
		});
	});

	it('lists an effect added four times once, with its count', () => {
		expect(spellCast(effects, { range: 4 }, () => 0).effects).toEqual([{ name: 'Range', description: '', count: 4, qualities: [] }]);
	});

	it('lists the qualities of an effect added more than once once', () => {
		expect(spellCast(effects, { fire: 2 }, () => 0).effects[0].qualities).toHaveLength(1);
	});

	it("rates a quality by the caster's ranks in Knowledge, as Table III.2–5 does (CRB p. 215)", () => {
		const ranks: Record<string, number> = { Knowledge: 3 };
		expect(spellCast(effects, { blast: 1 }, (name) => ranks[name] ?? 0).effects[0].qualities[0]).toMatchObject({
			name: 'Blast',
			isRated: true,
			rating: 3,
		});
	});
});

describe('spellAttackProfile', () => {
	const effect = (id: string, changes: Partial<ContainedAdditionalEffect> = {}): ContainedAdditionalEffect => ({
		id,
		name: id,
		description: '',
		difficulty: 1,
		startsChecked: false,
		repeatable: false,
		qualities: [],
		critical: null,
		doublesDamageCharacteristic: false,
		...changes,
	});
	const attackSpell = (baseDamage: number, ...additionalEffects: ContainedAdditionalEffect[]) => ({
		name: 'Fireball',
		system: { baseDamage, additionalEffects },
	});
	const characteristics = { brawn: 2, agility: 2, intellect: 3, cunning: 2, willpower: 2, presence: 2 };
	const empowered = effect('empowered', { doublesDamageCharacteristic: true });
	const deadly = effect('deadly', { critical: 2 });
	const profile = (spell: ReturnType<typeof attackSpell>, counts: Record<string, number>) =>
		spellAttackProfile(spell, counts, Characteristic.Intellect, () => 0);

	it("deals the skill's characteristic plus one per uncanceled Success, at short range (CRB p. 215)", () => {
		const fireball = profile(attackSpell(0), {});
		expect(attackDamage(fireball, characteristics, 2)).toBe(5);
		expect(fireball).toMatchObject({ attackName: 'Fireball', range: 'short', damageCharacteristic: 'intellect' });
	});

	it("adds an implement's damage bonus, and twice the characteristic with Empowered added (CRB pp. 215, 219)", () => {
		const spell = attackSpell(2, empowered);
		// Intellect 3, doubled, plus a +2 implement and a Success left.
		expect(attackDamage(profile(spell, { empowered: 1 }), characteristics, 1)).toBe(9);
		expect(attackDamage(profile(spell, { empowered: 0 }), characteristics, 1)).toBe(6);
	});

	it('has no Critical rating, so only a Triumph triggers a Critical Injury, unless Deadly gives it 2 (CRB p. 215)', () => {
		const spell = attackSpell(0, deadly);
		const triggers = (counts: Record<string, number>, netAdvantage: number, triumphs: number) =>
			criticalTriggers({ succeeded: true, netAdvantage, triumphs, critical: profile(spell, counts).critical });

		expect(triggers({}, 4, 0)).toBe(0);
		expect(triggers({}, 0, 1)).toBe(1);
		expect(triggers({ deadly: 1 }, 4, 0)).toBe(2);
	});

	it("gives the added effects' qualities, a rating counted from the caster's ranks in Knowledge (CRB p. 215)", () => {
		const fire = effect('fire', { qualities: [quality('Burn', 'skillRanks')] });
		const impact = effect('impact', { qualities: [quality('Knockdown', 'unrated')] });
		const ranks: Record<string, number> = { Knowledge: 2 };

		expect(
			spellAttackProfile(attackSpell(0, fire, impact), { fire: 1 }, Characteristic.Intellect, (name) => ranks[name] ?? 0).qualities,
		).toEqual([{ id: '', name: 'Burn', description: '<p>Burn</p>', activation: 'active', advantageCost: 2, isRated: true, rating: 2 }]);
	});

	it('gives the qualities of an effect added more than once once', () => {
		const fire = effect('fire', { repeatable: true, qualities: [quality('Burn', 'fixed', 2)] });
		expect(profile(attackSpell(0, fire), { fire: 3 }).qualities).toHaveLength(1);
	});
});
