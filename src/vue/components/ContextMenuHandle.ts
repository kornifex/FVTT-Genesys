/**
 * What `ContextMenu.vue` exposes to a template ref. It lives in a `.ts` file, where ESLint can read it: the `.vue` shim
 * hides a component's exposed members.
 */
export type ContextMenuHandle = {
	/**
	 * Opens the menu at the pointer of an event of another element than its own, such as a right-click on the row it
	 * belongs to: its top-left corner under the pointer, flipped to the other side of it when it would leave what the
	 * sheet shows. A `contextmenu` from the keyboard (Shift+F10, the context menu key), which has no pointer position,
	 * opens it at its ⋮ button instead. Either way, the focus goes to its first entry.
	 */
	open: (event: MouseEvent) => void;
};
