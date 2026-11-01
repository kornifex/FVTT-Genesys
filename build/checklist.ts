/**
 * @file Edits the release's test checklist issue through `gh` without printing its body:
 * `node build/checklist.ts <issue> add <section.md> | tick "<text>" [--note "<text>"] | show "<heading>"`.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import process from 'process';

import { addSection, showSection, tickItem } from './checklistBody.ts';

const USAGE = `Usage:
  pnpm checklist <issue> add <section.md>
  pnpm checklist <issue> tick "<text>" [--note "<text>"]
  pnpm checklist <issue> show "<heading>"`;

type Issue = { body: string; updatedAt: string };

function gh(args: string[], input?: string): string {
	return execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] });
}

function view(issue: string): Issue {
	return JSON.parse(gh(['issue', 'view', issue, '--json', 'body,updatedAt'])) as Issue;
}

function edit(issue: string, before: Issue, body: string): void {
	// gh has no conditional edit: checking the issue again narrows the window in which another edit would be lost.
	if (view(issue).updatedAt !== before.updatedAt) {
		throw new Error(`#${issue} changed since it was read: run the command again.`);
	}
	gh(['issue', 'edit', issue, '--body-file', '-'], body);
}

function main([issue, command, argument, ...options]: string[]): void {
	if (!issue || !argument) {
		throw new Error(USAGE);
	}

	if (command === 'show') {
		console.log(showSection(view(issue).body, argument));
		return;
	}

	if (command === 'add') {
		const before = view(issue);
		const section = fs.readFileSync(argument, 'utf8');
		edit(issue, before, addSection(before.body, section));
		console.log(`Added to #${issue}: ${section.trim().split('\n')[0]}`);
		return;
	}

	if (command === 'tick') {
		const noteIndex = options.indexOf('--note');
		const note = noteIndex >= 0 ? options[noteIndex + 1] : undefined;
		if (noteIndex >= 0 && !note) {
			throw new Error(USAGE);
		}
		const before = view(issue);
		const { body, item } = tickItem(before.body, argument, note);
		edit(issue, before, body);
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
