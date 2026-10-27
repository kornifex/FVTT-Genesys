/** @file Launches a licensed Foundry install on a fresh copy of its world, with a copy of a system build. */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
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
 * The build is copied, never linked: Foundry migrates the system's NeDB packs into LevelDB folders beside them, and
 * two versions sharing one build corrupt them. v13 no longer reads NeDB packs, so it gets the folders a v12 run
 * migrated from the same packs ({@link keepMigratedPacks}).
 */
export function prepareDataDir(install: FoundryInstall, dist: string, dataDir: string, packCache: string) {
	fs.rmSync(dataDir, { recursive: true, force: true });
	fs.mkdirSync(path.join(dataDir, 'Config'), { recursive: true });
	fs.copyFileSync(path.join(install.data, 'Config', 'license.json'), path.join(dataDir, 'Config', 'license.json'));
	fs.cpSync(path.join(install.data, 'Data', 'worlds', install.world), path.join(dataDir, 'Data', 'worlds', install.world), {
		recursive: true,
	});

	const system = systemDir(dataDir);
	fs.cpSync(dist, system, { recursive: true });
	// Later versions take the packs v12 migrated.
	if (migratesPacks(install)) return;

	const migrated = migratedPacksDir(dist, packCache);
	if (!fs.existsSync(migrated)) {
		throw new Error(`Foundry v${install.version} needs the packs migrated by a v12 run of the same build: run v12 first.`);
	}
	for (const pack of nedbPacks(dist)) fs.rmSync(path.join(system, 'packs', pack));
	fs.cpSync(migrated, path.join(system, 'packs'), { recursive: true });
}

/**
 * Keeps the LevelDB packs a stopped v12 server migrated, for the v13 runs of the same build.
 */
export function keepMigratedPacks(install: FoundryInstall, dist: string, dataDir: string, packCache: string) {
	if (!migratesPacks(install) || hasMigratedPacks(dist, packCache)) return;
	// Kept once per content of the packs, and moved in place whole: another version may be copying them already.
	const migrated = migratedPacksDir(dist, packCache);
	const partial = `${migrated}.partial`;
	fs.rmSync(partial, { recursive: true, force: true });
	for (const pack of nedbPacks(dist)) {
		const folder = pack.replace(/\.db$/, '');
		fs.cpSync(path.join(systemDir(dataDir), 'packs', folder), path.join(partial, folder), { recursive: true });
	}
	fs.renameSync(partial, migrated);
}

/**
 * Whether this version migrates the system's NeDB packs into LevelDB, for the later versions to take.
 */
export function migratesPacks(install: Pick<FoundryInstall, 'version'>) {
	// v12: the only version that reads NeDB packs.
	return install.version === 12;
}

/**
 * Whether a v12 run kept the migrated packs of this build's NeDB packs.
 */
export function hasMigratedPacks(dist: string, packCache: string) {
	return fs.existsSync(migratedPacksDir(dist, packCache));
}

/**
 * Starts Foundry on the data dir and resolves once its world is ready to be joined.
 */
export async function launchFoundry(install: FoundryInstall, dataDir: string): Promise<FoundryServer> {
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
		if (fs.readFileSync(log, 'utf8').includes('Launching World | Complete')) break;
		if (exited || waited >= 180) {
			await stop();
			throw new Error(`Foundry v${install.version} did not launch ${install.world}; see ${log}`);
		}
		await sleep(1000);
	}
	// Joining right after the launch completes crashes it (null invitation links), and game.ready never comes.
	await sleep(8000);

	return { url: `http://localhost:${install.port}`, log, stop };
}

function systemDir(dataDir: string) {
	return path.join(dataDir, 'Data', 'systems', 'genesys');
}

function nedbPacks(dist: string) {
	return fs.readdirSync(path.join(dist, 'packs')).filter((file) => file.endsWith('.db'));
}

function migratedPacksDir(dist: string, packCache: string) {
	const hash = createHash('sha256');
	for (const pack of nedbPacks(dist)) hash.update(pack).update(fs.readFileSync(path.join(dist, 'packs', pack)));
	return path.join(packCache, hash.digest('hex').slice(0, 16));
}
