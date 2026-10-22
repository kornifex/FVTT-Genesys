import { describe, expect, it } from 'vitest';

import { diffSteps } from './steps.ts';

describe('diffSteps', () => {
	it('finds nothing between two runs that logged the same steps', () => {
		const run = [
			{ name: 'before', value: { turn: 1, current: 'Boss:-1' } },
			{ name: 'add hero', value: { turn: 2, current: 'Boss:-1' } },
		];

		expect(diffSteps(run, structuredClone(run))).toEqual([]);
	});

	it('gives both values of a step that differs', () => {
		const main = [
			{ name: 'before', value: { turn: 1 } },
			{ name: 'add hero', value: { turn: 1, events: [] } },
		];
		const branch = [
			{ name: 'before', value: { turn: 1 } },
			{ name: 'add hero', value: { turn: 2, events: [] } },
		];

		expect(diffSteps(main, branch)).toEqual([{ name: 'add hero', base: { turn: 1, events: [] }, head: { turn: 2, events: [] } }]);
	});

	it('reports the steps only one run logged, in the order the runs logged them', () => {
		const main = [
			{ name: 'before', value: 1 },
			{ name: 'FATAL', value: 'Timeout' },
		];
		const branch = [
			{ name: 'before', value: 1 },
			{ name: 'roll', value: 2 },
			{ name: 'next turn', value: 3 },
		];

		expect(diffSteps(main, branch)).toEqual([
			{ name: 'FATAL', base: 'Timeout', head: undefined },
			{ name: 'roll', base: undefined, head: 2 },
			{ name: 'next turn', base: undefined, head: 3 },
		]);
	});
});
