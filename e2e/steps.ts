/** @file The step log a scenario writes, and the comparison of two runs of it. */

/**
 * One entry of a scenario's step log.
 */
export type Step = {
	name: string;
	value: unknown;
};

/**
 * A step whose value differs between two runs; `undefined` on the side that did not log it.
 */
type StepDiff = {
	name: string;
	base: unknown;
	head: unknown;
};

/**
 * Compares two runs of a scenario step by step, by name.
 */
export function diffSteps(base: Step[], head: Step[]): StepDiff[] {
	const baseValues = new Map(base.map((step) => [step.name, step.value]));
	const headValues = new Map(head.map((step) => [step.name, step.value]));
	const names = new Set([...baseValues.keys(), ...headValues.keys()]);

	return [...names]
		.map((name) => ({ name, base: baseValues.get(name), head: headValues.get(name) }))
		.filter((step) => JSON.stringify(step.base) !== JSON.stringify(step.head));
}
