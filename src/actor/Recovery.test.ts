/**
 * @file Tests for Recovery: the Medicine check's difficulty, what a recovery check heals, a night's rest, and the skill
 * the end of an encounter's check opens with.
 */

import { describe, expect, it } from 'vitest';
import {
	canBePatient,
	HEALING_CHANGE_KEYS,
	healedPools,
	healingSkillNames,
	heals,
	isHealingSkill,
	medicineDifficulty,
	nightsRest,
	ownInjuryDifficulty,
	parseRecovery,
	patientChoices,
	recoveryCard,
	recoveryOf,
	skillOfLargestPool,
	strainRecoverySkillNames,
} from '@/actor/Recovery';
import type { RankedSystem } from '@/item/data/Talents';

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

	it('rounds half of an odd wound threshold up (CRB pp. 23, 116)', () => {
		expect(medicineDifficulty(wounds(7, 13), false)).toBe(1);
		expect(medicineDifficulty(wounds(8, 13), false)).toBe(2);
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

describe('ownInjuryDifficulty', () => {
	it("is the injury's severity and two more with Medicine, the character healing themselves (CRB p. 116)", () => {
		expect(ownInjuryDifficulty('-', true)).toBe('DD');
		expect(ownInjuryDifficulty('easy', true)).toBe('DDD');
		expect(ownInjuryDifficulty('average', true)).toBe('DDDD');
		expect(ownInjuryDifficulty('hard', true)).toBe('DDDDD');
	});

	it("is the injury's severity alone with Resilience, the weekly check of a resting character (CRB p. 116)", () => {
		expect(ownInjuryDifficulty('-', false)).toBe('');
		expect(ownInjuryDifficulty('easy', false)).toBe('D');
		expect(ownInjuryDifficulty('average', false)).toBe('DD');
		expect(ownInjuryDifficulty('formidable', false)).toBe('DDDDD');
	});

	it('stops at the five dice of Formidable, which an Impossible task rolls too', () => {
		expect(ownInjuryDifficulty('daunting', true)).toBe('DDDDD');
		expect(ownInjuryDifficulty('formidable', true)).toBe('DDDDD');
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

	describe("the healer's bonus to the wounds a Medicine check heals", () => {
		const effect = (
			value: unknown,
			item?: { system: { ranked?: 'yes' | 'no'; rank?: number; scalesWithRank?: 'yes' | 'no' | 'upTo' } },
			isSuppressed = false,
		) => ({
			isSuppressed,
			system: { changes: [{ key: HEALING_CHANGE_KEYS.medicineWounds, value }] },
			originItem: item,
		});
		const healer = (...effects: ReturnType<typeof effect>[]) => ({ allApplicableEffects: () => effects });
		const surgeon = (rank: number) => ({ system: { ranked: 'yes' as const, rank, scalesWithRank: 'yes' as const } });

		it("adds once per rank of the healer's talent, as Surgeon does (CRB p. 74)", () => {
			expect(recoveryOf(request, { netSuccess: 2, netAdvantage: 1 }, healer(effect('1', surgeon(2))))).toEqual({
				...request,
				wounds: 4,
				strain: 1,
			});
		});

		it('adds once per rank of a talent whose Pool Modifications count up to its rank, as one that scales with rank', () => {
			const upToRank = healer(effect('1', { system: { ranked: 'yes', rank: 2, scalesWithRank: 'upTo' } }));
			expect(recoveryOf(request, { netSuccess: 2, netAdvantage: 0 }, upToRank).wounds).toBe(4);
		});

		it('adds once for an unranked talent left scaling with rank, which its sheet no longer offers', () => {
			const unranked = healer(effect('1', { system: { ranked: 'no', rank: 2, scalesWithRank: 'yes' } }));
			expect(recoveryOf(request, { netSuccess: 2, netAdvantage: 0 }, unranked).wounds).toBe(3);
		});

		it('adds nothing when the Medicine check fails, which heals nothing (CRB p. 116)', () => {
			expect(recoveryOf(request, { netSuccess: 0, netAdvantage: 2 }, healer(effect('1', surgeon(2))))).toEqual({
				...request,
				wounds: 0,
				strain: 0,
			});
		});

		it("sums the healer's effects, a number as Foundry stores it, once for an item that doesn't scale with rank", () => {
			const bonus = healer(effect(2), effect('1', { system: { ranked: 'yes', rank: 3, scalesWithRank: 'no' } }));
			expect(recoveryOf(request, { netSuccess: 1, netAdvantage: 0 }, bonus).wounds).toBe(4);
		});

		it('leaves out a suppressed effect, and a value that is no whole number', () => {
			const bonus = healer(effect('1', undefined, true), effect('1.5'), effect('two'));
			expect(recoveryOf(request, { netSuccess: 1, netAdvantage: 0 }, bonus).wounds).toBe(1);
		});

		it('heals no fewer than zero wounds under a penalty', () => {
			expect(recoveryOf(request, { netSuccess: 1, netAdvantage: 2 }, healer(effect('-3'))).wounds).toBe(0);
		});

		it('adds nothing to a Heal spell, which is no Medicine check (CRB pp. 74, 217)', () => {
			expect(recoveryOf(healSpell, { netSuccess: 2, netAdvantage: 0 }, healer(effect('1', surgeon(1)))).wounds).toBe(2);
		});

		it("leaves the end of an encounter's recovery as it is, whose keys are its own", () => {
			expect(recoveryOf(endOfEncounter, { netSuccess: 2, netAdvantage: 0 }, healer(effect('1')))).toEqual({
				...endOfEncounter,
				wounds: 0,
				strain: 2,
			});
		});
	});

	describe("the character's own bonus to the end of an encounter's recovery (#931)", () => {
		const { encounterEndStrain, encounterEndWounds } = HEALING_CHANGE_KEYS;

		// A character holding one effect, of a strain bonus and a wounds bonus.
		const character = (strain: unknown, wounds: unknown, item?: RankedItem) =>
			recoverer(
				bonusEffect(
					[
						[encounterEndStrain, strain],
						[encounterEndWounds, wounds],
					],
					item,
				),
			);

		it('recovers the strain bonus on top of the Successes, and heals the wounds bonus', () => {
			expect(recoveryOf(endOfEncounter, { netSuccess: 3, netAdvantage: 0 }, character('1', '2'))).toEqual({
				...endOfEncounter,
				wounds: 2,
				strain: 4,
			});
		});

		it('adds both bonuses whatever the results, the check failing included', () => {
			expect(recoveryOf(endOfEncounter, { netSuccess: -2, netAdvantage: 1 }, character('1', '1'))).toEqual({
				...endOfEncounter,
				wounds: 1,
				strain: 1,
			});
		});

		it('counts each bonus once per rank of a talent marked as scaling with its rank, once otherwise', () => {
			const results = { netSuccess: 1, netAdvantage: 0 };
			expect(recoveryOf(endOfEncounter, results, character('1', 1, talentOfRank(3)))).toMatchObject({ wounds: 3, strain: 4 });
			expect(recoveryOf(endOfEncounter, results, character('1', 1, talentOfRank(3, 'no')))).toMatchObject({ wounds: 1, strain: 2 });
		});

		it('recovers and heals no fewer than none under a penalty', () => {
			expect(recoveryOf(endOfEncounter, { netSuccess: 2, netAdvantage: 0 }, character('-3', '-1'))).toMatchObject({
				wounds: 0,
				strain: 0,
			});
		});

		it('adds nothing to a Medicine check, and nothing without an actor rolling', () => {
			expect(recoveryOf(request, { netSuccess: 1, netAdvantage: 1 }, character('1', '1'))).toMatchObject({ wounds: 1, strain: 1 });
			expect(recoveryOf(endOfEncounter, { netSuccess: 1, netAdvantage: 0 })).toMatchObject({ wounds: 0, strain: 1 });
		});
	});
});

type RankedItem = { system: RankedSystem };

/**
 * An effect holding a change of each key and value, from the item given, if any, and tagged with the id of the item's
 * quality it belongs to, if any.
 */
function bonusEffect(changes: [string, unknown][], originItem?: RankedItem, quality?: string) {
	return {
		isSuppressed: false,
		system: { changes: changes.map(([key, value]) => ({ key, value })) },
		originItem,
		flags: { genesys: { quality } },
	};
}

function talentOfRank(rank: number, scalesWithRank: 'yes' | 'no' = 'yes'): RankedItem {
	return { system: { rank, scalesWithRank } };
}

/**
 * An actor holding the effects given.
 */
function recoverer(...effects: ReturnType<typeof bonusEffect>[]) {
	return { allApplicableEffects: () => effects };
}

describe('recoveryCard', () => {
	const recovery = (rule: 'medicine' | 'endOfEncounter', wounds: number) => ({ patient: 'Actor.bo', rule, wounds, strain: 2 });

	it("shows a Medicine check's wounds and strain healed, even none", () => {
		expect(recoveryCard(recovery('medicine', 0))).toEqual({ label: 'Genesys.Recovery.CardLabel', healsWounds: true });
	});

	it("shows the strain alone of the end of an encounter's check, which heals no wound (CRB p. 117)", () => {
		expect(recoveryCard(recovery('endOfEncounter', 0))).toEqual({
			label: 'Genesys.Recovery.EndOfEncounterCardLabel',
			healsWounds: false,
		});
	});

	it("shows the wounds of the end of an encounter's check once the character's effects heal some (#931)", () => {
		expect(recoveryCard(recovery('endOfEncounter', 2)).healsWounds).toBe(true);
	});
});

describe('nightsRest', () => {
	const rested = (wounds: number, strain: number, ...effects: ReturnType<typeof bonusEffect>[]) => ({
		...recoverer(...effects),
		system: { wounds: { value: wounds, max: 12 }, strain: { value: strain, max: 10 } },
	});
	const { restWounds } = HEALING_CHANGE_KEYS;

	it('recovers all strain and heals one wound (CRB pp. 116–117)', () => {
		expect(nightsRest(rested(5, 7))).toEqual({ wounds: 1, strain: 7 });
	});

	it('heals no wound at zero wounds (CRB p. 116)', () => {
		expect(nightsRest(rested(0, 4))).toEqual({ wounds: 0, strain: 4 });
	});

	it('leaves the character at zero wounds and strain at most, once applied (CRB pp. 116–117)', () => {
		expect(healedPools(rested(1, 7).system, nightsRest(rested(1, 7)))).toEqual({ wounds: 0, strain: 0 });
		expect(healedPools(rested(0, 0).system, nightsRest(rested(0, 0)))).toEqual({ wounds: 0, strain: 0 });
	});

	describe("the character's own bonus to the wounds it heals (#931)", () => {
		const bonus = (value: unknown, item?: RankedItem) => bonusEffect([[restWounds, value]], item);

		it('heals the bonus on top of its one wound, as Apothecary put on the patient does (RoT p. 84)', () => {
			expect(nightsRest(rested(5, 3, bonus('2')))).toEqual({ wounds: 3, strain: 3 });
		});

		it('heals no more wounds than the character suffers', () => {
			expect(nightsRest(rested(2, 0, bonus('3')))).toEqual({ wounds: 2, strain: 0 });
			expect(nightsRest(rested(0, 0, bonus('3')))).toEqual({ wounds: 0, strain: 0 });
		});

		it('counts the bonus once per rank of a talent marked as scaling with its rank, once otherwise', () => {
			expect(nightsRest(rested(8, 0, bonus(1, talentOfRank(2)))).wounds).toBe(3);
			expect(nightsRest(rested(8, 0, bonus(1, talentOfRank(2, 'no')))).wounds).toBe(2);
		});

		it('heals no fewer than none under a penalty, and reads no other key', () => {
			expect(nightsRest(rested(5, 0, bonus('-3'))).wounds).toBe(0);
			expect(nightsRest(rested(5, 0, bonusEffect([[HEALING_CHANGE_KEYS.encounterEndWounds, '2']]))).wounds).toBe(1);
		});
	});
});

describe("the healing bonus of a weapon's or an armor's quality (CRB pp. 86–89)", () => {
	const { medicineWounds, restWounds, encounterEndStrain, encounterEndWounds } = HEALING_CHANGE_KEYS;
	const restorative = (id: string, rating: number) => ({ id, name: 'Restorative', isRated: true, rating });

	// An armor holding the quality at a rating, whose effect, tagged with its id, holds the changes given.
	const armorWith = (rating: number, changes: [string, unknown][]) => {
		const armor = { system: { qualities: [restorative('main', rating)] } };
		return recoverer(bonusEffect(changes, armor, 'main'));
	};

	// A weapon holding the quality on its main Weapon Profile and on its extra one, each copy at its rating with an effect
	// tagged with its id that adds a wound to a night's rest.
	const weaponWith = (mainRating: number, extraRating: number) => {
		const weapon = {
			system: { qualities: [restorative('main', mainRating)], extraProfiles: [{ qualities: [restorative('extra', extraRating)] }] },
		};
		return recoverer(...['main', 'extra'].map((id) => bonusEffect([[restWounds, 1]], weapon, id)));
	};
	const rested = (character: ReturnType<typeof recoverer>) => ({
		...character,
		system: { wounds: { value: 8, max: 12 }, strain: { value: 0, max: 10 } },
	});

	it("counts the bonus once per rank of the quality's rating, for a night's rest", () => {
		expect(nightsRest(rested(armorWith(2, [[restWounds, 1]]))).wounds).toBe(3);
	});

	it("counts the bonuses once per rank of the quality's rating, for the end of an encounter", () => {
		const character = armorWith(2, [
			[encounterEndStrain, 1],
			[encounterEndWounds, 1],
		]);
		expect(recoveryOf({ patient: 'Actor.bo', rule: 'endOfEncounter' }, { netSuccess: 1, netAdvantage: 0 }, character)).toMatchObject({
			wounds: 2,
			strain: 3,
		});
	});

	it("counts the healer's bonus once per rank of the quality's rating, for a Medicine check", () => {
		const healer = armorWith(2, [[medicineWounds, 1]]);
		expect(recoveryOf({ patient: 'Actor.bo', rule: 'medicine' }, { netSuccess: 1, netAdvantage: 0 }, healer).wounds).toBe(3);
	});

	it('counts a quality held by two Weapon Profiles of a weapon once, at its highest rating', () => {
		expect(nightsRest(rested(weaponWith(1, 1))).wounds).toBe(2);
		expect(nightsRest(rested(weaponWith(2, 3))).wounds).toBe(4);
	});
});

describe('skillOfLargestPool', () => {
	// What the character rolls each skill with, as [characteristic, rank], by name.
	const pools = (skills: Record<string, [number, number]>) => (name: string) => {
		const pool = skills[name];
		return pool && { characteristic: pool[0], rank: pool[1] };
	};

	const SKILLS = ['Discipline', 'Cool'] as const;

	it('picks the skill of the larger dice pool between Discipline and Cool (CRB p. 117)', () => {
		expect(skillOfLargestPool(SKILLS, pools({ Discipline: [2, 1], Cool: [3, 1] }))).toBe('Cool');
		expect(skillOfLargestPool(SKILLS, pools({ Discipline: [3, 0], Cool: [2, 2] }))).toBe('Discipline');
	});

	it('picks the pool with more Proficiency dice when both hold as many dice', () => {
		expect(skillOfLargestPool(SKILLS, pools({ Discipline: [3, 1], Cool: [3, 2] }))).toBe('Cool');
	});

	it('picks Discipline, as the rule names it first, when both pools are alike', () => {
		expect(skillOfLargestPool(SKILLS, pools({ Discipline: [2, 1], Cool: [1, 2] }))).toBe('Discipline');
	});

	it('picks the one the character can roll, and Discipline when they can roll neither', () => {
		expect(skillOfLargestPool(SKILLS, pools({ Cool: [1, 0] }))).toBe('Cool');
		expect(skillOfLargestPool(SKILLS, pools({}))).toBe('Discipline');
	});

	it('answers nothing when no skill is marked', () => {
		expect(skillOfLargestPool([], pools({ Cool: [1, 0] }))).toBeUndefined();
	});

	it('picks among any number of skills the world marks, the first winning a tie', () => {
		const three = ['Discipline', 'Cool', 'Faith'];

		expect(skillOfLargestPool(three, pools({ Discipline: [2, 1], Cool: [2, 1], Faith: [3, 1] }))).toBe('Faith');
		expect(skillOfLargestPool(three, pools({ Discipline: [2, 1], Cool: [2, 1], Faith: [2, 1] }))).toBe('Discipline');
	});

	it('picks among skills of any name, the first winning a tie and answering when neither can be rolled', () => {
		const french = ['Discipline (fr)', 'Calme'] as const;

		expect(skillOfLargestPool(french, pools({ 'Discipline (fr)': [2, 1], Calme: [3, 1] }))).toBe('Calme');
		expect(skillOfLargestPool(french, pools({ 'Discipline (fr)': [2, 1], Calme: [1, 2] }))).toBe('Discipline (fr)');
		expect(skillOfLargestPool(french, pools({ Discipline: [3, 3], Cool: [3, 3] }))).toBe('Discipline (fr)');
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

describe('healingSkillNames', () => {
	it('lists the skills the Skills Compendium marks as healing wounds, sorted by name whatever its order', () => {
		const skills = [
			{ name: 'Survival', system: { healsWounds: true } },
			{ name: 'Mechanics', system: { healsWounds: false } },
			{ name: 'Medicine', system: { healsWounds: true } },
		];

		expect(healingSkillNames(skills)).toEqual(['Medicine', 'Survival']);
	});

	it('lists none when the Skills Compendium marks none', () => {
		expect(healingSkillNames([{ name: 'Medicine', system: { healsWounds: false } }])).toEqual([]);
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
