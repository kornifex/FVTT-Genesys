/**
 * @file Threshold States: the states an actor gets while their wounds or strain exceed their threshold, Incapacitated or Defeated (CRB pp. 112–113, 132–133).
 */

/**
 * A state an actor's wounds or strain put on it: the Incapacitated Token State, or Foundry's Defeated.
 */
export type ThresholdState = 'incapacitated' | 'defeated';

/**
 * Wounds or strain, and their threshold. A Minion Group's wounds keep their threshold elsewhere, which this module
 * doesn't read.
 */
type Pool = { value: number; max?: number };

/**
 * What this module needs of an actor: its type, and its wounds and strain with their thresholds, as the actor has them.
 */
export type ThresholdActor = { type: string; system: { wounds?: Pool; strain?: Pool } };

/**
 * Whether an actor's wounds and strain exceed their thresholds, with the actor's type, which says what that does.
 */
export type ThresholdStanding = { type: string; woundsPast: boolean; strainPast: boolean };

/**
 * The state each threshold gives each actor type once exceeded. A character is incapacitated past either (CRB pp.
 * 112–113); a rival or nemesis past their wound threshold is defeated (CRB p. 112), a nemesis past their strain threshold
 * incapacitated as a character is (CRB p. 133); a rival suffers no strain (CRB p. 133). A Minion Group loses its members
 * as its wounds rise instead (CRB p. 132), and a vehicle is left to its own rules.
 */
const STATES_PAST: Partial<Record<string, { wounds?: ThresholdState; strain?: ThresholdState }>> = {
	character: { wounds: 'incapacitated', strain: 'incapacitated' },
	rival: { wounds: 'defeated' },
	nemesis: { wounds: 'defeated', strain: 'incapacitated' },
};

/**
 * Whether a value exceeds its threshold: reaching it isn't enough (CRB p. 112). A threshold of 0 or less is one the GM
 * hasn't filled in yet, which nothing exceeds.
 */
function isPast(pool: Pool | undefined): boolean {
	return !!pool?.max && pool.max > 0 && pool.value > pool.max;
}

/**
 * Whether an actor's wounds and strain exceed their thresholds.
 */
export function thresholdStanding({ type, system }: ThresholdActor): ThresholdStanding {
	return { type, woundsPast: isPast(system.wounds), strainPast: isPast(system.strain) };
}

function statesOf({ type, woundsPast, strainPast }: ThresholdStanding): ThresholdState[] {
	const rules = STATES_PAST[type];
	const states = new Set<ThresholdState>();
	if (woundsPast && rules?.wounds) states.add(rules.wounds);
	if (strainPast && rules?.strain) states.add(rules.strain);
	return [...states];
}

/**
 * The states an actor's wounds and strain give it.
 */
export function thresholdStates(actor: ThresholdActor): ThresholdState[] {
	return statesOf(thresholdStanding(actor));
}

/**
 * What a change of an actor's wounds or strain does: the states it puts on the actor, those it takes off, and whether
 * it offers the actor's Critical Injury.
 */
type ThresholdStateChanges = { apply: ThresholdState[]; remove: ThresholdState[]; criticalInjury: boolean };

/**
 * What a change of an actor's standing does. Only a state the standing gains or loses changes, so that a state the GM put
 * on or took off by hand stays while the standing stays. A character who goes past their wound threshold also suffers a
 * Critical Injury (CRB p. 112), offered once, as they cross it, not on every change while they stay past it.
 */
export function thresholdStateChanges(before: ThresholdStanding, after: ThresholdStanding): ThresholdStateChanges {
	const was = statesOf(before);
	const is = statesOf(after);

	return {
		apply: is.filter((state) => !was.includes(state)),
		remove: was.filter((state) => !is.includes(state)),
		criticalInjury: after.type === 'character' && after.woundsPast && !before.woundsPast,
	};
}
