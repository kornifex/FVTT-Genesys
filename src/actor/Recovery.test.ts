/**
 * @file Tests for Recovery: the Medicine check's difficulty, what a recovery check heals, a night's rest, and the skill
 * the end of an encounter's check opens with.
 */

import { describe, expect, it } from 'vitest';
import {
	canBePatient,
	healedPools,
	heals,
	isHealingSkill,
	medicineDifficulty,
	nightsRest,
	parseRecovery,
	patientChoices,
	recoveryCard,
	recoveryOf,
	strainRecoverySkill,
	strainRecoverySkillNames,
} from '@/actor/Recovery';

describe('medicineDifficulty', () => {
	const wounds = (value: number, max = 12) => ({ value, max });

	it('is Easy while the patient has suffered half their wound threshold or less (CRB p. 116, Table I.6–11)', () => {
		expect(medicineDifficulty(wounds(0), false)).toBe(1);
		expect(medicineDifficulty(wounds(6), false)).toBe(1);
	});

	it('is Average once the patient has suffered more than half their wound threshold (CRB p. 116, Table I.6–11)', () => {
		expect(medicineDifficulty(wounds(7), false)).toBe(2);
		expect(medicineDifficulty(wounds(12), false)).toBe(2);
	});

	it('counts half of an odd wound threshold as it is, without rounding (CRB p. 116, Table I.6–11)', () => {
		expect(medicineDifficulty(wounds(6, 13), false)).toBe(1);
		expect(medicineDifficulty(wounds(7, 13), false)).toBe(2);
	});

	it("is Hard once the patient's wounds exceed their wound threshold (CRB p. 116, Table I.6–11)", () => {
		expect(medicineDifficulty(wounds(13), false)).toBe(3);
		expect(medicineDifficulty(wounds(24), false)).toBe(3);
	});

	it('is two more when the healer heals themselves (CRB p. 116)', () => {
		expect(medicineDifficulty(wounds(0), true)).toBe(3);
		expect(medicineDifficulty(wounds(7), true)).toBe(4);
		expect(medicineDifficulty(wounds(13), true)).toBe(5);
	});
});

describe('recoveryOf', () => {
	const request = { patient: 'Actor.bo', rule: 'medicine' as const };

	it('heals a wound per Success and a strain per Advantage of a Medicine check (CRB p. 116)', () => {
		expect(recoveryOf(request, { netSuccess: 2, netAdvantage: 3 })).toEqual({ ...request, wounds: 2, strain: 3 });
	});

	it('heals no strain when Threat cancels the Advantage (CRB p. 116)', () => {
		expect(recoveryOf(request, { netSuccess: 1, netAdvantage: -2 })).toEqual({ ...request, wounds: 1, strain: 0 });
	});

	it('heals nothing when the Medicine check fails, whatever its Advantage (CRB p. 116)', () => {
		expect(recoveryOf(request, { netSuccess: 0, netAdvantage: 2 })).toEqual({ ...request, wounds: 0, strain: 0 });
		expect(recoveryOf(request, { netSuccess: -1, netAdvantage: 2 })).toEqual({ ...request, wounds: 0, strain: 0 });
	});

	const healSpell = { patient: 'Actor.bo', rule: 'healSpell' as const };

	it('heals a wound per Success and a strain per Advantage of a Heal spell (CRB p. 217)', () => {
		expect(recoveryOf(healSpell, { netSuccess: 3, netAdvantage: 2 })).toEqual({ ...healSpell, wounds: 3, strain: 2 });
		expect(recoveryOf(healSpell, { netSuccess: 1, netAdvantage: -1 })).toEqual({ ...healSpell, wounds: 1, strain: 0 });
	});

	it('heals nothing when the Heal spell fails, whatever its Advantage (CRB p. 217)', () => {
		expect(recoveryOf(healSpell, { netSuccess: 0, netAdvantage: 3 })).toEqual({ ...healSpell, wounds: 0, strain: 0 });
	});

	const endOfEncounter = { patient: 'Actor.bo', rule: 'endOfEncounter' as const };

	it("recovers a strain per Success of the end of an encounter's check, and no wound (CRB p. 117)", () => {
		expect(recoveryOf(endOfEncounter, { netSuccess: 3, netAdvantage: 2 })).toEqual({ ...endOfEncounter, wounds: 0, strain: 3 });
	});

	it("recovers no strain when the end of an encounter's check fails (CRB p. 117)", () => {
		expect(recoveryOf(endOfEncounter, { netSuccess: 0, netAdvantage: 2 })).toEqual({ ...endOfEncounter, wounds: 0, strain: 0 });
		expect(recoveryOf(endOfEncounter, { netSuccess: -2, netAdvantage: 0 })).toEqual({ ...endOfEncounter, wounds: 0, strain: 0 });
	});
});

