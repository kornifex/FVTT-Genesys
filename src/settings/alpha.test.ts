/** @file Tests for telling a new world from the Alpha version it last acknowledged. */

import { describe, expect, it } from 'vitest';

import { isNewWorld } from '@/settings/alpha';

describe('isNewWorld', () => {
	it('holds for a world that never acknowledged an Alpha version', () => {
		expect(isNewWorld('0.0.0')).toBe(true);
	});

	it('fails for a world that acknowledged one', () => {
		expect(isNewWorld('0.3.2')).toBe(false);
	});
});
