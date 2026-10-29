import { describe, expect, it } from 'vitest';

import { signed } from '@/vue/format';

describe('signed', () => {
	it('writes a number with its sign, a plus for zero too, as the bonus of a damage formula', () => {
		expect(signed(2)).toBe('+2');
		expect(signed(0)).toBe('+0');
		expect(signed(-1)).toBe('-1');
	});
});
