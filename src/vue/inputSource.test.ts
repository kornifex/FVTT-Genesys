// @vitest-environment happy-dom
/** @file Tests for telling the keyboard's clicks and `contextmenu`s from a pointer's. */

import { describe, expect, it } from 'vitest';
import { isKeyboardClick, isKeyboardContextMenu } from '@/vue/inputSource';

describe('isKeyboardClick', () => {
	it("tells Enter or Space on a button, whose click names no pointer, from a pointer's click", () => {
		expect(isKeyboardClick(new PointerEvent('click', { pointerType: '' }))).toBe(true);
		expect(isKeyboardClick(new PointerEvent('click', { pointerType: 'mouse', detail: 1 }))).toBe(false);
		expect(isKeyboardClick(new PointerEvent('click', { pointerType: 'touch', detail: 1 }))).toBe(false);
	});

	it('counts the clicks of a browser whose click is no PointerEvent', () => {
		expect(isKeyboardClick(new MouseEvent('click', { detail: 0 }))).toBe(true);
		expect(isKeyboardClick(new MouseEvent('click', { detail: 1 }))).toBe(false);
	});
});

describe('isKeyboardContextMenu', () => {
	it("tells Chromium's Shift+F10, which names a mouse and no button, from a right-click", () => {
		expect(isKeyboardContextMenu(new PointerEvent('contextmenu', { pointerType: 'mouse', button: -1 }))).toBe(true);
		expect(isKeyboardContextMenu(new PointerEvent('contextmenu', { pointerType: 'mouse', button: 2 }))).toBe(false);
	});

	it('reads the Pointer Events spec, where the keyboard names no pointer', () => {
		expect(isKeyboardContextMenu(new PointerEvent('contextmenu', { pointerType: '', button: 0 }))).toBe(true);
	});

	it("reads Firefox's input source", () => {
		const keyboard = new MouseEvent('contextmenu', { button: 0 });
		Object.defineProperty(keyboard, 'mozInputSource', { value: 6 });
		const mouse = new MouseEvent('contextmenu', { button: 2 });
		Object.defineProperty(mouse, 'mozInputSource', { value: 1 });

		expect(isKeyboardContextMenu(keyboard)).toBe(true);
		expect(isKeyboardContextMenu(mouse)).toBe(false);
	});

	it("takes a script's `contextmenu` with no button named for a right-click", () => {
		expect(isKeyboardContextMenu(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 }))).toBe(false);
	});
});
