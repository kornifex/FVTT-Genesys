/** @file `pnpm e2e`: runs scenarios on each Foundry version and build, on a pool of Foundry launches (see `usage`). */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

import { type Baseline, baselineFile, baselineSteps, cacheable, mergeBaseline, planBase } from './baseline.ts';
import { claim, claimPorts } from './claims.ts';
import { envFile, type FoundryInstall, readConfig } from './config.ts';
import { assembleLog, planSlices, type Slice } from './pool.ts';
import { runScenario, type ScenarioModule } from './scenario.ts';
import { type FoundryServer, launchFoundry, prepareDataDir } from './server.ts';
import { diffSteps, failsRun, fatalStep, runSummary, type Step, stepLine, type StepLog, stopped } from './steps.ts';

const root = path.resolve(import.meta.dirname, '..');
const env = envFile(root, () =>
	execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim(),
);
if (env) process.loadEnvFile(env);

const usage =
	'Usage: pnpm e2e <scenario.ts or folder>... [--part a,b] [--versions 13,14] [--dist dist] [--compare <git ref> [--fresh]] [--launches 8] [--verbose]';
const { values: options, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		part: { type: 'string' },
		versions: { type: 'string', default: '13,14' },
		dist: { type: 'string' },
		compare: { type: 'string' },
		fresh: { type: 'boolean', default: false },
		launches: { type: 'string' },
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

const config = readConfig(process.env, options.versions.split(',').map(Number), { launches: options.launches });
// Each checkout keeps its world copies and results in a folder of its own, so that runs from two worktrees never share
// one. Its build is the checkout's `dist`: two runs of one checkout would share it too.
const checkout = `${path.basename(root)}-${createHash('sha256').update(root).digest('hex').slice(0, 8)}`;
const runsDir = path.join(config.workDir, 'runs', checkout);
const resultsDir = path.join(config.workDir, 'results', checkout);
const releaseCheckout = claim(path.join(config.workDir, 'runs'), checkout);
if (!releaseCheckout) throw new Error(`Another run from ${root} is going on: wait for it to end.`);
// The claims are machine-wide, as the ports are, whatever E2E_WORK_DIR each run has.
const ports = await claimPorts(config.port, config.launches, { dir: path.join(os.tmpdir(), 'genesys-e2e-ports'), listening });
process.once('exit', () => {
	ports.release();
	releaseCheckout();
});
console.log(`Ports ${ports.port}–${ports.port + config.launches - 1}, logs in ${runsDir} and ${resultsDir}`);
// Without --dist, the working tree is built, so that a stale dist is never tested.
const headDist = options.dist ? path.resolve(options.dist) : buildWorkingTree();
if (!fs.existsSync(path.join(headDist, 'system.json'))) throw new Error(`${headDist} holds no build.`);

// The build compared against runs first on each version, so that the two runs read alike in the log.
const base = options.compare ? { label: options.compare, commit: commitOf(options.compare) } : undefined;
const builds = [...(base ? [base] : []), { label: 'head' }];

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

// The pool shares its launches between every version and build, so that the longest scenario, rather than the sum of
// a version's, sets the run's time.
const scenarioRuns = new Map<string, PlannedRun>();
for (const install of config.installs) {
	for (const build of builds) {
		const run = runName(install.version, build.label);
		for (const scenario of scenarios) {
			const plan = planOf(run, scenario);
			const cached = cacheLine(plan);
			if (cached) console.log(`[${scenarioLabel(run, scenario)}] ${cached}`);
			// A scenario whose parts all come from the cache needs no world, and a launch takes a few seconds.
			if (plan.run)
				scenarioRuns.set(logKey(run, scenario.name), { install, build: build.label, run, scenario, parts: plan.run.parts });
		}
	}
}
const queue = planSlices(
	[...scenarioRuns].map(([id, { run, scenario, parts }]) => ({
		id,
		isolated: scenario.isolated,
		only: parts,
		previous: readPreviousLog(scenario.name, run),
	})),
	config.launches,
);
const sliceLogs = new Map<string, { slice: Slice; log: StepLog }[]>();

const browser = await chromium.launch({
	executablePath: config.chromium,
	args: config.angle ? [`--use-angle=${config.angle}`] : [],
});
const started = Date.now();
try {
	await Promise.all(Array.from({ length: Math.min(config.launches, queue.length) }, (_, index) => runLaunch(index)));
} finally {
	await browser.close();
}
const wallTime = Date.now() - started;

// The comparison, the cache and the summary read a scenario's log whole, whatever order its slices finished in.
const results = new Map<string, StepLog>();
for (const [key, logs] of sliceLogs) {
	logs.sort((left, right) => (left.slice.range?.from ?? 0) - (right.slice.range?.from ?? 0));
	results.set(key, assembleLog(logs.map(({ log }) => log)));
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
			writeAtomically(path.join(resultsDir, scenario.name, `${safeFileName(run)}.json`), JSON.stringify(steps, null, '\t'));
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
console.log(`\nWall time: ${(wallTime / 1000).toFixed(1)} s on ${config.launches} ${config.launches === 1 ? 'launch' : 'launches'}`);
console.log(`Step logs and server logs: ${resultsDir}, ${runsDir}`);
const failed = config.installs.some((install) =>
	builds.some((build) =>
		scenarios.some(({ name }) =>
			failsRun(logs.get(logKey(runName(install.version, build.label), name)) ?? [], { compared: build.label !== 'head' }),
		),
	),
);
if (failed) process.exitCode = 1;

/**
 * One launch of the pool, on its own port and data dir: takes the slices one after the other, longest first. It keeps
 * its Foundry server and world while the next slice runs on the same version and build, as the scenarios of one launch
 * share a world, and starts a fresh copy of the world for another version or build, for an isolated scenario, and after
 * a slice an error stopped.
 */
async function runLaunch(index: number) {
	const port = ports.port + index;
	const dataDir = path.join(runsDir, `launch-${index}`);
	let world: { run: string; server: FoundryServer } | undefined;
	const close = async () => {
		await world?.server.stop();
		world = undefined;
	};
	try {
		for (let slice = nextSlice(world?.run); slice; slice = nextSlice(world?.run)) {
			const { install, build, run, scenario, parts } = plannedRun(slice.runId);
			const label = scenarioLabel(run, scenario);
			if (world?.run !== run || scenario.isolated) await close();
			let log: StepLog;
			try {
				if (!world) {
					const dist = dists.get(build);
					if (!dist) throw new Error(`${build} was not built, though ${scenario.name} runs on it.`);
					prepareDataDir(install, dist, dataDir);
					world = { run, server: await launchFoundry(install, dataDir, port, scenario.routePrefix) };
				}
				log = await runScenario(scenario.run, {
					browser,
					url: world.server.url,
					version: install.version,
					gmUser: config.gmUser,
					playerUser: config.playerUser,
					needsCanvas: scenario.needsCanvas,
					parts,
					range: slice.range,
					onStep: (step) => console.log(stepLine(label, step, options)),
				});
			} catch (error) {
				// A world that fails to launch fails the slice's parts, and the pool goes on.
				const step = fatalStep(error);
				console.log(stepLine(label, step, options));
				log = { parts: [], ran: [], steps: [step] };
			}
			sliceLogs.set(slice.runId, [...(sliceLogs.get(slice.runId) ?? []), { slice, log }]);
			if (scenario.isolated || stopped(log.steps)) await close();
		}
	} finally {
		await close();
	}
}

/**
 * Takes the next slice of the queue for a launch whose world serves a version and build: the longest left on that
 * world, else the longest left. The runs of one scenario on two versions last about as long and sit side by side in the
 * queue: taking them strictly in turn would start a world, a copy and a few seconds of launch, for almost every slice.
 */
function nextSlice(worldRun: string | undefined) {
	const onWorld = queue.findIndex((slice) => {
		const { run, scenario } = plannedRun(slice.runId);
		return run === worldRun && !scenario.isolated;
	});
	return queue.splice(onWorld === -1 ? 0 : onWorld, 1)[0];
}

/**
 * A scenario the pool runs on one version and build, with the parts it selects.
 */
type PlannedRun = { install: FoundryInstall; build: string; run: string; scenario: LoadedScenario; parts: readonly string[] | undefined };

function plannedRun(id: string) {
	const planned = scenarioRuns.get(id);
	if (!planned) throw new Error(`No planned run ${id}.`);
	return planned;
}

/**
 * The step log a scenario's run on a version and build left last time, from any checkout, whose durations size and
 * order this run's slices; none when it can't be read. A new worktree has no results of its own, and a scenario's
 * durations hardly depend on the checkout.
 */
function readPreviousLog(scenario: string, run: string): Step[] | undefined {
	const allResults = path.join(config.workDir, 'results');
	const logs = fs.existsSync(allResults)
		? fs
				.readdirSync(allResults)
				.map((dir) => path.join(allResults, dir, scenario, `${safeFileName(run)}.json`))
				.filter((file) => fs.existsSync(file))
		: [];
	const file = logs.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)[0];
	if (!file) return undefined;
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8')) as Step[];
	} catch {
		// Only the slices' sizes and order depend on it: the run goes on without it.
		return undefined;
	}
}

