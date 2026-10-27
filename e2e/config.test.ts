import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readConfig } from './config.ts';

const v12 = {
	E2E_V12_NODE: '/node20/bin/node',
	E2E_V12_FOUNDRY: '/foundry-12/resources/app/main.js',
	E2E_V12_DATA: '/foundrydata-12',
	E2E_V12_WORLD: 'genesys-248',
};

const v13 = {
	E2E_V13_NODE: '/usr/bin/node',
	E2E_V13_FOUNDRY: '/foundry-13/main.js',
	E2E_V13_DATA: '/foundrydata-13',
	E2E_V13_WORLD: 'genesys-13',
};

describe('readConfig', () => {
	it('reads each requested version from its own variables', () => {
		const config = readConfig({ ...v12, ...v13 }, [12, 13]);

		expect(config.installs).toEqual([
			{
				version: 12,
				node: '/node20/bin/node',
				foundry: '/foundry-12/resources/app/main.js',
				data: '/foundrydata-12',
				world: 'genesys-248',
				port: 30100,
			},
			{
				version: 13,
				node: '/usr/bin/node',
				foundry: '/foundry-13/main.js',
				data: '/foundrydata-13',
				world: 'genesys-13',
				port: 30101,
			},
		]);
	});

	it('names every missing variable of the requested versions at once', () => {
		const { E2E_V12_WORLD: _, ...v12WithoutWorld } = v12;

		expect(() => readConfig({ ...v12WithoutWorld, E2E_V13_NODE: '/usr/bin/node', E2E_V13_DATA: '' }, [12, 13])).toThrow(
			'Missing E2E_V12_WORLD, E2E_V13_FOUNDRY, E2E_V13_DATA, E2E_V13_WORLD: set them in e2e/.env (see e2e/README.md).',
		);
	});

	it('defaults the optional settings', () => {
		const { installs: _, ...settings } = readConfig(v12, [12]);

		expect(settings).toEqual({
			chromium: undefined,
			workDir: path.join(os.tmpdir(), 'genesys-e2e'),
			gmUser: 'Gamemaster',
			playerUser: 'Player',
		});
	});

	it('reads the optional settings', () => {
		const { installs: _, ...settings } = readConfig(
			{
				...v12,
				E2E_CHROMIUM: '/chrome-headless-shell',
				E2E_WORK_DIR: '/scratch/e2e',
				E2E_GM_USER: 'MJ',
				E2E_PLAYER_USER: 'Joueur',
			},
			[12],
		);

		expect(settings).toEqual({
			chromium: '/chrome-headless-shell',
			workDir: '/scratch/e2e',
			gmUser: 'MJ',
			playerUser: 'Joueur',
		});
	});

	it('gives each version its own port, from E2E_PORT on, so that they run at once', () => {
		const ports = (env: Record<string, string>) => readConfig(env, [12, 13]).installs.map((install) => install.port);

		expect(ports({ ...v12, ...v13 })).toEqual([30100, 30101]);
		expect(ports({ ...v12, ...v13, E2E_PORT: '30012' })).toEqual([30012, 30013]);
	});

	it('ignores the versions not requested', () => {
		expect(readConfig(v12, [12]).installs.map((install) => install.version)).toEqual([12]);
	});
});