describe('recoveryCard', () => {
	it("shows a Medicine check's wounds and strain healed", () => {
		expect(recoveryCard('medicine')).toEqual({ label: 'Genesys.Recovery.CardLabel', healsWounds: true });
	});

	it("shows the strain alone of the end of an encounter's check, which heals no wound (CRB p. 117)", () => {
		expect(recoveryCard('endOfEncounter')).toEqual({ label: 'Genesys.Recovery.EndOfEncounterCardLabel', healsWounds: false });
	});
});

describe('nightsRest', () => {
	const rested = (wounds: number, strain: number) => ({ wounds: { value: wounds, max: 12 }, strain: { value: strain, max: 10 } });

	it('recovers all strain and heals one wound (CRB pp. 116–117)', () => {
		expect(nightsRest(rested(5, 7))).toEqual({ wounds: 1, strain: 7 });
	});

	it('heals no wound at zero wounds (CRB p. 116)', () => {
		expect(nightsRest(rested(0, 4))).toEqual({ wounds: 0, strain: 4 });
	});

	it('leaves the character at zero wounds and strain at most, once applied (CRB pp. 116–117)', () => {
		expect(healedPools(rested(1, 7), nightsRest(rested(1, 7)))).toEqual({ wounds: 0, strain: 0 });
		expect(healedPools(rested(0, 0), nightsRest(rested(0, 0)))).toEqual({ wounds: 0, strain: 0 });
	});
});

describe('strainRecoverySkill', () => {
	// What the character rolls each skill with, as [characteristic, rank], by name.
	const pools = (skills: Record<string, [number, number]>) => (name: string) => {
		const pool = skills[name];
		return pool && { characteristic: pool[0], rank: pool[1] };
	};

	const SKILLS = ['Discipline', 'Cool'] as const;

	it('picks the skill of the larger dice pool between Discipline and Cool (CRB p. 117)', () => {
		expect(strainRecoverySkill(SKILLS, pools({ Discipline: [2, 1], Cool: [3, 1] }))).toBe('Cool');
		expect(strainRecoverySkill(SKILLS, pools({ Discipline: [3, 0], Cool: [2, 2] }))).toBe('Discipline');
	});

	it('picks the pool with more Proficiency dice when both hold as many dice', () => {
		expect(strainRecoverySkill(SKILLS, pools({ Discipline: [3, 1], Cool: [3, 2] }))).toBe('Cool');
	});

	it('picks Discipline, as the rule names it first, when both pools are alike', () => {
		expect(strainRecoverySkill(SKILLS, pools({ Discipline: [2, 1], Cool: [1, 2] }))).toBe('Discipline');
	});

	it('picks the one the character can roll, and Discipline when they can roll neither', () => {
		expect(strainRecoverySkill(SKILLS, pools({ Cool: [1, 0] }))).toBe('Cool');
		expect(strainRecoverySkill(SKILLS, pools({}))).toBe('Discipline');
	});

	it('answers nothing when no skill is marked', () => {
		expect(strainRecoverySkill([], pools({ Cool: [1, 0] }))).toBeUndefined();
	});

	it('picks among any number of skills the world marks, the first winning a tie', () => {
		const three = ['Discipline', 'Cool', 'Faith'];

		expect(strainRecoverySkill(three, pools({ Discipline: [2, 1], Cool: [2, 1], Faith: [3, 1] }))).toBe('Faith');
		expect(strainRecoverySkill(three, pools({ Discipline: [2, 1], Cool: [2, 1], Faith: [2, 1] }))).toBe('Discipline');
	});

	it('picks among skills of any name, the first winning a tie and answering when neither can be rolled', () => {
		const french = ['Discipline (fr)', 'Calme'] as const;

		expect(strainRecoverySkill(french, pools({ 'Discipline (fr)': [2, 1], Calme: [3, 1] }))).toBe('Calme');
		expect(strainRecoverySkill(french, pools({ 'Discipline (fr)': [2, 1], Calme: [1, 2] }))).toBe('Discipline (fr)');
		expect(strainRecoverySkill(french, pools({ Discipline: [3, 3], Cool: [3, 3] }))).toBe('Discipline (fr)');
	});
});

