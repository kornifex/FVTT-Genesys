/** @file A per-issue lock between the `pnpm checklist` processes of one machine: a directory made atomically. */

import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';

type LockOptions = {
	dir?: string;
	/** How long to wait for the lock. */
	timeoutMs?: number;
	/** A lock older than this is taken over, whatever its owner. */
	staleMs?: number;
	/** Whether the process of that id still runs. */
	alive?: (pid: number) => boolean;
	sleep?: (ms: number) => void;
};

function isAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === 'EPERM';
	}
}

function sleepSync(ms: number): void {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isStale(lock: string, staleMs: number, alive: (pid: number) => boolean): boolean {
	try {
		const pid = Number(fs.readFileSync(path.join(lock, 'pid'), 'utf8'));
		return Date.now() - fs.statSync(lock).mtimeMs > staleMs || !Number.isInteger(pid) || !alive(pid);
	} catch {
		// The owner is between `mkdir` and writing its pid, or just released: judge it by age alone.
		try {
			return Date.now() - fs.statSync(lock).mtimeMs > staleMs;
		} catch {
			return false;
		}
	}
}

/** Runs `action` while holding the lock of `name`; throws when the lock stays taken for `timeoutMs`. */
export function withLock<T>(name: string, action: () => T, options: LockOptions = {}): T {
	const { dir = os.tmpdir(), timeoutMs = 60_000, staleMs = 120_000, alive = isAlive, sleep = sleepSync } = options;
	const lock = path.join(dir, `checklist-${name.replace(/\W/g, '_')}.lock`);
	const deadline = Date.now() + timeoutMs;

	for (;;) {
		try {
			fs.mkdirSync(lock);
			break;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
				throw error;
			}
			if (isStale(lock, staleMs, alive)) {
				fs.rmSync(lock, { recursive: true, force: true });
				continue;
			}
			if (Date.now() >= deadline) {
				throw new Error(`Another pnpm checklist holds ${lock} (waited ${timeoutMs} ms); remove it if none runs.`, { cause: error });
			}
			sleep(100);
		}
	}

	try {
		fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
		return action();
	} finally {
		fs.rmSync(lock, { recursive: true, force: true });
	}
}
