/** @file The step log a scenario writes, its assertions, and the comparison of two runs of it. */
import { isDeepStrictEqual } from 'node:util';

/**
 * One entry of a scenario's step log.
 */
export type Step = {
	name: string;
	value: unknown;
	/** The value an assertion expected; `value` holds the actual one. */
	expected?: unknown;
	/** Set on a failed assertion and on the `FATAL` step that ends a scenario stopped by an error. */
	failed?: true;
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

/**
 * The step of an `expect`: both values, failed when they differ. Deep equality, strict on types and on missing keys.
 */
export function assertionStep(name: string, actual: unknown, expected: unknown): Step {
	const step: Step = { name, value: actual, expected };
	if (!isDeepStrictEqual(actual, expected)) step.failed = true;
	return step;
}

/**
 * The step that ends a scenario stopped by an error.
 */
export function fatalStep(error: unknown): Step {
	return { name: FATAL, value: error instanceof Error ? error.stack ?? error.message : String(error), failed: true };
}

/**
 * The summary of one run of the suite (a Foundry version and a build): its assertion count, then each failed step.
 */
export function runSummary(run: string, scenarios: { scenario: string; steps: Step[] }[]): string[] {
	const steps = scenarios.flatMap(({ steps }) => steps);
	const assertions = steps.filter(isAssertion).length;
	const failed = steps.filter((step) => step.failed && !isFatal(step)).length;
	const stopped = scenarios.filter(({ steps }) => steps.some(isFatal)).length;

	const counts = `${failed} failed of ${assertions} ${assertions === 1 ? 'assertion' : 'assertions'}`;
	const lines = [`${run}: ${stopped ? `${stopped} ${stopped === 1 ? 'scenario' : 'scenarios'} stopped, ` : ''}${counts}`];
	for (const { scenario, steps } of scenarios) {
		for (const step of steps.filter((step) => step.failed)) {
			lines.push(`  ${scenario} › ${step.name}`);
			if (isAssertion(step)) {
				lines.push(`    expected: ${JSON.stringify(step.expected)}`, `    actual:   ${JSON.stringify(step.value)}`);
			} else {
				lines.push(`    ${String(step.value).split('\n')[0]}`);
			}
		}
	}
	return lines;
}

/**
 * The longest value a terse step line prints in full, as a `log` step's: a combat state is longer, and stays in the
 * step log saved as JSON.
 */
const SHORT_VALUE = 120;

/**
 * A step's line in the run's output. A failed step, or any step with `verbose`, prints its value; otherwise a passed
 * assertion prints `✓`, a short value prints in full, and a long one prints only the client errors it holds, which
 * fail no assertion and would be lost in the step log.
 */
export function stepLine(run: string, step: Step, { verbose = false } = {}) {
	if (step.failed || verbose) {
		const expected = step.failed && isAssertion(step) ? ` (expected ${JSON.stringify(step.expected)})` : '';
		return `${step.failed ? 'FAILED ' : ''}[${run}] ${step.name} ${JSON.stringify(step.value)}${expected}`;
	}
	if (isAssertion(step)) return `[${run}] ${step.name} ✓`;
	const value = JSON.stringify(step.value) ?? '';
	if (value.length <= SHORT_VALUE) return `[${run}] ${step.name} ${value}`;
	const errors = clientErrors(step.value);
	return `[${run}] ${step.name}${errors ? ` ${JSON.stringify(errors)}` : ''}`;
}

/**
 * The client errors a step's value holds, under the `<user> errors` keys the scenario adds, or none.
 */
function clientErrors(value: unknown) {
	if (typeof value !== 'object' || value === null) return undefined;
	const errors = Object.entries(value).filter(([key]) => key.endsWith(' errors'));
	return errors.length ? Object.fromEntries(errors) : undefined;
}

/**
 * Whether a scenario's steps fail the run: a failed assertion, unless on the build compared against, which may lack
 * the change under test; an error on any build.
 */
export function failsRun(steps: Step[], { compared }: { compared: boolean }) {
	return steps.some((step) => isFatal(step) || (step.failed && !compared));
}

const FATAL = 'FATAL';

function isFatal(step: Step) {
	return step.name === FATAL;
}

function isAssertion(step: Step) {
	return 'expected' in step;
}
