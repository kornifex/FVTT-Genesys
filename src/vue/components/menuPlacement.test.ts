import { describe, expect, it } from 'vitest';
import { menuAtPointer } from '@/vue/components/menuPlacement';

describe('menuAtPointer', () => {
	const visible = { left: 100, top: 50, right: 700, bottom: 550 };
	const menu = { width: 120, height: 100 };

	it('puts the top-left corner of a menu that fits under the pointer', () => {
		expect(menuAtPointer({ x: 300, y: 200 }, menu, visible)).toEqual({ x: 300, y: 200 });
		expect(menuAtPointer({ x: 580, y: 450 }, menu, visible)).toEqual({ x: 580, y: 450 });
	});

	it("flips a menu that would leave the visible area on the right to the pointer's left", () => {
		expect(menuAtPointer({ x: 600, y: 200 }, menu, visible)).toEqual({ x: 480, y: 200 });
	});

	it('flips a menu that would leave the visible area below above the pointer', () => {
		expect(menuAtPointer({ x: 300, y: 500 }, menu, visible)).toEqual({ x: 300, y: 400 });
	});

	it('flips a menu near the bottom-right corner both ways, its bottom-right corner under the pointer', () => {
		expect(menuAtPointer({ x: 690, y: 540 }, menu, visible)).toEqual({ x: 570, y: 440 });
	});

	it('keeps a menu that fits on neither side on the side with more room', () => {
		const tall = { width: 120, height: 400 };
		expect(menuAtPointer({ x: 300, y: 250 }, tall, visible)).toEqual({ x: 300, y: 250 });
		expect(menuAtPointer({ x: 300, y: 350 }, tall, visible)).toEqual({ x: 300, y: -50 });
	});
});
