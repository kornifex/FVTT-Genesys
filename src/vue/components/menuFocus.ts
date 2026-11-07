/**
 * @file Where the focus goes after a menu ran an entry from the keyboard, when the entry moves its row elsewhere in the
 * sheet or removes it: the ⋮ the focus went back to is unmounted, and the focus would fall to the page.
 */

/**
 * The ⋮ the focus went back to, the key of its menu, and where the focus goes when the ⋮ leaves without another taking
 * it, until the focus moves on.
 */
let pending: { key: string; from: HTMLElement; fallback: HTMLElement | null } | undefined;

function forget() {
	pending?.from.ownerDocument.removeEventListener('focusin', onFocusIn, true);
	pending = undefined;
}

// The user moved the focus elsewhere: the ⋮ no longer holds it.
function onFocusIn(event: FocusEvent) {
	if (event.target !== pending?.from) {
		forget();
	}
}

/**
 * Records that the focus went back to a menu's ⋮ after the menu ran an entry from the keyboard, for the ⋮ of a menu with
 * the same key mounted after it to take the focus, as the row the entry moved renders again elsewhere; or, when none
 * does, for the fallback to take it, such as the sheet's content after a deletion.
 */
export function handOffFocus(key: string, from: HTMLElement, fallback: HTMLElement | null): void {
	forget();
	pending = { key, from, fallback };
	from.ownerDocument.addEventListener('focusin', onFocusIn, true);
}

/**
 * Gives the focus to a ⋮ just mounted, when the focus went back to the ⋮ of a menu with the same key: returns whether it
 * did.
 */
export function takeFocus(key: string, to: HTMLElement): boolean {
	if (!pending || pending.key !== key || pending.from === to) {
		return false;
	}

	to.focus();
	if (to.ownerDocument.activeElement !== to) {
		// A ⋮ in a closed fold, such as a Container's contents, can't take the focus: the fallback takes it as the old ⋮
		// leaves.
		return false;
	}

	forget();
	return true;
}

/**
 * Called as a ⋮ unmounts: when the focus went back to it, and no ⋮ of the same key takes it in the same render, the
 * fallback gets it.
 */
export function leaveFocus(from: HTMLElement): void {
	if (pending?.from !== from) {
		return;
	}

	// The row's new ⋮ mounts in the same render as the old one unmounts, before or after it.
	setTimeout(() => {
		if (pending?.from !== from) {
			return;
		}

		const { fallback } = pending;
		forget();
		if (fallback?.isConnected) {
			// An element that isn't a control takes the focus from a script only, and Tab goes on from it.
			fallback.tabIndex = -1;
			fallback.focus({ preventScroll: true });
		}
	});
}