describe('heals', () => {
	it('is true when wounds or strain are healed', () => {
		expect(heals({ wounds: 1, strain: 0 })).toBe(true);
		expect(heals({ wounds: 0, strain: 1 })).toBe(true);
	});

	it('is false when nothing is healed', () => {
		expect(heals({ wounds: 0, strain: 0 })).toBe(false);
	});
});

describe('healedPools', () => {
	const patient = { wounds: { value: 5, max: 12 }, strain: { value: 3, max: 10 } };

	it("lowers the patient's wounds and strain by what the check heals (CRB p. 116)", () => {
		expect(healedPools(patient, { wounds: 2, strain: 1 })).toEqual({ wounds: 3, strain: 2 });
	});

	it('never lowers wounds or strain below zero', () => {
		expect(healedPools(patient, { wounds: 7, strain: 4 })).toEqual({ wounds: 0, strain: 0 });
	});

	it("never lowers the strain below zero when the end of an encounter's check recovers more than suffered (CRB p. 117)", () => {
		const healed = recoveryOf({ patient: 'Actor.bo', rule: 'endOfEncounter' }, { netSuccess: 3, netAdvantage: 0 });
		expect(healedPools({ wounds: { value: 2, max: 12 }, strain: { value: 1, max: 10 } }, healed)).toEqual({ wounds: 2, strain: 0 });
	});

	it('heals the wounds alone of a patient who suffers no strain, as a rival', () => {
		expect(healedPools({ wounds: { value: 5, max: 8 } }, { wounds: 2, strain: 3 })).toEqual({ wounds: 3 });
	});
});

describe('canBePatient', () => {
	it('heals characters, rivals and nemeses', () => {
		expect(['character', 'rival', 'nemesis'].map(canBePatient)).toEqual([true, true, true]);
	});

	it('heals no Minion Group nor vehicle', () => {
		expect(['minion', 'vehicle'].map(canBePatient)).toEqual([false, false]);
	});
});

describe('parseRecovery', () => {
	const recovery = { patient: 'Actor.bo', rule: 'medicine', wounds: 2, strain: 1 };

	it("reads a message's recovery", () => {
		expect(parseRecovery(recovery)).toEqual(recovery);
	});

	it.each([
		['no object', 'Actor.bo'],
		['no value', undefined],
		['a recovery without its patient', { ...recovery, patient: undefined }],
		['a recovery of a rule that heals by none', { ...recovery, rule: 'toString' }],
		['a recovery of an unknown rule', { ...recovery, rule: 'prayer' }],
		['a recovery whose wounds are no number', { ...recovery, wounds: '2' }],
		['a recovery of negative wounds', { ...recovery, wounds: -1 }],
		['a recovery of a fraction of strain', { ...recovery, strain: 0.5 }],
		['a recovery without its strain', { ...recovery, strain: undefined }],
	])('refuses %s', (_, flag) => {
		expect(parseRecovery(flag)).toBeUndefined();
	});
});

