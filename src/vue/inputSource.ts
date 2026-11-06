/** @file Whether a click or a `contextmenu` comes from the keyboard rather than a pointer, which the sheets' controls answer differently. */

/**
 * Whether a click comes from the keyboard, Enter or Space on a focused button, rather than a pointer: a PointerEvent then
 * names no pointer, and a click that is no PointerEvent counts no click.
 */
export function isKeyboardClick(event: MouseEvent): boolean {
	return 'pointerType' in event ? (event as PointerEvent).pointerType === '' : event.detail === 0;
}

/**
 * Whether a `contextmenu` comes from the keyboard, Shift+F10 or the context menu key, rather than a right-click: it has no
 * pointer position. Chromium's names a mouse but no button (-1, where a right-click's is 2), Firefox marks it with its
 * input source (6, the keyboard), and the Pointer Events spec has it name no pointer.
 */
export function isKeyboardContextMenu(event: MouseEvent): boolean {
	return (
		event.button === -1 ||
		(event as { mozInputSource?: number }).mozInputSource === 6 ||
		('pointerType' in event && (event as PointerEvent).pointerType === '')
	);
}
