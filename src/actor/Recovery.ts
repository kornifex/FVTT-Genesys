/**
 * @file Recovery: the wounds and strain a check heals its patient of, from its results, which the check's chat message
 * carries until it is applied; the Medicine check that heals a patient, at the difficulty of their state of health
 * (CRB p. 116), and the Heal spell cast in its place (CRB p. 217); the checkthat recovers strain at the end of an encounter, and a full night's rest (CRB pp. 116–117).
 */

import type { CombatPool } from '@/data/schemaFields';
import { isCount, isRecord } from '@/data/parsing';
import { skillNamesMatch } from '@/data/Skills';
import { AVERAGE, EASY, HARD, difficultyGlyphs } from '@/dice/Difficulty';
import { SEVERITIES, type Severity } from '@/item/data/Injuries';

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
	// A Heal spell is cast in place of a Medicine check, and heals as one does on success (CRB p. 217).
	healSpell: { heal: medicineHealing, label: 'Genesys.Recovery.CardLabel', healsWounds: true },
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
 * The recovery a chat message's flag holds, or undefined when it holds anything else: a message of another version or
 * edited by hand is refused, not read.
 */
export function parseRecovery(value: unknown): Recovery | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const { patient, rule, wounds, strain } = value;
	if (typeof patient !== 'string' || typeof rule !== 'string' || !isRecoveryRule(rule) || !isCount(wounds) || !isCount(strain)) {
		return undefined;
	}
	return { patient, rule, wounds, strain };
}

function isRecoveryRule(rule: string): rule is RecoveryRule {
	return Object.hasOwn(RECOVERY_RULES, rule);
}

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

type PatientType = (typeof PATIENT_TYPES)[number];

/**
 * Whether an actor of a type can be healed by a check: a healer's target can be any of them.
 */
export function canBePatient(type: string): type is PatientType {
	// `includes` of a readonly tuple of literals only takes one of them, which a string isn't yet.
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
 * What a full night's rest heals a character of, without a check: all their strain, and one wound when they suffer any
 * (CRB pp. 116–117).
 */
export function nightsRest({ wounds, strain }: { wounds: CombatPool; strain: CombatPool }): Healed {
	return { wounds: Math.min(wounds.value, 1), strain: strain.value };
}

/**
 * What a character rolls a skill with: the value of its characteristic, and their ranks in it.
 */
type SkillPool = { characteristic: number; rank: number };

/**
 * The skill the check that recovers strain at the end of an encounter opens with, among those the character can roll: the
 * one of the larger dice pool, then of more Proficiency dice, the first of the skills on a tie or when they can roll
 * neither. The roller can still pick another in the Dice Prompt.
 *
 * @param skills The names of the skills the Skills Compendium marks as recovering strain (Discipline and Cool, CRB
 * p. 117), the first winning a tie.
 * @param poolOf What the character rolls a skill with, by its name; undefined when they can't roll it.
 * @returns Undefined when the Skills Compendium marks none.
 */
export function strainRecoverySkill(skills: readonly string[], poolOf: (name: string) => SkillPool | undefined): string | undefined {
	// A skill check rolls as many dice as the higher of the characteristic and the ranks, the lower of them upgraded.
	const dice = ({ characteristic, rank }: SkillPool) => ({
		total: Math.max(characteristic, rank),
		proficiency: Math.min(characteristic, rank),
	});
	let best: { name: string; total: number; proficiency: number } | undefined;
	for (const name of skills) {
		const pool = poolOf(name);
		const candidate = pool && { name, ...dice(pool) };
		if (
			candidate &&
			(!best || candidate.total > best.total || (candidate.total === best.total && candidate.proficiency > best.proficiency))
		) {
			best = candidate;
		}
	}

	return best?.name ?? skills[0];
}

/**
 * The names of the skills of the Skills Compendium marked as recovering strain at the end of an encounter (Discipline
 * and Cool, CRB p. 117), sorted by name: the compendium's own order is the order its documents load in, which no one
 * chose, and a tie between them must not change with it.
 */
export function strainRecoverySkillNames(compendiumSkills: { name: string; system: { recoversStrain: boolean } }[]) {
	return compendiumSkills
		.filter((skill) => skill.system.recoversStrain)
		.map((skill) => skill.name)
		.sort((left, right) => left.localeCompare(right));
}

/**
 * Whether a skill is one whose check heals wounds (Medicine, CRB p. 116): the Skills Compendium marks a skill of that
 * name as healing wounds, whatever the case of the names.
 */
export function isHealingSkill(skillName: string, compendiumSkills: { name: string; system: { healsWounds: boolean } }[]) {
	return compendiumSkills.some((skill) => skill.system.healsWounds && skillNamesMatch(skill.name, skillName));
}

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
 * The difficulty glyphs of the check with which a character heals one of their own Critical Injuries: its severity
 * (CRB p. 116), up to the five dice of Formidable. A check of a skill that heals wounds is Medicine, two levels harder
 * since they heal themselves; any other is the weekly Resilience check of a resting character, which isn't.
 */
export function ownInjuryDifficulty(severity: Severity, healingSkill: boolean) {
	return difficultyGlyphs({ level: SEVERITIES.indexOf(severity) + (healingSkill ? HEALING_ONESELF : 0), upgrades: 0 });
}

/**
 * An actor a healer may pick as their patient.
 */
type PatientCandidate = { uuid: string; name: string; type: string };

/**
 * A patient to pick, with the label the pick shows.
 */
export type PatientChoice<A extends PatientCandidate> = { actor: A; label: string };

/**
 * The patients a healer picks among, when they target none: the characters of the scene's tokens and the players'
 * characters, then the scene's rivals and nemeses, each once and each group sorted by name. A rival or a nemesis is
 * labelled with its type (`adversaryLabel`), and a label that repeats is numbered in token order, so that three goblins
 * tell apart. A Minion Group or a vehicle cannot be healed by a check, so is not offered.
 */
export function patientChoices<A extends PatientCandidate>(
	sceneActors: A[],
	playerCharacters: A[],
	adversaryLabel: (name: string, type: string) => string,
): PatientChoice<A>[] {
	const characters = new Map<string, A>();
	const adversaries = new Map<string, A>();
	for (const actor of [...sceneActors, ...playerCharacters]) {
		const isScene = sceneActors.includes(actor);
		if (actor.type === 'character') {
			characters.set(actor.uuid, characters.get(actor.uuid) ?? actor);
		} else if (isScene && (actor.type === 'rival' || actor.type === 'nemesis')) {
			adversaries.set(actor.uuid, adversaries.get(actor.uuid) ?? actor);
		}
	}

	const byName = (left: A, right: A) => left.name.localeCompare(right.name);
	const choices = [
		...[...characters.values()].sort(byName).map((actor) => ({ actor, label: actor.name })),
		...[...adversaries.values()].sort(byName).map((actor) => ({ actor, label: adversaryLabel(actor.name, actor.type) })),
	];

	const total = new Map<string, number>();
	for (const { label } of choices) {
		total.set(label, (total.get(label) ?? 0) + 1);
	}

	const seen = new Map<string, number>();
	return choices.map(({ actor, label }) => {
		if (total.get(label) === 1) {
			return { actor, label };
		}

		const rank = (seen.get(label) ?? 0) + 1;
		seen.set(label, rank);
		return { actor, label: `${label} ${rank}` };
	});
}
