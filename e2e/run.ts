/** @file `pnpm e2e <scenario.ts> [--versions 12,13] [--dist dist] [--compare <git ref>]`: runs a scenario on each Foundry version. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

import { readConfig } from './config.ts';
import { runScenario, type Scenario } from './scenario.ts';
import { keepMigratedPacks, launchFoundry, prepareDataDir } from './server.ts';
import { diffSteps, type Step } from './steps.ts';

const root = path.resolve(import.meta.dirname, '..');
const envFile = path.join(import.meta.dirname, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { values: options, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		versions: { type: 'string', default: '12,13' },
		dist: { type: 'string' },
		compare: { type: 'string' },
	},
});
if (positionals.length !== 1) {
	console.error('Usage: pnpm e2e <scenario.ts> [--versions 12,13] [--dist dist] [--compare <git ref>]');
	process.exit(2);
}

const scenarioFile = path.resolve(positionals[0]);
const scenarioName = path.basename(scenarioFile).replace(/\.ts$/, '');
const { run: scenario } = (await import(pathToFileURL(scenarioFile).href)) as { run?: Scenario };
if (typeof scenario !== 'function') throw new Error(`${scenarioFile} exports no run function.`);

const config = readConfig(process.env, options.versions.split(',').map(Number));
// Without --dist, the working tree is built, so that a stale dist is never tested.
const headDist = options.dist ? path.resolve(options.dist) : buildWorkingTree();
if (!fs.existsSync(path.join(headDist, 'system.json'))) throw new Error(`${headDist} holds no build.`);

// The build compared against runs first on each version, so that the two runs read alike in the log.
const builds = [
	...(options.compare ? [{ label: options.compare, dist: buildRef(options.compare) }] : []),
	{ label: 'head', dist: headDist },
];
const packCache = path.join(config.workDir, 'packs');
const resultsDir = path.join(config.workDir, 'results', scenarioName);
fs.mkdirSync(resultsDir, { recursive: true });

const browser = await chromium.launch({ executablePath: config.chromium });
const logs = new Map<string, Step[]>();
try {
	for (const install of config.installs) {
		for (const build of builds) {
			const run = runName(install.version, build.label);
			const dataDir = path.join(config.workDir, 'runs', safeFileName(run));
			prepareDataDir(install, build.dist, dataDir, packCache);
			const server = await launchFoundry(install, dataDir, config.port);
			let steps: Step[];
			try {
				steps = await runScenario(scenario, {
					browser,
					url: server.url,
					version: install.version,
					gmUser: config.gmUser,
					playerUser: config.playerUser,
					onStep: (step) => console.log(`[${run}] ${step.name} ${JSON.stringify(step.value)}`),
				});
			} finally {
				await server.stop();
			}
			keepMigratedPacks(install, build.dist, dataDir, packCache);
			logs.set(run, steps);
			fs.writeFileSync(path.join(resultsDir, `${safeFileName(run)}.json`), JSON.stringify(steps, null, '\t'));
		}
	}
} finally {
	await browser.close();
}

if (options.compare) {
	for (const install of config.installs) {
		const diffs = diffSteps(
			logs.get(runName(install.version, options.compare)) ?? [],
			logs.get(runName(install.version, 'head')) ?? [],
		);
		console.log(`\n=== v${install.version}: ${diffs.length} step(s) differ between ${options.compare} and head`);
		for (const diff of diffs) {
			console.log(`${diff.name}\n  ${options.compare}: ${JSON.stringify(diff.base)}\n  head: ${JSON.stringify(diff.head)}`);
		}
	}
}
console.log(`\nStep logs and server logs: ${resultsDir}, ${path.join(config.workDir, 'runs')}`);
if ([...logs.values()].some((steps) => steps.some((step) => step.name === 'FATAL'))) process.exitCode = 1;

/**
 * Builds a git ref of this repo, once per commit, and returns its `dist`.
 */
function buildRef(ref: string) {
	const commit = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
	const dir = path.join(config.workDir, 'builds', commit);
	const dist = path.join(dir, 'dist');
	if (fs.existsSync(path.join(dist, 'system.json'))) return dist;

	console.error(`Building ${ref} (${commit.slice(0, 7)}) in ${dir}`);
	fs.rmSync(dir, { recursive: true, force: true });
	fs.mkdirSync(dir, { recursive: true });
	const archive = path.join(dir, 'source.tar');
	quietly('git', ['archive', `--output=${archive}`, commit], root);
	quietly('tar', ['-xf', archive, '-C', dir], dir);
	quietly('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], dir);
	quietly('pnpm', ['build'], dir);
	return dist;
}

function buildWorkingTree() {
	console.error('Building the working tree');
	quietly('pnpm', ['build'], root);
	return path.join(root, 'dist');
}

/**
 * Runs a command, and shows its output only when it fails.
 */
function quietly(command: string, args: string[], cwd: string) {
	try {
		execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
	} catch (error) {
		const { stdout, stderr } = error as { stdout?: string; stderr?: string };
		console.error(`${stdout ?? ''}${stderr ?? ''}`);
		throw error;
	}
}

function runName(version: number, buildLabel: string) {
	return `v${version} ${buildLabel}`;
}

function safeFileName(name: string) {
	return name.replace(/[^\w.-]+/g, '-');
}
