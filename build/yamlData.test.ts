import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readYamlData } from './yamlData';

describe('readYamlData', () => {
	let dir: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-data-'));
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true });
	});

	it('converts every YAML file to compact JSON at the same path', () => {
		fs.writeFileSync(path.join(dir, 'system.yml'), 'id: genesys\ncompatibility:\n  minimum: 12\n');
		fs.mkdirSync(path.join(dir, 'lang'));
		fs.writeFileSync(path.join(dir, 'lang', 'en.yml'), 'Genesys:\n  Labels:\n    Name: "Name"\n');
		fs.writeFileSync(path.join(dir, 'notes.txt'), 'not data');

		expect(readYamlData(dir)).toEqual(
			new Map([
				['lang/en.json', '{"Genesys":{"Labels":{"Name":"Name"}}}'],
				['system.json', '{"id":"genesys","compatibility":{"minimum":12}}'],
			]),
		);
	});
});
