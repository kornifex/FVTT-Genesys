/** @file Ships the repo's licence and notice files in the build, so that every copy of the system carries them. */

import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

/**
 * Emit each of `files`, paths relative to the repo root, at the root of the build output under its own name.
 */
export function notices(files: string[]): Plugin {
	return {
		name: 'genesys-notices',

		generateBundle() {
			for (const file of files) {
				this.emitFile({ type: 'asset', fileName: path.basename(file), source: fs.readFileSync(file) });
			}
		},
	};
}
