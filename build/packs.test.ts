import { extractPack } from '@foundryvtt/foundryvtt-cli';
import fs from 'fs';
import { load } from 'js-yaml';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { compilePacks } from './packs.ts';

const sourceDir = path.resolve(import.meta.dirname, '../packs');

function readDocuments(dir: string, extension: string, parse: (text: string) => unknown) {
	return fs
		.readdirSync(dir)
		.filter((file) => file.endsWith(extension))
		.map((file) => parse(fs.readFileSync(path.join(dir, file), 'utf8')) as { _id: string; _key: string })
		.sort((a, b) => a._id.localeCompare(b._id));
}

describe('compilePacks', () => {
	let dest: string;

	beforeEach(() => {
		dest = fs.mkdtempSync(path.join(os.tmpdir(), 'packs-'));
	});

	afterEach(() => {
		fs.rmSync(dest, { recursive: true });
	});

	it('keys every source document by its id, since the compiler skips a document without a key', () => {
		for (const pack of fs.readdirSync(sourceDir)) {
			for (const document of readDocuments(path.join(sourceDir, pack), '.yml', load)) {
				expect(document._key).toBe(`!items!${document._id}`);
			}
		}
	});

	it('compiles each source document of the Skills Compendium into its pack', async () => {
		await compilePacks(sourceDir, dest);
		await extractPack(path.join(dest, 'crb-skills'), path.join(dest, 'extracted'));

		const sources = readDocuments(path.join(sourceDir, 'crb-skills'), '.yml', load);
		expect(sources).toHaveLength(37);
		expect(readDocuments(path.join(dest, 'extracted'), '.json', JSON.parse)).toEqual(sources);
	});
});
