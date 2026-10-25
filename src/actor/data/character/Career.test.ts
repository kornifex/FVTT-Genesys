/**
 * @file Tests for which skills a Career makes Career skills, and the Free Ranks it gives them.
 */

import { describe, expect, it } from 'vitest';
import { careerSkillUpdates, isCareerSkill, toggledFreeRankChoice } from '@/actor/data/character/Career';

describe('isCareerSkill', () => {
	const careerSkills = [{ name: 'Athletics' }, { name: 'ranged (light)' }];

	it("matches the Career's skills whatever their case", () => {
		expect(isCareerSkill('Athletics', careerSkills)).toBe(true);
		expect(isCareerSkill('athletics', careerSkills)).toBe(true);
		expect(isCareerSkill('Ranged (Light)', careerSkills)).toBe(true);
	});

	it('does not match the other skills', () => {
		expect(isCareerSkill('Cool', careerSkills)).toBe(false);
		expect(isCareerSkill('Ranged', careerSkills)).toBe(false);
	});
});

describe('careerSkillUpdates', () => {
	const careerSkills = [{ name: 'Athletics' }, { name: 'brawl' }, { name: 'Cool' }];
	const held = [
		{ id: 'athletics', name: 'Athletics', type: 'skill', system: { rank: 1 } },
		{ id: 'brawl', name: 'Brawl', type: 'skill', system: { rank: 0 } },
		{ id: 'stealth', name: 'Stealth', type: 'skill', system: { rank: 2 } },
		{ id: 'cool', name: 'Cool', type: 'talent', system: { rank: 1 } },
	];

	it('marks the held skills the Career lists, and gives a Free Rank to the chosen ones', () => {
		expect(careerSkillUpdates(held, careerSkills, ['brawl'], 1)).toEqual([
			{ skill: held[0], update: { 'system.career': true, 'system.rank': 1 } },
			{ skill: held[1], update: { 'system.career': true, 'system.rank': 1 } },
		]);
	});

	it('unmarks them, and takes back the Free Ranks given', () => {
		const ranked = [{ ...held[0], system: { rank: 2 } }, held[1]];
		expect(careerSkillUpdates(ranked, careerSkills, ['athletics'], -1)).toEqual([
			{ skill: ranked[0], update: { 'system.career': false, 'system.rank': 1 } },
			{ skill: ranked[1], update: { 'system.career': false, 'system.rank': 0 } },
		]);
	});
});

describe('toggledFreeRankChoice', () => {
	it('adds a skill to the choice while Free Ranks are left, and removes a chosen one', () => {
		expect(toggledFreeRankChoice([], 'cool', 2)).toEqual(['cool']);
		expect(toggledFreeRankChoice(['cool'], 'brawl', 2)).toEqual(['cool', 'brawl']);
		expect(toggledFreeRankChoice(['cool', 'brawl'], 'cool', 2)).toEqual(['brawl']);
	});

	it('chooses each skill once, and no more skills than Free Ranks', () => {
		expect(toggledFreeRankChoice(['cool', 'brawl'], 'stealth', 2)).toEqual(['cool', 'brawl']);
		expect(toggledFreeRankChoice([], 'cool', 0)).toEqual([]);
	});
});
