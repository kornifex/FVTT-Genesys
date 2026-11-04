/**
 * @file `pnpm e2e <scenario.ts or folder>... [--part a,b] [--versions 13,14] [--dist dist] [--compare <git ref>
 * [--fresh]] [--verbose]`: runs scenarios on each Foundry version.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

import { type Baseline, baselineFile, baselineSteps, cacheable, mergeBaseline, planBase } from './baseline.ts';
import { type FoundryInstall, readConfig } from './config.ts';
import { runScenario, type ScenarioModule } from './scenario.ts';
import { launchFoundry, prepareDataDir } from './server.ts';
import { diffSteps, failsRun, fatalStep, runSummary, type Step, stepLine, type StepLog } from './steps.ts';

const root = path.resolve(import.meta.dirname, '..');
const envFile = path.join(import.meta.dirname, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const usage =
	'Usage: pnpm e2e <scenario.ts or folder>... [--part a,b] [--versions 13,14] [--dist dist] [--compare <git ref> [--fresh]] [--verbose]';
const { values: options, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		part: { type: 'string' },
		versions: { type: 'string', default: '13,14' },
		dist: { type: 'string' },
		compare: { type: 'string' },
		fresh: { type: 'boolean', default: false },
		verbose: { type: 'boolean', default: false },
	},
});
if (!positionals.length) {
	console.error(usage);
	process.exit(2);
}

const scenarios = await Promise.all(scenarioFiles(positionals).map(loadScenario));
const duplicate = scenarios.find((scenario, index) => scenarios.findIndex(({ name }) => name === scenario.name) !== index);
if (duplicate) throw new Error(`Two scenarios are named ${duplicate.name}: their results would share a folder.`);
// A part's name is unique only within its scenario.
if (options.part !== undefined && scenarios.length !== 1) throw new Error('--part takes a single scenario file.');
const parts = options.part?.split(',').filter(Boolean);
if (parts?.length === 0) throw new Error('--part takes the names of parts, separated by commas.');
if (options.fresh && options.compare === undefined) throw new Error('--fresh goes with --compare, whose cache it ignores.');

const config = readConfig(process.env, options.versions.split(',').map(Number));
// Without --dist, the working tree is built, so that a stale dist is never tested.
const headDist = options.dist ? path.resolve(options.dist) : buildWorkingTree();
if (!fs.existsSync(path.join(headDist, 'system.json'))) throw new Error(`${headDist} holds no build.`);

// The build compared against runs first on each version, so that the two runs read alike in the log.
const base = options.compare ? { label: options.compare, commit: commitOf(options.compare) } : undefined;
const builds = [...(base ? [base] : []), { label: 'head' }];
// The scenarios share one world and one launch, one after the other; an isolated scenario gets its own.
const launches = [
	scenarios.filter((scenario) => !scenario.isolated),
	...scenarios.filter((scenario) => scenario.isolated).map((scenario) => [scenario]),
].filter((group) => group.length);

// What each scenario runs on each version and build: on the build compared against, only the parts its cached
// baseline lacks. Planned before any launch, so that the base build is made only when one of them needs it, and before
// the versions start: a build blocks the process. The harness's unit tests change no step log.
const harnessSources = fs
	.readdirSync(import.meta.dirname)
	.filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
	.sort()
	.map((name) => fs.readFileSync(path.join(import.meta.dirname, name), 'utf8'));
const plans = new Map<string, Plan>();
for (const install of config.installs) {
	for (const scenario of scenarios) {
		if (base) plans.set(logKey(runName(install.version, base.label), scenario.name), readBasePlan(install, base.commit, scenario));
		plans.set(logKey(runName(install.version, 'head'), scenario.name), { run: { parts } });
	}
}
const dists = new Map([['head', headDist]]);
const baseRuns =
	base && config.installs.some((install) => scenarios.some((scenario) => planOf(runName(install.version, base.label), scenario).run));
if (base && baseRuns) dists.set(base.label, buildRef(base.label, base.commit));

// The versions run at once, each on its own port.
const browser = await chromium.launch({
	executablePath: config.chromium,
	args: config.angle ? [`--use-angle=${config.angle}`] : [],
});
const results = new Map<string, StepLog>();
try {
	await Promise.all(config.installs.map(runVersion));
} finally {
	await browser.close();
}

// The step log each run is judged and compared by, and saved as: on the build compared against, the cached baseline
// with the run's parts added, which goes back to the cache.
const logs = new Map<string, Step[]>();
for (const install of config.installs) {
	for (const build of builds) {
		const run = runName(install.version, build.label);
		for (const scenario of scenarios) {
			const key = logKey(run, scenario.name);
			const plan = planOf(run, scenario);
			const result = results.get(key);
			const baseline = plan.baselineFile && result ? mergeBaseline(plan.baseline, result) : plan.baseline;
			if (plan.baselineFile && result && cacheable(result)) writeAtomically(plan.baselineFile, JSON.stringify(baseline));
			const steps = plan.baselineFile ? (baseline ? baselineSteps(baseline, parts) : []) : result?.steps ?? [];
			logs.set(key, steps);
			const resultsDir = path.join(config.workDir, 'results', scenario.name);
			fs.mkdirSync(resultsDir, { recursive: true });
			fs.writeFileSync(path.join(resultsDir, `${safeFileName(run)}.json`), JSON.stringify(steps, null, '\t'));
		}
	}
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
		const fromCache = scenarios.filter((scenario) => planOf(run, scenario).baseline);
		const note = !fromCache.length
			? ''
			: fromCache.length === scenarios.length && fromCache.every((scenario) => !planOf(run, scenario).run)
				? ' (from the cache)'
				: ' (partly from the cache)';
		console.log(runSummary(`${run}${note}`, runScenarios, { partTimes: parts !== undefined || options.verbose }).join('\n'));
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
		for (const scenario of scenarios) {
			const cached = cacheLine(planOf(run, scenario));
			if (cached) console.log(`[${scenarioLabel(run, scenario)}] ${cached}`);
		}
		for (const group of launches) {
			// A scenario whose parts all come from the cache needs no world, and a launch takes a few seconds.
			const running = group.filter((scenario) => planOf(run, scenario).run);
			if (!running.length) continue;
			try {
				await runLaunch(install, build.label, running);
			} catch (error) {
				// A world that fails to launch fails its scenarios, and the suite goes on to its summary.
				for (const scenario of running.filter(({ name }) => !results.has(logKey(run, name)))) {
					const step = fatalStep(error);
					console.log(stepLine(scenarioLabel(run, scenario), step, options));
					results.set(logKey(run, scenario.name), { parts: [], ran: [], steps: [step] });
				}
			}
		}
	}
}

/**
 * Launches Foundry on a fresh copy of the world, and runs the scenarios on it one after the other.
 */
