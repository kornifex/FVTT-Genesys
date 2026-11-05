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
	/** The part of the scenario that logged the step; none outside parts. */
	part?: string;
	/**
	 * The time from the previous step's log, or its part's start, to its own log: its action and settle, and the work
	 * before them. A part's last step also counts the part's work after it.
	 */
	ms?: number;
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
 * Compares two runs of a scenario step by step, by name: the steps outside parts, and those of the parts both ran, since
 * a run with `--part` or a cached baseline may hold parts the other lacks.
 */
export function diffSteps(base: Step[], head: Step[]): StepDiff[] {
	const partsOf = (steps: Step[]) => new Set(steps.map((step) => step.part));
	const baseParts = partsOf(base);
	const headParts = partsOf(head);
	const shared = (step: Step) => step.part === undefined || (baseParts.has(step.part) && headParts.has(step.part));
	const baseValues = new Map(base.filter(shared).map((step) => [step.name, step.value]));
	const headValues = new Map(head.filter(shared).map((step) => [step.name, step.value]));
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
 * The parts of a scenario one run selects, met as its `run` reaches them: every part, or only the names given.
 */
export function partSelection(only?: readonly string[]) {
	const met: string[] = [];
	return {
		/** Whether the part met runs. */
		runs(name: string) {
			// `--part` selects a part by its name, and the summary adds up its time by name.
			if (met.includes(name)) throw new Error(`Part "${name}" runs twice: give each part its own name.`);
			met.push(name);
			return !only || only.includes(name);
		},
		/** Why the run fails once the scenario is over: a name given that met no part. */
		unmet(): string | undefined {
			const unknown = (only ?? []).filter((name) => !met.includes(name));
			if (!unknown.length) return undefined;
			return `No part named ${unknown.join(', ')}: the scenario has ${met.length ? met.join(', ') : 'no parts'}.`;
		},
		/** Every part met so far, and those of them that ran. */
		met(): PartsMet {
			return { parts: [...met], ran: met.filter((name) => !only || only.includes(name)) };
		},
	};
}

/**
 * The parts a run of a scenario met, all of them once it is over, and those of them that ran.
 */
export type PartsMet = { parts: string[]; ran: string[] };

/**
 * A run's step log, with the parts it met and ran.
 */
export type StepLog = PartsMet & { steps: Step[] };

/**
 * The entry that logs the client errors a part gave after its last step, under the `<user> errors` keys of a step's
 * value, so that the next part's first step logs only its own. None when it gave none.
 */
export function lateErrorsStep(part: string, errors: Record<string, string[]>): Step | undefined {
	if (!Object.keys(errors).length) return undefined;
	return { name: `${part}: errors after its last step`, value: errors };
}

/**
 * The step that ends a scenario stopped by an error.
 */
export function fatalStep(error: unknown): Step {
	return { name: FATAL, value: error instanceof Error ? error.stack ?? error.message : String(error), failed: true };
}

/**
 * The summary of one run of the suite (a Foundry version and a build): its assertion count, each scenario's time and,
 * with `partTimes`, each part's, then each failed step.
 */
export function runSummary(run: string, scenarios: { scenario: string; steps: Step[] }[], { partTimes = false } = {}): string[] {
	const steps = scenarios.flatMap(({ steps }) => steps);
	const assertions = steps.filter(isAssertion).length;
	const failed = steps.filter((step) => step.failed && !isFatal(step)).length;
	const stops = scenarios.filter(({ steps }) => stopped(steps)).length;

	const counts = `${failed} failed of ${assertions} ${assertions === 1 ? 'assertion' : 'assertions'}`;
	const lines = [`${run}: ${stops ? `${stops} ${stops === 1 ? 'scenario' : 'scenarios'} stopped, ` : ''}${counts}`];
	for (const { scenario, steps } of scenarios) {
		lines.push(`  ${scenario} ${seconds(steps)}`);
		if (!partTimes) continue;
		const names = [...new Set(steps.flatMap((step) => (step.part === undefined ? [] : [step.part])))];
		for (const name of names) lines.push(`    ${name} ${seconds(steps.filter((step) => step.part === name))}`);
		const outside = steps.filter((step) => step.part === undefined);
		if (names.length && outside.length) lines.push(`    outside parts ${seconds(outside)}`);
	}
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

function seconds(steps: Step[]) {
	return `${(steps.reduce((total, step) => total + (step.ms ?? 0), 0) / 1000).toFixed(1)} s`;
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

/**
 * Whether an error stopped the scenario before its end.
 */
export function stopped(steps: Step[]) {
	return steps.some(isFatal);
}

function isFatal(step: Step) {
	return step.name === FATAL;
}

function isAssertion(step: Step) {
	return 'expected' in step;
}