describe('isHealingSkill', () => {
	const compendium = (name: string, healsWounds: boolean) => ({ name, system: { healsWounds } });

	it('matches a skill the Skills Compendium marks as healing wounds, whatever the case of its name', () => {
		const skills = [compendium('Medicine', true), compendium('Mechanics', false)];

		expect([isHealingSkill('Medicine', skills), isHealingSkill('medicine', skills), isHealingSkill('Mechanics', skills)]).toEqual([
			true,
			true,
			false,
		]);
	});

	it('follows the name a world gives the skill', () => {
		const skills = [compendium('Médecine', true)];

		expect([isHealingSkill('médecine', skills), isHealingSkill('Medicine', skills)]).toEqual([true, false]);
	});

	it('matches no skill when the Skills Compendium marks none', () => {
		expect(isHealingSkill('Medicine', [compendium('Medicine', false)])).toBe(false);
	});
});

describe('strainRecoverySkillNames', () => {
	it('lists the skills the Skills Compendium marks as recovering strain, sorted by name whatever its order', () => {
		const skills = [
			{ name: 'Discipline', system: { recoversStrain: true } },
			{ name: 'Brawl', system: { recoversStrain: false } },
			{ name: 'Cool', system: { recoversStrain: true } },
		];

		expect(strainRecoverySkillNames(skills)).toEqual(['Cool', 'Discipline']);
	});
});

describe('patientChoices', () => {
	const actor = (name: string, type = 'character') => ({ uuid: `Actor.${name}`, name, type });

	const adversaryLabel = (name: string, type: string) => `${name} (${type})`;
	const labels = (...args: Parameters<typeof patientChoices>) => patientChoices(...args).map(({ label }) => label);

	it("offers the scene's characters and the players' characters, each once, sorted by name", () => {
		const cy = actor('Cy');
		expect(labels([cy, actor('Ada')], [actor('Bo'), cy], adversaryLabel)).toEqual(['Ada', 'Bo', 'Cy']);
	});

	it("leaves the scene's minions and vehicles out", () => {
		expect(
			patientChoices([actor('Grunts', 'minion'), actor('Wagon', 'vehicle')], [actor('Bo')], adversaryLabel).map(({ actor }) => actor),
		).toEqual([actor('Bo')]);
	});

	it("lists the scene's rivals and nemeses after the characters, each group sorted by name, with their type", () => {
		const scene = [actor('Zed', 'nemesis'), actor('Ada', 'rival'), actor('Yan'), actor('Bo', 'rival')];
		expect(labels(scene, [actor('Cy')], adversaryLabel)).toEqual(['Cy', 'Yan', 'Ada (rival)', 'Bo (rival)', 'Zed (nemesis)']);
	});

	it('does not list the players’ rivals or nemeses, only the scene’s', () => {
		expect(labels([], [actor('Foe', 'rival')], adversaryLabel)).toEqual([]);
	});

	it('numbers the entries of a label that repeats, in token order, and only those', () => {
		const scene = [
			{ ...actor('Goblin', 'rival'), uuid: 'T.b' },
			{ ...actor('Goblin', 'rival'), uuid: 'T.a' },
			{ ...actor('Goblin', 'nemesis'), uuid: 'T.c' },
		];
		const choices = patientChoices(scene, [], adversaryLabel);
		expect(choices.map(({ label }) => label)).toEqual(['Goblin (rival) 1', 'Goblin (rival) 2', 'Goblin (nemesis)']);
		expect(choices.map(({ actor }) => actor.uuid)).toEqual(['T.b', 'T.a', 'T.c']);
	});

	it('lists an actor once when several tokens share it', () => {
		const foe = actor('Foe', 'rival');
		expect(labels([foe, foe], [], adversaryLabel)).toEqual(['Foe (rival)']);
	});
});