/**
 * Whether a server listens on the port: one the pool can't take, as a Foundry server a stopped run left would take this
 * run's clients, silently.
 */
function listening(port: number) {
	return new Promise<boolean>((resolve) => {
		const probe = net.createServer();
		probe.once('error', () => resolve(true));
		probe.listen(port, () => probe.close(() => resolve(false)));
	});
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
 * Writes a file through a temporary one of this process, so that a run stopped while writing leaves no half of it, and
 * two runs writing it at once (the cache's baseline of one commit) don't mix their content.
 */
function writeAtomically(file: string, content: string) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const temporary = `${file}.${process.pid}.tmp`;
	fs.writeFileSync(temporary, content);
	fs.renameSync(temporary, file);
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
 * Builds a commit of this repo, once, and returns its `dist`. The build happens in a folder of this process, renamed
 * once done: two runs building the same commit at once each build their own, and the first to finish keeps its.
 */
function buildRef(ref: string, commit: string) {
	const dir = path.join(config.workDir, 'builds', commit);
	const dist = path.join(dir, 'dist');
	if (fs.existsSync(path.join(dist, 'system.json'))) return dist;

	const building = `${dir}.${process.pid}.tmp`;
	console.error(`Building ${ref} (${commit.slice(0, 7)}) in ${building}`);
	fs.rmSync(building, { recursive: true, force: true });
	fs.mkdirSync(building, { recursive: true });
	const archive = path.join(building, 'source.tar');
	quietly('git', ['archive', `--output=${archive}`, commit], root);
	quietly('tar', ['-xf', archive, '-C', building], building);
	quietly('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], building);
	quietly('pnpm', ['build'], building);
	try {
		fs.renameSync(building, dir);
	} catch (error) {
		// Another run's build of the commit took the place first.
		if (!['EEXIST', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
		fs.rmSync(building, { recursive: true, force: true });
		// Only a build stopped halfway by an older harness, which built in place, leaves no system.json there.
		if (!fs.existsSync(path.join(dist, 'system.json'))) throw new Error(`${dir} holds a broken build: remove it.`, { cause: error });
	}
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
