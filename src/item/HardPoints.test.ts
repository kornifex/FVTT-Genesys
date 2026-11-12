import { describe, expect, it } from 'vitest';
import { computedHardPoints, hardPoints, hardPointsException } from '@/item/HardPoints';

describe('hardPoints', () => {
	it('gives an odd encumbrance half of it, rounded up (CRB p. 206)', () => {
		expect(hardPoints({ encumbrance: 3, hardPoints: null })).toBe(2);
		expect(hardPoints({ encumbrance: 1, hardPoints: null })).toBe(1);
	});

	it('gives an even encumbrance half of it (CRB p. 206)', () => {
		expect(hardPoints({ encumbrance: 4, hardPoints: null })).toBe(2);
	});

	it('gives no hard point to an item of encumbrance 0 or less', () => {
		expect(hardPoints({ encumbrance: 0, hardPoints: null })).toBe(0);
		expect(hardPoints({ encumbrance: -3, hardPoints: null })).toBe(0);
	});

	it('takes an edited value over the computed one, for an item that is an exception (CRB p. 206)', () => {
		expect(hardPoints({ encumbrance: 3, hardPoints: 0 })).toBe(0);
		expect(hardPoints({ encumbrance: 2, hardPoints: 4 })).toBe(4);
	});
});

describe('hardPointsException', () => {
	it('stores the number typed when it differs from the computed one', () => {
		expect(hardPointsException(3, '4')).toBe(4);
		expect(hardPointsException(3, '0')).toBe(0);
	});

	it('stores no exception when the field is emptied or set to the computed number, so it follows the encumbrance', () => {
		expect(hardPointsException(3, '')).toBeNull();
		expect(hardPointsException(3, ' ')).toBeNull();
		expect(hardPointsException(3, String(computedHardPoints(3)))).toBeNull();
	});

	it('refuses a value that is no whole number of 0 or more', () => {
		expect(hardPointsException(3, '-1')).toBeUndefined();
		expect(hardPointsException(3, '1.5')).toBeUndefined();
		expect(hardPointsException(3, 'two')).toBeUndefined();
	});
});
