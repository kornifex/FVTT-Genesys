/**
 * @file Recovery: the wounds and strain a check heals its patient of, from its results, which the check's chat message
 * carries until it is applied; the Medicine check that heals a patient, at the difficulty of their state of health
 * (CRB p. 116); the check that recovers strain at the end of an encounter, and a full night's rest (CRB pp. 116–117).
 */

import type { CombatPool } from '@/data/schemaFields';
import { skillNamesMatch } from '@/data/Skills';

/**
 * The wounds and strain a check heals.
 */
type Healed = { wounds: number; strain: number };

/**
 * What a recovery rule reads of a check's results.
 */
type RecoveryResults = { netSuccess: number; netAdvantage: number };

/**
 * A Medicine check heals a wound per Success and a strain per Advantage, once it succeeds (CRB p. 116).
 */
function medicineHealing({ netSuccess, netAdvantage }: RecoveryResults): Healed {
	if (netSuccess <= 0) {
		return { wounds: 0, strain: 0 };
	}

	return { wounds: netSuccess, strain: Math.max(netAdvantage, 0) };
}

/**
 * The check a character makes at the end of an encounter recovers a strain per Success, and heals no wound (CRB p. 117).
 */
function endOfEncounterRecovery({ netSuccess }: RecoveryResults): Healed {
	return { wounds: 0, strain: Math.max(netSuccess, 0) };
}

/**
 * A kind of recovery check: how it heals from its results, the localization key of its card's label, which names the
 * patient, and whether it heals wounds, which its card shows only then.
 */
type RecoveryRuleDefinition = { heal: (results: RecoveryResults) => Healed; label: string; healsWounds: boolean };

/**
 * How each kind of recovery check heals, and how its card shows it.
 */
const RECOVERY_RULES = {
	medicine: { heal: medicineHealing, label: 'Genesys.Recovery.CardLabel', healsWounds: true },
	endOfEncounter: { heal: endOfEncounterRecovery, label: 'Genesys.Recovery.EndOfEncounterCardLabel', healsWounds: false },
} satisfies Record<string, RecoveryRuleDefinition>;

/**
 * A kind of recovery check, by the rule its results heal by.
 */
type RecoveryRule = keyof typeof RECOVERY_RULES;

/**
 * How a recovery check's card shows it: the localization key of its label, and whether it shows the wounds healed.
 */
export function recoveryCard(rule: RecoveryRule) {
	const { label, healsWounds } = RECOVERY_RULES[rule];
	return { label, healsWounds };
}

/**
 * The recovery a check is rolled for: the uuid of its patient, and the rule its results heal by.
 */
export type RecoveryRequest = { patient: string; rule: RecoveryRule };

/**
 * A rolled check's recovery, as its chat message carries it: its request, and what its results heal.
 */
export type Recovery = RecoveryRequest & Healed;

/**
 * The recovery a check's results give: what they heal by the rule it is rolled for.
 */
export function recoveryOf(request: RecoveryRequest, results: RecoveryResults): Recovery {
	return { ...request, ...RECOVERY_RULES[request.rule].heal(results) };
}

/**
 * Whether a recovery heals anything: a failed check heals nothing, and its card offers nothing to apply.
 */
export function heals({ wounds, strain }: Healed) {
	return wounds > 0 || strain > 0;
}

/**
 * The actor types a check can heal: those that suffer wounds as a pool against their wound threshold. A rival suffers
 * no strain, and heals none. A Minion Group and a vehicle heal otherwise.
 */
const PATIENT_TYPES = ['character', 'rival', 'nemesis'] as const;

/**
 * Whether an actor of a type can be healed by a check: a healer's target can be any of them.
 */
export function canBePatient(type: string) {
	return (PATIENT_TYPES as readonly string[]).includes(type);
}

/**
 * What a recovery reads of its patient: their wounds, and their strain when they suffer it.
 */
export type Patient = { wounds: CombatPool; strain?: CombatPool };

/**
 * A patient's wounds and strain once a recovery is applied, neither below zero; their strain only when they suffer it.
 */
