/** @file Tests for a counter's value: its bounds, its steps and the values typed into it. */

import { describe, expect, it } from 'vitest';
import { boundedValue, steppedValue, typedValue } from '@/data/CounterValue';

describe('boundedValue', () => {
	it('keeps a value below 0 at 0', () => {
		expect(boundedValue(-3)).toBe(0);
		expect(boundedValue(-3, 24)).toBe(0);
	});

	it('keeps a value past its cap at the cap', () => {
		expect(boundedValue(30, 24)).toBe(24);
	});

	it('lets a value without a cap count up', () => {
		expect(boundedValue(40)).toBe(40);
	});

	it('caps nothing with a cap the data lacks', () => {
		expect(boundedValue(12, NaN)).toBe(12);
	});

	it('keeps a value at 0 with a cap of 0', () => {
		expect(boundedValue(3, 0)).toBe(0);
	});
});

describe('steppedValue', () => {
	it('steps one up and one down', () => {
		expect(steppedValue(3, 1)).toBe(4);
		expect(steppedValue(3, -1)).toBe(2);
	});

	it('stops a step down at 0', () => {
		expect(steppedValue(0, -1)).toBe(0);
	});

	it('stops a step up at the cap', () => {
		expect(steppedValue(24, 1, 24)).toBe(24);
	});

	it('brings a value already past its cap down to it', () => {
		expect(steppedValue(30, -1, 24)).toBe(24);
	});
});

describe('typedValue', () => {
	it('reads a whole number, with spaces around it', () => {
		expect(typedValue(' 7 ')).toBe(7);
	});

	it('rounds a fraction to a whole number (#269)', () => {
		expect(typedValue('2.6')).toBe(3);
		expect(typedValue('12.4')).toBe(12);
		expect(typedValue('.5')).toBe(1);
	});

	it('keeps a value typed below 0 at 0', () => {
		expect(typedValue('-3')).toBe(0);
		expect(typedValue('-0.4')).toBe(0);
	});

	it('keeps a value typed past the cap at the cap', () => {
		expect(typedValue('40', 24)).toBe(24);
	});

	it('reads no value from text that is no number', () => {
		expect(typedValue('')).toBeUndefined();
		expect(typedValue('abc')).toBeUndefined();
		expect(typedValue('3a')).toBeUndefined();
		expect(typedValue('1e3')).toBeUndefined();
		expect(typedValue('2,5')).toBeUndefined();
	});
});
