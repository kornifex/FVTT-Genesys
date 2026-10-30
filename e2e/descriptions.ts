/**
 * @file What the scenarios expect of an expandable description (#325): a text past its former caps, shown whole or
 * closed, and the chevron of a Combat tab row that opens and closes it (#393).
 */
import type { Chevron, DescriptionBox } from './page.ts';

/** Forty paragraphs, which stand well past the caps of 500px and 200px the descriptions had. */
export const LONG_DESCRIPTION = Array.from({ length: 40 }, (_, index) => `<p>Line ${index + 1} of a long description.</p>`).join('');

const TRANSITION = 'grid-template-rows 0.5s';

/** An open description, as `window.e2e.descriptionBox` reads it with that cap: its whole text shows, past the cap. */
export const shownDescription = (cap: number): DescriptionBox => ({
	height: `>${cap}`,
	clipped: 0,
	lastInside: true,
	transition: TRANSITION,
});

/** A closed description, as {@link closedDescription} reads it: it takes no height, and its rows animate. */
export const CLOSED_DESCRIPTION = { height: 0, transition: TRANSITION };

/**
 * A description as `read` lays it out with the cap it is given, by what a closed one is compared by: its height and
 * transition, since what it cuts off is all of it. Null when the row shows none, as on a build without it.
 */
export async function closedDescription(read: (cap: number) => Promise<DescriptionBox | null>) {
	const box = await read(100_000);
	return box && { height: box.height, transition: box.transition };
}

/** The chevron of a closed description, which offers to show it. */
export const SHOW_CHEVRON: Chevron = { points: 'right', tooltip: 'Show the description' };

/** The chevron of an open description, which offers to hide it. */
export const HIDE_CHEVRON: Chevron = { points: 'down', tooltip: 'Hide the description' };
