/** @file The harness's settings, read from the environment (`e2e/.env`), so that licensed installs stay out of the repo. */
import os from 'node:os';
import path from 'node:path';

/**
 * A licensed Foundry install the harness can launch.
 */
export type FoundryInstall = {
	version: number;
	/** The Node binary this Foundry version runs on. */
	node: string;
	/** Foundry's `main.js`. */
	foundry: string;
	/** A data dir holding `Config/license.json` and the world; the harness only copies from it. */
	data: string;
	/** The id of the world to copy and launch. */
	world: string;
};

type HarnessConfig = {
	installs: FoundryInstall[];
	/** The port Foundry listens on; the versions run one after the other, so they share it. */
	port: number;
	/** A Chromium or headless shell binary; Playwright's own download when undefined. */
	chromium: string | undefined;
	/** Where the world copies, builds and results go. */
	workDir: string;
	gmUser: string;
	/** Created by the GM when the world lacks it. */
	playerUser: string;
};

type Env = Record<string, string | undefined>;

/**
 * Reads the installs of the requested Foundry versions from `E2E_V<version>_*` variables.
 */
export function readConfig(env: Env, versions: number[]): HarnessConfig {
	const missing: string[] = [];
	const required = (name: string) => {
		const value = env[name];
		if (!value) missing.push(name);
		return value ?? '';
	};

	const installs = versions.map((version) => ({
		version,
		node: required(`E2E_V${version}_NODE`),
		foundry: required(`E2E_V${version}_FOUNDRY`),
		data: required(`E2E_V${version}_DATA`),
		world: required(`E2E_V${version}_WORLD`),
	}));
	if (missing.length) throw new Error(`Missing ${missing.join(', ')}: set them in e2e/.env (see e2e/README.md).`);

	return {
		installs,
		port: Number(env.E2E_PORT || 30100),
		chromium: env.E2E_CHROMIUM || undefined,
		workDir: env.E2E_WORK_DIR || path.join(os.tmpdir(), 'genesys-e2e'),
		gmUser: env.E2E_GM_USER || 'Gamemaster',
		playerUser: env.E2E_PLAYER_USER || 'Player',
	};
}
