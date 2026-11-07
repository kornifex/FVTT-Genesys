/**
 * @file What `RowActions.vue` takes of a row: its own actions, and what replaces its Delete. They live in a `.ts` file,
 * where ESLint can read them: the `.vue` shim hides a component's types.
 */

/**
 * An action of the row itself, which its menu lists before Send to chat, Edit and Delete.
 */
export type RowAction = {
	/**
	 * The Font Awesome classes of the entry's icon.
	 */
	icon: string;

	/**
	 * The localization key of the entry's label.
	 */
	label: string;

	/**
	 * The values the label is formatted with, such as the name of the Container an item is put in.
	 */
	labelData?: Record<string, string>;

	/**
	 * Whether the action edits the sheet's document, true by default: such an entry is left out of a sheet the user can't
	 * edit. A roll edits nothing.
	 */
	edits?: boolean;

	run: () => unknown;
};

/**
 * What the last entry of a row's menu does in Delete's place, such as removing an actor from a Crew, which deletes
 * nothing and asks nothing, or undoing an Experience Journal entry, which asks in its own words.
 */
export type RowRemoval = {
	/**
	 * The localization key of the entry's label: Delete by default.
	 */
	label?: string;

	/**
	 * The Font Awesome classes of the entry's icon: a trash can by default.
	 */
	icon?: string;

	run: () => unknown;
};
