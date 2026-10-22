/** @file Writes the release's version and download into `dist/system.json`: `node build/pinRelease.ts <owner/repo> <tag>`. */

import fs from 'fs';
import process from 'process';

import { releaseManifest } from './releaseManifest.ts';

const [repository, tag] = process.argv.slice(2);
if (!repository || !tag) {
	throw new Error('Usage: node build/pinRelease.ts <owner/repo> <tag>');
}

const manifest = JSON.parse(fs.readFileSync('dist/system.json', 'utf8')) as Record<string, unknown>;
fs.writeFileSync('dist/system.json', JSON.stringify(releaseManifest(manifest, repository, tag)));
