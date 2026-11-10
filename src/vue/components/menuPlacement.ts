type Point = { x: number; y: number };

/**
 * A rectangle in the viewport's coordinates, as a `DOMRect` gives it.
 */
type Box = { left: number; top: number; right: number; bottom: number };

type Size = { width: number; height: number };

/**
 * Where a menu opened at the pointer puts its top-left corner, in the viewport's coordinates: its top-left corner under
 * the pointer, as Foundry's context menus open, flipped to the pointer's left, or above it, when it would leave the
 * visible area on the right, or below.
 */
export function menuAtPointer(pointer: Point, menu: Size, visible: Box): Point {
	return {
		x: alongAxis(pointer.x, menu.width, visible.left, visible.right),
		y: alongAxis(pointer.y, menu.height, visible.top, visible.bottom),
	};
}

/**
 * Where a menu opened from its ⋮ or the keyboard puts its top-left corner, in the viewport's coordinates: below its
 * container, or above it as `position` asks, flipped to the other side when it would leave the visible area there; its
 * left edge on the container's for a `right` orientation, its right edge on the container's for a `left` one.
 */
export function menuAtContainer(
	container: Box,
	menu: Size,
	visible: Box,
	position: 'above' | 'below',
	orientation: 'left' | 'right',
): Point {
	const roomBelow = visible.bottom - container.bottom;
	const roomAbove = container.top - visible.top;
	const below =
		position === 'below'
			? !(container.bottom + menu.height > visible.bottom && roomAbove > roomBelow)
			: container.top - menu.height < visible.top && roomBelow > roomAbove;
	return {
		x: orientation === 'right' ? container.left : container.right - menu.width,
		y: below ? container.bottom : container.top - menu.height,
	};
}

// The menu flips only to a side with more room: a menu that fits on neither side stays where the least of it is cut.
function alongAxis(pointer: number, size: number, start: number, end: number) {
	return pointer + size > end && pointer - start > end - pointer ? pointer - size : pointer;
}
