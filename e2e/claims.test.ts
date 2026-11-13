import { execFile, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { claim, claimPorts } from './claims.ts';

const execFileAsync = promisify(execFile);
let dir: string;
// The pid of a process that has ended, as a run killed leaves in its claims.
const deadPid = spawnSync(process.execPath, ['--version']).pid;
// A live process other than this one, as another run is.
const livePid = process.ppid;
const claimFor = (name: string, pid: number) => fs.writeFileSync(path.join(dir, `${name}.${pid}`), '');
const nothingListens = () => Promise.resolve(false);

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genesys-claims-'));
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('claim', () => {
	it('claims a free name until given up', () => {
		const release = claim(dir, 'worktree');

		expect(release).toBeTypeOf('function');
		expect(fs.readdirSync(dir)).toEqual([`worktree.${process.pid}`]);
		release?.();
		expect(fs.readdirSync(dir)).toEqual([]);
	});

	it('leaves a name a live process holds, and keeps no claim on it', () => {
		claimFor('worktree', livePid);

		expect(claim(dir, 'worktree')).toBeUndefined();
		expect(fs.readdirSync(dir)).toEqual([`worktree.${livePid}`]);
	});

	it('takes over a name whose process has ended', () => {
		claimFor('worktree', deadPid);

		expect(claim(dir, 'worktree')).toBeTypeOf('function');
		expect(fs.readdirSync(dir)).toEqual([`worktree.${process.pid}`]);
	});

	it('ignores the claims on other names', () => {
		claimFor('worktree-2', livePid);

		expect(claim(dir, 'worktree')).toBeTypeOf('function');
	});
});

describe('claimPorts', () => {
	it('claims the range from the lowest port when it is free', async () => {
		const { port } = await claimPorts(30100, 3, { dir, listening: nothingListens });

		expect(port).toBe(30100);
		expect(fs.readdirSync(dir).sort()).toEqual(['30100', '30101', '30102'].map((name) => `${name}.${process.pid}`));
	});

	it('starts after a port another live run claimed, and gives up the ports it took below it', async () => {
		claimFor('30101', livePid);

		const { port } = await claimPorts(30100, 3, { dir, listening: nothingListens });

		expect(port).toBe(30102);
		expect(fs.readdirSync(dir).sort()).toEqual([
			`30101.${livePid}`,
			...['30102', '30103', '30104'].map((name) => `${name}.${process.pid}`),
		]);
	});

	it('refuses a port something listens on without a claim, as a server a killed run left does', async () => {
		await expect(claimPorts(30100, 2, { dir, listening: (candidate) => Promise.resolve(candidate === 30101) })).rejects.toThrow(
			'Port 30101 is listening, but no run claims it',
		);
		expect(fs.readdirSync(dir)).toEqual([]);
	});

	it('takes the ports of a run that has ended', async () => {
		claimFor('30100', deadPid);

		expect((await claimPorts(30100, 2, { dir, listening: nothingListens })).port).toBe(30100);
	});

	it('gives every port up at once', async () => {
		const { release } = await claimPorts(30100, 2, { dir, listening: nothingListens });

		release();

		expect(fs.readdirSync(dir)).toEqual([]);
	});

	it('gives two runs started together ranges apart', async () => {
		// Each run claims, prints its first port, and holds its claims until the other run holds its own too (10 s at
		// most), as a run does while its launches go on: one that ended early would leave its ports to the other.
		const script = `
			const fs = await import('node:fs');
			const { claimPorts } = await import(${JSON.stringify(pathToFileURL(path.join(import.meta.dirname, 'claims.ts')).href)});
			const { port } = await claimPorts(30100, 4, { dir: ${JSON.stringify(dir)}, listening: () => Promise.resolve(false) });
			console.log(port);
			const deadline = Date.now() + 10_000;
			while (fs.readdirSync(${JSON.stringify(dir)}).length < 8 && Date.now() < deadline) {
				await new Promise((resolve) => setTimeout(resolve, 20));
			}
		`;
		const run = () => execFileAsync(process.execPath, ['--input-type=module', '--eval', script]).then(({ stdout }) => Number(stdout));

		const [first, second] = await Promise.all([run(), run()]);

		expect(Math.abs(first - second)).toBeGreaterThanOrEqual(4);
	});
});
