import { describe, expect, it } from 'vitest';

import { staleMessage } from './stale.ts';

describe('staleMessage', () => {
	it('says nothing when HEAD holds the ref', () => {
		expect(staleMessage('origin/main', 0)).toBeUndefined();
	});

	it('counts the commits HEAD lacks, and says how to catch up', () => {
		const message = staleMessage('origin/main', 3);
		expect(message).toContain('3 commits');
		expect(message).toContain('origin/main');
		expect(message).toContain('git merge origin/main');
		expect(message).toContain('git merge-base HEAD origin/main');
	});

	it('uses the singular for one commit', () => {
		expect(staleMessage('origin/main', 1)).toContain('1 commit that');
	});
});
