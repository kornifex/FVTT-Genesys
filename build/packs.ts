/** @file Compiles the system's compendium packs, written in YAML under `packs/`, to the LevelDB folders Foundry reads. */

import { compilePack } from '@foundryvtt/foundryvtt-cli';
import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

/**
 * Compile each folder of `dir`, one YAML file per document, to a LevelDB pack of the same name under `dest`.
 */
export async function compilePacks(dir: string, dest: string) {
	const packs = fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);

	for (const pack of packs) {
		await compilePack(path.join(dir, pack), path.join(dest, pack), { yaml: true });
	}
}

/**
 * Write the packs of `dir` into the build output's `packs` folder.
 */
export function packs(dir: string): Plugin {
	return {
		name: 'genesys-packs',
		// Foundry reads the packs from the installed system folder, never from the dev server.
		apply: 'build',

		async writeBundle({ dir: outDir }) {
			if (outDir) await compilePacks(dir, path.join(outDir, 'packs'));
		},
	};
}
