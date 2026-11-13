import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { withLock } from './checklistLock.ts';

let dir: string;

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checklist-lock-'));
});

afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

const lockPath = () => path.join(dir, 'checklist-667.lock');

describe('withLock', () => {
	it('holds the lock while the action runs, and returns its result', () => {
		const result = withLock('667', () => fs.existsSync(lockPath()), { dir });

		expect(result).toBe(true);
		expect(fs.existsSync(lockPath())).toBe(false);
	});

	it('releases the lock when the action throws', () => {
		expect(() =>
			withLock(
				'667',
				() => {
					throw new Error('boom');
				},
				{ dir },
			),
		).toThrow('boom');
		expect(fs.existsSync(lockPath())).toBe(false);
	});

	it('waits for a lock that its owner releases', () => {
		fs.mkdirSync(lockPath());
		fs.writeFileSync(path.join(lockPath(), 'pid'), String(process.pid));
		let slept = 0;

		const result = withLock('667', () => 'done', {
			dir,
			sleep: () => {
				slept++;
				fs.rmSync(lockPath(), { recursive: true });
			},
		});

		expect(result).toBe('done');
		expect(slept).toBe(1);
	});

	it('times out on a lock whose owner runs', () => {
		fs.mkdirSync(lockPath());
		fs.writeFileSync(path.join(lockPath(), 'pid'), String(process.pid));

		expect(() => withLock('667', () => 'never', { dir, timeoutMs: 0, alive: () => true })).toThrow('holds');
		expect(fs.existsSync(lockPath())).toBe(true);
	});

	it('takes over a lock whose owner is gone', () => {
		fs.mkdirSync(lockPath());
		fs.writeFileSync(path.join(lockPath(), 'pid'), '999999');

		expect(withLock('667', () => 'taken', { dir, alive: () => false })).toBe('taken');
	});

	it('takes over a lock older than the stale age', () => {
		fs.mkdirSync(lockPath());
		fs.writeFileSync(path.join(lockPath(), 'pid'), String(process.pid));

		expect(withLock('667', () => 'taken', { dir, staleMs: -1, alive: () => true })).toBe('taken');
	});
});
