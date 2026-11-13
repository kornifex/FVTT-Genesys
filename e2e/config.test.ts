import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { envFile, readConfig } from './config.ts';

describe('envFile', () => {
	let main: string;
	let worktree: string;
	const gitCommonDir = () => path.join(main, '.git');
	const writeEnv = (root: string) => {
		fs.mkdirSync(path.join(root, 'e2e'), { recursive: true });
		fs.writeFileSync(path.join(root, 'e2e', '.env'), '');
	};

	beforeEach(() => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genesys-env-'));
		main = path.join(dir, 'main');
		worktree = path.join(main, '.claude', 'worktrees', 'agent');
		fs.mkdirSync(path.join(main, '.git'), { recursive: true });
		fs.mkdirSync(worktree, { recursive: true });
	});

	afterEach(() => fs.rmSync(path.dirname(main), { recursive: true, force: true }));

	it("takes the checkout's own e2e/.env, without asking git", () => {
		writeEnv(main);
		writeEnv(worktree);

		expect(
			envFile(worktree, () => {
				throw new Error('git asked');
			}),
		).toBe(path.join(worktree, 'e2e', '.env'));
	});

	it("takes the main checkout's e2e/.env from a worktree that has none", () => {
		writeEnv(main);

		expect(envFile(worktree, gitCommonDir)).toBe(path.join(main, 'e2e', '.env'));
	});

	it('finds none when neither checkout has one', () => {
		expect(envFile(worktree, gitCommonDir)).toBeUndefined();
	});
});

const v13 = {
	E2E_V13_NODE: '/node22/bin/node',
	E2E_V13_FOUNDRY: '/foundry-13/main.js',
	E2E_V13_DATA: '/foundrydata-13',
	E2E_V13_WORLD: 'genesys-248',
};

const v14 = {
	E2E_V14_NODE: '/usr/bin/node',
	E2E_V14_FOUNDRY: '/foundry-14/main.js',
	E2E_V14_DATA: '/foundrydata-14',
	E2E_V14_WORLD: 'genesys-14',
};

describe('readConfig', () => {
	it('reads each requested version from its own variables', () => {
		const config = readConfig({ ...v13, ...v14 }, [13, 14]);

		expect(config.installs).toEqual([
			{
				version: 13,
				node: '/node22/bin/node',
				foundry: '/foundry-13/main.js',
				data: '/foundrydata-13',
				world: 'genesys-248',
			},
			{
				version: 14,
				node: '/usr/bin/node',
				foundry: '/foundry-14/main.js',
				data: '/foundrydata-14',
				world: 'genesys-14',
			},
		]);
	});

	it('names every missing variable of the requested versions at once', () => {
		const { E2E_V13_WORLD: _, ...v13WithoutWorld } = v13;

		expect(() => readConfig({ ...v13WithoutWorld, E2E_V14_NODE: '/usr/bin/node', E2E_V14_DATA: '' }, [13, 14])).toThrow(
			'Missing E2E_V13_WORLD, E2E_V14_FOUNDRY, E2E_V14_DATA, E2E_V14_WORLD: set them in e2e/.env (see e2e/README.md).',
		);
	});

	it('defaults the optional settings', () => {
		const { installs: _, ...settings } = readConfig(v13, [13]);

		expect(settings).toEqual({
			chromium: undefined,
			angle: undefined,
			workDir: path.join(os.tmpdir(), 'genesys-e2e'),
			gmUser: 'Gamemaster',
			playerUser: 'Player',
			port: 30100,
			launches: 8,
		});
	});

	it('reads the optional settings', () => {
		const { installs: _, ...settings } = readConfig(
			{
				...v13,
				E2E_CHROMIUM: '/chrome-headless-shell',
				E2E_ANGLE: 'vulkan',
				E2E_WORK_DIR: '/scratch/e2e',
				E2E_GM_USER: 'MJ',
				E2E_PLAYER_USER: 'Joueur',
				E2E_PORT: '30012',
				E2E_LAUNCHES: '3',
			},
			[13],
		);

		expect(settings).toEqual({
			chromium: '/chrome-headless-shell',
			angle: 'vulkan',
			workDir: '/scratch/e2e',
			gmUser: 'MJ',
			playerUser: 'Joueur',
			port: 30012,
			launches: 3,
		});
	});

	it('takes the launches given on the command line over E2E_LAUNCHES', () => {
		expect(readConfig({ ...v13, E2E_LAUNCHES: '3' }, [13], { launches: '1' }).launches).toBe(1);
	});

	it.each(['0', '-2', '1.5', 'eight'])('refuses %s launches', (launches) => {
		expect(() => readConfig({ ...v13, E2E_LAUNCHES: launches }, [13])).toThrow(
			`The launches (--launches or E2E_LAUNCHES) are a whole number from 1, not ${launches}.`,
		);
	});

	it('ignores the versions not requested', () => {
		expect(readConfig(v13, [13]).installs.map((install) => install.version)).toEqual([13]);
	});
});
