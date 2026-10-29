/** @file Serves the system's data (manifest, languages), written in YAML under `yaml/`, as the JSON files Foundry reads. */

import fs from 'fs';
import { load } from 'js-yaml';
import path from 'path';
import type { Plugin } from 'vite';

/**
 * Read every `.yml` file under `dir` and convert it to compact JSON, keyed by its path relative to `dir` with a `.json` extension.
 */
export function readYamlData(dir: string): Map<string, string> {
	const files = fs
		.readdirSync(dir, { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.yml'))
		.map((file) => file.split(path.sep).join('/'))
		.sort();

	return new Map(
		files.map((file) => [file.replace(/\.yml$/, '.json'), JSON.stringify(load(fs.readFileSync(path.join(dir, file), 'utf8')))]),
	);
}

/**
 * Emit the JSON of `dir`'s YAML files into the build output, serve it from the dev server, and reload the page when one changes.
 */
export function yamlData(dir: string): Plugin {
	return {
		name: 'genesys-yaml-data',

		generateBundle() {
			for (const [fileName, source] of readYamlData(dir)) {
				this.emitFile({ type: 'asset', fileName, source });
			}
		},

		configureServer(server) {
			const prefix = `${server.config.base.replace(/\/$/, '')}/`;
			let data = readYamlData(dir);

			server.middlewares.use((req, res, next) => {
				const source = req.url?.startsWith(prefix) ? data.get(req.url.slice(prefix.length).split('?')[0]) : undefined;
				if (source === undefined) {
					next();
					return;
				}

				res.setHeader('Content-Type', 'application/json');
				res.end(source);
			});

			// Foundry reads the languages once, when the page loads: a changed file needs a full reload.
			const root = path.resolve(dir);
			server.watcher.add(root);
			server.watcher.on('all', (event, file) => {
				if (
					['add', 'change', 'unlink'].includes(event) &&
					path.resolve(file).startsWith(root + path.sep) &&
					file.endsWith('.yml')
				) {
					data = readYamlData(dir);
					server.ws.send({ type: 'full-reload' });
				}
			});
		},
	};
}
