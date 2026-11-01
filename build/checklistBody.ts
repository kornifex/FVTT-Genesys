/** @file Edits the Markdown body of a test checklist issue: its `## ` sections and its `- [ ]` items. */

const HEADING = /^## /;
const UNTICKED = /^(\s*- )\[ \] /;

/** The heading of the section carried over from #37, which stays last in the checklist. */
const CARRY_OVER = /^## #37 /;

type Section = { heading: string; start: number; end: number };

function sections(lines: string[]): Section[] {
	const starts = lines.flatMap((line, index) => (HEADING.test(line) ? [index] : []));
	return starts.map((start, i) => ({ heading: lines[start], start, end: starts[i + 1] ?? lines.length }));
}

/** Inserts a section before the trailing `## #37 …` carry-over section, or at the end when the body has none. */
export function addSection(body: string, section: string): string {
	const text = section.trim();
	if (!HEADING.test(text)) {
		throw new Error('The section starts with a "## " heading.');
	}

	const lines = body.split('\n');
	const last = sections(lines).at(-1);
	if (!last || !CARRY_OVER.test(last.heading)) {
		return `${body.trimEnd()}\n\n${text}\n`;
	}

	const before = lines.slice(0, last.start).join('\n').trimEnd();
	const after = lines.slice(last.start).join('\n');
	return `${before}\n\n${text}\n\n${after}`;
}

/** Ticks the one unticked item that contains `text`, appending `note` to it; throws when none or several match. */
export function tickItem(body: string, text: string, note?: string): { body: string; item: string } {
	const lines = body.split('\n');
	const matches = lines.flatMap((line, index) => (UNTICKED.test(line) && line.includes(text) ? [index] : []));
	if (matches.length !== 1) {
		throw new Error(
			matches.length === 0
				? `No unticked item contains "${text}".`
				: `${matches.length} unticked items contain "${text}", on lines ${matches.map((index) => index + 1).join(', ')}.`,
		);
	}

	const [index] = matches;
	const ticked = lines[index].replace(UNTICKED, '$1[x] ').trimEnd();
	lines[index] = note ? `${ticked} ${note.trim()}` : ticked;
	return { body: lines.join('\n'), item: lines[index] };
}

/**
 * Returns the section whose heading starts with `heading` (`#470` finds `## #470 …`, not `## #4700 …`), or, when no
 * heading starts with it, the one section whose heading contains it; throws when none or several match.
 */
export function showSection(body: string, heading: string): string {
	const lines = body.split('\n');
	const all = sections(lines);
	const startsWith = all.filter(({ heading: line }) => new RegExp(`^## ${escape(heading)}(\\s|$)`).test(line));
	const matches = startsWith.length > 0 ? startsWith : all.filter(({ heading: line }) => line.includes(heading));
	if (matches.length !== 1) {
		throw new Error(
			matches.length === 0
				? `No section heading contains "${heading}".`
				: `${matches.length} section headings match "${heading}":\n${matches.map((section) => section.heading).join('\n')}`,
		);
	}

	const [{ start, end }] = matches;
	return lines.slice(start, end).join('\n').trimEnd();
}

function escape(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
