import { describe, expect, it } from 'vitest';
import { boxAround, menuAtContainer, menuAtPointer, windowScale } from '@/vue/components/menuPlacement';

// What the sheet shows, inside a larger viewport.
const room = { visible: { left: 100, top: 50, right: 700, bottom: 550 }, viewport: { left: 0, top: 0, right: 1000, bottom: 800 } };
const menu = { width: 120, height: 100 };

describe('menuAtPointer', () => {
	it('puts the top-left corner of a menu that fits under the pointer', () => {
		expect(menuAtPointer({ x: 300, y: 200 }, menu, room)).toEqual({ x: 300, y: 200 });
		expect(menuAtPointer({ x: 580, y: 450 }, menu, room)).toEqual({ x: 580, y: 450 });
	});

	it("flips a menu that would leave the visible area on the right to the pointer's left", () => {
		expect(menuAtPointer({ x: 600, y: 200 }, menu, room)).toEqual({ x: 480, y: 200 });
	});

	it('flips a menu that would leave the visible area below above the pointer', () => {
		expect(menuAtPointer({ x: 300, y: 500 }, menu, room)).toEqual({ x: 300, y: 400 });
	});

	it('flips a menu near the bottom-right corner both ways, its bottom-right corner under the pointer', () => {
		expect(menuAtPointer({ x: 690, y: 540 }, menu, room)).toEqual({ x: 570, y: 440 });
	});

	it('keeps a menu that fits on neither side on the side with more room, inside the viewport', () => {
		const tall = { width: 120, height: 400 };
		expect(menuAtPointer({ x: 300, y: 250 }, tall, room)).toEqual({ x: 300, y: 250 });
		// Flipped above the pointer, it would start 50 pixels above the viewport.
		expect(menuAtPointer({ x: 300, y: 350 }, tall, room)).toEqual({ x: 300, y: 0 });
	});

	it('keeps a menu inside the viewport where the sheet runs past its edge', () => {
		const pastTheEdge = { visible: { left: 800, top: 600, right: 1200, bottom: 1000 }, viewport: room.viewport };
		expect(menuAtPointer({ x: 950, y: 750 }, menu, pastTheEdge)).toEqual({ x: 880, y: 700 });
	});
});

describe('menuAtContainer', () => {
	const row = { left: 200, top: 200, right: 500, bottom: 220 };

	it('puts a menu below its container, on its left edge or its right one as its orientation asks', () => {
		expect(menuAtContainer(row, menu, room, 'below', 'right')).toEqual({ x: 200, y: 220 });
		expect(menuAtContainer(row, menu, room, 'below', 'left')).toEqual({ x: 380, y: 220 });
	});

	it('puts a menu asked above its container above it', () => {
		expect(menuAtContainer(row, menu, room, 'above', 'right')).toEqual({ x: 200, y: 100 });
	});

	it('flips a menu that would leave the visible area below above its container', () => {
		const low = { ...row, top: 480, bottom: 500 };
		expect(menuAtContainer(low, menu, room, 'below', 'left')).toEqual({ x: 380, y: 380 });
	});

	it('flips a menu asked above that would leave the visible area above below its container', () => {
		const high = { ...row, top: 80, bottom: 100 };
		expect(menuAtContainer(high, menu, room, 'above', 'right')).toEqual({ x: 200, y: 100 });
	});

	it('keeps a menu that fits on neither side on the side with more room', () => {
		const tall = { width: 120, height: 400 };
		expect(menuAtContainer(row, tall, room, 'below', 'right')).toEqual({ x: 200, y: 220 });
		expect(menuAtContainer({ ...row, top: 400, bottom: 420 }, tall, room, 'below', 'right')).toEqual({ x: 200, y: 0 });
	});

	it("keeps a menu inside the viewport where its container runs past the viewport's edge", () => {
		const pastTheEdge = { left: -50, top: 200, right: 10, bottom: 220 };
		const wide = { visible: room.viewport, viewport: room.viewport };
		// Its right edge on the container's would put its left edge 110 pixels past the viewport's.
		expect(menuAtContainer(pastTheEdge, menu, wide, 'below', 'left')).toEqual({ x: 0, y: 220 });
		// Below the container, it would end 100 pixels past the viewport's bottom; a sheet past it gives no room to flip.
		const low = { visible: { ...room.viewport, bottom: 1200 }, viewport: room.viewport };
		expect(menuAtContainer({ ...row, top: 780, bottom: 800 }, menu, low, 'below', 'right')).toEqual({ x: 200, y: 700 });
	});
});

describe('windowScale', () => {
	it("is the window's drawn width over its laid-out width", () => {
		expect(windowScale(400, 800)).toBe(0.5);
		expect(windowScale(1200, 800)).toBe(1.5);
	});

	it('takes the rounding of a fractional width over a whole one for no scale', () => {
		expect(windowScale(17.5, 18)).toBe(1);
		expect(windowScale(780.4, 780)).toBe(1);
	});

	it('is no scale for an element with no width laid out', () => {
		expect(windowScale(0, 0)).toBe(1);
	});
});

describe('boxAround', () => {
	it('is the box around every box given, or none for none', () => {
		const label = { left: 10, top: 40, right: 90, bottom: 60 };
		const button = { left: 95, top: 0, right: 110, bottom: 20 };
		expect(boxAround([label, button])).toEqual({ left: 10, top: 0, right: 110, bottom: 60 });
		expect(boxAround([])).toBeUndefined();
	});
});
