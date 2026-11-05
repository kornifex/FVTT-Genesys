import { describe, expect, it } from 'vitest';

import { assembleLog, planSlices } from './pool.ts';
import type { Step } from './steps.ts';

describe('assembleLog', () => {
	const parts = ['welcome', 'tabs', 'editors'];
	const step = (name: string, part?: string): Step => ({ name, value: name, ...(part && { part }), ms: 1 });
	const outside = (name: string, afterPart?: string): Step => ({ name, value: name, ...(afterPart && { afterPart }), ms: 1 });

	it("puts a scenario's slices back in the order of its parts, with the steps outside parts once, from the slice of its first part", () => {
		const first = {
			parts,
			ran: ['welcome'],
			steps: [outside('env'), step('welcome A1', 'welcome'), outside('setup', 'welcome'), outside('#349 A1', 'editors')],
		};
		const second = {
			parts,
			ran: ['tabs', 'editors'],
			steps: [
				outside('env'),
				outside('setup', 'welcome'),
				step('tabs A1', 'tabs'),
				step('editors A1', 'editors'),
				outside('#349 A1', 'editors'),
			],
		};

		expect(assembleLog([first, second])).toEqual({
			parts,
			ran: parts,
			steps: [
				outside('env'),
				step('welcome A1', 'welcome'),
				outside('setup', 'welcome'),
				step('tabs A1', 'tabs'),
				step('editors A1', 'editors'),
				outside('#349 A1', 'editors'),
			],
		});
	});

	it('takes a step outside parts from another slice when it failed there, so that a warning any slice logs fails it', () => {
		const warned = { ...outside('#349 A1', 'editors'), failed: true as const, expected: [] };
		const first = { parts, ran: ['welcome'], steps: [step('welcome A1', 'welcome'), outside('#349 A1', 'editors')] };
		const second = { parts, ran: ['tabs', 'editors'], steps: [step('tabs A1', 'tabs'), step('editors A1', 'editors'), warned] };

		expect(assembleLog([first, second]).steps.at(-1)).toEqual(warned);
	});

	it('keeps the error that stopped another slice outside its parts, as a launch that failed to start, after the parts', () => {
		const fatal: Step = { name: 'FATAL', value: 'Foundry v14 did not launch', failed: true };
		const first = { parts, ran: ['welcome'], steps: [outside('env'), step('welcome A1', 'welcome')] };
		const second = { parts: [], ran: [], steps: [fatal] };

		expect(assembleLog([first, second])).toEqual({
			parts,
			ran: ['welcome'],
			steps: [outside('env'), step('welcome A1', 'welcome'), fatal],
		});
	});
});

// A previous step log: its setup outside parts, then one step per part, of the durations given in seconds.
function previous(setup: number, parts: Record<string, number>): Step[] {
	return [
		{ name: 'env', value: {}, ms: setup * 1000 },
		...Object.entries(parts).map(([part, seconds]) => ({ name: `${part} step`, value: {}, part, ms: seconds * 1000 })),
	];
}

describe('planSlices', () => {
	it('keeps a scenario no longer than its share of the work whole, and hands the slices out longest first', () => {
		const slices = planSlices(
			[
				{ id: 'v14 head|vehicle', isolated: false, previous: previous(5, { crewDrops: 15, crewRolls: 10 }) },
				{ id: 'v14 head|combat', isolated: false, previous: previous(5, { claims: 20, noGM: 15 }) },
			],
			2,
		);

		// 70 s of work for 2 launches, 35 s each: combat (40 s) splits, vehicle (30 s) doesn't.
		expect(slices).toEqual([
			{ run: 'v14 head|vehicle', ms: 30_000 },
			{ run: 'v14 head|combat', range: { from: 0, to: 1 }, ms: 25_000 },
			{ run: 'v14 head|combat', range: { from: 1 }, ms: 20_000 },
		]);
	});

	it('estimates only the parts a run selects, ranked among them, one missing from the previous log counting as its mean part', () => {
		const slices = planSlices(
			[{ id: 'sheets', isolated: false, only: ['b', 'new'], previous: previous(0, { a: 10, b: 20, c: 30 }) }],
			2,
		);

		expect(slices).toEqual([
			{ run: 'sheets', range: { from: 0, to: 1 }, ms: 20_000 },
			{ run: 'sheets', range: { from: 1 }, ms: 20_000 },
		]);
	});

	it('keeps an isolated scenario whole, on a world of its own', () => {
		const slices = planSlices([{ id: 'migrations', isolated: true, previous: previous(0, { a: 10, b: 10 }) }], 2);

		expect(slices).toEqual([{ run: 'migrations', ms: 20_000 }]);
	});

	it("keeps a scenario with no previous log whole, counting as the other scenarios' mean", () => {
		const slices = planSlices(
			[
				{ id: 'combat', isolated: false, previous: previous(10, { claims: 20 }) },
				{ id: 'vehicle', isolated: false, previous: previous(10, {}) },
				{ id: 'newScenario', isolated: false },
			],
			3,
		);

		expect(slices).toEqual([
			{ run: 'combat', ms: 30_000 },
			{ run: 'newScenario', ms: 20_000 },
			{ run: 'vehicle', ms: 10_000 },
		]);
	});

	it('keeps every scenario whole on a single launch', () => {
		const slices = planSlices(
			[
				{ id: 'vehicle', isolated: false, previous: previous(5, { crewDrops: 15, crewRolls: 10 }) },
				{ id: 'combat', isolated: false, previous: previous(5, { claims: 20, noGM: 15 }) },
			],
			1,
		);

		expect(slices).toEqual([
			{ run: 'combat', ms: 40_000 },
			{ run: 'vehicle', ms: 30_000 },
		]);
	});

	it('splits a scenario longer than its share of the work into ranges of its parts balanced on their durations, each with the setup, the last one open', () => {
		// 100 s of work for 4 launches: 25 s each, so sheets (90 s) splits in 4 slices. Its 88 s of parts split at best
		// with 25 s at most in a slice: 10+10, 20+5, 15+10, 8+10.
		const slices = planSlices(
			[
				{ id: 'sheets', isolated: false, previous: previous(2, { a: 10, b: 10, c: 20, d: 5, e: 15, f: 10, g: 8, h: 10 }) },
				{ id: 'routePrefix', isolated: true, previous: previous(10, {}) },
			],
			4,
		);

		expect(slices).toEqual([
			{ run: 'sheets', range: { from: 2, to: 4 }, ms: 27_000 },
			{ run: 'sheets', range: { from: 4, to: 6 }, ms: 27_000 },
			{ run: 'sheets', range: { from: 0, to: 2 }, ms: 22_000 },
			{ run: 'sheets', range: { from: 6 }, ms: 20_000 },
			{ run: 'routePrefix', ms: 10_000 },
		]);
	});
});
