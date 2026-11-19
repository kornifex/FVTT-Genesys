/**
 * @file Tests for the Career Skill changes: their keys, the skills an actor's effects make career skills, and those that
 * depend on a single item.
 */

import { describe, expect, it } from 'vitest';

import {
	careerSkillChangeKey,
	careerSkillGrants,
	careerSkillsOnlyThrough,
	decodeCareerSkillChangeKey,
	isCareerSkillFor,
} from '@/effects/CareerSkillChanges';

function effect(name: string, skillNames: string[], { itemId, isSuppressed = false }: { itemId?: string; isSuppressed?: boolean } = {}) {
	return {
		name,
		isSuppressed,
		system: { changes: skillNames.map((skillName) => ({ key: careerSkillChangeKey(skillName) })) },
		originItem: itemId ? { id: itemId } : undefined,
	};
}

describe('the key of a Career Skill change', () => {
	it('names its skill, and reads it back', () => {
		expect(careerSkillChangeKey('Knowledge (Lore)')).toBe('genesys.careerSkill.Knowledge (Lore)');
		expect(decodeCareerSkillChangeKey('genesys.careerSkill.Knowledge (Lore)')).toBe('Knowledge (Lore)');
	});

	it('reads the key without a skill as a change whose skill is not picked yet', () => {
		expect(decodeCareerSkillChangeKey('genesys.careerSkill')).toBe('');
	});

	it('reads no other key as a Career Skill change', () => {
		for (const key of ['genesys.careerSkills.Verse', 'genesys.pool.skill.self.Verse', 'system.career']) {
			expect(decodeCareerSkillChangeKey(key)).toBeUndefined();
		}
	});
});

describe('careerSkillGrants', () => {
	it('lists each skill an effect makes a career skill, with the effect (RoT p. 87)', () => {
		const bard = effect('Bard', ['Knowledge (Lore)', 'Verse'], { itemId: 'bard' });

		expect(careerSkillGrants([bard])).toEqual([
			{ skillName: 'Knowledge (Lore)', effect: bard },
			{ skillName: 'Verse', effect: bard },
		]);
	});

	it('leaves out a suppressed effect, a disabled one among them', () => {
		expect(careerSkillGrants([effect('Templar', ['Divine'], { isSuppressed: true })])).toEqual([]);
	});

	it('leaves out a change whose skill is not picked, and the changes of other keys', () => {
		const mixed = {
			...effect('Mixed', []),
			system: { changes: [{ key: 'genesys.careerSkill' }, { key: 'system.soak' }, { key: undefined }] },
		};
		expect(careerSkillGrants([mixed])).toEqual([]);
	});
});

describe('isCareerSkillFor', () => {
	const grants = careerSkillGrants([effect('Runic Lore', ['runes'], { itemId: 'runic-lore' })]);

	it('makes a skill an effect names a career skill, whatever the case of its name (RoT p. 89)', () => {
		expect(isCareerSkillFor({ name: 'Runes', career: false }, grants)).toBe(true);
	});

	it('keeps a skill marked by the Career or by hand a career skill', () => {
		expect(isCareerSkillFor({ name: 'Cool', career: true }, grants)).toBe(true);
	});

	it('leaves any other skill a non-career skill', () => {
		expect(isCareerSkillFor({ name: 'Verse', career: false }, grants)).toBe(false);
	});
});

describe('careerSkillsOnlyThrough', () => {
	const skills = [
		{ id: 'lore', name: 'Knowledge (Lore)', career: false },
		{ id: 'verse', name: 'Verse', career: false },
		{ id: 'runes', name: 'Runes', career: true },
		{ id: 'cool', name: 'Cool', career: false },
	];
	const grants = careerSkillGrants([
		effect('Bard', ['Knowledge (Lore)', 'Verse'], { itemId: 'bard' }),
		effect('Runic Lore', ['Knowledge (Lore)', 'Runes'], { itemId: 'runic-lore' }),
	]);

	it('lists the skills no other item nor a mark makes career skills', () => {
		expect(careerSkillsOnlyThrough('bard', skills, grants)).toEqual(['verse']);
	});

	it('leaves out a skill marked as a career skill', () => {
		expect(careerSkillsOnlyThrough('runic-lore', skills, grants)).toEqual([]);
	});

	it('lists none for an item whose effects make no skill a career skill', () => {
		expect(careerSkillsOnlyThrough('grit', skills, grants)).toEqual([]);
	});

	it("counts an effect of the character's own, from no item, as another source", () => {
		const withBlessing = [...grants, ...careerSkillGrants([effect('Blessing', ['Verse'])])];

		expect(careerSkillsOnlyThrough('bard', skills, withBlessing)).toEqual([]);
	});
});
