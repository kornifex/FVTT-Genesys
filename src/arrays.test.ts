import { describe, expect, it } from 'vitest';

import { withoutIndex } from '@/arrays';

describe('withoutIndex', () => {
	it('removes the element at an index, and leaves the given list as it is', () => {
		const skills = Object.freeze(['Melee', 'Ranged', 'Brawl']);

		expect(withoutIndex(skills, 1)).toEqual(['Melee', 'Brawl']);
		expect(skills).toHaveLength(3);
	});
});
