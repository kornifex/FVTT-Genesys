/** @file Tests for whether a drag hovers a drop target, through the enter and leave events of the target and its children. */

import { describe, expect, it } from 'vitest';
import { useDragHover } from '@/vue/useDragHover';

const event = {} as DragEvent;

describe('useDragHover', () => {
	it('stays hovered while the drag moves from the target into its children, until it leaves the target', () => {
		const { isHovered, enter, leave } = useDragHover();

		enter(event); // The target.
		enter(event); // A child.
		leave(event); // The target, as the drag enters the child.
		expect(isHovered.value).toBe(true);

		leave(event); // The child, as the drag leaves the target.
		expect(isHovered.value).toBe(false);
	});

	it('lights up on the next enter after a leave it never saw enter, such as from a drag started inside the target', () => {
		const { isHovered, enter, leave } = useDragHover();

		leave(event);
		enter(event);

		expect(isHovered.value).toBe(true);
	});

	it('turns off on a drop, which fires no leave', () => {
		const { isHovered, enter, reset } = useDragHover();

		enter(event);
		enter(event);
		reset();

		expect(isHovered.value).toBe(false);
	});

	it('ignores the drags of what the target does not accept', () => {
		const accepted = { accepted: true } as unknown as DragEvent;
		const { isHovered, enter, leave } = useDragHover((drag) => drag === accepted);

		enter(event);
		expect(isHovered.value).toBe(false);

		enter(accepted);
		leave(event);
		expect(isHovered.value).toBe(true);
	});
});