export function healedPools(patient: Patient, healing: Healed): { wounds: number; strain?: number } {
	const wounds = Math.max(patient.wounds.value - healing.wounds, 0);
	return patient.strain ? { wounds, strain: Math.max(patient.strain.value - healing.strain, 0) } : { wounds };
}

/**
 * What a full night's rest heals a character of: all their strain, and one wound when they suffer any (CRB pp. 116–117).
 */
export function nightsRest({ wounds, strain }: Required<Patient>): Healed {
	return { wounds: Math.min(wounds.value, 1), strain: strain.value };
}

/**
 * The skills a character picks between for the check that recovers strain at the end of an encounter (CRB p. 117), the
 * first one winning a tie.
 */
export const STRAIN_RECOVERY_SKILLS = ['Discipline', 'Cool'] as const;

/**
 * A skill a character may recover strain with: its name, the value of its characteristic, and the character's ranks.
 */
type StrainRecoveryCandidate = { name: string; characteristic: number; rank: number };

/**
 * The skill the check that recovers strain at the end of an encounter opens with, among those the character can roll: the
 * one of the larger dice pool, then of more Proficiency dice, Discipline on a tie or when they can roll neither. The
 * roller can still pick the other in the Dice Prompt.
 */
export function strainRecoverySkill(candidates: StrainRecoveryCandidate[]): string {
	// A skill check rolls as many dice as the higher of the characteristic and the ranks, the lower of them upgraded.
	const pool = ({ characteristic, rank }: StrainRecoveryCandidate) => [Math.max(characteristic, rank), Math.min(characteristic, rank)];
	const ordered = STRAIN_RECOVERY_SKILLS.flatMap((name) => candidates.filter((candidate) => skillNamesMatch(candidate.name, name)));
	let best = ordered[0];
	for (const candidate of ordered.slice(1)) {
		const [dice, proficiency] = pool(candidate);
		const [bestDice, bestProficiency] = pool(best);
		if (dice > bestDice || (dice === bestDice && proficiency > bestProficiency)) {
			best = candidate;
		}
	}

	return best?.name ?? STRAIN_RECOVERY_SKILLS[0];
}

/**
 * The name of the skill whose check heals wounds (CRB p. 116).
 */
const MEDICINE_SKILL_NAME = 'Medicine';

/**
 * Whether a skill is Medicine, whatever the case of its name.
 */
export function isMedicine(skillName: string) {
	return skillNamesMatch(skillName, MEDICINE_SKILL_NAME);
}

/**
 * The difficulties of Table I.6–11, by their number of Difficulty dice.
 */
const EASY = 1;
const AVERAGE = 2;
const HARD = 3;

/**
 * How much harder a Medicine check is when the healer heals themselves (CRB p. 116).
 */
const HEALING_ONESELF = 2;

/**
 * The difficulty level of a Medicine check that heals a patient's wounds, from their state of health (CRB p. 116,
 * Table I.6–11): Easy at half their wound threshold or less, Average above it, Hard past their wound threshold; two
 * more when the healer heals themselves. The equipment the healer lacks is the roller's to add in the Dice Prompt.
 */
export function medicineDifficulty({ value, max }: CombatPool, healingOneself: boolean) {
	const state = value > max ? HARD : 2 * value > max ? AVERAGE : EASY;
	return state + (healingOneself ? HEALING_ONESELF : 0);
}

/**
 * An actor a healer may pick as their patient.
 */
type PatientCandidate = { uuid: string; name: string; type: string };

/**
 * The patients a healer picks among, when they target none: the characters of the scene's tokens and the players'
 * characters, each once, sorted by name. A rival or a nemesis is healed as the healer's target only, as #686 offers the
 * characters alone to pick from.
 */
export function patientChoices<A extends PatientCandidate>(sceneActors: A[], playerCharacters: A[]): A[] {
	const choices = new Map<string, A>();
	for (const actor of [...sceneActors, ...playerCharacters]) {
		if (actor.type === 'character' && !choices.has(actor.uuid)) {
			choices.set(actor.uuid, actor);
		}
	}

	return [...choices.values()].sort((left, right) => left.name.localeCompare(right.name));
}
