import { describe, expect, it } from 'vitest';
import { additionalEffectCopy, type AdditionalEffectData, withAction, withSpellQualityAdded } from '@/item/data/Spells';

describe('withAction', () => {
	// Table III.2–2 and each action's section (CRB pp. 214–218): its difficulty in Difficulty dice, whether it is an
	// attack, and the magic skills that may perform it.
	it.each([
		['attack', 'p. 215', 1, true, ['Arcana', 'Divine', 'Primal']],
		['augment', 'p. 215', 2, false, ['Divine', 'Primal']],
		['barrier', 'p. 216', 1, false, ['Arcana', 'Divine']],
		['conjure', 'p. 216', 1, false, ['Arcana', 'Primal']],
		['curse', 'p. 217', 2, false, ['Arcana', 'Divine']],
		['dispel', 'p. 217', 3, false, ['Arcana']],
		['heal', 'p. 217', 1, false, ['Divine', 'Primal']],
		['utility', 'p. 214', 1, false, ['Arcana', 'Divine', 'Primal']],
	] as const)(
		'fills a spell picking %s with its difficulty, attack flag and skills (CRB %s)',
		(action, _page, difficulty, isAttack, skills) => {
			expect(withAction(action)).toEqual({ action, difficulty, isAttack, skills });
		},
	);

	it('changes only the action of a spell picking Custom, leaving what the table wrote', () => {
		expect(withAction('custom')).toEqual({ action: 'custom' });
	});

	it("gives each spell its own list of skills, which editing one spell's doesn't change on another", () => {
		const first = withAction('attack');
		first.skills?.push('Alchemy');
		expect(withAction('attack').skills).toEqual(['Arcana', 'Divine', 'Primal']);
	});
});

const BLAST = { description: '<p>Blast</p>', activation: 'active', advantageCost: 2, isRated: true } as const;
const KNOCKDOWN = { description: '<p>Knockdown</p>', activation: 'active', advantageCost: 2, isRated: false } as const;

describe('withSpellQualityAdded', () => {
	it("rates a rated quality by the caster's ranks in Knowledge, as most of Table III.2–5 does (CRB p. 215)", () => {
		expect(withSpellQualityAdded([], { name: 'Blast', system: BLAST })).toEqual([
			{
				name: 'Blast',
				description: '<p>Blast</p>',
				activation: 'active',
				advantageCost: 2,
				ratingSource: 'skillRanks',
				rating: 1,
				ratingSkill: 'Knowledge',
			},
		]);
	});

	it('leaves an unrated quality without a rating, as Impact gives Knockdown (CRB p. 215)', () => {
		expect(withSpellQualityAdded([], { name: 'Knockdown', system: KNOCKDOWN })).toMatchObject([
			{ name: 'Knockdown', ratingSource: 'unrated' },
		]);
	});

	it('adds a quality after those the effect gives', () => {
		const qualities = withSpellQualityAdded([], { name: 'Knockdown', system: KNOCKDOWN }) ?? [];
		expect(withSpellQualityAdded(qualities, { name: 'Disorient', system: BLAST })?.map((quality) => quality.name)).toEqual([
			'Knockdown',
			'Disorient',
		]);
	});

	it('changes nothing when the effect already gives a quality of that name, whatever its case', () => {
		const qualities = withSpellQualityAdded([], { name: 'Blast', system: BLAST }) ?? [];
		expect(withSpellQualityAdded(qualities, { name: 'blast', system: BLAST })).toBeUndefined();
	});
});

describe('additionalEffectCopy', () => {
	const deadly: AdditionalEffectData = {
		description: '<p>Deadly</p>',
		difficulty: 1,
		startsChecked: false,
		qualities: withSpellQualityAdded([], { name: 'Vicious', system: BLAST }) ?? [],
		critical: 2,
		doublesDamageCharacteristic: false,
	};

	it('copies the whole effect under the id given: Deadly gives a Critical rating of 2 and Vicious (CRB p. 215)', () => {
		expect(additionalEffectCopy('copy1', { name: 'Deadly', system: deadly })).toEqual({ id: 'copy1', name: 'Deadly', ...deadly });
	});

	it("copies the effect's qualities, which changing on the copy leaves the item's as they were", () => {
		const copy = additionalEffectCopy('copy1', { name: 'Deadly', system: deadly });
		copy.qualities[0].ratingSkill = 'Knowledge (Lore)';
		expect(deadly.qualities[0].ratingSkill).toBe('Knowledge');
	});
});
