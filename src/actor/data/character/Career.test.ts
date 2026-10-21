/**
 * @file Tests for which skills a Career makes Career skills.
 */

import { describe, expect, it } from 'vitest';
import { isCareerSkill } from '@/actor/data/character/Career';

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
