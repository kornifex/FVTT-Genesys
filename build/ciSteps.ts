/** @file Reads the steps `pnpm check` runs from the CI workflow, which stays the single list of them. */

import { load } from 'js-yaml';

export interface CiStep {
	name: string;
	command: string;
}

const JOB = 'checks';
const INSTALL = /^pnpm install\b/;

/**
 * The `run:` steps of the workflow's `checks` job that come after its install step, in order. Throws a message naming
 * what is wrong when the workflow does not have that shape.
 */
export function stepsAfterInstall(workflow: string): CiStep[] {
	const parsed = load(workflow) as { jobs?: Record<string, { steps?: unknown }> } | null | undefined;
	const steps = parsed?.jobs?.[JOB]?.steps;
	if (!Array.isArray(steps)) {
		throw new Error(`ci.yml has no \`${JOB}\` job with steps.`);
	}

	const entries = steps.map((step: { name?: unknown; run?: unknown }) => step ?? {});
	const install = entries.findIndex((step) => typeof step.run === 'string' && INSTALL.test(step.run.trim()));
	if (install === -1) {
		throw new Error(`ci.yml's \`${JOB}\` job has no \`pnpm install\` step.`);
	}

	const result: CiStep[] = [];
	for (const step of entries.slice(install + 1)) {
		if (typeof step.run !== 'string') {
			continue;
		}
		const command = step.run.trim();
		result.push({ name: typeof step.name === 'string' ? step.name : command, command });
	}

	if (result.length === 0) {
		throw new Error(`ci.yml's \`${JOB}\` job has no \`run\` step after the install step.`);
	}

	return result;
}
