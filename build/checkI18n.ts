/** @file Checks that the keys used in code and templates exist in English, that English has no unused key, and lists what French lacks. */

import fs from 'fs';
import { load } from 'js-yaml';
import path from 'path';
import process from 'process';

import { checkKeys, keyReferences } from './i18nKeys.ts';

const SOURCES = [
	{ dir: 'src', extensions: ['.ts', '.vue'] },
	{ dir: 'public/templates', extensions: ['.hbs'] },
];

const references = new Map<string, string[]>();
for (const { dir, extensions } of SOURCES) {
	const files = fs
		.readdirSync(dir, { recursive: true, encoding: 'utf8' })
		// Tests localize made-up keys.
		.filter((file) => extensions.includes(path.extname(file)) && !file.endsWith('.test.ts'))
		.map((file) => path.join(dir, file).split(path.sep).join('/'))
		.sort();

	for (const file of files) {
		for (const key of keyReferences(fs.readFileSync(file, 'utf8'))) {
			references.set(key, [...new Set([...(references.get(key) ?? []), file])]);
		}
	}
}

const language = (lang: string): unknown => load(fs.readFileSync(`yaml/lang/${lang}.yml`, 'utf8'));
const { missing, unused, untranslated } = checkKeys(references, language('en'), language('fr'));

for (const { key, files } of missing) {
	console.error(`Missing from en: ${key} (${files.join(', ')})`);
}
for (const key of unused) {
	console.error(`Unused in en: ${key}`);
}
for (const key of untranslated) {
	console.log(`Missing from fr: ${key}`);
}

if (missing.length > 0 || unused.length > 0) {
	process.exitCode = 1;
}
