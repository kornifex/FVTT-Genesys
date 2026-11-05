/** @file The slices a run hands to its pool of launches, and the step log of a scenario put back together from its slices. */
import { isFatal, type PartRange, type Step, type StepLog } from './steps.ts';

/**
 * A scenario to run on one Foundry version and build.
 */
export type ScenarioRun = {
	/** What the run's results are kept under. */
	id: string;
	/** A scenario on a fresh world of its own, never split. */
	isolated: boolean;
	/** The parts the run selects (`--part`, or those the base build's cache lacks); every part when undefined. */
	only?: readonly string[];
	/** The step log the same run left last time, whose durations estimate this one's. */
	previous?: Step[];
};

/**
 * A scenario's setup and a range of its parts, as one launch runs them, with its estimated duration. No range: every
 * part the run selects.
 */
export type Slice = { run: string; range?: PartRange; ms: number };

/**
 * The slices of a run's scenarios, longest first. A scenario longer than its share of the work (the whole work divided
 * by the launches, never below the longest part) splits into ranges of its parts balanced on their durations, each run
 * after the scenario's setup; the last range is open, so that a part the scenario gained since its previous log runs too.
 */
export function planSlices(runs: ScenarioRun[], launches: number): Slice[] {
	const known = runs.flatMap((run) => (run.previous ? [{ run, ...estimate(run, run.previous) }] : []));
	// A scenario no run logged yet has no parts to split on: it counts as one, of the other scenarios' mean duration.
	const mean = known.length ? sum0(known.map(({ setup, parts }) => setup + sum0(parts))) / known.length : 0;
	const estimates = runs.map((run) => known.find((estimated) => estimated.run === run) ?? { run, setup: mean, parts: [] });
	const work = estimates.reduce((sum, { setup, parts }) => sum + setup + sum0(parts), 0);
	const longestPart = Math.max(0, ...estimates.flatMap(({ parts }) => parts));
	const target = Math.max(work / launches, longestPart);

	return estimates
		.flatMap(({ run, setup, parts }) => {
			const ms = setup + sum0(parts);
			const count = Math.min(parts.length, Math.ceil(ms / target));
			if (run.isolated || count < 2) return [{ run: run.id, ms }];
			const starts = splitStarts(parts, count);
			return starts.map((from, index) => {
				const to = starts[index + 1];
				return { run: run.id, range: to === undefined ? { from } : { from, to }, ms: setup + sum0(parts.slice(from, to)) };
			});
		})
		.sort((left, right) => right.ms - left.ms);
}

/**
 * A run's setup and the durations of the parts it selects, in their order, from its previous step log. A part selected
 * that the log lacks, which it skipped or the scenario gained since, counts as the scenario's mean part, after the others.
 */
function estimate(run: ScenarioRun, previous: Step[]) {
	const setup = sum0(previous.filter((step) => step.part === undefined).map((step) => step.ms ?? 0));
	const logged = new Map<string, number>();
	for (const step of previous) {
		if (step.part !== undefined) logged.set(step.part, (logged.get(step.part) ?? 0) + (step.ms ?? 0));
	}
	if (!run.only) return { setup, parts: [...logged.values()] };

	const mean = logged.size ? sum0([...logged.values()]) / logged.size : 0;
	const only = run.only;
	const names = [...[...logged.keys()].filter((name) => only.includes(name)), ...only.filter((name) => !logged.has(name))];
	return { setup, parts: names.map((name) => logged.get(name) ?? mean) };
}

/**
 * Where each of `count` ranges of the parts starts, so that their durations are about even: a range ends before the part
 * whose middle lies past its share.
 */
function splitStarts(parts: number[], count: number) {
	const share = sum0(parts) / count;
	const starts = [0];
	let done = 0;
	for (const [index, ms] of parts.entries()) {
		if (starts.length < count && index > starts.at(-1)! && done + ms / 2 > starts.length * share) starts.push(index);
		done += ms;
	}
	return starts;
}

/**
 * A scenario's step log put back together from the logs of its slices, the slice of its first part first: each part's
 * steps from the slice that ran it, in the order of the parts, and the steps outside parts once, from the first slice,
 * each after the part it followed.
 */
export function assembleLog(slices: StepLog[]): StepLog {
	if (slices.length === 1) return slices[0];
	const [first, ...others] = slices;
	// A slice stopped early met fewer parts than the others.
	const parts = slices.reduce((longest, slice) => (slice.parts.length > longest.length ? slice.parts : longest), first.parts);
	const isOutside = (step: Step) => step.part === undefined;

	// A check outside parts, as one that no compatibility warning was logged, covers only its own slice's parts: one that
	// failed in another slice takes the place of the first slice's.
	const failedElsewhere = new Map(
		others.flatMap((slice) =>
			slice.steps.filter((step) => isOutside(step) && step.failed && !isFatal(step)).map((step) => [step.name, step]),
		),
	);
	const outsideAfter = (part: string | undefined) =>
		first.steps
			.filter((step) => isOutside(step) && step.afterPart === part)
			.map((step) => (step.failed ? step : failedElsewhere.get(step.name) ?? step));
	// The error that stopped another slice outside its parts: its setup, or its launch.
	const stops = others.flatMap((slice) => slice.steps.filter((step) => isOutside(step) && isFatal(step)));

	const steps = [
		...outsideAfter(undefined),
		...parts.flatMap((part) => [...slices.flatMap((slice) => slice.steps.filter((step) => step.part === part)), ...outsideAfter(part)]),
		...stops,
	];
	return { parts, ran: parts.filter((part) => slices.some((slice) => slice.ran.includes(part))), steps };
}

function sum0(values: number[]) {
	return values.reduce((sum, value) => sum + value, 0);
}
