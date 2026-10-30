/** @file Tests for which rows of a list show their description. */

import { computed } from 'vue';
import { describe, expect, it } from 'vitest';
import { useOpenRows } from '@/vue/useOpenRows';

describe('useOpenRows', () => {
	it('starts with every row closed', () => {
		const { isOpen } = useOpenRows();

		expect(isOpen('dagger-0')).toBe(false);
	});

	it('opens a row on a toggle, and closes it on the next, leaving the other rows as they were', () => {
		const { isOpen, toggle } = useOpenRows();

		toggle('dagger-0');
		expect([isOpen('dagger-0'), isOpen('dagger-1')]).toEqual([true, false]);

		toggle('dagger-1');
		toggle('dagger-0');
		expect([isOpen('dagger-0'), isOpen('dagger-1')]).toEqual([false, true]);
	});

	it('tells what reads a row that it opened, as a template does', () => {
		const { isOpen, toggle } = useOpenRows();
		const shown = computed(() => isOpen('armor'));
		expect(shown.value).toBe(false);

		toggle('armor');

		expect(shown.value).toBe(true);
	});
});
