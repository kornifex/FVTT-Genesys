import { describe, expect, it } from 'vitest';

import { addSection } from './checklistBody.ts';
import { editBody, type Remote } from './checklistEdit.ts';

/** An issue held in memory: every write bumps `updatedAt`, and `onView` lets another writer act between two calls. */
function fakeIssue(body: string) {
	const issue = { body, updatedAt: 0, writes: 0, views: 0, onView: (_views: number): void => undefined };
	const remote: Remote = {
		view: () => {
			issue.onView(++issue.views);
			return { body: issue.body, updatedAt: String(issue.updatedAt) };
		},
		write: (next) => {
			issue.body = next;
			issue.updatedAt++;
			issue.writes++;
		},
	};
	return { issue, remote };
}

const add = (section: string) => (body: string) => ({ body: addSection(body, section) });
const present = (section: string) => (body: string) => body.includes(section);

describe('editBody', () => {
	it('writes once when nothing else edits the issue', () => {
		const { issue, remote } = fakeIssue('## #1 One\n');

		editBody(remote, add('## #2 Two'), present('## #2 Two'));

		expect(issue.body).toBe('## #1 One\n\n## #2 Two\n');
		expect(issue.writes).toBe(1);
	});

	it('applies the change again to the body another edit left, when it came between the read and the write', () => {
		const { issue, remote } = fakeIssue('## #1 One\n');
		issue.onView = (views) => {
			if (views === 1) {
				issue.body = `${issue.body}\n## #3 Three\n`;
				issue.updatedAt++;
			}
		};

		editBody(remote, add('## #2 Two'), present('## #2 Two'));

		expect(issue.body).toContain('## #3 Three');
		expect(issue.body).toContain('## #2 Two');
	});

	it('writes again when a concurrent write overwrote the change after it landed', () => {
		const { issue, remote } = fakeIssue('## #1 One\n');
		const stale = issue.body;
		let overwritten = false;
		issue.onView = (views) => {
			// The third view is the check after our write: another process, which read the body before it, now writes.
			if (views === 3 && !overwritten) {
				overwritten = true;
				issue.body = `${stale}\n## #3 Three\n`;
				issue.updatedAt++;
			}
		};

		editBody(remote, add('## #2 Two'), present('## #2 Two'));

		expect(issue.body).toContain('## #3 Three');
		expect(issue.body).toContain('## #2 Two');
	});

	it('gives up after the given number of attempts', () => {
		const { issue, remote } = fakeIssue('');
		issue.onView = () => {
			issue.updatedAt++;
		};

		expect(() => editBody(remote, add('## #2 Two'), present('## #2 Two'), 3)).toThrow('3 times');
		expect(issue.writes).toBe(0);
	});

	it('does not retry a change that refuses the body', () => {
		const { issue, remote } = fakeIssue('');

		expect(() =>
			editBody(
				remote,
				() => {
					throw new Error('No unticked item.');
				},
				() => true,
			),
		).toThrow('No unticked item.');
		expect(issue.views).toBe(1);
	});

	it('lands two edits started together on the same issue', () => {
		const { issue, remote } = fakeIssue('## #1 One\n');
		// The second edit reads the issue as the first one does, and writes in between the first one's check and write.
		const second = () => editBody(remote, add('## #3 Three'), present('## #3 Three'));
		let started = false;
		issue.onView = (views) => {
			if (views === 2 && !started) {
				started = true;
				second();
			}
		};

		editBody(remote, add('## #2 Two'), present('## #2 Two'));

		expect(issue.body).toContain('## #2 Two');
		expect(issue.body).toContain('## #3 Three');
	});
});
