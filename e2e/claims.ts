/** @file Claims on the ports and folders of a machine, so that two runs of the harness started together never share one. */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Claims a name in a folder for this process, and returns the function that gives it up; none when a live process
 * holds it. A claim is a file `<name>.<pid>`: one whose process is gone, as a run killed leaves it, is removed.
 *
 * Two processes claiming at once never both get the name: each writes its file before it looks for another's, so the
 * one that looks last sees the other's. Both may give up, and then try their next name.
 */
export function claim(dir: string, name: string): (() => void) | undefined {
	fs.mkdirSync(dir, { recursive: true });
	const own = path.join(dir, `${name}.${process.pid}`);
	fs.writeFileSync(own, '');
	const release = () => fs.rmSync(own, { force: true });
	const prefix = `${name}.`;
	for (const file of fs.readdirSync(dir)) {
		const pid = file.startsWith(prefix) ? Number(file.slice(prefix.length)) : NaN;
		if (!Number.isInteger(pid) || pid === process.pid) continue;
		if (alive(pid)) {
			release();
			return undefined;
		}
		fs.rmSync(path.join(dir, file), { force: true });
	}
	return release;
}

/**
 * Claims `count` ports in a row, from the first at or above `from` that no other run claimed, and returns the first
 * with the function that gives them all up. Throws on a port that nothing claims but something listens on: a Foundry
 * server a killed run left keeps writing into the data dirs the next run of its checkout copies afresh.
 */
export async function claimPorts(
	from: number,
	count: number,
	{ dir, listening }: { dir: string; listening: (port: number) => Promise<boolean> },
): Promise<{ port: number; release: () => void }> {
	let releases: (() => void)[] = [];
	const releaseAll = () => releases.forEach((release) => release());
	for (let port = from; port <= 65535; port++) {
		const release = claim(dir, String(port));
		if (release === undefined) {
			releaseAll();
			releases = [];
			continue;
		}
		if (await listening(port)) {
			release();
			releaseAll();
			throw new Error(
				`Port ${port} is listening, but no run claims it: a Foundry server a stopped run left, or another program. Stop it, or set E2E_PORT above it.`,
			);
		}
		releases.push(release);
		if (releases.length === count) return { port: port - count + 1, release: releaseAll };
	}
	releaseAll();
	throw new Error(`No ${count} free ports in a row from ${from}.`);
}

function alive(pid: number) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// EPERM: the process exists, under another user.
		return (error as NodeJS.ErrnoException).code === 'EPERM';
	}
}
