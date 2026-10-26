import { describe, expect, it } from 'vitest';
import { chosenInitiativeSkill, InitiativeSkill, initiativeSkillToRoll, nextInitiativeSkill } from '@/combat/InitiativeSkills';
import { Characteristic } from '@/data/Characteristics';

const COOL: InitiativeSkill = { skillName: 'Cool', skillChar: Characteristic.Presence };
const VIGILANCE: InitiativeSkill = { skillName: 'Vigilance', skillChar: Characteristic.Willpower };

describe('initiativeSkillToRoll', () => {
	it('defaults to Vigilance, whatever the order of the Initiative Skills (CRB p. 95)', () => {
		expect(initiativeSkillToRoll([COOL, VIGILANCE], undefined)).toBe(VIGILANCE);
		expect(initiativeSkillToRoll([VIGILANCE, COOL], undefined)).toBe(VIGILANCE);
	});

	it('finds Vigilance whatever its case', () => {
		const vigilance = { ...VIGILANCE, skillName: 'VIGILANCE' };

		expect(initiativeSkillToRoll([COOL, vigilance], undefined)).toBe(vigilance);
	});

	it('defaults to the first Initiative Skill when none is Vigilance', () => {
		const vigilanceRenamed = { ...VIGILANCE, skillName: 'Vigilance (Garde)' };

		expect(initiativeSkillToRoll([COOL, vigilanceRenamed], undefined)).toBe(COOL);
	});

	it('rolls the chosen Initiative Skill, whatever its case', () => {
		expect(initiativeSkillToRoll([COOL, VIGILANCE], 'cool')).toBe(COOL);
	});

	it('defaults to Vigilance when the chosen skill is no longer an Initiative Skill', () => {
		expect(initiativeSkillToRoll([COOL, VIGILANCE], 'Discipline')).toBe(VIGILANCE);
	});

	it('rolls the only Initiative Skill, like the Brawn check a compendium without any gives', () => {
		const brawn = { skillName: 'Brawn', skillChar: Characteristic.Brawn };

		expect(initiativeSkillToRoll([brawn], undefined)).toBe(brawn);
	});
});

describe('chosenInitiativeSkill', () => {
	it('is the chosen Initiative Skill, whatever its case', () => {
		expect(chosenInitiativeSkill([COOL, VIGILANCE], 'COOL')).toBe(COOL);
	});

	it('is undefined when none is chosen, or the chosen skill is no longer an Initiative Skill', () => {
		expect(chosenInitiativeSkill([COOL, VIGILANCE], undefined)).toBeUndefined();
		expect(chosenInitiativeSkill([COOL, VIGILANCE], '')).toBeUndefined();
		expect(chosenInitiativeSkill([COOL, VIGILANCE], 'Discipline')).toBeUndefined();
	});
});

describe('nextInitiativeSkill', () => {
	const DISCIPLINE: InitiativeSkill = { skillName: 'Discipline', skillChar: Characteristic.Willpower };

	it('switches from the default Vigilance to the next Initiative Skill', () => {
		expect(nextInitiativeSkill([COOL, VIGILANCE, DISCIPLINE], undefined)).toBe(DISCIPLINE);
	});

	it('switches from the chosen Initiative Skill to the next, back to the first after the last', () => {
		expect(nextInitiativeSkill([COOL, VIGILANCE, DISCIPLINE], 'Cool')).toBe(VIGILANCE);
		expect(nextInitiativeSkill([COOL, VIGILANCE, DISCIPLINE], 'Discipline')).toBe(COOL);
	});

	it('has none to switch to with a single Initiative Skill', () => {
		expect(nextInitiativeSkill([COOL], undefined)).toBeUndefined();
	});
});
