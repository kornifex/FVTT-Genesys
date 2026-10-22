import { describe, expect, it } from 'vitest';

import { releaseManifest } from './releaseManifest.ts';

describe('releaseManifest', () => {
	const manifest = {
		id: 'genesys',
		version: '0.3.1',
		manifest: 'https://github.com/kornifex/FVTT-Genesys/releases/latest/download/manifest.json',
		download: 'https://github.com/kornifex/FVTT-Genesys/releases/latest/download/genesys.zip',
	};

	it('takes the version from the tag and downloads the archive of that release', () => {
		expect(releaseManifest(manifest, 'kornifex/FVTT-Genesys', 'v0.4.0')).toEqual({
			id: 'genesys',
			version: '0.4.0',
			manifest: 'https://github.com/kornifex/FVTT-Genesys/releases/latest/download/manifest.json',
			download: 'https://github.com/kornifex/FVTT-Genesys/releases/download/v0.4.0/genesys.zip',
		});
	});

	it('keeps the pre-release part of the version', () => {
		expect(releaseManifest(manifest, 'kornifex/FVTT-Genesys', 'v0.3.2-rc.1').version).toBe('0.3.2-rc.1');
	});
});
