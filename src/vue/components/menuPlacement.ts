/** @file Where a row's menu shows in the viewport: at the pointer or at its container, inside the viewport, at the scale of its window. */

/**
 * A point in the viewport's coordinates.
 */
export type Point = { x: number; y: number };

/**
 * A rectangle in the viewport's coordinates, as a `DOMRect` gives it.
 */
type Box = { left: number; top: number; right: number; bottom: number };

type Size = { width: number; height: number };

/**
 * Where a menu may show: `visible`, the part of the viewport its row's sheet shows, which it flips to stay in; and
 * `viewport`, which it never leaves, since nothing past the viewport's edge can be reached.
 */
type Room = { visible: Box; viewport: Box };

/**
 * Where a menu opened at the pointer puts its top-left corner, in the viewport's coordinates: its top-left corner under
 * the pointer, as Foundry's context menus open, flipped to the pointer's left, or above it, when it would leave the
 * visible area on the right, or below.
 */
export function menuAtPointer(pointer: Point, menu: Size, { visible, viewport }: Room): Point {
	return inside(
		{
			x: alongAxis(pointer.x, menu.width, visible.left, visible.right),
			y: alongAxis(pointer.y, menu.height, visible.top, visible.bottom),
		},
		menu,
		viewport,
	);
}

/**
 * Where a menu opened from its ⋮ or the keyboard puts its top-left corner, in the viewport's coordinates: below its
 * container, or above it as `position` asks, flipped to the other side when it would leave the visible area there; its
 * left edge on the container's for a `right` orientation, its right edge on the container's for a `left` one.
 */
export function menuAtContainer(
	container: Box,
	menu: Size,
	{ visible, viewport }: Room,
	position: 'above' | 'below',
	orientation: 'left' | 'right',
): Point {
	const roomBelow = visible.bottom - container.bottom;
	const roomAbove = container.top - visible.top;
	const below =
		position === 'below'
			? !(container.bottom + menu.height > visible.bottom && roomAbove > roomBelow)
			: container.top - menu.height < visible.top && roomBelow > roomAbove;
	return inside(
		{
			x: orientation === 'right' ? container.left : container.right - menu.width,
			y: below ? container.bottom : container.top - menu.height,
		},
		menu,
		viewport,
	);
}

/**
 * The scale a window's transform draws it at: its drawn width over its laid-out width. The laid-out width is rounded
 * to a whole pixel, the drawn one isn't: widths less than a pixel apart are no scale.
 */
export function windowScale(drawnWidth: number, laidOutWidth: number): number {
	if (!laidOutWidth || Math.abs(drawnWidth - laidOutWidth) < 1) {
		return 1;
	}

	return drawnWidth / laidOutWidth;
}

/**
 * The box around boxes, or none when there are none.
 */
export function boxAround(boxes: Box[]): Box | undefined {
	if (boxes.length === 0) {
		return undefined;
	}

	return {
		left: Math.min(...boxes.map((box) => box.left)),
		top: Math.min(...boxes.map((box) => box.top)),
		right: Math.max(...boxes.map((box) => box.right)),
		bottom: Math.max(...boxes.map((box) => box.bottom)),
	};
}

// The menu flips only to a side with more room: a menu that fits on neither side stays where the least of it is cut.
function alongAxis(pointer: number, size: number, start: number, end: number) {
	return pointer + size > end && pointer - start > end - pointer ? pointer - size : pointer;
}

// A menu larger than the viewport keeps its top-left corner in it, where its first entries are.
function inside(corner: Point, menu: Size, viewport: Box): Point {
	return {
		x: Math.max(viewport.left, Math.min(corner.x, viewport.right - menu.width)),
		y: Math.max(viewport.top, Math.min(corner.y, viewport.bottom - menu.height)),
	};
}
