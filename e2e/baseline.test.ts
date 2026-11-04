import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { baselineFile, baselineSteps, cacheable, mergeBaseline, planBase } from './baseline.ts';
import { fatalStep } from './steps.ts';

const steps = [
	{ name: 'setup', value: 1 },
	{ name: 'A1 class', value: 1, part: 'trackerClass' },
	{ name: 'B1 claim', value: 1, part: 'claims' },
];
const whole = { parts: ['trackerClass', 'claims', 'noGM'], ran: ['trackerClass', 'claims', 'noGM'], steps };

describe('planBase', () => {
	it('runs the base build on what head runs when nothing is cached', () => {
		expect(planBase(undefined, undefined)).toEqual({ cached: [], run: { parts: undefined } });
		expect(planBase(undefined, ['claims'])).toEqual({ cached: [], run: { parts: ['claims'] } });
	});

	it('takes a part from the cache after a whole run', () => {
		expect(planBase(whole, ['claims'])).toEqual({ cached: ['claims'], run: undefined });
	});

	it('takes a whole run from the cache, a part that logs no step included', () => {
		expect(planBase(whole, undefined)).toEqual({ cached: ['trackerClass', 'claims', 'noGM'], run: undefined });
	});

	it('runs only the parts the cache lacks', () => {
		const partial = { parts: whole.parts, ran: ['claims'], steps: steps.slice(0, 1).concat(steps[2]) };

		expect(planBase(partial, undefined)).toEqual({ cached: ['claims'], run: { parts: ['trackerClass', 'noGM'] } });
		expect(planBase(partial, ['noGM', 'claims'])).toEqual({ cached: ['claims'], run: { parts: ['noGM'] } });
	});

	it('takes a scenario without parts from the cache', () => {
		expect(planBase({ parts: [], ran: [], steps: [{ name: 'setup', value: 1 }] }, undefined)).toEqual({ cached: [], run: undefined });
	});
});

describe('mergeBaseline', () => {
	it('keeps a whole run', () => {
		expect(mergeBaseline(undefined, whole)).toEqual(whole);
	});

	it("keeps the order of a run's steps, a step outside parts after them included, when it takes no part from the cache", () => {
		const run = { ...whole, steps: [...steps, { name: 'compatibility warnings', value: [] }] };

		expect(mergeBaseline(whole, run).steps.map(({ name }) => name)).toEqual([
			'setup',
			'A1 class',
			'B1 claim',
			'compatibility warnings',
		]);
	});

	it('adds the parts a run ran to those cached, and takes its steps outside parts', () => {
		const cached = { parts: whole.parts, ran: ['claims'], steps: [{ name: 'setup', value: 1 }, steps[2]] };
		const run = {
			parts: whole.parts,
			ran: ['trackerClass'],
			steps: [
				{ name: 'setup', value: 2 },
				{ name: 'A1 class', value: 2, part: 'trackerClass' },
			],
		};

		expect(mergeBaseline(cached, run)).toEqual({
			parts: whole.parts,
			ran: ['trackerClass', 'claims'],
			steps: [{ name: 'setup', value: 2 }, { name: 'A1 class', value: 2, part: 'trackerClass' }, steps[2]],
		});
	});
});

describe('cacheable', () => {
	it('caches a run that went to its end', () => {
		expect(cacheable(whole)).toBe(true);
	});

	it('caches no run an error stopped, whose parts after the error never ran', () => {
		expect(cacheable({ parts: ['trackerClass'], ran: ['trackerClass'], steps: [steps[0], fatalStep('Timeout')] })).toBe(false);
	});
});

describe('baselineSteps', () => {
	it('gives the steps outside parts and those of the parts selected', () => {
		expect(baselineSteps(whole, ['claims'])).toEqual([steps[0], steps[2]]);
		expect(baselineSteps(whole, undefined)).toEqual(steps);
	});
});

describe('baselineFile', () => {
	const key = { commit: 'dda7e26ab', version: 13, scenario: 'combat', sources: ['scenario source', 'harness source'] };

	it('keeps the baseline of a commit, version and scenario in its own folder', () => {
		expect(path.dirname(baselineFile('/work', key))).toBe('/work/baselines/dda7e26ab/v13/combat');
	});

	it('finds the same file while the scenario and the harness stay the same', () => {
		expect(baselineFile('/work', key)).toBe(baselineFile('/work', { ...key, sources: ['scenario source', 'harness source'] }));
	});

	it('moves to another file once the scenario or a harness file changes', () => {
		const edited = [
			baselineFile('/work', { ...key, sources: ['scenario source, edited', 'harness source'] }),
			baselineFile('/work', { ...key, sources: ['scenario source', 'harness source, edited'] }),
		];

		expect(new Set([baselineFile('/work', key), ...edited]).size).toBe(3);
	});

	it('tells the sources apart where they meet', () => {
		expect(baselineFile('/work', { ...key, sources: ['ab', 'c'] })).not.toBe(baselineFile('/work', { ...key, sources: ['a', 'bc'] }));
	});
});
