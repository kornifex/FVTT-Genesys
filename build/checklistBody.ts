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
 * Finds the one section a heading text designates. A section heading is `## #<pr> <title> (#<issue>)`, so `#<n>`
 * finds a section by its pull request number (a heading that starts with it, so `#470` never finds `## #4700 …`), or,
 * when none does, by its issue number (a heading that ends with `(#<n>)`). Any other text matches the headings that
 * contain it. The first of these steps that finds a section decides; throws when it finds none or several.
 */
function findSection(lines: string[], text: string): Section {
	const all = sections(lines);
	const pattern = escape(text);
	const startsWith = all.filter(({ heading }) => new RegExp(`^## ${pattern}(\\s|$)`).test(heading));
	const issueNumber = /^#\d+$/.test(text) ? all.filter(({ heading }) => new RegExp(`\\(${pattern}\\)\\s*$`).test(heading)) : [];
	const matches = [startsWith, issueNumber, all.filter(({ heading }) => heading.includes(text))].find((found) => found.length > 0) ?? [];
	if (matches.length !== 1) {
		throw new Error(
			matches.length === 0
				? `No section heading contains "${text}".`
				: `${matches.length} section headings match "${text}":\n${matches.map((section) => section.heading).join('\n')}`,
		);
	}

	return matches[0];
}

/** Finds the section that carries the pull request number or, failing that, the issue number of a heading line. */
function findByNumbers(lines: string[], heading: string): Section {
	const numbers = [/^## (#\d+)/, /\((#\d+)\)\s*$/].flatMap((pattern) => heading.match(pattern)?.[1] ?? []);
	let error: unknown = new Error(`No section heading matches "${heading}".`);
	for (const number of numbers) {
		try {
			return findSection(lines, number);
		} catch (caught) {
			error = caught;
		}
	}
	throw error;
}

/** Returns the section designated by `heading` (see `findSection`), up to the next heading. */
export function showSection(body: string, heading: string): string {
	const lines = body.split('\n');
	const { start, end } = findSection(lines, heading);
	return lines.slice(start, end).join('\n').trimEnd();
}

/** Every section heading, in order. */
export function headings(body: string): string[] {
	return sections(body.split('\n')).map(({ heading }) => heading);
}

/** The unticked items, each with the heading of its section (an empty one before the first section). */
export function untickedItems(body: string): { heading: string; item: string }[] {
	const lines = body.split('\n');
	const all = sections(lines);
	return lines.flatMap((line, index) =>
		UNTICKED.test(line) ? [{ heading: all.findLast((section) => section.start < index)?.heading ?? '', item: line.trim() }] : [],
	);
}

/** Replaces the section whose heading is the one of `section` (found as `showSection` does) and returns the body. */
export function replaceSection(body: string, section: string): string {
	const text = section.trim();
	if (!HEADING.test(text)) {
		throw new Error('The section starts with a "## " heading.');
	}

	const lines = body.split('\n');
	const [first] = text.split('\n');
	const exact = sections(lines).filter(({ heading }) => heading.trimEnd() === first.trimEnd());
	const { start, end } = exact.length === 1 ? exact[0] : findByNumbers(lines, first);
	const before = lines.slice(0, start).join('\n').trimEnd();
	const after = lines.slice(end).join('\n').trimStart();
	return `${before ? `${before}\n\n` : ''}${text}\n${after ? `\n${after}` : ''}`;
}

function escape(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
