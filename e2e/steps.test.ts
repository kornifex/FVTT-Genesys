import { describe, expect, it } from 'vitest';

import { assertionStep, diffSteps, failsRun, fatalStep, runSummary, stepLine } from './steps.ts';

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

describe('assertionStep', () => {
	it('logs the actual value and the expected one of an assertion that holds', () => {
		expect(assertionStep('turn kept', { current: 'Hero:-1', events: [] }, { current: 'Hero:-1', events: [] })).toEqual({
			name: 'turn kept',
			value: { current: 'Hero:-1', events: [] },
			expected: { current: 'Hero:-1', events: [] },
		});
	});

	it('fails when a nested value differs', () => {
		expect(assertionStep('turn kept', { current: 'Hero:-1', events: ['_onEndTurn Hero'] }, { current: 'Hero:-1', events: [] })).toEqual(
			{
				name: 'turn kept',
				value: { current: 'Hero:-1', events: ['_onEndTurn Hero'] },
				expected: { current: 'Hero:-1', events: [] },
				failed: true,
			},
		);
	});

	it('fails when a key is missing, even if the expected value is undefined', () => {
		expect(assertionStep('crew', {}, { passengers: undefined }).failed).toBe(true);
	});

	it('holds when the expected value is undefined and so is the actual one', () => {
		expect(assertionStep('no combat', undefined, undefined)).toEqual({ name: 'no combat', value: undefined, expected: undefined });
	});

	it('fails on a number given as a string', () => {
		expect(assertionStep('wounds', '3', 3).failed).toBe(true);
	});
});

describe('runSummary', () => {
	it('counts the assertions of each scenario and lists the failed ones', () => {
		const passed = assertionStep('A1 turn kept', 'Hero:-1', 'Hero:-1');
		const failed = assertionStep('A2 turn kept', 'Boss:-1', 'Hero:-1');

		expect(
			runSummary('v13 head', [
				{ scenario: 'combat', steps: [{ name: 'A0 before', value: { expected: 1, actual: 1 } }, passed, failed] },
				{ scenario: 'vehicle', steps: [passed] },
			]),
		).toEqual(['v13 head: 1 failed of 3 assertions', '  combat › A2 turn kept', '    expected: "Hero:-1"', '    actual:   "Boss:-1"']);
	});

	it('lists a scenario that stopped on an error', () => {
		expect(
			runSummary('v13 head', [{ scenario: 'combat', steps: [assertionStep('A1 turn kept', 1, 1), fatalStep(new Error('Timeout'))] }]),
		).toEqual(['v13 head: 1 scenario stopped, 0 failed of 1 assertion', '  combat › FATAL', '    Error: Timeout']);
	});
});

describe('stepLine', () => {
	const combatState = { Gamemaster: { started: true, slots: ['Hero:-1=2.02', 'Foe:-1=0'], trackerActive: ['Hero:-1'] } };
	const longState = { ...combatState, Joueur: combatState.Gamemaster };

	it('prints a step with its run and a short value', () => {
		expect(stepLine('v13 head', { name: 'A0 before', value: { turn: 1 } })).toBe('[v13 head] A0 before {"turn":1}');
	});

	it('leaves out a long value, which the saved step log holds', () => {
		expect(stepLine('v13 head', { name: 'A0 set up', value: longState })).toBe('[v13 head] A0 set up');
	});

	it('prints the client errors of a long value, which fail no assertion', () => {
		const value = { ...longState, 'Gamemaster errors': ['TypeError: x is undefined'] };
		expect(stepLine('v13 head', { name: 'A2 drop', value })).toBe(
			'[v13 head] A2 drop {"Gamemaster errors":["TypeError: x is undefined"]}',
		);
	});

	it('marks a passed assertion without its value', () => {
		expect(stepLine('v13 head', assertionStep('A1 turn kept', longState, longState))).toBe('[v13 head] A1 turn kept ✓');
	});

	it('prints every value with verbose', () => {
		expect(stepLine('v13 head', assertionStep('A1 turn kept', 'Hero:-1', 'Hero:-1'), { verbose: true })).toBe(
			'[v13 head] A1 turn kept "Hero:-1"',
		);
	});

	it('marks a failed assertion and gives the value it expected', () => {
		expect(stepLine('v13 head combat', assertionStep('A1 turn kept', 'Boss:-1', 'Hero:-1'))).toBe(
			'FAILED [v13 head combat] A1 turn kept "Boss:-1" (expected "Hero:-1")',
		);
	});
});

describe('failsRun', () => {
	const failedAssertion = assertionStep('A1 turn kept', 'Boss:-1', 'Hero:-1');

	it('fails on a failed assertion of the build under test', () => {
		expect(failsRun([assertionStep('A0', 1, 1), failedAssertion], { compared: false })).toBe(true);
	});

	it('lets an assertion fail on the build compared against, which may lack the change', () => {
		expect(failsRun([failedAssertion], { compared: true })).toBe(false);
	});

	it('fails on a scenario an error stopped, on any build', () => {
		expect(failsRun([fatalStep('Timeout')], { compared: true })).toBe(true);
	});
});
