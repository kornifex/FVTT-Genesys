/** @file Launches a licensed Foundry install on a fresh copy of its world, with a copy of a system build. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import type { FoundryInstall } from './config.ts';

type FoundryServer = {
	url: string;
	log: string;
	stop(): Promise<void>;
};

/**
 * Creates a data dir with the install's licence, a copy of its world and a copy of `dist` as the genesys system.
 *
 * The build is copied, never linked: Foundry writes into the system's LevelDB packs, and two versions sharing one build
 * corrupt them.
 */
export function prepareDataDir(install: FoundryInstall, dist: string, dataDir: string) {
	fs.rmSync(dataDir, { recursive: true, force: true });
	fs.mkdirSync(path.join(dataDir, 'Config'), { recursive: true });
	fs.copyFileSync(path.join(install.data, 'Config', 'license.json'), path.join(dataDir, 'Config', 'license.json'));
	fs.cpSync(path.join(install.data, 'Data', 'worlds', install.world), path.join(dataDir, 'Data', 'worlds', install.world), {
		recursive: true,
	});
	fs.cpSync(dist, path.join(dataDir, 'Data', 'systems', 'genesys'), { recursive: true });
}

/**
 * Starts Foundry on the data dir and resolves once its world is ready to be joined: under `routePrefix` when given, as
 * a Foundry behind a reverse proxy that serves it at a path is.
 */
export async function launchFoundry(install: FoundryInstall, dataDir: string, routePrefix?: string): Promise<FoundryServer> {
	// The route prefix is an option of the server's options.json, read from the data dir's Config as it starts.
	if (routePrefix) fs.writeFileSync(path.join(dataDir, 'Config', 'options.json'), JSON.stringify({ routePrefix }));
	const log = path.join(dataDir, 'server.log');
	const logFile = fs.openSync(log, 'w');
	const server = spawn(
		install.node,
		[install.foundry, `--dataPath=${dataDir}`, `--port=${install.port}`, `--world=${install.world}`, '--noupnp'],
		{
			stdio: ['ignore', logFile, logFile],
		},
	);
	fs.closeSync(logFile);
	let exited = false;
	const exit = new Promise<void>((resolve) =>
		server.once('exit', () => {
			exited = true;
			resolve();
		}),
	);

	const stop = async () => {
		if (exited) return;
		server.kill('SIGTERM');
		await Promise.race([exit, sleep(15_000)]);
		if (!exited) server.kill('SIGKILL');
		await exit;
	};

	for (let waited = 0; ; waited += 1) {
		const output = fs.readFileSync(log, 'utf8');
		if (output.includes('Launching World | Complete')) break;
		// Foundry refuses at once a world whose system doesn't declare this version compatible, and then waits on its setup page.
		if (output.includes('is not available to auto-launch')) {
			await stop();
			throw new Error(
				`Foundry v${install.version} refused to launch ${install.world}: its system's compatibility may exclude this version; see ${log}`,
			);
		}
		if (exited || waited >= 180) {
			await stop();
			throw new Error(`Foundry v${install.version} did not launch ${install.world}; see ${log}`);
		}
		await sleep(1000);
	}
	// Joining right after the launch completes crashes it (null invitation links), and game.ready never comes.
	await sleep(8000);

	return { url: `http://localhost:${install.port}${routePrefix ? `/${routePrefix}` : ''}`, log, stop };
}
