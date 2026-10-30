/**
 * What `ContextMenu.vue` exposes to a template ref. It lives in a `.ts` file, where ESLint can read it: the `.vue` shim
 * hides a component's exposed members.
 */
export type ContextMenuHandle = {
	/**
	 * Opens the menu from an event of another element than its own, such as a right-click on the row it belongs to.
	 */
	open: (event: Event) => void;
};
