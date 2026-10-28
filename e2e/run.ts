/** @file `pnpm e2e <scenario.ts or folder>... [--versions 13] [--dist dist] [--compare <git ref>]`: runs scenarios on each Foundry version. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

import { type FoundryInstall, readConfig } from './config.ts';
import { runScenario, type ScenarioModule } from './scenario.ts';
import { launchFoundry, prepareDataDir } from './server.ts';
import { diffSteps, failsRun, fatalStep, runSummary, type Step, stepLine } from './steps.ts';

const root = path.resolve(import.meta.dirname, '..');
const envFile = path.join(import.meta.dirname, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const usage = 'Usage: pnpm e2e <scenario.ts or folder>... [--versions 13] [--dist dist] [--compare <git ref>]';
const { values: options, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		versions: { type: 'string', default: '13' },
		dist: { type: 'string' },
		compare: { type: 'string' },
	},
});
if (!positionals.length) {
	console.error(usage);
	process.exit(2);
}

const scenarios = await Promise.all(scenarioFiles(positionals).map(loadScenario));
const duplicate = scenarios.find((scenario, index) => scenarios.findIndex(({ name }) => name === scenario.name) !== index);
if (duplicate) throw new Error(`Two scenarios are named ${duplicate.name}: their results would share a folder.`);

const config = readConfig(process.env, options.versions.split(',').map(Number));
// Without --dist, the working tree is built, so that a stale dist is never tested.
const headDist = options.dist ? path.resolve(options.dist) : buildWorkingTree();
if (!fs.existsSync(path.join(headDist, 'system.json'))) throw new Error(`${headDist} holds no build.`);

// The build compared against runs first on each version, so that the two runs read alike in the log.
const builds = [
	...(options.compare ? [{ label: options.compare, dist: buildRef(options.compare) }] : []),
	{ label: 'head', dist: headDist },
];
// The scenarios share one world and one launch, one after the other; an isolated scenario gets its own.
const launches = [
	scenarios.filter((scenario) => !scenario.isolated),
	...scenarios.filter((scenario) => scenario.isolated).map((scenario) => [scenario]),
].filter((group) => group.length);

// The versions run at once, each on its own port.
const browser = await chromium.launch({
	executablePath: config.chromium,
	args: config.angle ? [`--use-angle=${config.angle}`] : [],
});
const logs = new Map<string, Step[]>();
try {
	await Promise.all(config.installs.map(runVersion));
} finally {
	await browser.close();
}

if (options.compare) {
	for (const install of config.installs) {
		for (const scenario of scenarios) {
			const diffs = diffSteps(
				logs.get(logKey(runName(install.version, options.compare), scenario.name)) ?? [],
				logs.get(logKey(runName(install.version, 'head'), scenario.name)) ?? [],
			);
			console.log(`\n=== v${install.version} ${scenario.name}: ${diffs.length} step(s) differ between ${options.compare} and head`);
			for (const diff of diffs) {
				console.log(`${diff.name}\n  ${options.compare}: ${JSON.stringify(diff.base)}\n  head: ${JSON.stringify(diff.head)}`);
			}
		}
	}
}

console.log('\n=== Summary');
for (const install of config.installs) {
	for (const build of builds) {
		const run = runName(install.version, build.label);
		const runScenarios = scenarios.map(({ name }) => ({ scenario: name, steps: logs.get(logKey(run, name)) ?? [] }));
		console.log(runSummary(run, runScenarios).join('\n'));
	}
}
console.log(`\nStep logs and server logs: ${path.join(config.workDir, 'results')}, ${path.join(config.workDir, 'runs')}`);
const failed = config.installs.some((install) =>
	builds.some((build) =>
		scenarios.some(({ name }) =>
			failsRun(logs.get(logKey(runName(install.version, build.label), name)) ?? [], { compared: build.label !== 'head' }),
		),
	),
);
if (failed) process.exitCode = 1;

/**
 * Runs every launch of one Foundry version, build after build.
 */
async function runVersion(install: FoundryInstall) {
	for (const build of builds) {
		const run = runName(install.version, build.label);
		for (const group of launches) {
			try {
				await runLaunch(install, build, group);
			} catch (error) {
				// A world that fails to launch fails its scenarios, and the suite goes on to its summary.
				for (const scenario of group.filter(({ name }) => !logs.has(logKey(run, name)))) {
					const step = fatalStep(error);
					console.log(stepLine(`${run} ${scenario.name}`, step));
					logs.set(logKey(run, scenario.name), [step]);
				}
			}
		}
	}
}

/**
 * Launches Foundry on a fresh copy of the world, and runs the scenarios on it one after the other.
 */
async function runLaunch(install: FoundryInstall, build: { label: string; dist: string }, group: LoadedScenario[]) {
	const run = runName(install.version, build.label);
	const dataDir = path.join(config.workDir, 'runs', safeFileName(group[0].isolated ? `${run} ${group[0].name}` : run));
	prepareDataDir(install, build.dist, dataDir);
	const server = await launchFoundry(install, dataDir);
	try {
		for (const scenario of group) {
			const label = scenarios.length > 1 ? `${run} ${scenario.name}` : run;
			const steps = await runScenario(scenario.run, {
				browser,
				url: server.url,
				version: install.version,
				gmUser: config.gmUser,
				playerUser: config.playerUser,
				needsCanvas: scenario.needsCanvas,
				onStep: (step) => console.log(stepLine(label, step)),
			});
			logs.set(logKey(run, scenario.name), steps);
			const resultsDir = path.join(config.workDir, 'results', scenario.name);
			fs.mkdirSync(resultsDir, { recursive: true });
			fs.writeFileSync(path.join(resultsDir, `${safeFileName(run)}.json`), JSON.stringify(steps, null, '\t'));
		}
	} finally {
		await server.stop();
	}
}

/**
 * The scenario files given, a folder standing for the `.ts` files it holds.
 */
function scenarioFiles(paths: string[]) {
	return paths.flatMap((given) => {
		const file = path.resolve(given);
		if (!fs.statSync(file).isDirectory()) return [file];
		return fs
			.readdirSync(file)
			.filter((name) => name.endsWith('.ts'))
			.sort()
			.map((name) => path.join(file, name));
	});
}

type LoadedScenario = Awaited<ReturnType<typeof loadScenario>>;

async function loadScenario(file: string) {
	const module = (await import(pathToFileURL(file).href)) as Partial<ScenarioModule>;
	if (typeof module.run !== 'function') throw new Error(`${file} exports no run function.`);
	return {
		name: path.basename(file).replace(/\.ts$/, ''),
		run: module.run,
		isolated: module.isolated === true,
		needsCanvas: module.needsCanvas === true,
	};
}

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

function logKey(run: string, scenario: string) {
	return `${run}|${scenario}`;
}

function safeFileName(name: string) {
	return name.replace(/[^\w.-]+/g, '-');
}
