import { afterEach, describe, expect, it, vi } from 'vitest';

import * as log from '@/log';

describe('log', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('prefixes every message with the system name', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failures = [{ name: 'Kira' }];

		log.error('Unable to migrate these actors:', failures);

		expect(error).toHaveBeenCalledWith('Genesys |', 'Unable to migrate these actors:', failures);
	});
});
