/** @file The cache of the step logs a `--compare` build left, per part, so that the next comparison runs only what it lacks. */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { type Step, type StepLog, stopped } from './steps.ts';

/**
 * What the cache keeps of a scenario's runs on the build compared against: every part the scenario has, the parts that
 * ran, and their steps with those outside parts.
 */
export type Baseline = StepLog;

/**
 * The parts of a selection (`--part`, or every part) the cache holds, and the run of the base build the others need,
 * none when it holds them all.
 */
export function planBase(
	baseline: Baseline | undefined,
	only: readonly string[] | undefined,
): { cached: string[]; run: { parts: string[] | undefined } | undefined } {
	if (!baseline) return { cached: [], run: { parts: only && [...only] } };
	const wanted = only ?? baseline.parts;
	const cached = wanted.filter((name) => baseline.ran.includes(name));
	const missing = wanted.filter((name) => !baseline.ran.includes(name));
	return { cached, run: missing.length ? { parts: missing } : undefined };
}

/**
 * Whether a run of the base build goes into the cache: not one an error stopped, which never met the parts after the
 * error, and whose failure the next comparison must show again.
 */
export function cacheable(run: StepLog) {
	return !stopped(run.steps);
}

/**
 * The baseline once a run of the base build is added to it: the parts it ran replace those cached, and its steps
 * outside parts replace theirs.
 */
export function mergeBaseline(baseline: Baseline | undefined, run: StepLog): Baseline {
	const fromCache = (name: string) => !run.ran.includes(name) && (baseline?.ran.includes(name) ?? false);
	const ran = run.parts.filter((name) => run.ran.includes(name) || fromCache(name));
	// A run that takes nothing from the cache keeps its order. Otherwise the run has no place for the parts it skipped:
	// its steps outside parts go first, which is where a scenario's setup sits, then the parts in their order.
	if (!ran.some(fromCache)) return { parts: run.parts, ran, steps: run.steps };
	return {
		parts: run.parts,
		ran,
		steps: [
			...run.steps.filter((step) => step.part === undefined),
			...ran.flatMap((name) => (fromCache(name) ? baseline?.steps ?? [] : run.steps).filter((step) => step.part === name)),
		],
	};
}

/**
 * The steps of a baseline a run with this selection compares against: those outside parts, and those of the parts
 * selected.
 */
export function baselineSteps(baseline: Baseline, only: readonly string[] | undefined): Step[] {
	return baseline.steps.filter((step) => step.part === undefined || !only || only.includes(step.part));
}

/**
 * The scenario's own sources, which its step log depends on: its file, then the `.ts` files of the folder named after
 * it, where a scenario split into parts keeps them and what they share (`e2e/scenarios/<scenario>/`), in name order.
 */
export function scenarioSources(file: string): string[] {
	const partsDir = file.replace(/\.ts$/, '');
	const parts = fs.existsSync(partsDir)
		? fs
				.readdirSync(partsDir)
				.filter((name) => name.endsWith('.ts'))
				.sort()
				.map((name) => path.join(partsDir, name))
		: [];
	return [file, ...parts].map((source) => fs.readFileSync(source, 'utf8'));
}

/**
 * Where the baseline of a scenario's run on a commit and a Foundry version is kept: under a hash of the scenario's
 * sources and the harness's, which a step log depends on as much as on the build.
 */
export function baselineFile(
	workDir: string,
	{ commit, version, scenario, sources }: { commit: string; version: number; scenario: string; sources: string[] },
) {
	const hash = createHash('sha256');
	// Each source's length first, so that two sources can't swap their characters across the seam between them.
	for (const source of sources) hash.update(`${source.length}:${source}`);
	return path.join(workDir, 'baselines', commit, `v${version}`, scenario, `${hash.digest('hex').slice(0, 16)}.json`);
}