async function runLaunch(install: FoundryInstall, buildLabel: string, group: LoadedScenario[]) {
	const run = runName(install.version, buildLabel);
	const dataDir = path.join(config.workDir, 'runs', safeFileName(group[0].isolated ? `${run} ${group[0].name}` : run));
	const dist = dists.get(buildLabel);
	if (!dist) throw new Error(`${buildLabel} was not built, though ${group[0].name} runs on it.`);
	prepareDataDir(install, dist, dataDir);
	const server = await launchFoundry(install, dataDir, group[0].routePrefix);
	try {
		for (const scenario of group) {
			const label = scenarioLabel(run, scenario);
			const result = await runScenario(scenario.run, {
				browser,
				url: server.url,
				version: install.version,
				gmUser: config.gmUser,
				playerUser: config.playerUser,
				needsCanvas: scenario.needsCanvas,
				parts: planOf(run, scenario).run?.parts,
				onStep: (step) => console.log(stepLine(label, step, options)),
			});
			results.set(logKey(run, scenario.name), result);
		}
	} finally {
		await server.stop();
	}
}

/**
 * What one scenario runs on one version and build: the parts given to `runScenario`, none when the build has nothing to
 * run. On the build compared against, the cached baseline that holds the rest.
 */
type Plan = {
	run: { parts: readonly string[] | undefined } | undefined;
	baselineFile?: string;
	baseline?: Baseline;
	cached?: string[];
};

function planOf(run: string, scenario: LoadedScenario): Plan {
	const plan = plans.get(logKey(run, scenario.name));
	if (!plan) throw new Error(`No plan for ${scenario.name} on ${run}.`);
	return plan;
}

/**
 * Plans a scenario's run on the build compared against, from its baseline in the cache, unless `--fresh`.
 */
function readBasePlan(install: FoundryInstall, commit: string, scenario: LoadedScenario): Plan {
	const sources = [fs.readFileSync(scenario.file, 'utf8'), ...harnessSources];
	const file = baselineFile(config.workDir, { commit, version: install.version, scenario: scenario.name, sources });
	const baseline = options.fresh ? undefined : readBaseline(file);
	return { ...planBase(baseline, parts), baselineFile: file, baseline };
}

function readBaseline(file: string) {
	if (!fs.existsSync(file)) return undefined;
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8')) as Baseline;
	} catch (error) {
		// A file no run of this harness wrote, since it writes them whole: the base build runs again, and overwrites it.
		console.error(`Ignoring the unreadable baseline ${file}: ${String(error)}`);
		return undefined;
	}
}

/**
 * Writes a file through a temporary one, so that a run stopped while writing leaves no half of it.
 */
function writeAtomically(file: string, content: string) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(`${file}.tmp`, content);
	fs.renameSync(`${file}.tmp`, file);
}

/**
 * What a plan takes from the cache, for the run's output.
 */
function cacheLine(plan: Plan) {
	if (!plan.baseline) return undefined;
	if (!plan.run) return `from the cache, without a launch: ${plan.cached?.length ? plan.cached.join(', ') : 'its steps'}`;
	return plan.cached?.length ? `parts from the cache: ${plan.cached.join(', ')}` : undefined;
}

function scenarioLabel(run: string, scenario: LoadedScenario) {
	return scenarios.length > 1 ? `${run} ${scenario.name}` : run;
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
	// The scenarios sharing a launch share its route: a scenario served under its own prefix needs its own launch.
	if (module.routePrefix !== undefined && module.isolated !== true) throw new Error(`${file} exports a routePrefix but isn't isolated.`);
	return {
		file,
		name: path.basename(file).replace(/\.ts$/, ''),
		run: module.run,
		isolated: module.isolated === true,
		needsCanvas: module.needsCanvas === true,
		routePrefix: module.routePrefix,
	};
}

function commitOf(ref: string) {
	return execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
}

/**
 * Builds a commit of this repo, once, and returns its `dist`.
 */
function buildRef(ref: string, commit: string) {
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
