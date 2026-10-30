/** @file What the scenarios expect of an expandable description (#325): a text past its former caps, shown whole or closed. */
import type { DescriptionBox } from './page.ts';

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

/** A closed description, as {@link closedParts} reads it: it takes no height, and its rows animate. */
export const CLOSED_DESCRIPTION = { height: 0, transition: TRANSITION };

/** What a closed description is compared by: what it cuts off is all of it. */
export const closedParts = ({ height, transition }: DescriptionBox) => ({ height, transition });
