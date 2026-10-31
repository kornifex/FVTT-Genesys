type Point = { x: number; y: number };

/**
 * A rectangle in the viewport's coordinates, as a `DOMRect` gives it.
 */
type Box = { left: number; top: number; right: number; bottom: number };

/**
 * Where a menu opened at the pointer puts its top-left corner, in the viewport's coordinates: its top-left corner under
 * the pointer, as Foundry's context menus open, flipped to the pointer's left, or above it, when it would leave the
 * visible area on the right, or below.
 */
export function menuAtPointer(pointer: Point, menu: { width: number; height: number }, visible: Box): Point {
	return {
		x: alongAxis(pointer.x, menu.width, visible.left, visible.right),
		y: alongAxis(pointer.y, menu.height, visible.top, visible.bottom),
	};
}

// The menu flips only to a side with more room: a menu that fits on neither side stays where the least of it is cut.
function alongAxis(pointer: number, size: number, start: number, end: number) {
	return pointer + size > end && pointer - start > end - pointer ? pointer - size : pointer;
}
