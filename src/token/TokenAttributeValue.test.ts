/** @file Tests for the value a token attribute change leaves, against the Core Rulebook. */

import { describe, expect, it } from 'vitest';
import { newTokenAttributeValue } from '@/token/TokenAttributeValue';

describe('newTokenAttributeValue', () => {
	it("stops healing a character's wounds at 0 (CRB p. 113, 116-117)", () => {
		expect(newTokenAttributeValue({ current: 2, value: -5, isDelta: true, cappedThreshold: 12 })).toBe(0);
	});

	it('stops recovering strain, or healing a Minion Group, at 0 (CRB p. 116-117)', () => {
		expect(newTokenAttributeValue({ current: 1, value: -4, isDelta: true })).toBe(0);
		expect(newTokenAttributeValue({ current: 3, value: -5, isDelta: true })).toBe(0);
	});

	it("stops repairing a vehicle's hull trauma at 0 (CRB p. 222-223, 228)", () => {
		expect(newTokenAttributeValue({ current: 1, value: -3, isDelta: true })).toBe(0);
	});

	it('keeps a value typed below 0 at 0 (CRB p. 113)', () => {
		expect(newTokenAttributeValue({ current: 4, value: -2, isDelta: false })).toBe(0);
	});

	it("stops a character's wounds at twice their wound threshold (CRB p. 113)", () => {
		expect(newTokenAttributeValue({ current: 20, value: 10, isDelta: true, cappedThreshold: 12 })).toBe(24);
	});

	it("keeps a value typed past twice a character's wound threshold at twice the threshold (CRB p. 113)", () => {
		expect(newTokenAttributeValue({ current: 5, value: 30, isDelta: false, cappedThreshold: 12 })).toBe(24);
	});

	it('lets a value without a cap go past its threshold (CRB p. 113, 222-223, 228)', () => {
		expect(newTokenAttributeValue({ current: 9, value: 5, isDelta: true })).toBe(14);
		expect(newTokenAttributeValue({ current: 8, value: 15, isDelta: true })).toBe(23);
	});

	it('gives no cap when the threshold is missing from the data', () => {
		expect(newTokenAttributeValue({ current: 8, value: 4, isDelta: true, cappedThreshold: NaN })).toBe(12);
	});
});
