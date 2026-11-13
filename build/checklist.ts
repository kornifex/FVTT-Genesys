/**
 * @file Reads and edits the release's test checklist issue through `gh` without printing its body: see `USAGE`.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import process from 'process';

import { addSection, headings, replaceSection, showSection, tickItem, untickedItems } from './checklistBody.ts';
import { editBody, type Issue, type Remote } from './checklistEdit.ts';
import { withLock } from './checklistLock.ts';

const USAGE = `Usage:
  pnpm checklist <issue> headings
  pnpm checklist <issue> unticked [--json]
  pnpm checklist <issue> show "<heading>"   (a heading, or "#<n>" for its pull request or issue number)
  pnpm checklist <issue> add <section.md>
  pnpm checklist <issue> replace <section.md>
  pnpm checklist <issue> tick "<text>" [--note "<text>"]
  pnpm checklist --help`;

function gh(args: string[], input?: string): string {
	return execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] });
}

function view(issue: string): Issue {
	return JSON.parse(gh(['issue', 'view', issue, '--json', 'body,updatedAt'])) as Issue;
}

function remote(issue: string): Remote {
	return { view: () => view(issue), write: (body) => void gh(['issue', 'edit', issue, '--body-file', '-'], body) };
}

function main(args: string[]): void {
	if (args.includes('--help') || args.includes('-h')) {
		console.log(USAGE);
		return;
	}

	const [issue, command, argument, ...options] = args;
	if (!issue || !command) {
		throw new Error(USAGE);
	}

	if (command === 'headings') {
		console.log(headings(view(issue).body).join('\n'));
		return;
	}

	if (command === 'unticked') {
		const items = untickedItems(view(issue).body);
		if (argument === '--json') {
			console.log(JSON.stringify(items, null, 2));
			return;
		}
		console.log(
			items
				.map(({ heading, item }, index) => `${index > 0 && items[index - 1].heading === heading ? '' : `${heading}\n`}${item}`)
				.join('\n'),
		);
		return;
	}

	if (!argument) {
		throw new Error(USAGE);
	}

	if (command === 'show') {
		console.log(showSection(view(issue).body, argument));
		return;
	}

	if (command === 'add' || command === 'replace') {
		const section = fs.readFileSync(argument, 'utf8');
		const change = command === 'add' ? addSection : replaceSection;
		withLock(issue, () =>
			editBody(
				remote(issue),
				(body) => ({ body: change(body, section) }),
				(body) => body.includes(section.trim()),
			),
		);
		console.log(`${command === 'add' ? 'Added to' : 'Replaced in'} #${issue}: ${section.trim().split('\n')[0]}`);
		return;
	}

	if (command === 'tick') {
		const noteIndex = options.indexOf('--note');
		const note = noteIndex >= 0 ? options[noteIndex + 1] : undefined;
		if (noteIndex >= 0 && !note) {
			throw new Error(USAGE);
		}
		const { item } = withLock(issue, () =>
			editBody(
				remote(issue),
				(body) => tickItem(body, argument, note),
				(body, result) => body.split('\n').includes(result.item),
			),
		);
		console.log(`Ticked in #${issue}: ${item.trim()}`);
		return;
	}

	throw new Error(USAGE);
}

try {
	main(process.argv.slice(2));
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
