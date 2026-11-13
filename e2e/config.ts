/** @file The harness's settings, read from the environment (`e2e/.env`), so that licensed installs stay out of the repo. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The `e2e/.env` the harness loads: the checkout's own, else that of the repo's main checkout, the parent of the git
 * dir its worktrees share (`gitCommonDir`, asked only then), since git ignores the file and a new worktree has none.
 * None when neither has one, or when the checkout is no git repo (`gitCommonDir` gives none).
 */
export function envFile(root: string, gitCommonDir: () => string | undefined): string | undefined {
	const own = path.join(root, 'e2e', '.env');
	if (fs.existsSync(own)) return own;
	const common = gitCommonDir();
	if (common === undefined) return undefined;
	const main = path.join(path.dirname(common), 'e2e', '.env');
	return fs.existsSync(main) ? main : undefined;
}

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
	/** A Chromium or headless shell binary; Playwright's own download when undefined. */
	chromium: string | undefined;
	/** The ANGLE backend Chromium draws with (`--use-angle`), such as `vulkan` for the GPU; SwiftShader, on the CPU, when undefined. */
	angle: string | undefined;
	/** Where the world copies, builds and results go: the copies and results under each checkout's own folder. */
	workDir: string;
	gmUser: string;
	/** Created by the GM when the world lacks it. */
	playerUser: string;
	/** The lowest port the pool may take: the run claims the first free range of `launches` ports from it. */
	port: number;
	/** How many Foundry launches run at once. */
	launches: number;
};

type Env = Record<string, string | undefined>;

/**
 * Reads the installs of the requested Foundry versions from `E2E_V<version>_*` variables, and the pool's size from
 * `--launches`, else `E2E_LAUNCHES`.
 */
export function readConfig(env: Env, versions: number[], { launches }: { launches?: string } = {}): HarnessConfig {
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

	const givenLaunches = launches ?? env.E2E_LAUNCHES ?? '8';
	if (!/^[1-9]\d*$/.test(givenLaunches)) {
		throw new Error(`The launches (--launches or E2E_LAUNCHES) are a whole number from 1, not ${givenLaunches}.`);
	}

	return {
		installs,
		chromium: env.E2E_CHROMIUM || undefined,
		angle: env.E2E_ANGLE || undefined,
		workDir: env.E2E_WORK_DIR || path.join(os.tmpdir(), 'genesys-e2e'),
		gmUser: env.E2E_GM_USER || 'Gamemaster',
		playerUser: env.E2E_PLAYER_USER || 'Player',
		port: Number(env.E2E_PORT || 30100),
		launches: Number(givenLaunches),
	};
}
