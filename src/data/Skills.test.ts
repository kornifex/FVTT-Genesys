/**
 * @file Tests for how skill names match, which skill an actor rolls, Free Ranks and how a character's skills are listed.
 */

import { describe, expect, it } from 'vitest';
import { freeRank, ownedSkill, promptSkills, skillNamesMatch, skillsByCategory, skillToRoll, weaponSkillName } from '@/data/Skills';

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

	it("rolls the Skills Compendium's skill as an Unranked Skill Check when the actor doesn't own it", () => {
		expect(skillToRoll([skill('Cool', 1)], compendium, 'resilience')).toEqual({ skill: compendium[3], unranked: true });
	});

	it('rolls nothing when neither the actor nor the Skills Compendium has the skill', () => {
		expect(skillToRoll([skill('Cool', 1)], compendium, 'Piloting')).toBeUndefined();
	});
});

describe('weaponSkillName', () => {
	it('picks the listed skill the actor owns with the highest rank', () => {
		expect(weaponSkillName([skill('Brawl', 1), skill('melee', 3)], ['Brawl', 'Melee'])).toBe('melee');
	});

	it("breaks rank ties by the weapon's order, not the actor's", () => {
		expect(weaponSkillName([skill('Melee', 2), skill('Brawl', 2)], ['Brawl', 'Melee'])).toBe('Brawl');
	});

	it('picks the first listed skill when the actor owns none', () => {
		expect(weaponSkillName([skill('Cool', 2)], ['Brawl', 'Melee'])).toBe('Brawl');
	});

	it('picks nothing when the weapon lists no skill', () => {
		expect(weaponSkillName([skill('Cool', 2)], [])).toBeUndefined();
	});
});

describe('promptSkills', () => {
	it("offers a character's skills, then the Skills Compendium's others as unranked", () => {
		const owned = [skill('Ranged (light)', 1), skill('Athletics', 2)];
		expect(promptSkills(owned, compendium)).toEqual({ owned: [owned[1], owned[0]], unranked: [compendium[1], compendium[3]] });
	});

	it("offers an adversary's few skills, then every other skill of the Skills Compendium as unranked", () => {
		const owned = [skill('Cool', 2)];
		expect(promptSkills(owned, compendium)).toEqual({ owned, unranked: [compendium[0], compendium[2], compendium[3]] });
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
	function categorized(name: string, category: 'general' | 'magic' | 'combat' | 'social' | 'knowledge') {
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

		expect(names(skillsByCategory(skills))).toEqual([
			['general', ['Cool']],
			['magic', ['Arcana']],
			['combat', ['Melee']],
			['social', ['Charm']],
			['knowledge', ['Lore']],
		]);
	});

	it('leaves out the categories with no skill', () => {
		expect(names(skillsByCategory([categorized('Melee', 'combat'), categorized('Cool', 'general')]))).toEqual([
			['general', ['Cool']],
			['combat', ['Melee']],
		]);
		expect(skillsByCategory([])).toEqual([]);
	});

	it('sorts each category by name, an accented first letter with its unaccented one', () => {
		const skills = [categorized('Vigilance', 'general'), categorized('Équitation', 'general'), categorized('Discrétion', 'general')];

		expect(names(skillsByCategory(skills))).toEqual([['general', ['Discrétion', 'Équitation', 'Vigilance']]]);
	});

	it('sorts names whatever their case', () => {
		const skills = [categorized('Brawl', 'combat'), categorized('athletics', 'combat'), categorized('Cool', 'combat')];

		expect(names(skillsByCategory(skills))).toEqual([['combat', ['athletics', 'Brawl', 'Cool']]]);
	});

	it('keeps names differing only by case next to each other', () => {
		const skills = [categorized('Discipline', 'general'), categorized('Cool', 'general'), categorized('cool', 'general')];

		expect(names(skillsByCategory(skills))).toEqual([['general', ['cool', 'Cool', 'Discipline']]]);
	});

	it('keeps the skills it is given', () => {
		const cool = categorized('Cool', 'general');

		expect(skillsByCategory([cool])[0].skills[0]).toBe(cool);
	});
});
