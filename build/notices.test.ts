import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { notices } from './notices.ts';

type EmittedAsset = { fileName?: string; source?: string | Uint8Array };

describe('notices', () => {
	let dir: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notices-'));
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true });
	});

	it('emits each file at the root of the build, under its own name', () => {
		fs.writeFileSync(path.join(dir, 'LICENSE'), 'MIT License\n');
		fs.writeFileSync(path.join(dir, 'NOTICE.md'), '# Notices\n');

		// The hook only calls emitFile, so a context holding it stands in for Vite's.
		const emitted: EmittedAsset[] = [];
		const generateBundle = notices([path.join(dir, 'LICENSE'), path.join(dir, 'NOTICE.md')]).generateBundle as unknown as (this: {
			emitFile: (file: EmittedAsset) => void;
		}) => void;
		generateBundle.call({ emitFile: (file) => emitted.push(file) });

		expect(emitted.map(({ fileName, source }) => [fileName, String(source)])).toEqual([
			['LICENSE', 'MIT License\n'],
			['NOTICE.md', '# Notices\n'],
		]);
	});
});
