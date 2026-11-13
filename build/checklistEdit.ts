/** @file Applies a change to a checklist issue's body that other edits may race with, over an injected `gh`. */

export type Issue = { body: string; updatedAt: string };

export type Remote = {
	view(): Issue;
	write(body: string): void;
};

/**
 * `gh issue edit` has no conditional write, so this narrows the race instead of closing it: it applies `change` to
 * the body just read, checks that nobody edited the issue meanwhile, writes, then reads again and checks that the
 * change `landed`. A lost update (the issue changed under it, or a write that overwrote this one) runs the whole
 * thing again on the new body, up to `attempts` times. Serializing the writers of one machine is `withLock`'s job.
 */
export function editBody<T extends { body: string }>(
	remote: Remote,
	change: (body: string) => T,
	landed: (body: string, result: T) => boolean,
	attempts = 5,
): T {
	for (let attempt = 0; attempt < attempts; attempt++) {
		const before = remote.view();
		const result = change(before.body);
		if (remote.view().updatedAt !== before.updatedAt) {
			continue;
		}

		remote.write(result.body);
		if (landed(remote.view().body, result)) {
			return result;
		}
	}

	throw new Error(`The issue kept changing while it was edited, ${attempts} times: run the command again.`);
}
