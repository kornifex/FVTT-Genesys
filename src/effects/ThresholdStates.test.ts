import { describe, expect, it } from 'vitest';
import { type ThresholdActor, thresholdStanding, thresholdStateChanges, thresholdStates } from '@/effects/ThresholdStates';

const pool = (value: number, max: number) => ({ value, max });

const character = (wounds: number, strain: number): ThresholdActor => ({
	type: 'character',
	system: { wounds: pool(wounds, 10), strain: pool(strain, 12) },
});
const nemesis = (wounds: number, strain: number): ThresholdActor => ({
	type: 'nemesis',
	system: { wounds: pool(wounds, 15), strain: pool(strain, 14) },
});
const rival = (wounds: number): ThresholdActor => ({ type: 'rival', system: { wounds: pool(wounds, 8) } });

describe('thresholdStates', () => {
	it('incapacitates a character past their wound threshold, not at it (CRB pp. 112–113)', () => {
		expect(thresholdStates(character(11, 0))).toEqual(['incapacitated']);
		expect(thresholdStates(character(10, 0))).toEqual([]);
	});

	it('incapacitates a character past their strain threshold, not at it (CRB p. 113)', () => {
		expect(thresholdStates(character(0, 13))).toEqual(['incapacitated']);
		expect(thresholdStates(character(0, 12))).toEqual([]);
	});

	it('incapacitates a character past both thresholds once', () => {
		expect(thresholdStates(character(11, 13))).toEqual(['incapacitated']);
	});

	it('defeats a rival past their wound threshold, not at it (CRB pp. 112, 133)', () => {
		expect(thresholdStates(rival(9))).toEqual(['defeated']);
		expect(thresholdStates(rival(8))).toEqual([]);
	});

	it('defeats a nemesis past their wound threshold, and incapacitates them past their strain threshold, not at either (CRB pp. 112–113, 133)', () => {
		expect(thresholdStates(nemesis(16, 0))).toEqual(['defeated']);
		expect(thresholdStates(nemesis(0, 15))).toEqual(['incapacitated']);
		expect(thresholdStates(nemesis(16, 15))).toEqual(['defeated', 'incapacitated']);
		expect(thresholdStates(nemesis(15, 14))).toEqual([]);
	});

	it('leaves a Minion Group, which loses its members as its wounds rise, and a vehicle alone (CRB p. 132)', () => {
		expect(thresholdStates({ type: 'minion', system: { wounds: pool(13, 12) } })).toEqual([]);
		expect(thresholdStates({ type: 'vehicle', system: {} })).toEqual([]);
	});

	it('counts a threshold of 0, which the GM has yet to fill in, as none', () => {
		expect(thresholdStates({ type: 'character', system: { wounds: pool(3, 0), strain: pool(2, 0) } })).toEqual([]);
		expect(thresholdStates({ type: 'rival', system: { wounds: pool(3, 0) } })).toEqual([]);
	});
});

describe('thresholdStateChanges', () => {
	const changes = (before: ThresholdActor, after: ThresholdActor) =>
		thresholdStateChanges(thresholdStanding(before), thresholdStanding(after));

	it('marks a character who goes past their wound threshold incapacitated, and offers their Critical Injury (CRB p. 112)', () => {
		expect(changes(character(8, 0), character(11, 0))).toEqual({ apply: ['incapacitated'], remove: [], criticalInjury: true });
	});

	it('offers no Critical Injury while the character stays past their wound threshold', () => {
		expect(changes(character(11, 0), character(14, 0))).toEqual({ apply: [], remove: [], criticalInjury: false });
	});

	it('offers the Critical Injury of a character going past their wound threshold while already incapacitated by strain', () => {
		expect(changes(character(8, 13), character(11, 13))).toEqual({ apply: [], remove: [], criticalInjury: true });
	});

	it('clears the state once the character is healed back to their wound threshold (CRB p. 112)', () => {
		expect(changes(character(11, 0), character(10, 0))).toEqual({ apply: [], remove: ['incapacitated'], criticalInjury: false });
	});

	it('keeps the state of a character healed of their wounds while still past their strain threshold', () => {
		expect(changes(character(11, 13), character(4, 13))).toEqual({ apply: [], remove: [], criticalInjury: false });
	});

	it('incapacitates a character past their strain threshold without a Critical Injury (CRB p. 113)', () => {
		expect(changes(character(0, 12), character(0, 13))).toEqual({ apply: ['incapacitated'], remove: [], criticalInjury: false });
	});

	it('defeats a rival going past their wound threshold without offering a Critical Injury, and clears it once healed', () => {
		expect(changes(rival(8), rival(9))).toEqual({ apply: ['defeated'], remove: [], criticalInjury: false });
		expect(changes(rival(9), rival(2))).toEqual({ apply: [], remove: ['defeated'], criticalInjury: false });
	});

	it('changes nothing while the standing stays the same, leaving a state the GM put by hand alone', () => {
		expect(changes(character(2, 0), character(5, 3))).toEqual({ apply: [], remove: [], criticalInjury: false });
	});
});
