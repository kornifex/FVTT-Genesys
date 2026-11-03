/**
 * @file What the scenarios expect of an expandable description (#325): a text past its former caps, shown whole or
 * closed, and the chevron of a Combat tab row (#393) or a Talents tab row (#515) that opens and closes it.
 */
import type { Chevron, DescriptionBox } from './page.ts';

/**
 * Forty paragraphs, which stand well past the caps of 500px and 200px the descriptions had; the last one ends with a link,
 * which Tab reaches while the description shows (#516).
 */
export const LONG_DESCRIPTION = [
	...Array.from({ length: 39 }, (_, index) => `<p>Line ${index + 1} of a long description.</p>`),
	'<p>Line 40 of a long description, with <a href="https://example.com/">a link</a></p>',
].join('');

/** How every fold opens and closes since #516, as a scenario reads it: `<property> <duration> <easing>`. */
export const FOLD_TRANSITION = 'grid-template-rows 0.2s ease-out';

/** An open description, as `window.e2e.descriptionBox` reads it with that cap: its whole text shows, past the cap. */
export const shownDescription = (cap: number): DescriptionBox => ({
	height: `>${cap}`,
	clipped: 0,
	lastInside: true,
	transition: FOLD_TRANSITION,
	lastVisibility: 'visible',
});

/**
 * A closed description, as {@link closedDescription} reads it: it takes no height, its rows animate, and once the fold
 * ends its content is hidden, so that Tab skips its links (#516).
 */
export const CLOSED_DESCRIPTION = { height: 0, transition: FOLD_TRANSITION, lastVisibility: 'hidden' };

/**
 * A description as `read` lays it out with the cap it is given, by what a closed one is compared by: its height,
 * transition and content's visibility, since what it cuts off is all of it. Null when the row shows none, as on a build
 * without it.
 */
export async function closedDescription(read: (cap: number) => Promise<DescriptionBox | null>) {
	const box = await read(100_000);
	return box && { height: box.height, transition: box.transition, lastVisibility: box.lastVisibility };
}

/** The chevron of a closed description, which offers to show it. */
export const SHOW_CHEVRON: Chevron = { points: 'right', tooltip: 'Show the description' };

/** The chevron of an open description, which offers to hide it. */
export const HIDE_CHEVRON: Chevron = { points: 'down', tooltip: 'Hide the description' };
