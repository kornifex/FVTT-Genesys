/**
 * What `ContextMenu.vue` exposes to a template ref. It lives in a `.ts` file, where ESLint can read it: the `.vue` shim
 * hides a component's exposed members.
 */
export type ContextMenuHandle = {
	/**
	 * Opens the menu at the pointer of an event of another element than its own, such as a right-click on the row it
	 * belongs to: its top-left corner under the pointer, flipped to the other side of it when it would leave what the
	 * sheet shows.
	 */
	open: (event: MouseEvent) => void;
};
