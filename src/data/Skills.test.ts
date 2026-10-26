/**
 * @file Tests for how skill names match, which skill an actor rolls, Free Ranks, how a character's skills are listed, and the
 * skills of the Core Rulebook's Skills Compendium.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
	attackSkillChoices,
	attackSkillName,
	freeRank,
	ownedSkill,
	promptSkills,
	SkillCategory,
	skillNamesMatch,
	skillsByCategory,
	skillToRoll,
} from '@/data/Skills';

function skill(name: string, rank = 0) {
	return { name, system: { rank } };
}

const compendium = [skill('Athletics'), skill('Cool'), skill('Ranged (Light)'), skill('Resilience')];

describe('skillNamesMatch', () => {
	it('matches names whatever their case', () => {
		expect(skillNamesMatch('Ranged (Light)', 'ranged (light)')).toBe(true);
		expect(skillNamesMatch('COOL', 'Cool')).toBe(true);
	});

	it('does not match other names', () => {
		expect(skillNamesMatch('Ranged (Light)', 'Ranged (Heavy)')).toBe(false);
		expect(skillNamesMatch('Ranged', 'Ranged (Light)')).toBe(false);
	});
});

describe('ownedSkill', () => {
	it('finds the owned skill whatever the case of its name', () => {
		const ranged = skill('Ranged (light)', 2);
		expect(ownedSkill([skill('Cool', 1), ranged], 'Ranged (Light)')).toBe(ranged);
	});

	it('picks the highest rank among skills that only differ by case, then the first in item order', () => {
		const lower = skill('melee', 1);
		const upper = skill('Melee', 3);
		const tie = skill('MELEE', 3);
		expect(ownedSkill([lower, upper, tie], 'Melee')).toBe(upper);
		expect(ownedSkill([skill('melee', 0), lower], 'Melee')?.system.rank).toBe(1);
	});

	it('finds nothing the actor does not own', () => {
		expect(ownedSkill([skill('Cool', 1)], 'Athletics')).toBeUndefined();
	});
});

describe('skillToRoll', () => {
	it('rolls the owned skill', () => {
		const ranged = skill('Ranged (light)', 2);
		expect(skillToRoll([ranged], compendium, 'Ranged (Light)')).toEqual({ skill: ranged, unranked: false });
	});

	it("rolls the Skills Compendium's skill as an Unranked Skill Check when the actor doesn't own it (CRB p. 19)", () => {
		expect(skillToRoll([skill('Cool', 1)], compendium, 'resilience')).toEqual({ skill: compendium[3], unranked: true });
	});

	it('rolls nothing when neither the actor nor the Skills Compendium has the skill', () => {
		expect(skillToRoll([skill('Cool', 1)], compendium, 'Piloting')).toBeUndefined();
	});
});

describe('attackSkillName', () => {
	it('picks the listed skill the actor owns with the highest rank', () => {
		expect(attackSkillName([skill('Brawl', 1), skill('melee', 3)], { skills: ['Brawl', 'Melee'] })).toBe('melee');
	});

	it("breaks rank ties by the weapon's order, not the actor's", () => {
		expect(attackSkillName([skill('Melee', 2), skill('Brawl', 2)], { skills: ['Brawl', 'Melee'] })).toBe('Brawl');
	});

	it('picks the first listed skill when the actor owns none', () => {
		expect(attackSkillName([skill('Cool', 2)], { skills: ['Brawl', 'Melee'] })).toBe('Brawl');
	});

	it('picks nothing when the weapon lists no skill', () => {
		expect(attackSkillName([skill('Cool', 2)], { skills: [] })).toBeUndefined();
	});

	it('picks the chosen skill over a higher ranked one', () => {
		expect(attackSkillName([skill('Brawl', 1), skill('Melee', 3)], { skills: ['Brawl', 'Melee'], attackSkill: 'Brawl' })).toBe('Brawl');
	});

	it('ignores a chosen skill the weapon no longer lists', () => {
		expect(attackSkillName([skill('Brawl', 1), skill('Melee', 3)], { skills: ['Brawl', 'Melee'], attackSkill: 'Ranged' })).toBe(
			'Melee',
		);
	});

	it('matches the chosen skill to the listed and owned ones whatever their case', () => {
		expect(attackSkillName([skill('brawl', 1), skill('Melee', 3)], { skills: ['Brawl', 'Melee'], attackSkill: 'BRAWL' })).toBe('brawl');
	});

	it('picks a chosen skill the actor does not own, as an Unranked Skill Check', () => {
		expect(attackSkillName([skill('Melee', 3)], { skills: ['Brawl', 'Melee'], attackSkill: 'Brawl' })).toBe('Brawl');
	});
});

describe('attackSkillChoices', () => {
	it("offers each skill the weapon lists once, whatever its case, in the weapon's order", () => {
		expect(attackSkillChoices(['Melee', 'Brawl', 'melee', 'Brawl'])).toEqual(['Melee', 'Brawl']);
	});
});

describe('promptSkills', () => {
	it("offers a character's skills, then the Skills Compendium's others as unranked", () => {
		const owned = [skill('Ranged (light)', 1), skill('Athletics', 2)];
		expect(promptSkills(owned, compendium)).toEqual({
			weapon: [],
			owned: [owned[1], owned[0]],
			unranked: [compendium[1], compendium[3]],
		});
	});

	it("offers an adversary's few skills, then every other skill of the Skills Compendium as unranked", () => {
		const owned = [skill('Cool', 2)];
		expect(promptSkills(owned, compendium)).toEqual({ weapon: [], owned, unranked: [compendium[0], compendium[2], compendium[3]] });
	});

	it("offers a weapon's skills first, owned or not, in the weapon's order and only there", () => {
		const owned = [skill('Ranged (light)', 1), skill('Athletics', 2), skill('Cool', 1)];
		expect(promptSkills(owned, compendium, ['Resilience', 'Ranged (Light)'])).toEqual({
			weapon: [compendium[3], owned[0]],
			owned: [owned[1], owned[2]],
			unranked: [],
		});
	});
});

describe('freeRank', () => {
	it('raises the rank by one', () => {
		expect(freeRank(0, 1)).toBe(1);
		expect(freeRank(2, 1)).toBe(3);
	});

	it('lowers the rank by one', () => {
		expect(freeRank(2, -1)).toBe(1);
	});

	it('never lowers the rank below 0', () => {
		expect(freeRank(0, -1)).toBe(0);
	});
});

describe('skillsByCategory', () => {
	function categorized(name: string, category: SkillCategory) {
		return { name, system: { category } };
	}

	function names(categories: ReturnType<typeof skillsByCategory>) {
		return categories.map(({ category, skills }) => [category, skills.map((skill) => skill.name)]);
	}

	it('groups the skills by category, in the order general, magic, combat, social, knowledge', () => {
		const skills = [
			categorized('Lore', 'knowledge'),
			categorized('Melee', 'combat'),
			categorized('Charm', 'social'),
			categorized('Arcana', 'magic'),
			categorized('Cool', 'general'),
		];

		expect(names(skillsByCategory(skills, 'en'))).toEqual([
			['general', ['Cool']],
			['magic', ['Arcana']],
			['combat', ['Melee']],
			['social', ['Charm']],
			['knowledge', ['Lore']],
		]);
	});

	it('leaves out the categories with no skill', () => {
		expect(names(skillsByCategory([categorized('Melee', 'combat'), categorized('Cool', 'general')], 'en'))).toEqual([
			['general', ['Cool']],
			['combat', ['Melee']],
		]);
		expect(skillsByCategory([], 'en')).toEqual([]);
	});

	it('sorts each category by name, an accented first letter with its unaccented one', () => {
		const skills = [categorized('Vigilance', 'general'), categorized('Équitation', 'general'), categorized('Discrétion', 'general')];

		expect(names(skillsByCategory(skills, 'en'))).toEqual([['general', ['Discrétion', 'Équitation', 'Vigilance']]]);
	});

	it('sorts names whatever their case', () => {
		const skills = [categorized('Brawl', 'combat'), categorized('athletics', 'combat'), categorized('Cool', 'combat')];

		expect(names(skillsByCategory(skills, 'en'))).toEqual([['combat', ['athletics', 'Brawl', 'Cool']]]);
	});

	it('keeps names differing only by case next to each other', () => {
		const skills = [categorized('Discipline', 'general'), categorized('Cool', 'general'), categorized('cool', 'general')];

		expect(names(skillsByCategory(skills, 'en'))).toEqual([['general', ['cool', 'Cool', 'Discipline']]]);
	});

	it('keeps the skills it is given', () => {
		const cool = categorized('Cool', 'general');

		expect(skillsByCategory([cool], 'en')[0].skills[0]).toBe(cool);
	});
});

describe("the Core Rulebook's Skills Compendium, crb-skills", () => {
	const crbSkills = readFileSync(path.resolve(__dirname, '../../public/packs/crb-skills.db'), 'utf8')
		.split('\n')
		.filter((line) => line.trim() !== '')
		.map(
			(line) =>
				JSON.parse(line) as {
					name: string;
					type: string;
					system: { characteristic: string; category: string; source: string; initiative?: boolean };
				},
		);

	// Table I.3–1 (CRB p. 53), with each skill's characteristic and category from its description (p. 54-70).
	const skillTable: [name: string, characteristic: string, category: SkillCategory, page: number][] = [
		['Charm', 'presence', 'social', 54],
		['Coercion', 'willpower', 'social', 55],
		['Deception', 'cunning', 'social', 56],
		['Leadership', 'presence', 'social', 56],
		['Negotiation', 'presence', 'social', 56],
		['Alchemy', 'intellect', 'general', 57],
		['Astrocartography', 'intellect', 'general', 57],
		['Athletics', 'brawn', 'general', 58],
		['Computers', 'intellect', 'general', 58],
		['Cool', 'presence', 'general', 59],
		['Coordination', 'agility', 'general', 59],
		['Discipline', 'willpower', 'general', 60],
		['Driving', 'agility', 'general', 60],
		['Mechanics', 'intellect', 'general', 60],
		['Medicine', 'intellect', 'general', 61],
		['Operating', 'intellect', 'general', 62],
		['Perception', 'cunning', 'general', 62],
		['Piloting', 'agility', 'general', 62],
		['Resilience', 'brawn', 'general', 63],
		['Riding', 'agility', 'general', 63],
		['Skulduggery', 'cunning', 'general', 64],
		['Stealth', 'agility', 'general', 64],
		['Streetwise', 'cunning', 'general', 65],
		['Survival', 'cunning', 'general', 65],
		['Vigilance', 'willpower', 'general', 65],
		['Knowledge', 'intellect', 'knowledge', 66],
		['Brawl', 'brawn', 'combat', 67],
		['Melee', 'brawn', 'combat', 67],
		['Melee (Light)', 'brawn', 'combat', 68],
		['Melee (Heavy)', 'brawn', 'combat', 68],
		['Ranged', 'agility', 'combat', 68],
		['Ranged (Light)', 'agility', 'combat', 68],
		['Ranged (Heavy)', 'agility', 'combat', 69],
		['Gunnery', 'agility', 'combat', 69],
		['Arcana', 'intellect', 'magic', 70],
		['Divine', 'willpower', 'magic', 70],
		['Primal', 'cunning', 'magic', 70],
	];

	it('holds the 37 skills of Table I.3–1, and only skills (CRB p. 53)', () => {
		expect(crbSkills.map((item) => item.name).sort()).toEqual(skillTable.map(([name]) => name).sort());
		expect(crbSkills.every((item) => item.type === 'skill')).toBe(true);
	});

	it.each(skillTable)('links %s to %s, in the %s skills, described on page %i (CRB p. 52-70)', (name, characteristic, category, page) => {
		const skill = crbSkills.find((item) => item.name === name)!;

		expect(skill.system).toMatchObject({ characteristic, category, source: `Core Rulebook, p.${page}` });
	});

	it('flags Cool and Vigilance, and only them, as Initiative Skills (CRB p. 54, 95)', () => {
		expect(
			crbSkills
				.filter((item) => item.system.initiative)
				.map((item) => item.name)
				.sort(),
		).toEqual(['Cool', 'Vigilance']);
	});
});
